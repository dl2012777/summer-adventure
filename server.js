/**
 * 口语评测 server — 三层凭证链
 * ① 环境变量 TC_SECRET_ID / TC_SECRET_KEY
 * ② 项目根目录 .env 文件
 * ③ ~/.summer-adventure/credentials.json（系统级持久化）
 */

const path = require('path');
const fs = require('fs');

// --- 凭证加载（按优先级）---
function loadCredentials() {
  // 加载 .env（仅当文件存在时）
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try { require('dotenv').config({ path: envPath }); } catch(e) {}
  }

  let id = process.env.TC_SECRET_ID || '';
  let key = process.env.TC_SECRET_KEY || '';

  // 如果 .env 也没配，尝试读取系统级凭证文件
  if (!id || !key) {
    const globalPath = path.join(
      process.env.HOME || process.env.USERPROFILE || '~',
      '.summer-adventure',
      'credentials.json'
    );
    if (fs.existsSync(globalPath)) {
      try {
        const creds = JSON.parse(fs.readFileSync(globalPath, 'utf-8'));
        if (creds.secretId) id = creds.secretId;
        if (creds.secretKey) key = creds.secretKey;
      } catch(e) {}
    }
  }

  return { id, key };
}

const creds = loadCredentials();
console.log('[init] 凭证链:', creds.id ? `SecretId=${creds.id.slice(0,8)}...` : '⚠️ 未配置');

// --- 主服务 ---
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const WebSocket = require('ws');
const os = require('os');
const { execSync } = require('child_process');

const APP_ID = '1410036406';
let FFMPEG;
try { FFMPEG = execSync('which ffmpeg', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim(); }
catch (e) { FFMPEG = process.env.FFMPEG_PATH || '/opt/homebrew/bin/ffmpeg'; }

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 健康检查（含凭证状态）
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    credentials: !!creds.id && !!creds.key,
    message: (!creds.id || !creds.key)
      ? '未配置凭证，请设置 TC_SECRET_ID / TC_SECRET_KEY'
      : '就绪'
  });
});

// 口语评测
app.post('/api/evaluate', async (req, res) => {
  const { audioBase64, refText } = req.body;
  if (!audioBase64 || !refText) return res.status(400).json({ error: 'Missing data' });
  if (!creds.id || !creds.key) {
    return res.status(503).json({ error: '未配置腾讯云凭证，请运行: node setup-credentials.js' });
  }

  // 1. WebM → 16kHz WAV
  const baseId = crypto.randomUUID();
  const webmFile = path.join(os.tmpdir(), 'soe_' + baseId + '.webm');
  const wavFile  = path.join(os.tmpdir(), 'soe_' + baseId + '.wav');
  try {
    fs.writeFileSync(webmFile, Buffer.from(audioBase64, 'base64'));
    execSync(`${FFMPEG} -y -i ${webmFile} -ar 16000 -ac 1 -sample_fmt s16 ${wavFile}`, { timeout: 10000 });
    const wavBuf = fs.readFileSync(wavFile);
    try { fs.unlinkSync(webmFile); fs.unlinkSync(wavFile); } catch(e) {}

    // 2. 生成 WSS 签名
    const now = Math.floor(Date.now() / 1000);
    console.log('[soe] ffmpeg OK, connecting to Tencent...');
    const params = {
      secretid: creds.id, timestamp: now, expired: now + 86400,
      nonce: Math.floor(Math.random() * 1e9), server_engine_type: '16k_en',
      voice_id: crypto.randomUUID(), eval_mode: 1, score_coeff: 1.0,
      ref_text: refText, voice_format: 1, text_mode: 0,
      sentence_info_enabled: 1, rec_mode: 1,
    };
    const sortedKeys = Object.keys(params).sort();
    const qRaw = sortedKeys.map(k => k + '=' + params[k]).join('&');
    const sig = crypto.createHmac('sha1', creds.key)
      .update(`soe.cloud.tencent.com/soe/api/${APP_ID}?${qRaw}`).digest('base64');
    const qEnc = sortedKeys.map(k => k + '=' + encodeURIComponent(params[k])).join('&');
    const url = `wss://soe.cloud.tencent.com/soe/api/${APP_ID}?${qEnc}&signature=${encodeURIComponent(sig)}`;

    // 3. WebSocket → 发音频 → 收结果
    const result = await new Promise((resolve) => {
      const ws = new WebSocket(url, { perMessageDeflate: false });
      let done = false;
      const timer = setTimeout(() => { try { ws.close(); } catch(e) {} if (!done) resolve({ success: false, error: '评测超时' }); }, 20000);

      ws.on('open', () => {
        ws.send(wavBuf, { binary: true });
        ws.send(JSON.stringify({ type: 'end' }));
      });
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.code && msg.code !== 0) {
            done = true; clearTimeout(timer);
            resolve({ success: false, error: '腾讯API错误(' + msg.code + '): ' + (msg.message || '未知错误') });
            try { ws.close(); } catch(e) {}
            return;
          }
          if (msg.final === 1 && msg.result) {
            done = true; clearTimeout(timer);
            const r = typeof msg.result === 'string' ? JSON.parse(msg.result) : msg.result;
            resolve({
              success: true,
              score: Math.round(r.SuggestedScore || r.suggestedScore || 0),
              accuracy: Math.round(r.PronAccuracy || r.pronAccuracy || 0),
              fluency: r.PronFluency >= 0 ? Math.round(r.PronFluency * 100) : 0,
              words: (r.Words || r.words || []).map(w => ({
                word: w.Word || w.word || '',
                score: Math.round(w.PronAccuracy || w.pronAccuracy || 0),
                isCorrect: (w.PronAccuracy || w.pronAccuracy || 0) >= 60
              }))
            });
            try { ws.close(); } catch(e) {}
          }
        } catch(e) {}
      });
      ws.on('error', (e) => {
        clearTimeout(timer); if (!done) resolve({ success: false, error: '连接失败: ' + e.message });
      });
    });

    res.json(result);
  } catch(e) {
    try { fs.unlinkSync(webmFile); } catch(e2) {}
    try { fs.unlinkSync(wavFile); } catch(e2) {}
    res.status(500).json({ error: e.message || '服务器错误' });
  }
});

app.listen(8126, '0.0.0.0', () => {
  console.log('[soe] 服务运行在 http://127.0.0.1:8126');
  console.log('[soe] 健康检查: http://127.0.0.1:8126/api/health');
});
