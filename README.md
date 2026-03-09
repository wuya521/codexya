# Super OS 超级OS

一个面向真实决策场景的推演与路径规划系统。

它不是聊天演示页，而是把“输入问题 -> 提交异步任务 -> 生成结构化结果 -> 购买套餐 -> 兑换码补量 -> 后台运营管理”做成可落地的产品骨架。

## 当前状态

当前仓库已经包含这些可运行能力：

- 用户注册、登录、会话管理
- 套餐购买与套餐切换
- 单次兑换码体系
- 额外额度余额体系
- 异步任务队列、轮询与 SSE 推送
- 额度不足 / 模型权限不足阻断
- 全局 Toast 成功反馈
- 运营后台用户 CRUD
- 套餐额度与模型权限维护
- 兑换码后台生成、停用、删除
- 推演结果结构化展示
- 宝塔部署样例

## 产品结构

前端：
- Next.js 14
- React 18

后端：
- FastAPI
- SQLAlchemy

模型：
- DeepSeek
- OpenAI

数据库：
- 本地开发默认 SQLite
- 生产建议 PostgreSQL

## 页面说明

本地启动后主要入口：

- 首页：`http://127.0.0.1:3000`
- 登录：`http://127.0.0.1:3000/login`
- 走向预测：`http://127.0.0.1:3000/forecast`
- 路径规划：`http://127.0.0.1:3000/pathfinder`
- 模板库：`http://127.0.0.1:3000/templates`
- 历史推演：`http://127.0.0.1:3000/history`
- 控制台：`http://127.0.0.1:3000/workspace`
- 套餐与兑换：`http://127.0.0.1:3000/account`
- 运营后台：`http://127.0.0.1:3000/admin`
- API 文档：`http://127.0.0.1:8000/docs`

本地默认管理员账号：

- 邮箱：`founder@inference.local`
- 密码：`Demo12345!`

## 推演流程原理

### 1. 用户输入

用户在“走向预测”或“路径规划”页面输入：

- 标题
- 核心问题
- 时间范围
- 已知事实
- 约束条件
- 不确定项
- 相关方
- 目标结果
- 已尝试动作
- 模型档位

### 2. 创建异步任务

前端不会一直卡在提交按钮上等待模型返回。

提交时会：

1. 调用 `POST /api/analysis-jobs`
2. 后端先校验套餐、额度、模型权限、并发上限
3. 校验通过后创建 `job`
4. 前端跳转任务页
5. 前端通过轮询和 SSE 订阅任务状态

这样做的好处是：

- 大模型慢时页面依旧流畅
- 可以展示排队、运行、完成、失败
- 更适合正式产品的任务中心体验

### 3. 模型推理

后端会根据当前套餐允许的模型档位，选择对应 provider 和模型。

当前支持：

- `LLM_PROVIDER=deepseek`
- `LLM_PROVIDER=openai`

模型返回后会被归一化成固定结构，主要包括：

- 问题定义
- 当前状态
- 关键变量
- 因果边
- 情景分支
- 推荐路径
- 风险
- 观察信号
- 下一步动作

### 4. 结果展示

结果页会展示：

- 主结论和置信度
- 因果关系图谱
- 情景概率分支
- 推荐执行路径
- 风险与监控信号
- 下一步动作
- 重演版本差异说明

## 套餐与额度规则

当前系统的额度规则已经做成正式逻辑，不再是 mock。

### 基础额度

每个套餐有自己的月度基础额度：

- 免费版：10 次
- 专业版：80 次
- VIP 深度版：300 次
- 企业版：2000 次

### 额外额度

兑换“额度码”后，会给用户增加 `bonus_quota_balance`。

这部分额度：

- 独立于月度基础额度
- 不会在月初自动恢复
- 不会被月度重置清空
- 会一直保留到消费完

### 扣减顺序

推演时系统按这个顺序扣减：

1. 先扣套餐月度基础额度
2. 基础额度用完后，再扣兑换得到的额外额度

### 月度重置

每月只会重置：

- `monthly_analysis_usage`

不会重置：

- `bonus_quota_balance`

## 兑换码体系

### 支持的兑换码类型

当前支持两类兑换码：

- 套餐码
- 额度码

### 单次码规则

兑换码是“单次唯一兑换码”，每个码全局只能成功兑换一次。

不支持：

- 通用活动码
- 每人限领 N 次
- 无限复用码

### 套餐码

套餐码兑换后会：

- 切换当前用户主空间订阅到目标套餐
- 按兑换码指定的月付 / 年付创建新周期
- 自动生成一笔 `provider=redeem_code`、`amount=0`、`status=paid` 的订单
- 写入审计日志

### 额度码

额度码兑换后会：

- 增加当前用户 `bonus_quota_balance`
- 更新账户页额度概览
- 写入审计日志

### 用户兑换接口

- `POST /api/billing/redeem-code`

请求：

```json
{
  "code": "SO-AB12-CD34"
}
```

返回：

- 兑换结果
- 最新用户信息
- 最新订阅
- 可选订单
- 当前额度快照
- 兑换码记录

### 后台管理接口

- `GET /api/admin/redemption-codes`
- `POST /api/admin/redemption-codes`
- `PATCH /api/admin/redemption-codes/{id}`
- `DELETE /api/admin/redemption-codes/{id}`

后台支持：

- 生成单个兑换码
- 批量生成唯一单次码
- 停用未使用兑换码
- 删除未使用兑换码
- 查看已兑换记录

## 前端体验升级点

### 全局 Toast

成功操作统一会在右上角弹出可见 Toast，包括：

- 创建用户
- 保存用户
- 删除用户
- 保存套餐
- 生成兑换码
- 更新兑换码
- 删除兑换码
- 切换套餐
- 兑换成功
- 提交任务成功

### 阻断弹窗

当用户提交推演但条件不满足时，系统不再只显示一行错误字。

现在会统一弹出白色科技风阻断弹窗，覆盖这些场景：

- 套餐额度耗尽
- 所选模型档位不在当前套餐权限内
- 并发任务达到上限

弹窗会给出：

- 当前问题原因
- 跳转购买套餐入口
- 跳转兑换中心入口

## 后台能力

运营后台当前以“少而准”为原则，默认折叠低频区块。

### 账户管理

支持：

- 创建用户
- 编辑用户姓名 / 公司 / 角色 / 登录状态
- 编辑套餐
- 编辑月度已用额度
- 编辑额外额度余额
- 删除非创始者账号

### 套餐策略

支持：

- 月费
- 年费
- 月度额度
- 导出权限
- 高级模型开关
- 团队席位

### 兑换码中心

支持：

- 创建套餐码
- 创建额度码
- 批量生成
- 状态筛选
- 停用
- 恢复启用
- 删除未兑换码

### 其余后台模块

为了避免首页信息过载，以下模块放在折叠区：

- 任务与订单
- 最近推演
- 系统结构

## 模型配置

后端配置文件位于：

- `backend/.env`
- `backend/.env.example`

关键变量：

```env
DATABASE_URL=sqlite:///./world_inference.db
LLM_PROVIDER=deepseek
LLM_FALLBACK_TO_MOCK=false

DEEPSEEK_API_KEY=your_real_key
DEEPSEEK_CHAT_MODEL=deepseek-chat
DEEPSEEK_REASONING_MODEL=deepseek-reasoner
DEEPSEEK_BASE_URL=https://api.deepseek.com

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_REASONING_MODEL=gpt-5

APP_SECRET=replace_me
ENABLE_DEMO_AUTH=false
```

建议：

- 生产环境始终关闭 `LLM_FALLBACK_TO_MOCK`
- 没有真实 Key 时直接报错，不要静默回退
- 高成本模型只开放给高阶套餐

## 本地启动

### 1. 安装后端依赖

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 启动后端

```bash
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 3. 启动前端

创建 `frontend/.env.local`：

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

然后：

```bash
cd frontend
npm install
npm run dev
```

生产启动方式：

```bash
cd frontend
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

## 宝塔部署

仓库已经提供宝塔部署参考文件：

- `docs/baota-deployment.md`
- `deploy/baota/nginx.conf`
- `deploy/baota/frontend.pm2.config.cjs`
- `deploy/baota/backend-start.sh`

### 推荐部署结构

- Nginx
- Node.js 运行前端
- Python 运行 FastAPI
- PostgreSQL
- PM2 或 Supervisor

### 宝塔最短部署步骤

1. 在宝塔安装 `Node.js`、`Python`、`Nginx`、`PostgreSQL`
2. 拉取仓库代码
3. 配置后端 `.env`
4. 安装后端依赖 `pip install -r requirements.txt`
5. 构建前端 `npm install && npm run build`
6. 用 PM2 启动前端
7. 用脚本或 Supervisor 启动后端
8. 配置 Nginx 反代
9. 开启 HTTPS

### Nginx 反代思路

- `80/443` 对外
- `/` 转发到前端 `3000`
- `/api` 转发到后端 `8000`

## 生产建议

上线前至少完成这些：

- 切到 PostgreSQL
- 替换所有本地密钥和默认密码
- 关闭 demo 登录
- 配置正式域名和 HTTPS
- 配置日志与监控
- 做数据库备份
- 核验套餐价格与额度
- 核验模型权限和并发限制

## Git 与安全

这些内容不要提交到 GitHub：

- `backend/.env`
- `frontend/.env.local`
- 数据库文件
- 运行日志
- 本地缓存

推送前建议执行：

```bash
git status
```

## 已验证的关键链路

当前版本已经实际验证过这些场景：

- 管理员登录
- 普通用户注册
- 普通用户无法访问兑换码后台
- 后台创建额度码
- 后台创建套餐码
- 用户兑换额度码
- 用户兑换套餐码
- 已兑换码拒绝重复兑换
- 停用码拒绝兑换
- 过期码拒绝兑换
- 无效码拒绝兑换
- 月额度耗尽后继续消耗额外额度
- 月度重置不会清空额外额度
- 额度不足时返回结构化错误码
- 模型权限不足时返回结构化错误码
- 后台创建用户成功后 Toast 正常展示
- 前端生产构建通过
- 后端编译通过

## 仓库目录

```text
codexya/
├─ frontend/
├─ backend/
├─ docs/
├─ deploy/baota/
├─ runtime/
└─ docker-compose.yml
```
