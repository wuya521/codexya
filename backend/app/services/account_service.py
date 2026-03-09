from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.db_models import (
    AuditLogModel,
    BillingOrderModel,
    OrganizationMemberModel,
    OrganizationModel,
    SubscriptionModel,
    UserModel
)
from app.schemas.account import (
    AccountOverviewRecord,
    AdminOrganizationRecord,
    AdminOverviewRecord,
    AdminUserRecord,
    AuditLogRecord,
    BillingCycle,
    BillingOrderRecord,
    CreateMemberRequest,
    CurrentUserRecord,
    OrganizationMemberRecord,
    OrganizationRecord,
    PlanDistributionItem,
    PlanRecord,
    RecentAnalysisItem,
    SubscriptionRecord
)
from app.schemas.analysis import AnalysisRecord
from app.services.auth_service import bootstrap_auth_data, create_password_hash
from app.services.model_profile_service import get_allowed_model_profiles, get_max_concurrent_jobs
from app.services.repository import repository


PLAN_SEED: list[PlanRecord] = [
    PlanRecord(
        id="plan-free",
        name="免费版",
        tier="free",
        description="适合个人试用和低频推演。",
        monthly_price=0,
        yearly_price=0,
        monthly_analysis_quota=10,
        export_enabled=False,
        advanced_models=False,
        team_seats=1,
        highlight="先验证是否有真实需求",
        features=[
            "每月 10 次推演",
            "基础模板库",
            "结构化结果查看"
        ]
    ),
    PlanRecord(
        id="plan-pro",
        name="专业版",
        tier="pro",
        description="适合高频个人用户和自由职业顾问。",
        monthly_price=99,
        yearly_price=999,
        monthly_analysis_quota=80,
        export_enabled=True,
        advanced_models=False,
        team_seats=1,
        highlight="最适合个人付费转化",
        features=[
            "每月 80 次推演",
            "结果导出 PDF / 链接",
            "高级模板组合"
        ]
    ),
    PlanRecord(
        id="plan-vip",
        name="VIP 深度版",
        tier="vip",
        description="适合创业者、业务负责人和高价值决策场景。",
        monthly_price=299,
        yearly_price=2999,
        monthly_analysis_quota=300,
        export_enabled=True,
        advanced_models=True,
        team_seats=3,
        highlight="核心盈利档位",
        features=[
            "每月 300 次推演",
            "高级模型与深度推演",
            "多版本对比与重演"
        ]
    ),
    PlanRecord(
        id="plan-enterprise",
        name="企业版",
        tier="enterprise",
        description="适合团队协同、模板沉淀和后台管理。",
        monthly_price=1999,
        yearly_price=19999,
        monthly_analysis_quota=2000,
        export_enabled=True,
        advanced_models=True,
        team_seats=20,
        highlight="面向 B 端签约",
        features=[
            "每月 2000 次推演",
            "后台管理与成员席位",
            "企业交付与运营支持"
        ]
    )
]


def bootstrap_account_data(db: Session) -> None:
    repository.upsert_plans(db, PLAN_SEED)
    now = datetime.now(timezone.utc)
    repository.upsert_users(
        db,
        [
            UserModel(
                id="demo-admin",
                name="Super OS 创始者",
                email="founder@inference.local",
                company="Super OS 超级OS",
                role="admin",
                plan_id="plan-enterprise",
                monthly_analysis_usage=12,
                last_usage_reset_at=now,
                last_active_at=now
            )
        ]
    )
    _prune_legacy_demo_accounts(db)
    bootstrap_auth_data(db)
    _bootstrap_organizations(db, now)
    _bootstrap_subscriptions_and_orders(db, now)
    _bootstrap_audit_logs(db, now)


def list_plans(db: Session) -> list[PlanRecord]:
    return [_serialize_plan(plan.id, db) for plan in repository.list_plans(db)]


def get_current_user(db: Session, user_id: str | None = None) -> CurrentUserRecord:
    user = get_user_model(db, user_id)
    return serialize_user(db, user)


def get_user_model(db: Session, user_id: str | None = None) -> UserModel:
    if not user_id:
        raise ValueError("当前用户不存在")
    user = repository.get_user(db, user_id)
    if user is None:
        raise ValueError("当前用户不存在")
    return _reset_usage_if_needed(db, user)


def serialize_user(db: Session, user: UserModel) -> CurrentUserRecord:
    plan = _serialize_plan(user.plan_id, db)
    membership = repository.get_primary_membership(db, user.id)
    organization = (
        _serialize_organization(repository.get_organization(db, membership.organization_id))
        if membership is not None
        else None
    )
    subscription = (
        _serialize_subscription(repository.get_active_subscription(db, membership.organization_id), db)
        if membership is not None
        else None
    )
    remaining = max(plan.monthly_analysis_quota - user.monthly_analysis_usage, 0)
    auth_account = repository.get_auth_account_by_user_id(db, user.id)
    return CurrentUserRecord(
        id=user.id,
        name=user.name,
        email=user.email,
        company=user.company,
        role=user.role,
        auth_status=auth_account.status if auth_account is not None else "active",
        plan=plan,
        monthly_usage=user.monthly_analysis_usage,
        monthly_limit=plan.monthly_analysis_quota,
        remaining_quota=remaining,
        can_access_admin=user.role == "admin",
        active_job_count=repository.count_analysis_jobs(
            db,
            user_id=user.id,
            statuses={"queued", "running"}
        ),
        organization=organization,
        organization_role=membership.role if membership is not None else None,
        active_subscription=subscription
    )


def get_account_overview(db: Session, user: UserModel) -> AccountOverviewRecord:
    from app.services.analysis_job_service import list_user_analysis_jobs

    current_user = serialize_user(db, user)
    organization_id = current_user.organization.id if current_user.organization is not None else None
    members = list_organization_members(db, organization_id) if organization_id else []
    recent_orders = list_recent_orders(db, organization_id) if organization_id else []
    recent_audits = list_recent_audits(db, organization_id) if organization_id else []
    recent_analyses = repository.list_user_analyses(db, user.id, limit=6)
    return AccountOverviewRecord(
        user=current_user,
        available_plans=list_plans(db),
        organization=current_user.organization,
        members=members,
        active_subscription=current_user.active_subscription,
        recent_orders=recent_orders,
        recent_audits=recent_audits,
        recent_analyses=recent_analyses,
        recent_jobs=list_user_analysis_jobs(db, user, limit=8)
    )


def list_organization_members(
    db: Session,
    organization_id: str | None
) -> list[OrganizationMemberRecord]:
    if organization_id is None:
        return []
    rows = repository.list_organization_members(db, organization_id)
    results: list[OrganizationMemberRecord] = []
    for row in rows:
        user = repository.get_user(db, row.user_id)
        if user is None:
            continue
        results.append(
            OrganizationMemberRecord(
                id=row.id,
                user_id=user.id,
                name=user.name,
                email=user.email,
                company=user.company,
                platform_role=user.role,
                organization_role=row.role,
                joined_at=row.created_at
            )
        )
    return results


def create_organization_member(
    db: Session,
    actor: UserModel,
    payload: CreateMemberRequest
) -> OrganizationMemberRecord:
    membership = repository.get_primary_membership(db, actor.id)
    if membership is None:
        raise ValueError("当前用户没有可用组织")
    if membership.role not in {"owner", "admin"}:
        raise ValueError("当前用户没有成员管理权限")

    organization = repository.get_organization(db, membership.organization_id)
    if organization is None:
        raise ValueError("当前组织不存在")

    existing_user = repository.get_user_by_email(db, payload.email)
    if existing_user is None:
        existing_user = repository.create_user(
            db,
            UserModel(
                id=f"user-{uuid4().hex[:10]}",
                name=payload.name,
                email=payload.email.lower(),
                company=payload.company,
                role="user",
                plan_id="plan-free",
                monthly_analysis_usage=0,
                last_usage_reset_at=datetime.now(timezone.utc),
                last_active_at=datetime.now(timezone.utc)
            )
        )
        password_hash, salt = create_password_hash(payload.password)
        from app.models.db_models import AuthAccountModel

        repository.create_auth_account(
            db,
            AuthAccountModel(
                user_id=existing_user.id,
                email=existing_user.email,
                password_hash=password_hash,
                password_salt=salt,
                auth_mode="password",
                status="active"
            )
        )

    if repository.get_membership(db, organization.id, existing_user.id) is not None:
        raise ValueError("该成员已经在当前组织中")

    created = repository.create_organization_member(
        db,
        OrganizationMemberModel(
            id=f"member-{uuid4().hex[:10]}",
            organization_id=organization.id,
            user_id=existing_user.id,
            role=payload.role
        )
    )
    repository.create_audit_log(
        db,
        AuditLogModel(
            id=f"audit-{uuid4().hex[:10]}",
            actor_user_id=actor.id,
            organization_id=organization.id,
            action="organization.member_added",
            entity_type="organization_member",
            entity_id=created.id,
            summary=f"{actor.name} 将 {existing_user.name} 加入组织 {organization.name}",
            metadata_payload={"member_email": existing_user.email, "role": payload.role}
        )
    )
    return OrganizationMemberRecord(
        id=created.id,
        user_id=existing_user.id,
        name=existing_user.name,
        email=existing_user.email,
        company=existing_user.company,
        platform_role=existing_user.role,
        organization_role=created.role,
        joined_at=created.created_at
    )


def get_active_subscription(db: Session, user: UserModel) -> SubscriptionRecord | None:
    membership = repository.get_primary_membership(db, user.id)
    if membership is None:
        return None
    return _serialize_subscription(
        repository.get_active_subscription(db, membership.organization_id),
        db
    )


def list_recent_orders(
    db: Session,
    organization_id: str | None,
    limit: int = 8
) -> list[BillingOrderRecord]:
    if organization_id is None:
        return []
    return [
        _serialize_order(order, db)
        for order in repository.list_orders_by_organization(db, organization_id, limit=limit)
    ]


def list_recent_audits(
    db: Session,
    organization_id: str | None,
    limit: int = 12
) -> list[AuditLogRecord]:
    records: list[AuditLogRecord] = []
    for row in repository.list_audit_logs(db, organization_id=organization_id, limit=limit):
        actor = repository.get_user(db, row.actor_user_id)
        records.append(
            AuditLogRecord(
                id=row.id,
                actor_user_id=row.actor_user_id,
                actor_name=actor.name if actor is not None else row.actor_user_id,
                organization_id=row.organization_id,
                action=row.action,
                entity_type=row.entity_type,
                entity_id=row.entity_id,
                summary=row.summary,
                created_at=row.created_at
            )
        )
    return records


def switch_plan(
    db: Session,
    user: UserModel,
    plan_id: str,
    billing_cycle: BillingCycle = "monthly"
) -> tuple[CurrentUserRecord, SubscriptionRecord, BillingOrderRecord]:
    plan = repository.get_plan(db, plan_id)
    if plan is None:
        raise ValueError("目标套餐不存在")

    membership = repository.get_primary_membership(db, user.id)
    if membership is None:
        raise ValueError("当前用户没有可用组织")

    organization = repository.get_organization(db, membership.organization_id)
    if organization is None:
        raise ValueError("当前组织不存在")

    amount = plan.yearly_price if billing_cycle == "yearly" else plan.monthly_price
    now = datetime.now(timezone.utc)

    repository.update_user_plan(db, user, plan_id)
    order = repository.create_order(
        db,
        BillingOrderModel(
            id=f"order-{uuid4().hex[:10]}",
            organization_id=organization.id,
            user_id=user.id,
            plan_id=plan_id,
            billing_cycle=billing_cycle,
            amount=amount,
            currency="CNY",
            status="paid",
            provider="manual",
            provider_reference=f"manual-{uuid4().hex[:8]}",
            metadata_payload={"initiator": user.email, "plan_name": plan.name},
            paid_at=now
        )
    )
    subscription = repository.create_or_replace_subscription(
        db,
        SubscriptionModel(
            id=f"subscription-{organization.id}",
            organization_id=organization.id,
            plan_id=plan_id,
            billing_cycle=billing_cycle,
            status="active",
            amount=amount,
            currency="CNY",
            provider="manual",
            cancel_at_period_end=False,
            current_period_start=now,
            current_period_end=now + timedelta(days=365 if billing_cycle == "yearly" else 30)
        )
    )
    repository.create_audit_log(
        db,
        AuditLogModel(
            id=f"audit-{uuid4().hex[:10]}",
            actor_user_id=user.id,
            organization_id=organization.id,
            action="billing.plan_switched",
            entity_type="subscription",
            entity_id=subscription.id,
            summary=f"{user.name} 将组织 {organization.name} 切换到 {plan.name}",
            metadata_payload={"plan_id": plan_id, "billing_cycle": billing_cycle}
        )
    )
    refreshed_user = repository.get_user(db, user.id)
    if refreshed_user is None:
        raise ValueError("用户不存在")

    return (
        serialize_user(db, refreshed_user),
        _serialize_subscription(subscription, db),
        _serialize_order(order, db)
    )


def ensure_analysis_quota(db: Session, user: UserModel) -> None:
    user = _reset_usage_if_needed(db, user)
    plan = repository.get_plan(db, user.plan_id)
    if plan is None:
        raise ValueError("用户套餐不存在")

    if user.monthly_analysis_usage >= plan.monthly_analysis_quota:
        raise RuntimeError(f"当前套餐本月额度已用尽，请升级到更高版本。当前套餐：{plan.name}")


def mark_analysis_usage(db: Session, user: UserModel) -> CurrentUserRecord:
    updated = repository.increment_user_usage(db, user)
    return serialize_user(db, updated)


def list_admin_users(db: Session) -> list[AdminUserRecord]:
    rows: list[AdminUserRecord] = []
    for user in repository.list_users(db):
        user = _reset_usage_if_needed(db, user)
        plan = repository.get_plan(db, user.plan_id)
        membership = repository.get_primary_membership(db, user.id)
        organization = (
            repository.get_organization(db, membership.organization_id)
            if membership is not None
            else None
        )
        if plan is None:
            continue
        auth_account = repository.get_auth_account_by_user_id(db, user.id)
        rows.append(
            AdminUserRecord(
                id=user.id,
                name=user.name,
                email=user.email,
                company=user.company,
                role=user.role,
                auth_status=auth_account.status if auth_account is not None else "active",
                organization_id=organization.id if organization is not None else None,
                organization_name=organization.name if organization is not None else "未归属组织",
                organization_role=membership.role if membership is not None else None,
                plan_id=plan.id,
                plan_name=plan.name,
                monthly_usage=user.monthly_analysis_usage,
                monthly_limit=plan.monthly_analysis_quota,
                remaining_quota=max(plan.monthly_analysis_quota - user.monthly_analysis_usage, 0),
                active_job_count=repository.count_analysis_jobs(
                    db,
                    user_id=user.id,
                    statuses={"queued", "running"}
                ),
                allowed_model_profiles=get_allowed_model_profiles(plan),
                updated_at=user.updated_at
            )
        )
    return rows


def list_admin_organizations(db: Session) -> list[AdminOrganizationRecord]:
    rows: list[AdminOrganizationRecord] = []
    for organization in repository.list_organizations(db):
        subscription = repository.get_active_subscription(db, organization.id)
        plan = repository.get_plan(db, subscription.plan_id) if subscription is not None else None
        members = repository.list_organization_members(db, organization.id)
        rows.append(
            AdminOrganizationRecord(
                id=organization.id,
                name=organization.name,
                slug=organization.slug,
                owner_user_id=organization.owner_user_id,
                member_count=len(members),
                active_plan_name=plan.name if plan is not None else "免费版",
                subscription_status=subscription.status if subscription is not None else None
            )
        )
    return rows


def list_admin_orders(db: Session) -> list[BillingOrderRecord]:
    return [_serialize_order(order, db) for order in repository.list_orders(db, limit=100)]


def list_admin_audits(db: Session) -> list[AuditLogRecord]:
    return list_recent_audits(db, organization_id=None, limit=100)


def get_admin_overview(db: Session) -> AdminOverviewRecord:
    users = [_reset_usage_if_needed(db, user) for user in repository.list_users(db)]
    plans = {plan.id: plan for plan in repository.list_plans(db)}
    subscriptions = repository.list_subscriptions(db)
    paid_users = [user for user in users if user.plan_id != "plan-free"]
    enterprise_users = [user for user in users if user.plan_id == "plan-enterprise"]
    active_subscriptions = [item for item in subscriptions if item.status in {"active", "trialing"}]
    estimated_mrr = 0.0
    usage_rates: list[float] = []
    distribution: list[PlanDistributionItem] = []

    for subscription in active_subscriptions:
        if subscription.billing_cycle == "yearly":
            estimated_mrr += round(subscription.amount / 12.0, 2)
        else:
            estimated_mrr += subscription.amount

    for plan in repository.list_plans(db):
        grouped = [user for user in users if user.plan_id == plan.id]
        if plan.monthly_analysis_quota > 0:
            usage_rates.extend(
                user.monthly_analysis_usage / plan.monthly_analysis_quota for user in grouped
            )
        distribution.append(
            PlanDistributionItem(
                plan_id=plan.id,
                plan_name=plan.name,
                users=len(grouped),
                monthly_revenue=float(len(grouped) * plan.monthly_price)
            )
        )

    recent_analyses = [
        RecentAnalysisItem(
            id=row.id,
            title=row.title,
            summary=row.summary,
            updated_at=row.updated_at
        )
        for row in repository.list_recent_analyses(db, limit=6)
    ]

    return AdminOverviewRecord(
        total_users=len(users),
        paid_users=len(paid_users),
        enterprise_users=len(enterprise_users),
        total_analyses=repository.count_analyses(db),
        total_organizations=len(repository.list_organizations(db)),
        active_subscriptions=len(active_subscriptions),
        monthly_paid_orders=repository.count_paid_orders(db),
        estimated_mrr=float(estimated_mrr),
        average_usage_rate=round(sum(usage_rates) / len(usage_rates), 4) if usage_rates else 0.0,
        queued_jobs=repository.count_analysis_jobs(db, statuses={"queued"}),
        running_jobs=repository.count_analysis_jobs(db, statuses={"running"}),
        failed_jobs=repository.count_analysis_jobs(db, statuses={"failed"}),
        completed_jobs=repository.count_analysis_jobs(db, statuses={"completed"}),
        plan_distribution=distribution,
        recent_analyses=recent_analyses
    )


def _serialize_plan(plan_id: str, db: Session) -> PlanRecord:
    plan = repository.get_plan(db, plan_id)
    if plan is None:
        raise ValueError("套餐不存在")

    return PlanRecord(
        id=plan.id,
        name=plan.name,
        tier=plan.tier,
        description=plan.description,
        monthly_price=plan.monthly_price,
        yearly_price=plan.yearly_price,
        monthly_analysis_quota=plan.monthly_analysis_quota,
        export_enabled=plan.export_enabled,
        advanced_models=plan.advanced_models,
        team_seats=plan.team_seats,
        allowed_model_profiles=get_allowed_model_profiles(plan),
        max_concurrent_jobs=get_max_concurrent_jobs(plan),
        highlight=_highlight_for_tier(plan.tier),
        features=_features_for_plan(plan)
    )


def _serialize_organization(organization: OrganizationModel | None) -> OrganizationRecord | None:
    if organization is None:
        return None
    return OrganizationRecord(
        id=organization.id,
        name=organization.name,
        slug=organization.slug,
        owner_user_id=organization.owner_user_id
    )


def _serialize_subscription(
    subscription: SubscriptionModel | None,
    db: Session
) -> SubscriptionRecord | None:
    if subscription is None:
        return None
    plan = repository.get_plan(db, subscription.plan_id)
    plan_name = plan.name if plan is not None else subscription.plan_id
    return SubscriptionRecord(
        id=subscription.id,
        organization_id=subscription.organization_id,
        plan_id=subscription.plan_id,
        plan_name=plan_name,
        billing_cycle=subscription.billing_cycle,
        status=subscription.status,
        amount=subscription.amount,
        currency=subscription.currency,
        provider=subscription.provider,
        cancel_at_period_end=subscription.cancel_at_period_end,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end
    )


def _serialize_order(order: BillingOrderModel, db: Session) -> BillingOrderRecord:
    plan = repository.get_plan(db, order.plan_id)
    plan_name = plan.name if plan is not None else order.plan_id
    return BillingOrderRecord(
        id=order.id,
        organization_id=order.organization_id,
        user_id=order.user_id,
        plan_id=order.plan_id,
        plan_name=plan_name,
        billing_cycle=order.billing_cycle,
        amount=order.amount,
        currency=order.currency,
        status=order.status,
        provider=order.provider,
        provider_reference=order.provider_reference,
        created_at=order.created_at,
        paid_at=order.paid_at
    )


def _features_for_plan(plan) -> list[str]:
    features = [f"每月 {plan.monthly_analysis_quota} 次推演"]
    features.append("支持结果导出" if plan.export_enabled else "仅支持在线查看")
    features.append("高级模型推演" if plan.advanced_models else "标准模型推演")
    features.append(f"团队席位 {plan.team_seats} 个")
    features.append(f"并发任务 {get_max_concurrent_jobs(plan)} 个")
    return features


def _highlight_for_tier(tier: str) -> str:
    mapping = {
        "free": "先验证需求",
        "pro": "适合个人付费",
        "vip": "核心盈利档位",
        "enterprise": "面向企业签约"
    }
    return mapping.get(tier, "")


def _reset_usage_if_needed(db: Session, user: UserModel) -> UserModel:
    now = datetime.now(timezone.utc)
    last = user.last_usage_reset_at
    if last.year == now.year and last.month == now.month:
        return user

    user.last_usage_reset_at = now
    return repository.replace_user_usage(db, user, 0)


def _bootstrap_organizations(db: Session, now: datetime) -> None:
    repository.upsert_organizations(
        db,
        [
            OrganizationModel(
                id="org-lab",
                name="Super OS 超级OS",
                slug="super-os",
                owner_user_id="demo-admin"
            )
        ]
    )
    repository.upsert_organization_members(
        db,
        [
            OrganizationMemberModel(
                id="member-lab-admin",
                organization_id="org-lab",
                user_id="demo-admin",
                role="owner",
                created_at=now
            )
        ]
    )


def _bootstrap_subscriptions_and_orders(db: Session, now: datetime) -> None:
    repository.upsert_subscriptions(
        db,
        [
            SubscriptionModel(
                id="subscription-org-lab",
                organization_id="org-lab",
                plan_id="plan-enterprise",
                billing_cycle="monthly",
                status="active",
                amount=1999,
                currency="CNY",
                provider="manual",
                cancel_at_period_end=False,
                current_period_start=now,
                current_period_end=now + timedelta(days=30)
            )
        ]
    )
    repository.upsert_orders(
        db,
        [
            BillingOrderModel(
                id="order-enterprise-001",
                organization_id="org-lab",
                user_id="demo-admin",
                plan_id="plan-enterprise",
                billing_cycle="monthly",
                amount=1999,
                currency="CNY",
                status="paid",
                provider="manual",
                provider_reference="seed-enterprise-001",
                metadata_payload={"seed": True},
                paid_at=now
            )
        ]
    )


def _bootstrap_audit_logs(db: Session, now: datetime) -> None:
    repository.upsert_audit_logs(
        db,
        [
            AuditLogModel(
                id="audit-seed-enterprise",
                actor_user_id="demo-admin",
                organization_id="org-lab",
                action="billing.subscription_seeded",
                entity_type="subscription",
                entity_id="subscription-org-lab",
                summary="企业版订阅已初始化",
                metadata_payload={"seed": True},
                created_at=now
            )
        ]
    )


def _prune_legacy_demo_accounts(db: Session) -> None:
    legacy_users = ("demo-vip", "demo-pro", "demo-free")
    legacy_organizations = ("org-growth", "org-pro", "org-free")

    for organization_id in legacy_organizations:
        repository.delete_analysis_jobs_by_organization(db, organization_id)
        repository.delete_orders_by_organization(db, organization_id)
        repository.delete_subscriptions_for_organization(db, organization_id)
        repository.delete_analysis_ownerships_by_organization(db, organization_id)
        repository.delete_audit_logs_by_organization(db, organization_id)
        repository.delete_memberships_for_organization(db, organization_id)
        repository.delete_organization(db, organization_id)

    for user_id in legacy_users:
        repository.delete_session_tokens_by_user_id(db, user_id)
        repository.delete_analysis_jobs_by_user_id(db, user_id)
        repository.delete_orders_by_user_id(db, user_id)
        repository.delete_analysis_ownerships_by_user_id(db, user_id)
        repository.delete_audit_logs_by_actor(db, user_id)
        repository.delete_memberships_for_user(db, user_id)
        repository.delete_auth_account(db, user_id)
        repository.delete_user(db, user_id)

    repository.delete_analyses(db, repository.list_orphaned_analysis_ids(db))
