from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.db_models import AuditLogModel, SubscriptionModel, UserModel
from app.schemas.account import (
    AdminRedemptionCodeCreateRequest,
    AdminRedemptionCodeUpdateRequest,
    AdminUserCreateRequest,
    AdminUserDeleteResponse,
    AdminOrganizationRecord,
    AdminOverviewRecord,
    AdminPlanRecord,
    AdminPlanUpdateRequest,
    AdminUserRecord,
    AdminUserUpdateRequest,
    AuditLogRecord,
    BillingOrderRecord,
    RedemptionCodeRecord
)
from app.services.account_service import (
    create_admin_redemption_codes as create_account_admin_redemption_codes,
    delete_admin_redemption_code as delete_account_admin_redemption_code,
    get_admin_overview as get_account_admin_overview,
    list_admin_audits as list_account_admin_audits,
    list_admin_redemption_codes as list_account_admin_redemption_codes,
    list_admin_organizations as list_account_admin_organizations,
    list_admin_orders as list_account_admin_orders,
    list_admin_users as list_account_admin_users,
    list_plans,
    update_admin_redemption_code as update_account_admin_redemption_code
)
from app.services.auth_service import create_password_hash, slugify
from app.services.analysis_job_service import list_admin_analysis_jobs
from app.services.model_profile_service import get_allowed_model_profiles
from app.services.repository import repository


def get_admin_overview(db: Session) -> AdminOverviewRecord:
    return get_account_admin_overview(db)


def list_admin_users(db: Session) -> list[AdminUserRecord]:
    return list_account_admin_users(db)


def create_admin_user(
    db: Session,
    actor: UserModel,
    payload: AdminUserCreateRequest
) -> AdminUserRecord:
    email = payload.email.lower().strip()
    if repository.get_user_by_email(db, email) is not None:
        raise ValueError("该邮箱已存在")
    if repository.get_auth_account_by_email(db, email) is not None:
        raise ValueError("该邮箱已存在")

    plan = repository.get_plan(db, payload.plan_id)
    if plan is None:
        raise ValueError("目标套餐不存在")

    now = datetime.now(timezone.utc)
    user = repository.create_user(
        db,
        UserModel(
            id=f"user-{uuid4().hex[:10]}",
            name=payload.name.strip(),
            email=email,
            company=payload.company.strip(),
            role=payload.role,
            plan_id=plan.id,
            monthly_analysis_usage=0,
            bonus_quota_balance=0,
            last_usage_reset_at=now,
            last_active_at=now
        )
    )

    password_hash, salt = create_password_hash(payload.password)
    from app.models.db_models import AuthAccountModel, OrganizationMemberModel, OrganizationModel

    repository.create_auth_account(
        db,
        AuthAccountModel(
            user_id=user.id,
            email=email,
            password_hash=password_hash,
            password_salt=salt,
            auth_mode="password",
            status="active"
        )
    )
    workspace_name = f"Super OS 空间 · {user.name}"
    organization = repository.create_organization(
        db,
        OrganizationModel(
            id=f"org-{uuid4().hex[:10]}",
            name=workspace_name,
            slug=slugify(f"{workspace_name}-{user.id[-4:]}"),
            owner_user_id=user.id
        )
    )
    repository.create_organization_member(
        db,
        OrganizationMemberModel(
            id=f"member-{uuid4().hex[:10]}",
            organization_id=organization.id,
            user_id=user.id,
            role="owner"
        )
    )
    repository.create_or_replace_subscription(
        db,
        SubscriptionModel(
            id=f"subscription-{organization.id}",
            organization_id=organization.id,
            plan_id=plan.id,
            billing_cycle="monthly",
            status="active",
            amount=plan.monthly_price,
            currency="CNY",
            provider="manual",
            cancel_at_period_end=False,
            current_period_start=now,
            current_period_end=now + timedelta(days=30)
        )
    )
    repository.create_audit_log(
        db,
        AuditLogModel(
            id=f"audit-{uuid4().hex[:10]}",
            actor_user_id=actor.id,
            organization_id=organization.id,
            action="admin.user_created",
            entity_type="user",
            entity_id=user.id,
            summary=f"{actor.name} 创建了账号 {user.email}",
            metadata_payload={"plan_id": plan.id, "role": user.role}
        )
    )
    return _serialize_admin_user(db, user)


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
    if payload.bonus_quota_balance is not None and payload.bonus_quota_balance != user.bonus_quota_balance:
        user.bonus_quota_balance = payload.bonus_quota_balance
        changes["bonus_quota_balance"] = payload.bonus_quota_balance
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


def delete_admin_user(
    db: Session,
    actor: UserModel,
    user_id: str
) -> AdminUserDeleteResponse:
    target = repository.get_user(db, user_id)
    if target is None:
        raise ValueError("目标用户不存在")
    if target.id == actor.id:
        raise ValueError("不能删除当前登录管理员")
    if target.id == "demo-admin":
        raise ValueError("创始者账号不能删除")

    memberships = repository.list_memberships_for_user(db, target.id)
    owned_organizations = []
    for membership in memberships:
        organization = repository.get_organization(db, membership.organization_id)
        if organization is None:
            continue
        if organization.owner_user_id == target.id:
            member_count = len(repository.list_organization_members(db, organization.id))
            if member_count > 1:
                raise ValueError("该用户仍拥有多成员空间，请先清理成员或转移归属")
            owned_organizations.append(organization)

    repository.delete_session_tokens_by_user_id(db, target.id)
    repository.delete_analysis_jobs_by_user_id(db, target.id)
    repository.delete_orders_by_user_id(db, target.id)
    repository.delete_analysis_ownerships_by_user_id(db, target.id)

    for organization in owned_organizations:
        repository.delete_analysis_jobs_by_organization(db, organization.id)
        repository.delete_orders_by_organization(db, organization.id)
        repository.delete_subscriptions_for_organization(db, organization.id)
        repository.delete_analysis_ownerships_by_organization(db, organization.id)
        repository.delete_audit_logs_by_organization(db, organization.id)
        repository.delete_memberships_for_organization(db, organization.id)
        repository.delete_organization(db, organization.id)

    repository.delete_audit_logs_by_actor(db, target.id)
    repository.delete_memberships_for_user(db, target.id)
    repository.delete_auth_account(db, target.id)
    repository.delete_user(db, target.id)
    repository.delete_analyses(db, repository.list_orphaned_analysis_ids(db))

    repository.create_audit_log(
        db,
        AuditLogModel(
            id=f"audit-{uuid4().hex[:10]}",
            actor_user_id=actor.id,
            organization_id="",
            action="admin.user_deleted",
            entity_type="user",
            entity_id=user_id,
            summary=f"{actor.name} 删除了账号 {target.email}",
            metadata_payload={"email": target.email}
        )
    )
    return AdminUserDeleteResponse(message=f"已删除账号 {target.email}")


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


def list_admin_redemption_codes(db: Session) -> list[RedemptionCodeRecord]:
    return list_account_admin_redemption_codes(db)


def create_admin_redemption_codes(
    db: Session,
    actor: UserModel,
    payload: AdminRedemptionCodeCreateRequest
) -> list[RedemptionCodeRecord]:
    return create_account_admin_redemption_codes(db, actor, payload)


def update_admin_redemption_code(
    db: Session,
    actor: UserModel,
    redemption_code_id: str,
    payload: AdminRedemptionCodeUpdateRequest
) -> RedemptionCodeRecord:
    return update_account_admin_redemption_code(db, actor, redemption_code_id, payload)


def delete_admin_redemption_code(
    db: Session,
    actor: UserModel,
    redemption_code_id: str
) -> None:
    delete_account_admin_redemption_code(db, actor, redemption_code_id)


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
        bonus_quota_balance=user.bonus_quota_balance,
        quota_snapshot={
            "base_limit": plan.monthly_analysis_quota,
            "base_used": user.monthly_analysis_usage,
            "base_remaining": max(plan.monthly_analysis_quota - user.monthly_analysis_usage, 0),
            "bonus_remaining": user.bonus_quota_balance,
            "total_remaining": max(plan.monthly_analysis_quota - user.monthly_analysis_usage, 0)
            + user.bonus_quota_balance
        },
        remaining_quota=max(plan.monthly_analysis_quota - user.monthly_analysis_usage, 0) + user.bonus_quota_balance,
        active_job_count=repository.count_analysis_jobs(
            db,
            user_id=user.id,
            statuses={"queued", "running"}
        ),
        latest_redemption_at=None,
        latest_redemption_summary=None,
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
    "list_admin_redemption_codes",
    "create_admin_redemption_codes",
    "update_admin_redemption_code",
    "delete_admin_redemption_code",
    "update_admin_user",
    "update_admin_plan"
]
