# 第一性原理世界推演与最佳路径系统
## 可直接交给 Cursor / Codex 的完整开发 Prompt v1

你现在是一名资深全栈工程师与产品实现代理。请基于以下规格，直接生成一个可运行的首版 Web 产品。不要输出泛泛解释，不要替换技术栈，不要省略关键目录、页面或接口。

## 1. 产品目标

构建一个结构化决策系统，帮助用户对现实中的事件、决策和目标进行推演，并输出两类结果：

1. 一件事未来最可能的走向
2. 在当前条件下做成一件事的最优路径

系统核心原则：

- 基于第一性原理
- 显式识别关键变量
- 建立因果关系
- 进行概率化分支推演
- 支持重演、回归、模拟
- 输出最快、最好、最稳的行动建议

## 2. 产品定位

这不是聊天机器人，也不是泛化问答工具，而是一个可视化的推演与决策工作台。

输出必须具备：

- 结构化
- 可复盘
- 可编辑
- 可继续推演
- 可保存为历史版本

## 3. 技术栈

严格使用以下技术栈：

- 前端：Next.js 14+、TypeScript、Tailwind CSS、shadcn/ui 风格
- 状态管理：Zustand
- 图形渲染：React Flow 用于因果图，ECharts 用于概率与信号图
- 后端：FastAPI、Pydantic
- 数据库：PostgreSQL
- API 风格：REST
- 结构化输出：固定 JSON Schema

如果首版某些可视化先用占位实现，也必须保留组件接口和数据结构。

## 4. 项目目录要求

```text
frontend/
  app/
  components/
  lib/
  store/
  types/
  public/
backend/
  app/
    api/
    core/
    models/
    schemas/
    services/
docs/
README.md
```

## 5. 页面要求

必须实现以下页面：

1. 首页 `/`
2. 走向预测页 `/forecast`
3. 最佳路径页 `/pathfinder`
4. 结果详情页 `/analysis/[id]`
5. 历史记录页 `/history`
6. 模板页 `/templates`
7. 设置页 `/settings`

## 6. 首页要求

首页必须包含：

- 顶部导航
- Hero 区域
- 中心问题输入区
- 两个模式入口卡片：走向预测、最佳路径
- 模板推荐区
- 最近记录区
- 示例问题区

首页风格要求：

- 不是聊天界面
- 要有“决策操作系统”的专业感
- 更像 dashboard / workspace

## 7. 两大核心模式

### 模式一：走向预测

用于回答“这件事未来最可能怎么发展”。

输入项：

- 问题描述
- 预测对象
- 时间范围
- 当前事实
- 假设条件
- 利益相关方
- 外部约束
- 用户当前判断

输出项：

- 问题定义
- 当前状态
- 关键变量
- 因果关系
- 3 到 5 条概率路径
- 最可能走向
- 风险点
- 观察信号
- 可影响的杠杆点
- 下一步建议

### 模式二：最佳路径

用于回答“在当前条件下，怎样最优地做成这件事”。

输入项：

- 目标
- 截止时间
- 当前状态
- 可用资源
- 核心约束
- 风险偏好
- 优化目标：最快 / 最好 / 最稳
- 已尝试方案

输出项：

- 成功标准
- 差距分析
- 关键瓶颈
- 多条可行路径
- 主推荐路径
- 备选路径
- 7 天 / 30 天 / 90 天动作
- 风险与止损条件
- 关键观察信号

## 8. 结果页结构

结果页必须是模块化布局，不能只输出一大段长文本。

至少包括：

- 顶部摘要卡：一句话结论、模式、更新时间、置信度
- 问题定义区
- 当前状态区
- 关键变量表
- 因果图区域
- 概率路径区域
- 推荐行动区域
- 风险点区域
- 观察信号区域
- 下一步动作区域
- 重演入口

## 9. 历史记录页要求

必须支持：

- 按模式筛选
- 搜索标题
- 显示最近更新时间
- 查看状态标签
- 跳转详情

## 10. 模板页要求

模板页至少包含以下模板卡片：

- 新市场进入评估
- 新产品上线判断
- 融资路径规划
- 关键客户成交路径
- 职业转型路径

模板卡片包含：

- 模板名
- 模板说明
- 适用场景
- 一键使用按钮

## 11. 设置页要求

设置页至少包含：

- 模型偏好
- 输出偏好
- 风险提示级别
- 数据保留设置
- 团队功能占位

## 12. 后端 API 要求

至少实现以下接口：

- `GET /health`
- `GET /api/templates`
- `GET /api/analyses`
- `GET /api/analyses/{id}`
- `POST /api/analyses`
- `POST /api/analyses/{id}/rerun`

其中 `POST /api/analyses` 接收结构化输入，返回结构化分析结果。

## 13. 数据结构要求

分析结果必须是结构化 JSON，而不是自由文本。核心字段如下：

```json
{
  "id": "string",
  "mode": "forecast | best_path",
  "title": "string",
  "summary": "string",
  "confidence": 0.72,
  "problem_definition": {
    "objective": "string",
    "time_horizon": "string",
    "success_criteria": ["string"]
  },
  "current_state": {
    "facts": ["string"],
    "constraints": ["string"],
    "unknowns": ["string"]
  },
  "variables": [
    {
      "name": "string",
      "direction": "positive | negative | mixed",
      "controllability": "high | medium | low",
      "observability": "high | medium | low",
      "importance": 0.8,
      "current_state": "string"
    }
  ],
  "causal_edges": [
    {
      "source": "string",
      "target": "string",
      "relationship": "amplifies | constrains | enables | weakens",
      "explanation": "string"
    }
  ],
  "scenarios": [
    {
      "name": "string",
      "probability_low": 0.35,
      "probability_high": 0.5,
      "trigger_conditions": ["string"],
      "trajectory": "string",
      "signals": ["string"]
    }
  ],
  "recommended_paths": {
    "fastest": {
      "label": "string",
      "steps": ["string"],
      "tradeoffs": ["string"]
    },
    "best": {
      "label": "string",
      "steps": ["string"],
      "tradeoffs": ["string"]
    },
    "safest": {
      "label": "string",
      "steps": ["string"],
      "tradeoffs": ["string"]
    },
    "primary_choice": "fastest | best | safest",
    "reason": "string"
  },
  "risks": [
    {
      "name": "string",
      "level": "high | medium | low",
      "description": "string",
      "mitigation": "string"
    }
  ],
  "watch_signals": [
    {
      "signal": "string",
      "why_it_matters": "string",
      "what_change_means": "string"
    }
  ],
  "next_actions": [
    {
      "horizon": "now | 7d | 30d | 90d",
      "action": "string",
      "expected_outcome": "string"
    }
  ]
}
```

## 14. LLM 调用要求

先用 Mock 服务实现，但代码结构必须支持后续接入真实 LLM。

要求：

- 将 Prompt 构造封装到 service 层
- 将返回结果校验封装到 schema 层
- 提供示例 mock 分析数据
- 保留模型 provider 适配接口

## 15. 交互要求

所有关键页面都要有：

- 空状态
- 加载状态
- 错误状态
- 示例内容

输入不能只是一个大 textarea，必须有结构化表单和标签输入体验。

## 16. UI 风格要求

风格关键词：

- 战略工作台
- 专业理性
- 高密度但不压抑
- 冷静、清晰、可视化

避免：

- 聊天气泡
- 紫色泛 AI 风格
- 过度拟物
- 花哨动画

建议方向：

- 米白 + 深蓝灰 + 暗红/橙作为风险提示色
- 使用卡片、分栏、吸附侧栏
- 强调信息层级与结构感

## 17. 输出质量要求

所有生成内容必须满足：

- 不空话
- 不鸡汤
- 不玄学
- 不使用无法验证的表述
- 概率必须使用区间表达
- 建议必须具有行动性

## 18. 首版完成标准

首版至少满足：

1. 前端可浏览全部页面
2. 两大模式都可提交表单
3. 后端可返回结构化 mock 结果
4. 结果页能正确渲染关键模块
5. 历史记录和模板页可用 mock 数据展示
6. 项目具备清晰目录和 README

## 19. 编码要求

- 使用清晰的组件拆分
- 类型定义完整
- 避免把大对象硬编码在页面组件里
- 结果渲染使用可复用模块组件
- API 调用统一封装
- 后端 schema、service、api 分层清晰

## 20. 现在开始执行

请直接创建：

1. 前后端工程目录
2. 关键页面
3. API 骨架
4. Mock 数据
5. README

如果某些依赖未安装，仍然先生成完整代码骨架与说明，不要因为环境不完整而停止。
