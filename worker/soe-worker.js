/**
 * 口语评测 Cloudflare Worker
 * 部署后在 Cloudflare 后台设置环境变量：
 *   TC_SECRET_ID  = 你的 SecretId
 *   TC_SECRET_KEY = 你的 SecretKey
 *   APP_ID        = 1410036406
 *
 * 部署后获得地址如：https://summer-soe.你的账号.workers.dev
 * 前端通过 window.SOE_API_URL 指向这个地址即可
 */

const APP_ID = '1410036406';

export default {
  async fetch(request, env) {
    // CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 健康检查
    if (request.url.includes('/api/health')) {
      return Response.json({
        ok: true,
        credentials: !!(env.TC_SECRET_ID && env.TC_SECRET_KEY),
      }, { headers: corsHeaders });
    }

    // 口语评测
    if (request.url.includes('/api/evaluate')) {
      return handleEvaluate(request, env, corsHeaders);
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
  }
};

async function handleEvaluate(request, env, corsHeaders) {
  const { audioBase64, refText } = await request.json();
  if (!audioBase64 || !refText) {
    return Response.json({ error: 'Missing data' }, { status: 400, headers: corsHeaders });
  }
  if (!env.TC_SECRET_ID || !env.TC_SECRET_KEY) {
    return Response.json({ error: 'Worker 未配置凭证' }, { status: 503, headers: corsHeaders });
  }

  // 浏览器发送的是 base64 音频，需要转成 ArrayBuffer
  // Worker 环境没有 ffmpeg，所以直接发送原始音频给腾讯云
  // 腾讯云 SOE 支持 voice_format: wav(1)，但浏览器录制的是 webm
  // 解决：前端用 wav 格式录制，或在这里用 Web Audio API 解码
  // 这里先用前端发送 wav 格式的方案
  const audioBuf = base64ToArrayBuffer(audioBase64);

  // 生成 WSS 签名
  const now = Math.floor(Date.now() / 1000);
  const params = {
    secretid: env.TC_SECRET_ID,
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
  const sig = await hmacSha1Base64(env.TC_SECRET_KEY, `soe.cloud.tencent.com/soe/api/${APP_ID}?${qRaw}`);
  const qEnc = sortedKeys.map(k => k + '=' + encodeURIComponent(params[k])).join('&');
  const url = `wss://soe.cloud.tencent.com/soe/api/${APP_ID}?${qEnc}&signature=${encodeURIComponent(sig)}`;

  // Worker 环境用 WebSocket 连接腾讯云
  try {
    const result = await evaluateViaWebSocket(url, audioBuf);
    return Response.json(result, { headers: corsHeaders });
  } catch (e) {
    return Response.json({ success: false, error: e.message }, { headers: corsHeaders });
  }
}

async function evaluateViaWebSocket(url, audioBuf) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let done = false;
    const timer = setTimeout(() => {
      try { ws.close(); } catch(e) {}
      if (!done) { done = true; resolve({ success: false, error: '评测超时' }); }
    }, 20000);

    ws.addEventListener('open', () => {
      ws.send(audioBuf);
      ws.send(JSON.stringify({ type: 'end' }));
    });

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.code && msg.code !== 0) {
          done = true; clearTimeout(timer);
          resolve({ success: false, error: '腾讯API错误(' + msg.code + '): ' + (msg.message || '') });
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

    ws.addEventListener('error', (e) => {
      clearTimeout(timer);
      if (!done) { done = true; resolve({ success: false, error: 'WebSocket 连接失败' }); }
    });
  });
}

async function hmacSha1Base64(key, message) {
  const enc = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', keyData, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
