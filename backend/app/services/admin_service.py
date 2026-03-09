from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.db_models import AuditLogModel, SubscriptionModel, UserModel
from app.schemas.account import (
    AdminOrganizationRecord,
    AdminOverviewRecord,
    AdminPlanRecord,
    AdminPlanUpdateRequest,
    AdminUserRecord,
    AdminUserUpdateRequest,
    AuditLogRecord,
    BillingOrderRecord
)
from app.services.account_service import (
    get_admin_overview as get_account_admin_overview,
    list_admin_audits as list_account_admin_audits,
    list_admin_organizations as list_account_admin_organizations,
    list_admin_orders as list_account_admin_orders,
    list_admin_users as list_account_admin_users,
    list_plans
)
from app.services.analysis_job_service import list_admin_analysis_jobs
from app.services.model_profile_service import get_allowed_model_profiles
from app.services.repository import repository


def get_admin_overview(db: Session) -> AdminOverviewRecord:
    return get_account_admin_overview(db)


def list_admin_users(db: Session) -> list[AdminUserRecord]:
    return list_account_admin_users(db)


def list_admin_organizations(db: Session) -> list[AdminOrganizationRecord]:
    return list_account_admin_organizations(db)


def list_admin_orders(db: Session) -> list[BillingOrderRecord]:
    return list_account_admin_orders(db)


def list_admin_audits(db: Session) -> list[AuditLogRecord]:
    return list_account_admin_audits(db)


def list_admin_plans(db: Session) -> list[AdminPlanRecord]:
    users = repository.list_users(db)
    subscriptions = repository.list_subscriptions(db)
    plans = list_plans(db)
    records: list[AdminPlanRecord] = []
    for plan in plans:
        grouped_users = [user for user in users if user.plan_id == plan.id]
        active_organizations = len(
            [
                item
                for item in subscriptions
                if item.plan_id == plan.id and item.status in {"active", "trialing"}
            ]
        )
        usage_rates = [
            min(user.monthly_analysis_usage / plan.monthly_analysis_quota, 1.0)
            for user in grouped_users
            if plan.monthly_analysis_quota > 0
        ]
        records.append(
            AdminPlanRecord(
                **plan.model_dump(),
                assigned_users=len(grouped_users),
                active_organizations=active_organizations,
                average_usage_rate=round(sum(usage_rates) / len(usage_rates), 4) if usage_rates else 0.0
            )
        )
    return records


def update_admin_user(
    db: Session,
    actor: UserModel,
    user_id: str,
    payload: AdminUserUpdateRequest
) -> AdminUserRecord:
    user = repository.get_user(db, user_id)
    if user is None:
        raise ValueError("目标用户不存在。")

    membership = repository.get_primary_membership(db, user.id)
    auth_account = repository.get_auth_account_by_user_id(db, user.id)
    changes: dict[str, str | int] = {}

    if payload.name is not None and payload.name.strip() and payload.name != user.name:
        user.name = payload.name.strip()
        changes["name"] = user.name
    if payload.company is not None and payload.company != user.company:
        user.company = payload.company
        changes["company"] = user.company
    if payload.role is not None and payload.role != user.role:
        user.role = payload.role
        changes["role"] = user.role
    if payload.monthly_usage is not None and payload.monthly_usage != user.monthly_analysis_usage:
        user.monthly_analysis_usage = payload.monthly_usage
        user.last_usage_reset_at = datetime.now(timezone.utc)
        changes["monthly_usage"] = payload.monthly_usage
    if payload.organization_role is not None and membership is not None and payload.organization_role != membership.role:
        membership.role = payload.organization_role
        changes["organization_role"] = membership.role
    if payload.auth_status is not None:
        if auth_account is None:
            raise ValueError("目标用户缺少登录账户，无法修改状态。")
        if payload.auth_status != auth_account.status:
            auth_account.status = payload.auth_status
            changes["auth_status"] = auth_account.status
    if payload.plan_id is not None and payload.plan_id != user.plan_id:
        plan = repository.get_plan(db, payload.plan_id)
        if plan is None:
            raise ValueError("目标套餐不存在。")
        user.plan_id = payload.plan_id
        changes["plan_id"] = payload.plan_id
        if membership is not None:
            current_subscription = repository.get_active_subscription(db, membership.organization_id)
            billing_cycle = current_subscription.billing_cycle if current_subscription is not None else "monthly"
            provider = current_subscription.provider if current_subscription is not None else "manual"
            status = current_subscription.status if current_subscription is not None else "active"
            period_start = (
                current_subscription.current_period_start
                if current_subscription is not None
                else datetime.now(timezone.utc)
            )
            period_end = (
                current_subscription.current_period_end
                if current_subscription is not None
                else datetime.now(timezone.utc) + timedelta(days=30)
            )
            amount = plan.yearly_price if billing_cycle == "yearly" else plan.monthly_price
            repository.create_or_replace_subscription(
                db,
                SubscriptionModel(
                    id=f"subscription-{membership.organization_id}",
                    organization_id=membership.organization_id,
                    plan_id=plan.id,
                    billing_cycle=billing_cycle,
                    status=status,
                    amount=amount,
                    currency="CNY",
                    provider=provider,
                    cancel_at_period_end=False,
                    current_period_start=period_start,
                    current_period_end=period_end
                )
            )

    db.commit()
    if auth_account is not None:
        db.refresh(auth_account)
    if membership is not None:
        db.refresh(membership)
    db.refresh(user)

    if changes:
        repository.create_audit_log(
            db,
            AuditLogModel(
                id=f"audit-{uuid4().hex[:10]}",
                actor_user_id=actor.id,
                organization_id=membership.organization_id if membership is not None else "",
                action="admin.user_updated",
                entity_type="user",
                entity_id=user.id,
                summary=f"{actor.name} 更新了账号 {user.email} 的后台配置",
                metadata_payload=changes
            )
        )

    return _serialize_admin_user(db, user)


def update_admin_plan(
    db: Session,
    actor: UserModel,
    plan_id: str,
    payload: AdminPlanUpdateRequest
) -> AdminPlanRecord:
    plan = repository.get_plan(db, plan_id)
    if plan is None:
        raise ValueError("目标套餐不存在。")

    changes: dict[str, str | int | float | bool] = {}
    for field in (
        "name",
        "description",
        "monthly_price",
        "yearly_price",
        "monthly_analysis_quota",
        "export_enabled",
        "advanced_models",
        "team_seats"
    ):
        value = getattr(payload, field)
        if value is None:
            continue
        if getattr(plan, field) == value:
            continue
        setattr(plan, field, value)
        changes[field] = value

    repository.save_plan(db, plan)

    if changes:
        repository.create_audit_log(
            db,
            AuditLogModel(
                id=f"audit-{uuid4().hex[:10]}",
                actor_user_id=actor.id,
                organization_id="",
                action="admin.plan_updated",
                entity_type="plan",
                entity_id=plan.id,
                summary=f"{actor.name} 更新了套餐 {plan.name} 的额度与配置",
                metadata_payload=changes
            )
        )

    for record in list_admin_plans(db):
        if record.id == plan.id:
            return record
    raise ValueError("套餐更新后无法重新读取。")


def _serialize_admin_user(db: Session, user: UserModel) -> AdminUserRecord:
    plan = repository.get_plan(db, user.plan_id)
    if plan is None:
        raise ValueError("目标用户的套餐不存在。")
    membership = repository.get_primary_membership(db, user.id)
    organization = repository.get_organization(db, membership.organization_id) if membership is not None else None
    auth_account = repository.get_auth_account_by_user_id(db, user.id)
    return AdminUserRecord(
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


__all__ = [
    "get_admin_overview",
    "list_admin_users",
    "list_admin_organizations",
    "list_admin_orders",
    "list_admin_audits",
    "list_admin_plans",
    "list_admin_analysis_jobs",
    "update_admin_user",
    "update_admin_plan"
]
