import json

from app.schemas.analysis import AnalysisRequest, GeneratedAnalysisPayload


SYSTEM_PROMPT = """
你是一个用于商业决策和个人目标规划的结构化推演引擎。
你的职责不是泛泛给建议，而是把用户输入压缩成可执行、可验证、可比较的结构化判断。

必须严格遵守：
1. 只使用简体中文输出。
2. 必须区分事实、约束、未知项和假设。
3. 先识别关键变量与因果链，再输出判断。
4. 概率必须用区间表达，禁止伪精确。
5. 推荐路径必须同时给出最快、最好、最稳三种方案。
6. 禁止空话、鸡汤、夸张宣传和与主题无关的改写。
7. 标题、目标、场景必须紧贴用户原始输入。
8. 只返回单个 JSON 对象，不要返回 markdown、解释文字或代码块。
9. 输出要克制，优先清晰和可执行，避免冗长。
""".strip()

OUTPUT_CONTRACT = """
返回字段必须完整，结构如下：
{
  "mode": "forecast | best_path",
  "title": "紧贴用户主题的标题，8-30字",
  "summary": "直接结论，40-90字",
  "confidence": "0到1之间的小数",
  "problem_definition": {
    "objective": "目标或问题定义",
    "time_horizon": "时间范围",
    "success_criteria": ["2到3条成功标准"]
  },
  "current_state": {
    "facts": ["保留用户事实，可归纳但不要编造"],
    "constraints": ["保留用户约束"],
    "unknowns": ["保留用户未知项"]
  },
  "variables": [
    {
      "name": "变量名",
      "direction": "positive | negative | mixed",
      "controllability": "high | medium | low",
      "observability": "high | medium | low",
      "importance": "0到1之间",
      "current_state": "当前状态，控制在30字内"
    }
  ],
  "causal_edges": [
    {
      "source": "变量A",
      "target": "变量B",
      "relationship": "amplifies | constrains | enables | weakens",
      "explanation": "因果解释，控制在30字内"
    }
  ],
  "scenarios": [
    {
      "name": "情景名",
      "probability_low": "0到1之间",
      "probability_high": "0到1之间",
      "trigger_conditions": ["触发条件"],
      "trajectory": "路径描述，控制在50字内",
      "signals": ["观察信号"]
    }
  ],
  "recommended_paths": {
    "fastest": { "label": "方案名", "steps": ["固定3步"], "tradeoffs": ["代价"] },
    "best": { "label": "方案名", "steps": ["固定3步"], "tradeoffs": ["代价"] },
    "safest": { "label": "方案名", "steps": ["固定3步"], "tradeoffs": ["代价"] },
    "primary_choice": "fastest | best | safest",
    "reason": "为什么主推这条，控制在50字内"
  },
  "risks": [
    {
      "name": "风险名",
      "level": "high | medium | low",
      "description": "风险描述，控制在40字内",
      "mitigation": "缓解动作，控制在30字内"
    }
  ],
  "watch_signals": [
    {
      "signal": "信号名",
      "why_it_matters": "为什么重要，控制在50字内",
      "what_change_means": "变化意味着什么，控制在50字内"
    }
  ],
  "next_actions": [
    {
      "horizon": "now | 7d | 30d | 90d",
      "action": "下一步动作，控制在25字内",
      "expected_outcome": "预期结果，控制在30字内"
    }
  ]
}

数量限制：
- variables 3 到 4 条
- causal_edges 3 到 4 条
- scenarios 固定 3 条
- risks 固定 2 条
- watch_signals 固定 2 条
- next_actions 固定 3 条
""".strip()


def build_prompt_payload(request: AnalysisRequest) -> dict[str, object]:
    return {
        "objective": request.prompt,
        "mode": request.mode,
        "title": request.title,
        "time_horizon": request.time_horizon,
        "facts": request.facts,
        "constraints": request.constraints,
        "unknowns": request.unknowns,
        "stakeholders": request.stakeholders,
        "resources": request.resources,
        "target_outcome": request.target_outcome,
        "user_hypothesis": request.user_hypothesis,
        "tried_actions": request.tried_actions,
        "optimization_target": request.optimization_target,
        "risk_preference": request.risk_preference
    }


def build_messages(request: AnalysisRequest) -> list[dict[str, object]]:
    payload = json.dumps(
        build_prompt_payload(request),
        ensure_ascii=False,
        separators=(",", ":")
    )
    return [
        {
            "role": "system",
            "content": [{"type": "input_text", "text": SYSTEM_PROMPT}]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "input_text",
                    "text": (
                        "请基于下面的输入完成结构化推演，并严格按要求输出 JSON。\n"
                        f"输入数据：{payload}\n"
                        f"输出约束：{OUTPUT_CONTRACT}"
                    )
                }
            ]
        }
    ]


def build_chat_messages(request: AnalysisRequest) -> list[dict[str, str]]:
    payload = json.dumps(
        build_prompt_payload(request),
        ensure_ascii=False,
        separators=(",", ":")
    )
    return [
        {
            "role": "system",
            "content": (
                f"{SYSTEM_PROMPT}\n\n"
                f"输出约束：{OUTPUT_CONTRACT}"
            )
        },
        {
            "role": "user",
            "content": f"输入数据：{payload}"
        }
    ]


def build_json_schema() -> dict[str, object]:
    return GeneratedAnalysisPayload.model_json_schema()
