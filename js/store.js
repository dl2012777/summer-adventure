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
  getStats(userName) {
    const progress = this.getAllProgress(userName);
    const entries = Object.values(progress).filter(p => p && p.completed);
    const totalDays = entries.length;
    if (totalDays === 0) return { totalDays: 0, avgAccuracy: 0, totalScore: 0, englishDays: 0, mathDays: 0 };
    const totalScore = entries.reduce((sum, p) => sum + (p.score || 0), 0);
    const avgAccuracy = Math.round(entries.reduce((sum, p) => sum + (p.accuracy || 0), 0) / totalDays);
    const englishDays = entries.filter(p => p.subject === 'en').length;
    const mathDays = entries.filter(p => p.subject === 'math').length;
    return { totalDays, avgAccuracy, totalScore, englishDays, mathDays };
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
  }
};
window.Store = Store;
