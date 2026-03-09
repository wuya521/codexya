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
          setError(caughtError instanceof Error ? caughtError.message : "套餐页加载失败。");
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
        eyebrow="购买套餐"
        title="正在加载套餐与购买信息"
        description="系统正在同步你的额度、订阅、订单和最近任务。"
      />
    );
  }

  if (!sessionUser || !overview) {
    return (
      <PageStatus
        eyebrow="购买套餐"
        title="选择合适的套餐"
        description={error || "请先登录，再查看你的套餐、订单和升级入口。"}
        actionHref="/login"
        actionLabel="去登录"
      />
    );
  }

  const currentUser = overview.user;
  const nextOrder = overview.recent_orders[0] ?? null;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-[2rem] border border-line bg-panel p-7 shadow-panel lg:grid-cols-[1.06fr_0.94fr]">
        <div>
          <p className="eyebrow">购买套餐</p>
          <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
            让套餐为使用习惯服务
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            这里聚焦三件事：你现在能做多少、下一步该买什么、最近买过什么。其余系统信息不再抢视线。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricTile label="当前套餐" value={currentUser.plan.name} />
          <MetricTile label="剩余额度" value={`${currentUser.remaining_quota} 次`} />
          <MetricTile
            label="可用模型"
            value={currentUser.plan.allowed_model_profiles
              .map((item) => getModelProfileLabel(item))
              .join(" / ")}
          />
          <MetricTile
            label="并发任务"
            value={`${currentUser.plan.max_concurrent_jobs} 个`}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.98fr_1.02fr]">
        <SectionCard
          title="当前状态"
          eyebrow="Account"
          aside={
            currentUser.can_access_admin ? (
              <Link href="/admin" className="text-sm text-brand">
                打开运营台
              </Link>
            ) : null
          }
        >
          <div className="space-y-4">
            <InfoCard label="账号" value={`${currentUser.name} / ${currentUser.email}`} />
            <InfoCard label="套餐亮点" value={currentUser.plan.highlight} />
            <InfoCard
              label="当前周期结束"
              value={
                overview.active_subscription
                  ? formatDateTime(overview.active_subscription.current_period_end)
                  : "当前没有订阅周期"
              }
            />
          </div>
        </SectionCard>

        <SectionCard
          title="最近动作"
          eyebrow="Recent"
          description="保持购买、任务和审计的轻量可见，不再堆满整页。"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard
              label="最近订单"
              value={
                nextOrder
                  ? `${nextOrder.plan_name} / ${currencyFormatter.format(nextOrder.amount)}`
                  : "还没有订单"
              }
            />
            <InfoCard
              label="最近任务"
              value={
                overview.recent_jobs[0]
                  ? `${getJobStatusLabel(overview.recent_jobs[0].status)} / ${getModelProfileLabel(overview.recent_jobs[0].model_profile)}`
                  : "当前没有任务"
              }
            />
            <InfoCard
              label="最近记录"
              value={
                overview.recent_audits[0]
                  ? overview.recent_audits[0].summary
                  : "还没有后台动作"
              }
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="套餐矩阵"
        eyebrow="Pricing"
        description="用户登录后可以直接在这里完成套餐选择或升级。"
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
                  <h2 className="mt-3 text-2xl font-semibold text-ink">{plan.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted">{plan.description}</p>
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
                  <p className="mt-2">团队席位：{plan.team_seats}</p>
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
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-line bg-canvas p-4">
      <p className="text-xs tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-sm leading-6 text-ink">{value}</p>
    </div>
  );
}
