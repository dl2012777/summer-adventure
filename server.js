const express = require('express');
const cors = require('cors');
const tencentcloud = require('tencentcloud-sdk-nodejs-soe');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Tencent Cloud credentials
// 从环境变量读取，部署时设置
const secretId = process.env.TC_SECRET_ID || '';
const secretKey = process.env.TC_SECRET_KEY || '';

if (!secretId || !secretKey) {
  console.error('请设置 TC_SECRET_ID 和 TC_SECRET_KEY 环境变量');
  process.exit(1);
}

const SoeClient = tencentcloud.soe.v20180724.Client;
const client = new SoeClient({
  credential: { secretId, secretKey },
  region: 'ap-guangzhou',
  profile: { httpProfile: { endpoint: 'soe.tencentcloudapi.com' } }
});

// 口语评测 API
app.post('/api/evaluate', async (req, res) => {
  try {
    const { audioBase64, refText, sessionId } = req.body;
    if (!audioBase64 || !refText) {
      return res.status(400).json({ error: 'Missing audioBase64 or refText' });
    }

    const sid = sessionId || 'summer_adventure_' + Date.now();

    // Step 1: Init session
    await client.InitOralProcess({
      SessionId: sid,
      RefText: refText,
      VoiceType: 0,       // 0=英文
      VoiceEncodeType: 1, // 1=WAV
      EvalMode: 1,        // 1=句子模式
      ScoreCoeff: 1.0,
      IsAsync: 0,
      ServerType: 1
    });

    // Step 2: Transmit audio
    const result = await client.TransmitOralProcess({
      SessionId: sid,
      VoiceType: 0,
      VoiceEncodeType: 1,
      UserVoiceData: audioBase64,
      RefText: refText,
      EvalMode: 1,
      ScoreCoeff: 1.0,
      IsEnd: 1,
      VoiceDuration: Math.ceil(audioBase64.length * 0.75 / 1024)
    });

    // Parse result
    const pronounceScore = result.PronAccuracy || 0;
    const fluencyScore = result.Fluency || 0;
    const completeness = result.Completeness || 0;
    const totalScore = Math.round((pronounceScore + fluencyScore + completeness) / 3);

    res.json({
      success: true,
      score: totalScore,
      accuracy: Math.round(pronounceScore),
      fluency: Math.round(fluencyScore),
      completeness: Math.round(completeness),
      suggest: result.SuggestedScore || totalScore,
      words: (result.Words || []).map(w => ({
        word: w.Word,
        score: w.PronScore,
        isCorrect: w.PronScore >= 60
      }))
    });

  } catch (e) {
    console.error('SOE Error:', e.message);
    res.status(500).json({ error: e.message, code: e.code });
  }
});

// 健康检查
app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = 8126;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on http://127.0.0.1:' + PORT);
});
