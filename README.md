# First Principles Strategy OS

一个面向真实业务决策的推演与路径规划平台。项目目标不是做聊天式演示，而是把“问题输入 -> 结构化推演 -> 异步任务 -> 结果复盘 -> 团队协作 -> 套餐运营 -> 后台管理”做成可以上线交付的正式产品。

## 项目定位

这个项目适合以下场景：

- 战略推演：判断一个业务、产品、市场动作接下来大概率如何演化
- 路径规划：围绕一个明确目标，给出最快、最稳、最优的执行路线
- 团队协作：组织成员共享历史推演、任务状态和套餐额度
- 商业化运营：支持账号体系、套餐、额度、后台管理和任务追踪

当前版本已经是前后端分离的可运行系统：

- 前端：Next.js 14 + React 18
- 后端：FastAPI + SQLAlchemy
- 数据库：SQLite 本地开发，PostgreSQL 生产推荐
- 模型接入：DeepSeek / OpenAI
- 推演模式：异步任务队列 + 轮询 + SSE 推送

## 核心能力

- 用户注册、登录、会话与组织体系
- 工作台、团队页、会员中心、后台管理
- 走向预测与最佳路径两种核心推演模式
- 模板库直接套用到推演表单
- 异步任务队列，避免长推理阻塞页面
- 推演结果支持因果图谱、情景分支、路线奖励模拟、风险与观察信号
- 重演机制支持版本对比、差异说明和来源追踪
- 后台支持管理用户、套餐、额度、模型权限和订单视图

## 页面说明

本地启动后主要入口如下：

- 首页：`http://127.0.0.1:3000`
- 登录：`http://127.0.0.1:3000/login`
- 走向预测：`http://127.0.0.1:3000/forecast`
- 最佳路径：`http://127.0.0.1:3000/pathfinder`
- 模板库：`http://127.0.0.1:3000/templates`
- 历史记录：`http://127.0.0.1:3000/history`
- 工作台：`http://127.0.0.1:3000/workspace`
- 团队页：`http://127.0.0.1:3000/team`
- 会员中心：`http://127.0.0.1:3000/account`
- 后台：`http://127.0.0.1:3000/admin`
- 设置页：`http://127.0.0.1:3000/settings`
- API 文档：`http://127.0.0.1:8000/docs`

本地默认管理员账号：

- 邮箱：`founder@inference.local`
- 密码：`Demo12345!`

仅用于本地演示，正式环境请关闭 demo 登录并重置所有默认账号。

## 项目结构

```text
codexya/
├─ frontend/                # Next.js 前端
├─ backend/                 # FastAPI 后端
├─ docs/                    # 文档
├─ deploy/baota/            # 宝塔部署样例
├─ runtime/                 # 本地运行时数据
└─ docker-compose.yml       # PostgreSQL 本地容器
```

## 推演流程原理

### 1. 输入阶段

用户在 `走向预测` 或 `最佳路径` 页面输入：

- 目标问题
- 已知事实
- 约束条件
- 不确定项
- 相关方
- 时间范围
- 优化目标

### 2. 任务提交阶段

前端不会直接卡住等待完整模型输出，而是：

1. 提交分析任务到后端
2. 后端创建 `job`
3. 前端进入任务页展示进度
4. 页面通过轮询和 SSE 获取状态更新

这样做的原因是模型推理通常耗时较长，异步任务能保证页面响应、错误反馈和重试体验更稳定。

### 3. 模型推理阶段

后端会：

1. 根据模式选择对应 prompt 结构
2. 根据套餐和设置选择模型
3. 调用 DeepSeek 或 OpenAI
4. 将模型输出归一化成稳定结构
5. 保存分析结果和任务耗时

### 4. 结果展示阶段

结果页会展示：

- 问题定义和当前态势
- 关键变量与因果图谱
- 情景分支与概率判断
- 推荐路线和奖励模拟
- 风险、观察信号、下一步动作
- 如为重演，则附带版本差异说明

## 模型与额度说明

项目已支持模型切换，推荐策略如下：

- 普通套餐：DeepSeek 标准模型
- 高级套餐：DeepSeek 高阶模型或 OpenAI 更强模型
- 管理后台：按套餐控制模型白名单、并发数、任务额度

生产环境建议：

- `LLM_FALLBACK_TO_MOCK=false`
- 未配置模型密钥时直接报错，不要静默退回 mock
- 将高成本模型只开放给高阶套餐

## 本地开发启动

### 1. 启动 PostgreSQL

如果你想用 PostgreSQL 进行本地联调：

```bash
docker compose up -d postgres
```

### 2. 配置后端

进入 [backend/.env.example](/E:/codexya/backend/.env.example) 对应的变量，复制为 `backend/.env`。

推荐至少设置：

```env
APP_NAME=First Principles Strategy OS API
DATABASE_URL=sqlite:///./world_inference.db
LLM_PROVIDER=deepseek
LLM_FALLBACK_TO_MOCK=false
DEEPSEEK_API_KEY=your_real_key
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com
APP_SECRET=replace_with_a_real_secret
ENABLE_DEMO_AUTH=false
```

安装依赖并启动后端：

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 3. 配置前端

创建 `frontend/.env.local`：

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

安装依赖并启动前端：

```bash
cd frontend
npm install
npm run dev
```

生产模式启动：

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

## 生产部署

### 方案一：手动部署

推荐组合：

- Nginx
- Next.js 前端服务
- FastAPI + Gunicorn/Uvicorn
- PostgreSQL
- PM2 或 systemd / Supervisor

### 方案二：宝塔部署

宝塔部署的完整步骤见 [docs/baota-deployment.md](/E:/codexya/docs/baota-deployment.md)。

仓库里已经提供了可直接参考的样例：

- [nginx.conf](/E:/codexya/deploy/baota/nginx.conf)
- [frontend.pm2.config.cjs](/E:/codexya/deploy/baota/frontend.pm2.config.cjs)
- [backend-start.sh](/E:/codexya/deploy/baota/backend-start.sh)

## 上线前检查清单

- 替换所有本地演示密钥和默认密码
- 关闭 demo 登录
- 切换到 PostgreSQL
- 配置正式域名和 HTTPS
- 配置日志、监控、备份
- 校验套餐额度、模型权限和后台角色
- 校验支付和订阅回调

## GitHub 推送前注意事项

以下内容不应提交到 GitHub：

- `backend/.env`
- `frontend/.env.local`
- 数据库文件
- 日志文件
- 运行时缓存和本地构建产物

仓库已经通过 `.gitignore` 对这些内容进行了忽略，但推送前仍建议用 `git status` 再检查一次。

## 常用命令

```bash
# 前端构建
cd frontend
npm run build

# 后端编译检查
cd backend
python -m compileall app

# 本地 PostgreSQL
docker compose up -d postgres
```

## 交付建议

如果你准备把这个项目拿去正式展示或商用，建议优先完成这四件事：

1. 切换到 PostgreSQL
2. 使用正式模型密钥并关闭 mock
3. 配置 HTTPS 域名
4. 在后台把套餐额度、角色权限和支付链路走通

做到这一步，这个仓库就已经不是原型，而是可以进入真实试运营阶段的产品基线。
