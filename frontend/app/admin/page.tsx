"use client";

import { useEffect, useState } from "react";

import { PageStatus } from "@/components/page-status";
import { SectionCard } from "@/components/section-card";
import {
  getAdminAudits,
  getAdminJobs,
  getAdminOrders,
  getAdminOrganizations,
  getAdminOverview,
  getAdminPlans,
  getAdminUsers,
  getSession,
  updateAdminPlan,
  updateAdminUser
} from "@/lib/api";
import {
  formatDateTime,
  getJobStatusLabel,
  getModelProfileLabel
} from "@/lib/display";
import type {
  AdminOrganizationRecord,
  AdminOverviewRecord,
  AdminPlanRecord,
  AdminUserRecord,
  AuditLogRecord,
  BillingOrderRecord,
  CurrentUserRecord
} from "@/types/account";
import type { AnalysisJobRecord } from "@/types/analysis";

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0
});

export default function AdminPage() {
  const [sessionUser, setSessionUser] = useState<CurrentUserRecord | null>(null);
  const [overview, setOverview] = useState<AdminOverviewRecord | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [organizations, setOrganizations] = useState<AdminOrganizationRecord[]>([]);
  const [plans, setPlans] = useState<AdminPlanRecord[]>([]);
  const [jobs, setJobs] = useState<AnalysisJobRecord[]>([]);
  const [orders, setOrders] = useState<BillingOrderRecord[]>([]);
  const [audits, setAudits] = useState<AuditLogRecord[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState("");
  const [savingPlanId, setSavingPlanId] = useState("");

  useEffect(() => {
    void refreshAll();
  }, []);

  const refreshAll = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [
        user,
        nextOverview,
        nextUsers,
        nextOrganizations,
        nextPlans,
        nextJobs,
        nextOrders,
        nextAudits
      ] = await Promise.all([
        getSession(),
        getAdminOverview(),
        getAdminUsers(),
        getAdminOrganizations(),
        getAdminPlans(),
        getAdminJobs(),
        getAdminOrders(),
        getAdminAudits()
      ]);
      setSessionUser(user);
      setOverview(nextOverview);
      setUsers(nextUsers);
      setOrganizations(nextOrganizations);
      setPlans(nextPlans);
      setJobs(nextJobs);
      setOrders(nextOrders);
      setAudits(nextAudits);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "后台加载失败。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSave = async (userId: string, payload: Partial<AdminUserRecord>) => {
    setSavingUserId(userId);
    setNotice("");
    setError("");
    try {
      const updated = await updateAdminUser(userId, {
        name: payload.name,
        company: payload.company,
        role: payload.role,
        auth_status: payload.auth_status,
        organization_role: payload.organization_role ?? undefined,
        plan_id: payload.plan_id,
        monthly_usage: payload.monthly_usage
      });
      setUsers((current) => current.map((item) => (item.id === userId ? updated : item)));
      const nextOverview = await getAdminOverview();
      setOverview(nextOverview);
      setNotice(`账号 ${updated.email} 已更新。`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "更新账号失败。");
    } finally {
      setSavingUserId("");
    }
  };

  const handlePlanSave = async (planId: string, payload: Partial<AdminPlanRecord>) => {
    setSavingPlanId(planId);
    setNotice("");
    setError("");
    try {
      const updated = await updateAdminPlan(planId, {
        name: payload.name,
        description: payload.description,
        monthly_price: payload.monthly_price,
        yearly_price: payload.yearly_price,
        monthly_analysis_quota: payload.monthly_analysis_quota,
        export_enabled: payload.export_enabled,
        advanced_models: payload.advanced_models,
        team_seats: payload.team_seats
      });
      setPlans((current) => current.map((item) => (item.id === planId ? updated : item)));
      const nextOverview = await getAdminOverview();
      setOverview(nextOverview);
      setNotice(`套餐 ${updated.name} 已更新。`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "更新套餐失败。");
    } finally {
      setSavingPlanId("");
    }
  };

  if (isLoading) {
    return (
      <PageStatus
        eyebrow="运营后台"
        title="正在加载运营后台"
        description="系统正在拉取用户、套餐、队列、订单和审计数据。"
      />
    );
  }

  if (!sessionUser || !overview) {
    return (
      <PageStatus
        eyebrow="运营后台"
        title="用户、营收与作业后台"
        description={error || "请使用管理员账号登录后再访问后台。"}
        actionHref="/login"
        actionLabel="去登录"
      />
    );
  }

  if (!sessionUser.can_access_admin) {
    return (
      <PageStatus
        eyebrow="运营后台"
        title="当前账号没有后台权限"
        description="请使用管理员账号登录后再访问后台。"
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="eyebrow">运营后台</p>
        <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
          账号、套餐、队列与营收控制台
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          后台现在不只是看板，而是可以直接管理注册账户、套餐额度、模型权限和异步任务。
        </p>
        {notice ? <p className="mt-4 text-sm text-brand">{notice}</p> : null}
        {error ? <p className="mt-2 text-sm text-warning">{error}</p> : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-8">
        <MetricCard label="总用户数" value={String(overview.total_users)} />
        <MetricCard label="活跃订阅" value={String(overview.active_subscriptions)} />
        <MetricCard label="排队任务" value={String(overview.queued_jobs)} />
        <MetricCard label="执行中" value={String(overview.running_jobs)} />
        <MetricCard label="失败任务" value={String(overview.failed_jobs)} />
        <MetricCard label="估算 MRR" value={currencyFormatter.format(overview.estimated_mrr)} />
        <MetricCard label="付费订单" value={String(overview.monthly_paid_orders)} />
        <MetricCard label="平均使用率" value={`${Math.round(overview.average_usage_rate * 100)}%`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="异步任务队列"
          eyebrow="Queue"
          description="这里显示真实运行中的任务，而不是前端拼出来的假状态。"
        >
          <div className="space-y-4">
            {jobs.slice(0, 8).map((job) => (
              <div
                key={job.id}
                className="rounded-[1.25rem] border border-line bg-canvas p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-ink">{job.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {getJobStatusLabel(job.status)} / {getModelProfileLabel(job.model_profile)}
                    </p>
                  </div>
                  <p className="text-sm text-ink">{job.progress}%</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{job.step}</p>
                <p className="mt-2 text-xs text-muted">
                  {formatDateTime(job.created_at)} / {job.selected_model}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="组织分布与营收结构"
          eyebrow="Revenue Mix"
          description="用组织视角看当前付费结构，便于后续做销售和交付。"
        >
          <div className="space-y-4">
            {organizations.map((organization) => (
              <div
                key={organization.id}
                className="rounded-[1.25rem] border border-line bg-canvas p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-ink">
                      {organization.name}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {organization.active_plan_name} / {organization.subscription_status ?? "未开通"}
                    </p>
                  </div>
                  <p className="text-sm text-muted">成员 {organization.member_count}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="注册账户管理"
        eyebrow="Accounts"
        description="这里可以直接调整角色、状态、套餐和月度用量。"
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {users.map((user) => (
            <EditableUserCard
              key={user.id}
              user={user}
              plans={plans}
              isSaving={savingUserId === user.id}
              onSave={handleUserSave}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="套餐额度与模型权限"
        eyebrow="Plans"
        description="月度额度、价格、是否开放高级模型和团队席位都在这里维护。"
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {plans.map((plan) => (
            <EditablePlanCard
              key={plan.id}
              plan={plan}
              isSaving={savingPlanId === plan.id}
              onSave={handlePlanSave}
            />
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <SectionCard title="最近订单" eyebrow="Orders">
          <div className="space-y-4">
            {orders.slice(0, 6).map((order) => (
              <div
                key={order.id}
                className="rounded-[1.25rem] border border-line bg-canvas p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{order.plan_name}</p>
                  <p className="text-sm text-ink">
                    {currencyFormatter.format(order.amount)}
                  </p>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {order.billing_cycle} / {order.status} / {formatDateTime(order.created_at)}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="最近审计日志" eyebrow="Audits">
          <div className="space-y-4">
            {audits.slice(0, 8).map((audit) => (
              <div
                key={audit.id}
                className="rounded-[1.25rem] border border-line bg-canvas p-5"
              >
                <p className="font-semibold text-ink">{audit.summary}</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {audit.action} / {formatDateTime(audit.created_at)}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-line bg-panel p-5 shadow-panel">
      <p className="text-xs uppercase tracking-[0.22em] text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function EditableUserCard({
  user,
  plans,
  isSaving,
  onSave
}: {
  user: AdminUserRecord;
  plans: AdminPlanRecord[];
  isSaving: boolean;
  onSave: (userId: string, payload: Partial<AdminUserRecord>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AdminUserRecord>(user);

  useEffect(() => {
    setDraft(user);
  }, [user]);

  return (
    <div className="rounded-[1.5rem] border border-line bg-canvas p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-ink">{user.name}</p>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
        </div>
        <p className="text-xs tracking-[0.16em] text-muted">
          {formatDateTime(user.updated_at)}
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">平台角色</span>
          <select
            className="input-base"
            value={draft.role}
            onChange={(event) =>
              setDraft((current) => ({ ...current, role: event.target.value as AdminUserRecord["role"] }))
            }
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">登录状态</span>
          <select
            className="input-base"
            value={draft.auth_status}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                auth_status: event.target.value as AdminUserRecord["auth_status"]
              }))
            }
          >
            <option value="active">active</option>
            <option value="suspended">suspended</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">组织角色</span>
          <select
            className="input-base"
            value={draft.organization_role ?? "member"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                organization_role: event.target.value as AdminUserRecord["organization_role"]
              }))
            }
          >
            <option value="owner">owner</option>
            <option value="admin">admin</option>
            <option value="member">member</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">套餐</span>
          <select
            className="input-base"
            value={draft.plan_id}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                plan_id: event.target.value,
                plan_name:
                  plans.find((item) => item.id === event.target.value)?.name ?? current.plan_name
              }))
            }
          >
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">已用额度</span>
          <input
            className="input-base"
            type="number"
            min={0}
            value={draft.monthly_usage}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                monthly_usage: Number(event.target.value || 0)
              }))
            }
          />
        </label>
        <div className="rounded-[1.1rem] border border-line bg-panel/70 p-4 text-sm text-muted">
          <p>当前组织：{user.organization_name}</p>
          <p className="mt-2">活动任务：{user.active_job_count}</p>
          <p className="mt-2">
            可用模型：{user.allowed_model_profiles.map((item) => getModelProfileLabel(item)).join(" / ")}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="button-primary mt-5"
        disabled={isSaving}
        onClick={() => void onSave(user.id, draft)}
      >
        {isSaving ? "保存中..." : "保存账号设置"}
      </button>
    </div>
  );
}

function EditablePlanCard({
  plan,
  isSaving,
  onSave
}: {
  plan: AdminPlanRecord;
  isSaving: boolean;
  onSave: (planId: string, payload: Partial<AdminPlanRecord>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AdminPlanRecord>(plan);

  useEffect(() => {
    setDraft(plan);
  }, [plan]);

  return (
    <div className="rounded-[1.5rem] border border-line bg-canvas p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-ink">{plan.name}</p>
          <p className="mt-1 text-sm text-muted">{plan.tier}</p>
        </div>
        <div className="text-right text-sm text-muted">
          <p>用户 {plan.assigned_users}</p>
          <p className="mt-1">组织 {plan.active_organizations}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">月费</span>
          <input
            className="input-base"
            type="number"
            min={0}
            value={draft.monthly_price}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                monthly_price: Number(event.target.value || 0)
              }))
            }
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">年费</span>
          <input
            className="input-base"
            type="number"
            min={0}
            value={draft.yearly_price}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                yearly_price: Number(event.target.value || 0)
              }))
            }
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">月度额度</span>
          <input
            className="input-base"
            type="number"
            min={0}
            value={draft.monthly_analysis_quota}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                monthly_analysis_quota: Number(event.target.value || 0)
              }))
            }
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">团队席位</span>
          <input
            className="input-base"
            type="number"
            min={1}
            value={draft.team_seats}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                team_seats: Number(event.target.value || 1)
              }))
            }
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">支持导出</span>
          <select
            className="input-base"
            value={draft.export_enabled ? "true" : "false"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                export_enabled: event.target.value === "true"
              }))
            }
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">高级模型</span>
          <select
            className="input-base"
            value={draft.advanced_models ? "true" : "false"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                advanced_models: event.target.value === "true"
              }))
            }
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-line bg-panel/70 p-4 text-sm leading-6 text-muted">
        <p>平均使用率：{Math.round(plan.average_usage_rate * 100)}%</p>
        <p className="mt-2">
          当前档位：{plan.allowed_model_profiles.map((item) => getModelProfileLabel(item)).join(" / ")}
        </p>
        <p className="mt-2">并发任务：{plan.max_concurrent_jobs}</p>
      </div>

      <button
        type="button"
        className="button-primary mt-5"
        disabled={isSaving}
        onClick={() => void onSave(plan.id, draft)}
      >
        {isSaving ? "保存中..." : "保存套餐配置"}
      </button>
    </div>
  );
}
