// ============================================================
//  Auth — 用户登录 / 家长 PIN
// ============================================================
const Auth = {
  AVATARS: ['👦', '👧', '🧒', '👦🏻', '👧🏻', '🐱', '🐶', '🐰', '🐼', '🦊', '🐸', '🦁'],
  currentUser: null,
  selectedAvatar: null,

  // --- 初始化 ---
  init() {
    // 如果是首次使用且有 localStorage 记录，自动恢复上次登录
    const lastUser = localStorage.getItem('summer_last_user');
    if (lastUser && Store.getUser(lastUser)) {
      this.currentUser = lastUser;
    }
  },

  // --- 是否已登录 ---
  isLoggedIn() {
    return this.currentUser !== null;
  },

  // --- 登录 ---
  login(name) {
    if (Store.getUser(name)) {
      this.currentUser = name;
      localStorage.setItem('summer_last_user', name);
      return true;
    }
    return false;
  },

  // --- 登出 ---
  logout() {
    this.currentUser = null;
    localStorage.removeItem('summer_last_user');
  },

  // --- 渲染登录页 ---
  renderLogin() {
    const container = document.getElementById('login-content');
    const users = Store.getUsers();
    const userNames = Object.keys(users);

    if (userNames.length > 0) {
      // 已有用户，自动登录
      this.login(userNames[0]);
      window.location.hash = 'home';
      return;
    }

    // 首次使用，显示创建表单
    this.selectedAvatar = null;
    container.innerHTML = this._createFormHTML(true);
  },

  // --- 显示创建表单 ---
  showCreateForm() {
    this.selectedAvatar = null;
    const container = document.getElementById('login-content');
    container.innerHTML = this._createFormHTML(false);
  },

  _createFormHTML(isFirst) {
    return `
      <div class="slide-up">
        ${isFirst ? '' : '<button class="back-btn" onclick="Auth.renderLogin()" style="margin-bottom:16px;">← 返回</button>'}
        <h3 style="margin-bottom:4px;">${isFirst ? '创建你的冒险档案' : '新同学加入'}</h3>
        <p class="subtitle" style="margin-bottom:16px;">选一个头像，给自己取个名字吧！</p>

        <label style="font-size:14px;color:var(--text-secondary);display:block;margin-bottom:8px;">选择头像</label>
        <div class="avatar-grid" id="avatar-grid">
          ${this.AVATARS.map((a, i) => `
            <div class="avatar-item" data-index="${i}" onclick="Auth.selectAvatar(${i})">
              ${a}
            </div>
          `).join('')}
        </div>

        <div style="margin-top:16px;">
          <label style="font-size:14px;color:var(--text-secondary);display:block;margin-bottom:8px;">你的名字</label>
          <input class="input" id="nickname-input" placeholder="输入名字，如 米兜" maxlength="8"
            onkeydown="if(event.key==='Enter') Auth.submitCreate()">
        </div>

        <button class="btn btn-primary btn-block" onclick="Auth.submitCreate()" style="margin-top:20px;">
          🚀 ${isFirst ? '开始冒险！' : '加入冒险！'}
        </button>
        <p id="create-error" style="color:var(--danger);font-size:13px;margin-top:10px;display:none;"></p>
      </div>
    `;
  },

  selectAvatar(index) {
    this.selectedAvatar = index;
    document.querySelectorAll('.avatar-item').forEach(el => el.classList.remove('selected'));
    document.querySelector(`.avatar-item[data-index="${index}"]`).classList.add('selected');
  },

  submitCreate() {
    const name = document.getElementById('nickname-input').value.trim();
    const errorEl = document.getElementById('create-error');

    if (!name) {
      errorEl.textContent = '请输入名字';
      errorEl.style.display = 'block';
      return;
    }
    if (name.length < 1 || name.length > 8) {
      errorEl.textContent = '名字长度 1-8 个字';
      errorEl.style.display = 'block';
      return;
    }

    let avatarEmoji = '👦';
    if (this.selectedAvatar !== null) {
      avatarEmoji = this.AVATARS[this.selectedAvatar];
    }

    const success = Store.createUser(name, avatarEmoji);
    if (!success) {
      errorEl.textContent = '这个名字已被使用，换一个吧';
      errorEl.style.display = 'block';
      return;
    }

    this.login(name);
    App.showHome();
    window.location.hash = "home";
  },

  // --- 获取当前用户头像 ---
  getCurrentAvatar() {
    const user = Store.getUser(this.currentUser);
    return user ? user.profile.avatar : '👦';
  }
};
window.Auth = Auth;
