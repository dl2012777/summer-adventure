// ============================================================
//  Ranking — 排名系统
//  平均正确率 = 每日(数学得分+英语得分)/260% 的均值
//  综合分 = (正确率×70% + 出勤×30%) × 已完成天数（累计值）
// ============================================================
const Ranking = {
  // --- 计算综合分 ---
  calculate(userName, totalDays) {
    if (!totalDays) totalDays = 40;
    const progress = Store.getAllProgress(userName);
    const entries = Object.values(progress).filter(p => p && p.completed);

    if (entries.length === 0) {
      return { composite:0, accuracy:0, attendance:0, totalScore:0, maxStreak:0, daysDone:0, weekDays:0 };
    }

    // 按日历日汇总
    var dailyTotals = {};
    entries.forEach(function(p) { 
      var dk = p.dateCompleted ? p.dateCompleted.slice(0,10) : 'unknown';
      dailyTotals[dk] = (dailyTotals[dk] || 0) + (p.score || 0); 
    });
    var uniqueDates = Object.keys(dailyTotals).length;
    var dailyScores = Object.values(dailyTotals);

    // 平均正确率：每天得分/260的均值
    var avgAccuracy = uniqueDates > 0
      ? Math.round(dailyScores.reduce(function(s,t){ return s + t / 260 * 100; }, 0) / uniqueDates)
      : 0;

    var attendanceRate = Math.min(100, Math.round(uniqueDates / totalDays * 100));
    var totalScore = entries.reduce((s, p) => s + (p.score || 0), 0);
    // 综合分（累计值）
    var composite = Math.round((avgAccuracy * 0.7 + attendanceRate * 0.3) * uniqueDates);

    // 本周完成天数
    const weekAgo = Date.now() - 7 * 86400000;
    const weekDays = entries.filter(p => new Date(p.dateCompleted).getTime() > weekAgo).length;

    return { composite, accuracy:avgAccuracy, attendance:attendanceRate, totalScore, daysDone:uniqueDates, weekDays };
  },

  // --- 渲染排名卡片 ---
  render(userName) {
    const s = this.calculate(userName);
    const colorClass = function(v) {
      if (v >= 80) return 'high';
      if (v >= 50) return 'mid';
      return 'low';
    };

    return `
      <div class="ranking-card">
        <div class="ranking-grid">
          <div class="ranking-item">
            <div class="ranking-value ${colorClass(s.composite)}">${s.composite}</div>
            <div class="ranking-label">综合分</div>
          </div>
          <div class="ranking-item">
            <div class="ranking-value ${colorClass(s.accuracy)}">${s.accuracy}%</div>
            <div class="ranking-label">正确率</div>
          </div>
          <div class="ranking-item">
            <div class="ranking-value ${colorClass(s.attendance)}">${s.attendance}%</div>
            <div class="ranking-label">出勤率</div>
          </div>
        </div>
        <div class="ranking-sub">
          ${s.daysDone}/40天完成 · 总分 ${s.totalScore} · 本周 ${s.weekDays} 天
          ${s.daysDone > 0 ? '· 综合 = (正确率×70% + 出勤×30%) × ' + s.daysDone + '天' : ''}
        </div>
      </div>
    `;
  },

  // --- \u9886\u5956\u53f0 ---
  renderPodium() {
    const users = Store.getUsers();
    const names = Object.keys(users);
    if (names.length === 0) return '';

    // \u8ba1\u7b97\u7efc\u5408\u5206\u5e76\u6392\u5e8f
    const ranked = names.map(function(n) {
      const s = Ranking.calculate(n);
      return { name: n, avatar: (users[n].profile.avatar || '\ud83d\udc66'), composite: s.composite, score: s.totalScore };
    }).sort(function(a, b) { return b.composite - a.composite || b.score - a.score; });

    const total = ranked.length;
    const tier1Count = Math.max(1, Math.ceil(total * 0.1));  // \u524d10%
    const tier2Count = Math.max(1, Math.ceil(total * 0.2));  // \u518d20%
    const tier3Count = Math.max(1, Math.ceil(total * 0.3));  // \u518d30%
    // \u5269\u4e0b50%\u4e3a\u7b2c\u4e09\u68af\u961f

    var html = '<div class="podium-card">';
    html += '<div class="podium-title">\ud83c\udfc6 \u5b66\u4e60\u9886\u5956\u53f0</div>';

    // \u7b2c\u4e00\u68af\u961f
    html += '<div class="podium-tier gold">';
    html += '<div class="podium-badge">\ud83e\udd47 \u7b2c\u4e00\u68af\u961f</div>';
    html += '<div class="podium-sub">\u524d10%</div>';
    for (var i = 0; i < Math.min(tier1Count, ranked.length); i++) {
      var r = ranked[i];
      html += '<div class="podium-user"><span>' + r.avatar + '</span> <strong>' + r.name + '</strong> \u7efc\u5408\u5206 ' + r.composite + '</div>';
    }
    html += '</div>';

    // \u7b2c\u4e8c\u68af\u961f
    var t2Start = tier1Count;
    var t2End = Math.min(tier1Count + tier2Count, ranked.length);
    if (t2End > t2Start) {
      html += '<div class="podium-tier silver">';
      html += '<div class="podium-badge">\ud83e\udd48 \u7b2c\u4e8c\u68af\u961f</div>';
      html += '<div class="podium-sub">\u518d20%</div>';
      for (var i2 = t2Start; i2 < t2End; i2++) {
        var r2 = ranked[i2];
        html += '<div class="podium-user"><span>' + r2.avatar + '</span> <strong>' + r2.name + '</strong> \u7efc\u5408\u5206 ' + r2.composite + '</div>';
      }
      html += '</div>';
    }

    // \u7b2c\u4e09\u68af\u961f
    if (t2End < ranked.length) {
      html += '<div class="podium-tier bronze">';
      html += '<div class="podium-badge">\ud83e\udd49 \u7b2c\u4e09\u68af\u961f</div>';
      html += '<div class="podium-sub">\u518d30%</div>';
      for (var i3 = t2End; i3 < ranked.length; i3++) {
        var r3 = ranked[i3];
        html += '<div class="podium-user"><span>' + r3.avatar + '</span> <strong>' + r3.name + '</strong> \u7efc\u5408\u5206 ' + r3.composite + '</div>';
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  }
};
window.Ranking = Ranking;
