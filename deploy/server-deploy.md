# 腾讯云服务器部署指南

> 把 SOE 口语评测代理部署到你的腾讯云服务器上

## 架构

```
用户浏览器 ──HTTPS──→ GitHub Pages (前端)
                         │
                         │ fetch /api/evaluate
                         ▼
                    你的腾讯云服务器 (Node.js)
                         │
                         │ WebSocket (WSS)
                         ▼
                    腾讯云 SOE API
```

- **前端**：部署在 GitHub Pages，纯静态文件
- **后端**：部署在你的腾讯云服务器，负责签名 + 代理请求
- **密钥**：只存在服务器环境变量中，前端永远不接触

---

## 第一步：服务器环境准备

SSH 登录你的腾讯云服务器：

```bash
ssh root@你的服务器IP
```

### 安装 Node.js（推荐 v18+）

```bash
# 方法一：NodeSource（推荐）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证
node -v   # 应显示 v20.x.x
npm -v
```

### 安装 ffmpeg

```bash
sudo apt update
sudo apt install -y ffmpeg

# 验证
ffmpeg -version
```

### 安装 PM2（进程守护）

```bash
sudo npm install -g pm2

# 设置开机自启
pm2 startup
# 按提示执行输出的命令
```

---

## 第二步：上传项目文件

### 方法一：Git 克隆（推荐，方便后续更新）

```bash
cd /opt
git clone https://github.com/dl2012777/summer-adventure.git
cd summer-adventure
npm install --production
```

### 方法二：scp 上传

```bash
# 在本地 Mac 执行
scp -r /Users/davidmac/Documents/summer-adventure root@你的服务器IP:/opt/
```

---

## 第三步：配置密钥

在服务器上创建 `.env` 文件：

```bash
cd /opt/summer-adventure

cat > .env << 'EOF'
TC_SECRET_ID=你的SecretId
TC_SECRET_KEY=你的SecretKey
TC_APP_ID=你的AppId
SOE_PORT=8126
EOF

# 权限设严格
chmod 600 .env
```

> ⚠️ `.env` 在 `.gitignore` 中，不会被提交到 GitHub

---

## 第四步：启动服务

```bash
# 用 PM2 启动（自动重启、日志管理）
pm2 start server.js --name soe-proxy

# 查看状态
pm2 status

# 查看日志
pm2 logs soe-proxy

# 保存 PM2 进程列表（重启后自动恢复）
pm2 save
```

期望看到：
```
✅ SOE 代理已启动: http://0.0.0.0:8126
   健康检查: http://localhost:8126/api/health
```

---

## 第五步：测试

```bash
# 在服务器本地测试
curl http://localhost:8126/api/health
```

期望返回：
```json
{"ok":true,"uptime":10,"platform":"linux","ffmpeg":true,"secretConfigured":true,"time":"..."}
```

---

## 第六步：开放防火墙端口

腾讯云服务器默认不开放 8126 端口，需要配置：

### 方法一：腾讯云控制台（推荐）

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入「云服务器」→「安全组」
3. 找到你的服务器关联的安全组
4. 添加入站规则：

| 类型 | 来源 | 协议端口 | 策略 |
|------|------|----------|------|
| 自定义 | 0.0.0.0/0 | TCP:8126 | 允许 |

### 方法二：服务器内防火墙

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 8126/tcp
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --add-port=8126/tcp --permanent
sudo firewall-cmd --reload
```

---

## 第七步：配置前端指向你的服务器

在你本地（或 GitHub 仓库中），编辑 `js/config.js`：

```javascript
// 替换为你的服务器地址
window.SOE_API_URL = 'http://你的服务器IP:8126/api/evaluate';
```

然后提交到 GitHub：

```bash
git add js/config.js
git commit -m "配置 SOE 服务器地址"
git push
```

> ⚠️ 注意 HTTPS 问题：GitHub Pages 是 HTTPS，如果服务器没有 HTTPS，浏览器会阻止混合内容请求。
> 解决方案见下方「可选：配置 HTTPS」。

---

## 可选：配置 HTTPS（解决混合内容问题）

GitHub Pages 是 HTTPS，你的服务器如果是 HTTP，浏览器会报 `Mixed Content` 错误。

### 方案 A：Nginx 反向代理 + Let's Encrypt（推荐，需要域名）

如果你有域名，这是最干净的方案。

#### 1. 域名解析
在 DNS 管理后台添加 A 记录：
```
api.你的域名.com → 你的服务器IP
```

#### 2. 安装 Nginx + Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

#### 3. 配置 Nginx

```bash
sudo nano /etc/nginx/sites-available/soe-proxy
```

写入（见 `deploy/nginx.conf`）：

```nginx
server {
    listen 80;
    server_name api.你的域名.com;

    location / {
        proxy_pass http://127.0.0.1:8126;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置（SOE 评测可能需要 20 秒）
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/soe-proxy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. 申请 SSL 证书

```bash
sudo certbot --nginx -d api.你的域名.com
# 选择 2 (redirect HTTP to HTTPS)
```

#### 5. 更新前端配置

```javascript
// js/config.js
window.SOE_API_URL = 'https://api.你的域名.com/api/evaluate';
```

### 方案 B：Cloudflare 代理（免费，不需要域名在 Cloudflare）

如果你不愿意买域名，可以用 Cloudflare Tunnel：

```bash
# 在服务器上安装 cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# 创建隧道
cloudflared tunnel --url http://localhost:8126
```

Cloudflare 会分配一个 `*.trycloudflare.com` 的 HTTPS 地址，把这个地址填到 `config.js` 即可。

> 缺点是隧道地址每次重启会变，不够稳定。

### 方案 C：仅本地测试用 HTTP

如果你只是在本地测试，不部署到 GitHub Pages，那直接用 HTTP 没问题：

```bash
# 本地启动前端
cd /Users/davidmac/Documents/summer-adventure
python3 -m http.server 8765
```

前端和服务器都在 HTTP 下，没有混合内容问题。

---

## 日常运维

```bash
# 查看服务状态
pm2 status

# 查看实时日志
pm2 logs soe-proxy --lines 50

# 重启服务（改了代码后）
pm2 restart soe-proxy

# 停止服务
pm2 stop soe-proxy

# 查看资源占用
pm2 monit
```

### 更新代码

```bash
cd /opt/summer-adventure
git pull
npm install --production
pm2 restart soe-proxy
```

---

## 安全建议

1. **不要泄露 `.env` 文件**：`.gitignore` 已排除，但确认一下

2. **锁定 CORS**（可选，正式上线后做）：
   在 `.env` 中添加：
   ```
   CORS_ORIGINS=https://dl2012777.github.io
   ```

3. **使用 HTTPS**：生产环境强烈建议配置 SSL

4. **腾讯云 API 密钥权限最小化**：
   在 [CAM 控制台](https://console.cloud.tencent.com/cam) 创建子账号，只授予 SOE 相关权限，不要用主账号密钥

5. **定期检查日志**：
   ```bash
   pm2 logs soe-proxy | grep -i error
   ```
