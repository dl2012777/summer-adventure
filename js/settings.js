// ============================================================
//  Settings — 题目权重配置（饼图 + 比例调节）
// ============================================================
const Settings = {
  STAGES: [
    { key: 'vocab',     label: '词汇', color: '#9B59B6' },
    { key: 'grammar',   label: '语法', color: '#E67E22' },
    { key: 'listening', label: '听力', color: '#3498DB' },
    { key: 'speaking',  label: '跟读', color: '#27AE60' }
  ],

  _canvas: null,
  _weights: null,

  // --- 打开配置界面 ---
  open(callback) {
    this._callback = callback || null;
    this._weights = Store.getStageWeights(Auth.currentUser) || { vocab: 30, grammar: 30, listening: 20, speaking: 20 };
    this._renderModal();
  },

  _renderModal() {
    var modal = document.getElementById('settings-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'settings-modal';
      document.body.appendChild(modal);
    }
    this._render();
  },

  _render() {
    var modal = document.getElementById('settings-modal');
    if (!modal) return;
    var w = this._weights;
    var _this = this;

    modal.innerHTML = `
      <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s;">
        <div style="background:#1a1a2e;color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:16px;max-width:400px;width:100%;padding:24px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-size:18px;font-weight:700;">📊 题目类型设置</h3>
            <span style="font-size:24px;cursor:pointer;color:var(--text-secondary);" onclick="Settings.close()">✕</span>
          </div>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">调整各题型比例（单科 10%~60%，以 5% 递增）</p>
          <div style="text-align:center;">
            <canvas id="pie-chart" width="280" height="220" style="max-width:100%;"></canvas>
          </div>
          <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px;max-width:320px;margin-left:auto;margin-right:auto;">
            ${this.STAGES.map(function(s) {
             var val = w[s.key];
             var maxQ = {vocab:25,grammar:25,listening:12,speaking:12}[s.key] || 12;
             var count = Math.round(maxQ * val / 60);
             return '<div style="display:flex;align-items:center;justify-content:center;gap:8px;">' +
               '<span style="width:12px;height:12px;border-radius:3px;background:' + s.color + ';"></span>' +
               '<span style="flex:0 1 auto;font-size:14px;"><strong>' + s.label + '</strong> ' + count + '题</span>' +
                '<button class="btn-mini" onclick="Settings.adjust(\'' + s.key + '\',-5)" ' + (val <= 10 ? 'disabled style="opacity:0.3;"' : '') + '>−</button>' +
                '<span style="font-size:13px;color:var(--text-secondary);min-width:36px;text-align:center;">' + val + '分</span>' +
                '<button class="btn-mini" onclick="Settings.adjust(\'' + s.key + '\',5)" ' + (val >= 60 ? 'disabled style="opacity:0.3;"' : '') + '>+</button>' +
                '</div>';
            }).join('')}
          </div>
          <div style="margin-top:16px;text-align:center;">
            <span style="font-size:13px;color:var(--text-secondary);">合计 <strong style="color:#fff;">100分</strong></span>
          </div>
          <button class="btn btn-primary btn-block" onclick="Settings.save()" style="margin-top:16px;">✅ 保存并关闭</button>
        </div>
      </div>
    `;

    this._drawPieChart();
  },

  // --- 绘制饼图 ---
  _drawPieChart() {
    var canvas = document.getElementById('pie-chart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var cx = W / 2, cy = H / 2 + 5;
    var r = Math.min(cx, cy) - 10;
    var w = this._weights;

    ctx.clearRect(0, 0, W, H);

    var start = -Math.PI / 2;
    this.STAGES.forEach(function(s) {
      var slice = (w[s.key] / 100) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();

      var mid = start + slice / 2;
      var lr = r * 0.6;
      var lx = cx + Math.cos(mid) * lr;
      var ly = cy + Math.sin(mid) * lr;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label + ' ' + w[s.key] + '%', lx, ly);

      start += slice;
    });

    // 中心圆
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.25, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('100%', cx, cy);
  },

  // --- 调整比例 ---
  adjust(key, delta) {
    var w = this._weights;
    if (w[key] + delta < 10 || w[key] + delta > 60) return;

    // 找其他阶段中能吸收调整量的（不低于10%或不超过60%）
    var others = this.STAGES.map(function(s) { return s.key; }).filter(function(k) { return k !== key; });
    var targetDelta = -delta;

    // 优先从比例最大的阶段调整
    others.sort(function(a, b) { return w[b] - w[a]; });

    var remaining = targetDelta;
    for (var i = 0; i < others.length; i++) {
      var ok = others[i];
      var available = delta > 0 ? w[ok] - 10 : 60 - w[ok]; // delta>0 别人要减，delta<0 别人要加
      if (available === 0) continue;
      var take = Math.min(Math.abs(remaining), available) * Math.sign(remaining);
      w[ok] += take;
      remaining -= take;
      if (remaining === 0) break;
    }
    if (remaining !== 0) return; // 无法调整，放弃

    w[key] += delta;
    this._render();
  },

  save() {
    Store.setStageWeights(Auth.currentUser, this._weights);
    this.close();
    if (typeof this._callback === 'function') this._callback();
  },

  close() {
    var modal = document.getElementById('settings-modal');
    if (modal) modal.remove();
  }
};
window.Settings = Settings;
