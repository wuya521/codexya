from app.schemas.analysis import (
    AnalysisRequest,
    CausalEdge,
    CurrentState,
    GeneratedAnalysisPayload,
    NextAction,
    PathPlan,
    ProblemDefinition,
    RecommendedPaths,
    RiskItem,
    ScenarioItem,
    VariableItem,
    WatchSignal
)


def build_mock_generated_payload(request: AnalysisRequest) -> GeneratedAnalysisPayload:
    is_forecast = request.mode == "forecast"
    title = request.title.strip() or request.prompt.strip() or "未命名推演"
    time_horizon = request.time_horizon.strip() or "未来 90 天"
    facts = request.facts or ["用户尚未提供明确事实。"]
    constraints = request.constraints or ["用户尚未列出硬约束。"]
    unknowns = request.unknowns or ["仍存在待澄清的信息缺口。"]

    primary_variable = request.stakeholders[0] if request.stakeholders else "关键相关方一致性"
    secondary_variable = request.resources[0] if request.resources else "执行资源集中度"

    summary = (
        "基础情景是可推进但不均匀，结果主要取决于关键相关方是否能尽快达成一致。"
        if is_forecast
        else "当前最优解是分阶段推进，在保持势能的同时控制质量与波动风险。"
    )

    return GeneratedAnalysisPayload(
        mode=request.mode,
        title=title,
        summary=summary,
        confidence=0.68 if is_forecast else 0.74,
        problem_definition=ProblemDefinition(
            objective=request.prompt or request.target_outcome or title,
            time_horizon=time_horizon,
            success_criteria=[
                request.target_outcome or "达到目标状态",
                "验证主导变量是否真正成立",
                "降低当前最大不确定性"
            ]
        ),
        current_state=CurrentState(
            facts=facts,
            constraints=constraints,
            unknowns=unknowns
        ),
        variables=[
            VariableItem(
                name=primary_variable,
                direction="positive",
                controllability="medium",
                observability="medium",
                importance=0.88,
                current_state="当前尚未彻底解决，但对结果影响很大"
            ),
            VariableItem(
                name=secondary_variable,
                direction="positive",
                controllability="high",
                observability="high",
                importance=0.79,
                current_state="如果集中投入到一条路径上，可立即发挥作用"
            ),
            VariableItem(
                name="时间压力",
                direction="mixed",
                controllability="low",
                observability="high",
                importance=0.71,
                current_state="已经存在，并正在影响动作排序"
            )
        ],
        causal_edges=[
            CausalEdge(
                source=primary_variable,
                target="决策推进速度",
                relationship="enables",
                explanation="当主导相关方达成一致后，下游决策会明显提速。"
            ),
            CausalEdge(
                source=secondary_variable,
                target="执行质量",
                relationship="amplifies",
                explanation="资源越集中，越容易打出一个干净的首胜样本。"
            ),
            CausalEdge(
                source="时间压力",
                target="风险暴露",
                relationship="constrains",
                explanation="时间越紧，试错空间越小，错误动作的代价越高。"
            )
        ],
        scenarios=[
            ScenarioItem(
                name="基础情景",
                probability_low=0.42,
                probability_high=0.56,
                trigger_conditions=[
                    "主导变量只被部分解决",
                    "执行焦点保持收敛"
                ],
                trajectory="事情会继续推进，但结果到达速度慢于理想计划。",
                signals=[
                    "决策周期略有缩短",
                    "异议从战略层转向执行层"
                ]
            ),
            ScenarioItem(
                name="下行情景",
                probability_low=0.2,
                probability_high=0.3,
                trigger_conditions=[
                    "约束条件进一步收紧",
                    "未知项在下次复盘前仍未澄清"
                ],
                trajectory="整体势能下降，团队需要重新调整预期或范围。",
                signals=[
                    "重复返工增加",
                    "最高杠杆依赖始终没有进展"
                ]
            ),
            ScenarioItem(
                name="上行情景",
                probability_low=0.14,
                probability_high=0.22,
                trigger_conditions=[
                    "主导变量提前转好",
                    "资源被集中在单一路线"
                ],
                trajectory="一次干净的早期突破会显著压缩整体路径，并提升后续信心。",
                signals=[
                    "相关方反馈质量提升",
                    "价值验证早于预期出现"
                ]
            )
        ],
        recommended_paths=RecommendedPaths(
            fastest=PathPlan(
                label="缩小范围，强行打出一个决定性动作",
                steps=[
                    "把范围收缩到当前杠杆最高的一件事",
                    "指定一个 owner 去打通主依赖",
                    "在 7 天内复核结果"
                ],
                tradeoffs=["集中风险更高", "可选项会减少"]
            ),
            best=PathPlan(
                label="兼顾速度与验证质量",
                steps=[
                    "先解决主导变量",
                    "把资源投入到一个闭环执行单元",
                    "把首个正信号转化成可重复打法"
                ],
                tradeoffs=["速度中等", "后续可靠性更高"]
            ),
            safest=PathPlan(
                label="先验证，再放大",
                steps=[
                    "先跑一个受控验证阶段",
                    "重点测量最高风险假设",
                    "只有信号转正后再扩大投入"
                ],
                tradeoffs=["速度最慢", "可避免下行损失最低"]
            ),
            primary_choice=request.optimization_target,
            reason="主推荐路径直接跟随输入中的优化目标，并围绕当前约束做了匹配。"
        ),
        risks=[
            RiskItem(
                name="虚假进展",
                level="high",
                description="活动量可能变多，但并没有真正改善主导变量。",
                mitigation="只用一个和核心瓶颈直接相关的领先指标来审视进展。"
            ),
            RiskItem(
                name="资源过度摊薄",
                level="medium",
                description="并行动作太多会降低主路径的执行质量。",
                mitigation="在第一个有效信号出现前，暂停非关键动作。"
            )
        ],
        watch_signals=[
            WatchSignal(
                signal="决策响应时间",
                why_it_matters="它能反映整个系统是在变得更容易推动，还是更难推动。",
                what_change_means="如果周期缩短，基础情景或上行情景的概率会上升。"
            ),
            WatchSignal(
                signal="异议质量",
                why_it_matters="高质量异议通常意味着对方更接近真实承诺。",
                what_change_means="如果异议开始变具体、变执行化，说明路径在改善。"
            )
        ],
        next_actions=[
            NextAction(
                horizon="now",
                action="定义当下真正主导结果的那个变量。",
                expected_outcome="让决策模型更干净，减少噪音。"
            ),
            NextAction(
                horizon="7d",
                action="跑一个能推动主导变量变化的聚焦测试。",
                expected_outcome="验证当前路径是否真正可行。"
            ),
            NextAction(
                horizon="30d",
                action="结合新信号重新推演并调整概率判断。",
                expected_outcome="进一步收窄未知项，提升路径选择精度。"
            )
        ]
    )
