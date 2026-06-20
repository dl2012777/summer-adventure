// ============================================================
//  Speech — 语音模块（TTS + 录音识别 + 评分）
//  起步用 Web Speech API，后续接入腾讯云智聆
// ============================================================
const Speak = {
  _recognition: null,
  _isSupported: false,
  _ttsReady: false,

  init() {
    // 检测语音识别支持
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      this._recognition = new SR();
      this._recognition.lang = 'en-US';
      this._recognition.continuous = false;
      this._recognition.interimResults = false;
      this._recognition.maxAlternatives = 3;
      this._isSupported = true;
    }
    // TTS 预加载 voice
    if (window.speechSynthesis) {
      // 某些浏览器需要触发一次才能加载 voices
      window.speechSynthesis.getVoices();
      this._ttsReady = true;
    }
  },

  isSupported() { return this._isSupported; },

  // --- TTS：朗读句子 ---
  speak(text, callback) {
    if (!window.speechSynthesis) {
      if (callback) callback();
      return;
    }
    // 取消正在播放的
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.75;    // 慢速适合孩子
    utterance.pitch = 1.0;

    // 优先找女性英语发音人
    const voices = window.speechSynthesis.getVoices();
    const goodVoice = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google US English'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (goodVoice) utterance.voice = goodVoice;

    if (callback) utterance.onend = callback;
    window.speechSynthesis.speak(utterance);
  },

  // --- 录音识别 ---
  listen(callback) {
    if (!this._recognition) {
      callback(null, 'speech_not_supported');
      return;
    }

    this._recognition.onresult = (event) => {
      const results = [];
      for (let i = event.results.length - 1; i >= 0; i--) {
        const alt = event.results[i];
        for (let j = 0; j < alt.length; j++) {
          results.push(alt[j].transcript);
        }
      }
      callback(results[0] || '', null);
    };

    this._recognition.onerror = (event) => {
      callback(null, event.error);
    };

    this._recognition.onend = () => {
      // 如果 onresult 已经处理了，忽略 onend
    };

    try {
      this._recognition.start();
    } catch (e) {
      callback(null, 'recognition_error');
    }
  },

  stopListening() {
    if (this._recognition) {
      try { this._recognition.stop(); } catch (e) {}
    }
  },

  // --- 发音评分（文本匹配版） ---
  score(recognized, expected) {
    if (!recognized || recognized.trim() === '') {
      return { score: 0, stars: 0, feedback: '没有听到声音，再试一次？', accuracy: 0, errors: [] };
    }

    const r = recognized.toLowerCase().replace(/[.!?,]/g, '').trim();
    const e = expected.toLowerCase().replace(/[.!?,]/g, '').trim();

    const rWords = r.split(/\s+/).filter(w => w);
    const eWords = e.split(/\s+/).filter(w => w);

    if (eWords.length === 0) {
      return { score: 100, stars: 3, feedback: '太棒了！', accuracy: 100, errors: [] };
    }

    // 计算词级别匹配
    let matchCount = 0;
    const errors = [];
    const exactWordMatch = [];

    eWords.forEach((word, i) => {
      if (i < rWords.length) {
        if (rWords[i] === word) {
          matchCount++;
          exactWordMatch.push(true);
        } else {
          exactWordMatch.push(false);
          errors.push(word);
        }
      } else {
        exactWordMatch.push(false);
        errors.push(word);
      }
    });

    // 如果多读了一些词，不扣分太多
    const wordAccuracy = Math.round((matchCount / eWords.length) * 100);

    // 映射到得分
    let score, stars;
    if (wordAccuracy >= 90) {
      score = 100; stars = 3;
    } else if (wordAccuracy >= 70) {
      score = 80; stars = 2;
    } else if (wordAccuracy >= 50) {
      score = 60; stars = 1;
    } else {
      score = Math.max(30, wordAccuracy);
      stars = 0;
    }

    // 反馈信息
    let feedback;
    if (wordAccuracy >= 100) feedback = '完美！发音非常标准！⭐️⭐️⭐️';
    else if (wordAccuracy >= 90) feedback = '很棒！接近满分了！';
    else if (wordAccuracy >= 70) feedback = '不错！' + (errors.length > 0 ? `注意"${errors[0]}"的发音` : '');
    else if (wordAccuracy >= 50) feedback = `再练练，"${errors[0]}"再读准一点`;
    else feedback = `再听一遍原声，"${errors[0]}"跟读试试`;

    return { score, stars, feedback, accuracy: wordAccuracy, errors };
  }
};
