const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const APP_ID = '1410036406';
const SECRET_ID = process.env.TC_SECRET_ID || '';
const SECRET_KEY = process.env.TC_SECRET_KEY || '';
const FFMPEG = '/opt/homebrew/bin/ffmpeg';

// 新版口语评测 API — WebSocket 协议
app.post('/api/evaluate', async (req, res) => {
  const { audioBase64, refText } = req.body;
  if (!audioBase64 || !refText) return res.status(400).json({ error: 'Missing data' });

  // 1. 将浏览器录制的 WebM 转为 16kHz WAV
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
   console.log('[soe] refText:', refText);
   console.log('[soe] SECRET_ID prefix:', (SECRET_ID || '').slice(0, 8));
   console.log('[soe] SECRET_KEY length:', (SECRET_KEY || '').length);
   const params = {
      secretid: SECRET_ID, timestamp: now, expired: now + 86400,
      nonce: Math.floor(Math.random() * 1e9), server_engine_type: '16k_en',
      voice_id: crypto.randomUUID(), eval_mode: 1, score_coeff: 1.0,
      ref_text: refText, voice_format: 1, text_mode: 0,
      sentence_info_enabled: 1, rec_mode: 1,
    };
    const sortedKeys = Object.keys(params).sort();
    // 签名用原始（unencoded）参数
    const qRaw = sortedKeys.map(k => k + '=' + params[k]).join('&');
    const sig = crypto.createHmac('sha1', SECRET_KEY)
      .update(`soe.cloud.tencent.com/soe/api/${APP_ID}?${qRaw}`).digest('base64');
    // URL 用 encodeURIComponent 编码每个参数值
    const qEnc = sortedKeys.map(k => k + '=' + encodeURIComponent(params[k])).join('&');
   const url = `wss://soe.cloud.tencent.com/soe/api/${APP_ID}?${qEnc}&signature=${encodeURIComponent(sig)}`;
   console.log('[soe] WebSocket URL (truncated):', url.slice(0, 150) + '...');

   // 3. WebSocket 连接 → 发音频 → 收结果
   const result = await new Promise((resolve) => {
     const ws = new WebSocket(url, { perMessageDeflate: false });
     let done = false;
     const timer = setTimeout(() => { try { ws.close(); } catch(e) {} if (!done) resolve({ success: false, error: '评测超时' }); }, 20000);

     ws.on('open', () => {
       console.log('[soe] WebSocket connected, sending audio (' + wavBuf.length + ' bytes)...');
       ws.send(wavBuf, { binary: true });
       ws.send(JSON.stringify({ type: 'end' }));
     });
     ws.on('message', (data) => {
       console.log('[soe] received message:', data.toString().slice(0, 200));
       try {
         const msg = JSON.parse(data.toString());
         // 处理腾讯返回的错误
         if (msg.code && msg.code !== 0) {
           done = true; clearTimeout(timer);
           resolve({ success: false, error: '腾讯API错误(' + msg.code + '): ' + (msg.message || '未知错误') });
           try { ws.close(); } catch(e) {}
           return;
         }
         if (msg.final === 1 && msg.result) {
           done = true; clearTimeout(timer);
           const r = typeof msg.result === 'string' ? JSON.parse(msg.result) : msg.result;
           console.log('[soe] evaluation result: score=' + (r.SuggestedScore || r.suggestedScore));
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
       console.log('[soe] error:', e.message);
       clearTimeout(timer); if (!done) resolve({ success: false, error: '连接失败: ' + e.message });
     });
     ws.on('close', (code, reason) => {
       console.log('[soe] closed:', code, reason ? reason.toString() : '');
     });
   });

    res.json(result);
  } catch(e) {
    try { fs.unlinkSync(webmFile); } catch(e2) {}
    try { fs.unlinkSync(wavFile); } catch(e2) {}
    res.status(500).json({ error: e.message || '服务器错误' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(8126, '0.0.0.0', () => console.log('SOE server running on http://127.0.0.1:8126'));
