// ============================================================
//  Sounds — Web Audio API 音效
//  答对：鼓掌声 | 答错：惋惜声 + 锤子敲击
// ============================================================
const Sounds = {
  _ctx: null,
  _enabled: true,

  init() {
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) { this._enabled = false; return; }
      this._ctx = new Ctor();
      // Resume on any user gesture
      const resume = () => {
        if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
        document.removeEventListener('click', resume);
        document.removeEventListener('touchstart', resume);
      };
      document.addEventListener('click', resume);
      document.addEventListener('touchstart', resume);
    } catch(e) {
      this._enabled = false;
    }
  },

  _getCtx() {
    if (!this._enabled || !this._ctx) return null;
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  },

  // --- 答对：鼓掌声（四个上升音阶 + 白噪声） ---
  playCorrect() {
    const ctx = this._getCtx();
    if (!ctx) return;
    // Four ascending chime notes
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  },

  // --- 答错：低沉的惋惜声（下降音 + 粗糙音色） ---
  playWrong() {
    const ctx = this._getCtx();
    if (!ctx) return;
    // Descending buzz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.5);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  },

  // --- 锤子敲击：短促的打击声 ---
  playHammer() {
    const ctx = this._getCtx();
    if (!ctx) return;
    // Short percussive hit
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.08);
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }
};
