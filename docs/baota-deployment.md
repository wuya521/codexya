# 宝塔部署说明

本文档说明如何把 `First Principles Strategy OS` 部署到宝塔面板。目标是使用宝塔完成：

- 域名与 HTTPS
- Nginx 反向代理
- 前端 PM2 托管
- 后端 Python 进程托管
- PostgreSQL 数据库接入

## 一、推荐环境

- 系统：Ubuntu 22.04 / Debian 12
- Node.js：18 或 20
- Python：3.11 或 3.12
- PostgreSQL：14 及以上
- 宝塔：最新稳定版

最低建议配置：

- CPU：2 核
- 内存：4 GB
- 磁盘：40 GB

## 二、目录建议

建议在服务器上使用如下目录：

```bash
/www/wwwroot/first-principles-strategy-os
├─ frontend
├─ backend
├─ docs
├─ deploy
└─ runtime
```

## 三、上传项目

你可以通过以下任一方式上传代码：

- 在本地打包后上传到服务器并解压
- 在宝塔终端中使用 Git 克隆仓库

例如：

```bash
cd /www/wwwroot
git clone <你的-github-仓库地址> first-principles-strategy-os
cd first-principles-strategy-os
```

## 四、配置数据库

### 方案 A：使用宝塔安装 PostgreSQL

1. 在宝塔软件商店安装 PostgreSQL
2. 创建数据库 `world_inference`
3. 创建数据库用户并设置密码

### 方案 B：使用外部 PostgreSQL

直接准备外部数据库连接串即可。

推荐连接串格式：

```env
DATABASE_URL=postgresql+psycopg://postgres:your_password@127.0.0.1:5432/world_inference
```

## 五、部署后端

### 1. 创建虚拟环境并安装依赖

```bash
cd /www/wwwroot/first-principles-strategy-os/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 创建后端环境变量

创建 `backend/.env`：

```env
APP_NAME=First Principles Strategy OS API
DATABASE_URL=postgresql+psycopg://postgres:your_password@127.0.0.1:5432/world_inference
LLM_PROVIDER=deepseek
LLM_FALLBACK_TO_MOCK=false
DEEPSEEK_API_KEY=你的正式 DeepSeek Key
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
APP_SECRET=请替换为高强度随机密钥
ENABLE_DEMO_AUTH=false
SESSION_EXPIRATION_HOURS=72
```

说明：

- 生产环境不要把密钥写进代码
- `ENABLE_DEMO_AUTH` 必须为 `false`
- 如果你打算给 VIP 套餐开放更强模型，可以在后台配置模型权限

### 3. 启动后端

开发测试命令：

```bash
cd /www/wwwroot/first-principles-strategy-os/backend
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

正式运行建议使用 Gunicorn：

```bash
cd /www/wwwroot/first-principles-strategy-os/backend
source .venv/bin/activate
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 2 -b 127.0.0.1:8000
```

仓库已提供脚本模板：

- [backend-start.sh](/E:/codexya/deploy/baota/backend-start.sh)

你可以在宝塔的 `Supervisor` 或 `守护进程管理器` 中托管这个命令。

## 六、部署前端

### 1. 安装依赖

```bash
cd /www/wwwroot/first-principles-strategy-os/frontend
npm install
```

### 2. 创建前端环境变量

创建 `frontend/.env.local`：

```env
NEXT_PUBLIC_API_BASE_URL=https://你的域名/api-proxy
```

### 3. 构建并启动

```bash
cd /www/wwwroot/first-principles-strategy-os/frontend
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

推荐在宝塔中用 PM2 托管，仓库样例：

- [frontend.pm2.config.cjs](/E:/codexya/deploy/baota/frontend.pm2.config.cjs)

## 七、配置 Nginx 反向代理

宝塔站点创建完成后，把站点配置调整为：

- `/` 代理到前端 `127.0.0.1:3000`
- `/api-proxy/` 代理到后端 `127.0.0.1:8000/`

示例配置可直接参考：

- [nginx.conf](/E:/codexya/deploy/baota/nginx.conf)

示意如下：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 20m;

    location /api-proxy/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 八、HTTPS 配置

在宝塔站点里：

1. 绑定正式域名
2. 申请 Let’s Encrypt 证书
3. 开启强制 HTTPS

启用 HTTPS 后，记得同步检查前端环境变量中的 `NEXT_PUBLIC_API_BASE_URL` 是否是 `https://你的域名/api-proxy`。

## 九、首次启动验证

部署完成后建议按以下顺序验证：

1. `https://你的域名` 能打开首页
2. `https://你的域名/login` 能进入登录页
3. `https://你的域名/admin` 管理员可访问
4. `https://你的域名/api-proxy/health` 返回 `ok`
5. `https://你的域名/api-proxy/docs` 能打开 API 文档
6. 创建一次真实推演任务，确认任务页能更新状态
7. 检查后台中的套餐额度与用户权限是否可用

## 十、生产环境建议

- 数据库使用 PostgreSQL，不要用 SQLite
- 把模型密钥放在 `.env`，不要写死到代码仓库
- 关闭 demo 登录和所有默认测试账号
- 配置日志轮转与异常监控
- 为前端和后端都设置自动重启
- 给数据库做定时备份
- 若后续扩容，再把单机任务队列升级到 Redis / Celery 等分布式方案

## 十一、常见问题

### 1. 页面能打开，但推演一直没有结果

优先检查：

- 后端进程是否正常运行
- 模型密钥是否有效
- `NEXT_PUBLIC_API_BASE_URL` 是否配置正确
- Nginx 的 `/api-proxy/` 转发是否正常

### 2. 后台可进，但任务报 401

通常是：

- 登录会话未建立
- `APP_SECRET` 变化导致旧会话失效
- 前端与后端域名、协议不一致

### 3. 宝塔重启后服务没起来

通常是 PM2 或 Supervisor 没有开启开机启动。把前端和后端都加入宝塔的守护管理即可。
