import json
import re
from datetime import datetime, timezone
from time import perf_counter
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.db_models import UserModel
from app.schemas.analysis import (
    AnalysisGeneration,
    AnalysisRecord,
    AnalysisRequest,
    GeneratedAnalysisPayload,
    TemplateRecord
)
from app.services.account_service import bootstrap_account_data, ensure_analysis_quota, mark_analysis_usage
from app.services.llm_provider import get_llm_provider
from app.services.model_profile_service import get_allowed_model_profiles
from app.services.repository import repository


TEMPLATE_SEED: list[TemplateRecord] = [
    TemplateRecord(
        id="tpl-market-entry",
        mode="forecast",
        name="新市场进入扫描",
        description="评估新市场更可能打开空间还是形成进入阻力。",
        scenario="扩张、地域、渠道策略",
        starter_prompt="未来 6 个月我们是否应该进入一个新市场？"
    ),
    TemplateRecord(
        id="tpl-launch-decision",
        mode="forecast",
        name="产品上线准备度",
        description="预测产品上线后最可能出现的反馈曲线与节奏。",
        scenario="产品发布、市场进入、品类匹配",
        starter_prompt="这次产品上线最可能会如何发展？"
    ),
    TemplateRecord(
        id="tpl-fundraise",
        mode="best_path",
        name="融资路径规划",
        description="比较不同融资路径的速度、质量与韧性。",
        scenario="种子轮、A 轮、过桥融资",
        starter_prompt="在当前环境下，融资的最佳路径是什么？"
    ),
    TemplateRecord(
        id="tpl-enterprise-sale",
        mode="best_path",
        name="关键客户成交路径",
        description="找到拿下战略型企业客户的最短可行路线。",
        scenario="企业销售、利益相关方映射、谈判",
        starter_prompt="我们该如何拿下一个战略型企业客户？"
    ),
    TemplateRecord(
        id="tpl-career-shift",
        mode="best_path",
        name="职业转型路径",
        description="把模糊的职业转型目标拆成可执行阶段。",
        scenario="岗位转换、收入增长、作品集调整",
        starter_prompt="我如何在 12 个月内转向一个新岗位？"
    )
]

_RERUN_SUFFIX_PATTERN = re.compile(r"(?:\s*[（(]重演[)）]\s*)+$")


def bootstrap_data(db: Session) -> None:
    bootstrap_account_data(db)
    repository.upsert_templates(db, TEMPLATE_SEED)
    for index, analysis in enumerate(repository.list_analyses(db)):
        owner_user_id = "demo-admin" if index % 2 == 0 else "demo-vip"
        organization_id = "org-lab" if index % 2 == 0 else "org-growth"
        repository.ensure_analysis_ownership(db, analysis.id, owner_user_id, organization_id)


def list_templates(db: Session) -> list[TemplateRecord]:
    return repository.list_templates(db)


def list_analyses(db: Session) -> list[AnalysisRecord]:
    return repository.list_analyses(db)


def list_user_analyses(db: Session, user: UserModel) -> list[AnalysisRecord]:
    return repository.list_user_analyses(db, user.id)


def get_analysis(db: Session, analysis_id: str) -> AnalysisRecord | None:
    return repository.get_analysis(db, analysis_id)


def create_analysis(
    db: Session,
    request: AnalysisRequest,
    user: UserModel | None = None,
    source_analysis: AnalysisRecord | None = None
) -> AnalysisRecord:
    organization_id: str | None = None
    if user is not None:
        ensure_analysis_quota(db, user)
        plan = repository.get_plan(db, user.plan_id)
        if plan is None:
            raise RuntimeError("当前套餐不存在，无法执行推演。")
        if request.model_profile not in get_allowed_model_profiles(plan):
            raise RuntimeError("当前套餐不支持所选模型档位，请升级后再试。")
        membership = repository.get_primary_membership(db, user.id)
        organization_id = membership.organization_id if membership is not None else None

    provider = get_llm_provider()

    started_at = perf_counter()
    generated = provider.generate(request)
    elapsed_ms = int((perf_counter() - started_at) * 1000)
    generated = _stabilize_generated_payload(request, generated)

    record = _wrap_generated_payload(
        generated,
        provider_name=provider.provider_name,
        model_name=provider.model_name,
        model_profile=request.model_profile,
        source_analysis=source_analysis,
        elapsed_ms=elapsed_ms
    )
    saved = repository.save_analysis(
        db,
        record,
        request,
        owner_user_id=user.id if user is not None and organization_id is not None else None,
        organization_id=organization_id
    )

    if user is not None:
        mark_analysis_usage(db, user)

    return saved


def rerun_analysis(
    db: Session,
    analysis_id: str,
    user: UserModel | None = None
) -> AnalysisRecord | None:
    source_analysis = repository.get_analysis(db, analysis_id)
    request = repository.get_analysis_request(db, analysis_id)
    if request is None or source_analysis is None:
        return None

    rerun_request = request.model_copy(deep=True)
    if rerun_request.title:
        rerun_request.title = _sanitize_analysis_title(rerun_request.title)

    return create_analysis(db, rerun_request, user, source_analysis=source_analysis)


def _wrap_generated_payload(
    generated: GeneratedAnalysisPayload,
    provider_name: str,
    model_name: str,
    model_profile: str,
    source_analysis: AnalysisRecord | None = None,
    elapsed_ms: int | None = None
) -> AnalysisRecord:
    payload = generated.model_dump()
    payload["title"] = _sanitize_analysis_title(payload["title"])
    record = AnalysisRecord(
        id=f"analysis-{uuid4().hex[:10]}",
        status="ready",
        updated_at=datetime.now(timezone.utc),
        **payload
    )
    record.generation = _build_generation(
        analysis=record,
        provider_name=provider_name,
        model_name=model_name,
        model_profile=model_profile,
        source_analysis=source_analysis,
        elapsed_ms=elapsed_ms
    )
    return record


def _stabilize_generated_payload(
    request: AnalysisRequest,
    generated: GeneratedAnalysisPayload
) -> GeneratedAnalysisPayload:
    generated.mode = request.mode
    if request.title.strip():
        generated.title = _sanitize_analysis_title(request.title)
    generated.problem_definition.objective = request.prompt
    generated.problem_definition.time_horizon = request.time_horizon
    if request.facts:
        generated.current_state.facts = request.facts
    if request.constraints:
        generated.current_state.constraints = request.constraints
    if request.unknowns:
        generated.current_state.unknowns = request.unknowns
    return generated


def _build_generation(
    analysis: AnalysisRecord,
    provider_name: str,
    model_name: str,
    model_profile: str,
    source_analysis: AnalysisRecord | None = None,
    elapsed_ms: int | None = None
) -> AnalysisGeneration:
    if source_analysis is None:
        return AnalysisGeneration(
            generation_mode="initial",
            provider=provider_name,
            model=model_name,
            model_profile=model_profile,
            elapsed_ms=elapsed_ms,
            change_summary="这是首次生成的结果版本。",
            changed=True
        )

    changed_sections = _detect_changed_sections(source_analysis, analysis)
    confidence_delta = round(analysis.confidence - source_analysis.confidence, 4)
    primary_choice_changed = (
        analysis.recommended_paths.primary_choice
        != source_analysis.recommended_paths.primary_choice
    )
    changed = bool(changed_sections) or primary_choice_changed or abs(confidence_delta) >= 0.01

    return AnalysisGeneration(
        generation_mode="rerun",
        provider=provider_name,
        model=model_name,
        model_profile=model_profile,
        elapsed_ms=elapsed_ms,
        source_analysis_id=source_analysis.id,
        source_title=_sanitize_analysis_title(source_analysis.title),
        source_updated_at=source_analysis.updated_at,
        rerun_sequence=source_analysis.generation.rerun_sequence + 1,
        changed=changed,
        change_summary=_build_rerun_change_summary(
            source_analysis,
            analysis,
            changed_sections,
            confidence_delta,
            primary_choice_changed
        ),
        changed_sections=changed_sections,
        confidence_delta=confidence_delta,
        previous_confidence=source_analysis.confidence,
        primary_choice_changed=primary_choice_changed,
        previous_primary_choice=source_analysis.recommended_paths.primary_choice
    )


def _detect_changed_sections(
    source_analysis: AnalysisRecord,
    analysis: AnalysisRecord
) -> list[str]:
    comparisons = [
        ("摘要", source_analysis.summary, analysis.summary),
        (
            "问题定义",
            source_analysis.problem_definition.model_dump(mode="json"),
            analysis.problem_definition.model_dump(mode="json")
        ),
        (
            "当前状态",
            source_analysis.current_state.model_dump(mode="json"),
            analysis.current_state.model_dump(mode="json")
        ),
        (
            "关键变量",
            [item.model_dump(mode="json") for item in source_analysis.variables],
            [item.model_dump(mode="json") for item in analysis.variables]
        ),
        (
            "因果关系",
            [item.model_dump(mode="json") for item in source_analysis.causal_edges],
            [item.model_dump(mode="json") for item in analysis.causal_edges]
        ),
        (
            "情景路径",
            [item.model_dump(mode="json") for item in source_analysis.scenarios],
            [item.model_dump(mode="json") for item in analysis.scenarios]
        ),
        (
            "推荐方案",
            source_analysis.recommended_paths.model_dump(mode="json"),
            analysis.recommended_paths.model_dump(mode="json")
        ),
        (
            "风险与观察信号",
            {
                "risks": [item.model_dump(mode="json") for item in source_analysis.risks],
                "watch_signals": [
                    item.model_dump(mode="json") for item in source_analysis.watch_signals
                ]
            },
            {
                "risks": [item.model_dump(mode="json") for item in analysis.risks],
                "watch_signals": [
                    item.model_dump(mode="json") for item in analysis.watch_signals
                ]
            }
        ),
        (
            "下一步动作",
            [item.model_dump(mode="json") for item in source_analysis.next_actions],
            [item.model_dump(mode="json") for item in analysis.next_actions]
        )
    ]
    return [
        label
        for label, previous_value, current_value in comparisons
        if _serialize_for_compare(previous_value) != _serialize_for_compare(current_value)
    ]


def _build_rerun_change_summary(
    source_analysis: AnalysisRecord,
    analysis: AnalysisRecord,
    changed_sections: list[str],
    confidence_delta: float,
    primary_choice_changed: bool
) -> str:
    current_choice = _get_optimization_label(analysis.recommended_paths.primary_choice)
    previous_choice = _get_optimization_label(source_analysis.recommended_paths.primary_choice)

    if not changed_sections and not primary_choice_changed and abs(confidence_delta) < 0.01:
        return (
            "这次重演沿用了同一组输入，整体结论与上一版基本一致。"
            "如果希望下方方案明显变化，请先调整事实、约束、未知项或目标。"
        )

    if changed_sections:
        if len(changed_sections) <= 3:
            section_text = "、".join(changed_sections)
        else:
            section_text = f"{'、'.join(changed_sections[:3])} 等 {len(changed_sections)} 个部分"
        prefix = f"本次重演更新了{section_text}"
    else:
        prefix = "本次重演刷新了当前结果"

    if primary_choice_changed:
        choice_text = f"，主推荐从 {previous_choice} 切换为 {current_choice}"
    else:
        choice_text = f"，主推荐仍为 {current_choice}"

    if abs(confidence_delta) >= 0.01:
        direction = "上升" if confidence_delta > 0 else "下降"
        confidence_text = f"，置信度{direction} {abs(confidence_delta) * 100:.0f}%"
    else:
        confidence_text = ""

    return f"{prefix}{choice_text}{confidence_text}。"


def _serialize_for_compare(value: object) -> str:
    if isinstance(value, str):
        return " ".join(value.split())
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def _sanitize_analysis_title(title: str) -> str:
    cleaned = _RERUN_SUFFIX_PATTERN.sub("", title).strip()
    return cleaned or title.strip()


def _get_optimization_label(target: str) -> str:
    labels = {
        "fastest": "最快",
        "best": "最好",
        "safest": "最稳"
    }
    return labels.get(target, target)
