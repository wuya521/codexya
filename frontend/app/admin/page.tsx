"use client";

import { useEffect, useMemo, useState } from "react";

import { CollapsiblePanel } from "@/components/collapsible-panel";
import { PageStatus } from "@/components/page-status";
import { PaginationControls } from "@/components/pagination-controls";
import { SectionCard } from "@/components/section-card";
import {
  createAdminRedemptionCodes,
  createAdminUser,
  deleteAdminRedemptionCode,
  deleteAdminUser,
  getAdminAudits,
  getAdminJobs,
  getAdminOrders,
  getAdminOrganizations,
  getAdminOverview,
  getAdminPlans,
  getAdminRedemptionCodes,
  getAdminUsers,
  getSession,
  updateAdminRedemptionCode,
  updateAdminPlan,
  updateAdminUser
} from "@/lib/api";
import {
  formatDateTime,
  getJobStatusLabel,
  getModelProfileLabel
} from "@/lib/display";
import { useToastStore } from "@/store/toast-store";
import type {
  AdminRedemptionCodeCreateRequest,
  AdminOrganizationRecord,
  AdminOverviewRecord,
  AdminPlanRecord,
  AdminUserCreateRequest,
  AdminUserRecord,
  AuditLogRecord,
  BillingOrderRecord,
  CurrentUserRecord,
  RedemptionCodeRecord
} from "@/types/account";
import type { AnalysisJobRecord } from "@/types/analysis";

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0
});

const userPageSize = 6;

const initialCreateForm: AdminUserCreateRequest = {
  name: "",
  email: "",
  company: "",
  password: "Demo12345!",
  role: "user",
  plan_id: "plan-free"
};

const initialRedemptionForm: AdminRedemptionCodeCreateRequest = {
  reward_type: "plan",
  plan_id: "plan-pro",
  billing_cycle: "monthly",
  quota_amount: 10,
  quantity: 1,
  note: ""
};

const redemptionStatusLabels: Record<"all" | RedemptionCodeRecord["status"], string> = {
  all: "全部",
  active: "可用",
  redeemed: "已兑换",
  disabled: "已停用",
  expired: "已过期"
};

export default function AdminPage() {
  const pushToast = useToastStore((state) => state.push);
  const [sessionUser, setSessionUser] = useState<CurrentUserRecord | null>(null);
  const [overview, setOverview] = useState<AdminOverviewRecord | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [organizations, setOrganizations] = useState<AdminOrganizationRecord[]>([]);
  const [plans, setPlans] = useState<AdminPlanRecord[]>([]);
  const [redemptionCodes, setRedemptionCodes] = useState<RedemptionCodeRecord[]>([]);
  const [jobs, setJobs] = useState<AnalysisJobRecord[]>([]);
  const [orders, setOrders] = useState<BillingOrderRecord[]>([]);
  const [audits, setAudits] = useState<AuditLogRecord[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState("");
  const [deletingUserId, setDeletingUserId] = useState("");
  const [savingPlanId, setSavingPlanId] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isCreatingRedemption, setIsCreatingRedemption] = useState(false);
  const [savingRedemptionId, setSavingRedemptionId] = useState("");
  const [deletingRedemptionId, setDeletingRedemptionId] = useState("");
  const [createForm, setCreateForm] = useState<AdminUserCreateRequest>(initialCreateForm);
  const [redemptionForm, setRedemptionForm] = useState<AdminRedemptionCodeCreateRequest>(initialRedemptionForm);
  const [userQuery, setUserQuery] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [redemptionFilter, setRedemptionFilter] = useState<"all" | "active" | "redeemed" | "disabled" | "expired">("all");

  useEffect(() => {
    void refreshAll();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = userQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return users;
    }
    return users.filter((user) =>
      `${user.name} ${user.email} ${user.company} ${user.plan_name}`
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [userQuery, users]);

  const filteredRedemptionCodes = useMemo(() => {
    if (redemptionFilter === "all") {
      return redemptionCodes;
    }
    return redemptionCodes.filter((item) => item.status === redemptionFilter);
  }, [redemptionCodes, redemptionFilter]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / userPageSize));
  const pagedUsers = filteredUsers.slice(
    (userPage - 1) * userPageSize,
    userPage * userPageSize
  );

  useEffect(() => {
    setUserPage(1);
  }, [userQuery]);

  useEffect(() => {
    if (userPage > totalUserPages) {
      setUserPage(totalUserPages);
    }
  }, [totalUserPages, userPage]);

  async function refreshAll() {
    setIsLoading(true);
    setError("");
    try {
      const [
        user,
        nextOverview,
        nextUsers,
        nextOrganizations,
        nextPlans,
        nextRedemptionCodes,
        nextJobs,
        nextOrders,
        nextAudits
      ] = await Promise.all([
        getSession(),
        getAdminOverview(),
        getAdminUsers(),
        getAdminOrganizations(),
        getAdminPlans(),
        getAdminRedemptionCodes(),
        getAdminJobs(),
        getAdminOrders(),
        getAdminAudits()
      ]);
      setSessionUser(user);
      setOverview(nextOverview);
      setUsers(nextUsers);
      setOrganizations(nextOrganizations);
      setPlans(nextPlans);
      setRedemptionCodes(nextRedemptionCodes);
      setJobs(nextJobs);
      setOrders(nextOrders);
      setAudits(nextAudits);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "后台加载失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUserSave(userId: string, payload: Partial<AdminUserRecord>) {
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
        monthly_usage: payload.monthly_usage,
        bonus_quota_balance: payload.bonus_quota_balance
      });
      setUsers((current) => current.map((item) => (item.id === userId ? updated : item)));
      setOverview(await getAdminOverview());
      setNotice(`已更新账号 ${updated.email}`);
      pushToast({
        tone: "success",
        title: "账号已保存",
        description: updated.email
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "更新账号失败。");
    } finally {
      setSavingUserId("");
    }
  }

  async function handleUserCreate() {
    setIsCreatingUser(true);
    setNotice("");
    setError("");
    try {
      const created = await createAdminUser(createForm);
      setUsers((current) => [created, ...current]);
      setCreateForm(initialCreateForm);
      setOverview(await getAdminOverview());
      setNotice(`已创建账号 ${created.email}`);
      pushToast({
        tone: "success",
        title: "新用户已创建",
        description: created.email
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "创建账号失败。");
    } finally {
      setIsCreatingUser(false);
    }
  }

  async function handleUserDelete(user: AdminUserRecord) {
    if (!window.confirm(`确认删除账号 ${user.email} 吗？`)) {
      return;
    }
    setDeletingUserId(user.id);
    setNotice("");
    setError("");
    try {
      const response = await deleteAdminUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setOverview(await getAdminOverview());
      setNotice(response.message);
      pushToast({
        tone: "success",
        title: "账号已删除",
        description: user.email
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "删除账号失败。");
    } finally {
      setDeletingUserId("");
    }
  }

  async function handlePlanSave(planId: string, payload: Partial<AdminPlanRecord>) {
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
      setOverview(await getAdminOverview());
      setNotice(`已更新套餐 ${updated.name}`);
      pushToast({
        tone: "success",
        title: "套餐已保存",
        description: updated.name
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "更新套餐失败。");
    } finally {
      setSavingPlanId("");
    }
  }

  async function handleRedemptionCreate() {
    setIsCreatingRedemption(true);
    setNotice("");
    setError("");
    try {
      const created = await createAdminRedemptionCodes({
        ...redemptionForm,
        plan_id: redemptionForm.reward_type === "plan" ? redemptionForm.plan_id : undefined,
        quota_amount: redemptionForm.reward_type === "quota" ? redemptionForm.quota_amount : undefined
      });
      setRedemptionCodes((current) => [...created, ...current]);
      setRedemptionForm(initialRedemptionForm);
      setNotice(`已创建 ${created.length} 个兑换码`);
      pushToast({
        tone: "success",
        title: "兑换码已生成",
        description: `本次生成 ${created.length} 个`
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "创建兑换码失败。");
    } finally {
      setIsCreatingRedemption(false);
    }
  }

  async function handleRedemptionStatusChange(
    redemptionCodeId: string,
    status: RedemptionCodeRecord["status"]
  ) {
    setSavingRedemptionId(redemptionCodeId);
    setError("");
    try {
      const updated = await updateAdminRedemptionCode(redemptionCodeId, { status });
      setRedemptionCodes((current) =>
        current.map((item) => (item.id === redemptionCodeId ? updated : item))
      );
      pushToast({
        tone: "success",
        title: "兑换码已更新",
        description: `${updated.code} / ${updated.status}`
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "更新兑换码失败。");
    } finally {
      setSavingRedemptionId("");
    }
  }

  async function handleRedemptionDelete(item: RedemptionCodeRecord) {
    if (!window.confirm(`确认删除兑换码 ${item.code} 吗？`)) {
      return;
    }
    setDeletingRedemptionId(item.id);
    setError("");
    try {
      await deleteAdminRedemptionCode(item.id);
      setRedemptionCodes((current) => current.filter((currentItem) => currentItem.id !== item.id));
      pushToast({
        tone: "success",
        title: "兑换码已删除",
        description: item.code
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "删除兑换码失败。");
    } finally {
      setDeletingRedemptionId("");
    }
  }

  if (isLoading) {
    return (
      <PageStatus
        eyebrow="Super OS 后台"
        title="正在加载运营控制台"
        description="系统正在拉取用户、套餐、任务和订单数据。"
      />
    );
  }

  if (!sessionUser || !overview) {
    return (
      <PageStatus
        eyebrow="Super OS 后台"
        title="运营控制台"
        description={error || "请使用管理员账号登录后再访问后台。"}
        actionHref="/login"
        actionLabel="去登录"
      />
    );
  }

  if (!sessionUser.can_access_admin) {
    return (
      <PageStatus
        eyebrow="Super OS 后台"
        title="当前账号没有后台权限"
        description="请使用管理员账号登录后再访问后台。"
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-[2rem] border border-line bg-panel p-7 shadow-panel lg:grid-cols-[1.12fr_0.88fr]">
        <div>
          <p className="eyebrow">Super OS 后台</p>
          <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
            运营台
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            默认只保留最常用的账户和套餐视图，其余模块收进折叠区里。后台应该帮助运营做决定，而不是把所有数据同时倾倒出来。
          </p>
          {notice ? <p className="mt-4 text-sm text-success">{notice}</p> : null}
          {error ? <p className="mt-2 text-sm text-warning">{error}</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard label="总用户" value={String(overview.total_users)} />
          <MetricCard label="活跃订阅" value={String(overview.active_subscriptions)} />
          <MetricCard label="排队任务" value={String(overview.queued_jobs + overview.running_jobs)} />
          <MetricCard label="估算 MRR" value={currencyFormatter.format(overview.estimated_mrr)} />
        </div>
      </section>

      <CollapsiblePanel
        title="账户管理"
        eyebrow="Users"
        description="先把账户创建、套餐切换、角色和额度控制好。"
        defaultOpen
        summary={`${users.length} 个账号`}
      >
        <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <SectionCard
            title="新增用户"
            eyebrow="Create"
            description="默认创建可登录账号，用户登录后可自行购买或切换套餐。"
            className="h-full"
          >
            <div className="grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">姓名</span>
                <input
                  className="input-base"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="例如：新用户"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">邮箱</span>
                <input
                  className="input-base"
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="name@company.com"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">公司</span>
                <input
                  className="input-base"
                  value={createForm.company}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, company: event.target.value }))
                  }
                  placeholder="可选"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-ink">角色</span>
                  <select
                    className="input-base"
                    value={createForm.role}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        role: event.target.value as AdminUserCreateRequest["role"]
                      }))
                    }
                  >
                    <option value="user">普通用户</option>
                    <option value="admin">管理员</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-ink">初始套餐</span>
                  <select
                    className="input-base"
                    value={createForm.plan_id}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        plan_id: event.target.value
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
              </div>
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">初始密码</span>
                <input
                  className="input-base"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="至少 8 位"
                />
              </label>
              <button
                type="button"
                className="button-primary w-full justify-center"
                disabled={isCreatingUser}
                onClick={() => void handleUserCreate()}
              >
                {isCreatingUser ? "创建中..." : "创建可登录账号"}
              </button>
            </div>
          </SectionCard>

          <div className="space-y-4">
            <div className="rounded-[1.4rem] border border-line bg-panel px-5 py-4 shadow-panel">
              <input
                className="input-base"
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder="搜索姓名、邮箱、公司或套餐"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {pagedUsers.map((user) => (
                <EditableUserCard
                  key={user.id}
                  user={user}
                  plans={plans}
                  isSaving={savingUserId === user.id}
                  isDeleting={deletingUserId === user.id}
                  onSave={handleUserSave}
                  onDelete={handleUserDelete}
                />
              ))}
            </div>

            {!pagedUsers.length ? (
              <div className="rounded-[1.35rem] border border-dashed border-line bg-canvas p-5 text-sm text-muted">
                当前筛选条件下没有找到用户。
              </div>
            ) : null}

            <PaginationControls
              page={userPage}
              totalPages={totalUserPages}
              onPageChange={setUserPage}
              itemLabel="账户列表"
            />
          </div>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        title="套餐策略"
        eyebrow="Plans"
        description="额度、价格、模型权限和席位都在这里维护。"
        defaultOpen
        summary={`${plans.length} 档套餐`}
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
      </CollapsiblePanel>

      <CollapsiblePanel
        title="兑换码中心"
        eyebrow="Redeem"
        description="在这里批量生成套餐码和额度码，也可以停用或删除未使用兑换码。"
        defaultOpen
        summary={`${redemptionCodes.length} 个兑换码`}
      >
        <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <SectionCard
            title="生成兑换码"
            eyebrow="Create"
            description="套餐码适合开通权益，额度码适合补充推演次数。默认生成单次唯一兑换码。"
            className="h-full"
          >
            <div className="grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">兑换类型</span>
                <select
                  className="input-base"
                  value={redemptionForm.reward_type}
                  onChange={(event) =>
                    setRedemptionForm((current) => ({
                      ...current,
                      reward_type: event.target.value as AdminRedemptionCodeCreateRequest["reward_type"]
                    }))
                  }
                >
                  <option value="plan">套餐码</option>
                  <option value="quota">额度码</option>
                </select>
              </label>

              {redemptionForm.reward_type === "plan" ? (
                <>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-ink">目标套餐</span>
                    <select
                      className="input-base"
                      value={redemptionForm.plan_id}
                      onChange={(event) =>
                        setRedemptionForm((current) => ({
                          ...current,
                          plan_id: event.target.value
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
                    <span className="text-sm font-medium text-ink">计费周期</span>
                    <select
                      className="input-base"
                      value={redemptionForm.billing_cycle}
                      onChange={(event) =>
                        setRedemptionForm((current) => ({
                          ...current,
                          billing_cycle: event.target.value as AdminRedemptionCodeCreateRequest["billing_cycle"]
                        }))
                      }
                    >
                      <option value="monthly">月付</option>
                      <option value="yearly">年付</option>
                    </select>
                  </label>
                </>
              ) : (
                <label className="space-y-2">
                  <span className="text-sm font-medium text-ink">额度数量</span>
                  <input
                    className="input-base"
                    type="number"
                    min={1}
                    value={redemptionForm.quota_amount ?? 10}
                    onChange={(event) =>
                      setRedemptionForm((current) => ({
                        ...current,
                        quota_amount: Number(event.target.value || 1)
                      }))
                    }
                  />
                </label>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-ink">生成数量</span>
                  <input
                    className="input-base"
                    type="number"
                    min={1}
                    max={50}
                    value={redemptionForm.quantity ?? 1}
                    onChange={(event) =>
                      setRedemptionForm((current) => ({
                        ...current,
                        quantity: Number(event.target.value || 1)
                      }))
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-ink">过期时间</span>
                  <input
                    className="input-base"
                    type="datetime-local"
                    value={redemptionForm.expires_at ?? ""}
                    onChange={(event) =>
                      setRedemptionForm((current) => ({
                        ...current,
                        expires_at: event.target.value || undefined
                      }))
                    }
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-ink">备注</span>
                <input
                  className="input-base"
                  value={redemptionForm.note ?? ""}
                  onChange={(event) =>
                    setRedemptionForm((current) => ({
                      ...current,
                      note: event.target.value
                    }))
                  }
                  placeholder="例如：春季活动、线下赠码、客服补偿"
                />
              </label>

              <button
                type="button"
                className="button-primary w-full justify-center"
                disabled={isCreatingRedemption}
                onClick={() => void handleRedemptionCreate()}
              >
                {isCreatingRedemption ? "生成中..." : "生成兑换码"}
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="最近兑换码"
            eyebrow="Code Pool"
            description="默认展示最新生成的兑换码，可快速筛选状态并做停用或删除。"
            className="h-full"
          >
            <div className="flex flex-wrap gap-2">
              {(["all", "active", "redeemed", "disabled", "expired"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={redemptionFilter === status ? "button-primary" : "button-secondary"}
                  onClick={() => setRedemptionFilter(status)}
                >
                  {redemptionStatusLabels[status]}
                </button>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {filteredRedemptionCodes.slice(0, 16).map((item) => (
                <RedemptionCodeCard
                  key={item.id}
                  item={item}
                  isSaving={savingRedemptionId === item.id}
                  isDeleting={deletingRedemptionId === item.id}
                  onStatusChange={handleRedemptionStatusChange}
                  onDelete={handleRedemptionDelete}
                />
              ))}
              {!filteredRedemptionCodes.length ? (
                <div className="rounded-[1.2rem] border border-dashed border-line bg-canvas p-4 text-sm text-muted">
                  当前筛选条件下没有兑换码。
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        title="任务与订单"
        eyebrow="Operations"
        description="只在需要时展开看排队和付费情况，避免后台首页被细节淹没。"
        summary={`${jobs.filter((job) => job.status !== "completed").length} 个活动任务`}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="异步任务" eyebrow="Queue" className="h-full">
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
                    {formatDateTime(job.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="最近订单" eyebrow="Orders" className="h-full">
            <div className="space-y-4">
              {orders.slice(0, 8).map((order) => (
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
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        title="最近推演"
        eyebrow="Recent"
        description="后台只保留一小块结果概览，真正的详情交给结果页和历史页。"
        summary={`${overview.recent_analyses.length} 条结果`}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {overview.recent_analyses.map((analysis) => (
            <div
              key={analysis.id}
              className="rounded-[1.25rem] border border-line bg-canvas p-5"
            >
              <p className="text-base font-semibold text-ink">{analysis.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{analysis.summary}</p>
              <p className="mt-3 text-xs text-muted">{formatDateTime(analysis.updated_at)}</p>
            </div>
          ))}
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        title="系统结构"
        eyebrow="System"
        description="组织和审计保留给系统维护使用，不再默认铺满后台首页。"
        summary={`${organizations.length} 个空间`}
      >
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="空间分布" eyebrow="Spaces" className="h-full">
            <div className="space-y-4">
              {organizations.map((organization) => (
                <div
                  key={organization.id}
                  className="rounded-[1.25rem] border border-line bg-canvas p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink">{organization.name}</p>
                      <p className="mt-1 text-sm text-muted">
                        {organization.active_plan_name} / {organization.subscription_status ?? "未订阅"}
                      </p>
                    </div>
                    <p className="text-sm text-muted">成员 {organization.member_count}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="审计日志" eyebrow="Audit" className="h-full">
            <div className="space-y-4">
              {audits.slice(0, 10).map((audit) => (
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
      </CollapsiblePanel>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-line bg-canvas p-4">
      <p className="text-xs tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function EditableUserCard({
  user,
  plans,
  isSaving,
  isDeleting,
  onSave,
  onDelete
}: {
  user: AdminUserRecord;
  plans: AdminPlanRecord[];
  isSaving: boolean;
  isDeleting: boolean;
  onSave: (userId: string, payload: Partial<AdminUserRecord>) => Promise<void>;
  onDelete: (user: AdminUserRecord) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AdminUserRecord>(user);
  const [baseRemainingInput, setBaseRemainingInput] = useState(user.quota_snapshot.base_remaining);

  useEffect(() => {
    setDraft(user);
    setBaseRemainingInput(user.quota_snapshot.base_remaining);
  }, [user]);

  const isFounder = user.id === "demo-admin";
  const selectedPlan = plans.find((item) => item.id === draft.plan_id);
  const selectedBaseLimit = selectedPlan?.monthly_analysis_quota ?? user.monthly_limit;
  const normalizedBaseRemaining = Math.min(
    Math.max(baseRemainingInput, 0),
    Math.max(selectedBaseLimit, 0)
  );
  const previewBonusRemaining = Math.max(draft.bonus_quota_balance, 0);
  const previewTotalRemaining = normalizedBaseRemaining + previewBonusRemaining;
  const previewProfiles =
    selectedPlan?.allowed_model_profiles.length
      ? selectedPlan.allowed_model_profiles
      : user.allowed_model_profiles;

  useEffect(() => {
    setBaseRemainingInput((current) => Math.min(current, Math.max(selectedBaseLimit, 0)));
  }, [selectedBaseLimit]);

  return (
    <div className="rounded-[1.45rem] border border-line bg-canvas p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-ink">{user.name}</p>
            {isFounder ? <span className="status-pill">创始者</span> : null}
          </div>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
        </div>
        <p className="text-xs tracking-[0.16em] text-muted">
          {formatDateTime(user.updated_at)}
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">姓名</span>
          <input
            className="input-base"
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">公司</span>
          <input
            className="input-base"
            value={draft.company}
            onChange={(event) =>
              setDraft((current) => ({ ...current, company: event.target.value }))
            }
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">角色</span>
          <select
            className="input-base"
            value={draft.role}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                role: event.target.value as AdminUserRecord["role"]
              }))
            }
          >
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
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
            <option value="active">可登录</option>
            <option value="suspended">暂停</option>
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
          <span className="text-xs tracking-[0.16em] text-muted">基础剩余额度</span>
          <input
            className="input-base"
            type="number"
            min={0}
            max={selectedBaseLimit}
            value={baseRemainingInput}
            onChange={(event) => setBaseRemainingInput(Number(event.target.value || 0))}
          />
          <p className="text-xs leading-5 text-muted">
            设为 `0` 会耗尽本月基础额度；若额外额度余额也为 `0`，新推演会被直接阻断。
          </p>
        </label>
        <label className="space-y-2">
          <span className="text-xs tracking-[0.16em] text-muted">额外额度余额</span>
          <input
            className="input-base"
            type="number"
            min={0}
            value={draft.bonus_quota_balance}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                bonus_quota_balance: Number(event.target.value || 0)
              }))
            }
          />
        </label>
      </div>

      <div className="mt-4 rounded-[1.1rem] border border-line bg-panel/70 p-4 text-sm leading-6 text-muted">
        <p>活动任务：{user.active_job_count}</p>
        <p className="mt-2">预览剩余额度：{previewTotalRemaining}</p>
        <p className="mt-2">基础额度：{normalizedBaseRemaining} / {selectedBaseLimit}</p>
        <p className="mt-2">额外额度：{previewBonusRemaining}</p>
        <p className="mt-2">当前套餐：{selectedPlan?.name ?? user.plan_name}</p>
        <p className="mt-2">空间：{user.organization_name}</p>
        <p className="mt-2">最近兑换：{user.latest_redemption_summary ?? "暂无"}</p>
        <p className="mt-2">
          可用模型：{previewProfiles.map((item) => getModelProfileLabel(item)).join(" / ")}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          className="button-primary"
          disabled={isSaving}
          onClick={() =>
            void onSave(user.id, {
              ...draft,
              monthly_usage: Math.max(selectedBaseLimit - normalizedBaseRemaining, 0)
            })
          }
        >
          {isSaving ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          className="button-danger"
          disabled={isDeleting || isFounder}
          onClick={() => void onDelete(user)}
        >
          {isDeleting ? "删除中..." : isFounder ? "创始者账号保留" : "删除账号"}
        </button>
      </div>
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
    <div className="rounded-[1.45rem] border border-line bg-canvas p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-ink">{plan.name}</p>
          <p className="mt-1 text-sm text-muted">{plan.highlight}</p>
        </div>
        <div className="text-right text-sm text-muted">
          <p>用户 {plan.assigned_users}</p>
          <p className="mt-1">平均使用率 {Math.round(plan.average_usage_rate * 100)}%</p>
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
          <span className="text-xs tracking-[0.16em] text-muted">开放导出</span>
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
            <option value="true">开启</option>
            <option value="false">关闭</option>
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
            <option value="true">开启</option>
            <option value="false">关闭</option>
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-[1.1rem] border border-line bg-panel/70 p-4 text-sm leading-6 text-muted">
        <p>
          模型档位：{plan.allowed_model_profiles.map((item) => getModelProfileLabel(item)).join(" / ")}
        </p>
        <p className="mt-2">并发任务：{plan.max_concurrent_jobs}</p>
        <p className="mt-2">活跃空间：{plan.active_organizations}</p>
      </div>

      <button
        type="button"
        className="button-primary mt-5"
        disabled={isSaving}
        onClick={() => void onSave(plan.id, draft)}
      >
        {isSaving ? "保存中..." : "保存套餐"}
      </button>
    </div>
  );
}

function RedemptionCodeCard({
  item,
  isSaving,
  isDeleting,
  onStatusChange,
  onDelete
}: {
  item: RedemptionCodeRecord;
  isSaving: boolean;
  isDeleting: boolean;
  onStatusChange: (id: string, status: RedemptionCodeRecord["status"]) => Promise<void>;
  onDelete: (item: RedemptionCodeRecord) => Promise<void>;
}) {
  const canDisable = item.status === "active";
  const canReactivate = item.status === "disabled";
  const statusLabel = redemptionStatusLabels[item.status];

  return (
    <div className="rounded-[1.25rem] border border-line bg-canvas p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="tech-pill">{item.reward_type === "plan" ? "套餐码" : "额度码"}</span>
            <p className="text-base font-semibold text-ink">{item.code}</p>
          </div>
          <p className="mt-2 text-sm text-muted">
            {item.reward_type === "plan"
              ? `${item.plan_name ?? "套餐权益"} / ${item.billing_cycle === "yearly" ? "年付" : "月付"}`
              : `${item.quota_amount ?? 0} 次额度`}
          </p>
          <p className="mt-2 text-xs text-muted">
            状态：{statusLabel} {item.redeemed_by_email ? ` / ${item.redeemed_by_email}` : ""}
          </p>
        </div>
        <div className="text-right text-xs text-muted">
          <p>创建于 {formatDateTime(item.created_at)}</p>
          <p className="mt-1">
            {item.expires_at ? `过期于 ${formatDateTime(item.expires_at)}` : "长期有效"}
          </p>
        </div>
      </div>

      {item.note ? (
        <p className="mt-3 rounded-[1rem] border border-line bg-white/90 px-3 py-2 text-sm leading-6 text-muted">
          {item.note}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {canDisable ? (
          <button
            type="button"
            className="button-secondary"
            disabled={isSaving}
            onClick={() => void onStatusChange(item.id, "disabled")}
          >
            {isSaving ? "处理中..." : "停用"}
          </button>
        ) : null}
        {canReactivate ? (
          <button
            type="button"
            className="button-secondary"
            disabled={isSaving}
            onClick={() => void onStatusChange(item.id, "active")}
          >
            {isSaving ? "处理中..." : "重新启用"}
          </button>
        ) : null}
        <button
          type="button"
          className="button-danger"
          disabled={isDeleting || item.status === "redeemed"}
          onClick={() => void onDelete(item)}
        >
          {isDeleting ? "删除中..." : item.status === "redeemed" ? "已兑换不可删" : "删除"}
        </button>
      </div>
    </div>
  );
}
