from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.analysis import (
    AnalysisJobRecord,
    AnalysisRecord,
    ModelProfile,
    StrictBaseModel
)


PlanTier = Literal["free", "pro", "vip", "enterprise"]
UserRole = Literal["user", "admin"]
OrganizationRole = Literal["owner", "admin", "member"]
BillingCycle = Literal["monthly", "yearly"]
SubscriptionStatus = Literal["trialing", "active", "past_due", "canceled"]
OrderStatus = Literal["pending", "paid", "failed", "refunded"]
AuthStatus = Literal["active", "suspended"]


class PlanRecord(StrictBaseModel):
    id: str
    name: str
    tier: PlanTier
    description: str
    monthly_price: float
    yearly_price: float
    monthly_analysis_quota: int
    export_enabled: bool
    advanced_models: bool
    team_seats: int
    allowed_model_profiles: list[ModelProfile] = Field(default_factory=list)
    max_concurrent_jobs: int = 1
    highlight: str = ""
    features: list[str] = Field(default_factory=list)


class OrganizationRecord(StrictBaseModel):
    id: str
    name: str
    slug: str
    owner_user_id: str


class OrganizationMemberRecord(StrictBaseModel):
    id: str
    user_id: str
    name: str
    email: str
    company: str
    platform_role: UserRole
    organization_role: OrganizationRole
    joined_at: datetime


class SubscriptionRecord(StrictBaseModel):
    id: str
    organization_id: str
    plan_id: str
    plan_name: str
    billing_cycle: BillingCycle
    status: SubscriptionStatus
    amount: float
    currency: str
    provider: str
    cancel_at_period_end: bool
    current_period_start: datetime
    current_period_end: datetime


class BillingOrderRecord(StrictBaseModel):
    id: str
    organization_id: str
    user_id: str
    plan_id: str
    plan_name: str
    billing_cycle: BillingCycle
    amount: float
    currency: str
    status: OrderStatus
    provider: str
    provider_reference: str
    created_at: datetime
    paid_at: datetime | None


class AuditLogRecord(StrictBaseModel):
    id: str
    actor_user_id: str
    actor_name: str
    organization_id: str
    action: str
    entity_type: str
    entity_id: str
    summary: str
    created_at: datetime


class CurrentUserRecord(StrictBaseModel):
    id: str
    name: str
    email: str
    company: str
    role: UserRole
    auth_status: AuthStatus
    plan: PlanRecord
    monthly_usage: int
    monthly_limit: int
    remaining_quota: int
    can_access_admin: bool
    active_job_count: int = 0
    organization: OrganizationRecord | None = None
    organization_role: OrganizationRole | None = None
    active_subscription: SubscriptionRecord | None = None


class DemoLoginRecord(StrictBaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    company: str
    password_hint: str
    plan_name: str


class AuthRegisterRequest(StrictBaseModel):
    name: str
    email: str
    company: str = ""
    password: str = Field(min_length=8)
    organization_name: str = ""


class AuthLoginRequest(StrictBaseModel):
    email: str
    password: str


class AuthSessionRecord(StrictBaseModel):
    access_token: str
    expires_at: datetime
    user: CurrentUserRecord


class LogoutResponse(StrictBaseModel):
    message: str


class SwitchPlanRequest(StrictBaseModel):
    plan_id: str
    billing_cycle: BillingCycle = "monthly"


class SwitchPlanResponse(StrictBaseModel):
    message: str
    user: CurrentUserRecord
    subscription: SubscriptionRecord
    order: BillingOrderRecord


class CreateMemberRequest(StrictBaseModel):
    name: str
    email: str
    company: str = ""
    password: str = Field(min_length=8)
    role: OrganizationRole = "member"


class CreateMemberResponse(StrictBaseModel):
    message: str
    member: OrganizationMemberRecord


class PlanDistributionItem(StrictBaseModel):
    plan_id: str
    plan_name: str
    users: int
    monthly_revenue: float


class RecentAnalysisItem(StrictBaseModel):
    id: str
    title: str
    summary: str
    updated_at: datetime


class AdminOverviewRecord(StrictBaseModel):
    total_users: int
    paid_users: int
    enterprise_users: int
    total_analyses: int
    total_organizations: int
    active_subscriptions: int
    monthly_paid_orders: int
    estimated_mrr: float
    average_usage_rate: float
    queued_jobs: int
    running_jobs: int
    failed_jobs: int
    completed_jobs: int
    plan_distribution: list[PlanDistributionItem]
    recent_analyses: list[RecentAnalysisItem]


class AdminUserRecord(StrictBaseModel):
    id: str
    name: str
    email: str
    company: str
    role: UserRole
    auth_status: AuthStatus
    organization_id: str | None = None
    organization_name: str
    organization_role: OrganizationRole | None = None
    plan_id: str
    plan_name: str
    monthly_usage: int
    monthly_limit: int
    remaining_quota: int
    active_job_count: int
    allowed_model_profiles: list[ModelProfile] = Field(default_factory=list)
    updated_at: datetime


class AdminOrganizationRecord(StrictBaseModel):
    id: str
    name: str
    slug: str
    owner_user_id: str
    member_count: int
    active_plan_name: str
    subscription_status: SubscriptionStatus | None = None


class AdminPlanRecord(PlanRecord):
    assigned_users: int = 0
    active_organizations: int = 0
    average_usage_rate: float = 0.0


class AdminUserUpdateRequest(StrictBaseModel):
    name: str | None = None
    company: str | None = None
    role: UserRole | None = None
    auth_status: AuthStatus | None = None
    organization_role: OrganizationRole | None = None
    plan_id: str | None = None
    monthly_usage: int | None = Field(default=None, ge=0)


class AdminPlanUpdateRequest(StrictBaseModel):
    name: str | None = None
    description: str | None = None
    monthly_price: float | None = Field(default=None, ge=0)
    yearly_price: float | None = Field(default=None, ge=0)
    monthly_analysis_quota: int | None = Field(default=None, ge=0)
    export_enabled: bool | None = None
    advanced_models: bool | None = None
    team_seats: int | None = Field(default=None, ge=1)


class AccountOverviewRecord(StrictBaseModel):
    user: CurrentUserRecord
    available_plans: list[PlanRecord]
    organization: OrganizationRecord | None = None
    members: list[OrganizationMemberRecord] = Field(default_factory=list)
    active_subscription: SubscriptionRecord | None = None
    recent_orders: list[BillingOrderRecord] = Field(default_factory=list)
    recent_audits: list[AuditLogRecord] = Field(default_factory=list)
    recent_analyses: list[AnalysisRecord] = Field(default_factory=list)
    recent_jobs: list[AnalysisJobRecord] = Field(default_factory=list)


class SystemRuntimeRecord(StrictBaseModel):
    app_name: str
    app_version: str
    llm_provider: str
    active_model: str
    database_mode: str
    fallback_to_mock: bool
    demo_auth_enabled: bool
    capabilities: list[str]
