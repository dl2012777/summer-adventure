// ============================================================
//  Main — SPA 路由 & 页面切换
// ============================================================

// --- 科目与天数据（阶段1放7天，后续扩展到40天）---
var SUBJECTS = {
  en: {
    title: '英语大冒险',
    sub: '沪教版 5A + 5B 下册',
    color: 'en',
    days: [
      { num:1,  title:'My birthday (a)',         unit:'5A M1U1 · 序数词·日期' },
      { num:2,  title:'My birthday (b)',         unit:'5A M1U1 · 邀请·派对' },
      { num:3,  title:'My way to school',        unit:'5A M1U2 · 交通方式' },
      { num:4,  title:'My future',               unit:'5A M1U3 · 职业梦想' },
      { num:5,  title:'M1 复习',                 unit:'5A M1 · 综合复习' },
      { num:6,  title:'Grandparents',            unit:'5A M2U1 · 频率副词' },
      { num:7,  title:'Friends',                 unit:'5A M2U2 · 朋友介绍' },
      { num:8,  title:'Moving home',             unit:'5A M2U3 · 家居词汇' },
      { num:9,  title:'M2 复习',                 unit:'5A M2 · 综合复习' },
      { num:10, title:'Around the city (a)',     unit:'5A M3U1 · 问路' },
      { num:11, title:'Around the city (b)',     unit:'5A M3U1 · 指路' },
      { num:12, title:'Buying clothes (a)',       unit:'5A M3U2 · 购物对话' },
      { num:13, title:'Buying clothes (b)',       unit:'5A M3U2 · 价格·试穿' },
      { num:14, title:'Seeing the doctor',        unit:'5A M3U3 · 病症·建议' },
      { num:15, title:'M3 复习',                 unit:'5A M3 · 综合复习' },
      { num:16, title:'Water',                   unit:'5A M4U1 · 水的用途' },
      { num:17, title:'Wind',                    unit:'5A M4U2 · 风·天气' },
      { num:18, title:'Fire',                    unit:'5A M4U3 · 消防安全' },
      { num:19, title:'5A 冲刺',                 unit:'5A · 全册综合' },
      { num:20, title:'What a mess! (a)',        unit:'5B M1U1 · 物主代词' },
      { num:21, title:'What a mess! (b)',        unit:'5B M1U1 · 整理房间' },
      { num:22, title:'Watch it grow! (a)',      unit:'5B M1U2 · 生命周期' },
      { num:23, title:'Watch it grow! (b)',      unit:'5B M1U2 · 顺序描述' },
      { num:24, title:'In the future',           unit:'5B M1U3 · will将来时' },
      { num:25, title:'M1 复习',                 unit:'5B M1 · 综合复习' },
      { num:26, title:'Food and drinks (a)',     unit:'5B M2U1 · some/any' },
      { num:27, title:'Food and drinks (b)',     unit:'5B M2U1 · 购物清单' },
      { num:28, title:'Our new home',            unit:'5B M2U2 · was/were' },
      { num:29, title:'Musical instruments',     unit:'5B M2U3 · 乐器·can' },
      { num:30, title:'M2 复习',                 unit:'5B M2 · 综合复习' },
      { num:31, title:'Signs (a)',               unit:'5B M3U1 · must/mustn\'t' },
      { num:32, title:'Signs (b)',               unit:'5B M3U1 · can/can\'t' },
      { num:33, title:'Clothes',                 unit:'5B M3U2 · 服装·尺码' },
      { num:34, title:'Healthy or unhealthy',    unit:'5B M3U3 · 健康饮食' },
      { num:35, title:'M3 复习',                 unit:'5B M3 · 综合复习' },
      { num:36, title:'Butterflies',             unit:'5B M4U1 · 蝴蝶一生' },
      { num:37, title:'The sun',                 unit:'5B M4U2 · 太阳·影子' },
      { num:38, title:'Earth Hour',              unit:'5B M4U3 · 环保·节能' },
      { num:39, title:'5B 冲刺',                 unit:'5B · 全册综合' },
      { num:40, title:'🏆 Final Boss 🏆',        unit:'全册 · 40题大决战' },
    ]
  },
  math: {
    title: '数学大冒险',
    sub: '北师大版 五上 + 五下',
    color: 'math',
    days: [
      { num:1,  title:'小数除法 (a)',            unit:'五上 · 除数是整数/小数' },
      { num:2,  title:'小数除法 (b)',            unit:'五上 · 近似值·循环小数' },
      { num:3,  title:'小数除法 复习',           unit:'五上 · 综合复习' },
      { num:4,  title:'轴对称和平移',             unit:'五上 · 对称轴·平移' },
      { num:5,  title:'倍数与因数 (a)',           unit:'五上 · 2/3/5倍数特征' },
      { num:6,  title:'倍数与因数 (b)',           unit:'五上 · 质数·合数' },
      { num:7,  title:'倍数与因数 复习',          unit:'五上 · 综合复习' },
      { num:8,  title:'多边形面积 (a)',           unit:'五上 · 平行四边形' },
      { num:9,  title:'多边形面积 (b)',           unit:'五上 · 三角形·梯形' },
      { num:10, title:'多边形面积 复习',          unit:'五上 · 综合复习' },
      { num:11, title:'分数的意义 (a)',           unit:'五上 · 真分数·假分数' },
      { num:12, title:'分数的意义 (b)',           unit:'五上 · 约分·通分' },
      { num:13, title:'分数的意义 复习',          unit:'五上 · 综合复习' },
      { num:14, title:'组合图形的面积',           unit:'五上 · 分割·添补' },
      { num:15, title:'可能性',                   unit:'五上 · 概率·公平性' },
      { num:16, title:'五上综合复习',             unit:'五上 · 全册综合' },
      { num:17, title:'分数加减法 (a)',           unit:'五下 · 异分母加减' },
      { num:18, title:'分数加减法 (b)',           unit:'五下 · 混合运算' },
      { num:19, title:'分数加减法 复习',          unit:'五下 · 综合复习' },
      { num:20, title:'长方体（一）(a)',           unit:'五下 · 展开图·棱长' },
      { num:21, title:'长方体（一）(b)',           unit:'五下 · 表面积' },
      { num:22, title:'长方体（一）复习',         unit:'五下 · 综合复习' },
      { num:23, title:'分数乘法 (a)',             unit:'五下 · 分数×整数' },
      { num:24, title:'分数乘法 (b)',             unit:'五下 · 倒数·混合' },
      { num:25, title:'分数乘法 复习',            unit:'五下 · 综合复习' },
      { num:26, title:'长方体（二）(a)',           unit:'五下 · 体积·单位' },
      { num:27, title:'长方体（二）(b)',           unit:'五下 · 容积·排水' },
      { num:28, title:'长方体（二）复习',         unit:'五下 · 综合复习' },
      { num:29, title:'分数除法 (a)',             unit:'五下 · 分数÷整数' },
      { num:30, title:'分数除法 (b)',             unit:'五下 · 乘除混合' },
      { num:31, title:'分数除法 复习',            unit:'五下 · 综合复习' },
      { num:32, title:'确定位置',                 unit:'五下 · 方向·数对' },
      { num:33, title:'用方程解决问题',            unit:'五下 · 列方程' },
      { num:34, title:'数据与分析',               unit:'五下 · 统计图·平均数' },
      { num:35, title:'统计 复习',                unit:'五下 · 综合复习' },
      { num:36, title:'易错专项 (计算)',           unit:'冲刺 · 计算易错' },
      { num:37, title:'易错专项 (概念)',           unit:'冲刺 · 概念易错' },
      { num:38, title:'易错专项 (应用)',           unit:'冲刺 · 应用易错' },
      { num:39, title:'全真模拟',                 unit:'冲刺 · 模拟考试' },
      { num:40, title:'🏆 Final Boss 🏆',        unit:'冲刺 · 40题决战' },
    ]
  }
};

const App = {
  currentPage: null,

  // --- 初始化 ---
  init() {
    Auth.init();
    this.router();
    window.addEventListener('hashchange', () => this.router());
  },

  // --- 路由 ---
  router() {
    const hash = window.location.hash.slice(1) || 'login';
    const parts = hash.split('/');

    switch (parts[0]) {
      case 'login':
        this.showLogin();
        break;
      case 'home':
        this.showHome();
        break;
      case 'days':
        this.showDays(parts[1] || 'en');
        break;
      case 'game':
        this.showGame(parts[1] || '', parts[2] || '', parseInt(parts[3]) || 0);
        break;
      case 'dashboard':
        this.showDashboard();
        break;
      default:
        this.showLogin();
    }
  },

  // --- 页面切换工具 ---
  _switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + pageId);
    if (page) {
      page.classList.add('active');
      // 滚动到顶部
      window.scrollTo(0, 0);
    }
    this.currentPage = pageId;
  },

  // --- 显示 Toast ---
  _toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2000);
  },

  // ==================== 页面渲染 ====================

  // --- 登录页 ---
  showLogin() {
    Auth.renderLogin();
    this._switchPage('login');
  },

  // --- 首页 ---
  showHome() {
    if (!Auth.isLoggedIn()) {
      this.showLogin();
      return;
    }

    const user = Store.getUser(Auth.currentUser);
    const stats = Store.getStats(Auth.currentUser);
    const stars = Store.getStars(Auth.currentUser);
    const avatar = user.profile.avatar;

    const container = document.getElementById('home-content');
    container.innerHTML = `
      <div class="header">
        <div class="header-left">
          <div class="user-badge" onclick="App.showLogin();">
            <span class="avatar">${avatar}</span>
            <span>${Auth.currentUser}</span>
          </div>
         <div class="stars-display">⭐ ${stars}</div>
       </div>
      </div>

      <div class="home-hero slide-up">
        <div id="home-ranking"></div>
        <div id="home-podium"></div>
      </div>

      <div class="subject-grid">
        <a class="subject-card en" onclick="App.checkSettingsThenGo('en')">
          <div class="icon">🗺️</div>
          <h2>英语大冒险</h2>
          <p>沪教版 5A + 5B · 跟着课本闯关<br>词汇 + 语法 + 听说挑战 + Boss</p>
          <div class="stats">
            <span>📚 ${stats.englishDays}/${SUBJECTS.en.days.length} 天</span>
          </div>
        </a>
        <a class="subject-card math" onclick="App.goToDays('math')">
          <div class="icon">🔢</div>
          <h2>数学大冒险</h2>
          <p>北师大版五年级 · 口算 + 概念 + 应用<br>从五上到五下，步步通关</p>
          <div class="stats">
            <span>📚 ${stats.mathDays}/${SUBJECTS.math.days.length} 天</span>
          </div>
        </a>
      </div>

     <div class="home-footer">
       <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
         <div class="parent-link" onclick="App.goToDashboard()">
           📊 学习看板
         </div>
         <div class="parent-link" style="border-color:rgba(39,174,96,0.3);" onclick="Store.downloadFile(JSON.stringify(Store.exportAllData(Auth.currentUser),null,2),'summer-adventure-'+Auth.currentUser+'-'+new Date().toISOString().slice(0,10)+'.json','application/json')">
           💾 导出数据
         </div>
         <div class="parent-link" style="border-color:rgba(124,92,191,0.3);" onclick="window.location.hash='game/en/1/3'">
           🎤 直接跟读
          </div>
          <div class="parent-link" style="border-color:rgba(239,68,68,0.3);" onclick="Store.resetProgress();window.location.reload();">
           🔄 重置
       </div>
      </div>
      <div style="border-top:1px solid var(--border);margin-top:16px;padding-top:12px;text-align:center;">
        <span style="font-size:11px;color:var(--text-tertiary);">⚡ 测试按钮</span>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:6px;">
          <div class="parent-link" style="border-color:rgba(52,152,219,0.3);padding:8px 20px;font-weight:600;" onclick="window.location.hash='game/math/1/3'">
            ✏️ 应用题测试
          </div>
        </div>
      </div>
    `;

    this._switchPage('home');
    // 渲染排名
    setTimeout(function() {
      var r = document.getElementById('home-ranking');
      if (r) r.innerHTML = Ranking.render(Auth.currentUser);
      var p = document.getElementById('home-podium');
      if (p) p.innerHTML = Ranking.renderPodium();
      // 显示打卡信息
      var ci = document.getElementById('checkin-info');
      if (ci) {
        try {
          var cd = Store.getCheckin(Auth.currentUser);
          ci.innerHTML = '<div style="font-size:13px;margin-top:8px;text-align:center;"><span style="color:#F39C12;">🔥 连续打卡 ' + cd.streak + ' 天</span> · 累计奖励 ' + cd.totalBonus + ' 分</div>';
        } catch(e) {}
      }
    }, 100);
  },

  // --- 天选择页 ---
  showDays(subject) {
    if (!Auth.isLoggedIn()) { this.showLogin(); return; }

    const s = SUBJECTS[subject];
    if (!s) { this.showHome(); return; }

    const progress = Store.getAllProgress(Auth.currentUser);
    const prefix = subject === 'en' ? 'en' : 'math';

    const container = document.getElementById('days-content');
    container.innerHTML = `
      <div class="day-header">
        <a class="back-btn" onclick="App.showHome()">← 返回</a>
        <div class="subject-title ${s.color}-title">${s.icon || ''} ${s.title}</div>
        <div class="subject-sub">${s.sub} · ${s.days.length}天闯关计划</div>
      </div>

      <div class="day-grid" id="day-grid">
        ${s.days.map(d => {
          const key = `${prefix}-day${d.num}`;
          const p = progress[key];
          let statusHtml = '';
          if (p && p.completed) {
            const accuracy = p.accuracy || 0;
            statusHtml = `<span class="status-badge done">${accuracy}% ✅</span>`;
          } else {
            statusHtml = `<span class="status-badge pending">未开始</span>`;
          }
          return `
            <a class="day-card ${s.color}" onclick="App.goToGame('${subject}', ${d.num})">
              <div class="num">${d.num}</div>
              <div class="info">
                <h3>${d.title}</h3>
                <div class="sub">${d.unit}</div>
              </div>
              ${statusHtml}
              <span class="arrow">→</span>
            </a>
          `;
        }).join('')}
      </div>
    `;

    this._switchPage('days');
  },

  // --- 游戏页占位 ---
  showGame(subject, dayNum, startStage) {
    var gc = document.getElementById('game-content');
    if (!Auth.isLoggedIn()) {
      this.showLogin();
      return;
    }

    var s = window.SUBJECTS ? window.SUBJECTS[subject] : SUBJECTS[subject];
    if (!s) {
      this.showHome();
      return;
    }

    var day = s.days.find(function(d) { return d.num == dayNum; });
    if (!day) {
      this.showDays(subject);
      return;
    }

    var dayKey = subject + '-day' + dayNum;
    var questions = window.QUESTIONS ? window.QUESTIONS[dayKey] : (typeof QUESTIONS !== 'undefined' ? QUESTIONS[dayKey] : null);

    if (!questions || questions.length === 0) {
      const container = document.getElementById('game-content');
      container.innerHTML = `
        <div class="game-header">
          <a class="back-btn" onclick="App.goToDays('${subject}')">← 返回</a>
          <div class="game-title ${s.color}-title">${s.title} · 第${day.num}天</div>
          <div class="game-info">${day.title} · ${day.unit}</div>
        </div>
        <div class="game-placeholder">
          <div class="icon">📝</div>
          <h3>题库准备中</h3>
          <p>该天的题目还没生成，先用 Day 1 试试<br>→ 返回选择第 1 天</p>
          <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
            <button class="btn btn-small btn-outline" onclick="App.goToDays('${subject}')">← 选其他天</button>
            <button class="btn btn-small ${subject === 'en' ? 'btn-primary' : 'btn-math'}" onclick="App.showHome()">🏠 首页</button>
          </div>
        </div>
      `;
      this._switchPage('game');
      return;
    }

    // 有题库，启动游戏引擎
    this._switchPage('game');
    var engine = window.GameEngine || GameEngine;
    engine.start(dayKey, questions, subject, dayNum);
    if (startStage > 0) {
      setTimeout(function() {
        var en = window.GameEngine || GameEngine;
        if (en && en.state) en._startStage(startStage);
      }, 600);
    }
  },

  // --- 学习进度 ---
  showDashboard() {
    this._switchPage('dashboard');
    Dashboard.render('dashboard-content');
  },

  // ==================== 导航辅助 ====================
  // --- 点击英语前先检查题目类型设置 ---
 checkSettingsThenGo(subject) {
    Settings.open(function() { App.goToDays(subject); });
  },

  goToDays(subject) {
    window.location.hash = `days/${subject}`;
  },

  goToGame(subject, dayNum) {
    window.location.hash = `game/${subject}/${dayNum}`;
  },

  goToDashboard() {
    window.location.hash = 'dashboard';
  }
};

// --- 启动 ---
document.addEventListener('DOMContentLoaded', () => App.init());
window.App = App;
