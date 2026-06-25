// ============================================================
//  Game Engine — 游戏引擎
//  4关流程：词汇→语法→听说→Boss + 错题重做
// ============================================================

const GameEngine = {
  // --- 状态 ---
  state: null,
  onComplete: null,

  // --- 关卡定义 ---
  STAGES: [
    { key:'vocab',    name:'词汇闯关', icon:'📝', desc:'选择题 · 词汇量大考验' },
    { key:'grammar',  name:'语法迷宫', icon:'🧠', desc:'选择题 · 语法规则要记牢' },
    { key:'listening',name:'听力挑战', icon:'🎧', desc:'听句子 · 选择正确答案' },
    { key:'speaking', name:'跟读挑战', icon:'🎤', desc:'跟读句子 · 发音评分' },
    { key:'boss',     name:'Boss关', icon:'⚡', desc:'限时挑战 · 分数翻倍' }
  ],

  // --- 难度时间配置 ---
  TIME_LIMITS: {
    easy: 15, medium: 20, hard: 25,
    listening: 30, speaking: 0, boss: 30  // 听力30s, 跟读不限, 阅读45s
  },

  FEEDBACK_WAIT_CORRECT: 4,   // 答对等4秒
  FEEDBACK_WAIT_WRONG: 7,     // 答错等7秒

  // --- 题目权重配置（可调节，单科 >= 10%，总和 100%） ---
  _getStageWeights(subject) {
    // 数学固定权重
    if (subject === 'math') return { vocab: 40, grammar: 32, listening: 0, speaking: 28 };
    // 英语：优先使用 Settings 内存
    try {
      var sw = window.Settings && window.Settings._weights;
      if (sw && sw.vocab && sw.grammar && sw.listening && sw.speaking &&
          sw.vocab >= 10 && sw.grammar >= 10 && sw.listening >= 10 && sw.speaking >= 10 &&
          sw.vocab + sw.grammar + sw.listening + sw.speaking === 100) {
        return sw;
      }
    } catch(e) {}
    // 英语：从 Store 读取
    try {
      var userName = Auth.currentUser;
      var all = Store._getData().stageWeights;
      var w = all && userName && all[userName];
      if (w && w.vocab && w.grammar && w.listening && w.speaking &&
          w.vocab >= 10 && w.grammar >= 10 && w.listening >= 10 && w.speaking >= 10 &&
          w.vocab + w.grammar + w.listening + w.speaking === 100) {
        return w;
      }
    } catch(e) {}
    return { vocab: 30, grammar: 30, listening: 20, speaking: 20 };
  },


  // --- 获取关卡显示名称（根据科目动态调整） ---
  _getStageDisplay(stageIndex) {
    var stage = this.STAGES[stageIndex];
    if (!stage) return { name: '', icon: '', desc: '' };
    var subject = this.state && this.state.subject;
    if (subject === 'math') {
      var m = {
        vocab: { name: '口算闯关', icon: '🔢', desc: '口算题·计算能力大考验' },
        grammar: { name: '概念闯关', icon: '📐', desc: '概念题·数学知识要记牢' },
        listening: { name: '审题挑战', icon: '📖', desc: '读题·理解题意选答案' },
        speaking: { name: '应用题', icon: '✏️', desc: '应用题·纸笔计算再输入答案' },
        boss: { name: '综合挑战', icon: '⚡', desc: '综合题·挑战更高难度' }
      }[stage.key];
      if (m) return m;
    }
    return { name: stage.name, icon: stage.icon, desc: stage.desc };
  },

  // --- 开始游戏 ---
  start(dayKey, questions, subject, dayNum, onCompleteCb) {
    this.onComplete = onCompleteCb;
    // Init sounds
    try { Sounds.init(); Speak.init(); } catch(e) {}

    // 按关卡分组
    // 自动从 STAGES 生成分组对象，避免手动修改不同步
    const grouped = {};
    this.STAGES.forEach(function(s) { grouped[s.key] = []; });
    questions.forEach(q => {
      const type = q.type || 'vocabulary';
      if (type === 'vocabulary' || type === 'vocab') grouped.vocab.push(q);
      else if (type === 'grammar') grouped.grammar.push(q);
      else if (type === 'listening') grouped.listening.push(q);
      else if (type === 'speaking') grouped.speaking.push(q);
      else if (type === 'boss' || type === 'reading') grouped.boss.push(q);
    });

    // 打乱每组内顺序（同时打乱选项位置）
    this._shuffleAllOptions(grouped);
    Object.keys(grouped).forEach(k => this._shuffle(grouped[k]));

    // 根据权重分配题数和分值（最大题数：词汇20/语法20/听力12/跟读12）
    var weights = GameEngine._getStageWeights(subject);
    var MAX_COUNTS = { vocab:25, grammar:25, listening:12, speaking:12 };
    if (subject === 'math') MAX_COUNTS = { vocab:15, grammar:15, listening:0, speaking:15 };
    var stageKeys = ['vocab','grammar','listening','speaking'];
    stageKeys.forEach(function(k) {
      // Math speaking (应用题) is handled separately below — skip here
      if (subject === 'math' && k === 'speaking') return;
      var avail = grouped[k].length;
      if (avail === 0 || weights[k] <= 0) return;
      var target = Math.round(MAX_COUNTS[k] * weights[k] / 60);
      target = Math.max(2, Math.min(target, avail));
      var totalPts = weights[k];
      var bestC = target, bestS = totalPts / target, bestScore = 999999;
      for (var c = Math.min(avail, MAX_COUNTS[k]); c >= 2; c--) {
        var s = totalPts / c, r = Math.round(s * 2) / 2;
        var total = Math.round(c * r);
        var totalDiff = Math.abs(total - totalPts);
        var countDiff = Math.abs(c - target);
        var score = totalDiff * 1000 + countDiff;
        if (score < bestScore) { bestScore = score; bestC = c; bestS = r; }
      }
      grouped[k] = grouped[k].slice(0, bestC);
      grouped[k].forEach(function(q) { q.pointValue = bestS; });
    });
    // Math 应用题: force exactly 3 questions, distribute weight as evenly as possible
    // e.g. weight 28 -> [10, 9, 9] = 28 total
    if (subject === 'math' && weights.speaking > 0 && grouped.speaking && grouped.speaking.length >= 3) {
      grouped.speaking = grouped.speaking.slice(0, 3);
      var spBase = Math.floor(weights.speaking / 3);
      var spRem = weights.speaking - spBase * 3;
      grouped.speaking.forEach(function(q, i) {
        q.pointValue = spBase + (i < spRem ? 1 : 0);
      });
    }
    // Boss 固定 3 题 × 10 分
    grouped.boss = grouped.boss.slice(0, 3);
    grouped.boss.forEach(function(q) { q.pointValue = 10; });

    this.state = {
      dayKey, subject, dayNum,
      stageQuestions: grouped,
      stageIndex: 0,
      questionIndex: 0,
      score: 0,
      streak: 0,
      maxStreak: 0,
      stageResults: [],
      allAnswers: [],       // 所有答案记录
      wrongIds: new Set(),  // 错题ID集合
      isReviewMode: false,
      timerInterval: null,
      currentTimer: null,
      isWaiting: false      // 冷却等待中
    };

    // 找到第一个有题目的关卡（跳过空关卡）
    var _fs = 0;
    while (_fs < this.STAGES.length) {
      var _sk = this.STAGES[_fs].key;
      if (this.state.stageQuestions[_sk] && this.state.stageQuestions[_sk].length > 0) break;
      _fs++;
    }
    this._renderStageIntro(_fs);

    // 如果设置了 _skipToStage，直接跳到指定关卡
    if (this._skipToStage !== undefined) {
      var _skipIdx = this._skipToStage;
      this._skipToStage = undefined;
      var _se = this;
      setTimeout(function() { if (_se.state) _se._startStage(_skipIdx); }, 400);
    }
  },

  // --- 关卡介绍 ---
  _renderStageIntro(stageIndex) {
    this._clearTimer();
    const stage = this.STAGES[stageIndex];
    var display = this._getStageDisplay(stageIndex);
    const qCount = this.state.stageQuestions[stage.key].length;
    const container = document.getElementById('game-content');


    // 听说关特殊提示
    let timeDesc = '';
    if (stage.key === 'listening') {
      timeDesc = '听音选答 · 每题播一遍';
    } else if (stage.key === 'speaking') {
      timeDesc = '不限时 · 跟读评分';
    } else if (stage.key === 'boss') {
      timeDesc = `限时 ${this.TIME_LIMITS.boss}s/题 · 分数翻倍`;
    } else {
      timeDesc = '限时 15-25秒/题';
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:20px;animation:fadeIn .4s ease;">
        <div style="font-size:64px;margin-bottom:12px;">${display.icon}</div>
        <h2 style="font-size:24px;font-weight:800;margin-bottom:6px;">第${stageIndex+1}关 · ${display.name}</h2>
        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:4px;">${display.desc}</p>
        <p style="font-size:13px;color:var(--text-tertiary);margin-bottom:24px;">${qCount}道题 · ${timeDesc}</p>
        <button class="btn ${this.state.subject === 'en' ? 'btn-primary' : 'btn-math'}" onclick="GameEngine._startStage(${stageIndex})">
          🚀 准备开始
        </button>
      </div>
    `;
  },

  // --- 开始一个关卡 ---
  _startStage(stageIndex) {
    this.state.stageIndex = stageIndex;
    this.state.questionIndex = 0;
    this.state.streak = 0;
    this._showQuestion(stageIndex, 0);
  },

  // --- 显示题目 ---
  _showQuestion(stageIndex, qIndex) {
    const stage = this.STAGES[stageIndex];
    var display = this._getStageDisplay(stageIndex);
    const questions = this.state.stageQuestions[stage.key];
    if (qIndex >= questions.length) {
      this._completeStage(stageIndex);
      return;
    }

    const q = questions[qIndex];
    this.state.questionIndex = qIndex;
    this.state.isWaiting = false;

    // 设置时间限制
    let timeLimit;
    if (stage.key === 'speaking') {
      timeLimit = 0; // 不限时
    } else if (stage.key === 'boss') {
      timeLimit = this.TIME_LIMITS.boss;
    } else if (stage.key === 'listening') {
      timeLimit = this.TIME_LIMITS.listening;
    } else {
      timeLimit = this.TIME_LIMITS[q.difficulty] || this.TIME_LIMITS.medium;
    }

    const container = document.getElementById('game-content');

    let optionsHtml = '';
    const labels = ['A','B','C','D'];

    if (stage.key === 'listening') {
      // 听力挑战——先播原声，再做选择题
      var listenText = q.textToSpeak || q.question || '';
      optionsHtml = `
        <div style="text-align:center;padding:10px 0;animation:fadeIn .3s ease;">
          <div style="font-size:18px;line-height:1.6;color:var(--text);margin:16px 0;padding:20px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;font-weight:500;">
            ${q.question}
          </div>
          <div style="text-align:center;margin-bottom:12px;">
            <button class="btn btn-small btn-primary" onclick="GameEngine._playListenAudio()">
              🔊 播放声音
            </button>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${q.options.map(function(opt, i) {
              return '<button class="game-option" onclick="GameEngine._handleAnswer(' + stageIndex + ',' + qIndex + ',' + i + ')">' +
                '<span class="opt-label">' + labels[i] + '</span>' +
                '<span class="opt-text">' + opt + '</span>' +
                '</button>';
            }.bind(this)).join('')}
          </div>
        </div>
      `;
      // Store listening text for playback
      this._listenText = listenText;
      // 自动播放一次
      var _this = this;
      setTimeout(function() { _this._playListenAudio(); }, 500);
    } else if (stage.key === 'speaking' && q.answerValue === undefined) {
      // 听说挑战——听原声 + 跟读 + 评分
      var speakText = q.textToSpeak || q.question || '';
      this._speakText = speakText;
      optionsHtml = `
        <div id="speaking-area" style="text-align:center;padding:10px 0;animation:fadeIn .3s ease;">
          <div style="font-size:18px;line-height:1.6;color:var(--text);margin:16px 0;padding:20px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;font-weight:500;">
            &ldquo;${q.textToSpeak || q.question}&rdquo;
          </div>
          <div id="speaking-controls" style="display:flex;gap:12px;justify-content:center;margin:16px 0;flex-wrap:wrap;">
            <button class="btn btn-small btn-primary" id="speak-play-btn" onclick="GameEngine._playSpeakAudio()">
              🔊 听原声
            </button>
            <button class="btn btn-small btn-outline" id="speak-record-btn" onclick="GameEngine._startRecording()">
              🎤 开始跟读
            </button>
          </div>
          <div id="speaking-status" style="font-size:14px;font-weight:500;color:var(--text-secondary);margin:12px 0;min-height:28px;">
            🔊 正在播放原声...
          </div>
         <div id="speaking-result" style="display:none;margin:16px auto;max-width:300px;padding:16px;border-radius:12px;"></div>
         <div id="volume-meter" style="display:none;margin:16px auto;text-align:center;">
           <div style="display:flex;align-items:center;gap:8px;justify-content:center;padding:12px;background:rgba(255,255,255,0.05);border-radius:12px;max-width:200px;margin:0 auto;">
             <span style="font-size:28px;">🎤</span>
             <div id="wifi-bars" style="display:flex;align-items:end;gap:3px;height:20px;">
               <div class="wifi-bar" style="width:6px;height:6px;border-radius:1px;background:rgba(255,255,255,0.1);transition:background .1s;"></div>
               <div class="wifi-bar" style="width:6px;height:12px;border-radius:1px;background:rgba(255,255,255,0.1);transition:background .1s;"></div>
               <div class="wifi-bar" style="width:6px;height:20px;border-radius:1px;background:rgba(255,255,255,0.1);transition:background .1s;"></div>
             </div>
             <span id="recording-timer" style="font-size:13px;color:var(--text-secondary);min-width:36px;">0s</span>
           </div>
         </div>
         <div id="speaking-actions" style="display:none;gap:10px;justify-content:center;margin-top:12px;flex-wrap:wrap;"></div>
          <p style="font-size:11px;color:var(--text-tertiary);margin-top:16px;">
            ${Speak.isSupported() ? '\u{1F399}\u{FE0F} 浏览器语音识别已就绪' : '\u26A0\u{FE0F} 当前浏览器不支持语音识别'}
          </p>
        </div>
      `;
    } else if (q.answerValue !== undefined) {
      // 应用题——文本输入答案（支持分数和数字）
      var isFrac = String(q.answerValue).indexOf('/') >= 0;
      if (isFrac) {
        optionsHtml = '<div style="text-align:center;margin-top:16px;">' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:4px;">' +
          '<input id="text-answer-num" type="text" inputmode="numeric" maxlength="3" class="input" placeholder="?" style="width:50px;text-align:center;font-size:20px;padding:8px;">' +
          '<span style="font-size:24px;font-weight:600;color:var(--text);">/</span>' +
          '<input id="text-answer-den" type="text" inputmode="numeric" maxlength="3" class="input" placeholder="?" style="width:50px;text-align:center;font-size:20px;padding:8px;">' +
          '</div>' +
          '<button class="btn btn-primary" onclick="GameEngine._submitTextAnswer()" style="margin-top:8px;">确认答案</button></div>';
      } else {
        optionsHtml = '<div style="text-align:center;margin-top:16px;">' +
          '<input id="text-answer-input" type="text" inputmode="decimal" class="input" placeholder="答案" style="width:100px;text-align:center;font-size:20px;padding:10px;margin:0 auto;">' +
          '<button class="btn btn-primary" onclick="GameEngine._submitTextAnswer()" style="margin-top:8px;">确认答案</button></div>';
      }
    } else {
      // 普通选择题（含阅读理解显示文章）
      var pText = (q.passage || '').replace(/'/g, "\\'");
      var showPassage = pText ? '<div style="margin-bottom:16px;padding:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;font-size:15px;line-height:1.8;text-align:left;">' + pText + '</div>' : '';
      optionsHtml = showPassage + `
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px;">
          ${q.options.map(function(opt, i) {
            return '<button class="game-option" data-index="' + i + '"' +
              ' onclick="GameEngine._handleAnswer(' + stageIndex + ',' + qIndex + ',' + i + ')"' +
              (this.state.isWaiting ? ' disabled' : '') + '>' +
              '<span class="opt-label">' + labels[i] + '</span>' +
              '<span class="opt-text">' + opt + '</span>' +
              '</button>';
          }.bind(this)).join('')}
        </div>
      `;
    }

    // 进度指示
    // 计算当天累计进度（跨所有关卡）
    const stageOrder = this.STAGES.map(function(s) { return s.key; });
    let stageOffset = 0;
    for (let si = 0; si < stageIndex; si++) {
      const sk = stageOrder[si];
      if (this.state.stageQuestions[sk]) stageOffset += this.state.stageQuestions[sk].length;
    }
    let totalAll = 0;
    stageOrder.forEach(sk => {
      if (this.state.stageQuestions[sk]) totalAll += this.state.stageQuestions[sk].length;
    });
    const globalQ = stageOffset + qIndex + 1;
    const progress = `${globalQ}/${totalAll} 题（本关 ${qIndex+1}/${questions.length}）`;

    container.innerHTML = `
      <div style="animation:fadeIn .3s ease;">
        <div id="game-topbar" style="display:flex;align-items:center;gap:8px;padding:8px 0 4px;">
          <span class="game-stage-badge" style="font-size:12px;font-weight:600;padding:3px 10px;border-radius:10px;
            background:${this.state.subject === 'en' ? 'rgba(124,92,191,0.2)' : 'rgba(230,126,34,0.2)'};
            color:${this.state.subject === 'en' ? '#A78BDB' : '#F0B27A'};
          ">${display.icon} ${display.name}</span>
          <span style="flex:1;"></span>
          ${stage.key !== 'speaking' && stage.key !== 'listening' ? `<span id="game-timer-text" style="font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;min-width:32px;text-align:right;">
            ${timeLimit > 0 ? timeLimit + 's' : '--'}</span>` : ''}
        </div>

        ${stage.key !== 'speaking' && stage.key !== 'listening' ? `
        <div class="timer-wrap" style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <div class="timer-bar-track" style="flex:1;height:4px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;">
            <div id="game-timer-bar" style="height:100%;background:${this.state.subject === 'en' ? '#A78BDB' : '#F0B27A'};border-radius:4px;width:100%;transition:width 1s linear;"></div>
          </div>
          <span id="game-score-display" style="font-size:13px;font-weight:600;white-space:nowrap;">⭐ ${this.state.streak > 0 ? 'x'+this.state.streak+' · ' : ''}${this.state.score}</span>
        </div>` : (stage.key === 'speaking' && this.state.subject === 'math' ? `
        <div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:12px;">
          <span id="game-score-display" style="font-size:13px;font-weight:600;white-space:nowrap;">⭐ ${this.state.streak > 0 ? 'x'+this.state.streak+' · ' : ''}${this.state.score}</span>
        </div>` : '')}

        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <span class="progress-text" style="font-size:13px;color:var(--text-secondary);">第 ${progress} 题</span>
          ${stage.key === 'boss' ? '<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:rgba(231,76,60,0.15);color:#E74C3C;">10分/题</span>' : ''}
        </div>

        <div class="question-text" style="font-size:17px;font-weight:500;line-height:1.7;padding:4px 0;">
          ${q.question}
        </div>

        ${optionsHtml}
      </div>
    `;

    // 启动计时器
    if (stage.key !== 'speaking' && timeLimit > 0) {
      this._startTimer(timeLimit);
    }
    // 跟读关：1秒后自动播放原声
    if (stage.key === 'speaking' && this._speakText) {
      var _spText = this._speakText;
      setTimeout(function() {
        Speak.speak(_spText, function() {
          var st = document.getElementById('speaking-status');
          if (st) st.textContent = '👆 现在点击"开始跟读"大声朗读';
        });
      }, 1000);
    }
  },

  // --- 计时器 ---
  _startTimer(seconds) {
    this._clearTimer();
    let remaining = seconds;
    const bar = document.getElementById('game-timer-bar');
    const text = document.getElementById('game-timer-text');
    if (!bar || !text) return;

    bar.style.width = '100%';
    text.textContent = remaining + 's';
    bar.style.background = this.state.subject === 'en' ? '#A78BDB' : '#F0B27A';

    this.state.currentTimer = setInterval(() => {
      remaining--;
      if (remaining < 0) remaining = 0;
      const pct = (remaining / seconds) * 100;
      if (bar) {
        bar.style.width = pct + '%';
        if (remaining <= 3) bar.style.background = '#E74C3C';
      }
      if (text) text.textContent = remaining + 's';
      if (remaining <= 0) {
        this._clearTimer();
      }
    }, 1000);
  },

  _clearTimer() {
    if (this.state && this.state.currentTimer) {
      clearInterval(this.state.currentTimer);
      this.state.currentTimer = null;
    }
  },

  // --- 处理选择题答案 ---
  _handleAnswer(stageIndex, qIndex, selectedIndex) {
    if (this.state.isWaiting) return;
    this.state.isWaiting = true;
    this._clearTimer();

    const stage = this.STAGES[stageIndex];
    var display = this._getStageDisplay(stageIndex);
    const questions = this.state.stageQuestions[stage.key];
    const q = questions[qIndex];
   let isCorrect;
   if (q.answerValue !== undefined) {
     var isFrac = String(q.answerValue).indexOf('/') >= 0;
     var userAnswer;
     if (isFrac) {
       var num = document.getElementById('text-answer-num');
       var den = document.getElementById('text-answer-den');
       userAnswer = (num ? num.value.trim() : '0') + '/' + (den ? den.value.trim() : '0');
     } else {
       var input = document.getElementById('text-answer-input');
       userAnswer = input ? input.value.trim() : '';
     }
     isCorrect = userAnswer === String(q.answerValue).trim();
   } else {
     isCorrect = selectedIndex === q.answer;
   }

  // 计算得分
   let score = 0;

   if (isCorrect) {
     score = q.pointValue || 10;
     this.state.streak++;
     if (this.state.streak > this.state.maxStreak) this.state.maxStreak = this.state.streak;
     this.state.score += score;
   } else {
     this.state.streak = 0;
     this.state.wrongIds.add(q.id);
   }

    // 记录答案
    this.state.allAnswers.push({
      question: q,
      selectedIndex,
      isCorrect,
      score,
      timeSpent: 5
    });

    // 渲染反馈
    this._renderFeedback(stageIndex, qIndex, q, selectedIndex, isCorrect, score, () => {
      const nextQ = qIndex + 1;
      if (nextQ >= questions.length) {
        this._completeStage(stageIndex);
      } else {
        this._showQuestion(stageIndex, nextQ);
      }
    });
  },

  // --- 处理听说完成 ---
  
  // --- 播放听力音频 ---
  _playListenAudio() {
    if (this._listenText) {
      Speak.speak(this._listenText);
    }
  },

  // --- 播放跟读原声 ---
  _playSpeakAudio() {
    if (this._speakText) {
      Speak.speak(this._speakText);
    }
  },

_startRecording() {
    if (this.state.isWaiting) return;
    this.state.isWaiting = true;

    const statusEl = document.getElementById('speaking-status');
    const recordBtn = document.getElementById('speak-record-btn');
    const playBtn = document.getElementById('speak-play-btn');

    if (statusEl) statusEl.textContent = '🎤 录音中... 请对着麦克风朗读';
    if (recordBtn) { recordBtn.textContent = '⏳ 录音中...'; recordBtn.disabled = true; }
    if (playBtn) playBtn.disabled = true;

    const stageIndex = this.state.stageIndex;
    const stage = this.STAGES[stageIndex];
    const questions = this.state.stageQuestions['speaking'];
    const qIdx = this.state.questionIndex;
    const q = questions[qIdx];
    var refText = q ? (q.textToSpeak || '') : '';
    var _this = this;

    // 立即请求麦克风
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function(stream) {
        // 显示音量表
        var vm = document.getElementById('volume-meter');
        if (vm) vm.style.display = 'block';
        if (statusEl) statusEl.textContent = '🎤 录音中... 大声朗读！';

        // 创建音频分析器（音量可视化）
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var source = audioCtx.createMediaStreamSource(stream);
        var analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        var volData = new Uint8Array(analyser.frequencyBinCount);
        var volRAF = null;
        // 动态录音参数 + 静音检测
        var wordCount = refText.split(/\s+/).filter(function(w){ return w.length > 0; }).length;
        var maxDuration = Math.max(5, Math.min(20, wordCount * 2.0));
        var silenceCount = -1;
        var silencePromptShown = false;
        var silenceTimeoutHit = false;
        var voiceDetected = false;
        var frameStart = Date.now();
        var elapsedSec = 0;
        var chunks = [];
        var recorder = null;

        function updateVolume() {
          if (!recorder || recorder.state === 'inactive') { volRAF = null; return; }
          analyser.getByteFrequencyData(volData);
          var sum = 0;
          for (var vi = 0; vi < volData.length; vi++) sum += volData[vi];
          var avg = sum / volData.length;
          var pct = Math.min(100, Math.round((avg / 128) * 100));
          var level = pct < 15 ? 0 : pct < 40 ? 1 : pct < 70 ? 2 : 3;
          var bars = document.querySelectorAll('.wifi-bar');
          var colors = ['rgba(39,174,96,0.9)', 'rgba(241,196,15,0.9)', 'rgba(231,76,60,0.9)'];
          bars.forEach(function(b, i) {
            b.style.background = i < level ? colors[Math.min(i, 2)] : 'rgba(255,255,255,0.1)';
          });
          if (level === 0) {
            if (silenceCount === -1) silenceCount = elapsedSec;
            var silenceDur = elapsedSec - silenceCount;
            if (!voiceDetected) {
              // 还没说过话：3s提示 → 6s超时 → 未作答
              if (silenceDur >= 3.0 && !silencePromptShown) {
                silencePromptShown = true;
                if (statusEl) statusEl.textContent = '🔊 请大声朗读！';
              }
              if (silenceDur >= 6.0) {
                silenceTimeoutHit = true;
                if (recorder && recorder.state === 'recording') recorder.stop();
              }
            } else {
              // 说过话：3s静音 → 认为读完了，提交评测
              if (silenceDur >= 3.0) {
                if (recorder && recorder.state === 'recording') recorder.stop();
              }
            }
          } else {
            silenceCount = -1;
            silencePromptShown = false;
            voiceDetected = true;
            if (statusEl && elapsedSec > 0.5) statusEl.textContent = '🎤 继续朗读...';
          }
          var now = Date.now();
          elapsedSec += (now - frameStart) / 1000;
          frameStart = now;
          if (elapsedSec >= maxDuration) {
            if (recorder && recorder.state === 'recording') recorder.stop();
          }
          var timerEl = document.getElementById('recording-timer');
          if (timerEl) timerEl.textContent = Math.ceil(elapsedSec) + 's';
          volRAF = requestAnimationFrame(updateVolume);
        }

        // 立即开始录音
        if (statusEl) statusEl.textContent = '🎤 录音中... 请大声朗读';
        var mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
        recorder = new MediaRecorder(stream, { mimeType: mimeType });
        recorder.ondataavailable = function(e) { if (e.data.size > 0) chunks.push(e.data); };

        recorder.onstop = function() {
          if (volRAF) { cancelAnimationFrame(volRAF); volRAF = null; }
          try { audioCtx.close(); } catch(e) {}
          stream.getTracks().forEach(function(t) { t.stop(); });
          // 未说过话 + 静音超时→ 未作答
          if (silenceTimeoutHit) {
            _this.state.isWaiting = false;
            if (statusEl) statusEl.textContent = '⏭️ 未作答';
            if (recordBtn) { recordBtn.textContent = '🎤 开始跟读'; recordBtn.disabled = false; }
            if (playBtn) playBtn.disabled = false;
            _this.state.allAnswers.push({ question: q, selectedIndex: -1, isCorrect: false, score: 0, timeSpent: 0 });
            var actionsEl2 = document.getElementById('speaking-actions');
            if (actionsEl2) {
              actionsEl2.style.display = 'flex';
              actionsEl2.innerHTML = '<button class="btn btn-small btn-outline" onclick="GameEngine._advanceSpeaking()">进入下一题 →</button>';
            }
            return;
          }
          // 说过话 + 静音 3s → 正常发送评测
          if (statusEl) statusEl.textContent = '✅ 评价中...';
          var blob = new Blob(chunks, { type: 'audio/webm' });
          var reader = new FileReader();
          reader.onloadend = function() {
            var base64 = reader.result.split(',')[1];
            var apiUrl = window.SOE_API_URL || ('https://' + window.location.hostname + ':8126/api/evaluate');
            fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64, refText: refText })
            })
            .then(function(r) { return r.json(); })
            .then(function(result) {
              _this._handleTencentResult(result, statusEl, recordBtn, playBtn, q, refText, questions);
            })
            .catch(function(err) {
              _this.state.isWaiting = false;
              if (statusEl) statusEl.textContent = '⚠️ 评测服务连接失败，请在项目目录运行 node server.js';
              if (recordBtn) { recordBtn.textContent = '🎤 开始跟读'; recordBtn.disabled = false; }
              if (playBtn) playBtn.disabled = false;
            });
          };
          reader.readAsDataURL(blob);
        };

        recorder.onerror = function() {
          stream.getTracks().forEach(function(t) { t.stop(); });
          _this.state.isWaiting = false;
          if (statusEl) statusEl.textContent = '⚠️ 录音失败，请重试';
          if (recordBtn) { recordBtn.textContent = '🎤 开始跟读'; recordBtn.disabled = false; }
          if (playBtn) playBtn.disabled = false;
        };

        recorder.start();
        frameStart = Date.now();
        updateVolume();
        setTimeout(function() { if (recorder.state === 'recording') recorder.stop(); }, maxDuration * 1000);
      })
      .catch(function() {
        _this.state.isWaiting = false;
        if (statusEl) statusEl.textContent = '⚠️ 麦克风权限被拒绝';
        if (recordBtn) { recordBtn.textContent = '🎤 开始跟读'; recordBtn.disabled = false; }
        if (playBtn) playBtn.disabled = false;
      });
  },  _retrySpeaking() {
    const statusEl = document.getElementById('speaking-status');
    const resultEl = document.getElementById('speaking-result');
    const actionsEl = document.getElementById('speaking-actions');
    const recordBtn = document.getElementById('speak-record-btn');

    if (statusEl) statusEl.textContent = '👆 再听一次原声，然后点击麦克风';
    if (resultEl) resultEl.style.display = 'none';
    if (actionsEl) actionsEl.style.display = 'none';
    if (recordBtn) recordBtn.disabled = false;
    this.state.isWaiting = false;
  },

  _nextSpeaking() {
    const stageIndex = this.state.stageIndex;
    const questions = this.state.stageQuestions['speaking'];
    const nextQ = this.state.questionIndex + 1;

    if (nextQ >= questions.length) {
      this._completeStage(stageIndex);
    } else {
      this._showQuestion(stageIndex, nextQ);
    }
  },

  // --- 提交应用题答案 ---
  _submitTextAnswer() {
    this._handleAnswer(this.state.stageIndex, this.state.questionIndex, -1);
  },

  // --- 处理腾讯口语评测结果 ---
  _handleTencentResult(result, statusEl, recordBtn, playBtn, q, refText, questions) {
    this.state.isWaiting = false;
    if (recordBtn) { recordBtn.textContent = '🎤 开始跟读'; recordBtn.disabled = false; }
    if (playBtn) playBtn.disabled = false;

    const resultEl = document.getElementById('speaking-result');
    const actionsEl = document.getElementById('speaking-actions');
    const statusEl2 = document.getElementById('speaking-status');

    if (!result.success) {
      if (statusEl2) statusEl2.textContent = '⚠️ ' + (result.error || '评测失败');
      if (resultEl) { resultEl.style.display = 'none'; }
      if (actionsEl) {
        actionsEl.style.display = 'flex';
        actionsEl.innerHTML = '<button class="btn btn-small btn-outline" onclick="GameEngine._advanceSpeaking()">下一题 →</button>';
      }
      return;
    }

    var scoreVal = result.score || 0;
    var accVal = result.accuracy || 0;

    // 分数校准：每个词 +10%，最高 100 分
    var boostedScore = scoreVal;
    var boostedWords = null;
    if (result.words && result.words.length > 0) {
      boostedWords = result.words.map(function(w) {
        return { word: w.word, orig: w.score, boosted: Math.min(100, Math.round(w.score * 1.1)), origCorrect: w.isCorrect };
      });
      var sum = boostedWords.reduce(function(s, w) { return s + w.boosted; }, 0);
      boostedScore = Math.round(sum / boostedWords.length);
    }
    scoreVal = boostedScore;

    if (statusEl2) statusEl2.textContent = '✅ 评测完成！得分 ' + scoreVal + ' 分';

    if (resultEl) {
      var wordDetails = '';
      if (boostedWords && boostedWords.length > 0) {
        wordDetails = '<div style="margin-top:8px;font-size:12px;display:flex;flex-wrap:wrap;gap:4px;justify-content:center;">' +
          boostedWords.map(function(w) {
            var ds = Math.max(0, w.boosted);
            return '<span style="padding:2px 6px;border-radius:4px;background:' + (ds >= 60 ? 'rgba(39,174,96,0.2)' : 'rgba(231,76,60,0.2)') + ';color:' + (ds >= 60 ? '#27AE60' : '#E74C3C') + ';">' + w.word + ' ' + ds + '</span>';
          }).join('') + '</div>';
      }
      resultEl.style.display = 'block';
      resultEl.innerHTML = '<div style="font-size:20px;font-weight:700;color:' + (scoreVal >= 80 ? '#27AE60' : '#F39C12') + ';">' + scoreVal + ' 分</div>' +
        wordDetails;
    }

    var speakingScore = scoreVal >= 50 ? (q.pointValue || 10) : 0;
    this.state.score += speakingScore;
    this.state.allAnswers.push({
      question: q,
      selectedIndex: -1,
      isCorrect: scoreVal >= 60,
      score: speakingScore,
      timeSpent: 5
    });

    if (actionsEl) {
      actionsEl.style.display = 'flex';
      actionsEl.innerHTML = '<button class="btn btn-small ' + (this.state.subject === 'en' ? 'btn-primary' : 'btn-math') + '" onclick="GameEngine._advanceSpeaking()">下一题 →</button>';
    }
  },

  // --- 跟读完成后推进 ---
  _advanceSpeaking() {
    var state = this.state;
    var stageIndex = state.stageIndex;
    var questions = state.stageQuestions['speaking'];
    var nextQ = state.questionIndex + 1;
    if (nextQ >= questions.length) {
      this._completeStage(stageIndex);
    } else {
      this._showQuestion(stageIndex, nextQ);
    }
  },

  // --- 获取剩余时间 ---
  _getTimeRemaining() {
    // 简化的剩余时间估算
    const text = document.getElementById('game-timer-text');
    if (text) {
      const match = text.textContent.match(/(\d+)s/);
      if (match) return parseInt(match[1]);
    }
    return 0;
  },

  // --- 反馈渲染 ---
  _renderFeedback(stageIndex, qIndex, q, selectedIndex, isCorrect, score, onDone) {
    // Play sound effect
    try {
      if (isCorrect) { Sounds.playCorrect(); }
      else { Sounds.playWrong(); Sounds.playHammer(); }
    } catch(e) {}
    const labels = ['A','B','C','D'];
    const waitTime = isCorrect ? this.FEEDBACK_WAIT_CORRECT : this.FEEDBACK_WAIT_WRONG;

    const container = document.getElementById('game-content');

    const streakHtml = this.state.streak >= 2
      ? `<div style="margin-top:8px;font-size:18px;">🔥 连击 x${this.state.streak}</div>`
      : '';

    container.innerHTML += `
      <div class="feedback-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;animation:fadeIn .2s ease;">
        <div style="font-size:52px;margin-bottom:8px;">${isCorrect ? '✅' : '<span class="hammer-icon">🔨</span>'}</div>
        <div style="font-size:22px;font-weight:700;margin-bottom:4px;color:${isCorrect ? '#27AE60' : '#E74C3C'}">
          ${isCorrect ? `正确！+${score}分` : '哎呀，答错了'}
        </div>
        ${streakHtml}

        <div style="margin-top:16px;padding:16px 20px;background:rgba(255,255,255,0.05);border-radius:12px;max-width:340px;">
          ${!isCorrect ? `<div style="font-size:17px;color:var(--text-secondary);margin-bottom:8px;">
            正确答案：<span style="color:#27AE60;font-weight:600;">${q.answerValue !== undefined ? q.answerValue : labels[q.answer] + '. ' + q.options[q.answer]}</span>
            ${q.answerValue === undefined ? '<br>你的答案：<span style="color:#E74C3C;">' + labels[selectedIndex] + '. ' + q.options[selectedIndex] + '</span>' : ''}
          </div>` : ''}
          <div style="font-size:16px;color:var(--text-secondary);margin-top:8px;line-height:1.6;">
            💡 ${q.explanation || ''}
          </div>
        </div>

        <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px;align-items:center;">
          <div id="feedback-countdown" style="font-size:13px;color:var(--text-secondary);margin-top:12px;">
            ${waitTime}秒后自动跳转...
          </div>
        </div>
      </div>
    `;

    // 倒计时
    let remaining = waitTime;
    this._feedbackOnDone = onDone;
    this._feedbackContainer = container;
    const countdownEl = document.getElementById('feedback-countdown');
    this._feedbackInterval = setInterval(() => {
      remaining--;
      if (countdownEl) countdownEl.textContent = `${remaining}秒后自动跳转...`;
      if (remaining <= 0) {
        clearInterval(this._feedbackInterval);
        const overlay = container.querySelector('.feedback-overlay');
        if (overlay) overlay.remove();
        this.state.isWaiting = false;
        onDone();
      }
    }, 1000);
  },

  // --- 完成一个关卡 ---
  _completeStage(stageIndex) {
    const stage = this.STAGES[stageIndex];
    var display = this._getStageDisplay(stageIndex);
    const questions = this.state.stageQuestions[stage.key];
    const stageAnswers = this.state.allAnswers.filter(a => questions.includes(a.question));
    const correctCount = stageAnswers.filter(a => a.isCorrect).length;
    const stageScore = stageAnswers.reduce((sum, a) => sum + (a.score || 0), 0);

    // Boss关分数翻倍
    const finalScore = stageScore;
    const accuracy = Math.round((correctCount / questions.length) * 100);

    this.state.stageResults.push({
      key: stage.key,
      name: display.name,
      icon: display.icon,
      correct: correctCount,
      total: questions.length,
      accuracy,
      score: finalScore
    });

    // 找到下一个有题目的关卡
    var n = stageIndex + 1;
    while (n < this.STAGES.length) {
      var sk = this.STAGES[n].key;
      if (this.state.stageQuestions[sk] && this.state.stageQuestions[sk].length > 0) break;
      n++;
    }
    if (n >= this.STAGES.length) {
      this._completeGame();
      return;
    }
    var nextStage = n;

    // 显示关卡完成
    const container = document.getElementById('game-content');
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:20px;animation:fadeIn .4s ease;">
        <div style="font-size:52px;margin-bottom:8px;">${accuracy >= 80 ? '🎉' : '👍'}</div>
        <h2 style="font-size:22px;font-weight:700;margin-bottom:6px;">${display.icon} ${display.name} 完成！</h2>
        <div style="display:flex;gap:16px;margin:16px 0;">
          <div style="text-align:center;">
            <div style="font-size:20px;font-weight:700;color:#27AE60;">${correctCount}/${questions.length}</div>
            <div style="font-size:12px;color:var(--text-secondary);">正确</div>
          </div>
          <div style="width:1px;background:var(--border);"></div>
          <div style="text-align:center;">
            <div style="font-size:20px;font-weight:700;">${finalScore}</div>
            <div style="font-size:12px;color:var(--text-secondary);">得分</div>
          </div>
          <div style="width:1px;background:var(--border);"></div>
          <div style="text-align:center;">
            <div style="font-size:20px;font-weight:700;color:${accuracy >= 80 ? '#27AE60' : accuracy >= 60 ? '#F39C12' : '#E74C3C'}">${accuracy}%</div>
            <div style="font-size:12px;color:var(--text-secondary);">正确率</div>
          </div>
        </div>
        <button class="btn ${this.state.subject === 'en' ? 'btn-primary' : 'btn-math'}" onclick="GameEngine._startStage(${nextStage})" style="margin-top:8px;">
          ${this._getStageDisplay(nextStage).icon} 进入${this._getStageDisplay(nextStage).name} →
        </button>
      </div>
    `;
  },

  // --- 游戏完成 ---
  _completeGame() {
    this._clearTimer();
    const state = this.state;
    const totalQuestions = state.allAnswers.length;
    const correctCount = state.allAnswers.filter(a => a.isCorrect).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const wrongCount = state.wrongIds.size;
    const stageResults = state.stageResults;
    const wrongQuestions = state.allAnswers.filter(a => !a.isCorrect);

    // 计算星星
    const stars = accuracy >= 90 ? Math.round(totalQuestions * 0.15)
                 : accuracy >= 80 ? Math.round(totalQuestions * 0.1)
                 : accuracy >= 60 ? Math.round(totalQuestions * 0.05)
                 : 0;
    const totalScore = state.score;

    let checkinData = null;
    try {
      checkinData = Store.getCheckin(Auth.currentUser);
      if (checkinData && checkinData.bonus > 0) {
        state.score += checkinData.bonus;
      }
    } catch(e) {}

    const container = document.getElementById('game-content');
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;padding:20px;animation:fadeIn .4s ease;">
        <div style="font-size:64px;margin-bottom:8px;">${wrongCount === 0 ? '🏆' : '🎉'}</div>
        <h2 style="font-size:24px;font-weight:800;margin-bottom:4px;">${wrongCount === 0 ? '🎉 全部通关！满分鼓励！🎉' : '第' + state.dayNum + '天 闯关完成！'}</h2>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:100%;max-width:320px;margin:20px 0;">
          <div style="text-align:center;padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
            <div style="font-size:26px;font-weight:700;">${Math.round(totalScore)}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">总得分</div>
          </div>
          <div style="text-align:center;padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
            <div style="font-size:26px;font-weight:700;color:${accuracy >= 80 ? '#27AE60' : '#F39C12'}">${accuracy}%</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">正确率</div>
          </div>
          <div style="text-align:center;padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
            <div style="font-size:26px;font-weight:700;">${state.maxStreak}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">最高连击</div>
          </div>
        </div>

        ${stars > 0 ? `<div style="font-size:18px;margin-bottom:16px;">⭐ 获得 ${stars} 颗星星！</div>` : ''}

        <div style="width:100%;max-width:360px;text-align:center;margin-bottom:20px;">
          <div style="font-size:14px;color:var(--text-secondary);">答对 <strong style="color:#27AE60;">${correctCount}</strong> 题 · 答错 <strong style="color:#E74C3C;">${wrongCount}</strong> 题 · 共 ${totalQuestions} 题</div>
        </div>

        ${stageResults.map(r => `
          <div style="display:flex;align-items:center;gap:12px;width:100%;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;margin-bottom:6px;">
            <span>${r.icon}</span>
            <span style="flex:1;font-size:14px;">${r.name}</span>
            <span style="font-size:14px;color:${r.accuracy >= 80 ? '#27AE60' : '#F39C12'};font-weight:600;">${r.correct}/${r.total}</span>
            <span style="font-size:14px;font-weight:600;">${r.score}分</span>
          </div>
        `).join('')}

        <div style="display:flex;flex-direction:column;gap:10px;width:100%;margin-top:20px;">
          ${wrongCount > 0 ? `
            <button class="btn btn-block" onclick="GameEngine._startWrongReview()" style="background:#FFF3CD;color:#856404;border-color:#FFEAA7;padding:14px;font-size:16px;">
              🔄 重做错题，抢回积分 (${wrongCount}道)
            </button>
          ` : ''}
          <button class="btn ${this.state.subject === 'en' ? 'btn-primary' : 'btn-math'} btn-block" onclick="GameEngine._finishAndSave()" style="padding:14px;font-size:16px;">
            🏠 完成，返回首页
          </button>
        </div>
      </div>
    `;
  },

  // --- 错题重做 ---
  _startWrongReview() {
    this._clearTimer();
    const state = this.state;

   // 收集所有错题
   const wrongQuestions = state.allAnswers
      .filter(a => !a.isCorrect && a.question)
     .map(a => a.question);

    if (wrongQuestions.length === 0) {
      this._completeGame();
      return;
    }

    this._shuffle(wrongQuestions);
    state.isReviewMode = true;
    state.reviewQuestions = wrongQuestions;
    state.reviewIndex = 0;
    state.reviewCorrectCount = 0;

    this._showReviewQuestion();
  },

  _showReviewQuestion() {
    const state = this.state;
    if (state.reviewIndex >= state.reviewQuestions.length) {
      this._completeReview();
      return;
    }

    const q = state.reviewQuestions[state.reviewIndex];
    // 听力题音频支持
    window._reviewListenText = q.textToSpeak || '';
    window._reviewAudio = function() { if (window._reviewListenText) Speak.speak(window._reviewListenText); };
    const labels = ['A','B','C','D'];
    const remaining = state.reviewQuestions.length - state.reviewIndex;

        const container = document.getElementById('game-content');
    // 错题重做：应用题输入框（含分数支持）
    var reviewAnswerHtml = '';
    if ('answerValue' in q) {
      var isFrac_ = String(q.answerValue).indexOf('/') >= 0;
      if (isFrac_) {
        reviewAnswerHtml = '<div style="text-align:center;margin-top:16px;">' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:4px;">' +
          '<input id="review-text-answer-num" type="text" inputmode="numeric" maxlength="3" class="input" placeholder="?" style="width:52px;text-align:center;font-size:20px;padding:8px;">' +
          '<span style="font-size:24px;font-weight:600;color:var(--text);">/</span>' +
          '<input id="review-text-answer-den" type="text" inputmode="numeric" maxlength="3" class="input" placeholder="?" style="width:52px;text-align:center;font-size:20px;padding:8px;">' +
          '</div>' +
          '<button class="btn btn-primary" onclick="GameEngine._reviewSubmitAnswer()" style="margin-top:8px;">确认答案</button></div>';
      } else {
        reviewAnswerHtml = '<div style="text-align:center;margin-top:16px;">' +
          '<input id="review-text-answer-input" type="text" inputmode="decimal" class="input" placeholder="输入答案" style="width:100px;text-align:center;font-size:20px;padding:10px;margin:0 auto;">' +
          '<button class="btn btn-primary" onclick="GameEngine._reviewSubmitAnswer()" style="margin-top:8px;display:block;margin-left:auto;margin-right:auto;">确认答案</button></div>';
      }
    }
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;padding:20px 0;animation:fadeIn .3s ease;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">
          <span style="font-size:12px;font-weight:600;padding:3px 10px;border-radius:10px;background:rgba(231,76,60,0.15);color:#E74C3C;">🔄 错题重做</span>
          <span style="flex:1;"></span>
          <span style="font-size:13px;color:var(--text-secondary);">剩余 ${remaining} 题</span>
        </div>
        <div class="question-text" style="font-size:17px;font-weight:500;line-height:1.7;">
          ${q.question}
        </div>
        ${q.textToSpeak ? '<div style="text-align:center;margin:12px 0;"><button class="btn btn-small btn-primary" onclick="window._reviewAudio();">🔊 播放声音</button></div>' : ''}
        ${reviewAnswerHtml}
        ${q.options && q.options.length > 0 ? `
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px;">
          ${q.options.map((opt, i) => `
            <button class="game-option" onclick="GameEngine._handleReviewAnswer(${i})">
              <span class="opt-label">${labels[i]}</span>
              <span class="opt-text">${opt}</span>
            </button>
          `).join('')}
        </div>` : !('answerValue' in q) ? `
        <div style="text-align:center;margin-top:20px;">
          <button class="btn btn-primary" onclick="GameEngine._markSpeakingCorrect()">✅ 已掌握，继续</button>
          <p style="font-size:12px;color:var(--text-secondary);margin-top:8px;">点击“已掌握”标记为正确，获得满分</p>
        </div>` : ''}
      </div>
    `;
    // 听力题自动播放
    if (q.textToSpeak) {
      setTimeout(function() { if (window._reviewListenText) Speak.speak(window._reviewListenText); }, 500);
    }
  },

  _handleReviewAnswer(selectedIndex) {
    const state = this.state;
    const q = state.reviewQuestions[state.reviewIndex];
    let isCorrect;
    if ('answerValue' in q) {
      var isFrac = String(q.answerValue).indexOf('/') >= 0;
      var userAnswer;
      if (isFrac) {
        var num = document.getElementById('review-text-answer-num');
        var den = document.getElementById('review-text-answer-den');
        userAnswer = (num ? num.value.trim() : '0') + '/' + (den ? den.value.trim() : '0');
      } else {
        var input = document.getElementById('review-text-answer-input');
        userAnswer = input ? input.value.trim() : '';
      }
      isCorrect = userAnswer === String(q.answerValue).trim();
    } else {
      isCorrect = selectedIndex === q.answer;
    }
    try { if (isCorrect) { Sounds.playCorrect(); } else { Sounds.playWrong(); Sounds.playHammer(); } } catch(e) {}
    var wt = isCorrect ? 4 : 7;
    const labels = ['A','B','C','D'];

    const container = document.getElementById('game-content');
    container.innerHTML += `
      <div class="feedback-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;animation:fadeIn .2s ease;">
        <div style="font-size:52px;margin-bottom:8px;">${isCorrect ? '✅' : '<span class="hammer-icon">🔨</span>'}</div>
        <div style="font-size:20px;font-weight:700;color:${isCorrect ? '#27AE60' : '#E74C3C'};margin-bottom:12px;">
          ${isCorrect ? '✅ 这次答对了！' : '还是不对哦'}
        </div>
        ${!isCorrect ? `<div style="font-size:17px;color:var(--text-secondary);margin-bottom:8px;">
          正确答案：<span style="color:#27AE60;font-weight:600;">${('answerValue' in q) ? q.answerValue : labels[q.answer] + '. ' + q.options[q.answer]}</span>
        </div>` : ''}
        <div style="font-size:16px;color:var(--text-secondary);max-width:350px;line-height:1.6;">
          💡 ${q.explanation || ''}
        </div>
        <div style="margin-top:20px;font-size:12px;color:var(--text-secondary);" id="review-countdown">${wt}秒后自动跳转...</div>
        <div style="margin-top:8px;">
          <span style="font-size:12px;color:var(--text-tertiary);cursor:pointer;" onclick="GameEngine._completeReview()">跳过，结束重做</span>
        </div>
      </div>
    `;
    // 自动倒计时
    var _reviewTimer = setInterval(function() {
      var el = document.getElementById('review-countdown');
      if (!el) { clearInterval(_reviewTimer); return; }
      var sec = parseInt(el.textContent) - 1;
      if (sec <= 0) { clearInterval(_reviewTimer); GameEngine._continueReview(isCorrect); }
      else el.textContent = sec + '秒后自动跳转...';
    }, 1000);
  },

  _continueReview(isCorrect) {
    const state = this.state;
    const q = state.reviewQuestions[state.reviewIndex];

    // 从反馈列表中移除
    const overlay = document.querySelector('.feedback-overlay');
    if (overlay) overlay.remove();

    if (isCorrect) {
      // 做对了，从错题列表移除 + 更新记录
      state.reviewQuestions.splice(state.reviewIndex, 1);
      state.reviewCorrectCount++;
      // 更新原始答题记录，把错题分数加回去
      var origRec = state.allAnswers.find(function(a) { return a.question === q; });
     if (origRec && !origRec.isCorrect) {
       origRec.isCorrect = true;
       origRec.score = q.pointValue || 10;
       state.score += (q.pointValue || 10);
       if (q.id) state.wrongIds.delete(q.id);
      }
    } else {
      state.reviewIndex++;
    }

    // 检查是否还有错题
    if (state.reviewQuestions.length === 0) {
      this._completeReview();
    } else if (state.reviewIndex >= state.reviewQuestions.length) {
      // 一轮结束但还有错题，重新 shuffle 再来
      state.reviewIndex = 0;
      this._shuffle(state.reviewQuestions);
      this._showReviewQuestion();
    } else {
      this._showReviewQuestion();
    }
  },

  // --- 重算各关卡成绩（错题订正后更新） ---
  _recalculateStageResults() {
    var state = this.state;
    if (!state.stageResults || !state.allAnswers) return;
    function _stageKey(t) {
      if (t === 'vocabulary' || t === 'vocab') return 'vocab';
      if (t === 'grammar') return 'grammar';
      if (t === 'listening') return 'listening';
      if (t === 'speaking') return 'speaking';
      if (t === 'boss' || t === 'reading') return 'boss';
      return 'vocab';
    }
    state.stageResults.forEach(function(sr) {
      var sa = state.allAnswers.filter(function(a) { return _stageKey(a.question && a.question.type) === sr.key; });
      if (sa.length === 0) return;
      var cr = sa.filter(function(a) { return a.isCorrect; }).length;
      var sc = sa.reduce(function(s, a) { return s + (a.score || 0); }, 0);
      sr.correct = cr;
      sr.total = sa.length;
      sr.score = Math.round(sc);
      sr.accuracy = Math.round(cr / sa.length * 100);
    });
  },

  // --- 提交重做应用题答案 ---
  _reviewSubmitAnswer() {
    this._handleReviewAnswer(-1);
  },

  // --- 跟读题在错题重做中标记为已掌握 ---
  _markSpeakingCorrect() {
    var state = this.state;
    if (!state || !state.reviewQuestions) return;
    var q = state.reviewQuestions[state.reviewIndex];
    if (!q) return;
    state.reviewQuestions.splice(state.reviewIndex, 1);
    state.reviewCorrectCount++;
    var origRec = state.allAnswers.find(function(a) { return a.question === q; });
    if (origRec && !origRec.isCorrect) {
      origRec.isCorrect = true;
      origRec.score = q.pointValue || 10;
      state.score += origRec.score;
      if (q.id) state.wrongIds.delete(q.id);
    }
    if (state.reviewQuestions.length === 0) { this._completeReview(); }
    else { this._showReviewQuestion(); }
  },

  _completeReview() {
    this._recalculateStageResults();
    this._completeGame();
  },

  // --- 完成并保存 ---
  
  // --- 跳过反馈等待 ---
  _skipFeedback() {
    if (this._feedbackInterval) {
      clearInterval(this._feedbackInterval);
      this._feedbackInterval = null;
    }
    const overlay = document.querySelector('.feedback-overlay');
    if (overlay) overlay.remove();
    this.state.isWaiting = false;
    if (this._feedbackOnDone) {
      this._feedbackOnDone();
      this._feedbackOnDone = null;
    }
  },

_finishAndSave() {
    this._clearTimer();
    const state = this.state;

    // 打卡积分
    let checkinData = null;
    try {
      checkinData = Store.processCheckin(Auth.currentUser);
      if (checkinData && checkinData.bonus > 0) {
        state.score += checkinData.bonus;
      }
    } catch(e) {}
    // allAnswers already includes corrected answers (isCorrect updated during review)
    // So we must NOT add reviewCorrectCount again — that would double-count and cause >100%
    const totalQuestions = state.allAnswers.length;
    const correctCount = state.allAnswers.filter(a => a.isCorrect).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // 计算星星
    const stars = accuracy >= 90 ? Math.round(state.allAnswers.length * 0.15)
                 : accuracy >= 80 ? Math.round(state.allAnswers.length * 0.1)
                 : accuracy >= 60 ? Math.round(state.allAnswers.length * 0.05)
                 : 0;

    const saveData = {
      completed: true,
      score: state.score,
      accuracy,
      maxStreak: state.maxStreak,
      dateCompleted: new Date().toISOString(),
      subject: state.subject,
      dayKey: state.dayKey,
     stages: {
       vocab: state.stageResults.find(function(sr) { return sr.key === 'vocab'; }) || { correct:0, total:0, score:0 },
       grammar: state.stageResults.find(function(sr) { return sr.key === 'grammar'; }) || { correct:0, total:0, score:0 },
       listening: state.stageResults.find(function(sr) { return sr.key === 'listening'; }) || { correct:0, total:0, score:0 },
       speaking: state.stageResults.find(function(sr) { return sr.key === 'speaking'; }) || { correct:0, total:0, score:0 },
       boss: state.stageResults.find(function(sr) { return sr.key === 'boss'; }) || { correct:0, total:0, score:0 }
     },
      wrongQuestionIds: [...state.wrongIds],
      attempts: 1,
      timeSpent: Math.round(state.allAnswers.reduce((s, a) => s + (a.timeSpent || 5), 0))
    };

    Store.saveProgress(state.currentUser || Auth.currentUser, state.dayKey, saveData);
    if (stars > 0) Store.addStars(Auth.currentUser, stars);

    this._showToast(`🎉 完成！获得 ${stars} 颗星星`);
    setTimeout(() => window.location.hash = 'home', 1200);
  },

  // --- Toast ---
  _showToast(msg) {
    const el = document.getElementById('toast');
    if (el) {
      el.textContent = msg;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 2500);
    }
  },

  // --- 工具 ---
  // --- 打乱选项（正确答案随机到 A/B/C/D） ---
  _shuffleAllOptions(groups) {
    Object.keys(groups).forEach(k => {
      groups[k].forEach(q => {
        if (!q.options || q.options.length === 0) return;
        const correct = q.options[q.answer];
        // Fisher-Yates shuffle
        for (let i = q.options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
        }
        q.answer = q.options.indexOf(correct);
      });
    });
  },

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
};
window.GameEngine = GameEngine;
