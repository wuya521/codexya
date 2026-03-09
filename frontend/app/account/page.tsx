"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageStatus } from "@/components/page-status";
import { PlanSwitcher } from "@/components/plan-switcher";
import { SectionCard } from "@/components/section-card";
import { getAccountOverview, getSession } from "@/lib/api";
import {
  formatDateTime,
  getJobStatusLabel,
  getModelProfileLabel
} from "@/lib/display";
import type {
  AccountOverviewRecord,
  CurrentUserRecord,
  SwitchPlanResponse
} from "@/types/account";

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0
});

export default function AccountPage() {
  const [sessionUser, setSessionUser] = useState<CurrentUserRecord | null>(null);
  const [overview, setOverview] = useState<AccountOverviewRecord | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadOverview() {
    const [user, accountOverview] = await Promise.all([
      getSession(),
      getAccountOverview()
    ]);
    setSessionUser(user);
    setOverview(accountOverview);
  }

  useEffect(() => {
    let mounted = true;

    loadOverview()
      .catch((caughtError) => {
        if (mounted) {
          setError(caughtError instanceof Error ? caughtError.message : "会员中心加载失败。");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <PageStatus
        eyebrow="会员中心"
        title="正在加载套餐、账单和订阅"
        description="系统正在拉取你的真实订阅、订单、审计和额度数据。"
      />
    );
  }

  if (!sessionUser || !overview) {
    return (
      <PageStatus
        eyebrow="会员中心"
        title="套餐、账单和订阅管理"
        description={error || "请先登录，再查看你的订阅、账单、团队和升级路径。"}
        actionHref="/login"
        actionLabel="去登录"
      />
    );
  }

  const currentUser = overview.user;

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="eyebrow">会员中心</p>
        <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
          套餐、额度、模型权限与订阅控制
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          这里集中展示当前套餐能力、模型档位、异步并发上限、近期订单和升级路径。
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title={currentUser.plan.name}
          eyebrow="当前账户"
          aside={
            currentUser.can_access_admin ? (
              <Link href="/admin" className="text-sm text-brand">
                进入后台
              </Link>
            ) : null
          }
        >
          <div className="space-y-5">
            <div className="rounded-[1.25rem] border border-line bg-canvas p-5">
              <p className="text-sm text-muted">{currentUser.company}</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                {currentUser.name}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {currentUser.email} / {currentUser.role === "admin" ? "后台管理员" : "普通成员"}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <MetricTile label="本月已用" value={String(currentUser.monthly_usage)} />
              <MetricTile label="剩余额度" value={String(currentUser.remaining_quota)} />
              <MetricTile label="并发任务" value={String(currentUser.plan.max_concurrent_jobs)} />
              <MetricTile label="活动任务" value={String(currentUser.active_job_count)} />
            </div>

            <div className="space-y-3 rounded-[1.25rem] border border-line bg-canvas p-5 text-sm leading-6 text-muted">
              <p>当前套餐亮点：{currentUser.plan.highlight}</p>
              <p>
                当前组织：{currentUser.organization?.name ?? "未绑定组织"} / 角色{" "}
                {currentUser.organization_role ?? "未设置"}
              </p>
              <p>
                当前订阅：
                {overview.active_subscription
                  ? `${overview.active_subscription.plan_name} / ${overview.active_subscription.billing_cycle}`
                  : currentUser.plan.name}
              </p>
              <p>
                可用模型：
                {currentUser.plan.allowed_model_profiles
                  .map((item) => getModelProfileLabel(item))
                  .join(" / ")}
              </p>
              <p>
                下个账期结束：
                {overview.active_subscription
                  ? ` ${formatDateTime(overview.active_subscription.current_period_end)}`
                  : " 暂无"}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="近期订单、审计与任务"
          eyebrow="Operations"
          description="让用户看到自己的订阅动作、队列使用和审计记录，而不是只有一个价格表。"
        >
          <div className="space-y-4">
            {overview.recent_orders.slice(0, 3).map((order) => (
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
            <div className="rounded-[1.25rem] border border-line bg-canvas p-5">
              <p className="font-semibold text-ink">最近任务</p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-muted">
                {overview.recent_jobs.slice(0, 3).map((job) => (
                  <div key={job.id}>
                    <p className="text-ink">{job.title}</p>
                    <p className="text-xs text-muted">
                      {getJobStatusLabel(job.status)} / {getModelProfileLabel(job.model_profile)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-line bg-canvas p-5">
              <p className="font-semibold text-ink">最近审计记录</p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-muted">
                {overview.recent_audits.slice(0, 3).map((audit) => (
                  <div key={audit.id}>
                    <p className="text-ink">{audit.summary}</p>
                    <p className="text-xs text-muted">{formatDateTime(audit.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="套餐矩阵"
        eyebrow="Pricing"
        description="套餐不仅决定价格，也决定额度、模型权限和并发能力。"
      >
        <div className="grid gap-6 xl:grid-cols-4">
          {overview.available_plans.map((plan) => {
            const isCurrentPlan = plan.id === currentUser.plan.id;

            return (
              <article
                key={plan.id}
                className={`flex h-full flex-col rounded-[1.5rem] border p-5 ${
                  isCurrentPlan
                    ? "border-brand bg-[rgba(180,94,41,0.08)]"
                    : "border-line bg-canvas"
                }`}
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted">
                    {plan.highlight}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-ink">
                    {plan.name}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {plan.description}
                  </p>
                </div>

                <div className="mt-5">
                  <p className="text-3xl font-semibold text-ink">
                    {currencyFormatter.format(plan.monthly_price)}
                    <span className="ml-1 text-sm font-normal text-muted">/月</span>
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    年付 {currencyFormatter.format(plan.yearly_price)}
                  </p>
                </div>

                <ul className="mt-5 flex-1 space-y-3 text-sm leading-6 text-muted">
                  {plan.features.map((feature) => (
                    <li key={feature} className="rounded-2xl border border-line/80 px-3 py-2">
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 rounded-[1rem] border border-line bg-panel/70 p-4 text-sm text-muted">
                  <p>
                    模型档位：
                    {plan.allowed_model_profiles
                      .map((item) => getModelProfileLabel(item))
                      .join(" / ")}
                  </p>
                  <p className="mt-2">并发上限：{plan.max_concurrent_jobs}</p>
                </div>

                <div className="mt-5">
                  <PlanSwitcher
                    planId={plan.id}
                    currentPlanId={currentUser.plan.id}
                    onSwitched={(response: SwitchPlanResponse) => {
                      setOverview((current) =>
                        current
                          ? {
                              ...current,
                              user: response.user,
                              active_subscription: response.subscription,
                              recent_orders: [response.order, ...current.recent_orders]
                            }
                          : current
                      );
                      setSessionUser(response.user);
                    }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-line bg-canvas p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
