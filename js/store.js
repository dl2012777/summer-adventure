// ============================================================
//  Store — localStorage 持久化层
// ============================================================
const Store = {
  KEY: 'summer_adventure_data',

  // --- 内部方法 ---
  _getData() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : this._defaults();
    } catch {
      return this._defaults();
    }
  },

  _saveData(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Store save failed:', e);
    }
  },

  _defaults() {
    return {
      users: {},
      starBadges: {}
    };
  },

  // --- 用户管理 ---
  getUsers() {
    return this._getData().users;
  },

  getUser(name) {
    const users = this.getUsers();
    return users[name] || null;
  },

  createUser(name, avatar) {
    const data = this._getData();
    if (data.users[name]) return false;
    data.users[name] = {
      profile: { avatar, name, created: new Date().toISOString() },
      progress: {}
    };
    if (!data.starBadges[name]) data.starBadges[name] = 0;
    this._saveData(data);
    return true;
  },

  deleteUser(name) {
    const data = this._getData();
    delete data.users[name];
    delete data.starBadges[name];
    this._saveData(data);
  },

  // --- 进度 ---
  getProgress(userName, dayKey) {
    const user = this.getUser(userName);
    if (!user) return null;
    return user.progress[dayKey] || null;
  },

  saveProgress(userName, dayKey, progressData) {
    const data = this._getData();
    if (!data.users[userName]) return false;
    data.users[userName].progress[dayKey] = progressData;
    this._saveData(data);
    return true;
  },

  getAllProgress(userName) {
    const user = this.getUser(userName);
    if (!user) return {};
    return user.progress;
  },

  // --- 统计 ---
  // 计分规则：
  //   平均正确率 = 每日(数学得分+英语得分)/260% → 再取所有已做日均值
  //   综合分 = (正确率×70% + 出勤率×30%) × 已完成天数（累计值，越高越好）
  //   出勤率 = 有记录的唯一日历天数 / 40
  getStats(userName) {
    const progress = this.getAllProgress(userName);
    const entries = Object.values(progress).filter(p => p && p.completed);
    if (entries.length === 0) return { totalDays:0, avgAccuracy:0, totalScore:0, englishDays:0, mathDays:0, uniqueDates:0, compositeScore:0 };

    // 按日历日汇总得分（一天可能做英语+数学两科）
    var dailyTotals = {};
    entries.forEach(function(p) {
      var dateKey = p.dateCompleted ? p.dateCompleted.slice(0,10) : 'unknown';
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + (p.score || 0);
    });
    var uniqueDates = Object.keys(dailyTotals).length;
    var dailyScores = Object.values(dailyTotals);

    // 平均正确率：每天得分/260的均值（260=数学满分130+英语满分130）
    var avgAccuracy = uniqueDates > 0
      ? Math.round(dailyScores.reduce(function(s,t){ return s + t / 260 * 100; }, 0) / uniqueDates)
      : 0;

    const totalScore = entries.reduce((sum, p) => sum + (p.score || 0), 0);
    const englishDays = entries.filter(p => p.subject === 'en').length;
    const mathDays = entries.filter(p => p.subject === 'math').length;

    // 综合分 = (正确率×70% + 出勤×30%) × 已完成天数（累计值）
    var attendanceRate = Math.min(100, Math.round(uniqueDates / 40 * 100));
    var compositeScore = Math.round((avgAccuracy * 0.7 + attendanceRate * 0.3) * uniqueDates);

    return { totalDays:uniqueDates, avgAccuracy, totalScore, englishDays, mathDays, uniqueDates, attendanceRate, compositeScore };
  },

  // --- 星星 ---
  getStars(userName) {
    const data = this._getData();
    return data.starBadges[userName] || 0;
  },

  addStars(userName, count) {
    const data = this._getData();
    data.starBadges[userName] = (data.starBadges[userName] || 0) + count;
    this._saveData(data);
  },

  // --- 打卡积分 ---
  getCheckin(userName) {
    const data = this._getData();
    if (!data.checkin) data.checkin = {};
    if (!data.checkin[userName]) data.checkin[userName] = { lastDate: null, streak: 0, longest: 0, totalBonus: 0 };
    return data.checkin[userName];
  },

  processCheckin(userName) {
    const checkin = this.getCheckin(userName);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (checkin.lastDate === today) {
      // 今天已经打过卡了，不重复加
      return { streak: checkin.streak, bonus: 0, isNew: false };
    }

    if (checkin.lastDate === yesterday) {
      // 连续打卡
      checkin.streak++;
    } else {
      // 断签，重置
      checkin.streak = 1;
    }

    checkin.lastDate = today;
    if (checkin.streak > checkin.longest) checkin.longest = checkin.streak;

    // 计算打卡积分：连续天数越长，奖励越高
    // Day 1: 100分, Day 2: 120分, ..., Day 10+: 最高200分
    const bonus = Math.round(100 * Math.min(2.0, 1.0 + (checkin.streak - 1) * 0.1));
    checkin.totalBonus += bonus;

    const data = this._getData();
    if (!data.checkin) data.checkin = {};
    data.checkin[userName] = checkin;
    this._saveData(data);

    return { streak: checkin.streak, bonus, isNew: true, longest: checkin.longest, totalBonus: checkin.totalBonus };
  },

  // --- 题目权重配置 ---
  getStageWeights(userName) {
    try {
      var all = this._getData().stageWeights;
      return (all && userName && all[userName]) || null;
    } catch(e) { return null; }
  },
  setStageWeights(userName, weights) {
    const data = this._getData();
    if (!data.stageWeights) data.stageWeights = {};
    data.stageWeights[userName] = weights;
    this._saveData(data);
  },

  // --- 重置全部数据（用户/记录/设置全部清空） ---
  resetProgress() {
    try { localStorage.removeItem(this.KEY); } catch(e) {}
    try { localStorage.removeItem('summer_last_user'); } catch(e) {}
  },

  // --- 数据导出（JSON 格式） ---
  exportAllData(userName) {
    const data = this._getData();
    const user = userName ? data.users[userName] : null;
    const exportObj = {
      exportedAt: new Date().toISOString(),
      userName: userName || 'all',
      profile: user ? user.profile : null,
      progress: user ? user.progress : {},
      stars: userName ? (data.starBadges[userName] || 0) : data.starBadges,
      checkin: userName ? this.getCheckin(userName) : data.checkin,
      stats: userName ? this.getStats(userName) : null
    };
    return exportObj;
  },

  // --- 导出为 CSV 格式（学习进度明细） ---
  exportProgressCSV(userName) {
    const progress = this.getAllProgress(userName);
    const stats = this.getStats(userName);
    const stars = this.getStars(userName);
    const checkin = this.getCheckin(userName);
    
    var rows = [];
    rows.push(['Day', 'Subject', 'Completed', 'Score', 'Accuracy', 'MaxStreak', 'VocabCorrect', 'VocabTotal', 'GrammarCorrect', 'GrammarTotal', 'ListeningCorrect', 'ListeningTotal', 'SpeakingCorrect', 'SpeakingTotal', 'BossCorrect', 'BossTotal', 'DateCompleted'].join(','));
    
    Object.keys(progress).forEach(function(key) {
      var p = progress[key];
      if (!p) return;
      var subject = p.subject || (key.indexOf('en-') === 0 ? 'en' : 'math');
      var dayNum = key.replace(/^(en|math)-day/, '');
      var stages = p.stages || {};
      rows.push([
        dayNum,
        subject === 'en' ? '英语' : '数学',
        p.completed ? 'Yes' : 'No',
        p.score || 0,
        p.accuracy || 0,
        p.maxStreak || 0,
        stages.vocab ? stages.vocab.correct || 0 : 0,
        stages.vocab ? stages.vocab.total || 0 : 0,
        stages.grammar ? stages.grammar.correct || 0 : 0,
        stages.grammar ? stages.grammar.total || 0 : 0,
        stages.listening ? stages.listening.correct || 0 : 0,
        stages.listening ? stages.listening.total || 0 : 0,
        stages.speaking ? stages.speaking.correct || 0 : 0,
        stages.speaking ? stages.speaking.total || 0 : 0,
        stages.boss ? stages.boss.correct || 0 : 0,
        stages.boss ? stages.boss.total || 0 : 0,
        p.dateCompleted || ''
      ].join(','));
    });

    // 汇总行
    rows.push('');
    rows.push('Summary,,,,,,,,,,,,,,');
    rows.push(['Total Days', stats.totalDays].join(',,,,,,,,,,,,,,,,'));
    rows.push(['Avg Accuracy', stats.avgAccuracy + '%'].join(',,,,,,,,,,,,,,,,'));
    rows.push(['Total Score', stats.totalScore].join(',,,,,,,,,,,,,,,,'));
    rows.push(['Stars', stars].join(',,,,,,,,,,,,,,,,'));
    rows.push(['Checkin Streak', checkin.streak].join(',,,,,,,,,,,,,,,,'));

    return rows.join('\n');
  },

  // --- 触发文件下载 ---
  downloadFile(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType || 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
window.Store = Store;
