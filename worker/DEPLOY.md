# 口语评测服务部署指南

## 架构说明

```
GitHub Pages (静态前端)
       ↓ HTTPS
Cloudflare Worker (serverless, 免费)
  - SecretKey 存在环境变量，前端看不到
  - 签名 + WebSocket 连腾讯云 SOE
       ↓ WSS
腾讯云 SOE 口语评测 API
```

## 为什么不能把密钥放前端？

腾讯云 SOE 需要 HMAC-SHA1 签名，签名要用 SecretKey。
如果 SecretKey 写在前端 JS 里，任何人按 F12 → Sources 就能复制你的密钥，
盗刷你的腾讯云账单。所以签名必须在服务端完成。

GitHub Pages 只能放静态文件，跑不了 Node.js，所以需要 Cloudflare Worker 做服务端。

## 部署步骤

### 1. 注册 Cloudflare 账号（免费）
访问 https://dash.cloudflare.com/sign-up

### 2. 创建 Worker
- 进入 Cloudflare Dashboard → Workers & Pages → Create
- 创建一个新 Worker，命名为 `summer-soe`
- 把 `worker/soe-worker.js` 的内容粘贴进去
- 点击 Deploy

### 3. 配置环境变量（密钥）
- Worker 详情页 → Settings → Variables
- 添加三个变量：
  - `TC_SECRET_ID` = 你的 SecretId
  - `TC_SECRET_KEY` = 你的 SecretKey
  - `APP_ID` = 1410036406
- 点击 Save and Deploy

### 4. 获取 Worker 地址
部署后你会得到一个地址，类似：
`https://summer-soe.你的账号.workers.dev`

### 5. 前端配置
在 `index.html` 的 `<head>` 里加一行：
```html
<script>window.SOE_API_URL = 'https://summer-soe.你的账号.workers.dev/api/evaluate';</script>
```

前端会自动检测：
- 有 `window.SOE_API_URL` → 用 Cloudflare Worker（生产环境）
- 没有 → 尝试 `localhost:8126`（本地开发环境）

### 6. 验证
访问 `https://summer-soe.你的账号.workers.dev/api/health`
应该返回 `{"ok":true,"credentials":true}`

## 免费额度
Cloudflare Workers 免费版：每天 10 万次请求。
一个孩子做 40 天课程，每天跟读约 5 次 = 200 次/人。
免费额度够 500 个孩子同时使用。

## 本地开发
如果本地要测口语评测，仍然可以运行 `node server.js`（需要 ffmpeg）。
前端会自动检测本地服务是否可用。
