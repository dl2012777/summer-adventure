// dashboard.js - 学习进度 (上下双日历: 英语 + 数学)
const Dashboard = {
  render(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var userName = Auth.currentUser;
    var user = userName ? Store.getUser(userName) : null;
    if (!userName || !user) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:40px;">请先登录</p>';
      return;
    }

    // ---- 统统计信息 ----
    var st = Store.getStats(userName);
    var stars = Store.getStars(userName);

    var html = '<div class="header">';
    html += '<button class="back-btn" onclick="App.showHome()">← 返回</button>';
    html += '</div>';
    html += '<h2 style="margin:12px 0 4px;font-size:22px;">📊 学习看板</h2>';
    html += '<p class="subtitle" style="margin-bottom:16px;color:var(--text-secondary);">' + userName + ' 的暑假闯关记录</p>';

    // ---- 图例 ----
    html += '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:16px;font-size:13px;">';
    html += '<span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:#27AE60;vertical-align:middle;margin-right:4px;"></span> ≥80分</span>';
    html += '<span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:#F39C12;vertical-align:middle;margin-right:4px;"></span> <80分</span>';
    html += '<span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:rgba(255,255,255,0.12);vertical-align:middle;margin-right:4px;"></span> 未完成</span>';
    html += '</div>';

    // ---- 英语日历 ----
    html += '<div class="card" style="margin-bottom:16px;">';
    html += '<h3 style="font-size:16px;margin-bottom:10px;color:#9B59B6;">🗺️ 英语 · 40天日历</h3>';
    html += this._renderCalendar(userName, 'en');
    html += '</div>';

    // ---- 数学日历 ----
    html += '<div class="card" style="margin-bottom:16px;">';
    html += '<h3 style="font-size:16px;margin-bottom:10px;color:#E67E22;">🔢 数学 · 40天日历</h3>';
    html += this._renderCalendar(userName, 'math');
    html += '</div>';

    // ---- 个人信息卡片 ----
    html += '<div class="card" style="margin-bottom:16px;">';
    html += '<div style="display:flex;align-items:center;gap:12px;"><span style="font-size:32px;">' + user.profile.avatar + '</span>';
    html += '<div style="flex:1;"><div style="font-weight:600;font-size:16px;">' + userName + '</div>';
    html += '<div style="font-size:12px;color:var(--text-secondary);">加入于 ' + new Date(user.profile.created).toLocaleDateString('zh-CN') + '</div></div>';
    html += '<span style="font-size:13px;color:#F1C40F;">⭐ ' + stars + '</span></div>';
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px;border-top:1px solid var(--border);padding-top:12px;">';
        var subjCount = (st.englishDays > 0 ? 1 : 0) + (st.mathDays > 0 ? 1 : 0);
    html += '<div style="text-align:center;"><div style="font-size:20px;font-weight:700;">' + subjCount + '/2</div><div style="font-size:11px;color:var(--text-secondary);">已学课程</div></div>';
    html += '<div style="text-align:center;"><div style="font-size:20px;font-weight:700;color:' + (st.avgAccuracy>=80?'#27AE60':'#F39C12') + '">' + st.avgAccuracy + '%</div><div style="font-size:11px;color:var(--text-secondary);">平均正确率</div></div>';
    html += '<div style="text-align:center;"><div style="font-size:20px;font-weight:700;">' + (st.compositeScore || 0) + '</div><div style="font-size:11px;color:var(--text-secondary);">综合分</div></div>';
    html += '<div style="text-align:center;"><div style="font-size:20px;font-weight:700;">' + stars + '</div><div style="font-size:11px;color:var(--text-secondary);">⭐ 星星</div></div></div>';
    
    html += '</div>';

    // ---- 数据导出按钮 ----
    html += '<div class="card" style="margin-bottom:16px;">';
    html += '<h3 style="font-size:16px;margin-bottom:10px;">💾 数据导出</h3>';
    html += '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">导出学习数据，可用于备份、分析或打印。</p>';
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    html += '<button class="btn btn-small btn-outline" onclick="Store.downloadFile(JSON.stringify(Store.exportAllData(\'' + userName + '\'), null, 2), \'summer-adventure-' + userName + '-' + new Date().toISOString().slice(0,10) + '.json\', \'application/json\')">📋 导出 JSON</button>';
    html += '<button class="btn btn-small btn-outline" onclick="Store.downloadFile(Store.exportProgressCSV(\'' + userName + '\'), \'summer-adventure-' + userName + '-' + new Date().toISOString().slice(0,10) + '.csv\', \'text/csv;charset=utf-8\')">📊 导出 CSV</button>';
    html += '</div></div>';

    // ---- 每日详情弹窗 ----
    html += '<div id="day-detail-modal" class="modal" style="display:none;"></div>';

    container.innerHTML = html;
    
  },

  // 渲染一个科目的40天日历网格
  _renderCalendar(userName, subject) {
    var subjLabel = subject === 'en' ? '英语' : '数学';
    var html = '<div class="cal-grid" style="display:grid;grid-template-columns:repeat(10,1fr);gap:4px;">';
    for (var d = 1; d <= 40; d++) {
      var p = Store.getProgress(userName, subject + '-day' + d);
      var cls = 'cal-day';
      var act;
      if (p && p.completed) {
        cls += p.accuracy >= 80 ? ' cal-done-high' : ' cal-done-low';
        act = "Dashboard._showDayDetail(" + d + ",'" + userName + "')";
      } else {
        cls += ' cal-future';
        act = "App.goToGame('" + subject + "'," + d + ")";
      }
      html += '<div class="' + cls + '" style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;' + this._dayStyle(p) + '" onclick="' + act + '" title="' + subjLabel + ' 第' + d + '天">' + d + '</div>';
    }
    html += '</div>';
    return html;
  },

  _dayStyle(p) {
    if (!p || !p.completed) return 'background:rgba(255,255,255,0.06);color:var(--text-secondary);';
    if (p.accuracy >= 80) return 'background:#27AE60;color:#fff;';
    return 'background:#F39C12;color:#fff;';
  },

  _showDayDetail(dayNum, userName) {
    var en = Store.getProgress(userName, 'en-day' + dayNum);
    var math = Store.getProgress(userName, 'math-day' + dayNum);
    var modal = document.getElementById('day-detail-modal');
    if (!modal) return;
    var html = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s;" onclick="Dashboard._closeDayDetail(event)">';
    html += '<div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;max-width:380px;width:100%;padding:24px;max-height:80vh;overflow-y:auto;" onclick="event.stopPropagation()">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h3 style="font-size:18px;font-weight:700;">第' + dayNum + '天 详情</h3><span style="font-size:24px;cursor:pointer;color:var(--text-secondary);" onclick="Dashboard._closeDayDetail(event)">✕</span></div>';

    [en, math].forEach(function(p, i) {
      if (!p) return;
      var subj = i === 0 ? '🗺️ 英语' : '🔢 数学';
      var stages = p.stages || {};
      html += '<div style="padding:12px;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:10px;">';
      html += '<div style="font-size:14px;font-weight:600;margin-bottom:8px;">' + subj + '</div>';
      html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:12px;">';
      html += '<div>得分: <strong>' + (p.score||0) + '</strong></div><div>正确率: <strong>' + (p.accuracy||0) + '%</strong></div><div>最大连击: <strong>' + (p.maxStreak||0) + '</strong></div></div>';
      if (stages.vocab || stages.grammar || stages.listening || stages.speaking || stages.boss) {
        html += '<div style="margin-top:8px;font-size:12px;color:var(--text-secondary);">';
        if (stages.vocab) html += '词汇 ' + (stages.vocab.correct||0) + '/' + (stages.vocab.total||0) + ' ';
        if (stages.grammar) html += '语法 ' + (stages.grammar.correct||0) + '/' + (stages.grammar.total||0) + ' ';
        if (stages.listening) html += '听力 ' + (stages.listening.correct||0) + '/' + (stages.listening.total||0) + ' ';
        if (stages.speaking) html += '口语 ' + (stages.speaking.correct||0) + '/' + (stages.speaking.total||0) + ' ';
        if (stages.boss) html += 'Boss ' + (stages.boss.correct||0) + '/' + (stages.boss.total||0);
        html += '</div>';
      }
      html += '<div style="font-size:11px;color:var(--text-tertiary);margin-top:6px;">' + new Date(p.dateCompleted).toLocaleString('zh-CN') + '</div></div>';
    });
    if (!en && !math) html += '<p style="text-align:center;color:var(--text-secondary);padding:20px 0;">这一天还没有记录</p>';
    html += '</div></div>';
    modal.innerHTML = html;
    modal.style.display = 'block';
  },

  _closeDayDetail(event) {
    var modal = document.getElementById('day-detail-modal');
    if (modal) modal.style.display = 'none';
  }
};
window.Dashboard = Dashboard;
