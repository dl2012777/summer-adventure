# 开发日志

## 2026-06-20/21 腾讯口语评测接入

### 遇到的问题及处理

#### 1. "直接跟读"按钮无反应
**现象**：首页点击"直接跟读"按钮没有任何反应
**根因**：多重问题叠加
1. `speech.js` 中的 `async function()` 语法 Chrome 在对象字面量中解析失败，导致 `Speak` 整个对象未加载
2. 游戏引擎初始化时访问 `Speak.isSupported()` 报 `ReferenceError: Speak is not defined`
3. 之前尝试的 `_skipToStage` 机制、`goToSpeaking()` 函数、路由参数传递等方法过于复杂
**处理**：最终用最简单方式解决
1. 回退 `main.js` 和 `game-engine.js` 到 git 干净版本
2. 按钮直接跳转 `window.location.hash='game/en/1/3'`
3. 路由解析第三段参数 `startStage`
4. `showGame` 调用引擎后用 600ms `setTimeout` 调用 `engine._startStage(3)`
**状态**：✅ 已解决

#### 2. speech.js 语法错误
**现象**：Chrome 报 `Uncaught SyntaxError: Async functions can only be declared at the top level or inside a block.`
**根因**：`evaluateWithTencent: async function(refText) {}` 中 `async function` 在对象字面量内被 Chrome 拒绝
**处理**：
1. 改为 `function ev(refText)`（命名函数表达式）
2. 内部 `await` 改为 `.then()` 链
**状态**：✅ 已解决

#### 3. 腾讯云口语评测 API 对接
**现象**：调用 API 返回 `AuthFailure.AccountUnavailable - 账号未开通口语评测服务或账号已欠费隔离`
**根因**：
1. 起初使用的是旧版 REST API（`soe.tencentcloudapi.com`, product 884），但该服务未开通
2. 用户实际开通的是"智聆口语评测（新版）"，使用 WebSocket 协议（WSS）
**处理**：
1. 确认 SecretId/SecretKey 有效
2. 获取 AppID（1410036406）
3. 改用新版 WebSocket API：`wss://soe.cloud.tencent.com/soe/api/{AppId}?{params}&signature=`
4. 实现 HMAC-SHA1 签名生成
5. 实现 ffmpeg 音频转码（浏览器记录的 WebM → 16kHz WAV）
6. 验证 WebSocket 握手成功 ✅，完整评测返回分数 ✅
**状态**：⚠️ API 调通但服务器进程不稳定

#### 4. Node.js 后端服务进程被杀死
**现象**：`node server.js` 启动后立即退出（exit code 0）
**根因**：沙箱环境（sandbox）限制：
1. `nice(5) failed: operation not permitted` - 后台进程优先级设置被拒
2. exec_command 会话结束后后台进程被清理
3. 即使使用 `nohup` / `disown` 仍然会被杀死
**处理**：
1. 在 `server.js` 末尾添加 `setInterval(function(){}, 60000)` 保持事件循环活跃
2. 通过 `exec_command` + `yield_time_ms` 保持会话存活
3. 需要定期写入 stdin 维持会话
**状态**：❌ 未彻底解决。需要手动保持 exec_command 会话存活

#### 5. 音频格式不匹配
**现象**：腾讯 API 返回参数错误（VoiceEncodeType 无效）
**根因**：
1. 浏览器 MediaRecorder 录制的是 WebM/Opus 格式
2. 腾讯新版 API 需要 16kHz/16bit/mono WAV 或 PCM
**处理**：
1. 使用 `/opt/homebrew/bin/ffmpeg` 在服务端转换
2. 已验证: Chrome WebM 录制(48kHz Opus) → ffmpeg → 16kHz WAV 成功 ✅
**状态**：✅ 已解决

#### 6. URL 参数编码问题
**现象**：带空格或单引号的 refText（如 "It's my book."）导致 WebSocket 连接失败
**根因**：签名使用未编码参数，URL 却使用未编码参数，特殊字符破坏 URL 结构
**处理**：
1. 签名原文使用原始（unencoded）参数
2. URL 中使用 `encodeURIComponent` 编码每个参数值
**状态**：✅ 已解决

#### 7. speak.js 中 fetch 参数问题
**现象**：`window.__speechResolve` 回调方式导致 Promise 不 resolve
**根因**：`evaluateWithTencent` 使用了全局回调变量方式，与 Promise 模式不兼容
**处理**：该函数当前未被 `_startRecording` 调用（`_startRecording` 使用内联 fetch），不影响功能
**状态**：⏸️ 暂不处理，后续重构跟读时统一调整

### 待解决问题

1. **后端服务持久化**：需要找到让 Node.js 进程不被 sandbox 杀死的方法
2. **跟读界面评分展示**：`_handleTencentResult` 函数存在但尚未全面测试
3. **前端录音时间**：当前固定 5 秒，应根据句子长度动态调整
4. **错误提示**：当评测服务不可用时应显示友好提示而非"连接失败"
5. **代码清理**：`server.js` 中包含 SecretId/SecretKey（目前通过环境变量传入），`speech.js` 中有未使用的 `evaluateWithTencent` 方法

### 项目状态

- 前端 App: http://127.0.0.1:8125/ ✅
- 评测后端: http://127.0.0.1:8126 ⚠️（需要保持会话存活）
- 腾讯云 WebSocket 评测: ✅ 调通，单次测试成功
- 浏览器录音 → ffmpeg 转码 → WSS 发送 → 腾讯评分: 🔄 完整链路测试中
