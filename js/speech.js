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
   // TTS 预加载 voice（不播 primer，避免 Chrome 卡死）
   if (window.speechSynthesis) {
     this._ttsReady = true;
     window.speechSynthesis.getVoices();
     // voices 异步加载，监听事件
     if (window.speechSynthesis.onvoiceschanged !== undefined) {
       window.speechSynthesis.onvoiceschanged = function() {
         window.speechSynthesis.getVoices();
       };
     }
   }
 },

  isSupported() { return this._isSupported; },

  // --- TTS：朗读句子 ---
  speak(text, callback) {
    if (!window.speechSynthesis) {
      if (callback) callback();
      return;
    }

    var ss = window.speechSynthesis;
    var self = this;

    function _doSpeak() {
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.75;    // 慢速适合孩子
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // 优先找女性英语发音人
      var voices = ss.getVoices();
      var goodVoice = null;
      for (var i = 0; i < voices.length; i++) {
        var v = voices[i];
        if (v.lang && v.lang.indexOf('en') === 0) {
          if (v.name.indexOf('Female') >= 0 || v.name.indexOf('Samantha') >= 0 || v.name.indexOf('Google US English') >= 0) {
            goodVoice = v;
            break;
          }
        }
      }
      if (!goodVoice) {
        for (var j = 0; j < voices.length; j++) {
          if (voices[j].lang && voices[j].lang.indexOf('en') === 0) {
            goodVoice = voices[j];
            break;
          }
        }
      }
      if (goodVoice) utterance.voice = goodVoice;

      if (callback) utterance.onend = callback;
      utterance.onerror = function() {
        if (callback) callback();
      };

      try {
        ss.speak(utterance);
        // Chrome 踹一脚：speak 后立即 resume，强制启动引擎
        ss.resume();
      } catch(e) {
        if (callback) callback();
      }
    }

    // 如果有东西在播放，先 cancel 再等 200ms
    if (ss.speaking || ss.pending) {
      ss.cancel();
      setTimeout(_doSpeak, 200);
    } else {
      _doSpeak();
    }
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
}

window.Speak = Speak;
