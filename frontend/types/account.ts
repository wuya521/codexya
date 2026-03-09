import type { AnalysisJobRecord, AnalysisRecord, ModelProfile } from "@/types/analysis";

export type PlanTier = "free" | "pro" | "vip" | "enterprise";
export type UserRole = "user" | "admin";
export type OrganizationRole = "owner" | "admin" | "member";
export type BillingCycle = "monthly" | "yearly";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";
export type OrderStatus = "pending" | "paid" | "failed" | "refunded";
export type AuthStatus = "active" | "suspended";

export interface PlanRecord {
  id: string;
  name: string;
  tier: PlanTier;
  description: string;
  monthly_price: number;
  yearly_price: number;
  monthly_analysis_quota: number;
  export_enabled: boolean;
  advanced_models: boolean;
  team_seats: number;
  allowed_model_profiles: ModelProfile[];
  max_concurrent_jobs: number;
  highlight: string;
  features: string[];
}

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
}

export interface OrganizationMemberRecord {
  id: string;
  user_id: string;
  name: string;
  email: string;
  company: string;
  platform_role: UserRole;
  organization_role: OrganizationRole;
  joined_at: string;
}

export interface SubscriptionRecord {
  id: string;
  organization_id: string;
  plan_id: string;
  plan_name: string;
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  provider: string;
  cancel_at_period_end: boolean;
  current_period_start: string;
  current_period_end: string;
}

export interface BillingOrderRecord {
  id: string;
  organization_id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  billing_cycle: BillingCycle;
  amount: number;
  currency: string;
  status: OrderStatus;
  provider: string;
  provider_reference: string;
  created_at: string;
  paid_at: string | null;
}

export interface AuditLogRecord {
  id: string;
  actor_user_id: string;
  actor_name: string;
  organization_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  created_at: string;
}

export interface CurrentUserRecord {
  id: string;
  name: string;
  email: string;
  company: string;
  role: UserRole;
  auth_status: AuthStatus;
  plan: PlanRecord;
  monthly_usage: number;
  monthly_limit: number;
  remaining_quota: number;
  can_access_admin: boolean;
  active_job_count: number;
  organization: OrganizationRecord | null;
  organization_role: OrganizationRole | null;
  active_subscription: SubscriptionRecord | null;
}

export interface DemoLoginRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company: string;
  password_hint: string;
  plan_name: string;
}

export interface AuthSessionRecord {
  access_token: string;
  expires_at: string;
  user: CurrentUserRecord;
}

export interface CreateMemberRequest {
  name: string;
  email: string;
  company: string;
  password: string;
  role: OrganizationRole;
}

export interface CreateMemberResponse {
  message: string;
  member: OrganizationMemberRecord;
}

export interface SwitchPlanResponse {
  message: string;
  user: CurrentUserRecord;
  subscription: SubscriptionRecord;
  order: BillingOrderRecord;
}

export interface PlanDistributionItem {
  plan_id: string;
  plan_name: string;
  users: number;
  monthly_revenue: number;
}

export interface RecentAnalysisItem {
  id: string;
  title: string;
  summary: string;
  updated_at: string;
}

export interface AdminOverviewRecord {
  total_users: number;
  paid_users: number;
  enterprise_users: number;
  total_analyses: number;
  total_organizations: number;
  active_subscriptions: number;
  monthly_paid_orders: number;
  estimated_mrr: number;
  average_usage_rate: number;
  queued_jobs: number;
  running_jobs: number;
  failed_jobs: number;
  completed_jobs: number;
  plan_distribution: PlanDistributionItem[];
  recent_analyses: RecentAnalysisItem[];
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  company: string;
  role: UserRole;
  auth_status: AuthStatus;
  organization_id: string | null;
  organization_name: string;
  organization_role: OrganizationRole | null;
  plan_id: string;
  plan_name: string;
  monthly_usage: number;
  monthly_limit: number;
  remaining_quota: number;
  active_job_count: number;
  allowed_model_profiles: ModelProfile[];
  updated_at: string;
}

export interface AdminOrganizationRecord {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  member_count: number;
  active_plan_name: string;
  subscription_status: SubscriptionStatus | null;
}

export interface AdminPlanRecord extends PlanRecord {
  assigned_users: number;
  active_organizations: number;
  average_usage_rate: number;
}

export interface AdminUserUpdateRequest {
  name?: string;
  company?: string;
  role?: UserRole;
  auth_status?: AuthStatus;
  organization_role?: OrganizationRole;
  plan_id?: string;
  monthly_usage?: number;
}

export interface AdminUserCreateRequest {
  name: string;
  email: string;
  company: string;
  password: string;
  role: UserRole;
  plan_id: string;
}

export interface AdminUserDeleteResponse {
  message: string;
}

export interface AdminPlanUpdateRequest {
  name?: string;
  description?: string;
  monthly_price?: number;
  yearly_price?: number;
  monthly_analysis_quota?: number;
  export_enabled?: boolean;
  advanced_models?: boolean;
  team_seats?: number;
}

export interface AccountOverviewRecord {
  user: CurrentUserRecord;
  available_plans: PlanRecord[];
  organization: OrganizationRecord | null;
  members: OrganizationMemberRecord[];
  active_subscription: SubscriptionRecord | null;
  recent_orders: BillingOrderRecord[];
  recent_audits: AuditLogRecord[];
  recent_analyses: AnalysisRecord[];
  recent_jobs: AnalysisJobRecord[];
}

export interface SystemRuntimeRecord {
  app_name: string;
  app_version: string;
  llm_provider: string;
  active_model: string;
  database_mode: string;
  fallback_to_mock: boolean;
  demo_auth_enabled: boolean;
  capabilities: string[];
}
