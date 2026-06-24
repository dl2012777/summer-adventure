/**
 * SOE 口语评测代理服务器
 * 部署在你自己的腾讯云服务器上，前端通过此服务调用腾讯云 SOE API
 * 
 * 启动：node server.js
 * 生产：pm2 start server.js --name soe-proxy
 */

// 加载 .env 文件（本地开发用；服务器上直接设环境变量更安全）
try { require('dotenv').config(); } catch(e) {}

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ========== 配置 ==========
const PORT = parseInt(process.env.SOE_PORT || '8126', 10);
const APP_ID = process.env.TC_APP_ID || '1410036406';
const SECRET_ID = process.env.TC_SECRET_ID || '';
const SECRET_KEY = process.env.TC_SECRET_KEY || '';

// 自动检测 ffmpeg 路径
function findFfmpeg() {
  const candidates = [
    process.env.FFMPEG_PATH,
    '/usr/bin/ffmpeg',           // Linux (腾讯云)
    '/usr/local/bin/ffmpeg',     // Linux 手动安装
    '/opt/homebrew/bin/ffmpeg',  // macOS Apple Silicon
    '/usr/local/opt/ffmpeg/bin/ffmpeg', // macOS Intel Homebrew
    'ffmpeg',                    // 兜底：靠 PATH
  ];
  for (const p of candidates) {
    if (!p) continue;
    try {
      execSync(`"${p}" -version`, { stdio: 'ignore', timeout: 3000 });
      return p;
    } catch(e) {}
  }
  return null;
}
const FFMPEG = findFfmpeg();

// ========== 启动检查 ==========
console.log('═══════════════════════════════════════');
console.log('  SOE 口语评测代理服务器');
console.log('═══════════════════════════════════════');
console.log('  Port:       ', PORT);
console.log('  AppId:      ', APP_ID);
console.log('  SecretId:   ', SECRET_ID ? (SECRET_ID.slice(0, 8) + '...') : '❌ 未设置!');
console.log('  SecretKey:  ', SECRET_KEY ? ('已设置 (' + SECRET_KEY.length + '字符)') : '❌ 未设置!');
console.log('  ffmpeg:     ', FFMPEG || '❌ 未找到!');
console.log('  Platform:   ', os.platform(), os.arch());
console.log('═══════════════════════════════════════');

if (!SECRET_ID || !SECRET_KEY) {
  console.error('❌ 致命错误：TC_SECRET_ID 或 TC_SECRET_KEY 环境变量未设置');
  console.error('   创建 .env 文件或设置环境变量后重试');
  process.exit(1);
}
if (!FFMPEG) {
  console.error('❌ 致命错误：找不到 ffmpeg，请先安装：');
  console.error('   Ubuntu/Debian: sudo apt install ffmpeg');
  console.error('   CentOS/RHEL:   sudo yum install ffmpeg');
  console.error('   macOS:         brew install ffmpeg');
  process.exit(1);
}

// ========== Express 初始化 ==========
const app = express();

// --- 请求日志 ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?';
    console.log(`[${new Date().toISOString()}] ${ip} ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// --- CORS（生产环境建议锁定域名） ---
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : true; // 开发阶段允许所有来源

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400,
}));

app.use(express.json({ limit: '10mb' }));

// --- 简易速率限制（每 IP 每分钟最多 20 次评测） ---
const rateLimitMap = new Map();
setInterval(() => rateLimitMap.clear(), 60000);

function checkRateLimit(ip) {
  const count = (rateLimitMap.get(ip) || 0) + 1;
  rateLimitMap.set(ip, count);
  return count <= 20;
}

// ========== API 路由 ==========

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    uptime: Math.floor(process.uptime()),
    platform: os.platform(),
    ffmpeg: !!FFMPEG,
    secretConfigured: !!(SECRET_ID && SECRET_KEY),
    time: new Date().toISOString(),
  });
});

// 口语评测
app.post('/api/evaluate', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // 速率限制
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ success: false, error: '请求太频繁，请稍后再试' });
  }

  const { audioBase64, refText } = req.body;
  if (!audioBase64 || !refText) {
    return res.status(400).json({ success: false, error: '缺少音频数据或参考文本' });
  }

  if (refText.length > 500) {
    return res.status(400).json({ success: false, error: '参考文本过长' });
  }

  const baseId = crypto.randomUUID();
  const webmFile = path.join(os.tmpdir(), 'soe_' + baseId + '.webm');
  const wavFile  = path.join(os.tmpdir(), 'soe_' + baseId + '.wav');

  try {
    // 1. WebM → 16kHz WAV
    fs.writeFileSync(webmFile, Buffer.from(audioBase64, 'base64'));
    execSync(`"${FFMPEG}" -y -i "${webmFile}" -ar 16000 -ac 1 -sample_fmt s16 "${wavFile}"`, {
      timeout: 10000,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    const wavBuf = fs.readFileSync(wavFile);

    // 清理临时文件
    try { fs.unlinkSync(webmFile); } catch(e) {}
    try { fs.unlinkSync(wavFile); } catch(e) {}

    if (wavBuf.length < 100) {
      return res.json({ success: false, error: '录音太短，请重新录制' });
    }

    console.log(`[soe] ${baseId.slice(0,8)} audio=${wavBuf.length}B ref="${refText.slice(0,30)}..."`);

    // 2. 生成腾讯云 SOE WebSocket 签名
    const now = Math.floor(Date.now() / 1000);
    const params = {
      secretid: SECRET_ID,
      timestamp: now,
      expired: now + 86400,
      nonce: Math.floor(Math.random() * 1e9),
      server_engine_type: '16k_en',
      voice_id: crypto.randomUUID(),
      eval_mode: 1,
      score_coeff: 1.0,
      ref_text: refText,
      voice_format: 1,
      text_mode: 0,
      sentence_info_enabled: 1,
      rec_mode: 1,
    };

    const sortedKeys = Object.keys(params).sort();
    const qRaw = sortedKeys.map(k => k + '=' + params[k]).join('&');
    const sig = crypto.createHmac('sha1', SECRET_KEY)
      .update(`soe.cloud.tencent.com/soe/api/${APP_ID}?${qRaw}`)
      .digest('base64');
    const qEnc = sortedKeys.map(k => k + '=' + encodeURIComponent(params[k])).join('&');
    const wsUrl = `wss://soe.cloud.tencent.com/soe/api/${APP_ID}?${qEnc}&signature=${encodeURIComponent(sig)}`;

    // 3. WebSocket 连接腾讯云 SOE
    const result = await new Promise((resolve) => {
      const ws = new WebSocket(wsUrl, { perMessageDeflate: false });
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          console.log(`[soe] ${baseId.slice(0,8)} timeout`);
          resolve({ success: false, error: '评测超时，请重试' });
        }
        try { ws.close(); } catch(e) {}
      }, 20000);

      ws.on('open', () => {
        console.log(`[soe] ${baseId.slice(0,8)} ws opened, sending ${wavBuf.length}B`);
        ws.send(wavBuf, { binary: true });
        ws.send(JSON.stringify({ type: 'end' }));
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.code && msg.code !== 0) {
            done = true; clearTimeout(timer);
            console.log(`[soe] ${baseId.slice(0,8)} API error ${msg.code}: ${msg.message}`);
            resolve({ success: false, error: `评测服务异常(${msg.code})` });
            try { ws.close(); } catch(e) {}
            return;
          }
          if (msg.final === 1 && msg.result) {
            done = true; clearTimeout(timer);
            const r = typeof msg.result === 'string' ? JSON.parse(msg.result) : msg.result;
            const score = Math.round(r.SuggestedScore || r.suggestedScore || 0);
            console.log(`[soe] ${baseId.slice(0,8)} score=${score}`);
            resolve({
              success: true,
              score,
              accuracy: Math.round(r.PronAccuracy || r.pronAccuracy || 0),
              fluency: r.PronFluency >= 0 ? Math.round(r.PronFluency * 100) : 0,
              words: (r.Words || r.words || []).map(w => ({
                word: w.Word || w.word || '',
                score: Math.round(w.PronAccuracy || w.pronAccuracy || 0),
                isCorrect: (w.PronAccuracy || w.pronAccuracy || 0) >= 60,
              })),
            });
            try { ws.close(); } catch(e) {}
          }
        } catch(e) {
          // 非 JSON 消息忽略
        }
      });

      ws.on('error', (e) => {
        console.log(`[soe] ${baseId.slice(0,8)} ws error: ${e.message}`);
        clearTimeout(timer);
        if (!done) {
          done = true;
          resolve({ success: false, error: '连接评测服务失败' });
        }
      });

      ws.on('close', (code, reason) => {
        if (!done) {
          done = true; clearTimeout(timer);
          console.log(`[soe] ${baseId.slice(0,8)} ws closed early: ${code}`);
          resolve({ success: false, error: '评测服务提前断开' });
        }
      });
    });

    res.json(result);

  } catch(e) {
    // 确保清理
    try { fs.unlinkSync(webmFile); } catch(e2) {}
    try { fs.unlinkSync(wavFile); } catch(e2) {}
    console.error(`[soe] ${baseId.slice(0,8)} fatal:`, e.message);
    res.status(500).json({ success: false, error: '服务器处理音频失败' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ========== 启动服务器 ==========
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SOE 代理已启动: http://0.0.0.0:${PORT}`);
  console.log(`   健康检查: http://localhost:${PORT}/api/health`);
});

// 优雅关闭
function shutdown(signal) {
  console.log(`\n收到 ${signal}，正在关闭...`);
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('强制退出');
    process.exit(1);
  }, 5000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
