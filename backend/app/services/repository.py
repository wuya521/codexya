from collections.abc import Iterable

from datetime import datetime, timezone

from sqlalchemy import delete, desc, or_, select
from sqlalchemy.orm import Session

from app.models.db_models import (
    AnalysisModel,
    AnalysisJobModel,
    AnalysisOwnershipModel,
    AuditLogModel,
    AuthAccountModel,
    BillingOrderModel,
    OrganizationMemberModel,
    OrganizationModel,
    PlanModel,
    RedemptionCodeModel,
    SessionTokenModel,
    SubscriptionModel,
    TemplateModel,
    UserModel
)
from app.schemas.account import PlanRecord
from app.schemas.analysis import AnalysisRecord, AnalysisRequest, TemplateRecord


class Repository:
    def list_plans(self, db: Session) -> list[PlanModel]:
        return db.scalars(select(PlanModel).order_by(PlanModel.monthly_price.asc())).all()

    def get_plan(self, db: Session, plan_id: str) -> PlanModel | None:
        return db.get(PlanModel, plan_id)

    def upsert_plans(self, db: Session, plans: list[PlanRecord]) -> None:
        for plan in plans:
            existing = db.get(PlanModel, plan.id)
            if existing is None:
                db.add(
                    PlanModel(
                        id=plan.id,
                        name=plan.name,
                        tier=plan.tier,
                        description=plan.description,
                        monthly_price=plan.monthly_price,
                        yearly_price=plan.yearly_price,
                        monthly_analysis_quota=plan.monthly_analysis_quota,
                        export_enabled=plan.export_enabled,
                        advanced_models=plan.advanced_models,
                        team_seats=plan.team_seats
                    )
                )
                continue

            existing.name = plan.name
            existing.tier = plan.tier
            existing.description = plan.description
            existing.monthly_price = plan.monthly_price
            existing.yearly_price = plan.yearly_price
            existing.monthly_analysis_quota = plan.monthly_analysis_quota
            existing.export_enabled = plan.export_enabled
            existing.advanced_models = plan.advanced_models
            existing.team_seats = plan.team_seats

        db.commit()

    def save_plan(self, db: Session, plan: PlanModel) -> PlanModel:
        db.commit()
        db.refresh(plan)
        return plan

    def list_users(self, db: Session) -> list[UserModel]:
        return db.scalars(select(UserModel).order_by(UserModel.updated_at.desc())).all()

    def get_user(self, db: Session, user_id: str) -> UserModel | None:
        return db.get(UserModel, user_id)

    def get_user_by_email(self, db: Session, email: str) -> UserModel | None:
        statement = select(UserModel).where(UserModel.email == email.lower())
        return db.scalar(statement)

    def upsert_users(self, db: Session, users: list[UserModel]) -> None:
        for user in users:
            existing = db.get(UserModel, user.id)
            if existing is None:
                user.email = user.email.lower()
                db.add(user)
                continue

            existing.name = user.name
            existing.email = user.email.lower()
            existing.company = user.company
            existing.role = user.role
            existing.plan_id = user.plan_id
            existing.monthly_analysis_usage = user.monthly_analysis_usage
            existing.bonus_quota_balance = user.bonus_quota_balance
            existing.last_usage_reset_at = user.last_usage_reset_at
            existing.last_active_at = user.last_active_at

        db.commit()

    def create_user(self, db: Session, user: UserModel) -> UserModel:
        user.email = user.email.lower()
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def delete_user(self, db: Session, user_id: str) -> None:
        db.execute(delete(UserModel).where(UserModel.id == user_id))
        db.commit()

    def update_user_plan(self, db: Session, user: UserModel, plan_id: str) -> UserModel:
        user.plan_id = plan_id
        db.commit()
        db.refresh(user)
        return user

    def save_user(self, db: Session, user: UserModel) -> UserModel:
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        return user

    def replace_user_usage(self, db: Session, user: UserModel, usage: int) -> UserModel:
        user.monthly_analysis_usage = usage
        db.commit()
        db.refresh(user)
        return user

    def increment_user_usage(self, db: Session, user: UserModel) -> UserModel:
        user.monthly_analysis_usage += 1
        db.commit()
        db.refresh(user)
        return user

    def replace_user_bonus_quota(self, db: Session, user: UserModel, balance: int) -> UserModel:
        user.bonus_quota_balance = balance
        db.commit()
        db.refresh(user)
        return user

    def increment_user_bonus_quota(self, db: Session, user: UserModel, amount: int) -> UserModel:
        user.bonus_quota_balance += amount
        db.commit()
        db.refresh(user)
        return user

    def decrement_user_bonus_quota(self, db: Session, user: UserModel, amount: int = 1) -> UserModel:
        user.bonus_quota_balance = max(user.bonus_quota_balance - amount, 0)
        db.commit()
        db.refresh(user)
        return user

    def touch_user_activity(self, db: Session, user: UserModel) -> UserModel:
        user.last_active_at = user.updated_at = user.last_active_at.__class__.now(user.last_active_at.tzinfo)
        db.commit()
        db.refresh(user)
        return user

    def upsert_auth_accounts(self, db: Session, accounts: Iterable[AuthAccountModel]) -> None:
        for account in accounts:
            existing = db.get(AuthAccountModel, account.user_id)
            if existing is None:
                account.email = account.email.lower()
                db.add(account)
                continue

            existing.email = account.email.lower()
            existing.password_hash = account.password_hash
            existing.password_salt = account.password_salt
            existing.auth_mode = account.auth_mode
            existing.status = account.status

        db.commit()

    def create_auth_account(self, db: Session, account: AuthAccountModel) -> AuthAccountModel:
        account.email = account.email.lower()
        db.add(account)
        db.commit()
        db.refresh(account)
        return account

    def get_auth_account_by_email(self, db: Session, email: str) -> AuthAccountModel | None:
        statement = select(AuthAccountModel).where(AuthAccountModel.email == email.lower())
        return db.scalar(statement)

    def get_auth_account_by_user_id(self, db: Session, user_id: str) -> AuthAccountModel | None:
        return db.get(AuthAccountModel, user_id)

    def save_auth_account(self, db: Session, account: AuthAccountModel) -> AuthAccountModel:
        db.commit()
        db.refresh(account)
        return account

    def delete_auth_account(self, db: Session, user_id: str) -> None:
        db.execute(delete(AuthAccountModel).where(AuthAccountModel.user_id == user_id))
        db.commit()

    def create_session_token(self, db: Session, session_token: SessionTokenModel) -> SessionTokenModel:
        db.add(session_token)
        db.commit()
        db.refresh(session_token)
        return session_token

    def get_session_token(self, db: Session, token_id: str) -> SessionTokenModel | None:
        return db.get(SessionTokenModel, token_id)

    def revoke_session_token(self, db: Session, session_token: SessionTokenModel) -> SessionTokenModel:
        session_token.revoked_at = session_token.updated_at = session_token.expires_at.__class__.now(
            session_token.expires_at.tzinfo
        )
        db.commit()
        db.refresh(session_token)
        return session_token

    def delete_session_tokens_by_user_id(self, db: Session, user_id: str) -> None:
        db.execute(delete(SessionTokenModel).where(SessionTokenModel.user_id == user_id))
        db.commit()

    def upsert_organizations(self, db: Session, organizations: Iterable[OrganizationModel]) -> None:
        for organization in organizations:
            existing = db.get(OrganizationModel, organization.id)
            if existing is None:
                db.add(organization)
                continue

            existing.name = organization.name
            existing.slug = organization.slug
            existing.owner_user_id = organization.owner_user_id

        db.commit()

    def create_organization(self, db: Session, organization: OrganizationModel) -> OrganizationModel:
        db.add(organization)
        db.commit()
        db.refresh(organization)
        return organization

    def get_organization(self, db: Session, organization_id: str) -> OrganizationModel | None:
        return db.get(OrganizationModel, organization_id)

    def list_organizations(self, db: Session) -> list[OrganizationModel]:
        return db.scalars(select(OrganizationModel).order_by(OrganizationModel.updated_at.desc())).all()

    def delete_organization(self, db: Session, organization_id: str) -> None:
        db.execute(delete(OrganizationModel).where(OrganizationModel.id == organization_id))
        db.commit()

    def upsert_organization_members(self, db: Session, memberships: Iterable[OrganizationMemberModel]) -> None:
        for membership in memberships:
            existing = db.get(OrganizationMemberModel, membership.id)
            if existing is None:
                db.add(membership)
                continue

            existing.organization_id = membership.organization_id
            existing.user_id = membership.user_id
            existing.role = membership.role

        db.commit()

    def create_organization_member(
        self,
        db: Session,
        membership: OrganizationMemberModel
    ) -> OrganizationMemberModel:
        db.add(membership)
        db.commit()
        db.refresh(membership)
        return membership

    def list_organization_members(self, db: Session, organization_id: str) -> list[OrganizationMemberModel]:
        statement = (
            select(OrganizationMemberModel)
            .where(OrganizationMemberModel.organization_id == organization_id)
            .order_by(OrganizationMemberModel.created_at.asc())
        )
        return db.scalars(statement).all()

    def get_membership(self, db: Session, organization_id: str, user_id: str) -> OrganizationMemberModel | None:
        statement = select(OrganizationMemberModel).where(
            OrganizationMemberModel.organization_id == organization_id,
            OrganizationMemberModel.user_id == user_id
        )
        return db.scalar(statement)

    def list_memberships_for_user(self, db: Session, user_id: str) -> list[OrganizationMemberModel]:
        statement = (
            select(OrganizationMemberModel)
            .where(OrganizationMemberModel.user_id == user_id)
            .order_by(OrganizationMemberModel.created_at.asc())
        )
        return db.scalars(statement).all()

    def save_membership(
        self,
        db: Session,
        membership: OrganizationMemberModel
    ) -> OrganizationMemberModel:
        db.commit()
        db.refresh(membership)
        return membership

    def get_primary_membership(self, db: Session, user_id: str) -> OrganizationMemberModel | None:
        rows = db.scalars(
            select(OrganizationMemberModel)
            .where(OrganizationMemberModel.user_id == user_id)
            .order_by(OrganizationMemberModel.created_at.asc())
        ).all()
        if not rows:
            return None

        for target_role in ("owner", "admin", "member"):
            for row in rows:
                if row.role == target_role:
                    return row
        return rows[0]

    def delete_memberships_for_user(self, db: Session, user_id: str) -> None:
        db.execute(delete(OrganizationMemberModel).where(OrganizationMemberModel.user_id == user_id))
        db.commit()

    def delete_memberships_for_organization(self, db: Session, organization_id: str) -> None:
        db.execute(
            delete(OrganizationMemberModel).where(
                OrganizationMemberModel.organization_id == organization_id
            )
        )
        db.commit()

    def upsert_subscriptions(self, db: Session, subscriptions: Iterable[SubscriptionModel]) -> None:
        for subscription in subscriptions:
            existing = db.get(SubscriptionModel, subscription.id)
            if existing is None:
                db.add(subscription)
                continue

            existing.organization_id = subscription.organization_id
            existing.plan_id = subscription.plan_id
            existing.billing_cycle = subscription.billing_cycle
            existing.status = subscription.status
            existing.amount = subscription.amount
            existing.currency = subscription.currency
            existing.provider = subscription.provider
            existing.cancel_at_period_end = subscription.cancel_at_period_end
            existing.current_period_start = subscription.current_period_start
            existing.current_period_end = subscription.current_period_end

        db.commit()

    def create_or_replace_subscription(
        self,
        db: Session,
        subscription: SubscriptionModel
    ) -> SubscriptionModel:
        statement = select(SubscriptionModel).where(
            SubscriptionModel.organization_id == subscription.organization_id
        )
        existing = db.scalar(statement)
        if existing is None:
            db.add(subscription)
            db.commit()
            db.refresh(subscription)
            return subscription

        existing.plan_id = subscription.plan_id
        existing.billing_cycle = subscription.billing_cycle
        existing.status = subscription.status
        existing.amount = subscription.amount
        existing.currency = subscription.currency
        existing.provider = subscription.provider
        existing.cancel_at_period_end = subscription.cancel_at_period_end
        existing.current_period_start = subscription.current_period_start
        existing.current_period_end = subscription.current_period_end
        db.commit()
        db.refresh(existing)
        return existing

    def get_active_subscription(self, db: Session, organization_id: str) -> SubscriptionModel | None:
        statement = (
            select(SubscriptionModel)
            .where(SubscriptionModel.organization_id == organization_id)
            .order_by(SubscriptionModel.updated_at.desc())
        )
        return db.scalar(statement)

    def list_subscriptions(self, db: Session) -> list[SubscriptionModel]:
        return db.scalars(select(SubscriptionModel).order_by(SubscriptionModel.updated_at.desc())).all()

    def delete_subscriptions_for_organization(self, db: Session, organization_id: str) -> None:
        db.execute(
            delete(SubscriptionModel).where(SubscriptionModel.organization_id == organization_id)
        )
        db.commit()

    def upsert_orders(self, db: Session, orders: Iterable[BillingOrderModel]) -> None:
        for order in orders:
            existing = db.get(BillingOrderModel, order.id)
            if existing is None:
                db.add(order)
                continue

            existing.organization_id = order.organization_id
            existing.user_id = order.user_id
            existing.plan_id = order.plan_id
            existing.billing_cycle = order.billing_cycle
            existing.amount = order.amount
            existing.currency = order.currency
            existing.status = order.status
            existing.provider = order.provider
            existing.provider_reference = order.provider_reference
            existing.metadata_payload = order.metadata_payload
            existing.paid_at = order.paid_at

        db.commit()

    def create_order(self, db: Session, order: BillingOrderModel) -> BillingOrderModel:
        db.add(order)
        db.commit()
        db.refresh(order)
        return order

    def list_orders(self, db: Session, limit: int | None = None) -> list[BillingOrderModel]:
        statement = select(BillingOrderModel).order_by(BillingOrderModel.created_at.desc())
        if limit is not None:
            statement = statement.limit(limit)
        return db.scalars(statement).all()

    def list_orders_by_organization(
        self,
        db: Session,
        organization_id: str,
        limit: int | None = None
    ) -> list[BillingOrderModel]:
        statement = (
            select(BillingOrderModel)
            .where(BillingOrderModel.organization_id == organization_id)
            .order_by(BillingOrderModel.created_at.desc())
        )
        if limit is not None:
            statement = statement.limit(limit)
        return db.scalars(statement).all()

    def delete_orders_by_user_id(self, db: Session, user_id: str) -> None:
        db.execute(delete(BillingOrderModel).where(BillingOrderModel.user_id == user_id))
        db.commit()

    def delete_orders_by_organization(self, db: Session, organization_id: str) -> None:
        db.execute(
            delete(BillingOrderModel).where(BillingOrderModel.organization_id == organization_id)
        )
        db.commit()

    def list_orders_by_provider_reference(
        self,
        db: Session,
        provider_reference: str,
        limit: int | None = None
    ) -> list[BillingOrderModel]:
        statement = (
            select(BillingOrderModel)
            .where(BillingOrderModel.provider_reference == provider_reference)
            .order_by(BillingOrderModel.created_at.desc())
        )
        if limit is not None:
            statement = statement.limit(limit)
        return db.scalars(statement).all()

    def upsert_audit_logs(self, db: Session, audit_logs: Iterable[AuditLogModel]) -> None:
        for audit_log in audit_logs:
            existing = db.get(AuditLogModel, audit_log.id)
            if existing is None:
                db.add(audit_log)
                continue

            existing.actor_user_id = audit_log.actor_user_id
            existing.organization_id = audit_log.organization_id
            existing.action = audit_log.action
            existing.entity_type = audit_log.entity_type
            existing.entity_id = audit_log.entity_id
            existing.summary = audit_log.summary
            existing.metadata_payload = audit_log.metadata_payload

        db.commit()

    def create_audit_log(self, db: Session, audit_log: AuditLogModel) -> AuditLogModel:
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        return audit_log

    def list_audit_logs(
        self,
        db: Session,
        organization_id: str | None = None,
        limit: int | None = None
    ) -> list[AuditLogModel]:
        statement = select(AuditLogModel).order_by(AuditLogModel.created_at.desc())
        if organization_id is not None:
            statement = statement.where(AuditLogModel.organization_id == organization_id)
        if limit is not None:
            statement = statement.limit(limit)
        return db.scalars(statement).all()

    def delete_audit_logs_by_actor(self, db: Session, actor_user_id: str) -> None:
        db.execute(delete(AuditLogModel).where(AuditLogModel.actor_user_id == actor_user_id))
        db.commit()

    def delete_audit_logs_by_organization(self, db: Session, organization_id: str) -> None:
        db.execute(delete(AuditLogModel).where(AuditLogModel.organization_id == organization_id))
        db.commit()

    def create_redemption_code(
        self,
        db: Session,
        redemption_code: RedemptionCodeModel
    ) -> RedemptionCodeModel:
        db.add(redemption_code)
        db.commit()
        db.refresh(redemption_code)
        return redemption_code

    def save_redemption_code(
        self,
        db: Session,
        redemption_code: RedemptionCodeModel
    ) -> RedemptionCodeModel:
        db.commit()
        db.refresh(redemption_code)
        return redemption_code

    def get_redemption_code(self, db: Session, redemption_code_id: str) -> RedemptionCodeModel | None:
        return db.get(RedemptionCodeModel, redemption_code_id)

    def get_redemption_code_by_code(self, db: Session, code: str) -> RedemptionCodeModel | None:
        statement = select(RedemptionCodeModel).where(RedemptionCodeModel.code == code.upper())
        return db.scalar(statement)

    def list_redemption_codes(
        self,
        db: Session,
        *,
        redeemed_by_user_id: str | None = None,
        status: str | None = None,
        limit: int | None = 100
    ) -> list[RedemptionCodeModel]:
        statement = select(RedemptionCodeModel).order_by(RedemptionCodeModel.created_at.desc())
        if redeemed_by_user_id is not None:
            statement = statement.where(RedemptionCodeModel.redeemed_by_user_id == redeemed_by_user_id)
        if status is not None:
            statement = statement.where(RedemptionCodeModel.status == status)
        if limit is not None:
            statement = statement.limit(limit)
        return db.scalars(statement).all()

    def delete_redemption_code(self, db: Session, redemption_code_id: str) -> None:
        db.execute(delete(RedemptionCodeModel).where(RedemptionCodeModel.id == redemption_code_id))
        db.commit()

    def list_templates(self, db: Session) -> list[TemplateRecord]:
        rows = db.scalars(select(TemplateModel).order_by(TemplateModel.name.asc())).all()
        return [
            TemplateRecord(
                id=row.id,
                mode=row.mode,
                name=row.name,
                description=row.description,
                scenario=row.scenario,
                starter_prompt=row.starter_prompt
            )
            for row in rows
        ]

    def upsert_templates(self, db: Session, templates: list[TemplateRecord]) -> None:
        for template in templates:
            existing = db.get(TemplateModel, template.id)
            if existing is None:
                db.add(
                    TemplateModel(
                        id=template.id,
                        mode=template.mode,
                        name=template.name,
                        description=template.description,
                        scenario=template.scenario,
                        starter_prompt=template.starter_prompt
                    )
                )
                continue

            existing.mode = template.mode
            existing.name = template.name
            existing.description = template.description
            existing.scenario = template.scenario
            existing.starter_prompt = template.starter_prompt

        db.commit()

    def list_analyses(self, db: Session) -> list[AnalysisRecord]:
        rows = db.scalars(select(AnalysisModel).order_by(AnalysisModel.updated_at.desc())).all()
        return [AnalysisRecord.model_validate(row.result_payload) for row in rows]

    def list_user_analyses(self, db: Session, user_id: str, limit: int | None = None) -> list[AnalysisRecord]:
        statement = (
            select(AnalysisModel)
            .join(AnalysisOwnershipModel, AnalysisOwnershipModel.analysis_id == AnalysisModel.id)
            .where(AnalysisOwnershipModel.user_id == user_id)
            .order_by(AnalysisModel.updated_at.desc())
        )
        if limit is not None:
            statement = statement.limit(limit)
        rows = db.scalars(statement).all()
        return [AnalysisRecord.model_validate(row.result_payload) for row in rows]

    def list_organization_analyses(
        self,
        db: Session,
        organization_id: str,
        limit: int | None = None
    ) -> list[AnalysisRecord]:
        statement = (
            select(AnalysisModel)
            .join(AnalysisOwnershipModel, AnalysisOwnershipModel.analysis_id == AnalysisModel.id)
            .where(AnalysisOwnershipModel.organization_id == organization_id)
            .order_by(AnalysisModel.updated_at.desc())
        )
        if limit is not None:
            statement = statement.limit(limit)
        rows = db.scalars(statement).all()
        return [AnalysisRecord.model_validate(row.result_payload) for row in rows]

    def get_analysis(self, db: Session, analysis_id: str) -> AnalysisRecord | None:
        row = db.get(AnalysisModel, analysis_id)
        if row is None:
            return None
        return AnalysisRecord.model_validate(row.result_payload)

    def get_analysis_request(self, db: Session, analysis_id: str) -> AnalysisRequest | None:
        row = db.get(AnalysisModel, analysis_id)
        if row is None:
            return None
        return AnalysisRequest.model_validate(row.request_payload)

    def save_analysis(
        self,
        db: Session,
        analysis: AnalysisRecord,
        request: AnalysisRequest,
        owner_user_id: str | None = None,
        organization_id: str | None = None
    ) -> AnalysisRecord:
        payload = analysis.model_dump(mode="json")
        request_payload = request.model_dump(mode="json")
        existing = db.get(AnalysisModel, analysis.id)

        if existing is None:
            db.add(
                AnalysisModel(
                    id=analysis.id,
                    mode=analysis.mode,
                    title=analysis.title,
                    summary=analysis.summary,
                    confidence=analysis.confidence,
                    status=analysis.status,
                    request_payload=request_payload,
                    result_payload=payload
                )
            )
        else:
            existing.mode = analysis.mode
            existing.title = analysis.title
            existing.summary = analysis.summary
            existing.confidence = analysis.confidence
            existing.status = analysis.status
            existing.request_payload = request_payload
            existing.result_payload = payload

        db.commit()

        if owner_user_id and organization_id:
            self.ensure_analysis_ownership(
                db,
                analysis_id=analysis.id,
                user_id=owner_user_id,
                organization_id=organization_id
            )

        return analysis

    def ensure_analysis_ownership(
        self,
        db: Session,
        analysis_id: str,
        user_id: str,
        organization_id: str
    ) -> AnalysisOwnershipModel:
        statement = select(AnalysisOwnershipModel).where(
            AnalysisOwnershipModel.analysis_id == analysis_id,
            AnalysisOwnershipModel.user_id == user_id,
            AnalysisOwnershipModel.organization_id == organization_id
        )
        existing = db.scalar(statement)
        if existing is not None:
            return existing

        ownership = AnalysisOwnershipModel(
            id=f"analysis-owner-{analysis_id}-{user_id}",
            analysis_id=analysis_id,
            user_id=user_id,
            organization_id=organization_id
        )
        db.add(ownership)
        db.commit()
        db.refresh(ownership)
        return ownership

    def delete_analysis_ownerships_by_user_id(self, db: Session, user_id: str) -> None:
        db.execute(
            delete(AnalysisOwnershipModel).where(AnalysisOwnershipModel.user_id == user_id)
        )
        db.commit()

    def delete_analysis_ownerships_by_organization(self, db: Session, organization_id: str) -> None:
        db.execute(
            delete(AnalysisOwnershipModel).where(
                AnalysisOwnershipModel.organization_id == organization_id
            )
        )
        db.commit()

    def list_orphaned_analysis_ids(self, db: Session) -> list[str]:
        statement = select(AnalysisModel.id).where(
            ~AnalysisModel.id.in_(select(AnalysisOwnershipModel.analysis_id))
        )
        return db.scalars(statement).all()

    def delete_analyses(self, db: Session, analysis_ids: list[str]) -> None:
        if not analysis_ids:
            return
        db.execute(delete(AnalysisModel).where(AnalysisModel.id.in_(analysis_ids)))
        db.commit()

    def create_analysis_job(
        self,
        db: Session,
        job: AnalysisJobModel
    ) -> AnalysisJobModel:
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def get_analysis_job(self, db: Session, job_id: str) -> AnalysisJobModel | None:
        return db.get(AnalysisJobModel, job_id)

    def save_analysis_job(self, db: Session, job: AnalysisJobModel) -> AnalysisJobModel:
        db.commit()
        db.refresh(job)
        return job

    def delete_analysis_jobs_by_user_id(self, db: Session, user_id: str) -> None:
        db.execute(delete(AnalysisJobModel).where(AnalysisJobModel.user_id == user_id))
        db.commit()

    def delete_analysis_jobs_by_organization(self, db: Session, organization_id: str) -> None:
        db.execute(
            delete(AnalysisJobModel).where(AnalysisJobModel.organization_id == organization_id)
        )
        db.commit()

    def list_analysis_jobs(
        self,
        db: Session,
        user_id: str | None = None,
        organization_id: str | None = None,
        statuses: set[str] | None = None,
        limit: int | None = 100
    ) -> list[AnalysisJobModel]:
        statement = select(AnalysisJobModel).order_by(AnalysisJobModel.created_at.desc())
        if user_id is not None:
            statement = statement.where(AnalysisJobModel.user_id == user_id)
        if organization_id is not None:
            statement = statement.where(AnalysisJobModel.organization_id == organization_id)
        if statuses:
            statement = statement.where(AnalysisJobModel.status.in_(statuses))
        if limit is not None:
            statement = statement.limit(limit)
        return db.scalars(statement).all()

    def count_analysis_jobs(
        self,
        db: Session,
        *,
        user_id: str | None = None,
        statuses: set[str] | None = None
    ) -> int:
        return len(self.list_analysis_jobs(db, user_id=user_id, statuses=statuses, limit=None))

    def count_analyses(self, db: Session) -> int:
        return len(db.scalars(select(AnalysisModel.id)).all())

    def list_recent_analyses(self, db: Session, limit: int = 5) -> list[AnalysisModel]:
        return db.scalars(
            select(AnalysisModel).order_by(AnalysisModel.updated_at.desc()).limit(limit)
        ).all()

    def count_paid_orders(self, db: Session) -> int:
        statement = select(BillingOrderModel).where(BillingOrderModel.status == "paid")
        return len(db.scalars(statement).all())

    def list_users_in_organizations(
        self,
        db: Session,
        organization_ids: list[str]
    ) -> list[OrganizationMemberModel]:
        if not organization_ids:
            return []
        statement = select(OrganizationMemberModel).where(
            OrganizationMemberModel.organization_id.in_(organization_ids)
        )
        return db.scalars(statement).all()


repository = Repository()
