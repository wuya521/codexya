import { clearSessionToken, getSessionToken } from "@/lib/auth";
import type {
  AccountOverviewRecord,
  AdminRedemptionCodeCreateRequest,
  AdminRedemptionCodeUpdateRequest,
  AdminUserCreateRequest,
  AdminUserDeleteResponse,
  RedemptionCodeRecord,
  RedeemCodeResponse,
  AdminOrganizationRecord,
  AdminOverviewRecord,
  AdminPlanRecord,
  AdminPlanUpdateRequest,
  AdminUserRecord,
  AdminUserUpdateRequest,
  AuditLogRecord,
  AuthSessionRecord,
  BillingOrderRecord,
  CreateMemberRequest,
  CreateMemberResponse,
  CurrentUserRecord,
  DemoLoginRecord,
  PlanRecord,
  SubscriptionRecord,
  SwitchPlanResponse,
  SystemRuntimeRecord
} from "@/types/account";
import type {
  AnalysisJobRecord,
  AnalysisRecord,
  AnalysisRequest,
  TemplateRecord
} from "@/types/analysis";

type ApiRequestInit = RequestInit & {
  demoUserId?: string;
  authToken?: string | null;
  requiresAuth?: boolean;
  timeoutMs?: number;
};

type ErrorPayload = {
  detail?:
    | string
    | {
        message?: string;
        code?: string;
        meta?: unknown;
      };
};

export class ApiError extends Error {
  status: number;
  code?: string;
  meta?: unknown;

  constructor(message: string, status = 500, code?: string, meta?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.meta = meta;
  }
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

async function readJson<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const {
    demoUserId,
    authToken,
    requiresAuth,
    timeoutMs = 15000,
    headers,
    ...rest
  } = init ?? {};
  const resolvedToken =
    authToken ??
    (requiresAuth && typeof document !== "undefined" ? getSessionToken() : null);

  if (requiresAuth && !resolvedToken && !demoUserId) {
    throw new ApiError("请先登录。", 401);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
        ...(demoUserId ? { "X-Demo-User": demoUserId } : {}),
        ...(headers ?? {})
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      const payload = await tryReadErrorPayload(response);
      if (response.status === 401 && resolvedToken) {
        clearSessionToken();
      }
      throw new ApiError(
        payload.message || `请求失败，状态码 ${response.status}`,
        response.status,
        payload.code,
        payload.meta
      );
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("请求超时，请稍后重试。", 408);
    }
    throw new ApiError("服务暂时不可用，请稍后再试。", 503);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function tryReadErrorPayload(
  response: Response
): Promise<{ message: string; code?: string; meta?: unknown }> {
  try {
    const payload = (await response.json()) as ErrorPayload;
    if (typeof payload.detail === "string") {
      return { message: payload.detail };
    }
    return {
      message: payload.detail?.message ?? "",
      code: payload.detail?.code,
      meta: payload.detail?.meta
    };
  } catch {
    return { message: "" };
  }
}

export function buildAnalysisJobEventsUrl(jobId: string, accessToken: string): string {
  const query = new URLSearchParams({ access_token: accessToken });
  return `${API_BASE_URL}/api/analysis-jobs/${jobId}/events?${query.toString()}`;
}

export async function getTemplates(): Promise<TemplateRecord[]> {
  return readJson<TemplateRecord[]>("/api/templates");
}

export async function getSystemRuntime(): Promise<SystemRuntimeRecord> {
  return readJson<SystemRuntimeRecord>("/api/system/runtime");
}

export async function getAnalyses(): Promise<AnalysisRecord[]> {
  return readJson<AnalysisRecord[]>("/api/analyses");
}

export async function getMyAnalyses(): Promise<AnalysisRecord[]> {
  return readJson<AnalysisRecord[]>("/api/analyses/my", {
    requiresAuth: true
  });
}

export async function getAnalysis(id: string): Promise<AnalysisRecord> {
  return readJson<AnalysisRecord>(`/api/analyses/${id}`);
}

export async function createAnalysis(payload: AnalysisRequest): Promise<AnalysisRecord> {
  return readJson<AnalysisRecord>("/api/analyses", {
    method: "POST",
    body: JSON.stringify(payload),
    requiresAuth: true,
    timeoutMs: 180000
  });
}

export async function rerunAnalysis(id: string): Promise<AnalysisRecord> {
  return readJson<AnalysisRecord>(`/api/analyses/${id}/rerun`, {
    method: "POST",
    requiresAuth: true,
    timeoutMs: 180000
  });
}

export async function createAnalysisJob(payload: AnalysisRequest): Promise<AnalysisJobRecord> {
  return readJson<AnalysisJobRecord>("/api/analysis-jobs", {
    method: "POST",
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function rerunAnalysisJob(analysisId: string): Promise<AnalysisJobRecord> {
  return readJson<AnalysisJobRecord>(`/api/analysis-jobs/rerun/${analysisId}`, {
    method: "POST",
    requiresAuth: true
  });
}

export async function getAnalysisJob(jobId: string): Promise<AnalysisJobRecord> {
  return readJson<AnalysisJobRecord>(`/api/analysis-jobs/${jobId}`, {
    requiresAuth: true
  });
}

export async function getMyAnalysisJobs(): Promise<AnalysisJobRecord[]> {
  return readJson<AnalysisJobRecord[]>("/api/analysis-jobs/my", {
    requiresAuth: true
  });
}

export async function getDemoUsers(): Promise<DemoLoginRecord[]> {
  try {
    return await readJson<DemoLoginRecord[]>("/api/auth/demo-users");
  } catch {
    return [];
  }
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
}): Promise<AuthSessionRecord> {
  return readJson<AuthSessionRecord>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function registerAccount(input: {
  name: string;
  email: string;
  company: string;
  password: string;
  organization_name: string;
}): Promise<AuthSessionRecord> {
  return readJson<AuthSessionRecord>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function getSession(): Promise<CurrentUserRecord | null> {
  const token = typeof document !== "undefined" ? getSessionToken() : null;
  if (!token) {
    return null;
  }

  try {
    return await readJson<CurrentUserRecord>("/api/auth/session", {
      authToken: token,
      requiresAuth: true
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearSessionToken();
      return null;
    }
    throw error;
  }
}

export async function logoutSession(): Promise<void> {
  const token = typeof document !== "undefined" ? getSessionToken() : null;
  if (!token) {
    clearSessionToken();
    return;
  }

  try {
    await readJson<{ message: string }>("/api/auth/logout", {
      method: "POST",
      authToken: token,
      requiresAuth: true
    });
  } finally {
    clearSessionToken();
  }
}

export async function getCurrentUser(): Promise<CurrentUserRecord> {
  const session = await getSession();
  if (!session) {
    throw new ApiError("请先登录。", 401);
  }
  return session;
}

export async function getMembershipPlans(): Promise<PlanRecord[]> {
  return readJson<PlanRecord[]>("/api/plans");
}

export async function getAccountOverview(): Promise<AccountOverviewRecord> {
  return readJson<AccountOverviewRecord>("/api/account/overview", {
    requiresAuth: true
  });
}

export async function createOrganizationMember(
  payload: CreateMemberRequest
): Promise<CreateMemberResponse> {
  return readJson<CreateMemberResponse>("/api/account/members", {
    method: "POST",
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function getBillingOrders(): Promise<BillingOrderRecord[]> {
  return readJson<BillingOrderRecord[]>("/api/billing/orders", {
    requiresAuth: true
  });
}

export async function getBillingSubscription(): Promise<SubscriptionRecord | null> {
  return readJson<SubscriptionRecord | null>("/api/billing/subscription", {
    requiresAuth: true
  });
}

export async function switchPlan(
  planId: string,
  billingCycle: "monthly" | "yearly" = "monthly"
): Promise<SwitchPlanResponse> {
  return readJson<SwitchPlanResponse>("/api/billing/switch-plan", {
    method: "POST",
    body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle }),
    requiresAuth: true
  });
}

export async function redeemCode(code: string): Promise<RedeemCodeResponse> {
  return readJson<RedeemCodeResponse>("/api/billing/redeem-code", {
    method: "POST",
    body: JSON.stringify({ code }),
    requiresAuth: true
  });
}

export async function getAdminOverview(): Promise<AdminOverviewRecord> {
  return readJson<AdminOverviewRecord>("/api/admin/overview", {
    requiresAuth: true
  });
}

export async function getAdminUsers(): Promise<AdminUserRecord[]> {
  return readJson<AdminUserRecord[]>("/api/admin/users", {
    requiresAuth: true
  });
}

export async function updateAdminUser(
  userId: string,
  payload: AdminUserUpdateRequest
): Promise<AdminUserRecord> {
  return readJson<AdminUserRecord>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function createAdminUser(
  payload: AdminUserCreateRequest
): Promise<AdminUserRecord> {
  return readJson<AdminUserRecord>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function deleteAdminUser(
  userId: string
): Promise<AdminUserDeleteResponse> {
  return readJson<AdminUserDeleteResponse>(`/api/admin/users/${userId}`, {
    method: "DELETE",
    requiresAuth: true
  });
}

export async function getAdminOrganizations(): Promise<AdminOrganizationRecord[]> {
  return readJson<AdminOrganizationRecord[]>("/api/admin/organizations", {
    requiresAuth: true
  });
}

export async function getAdminPlans(): Promise<AdminPlanRecord[]> {
  return readJson<AdminPlanRecord[]>("/api/admin/plans", {
    requiresAuth: true
  });
}

export async function getAdminRedemptionCodes(): Promise<RedemptionCodeRecord[]> {
  return readJson<RedemptionCodeRecord[]>("/api/admin/redemption-codes", {
    requiresAuth: true
  });
}

export async function createAdminRedemptionCodes(
  payload: AdminRedemptionCodeCreateRequest
): Promise<RedemptionCodeRecord[]> {
  return readJson<RedemptionCodeRecord[]>("/api/admin/redemption-codes", {
    method: "POST",
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function updateAdminRedemptionCode(
  redemptionCodeId: string,
  payload: AdminRedemptionCodeUpdateRequest
): Promise<RedemptionCodeRecord> {
  return readJson<RedemptionCodeRecord>(`/api/admin/redemption-codes/${redemptionCodeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function deleteAdminRedemptionCode(
  redemptionCodeId: string
): Promise<{ message: string }> {
  return readJson<{ message: string }>(`/api/admin/redemption-codes/${redemptionCodeId}`, {
    method: "DELETE",
    requiresAuth: true
  });
}

export async function updateAdminPlan(
  planId: string,
  payload: AdminPlanUpdateRequest
): Promise<AdminPlanRecord> {
  return readJson<AdminPlanRecord>(`/api/admin/plans/${planId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function getAdminJobs(): Promise<AnalysisJobRecord[]> {
  return readJson<AnalysisJobRecord[]>("/api/admin/jobs", {
    requiresAuth: true
  });
}

export async function getAdminOrders(): Promise<BillingOrderRecord[]> {
  return readJson<BillingOrderRecord[]>("/api/admin/orders", {
    requiresAuth: true
  });
}

export async function getAdminAudits(): Promise<AuditLogRecord[]> {
  return readJson<AuditLogRecord[]>("/api/admin/audits", {
    requiresAuth: true
  });
}
