"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageStatus } from "@/components/page-status";
import { PlanSwitcher } from "@/components/plan-switcher";
import { SectionCard } from "@/components/section-card";
import { getAccountOverview, getSession, redeemCode } from "@/lib/api";
import {
  formatDateTime,
  getJobStatusLabel,
  getModelProfileLabel
} from "@/lib/display";
import { useToastStore } from "@/store/toast-store";
import type {
  AccountOverviewRecord,
  CurrentUserRecord,
  RedeemCodeResponse,
  SwitchPlanResponse
} from "@/types/account";

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0
});

const tierTags: Record<string, string> = {
  free: "轻启",
  pro: "推荐",
  vip: "火热",
  enterprise: "置顶"
};

export default function AccountPage() {
  const pushToast = useToastStore((state) => state.push);
  const [sessionUser, setSessionUser] = useState<CurrentUserRecord | null>(null);
  const [overview, setOverview] = useState<AccountOverviewRecord | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemError, setRedeemError] = useState("");
  const [redeemPending, setRedeemPending] = useState(false);

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

  async function handleRedeem() {
    if (!redeemInput.trim() || redeemPending) {
      return;
    }

    setRedeemPending(true);
    setRedeemError("");

    try {
      const response = await redeemCode(redeemInput.trim());
      applyRedeemResponse(response);
      setRedeemInput("");
      pushToast({
        tone: "success",
        title: "兑换成功",
        description: response.message
      });
    } catch (caughtError) {
      setRedeemError(caughtError instanceof Error ? caughtError.message : "兑换失败。");
    } finally {
      setRedeemPending(false);
    }
  }

  function applyRedeemResponse(response: RedeemCodeResponse) {
    setOverview((current) =>
      current
        ? {
            ...current,
            user: response.user,
            active_subscription: response.subscription ?? current.active_subscription,
            recent_orders: response.order
              ? [response.order, ...current.recent_orders]
              : current.recent_orders,
            recent_redemptions: [response.redeemed_code, ...current.recent_redemptions]
          }
        : current
    );
    setSessionUser(response.user);
  }

  if (isLoading) {
    return (
      <PageStatus
        eyebrow="套餐与兑换"
        title="正在同步套餐、额度与购买信息"
        description="系统正在拉取订阅、订单、最近任务和兑换记录。"
      />
    );
  }

  if (!sessionUser || !overview) {
    return (
      <PageStatus
        eyebrow="套餐与兑换"
        title="选择合适的套餐与权益路径"
        description={error || "请先登录，再查看你的套餐、额度与兑换入口。"}
        actionHref="/login"
        actionLabel="去登录"
      />
    );
  }

  const currentUser = overview.user;
  const quota = currentUser.quota_snapshot;
  const nextOrder = overview.recent_orders[0] ?? null;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-[2rem] border border-line bg-panel p-7 shadow-panel lg:grid-cols-[1.08fr_0.92fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="tech-pill">SUPER OS MEMBERSHIP</span>
            <span className="tech-pill">白科技计费台</span>
          </div>
          <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
            购买、兑换、额度，一次看清。
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            这里把两条路径拆开处理。你可以直接购买套餐，也可以通过兑换码开通套餐或补充额度。系统会优先消耗套餐月额度，再消耗兑换得到的额外额度。
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted">
            <span className="status-pill">当前套餐：{currentUser.plan.name}</span>
            <span className="status-pill">最近兑换：{currentUser.latest_redemption_summary ?? "暂无"}</span>
            <span className="status-pill">当前周期：{overview.active_subscription ? formatDateTime(overview.active_subscription.current_period_end) : "未开通"}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricTile label="总可用额度" value={`${quota.total_remaining} 次`} />
          <MetricTile label="基础月额度" value={`${quota.base_remaining} / ${quota.base_limit}`} />
          <MetricTile label="额外兑换额度" value={`${quota.bonus_remaining} 次`} />
          <MetricTile label="可用模型" value={currentUser.plan.allowed_model_profiles.map(getModelProfileLabel).join(" / ")} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <SectionCard
          title="兑换中心"
          eyebrow="Redeem"
          description="支持两类兑换码：直接开通套餐，或为当前账号补充额外推演额度。"
          className="scroll-mt-28"
        >
          <div id="redeem-center" className="space-y-5">
            <div className="rounded-[1.35rem] border border-brand/12 bg-[rgba(31,111,255,0.06)] p-4">
              <p className="text-sm font-semibold text-ink">额度消耗顺序</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                先消耗本月套餐额度，再消耗兑换得到的额外额度。额外额度不会随着月度重置自动清空。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="input-base flex-1"
                value={redeemInput}
                onChange={(event) => setRedeemInput(event.target.value.toUpperCase())}
                placeholder="输入兑换码，例如 SO-AB12-CD34"
              />
              <button
                type="button"
                className="button-primary justify-center"
                disabled={redeemPending}
                onClick={() => void handleRedeem()}
              >
                {redeemPending ? "兑换中..." : "立即兑换"}
              </button>
            </div>
            {redeemError ? (
              <p className="rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
                {redeemError}
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard label="基础已用" value={`${quota.base_used} 次`} />
              <InfoCard label="基础剩余" value={`${quota.base_remaining} 次`} />
              <InfoCard label="额外余额" value={`${quota.bonus_remaining} 次`} />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-ink">最近兑换</p>
              {overview.recent_redemptions.length ? (
                overview.recent_redemptions.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.2rem] border border-line bg-white/90 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="tech-pill">
                          {item.reward_type === "plan" ? "套餐码" : "额度码"}
                        </span>
                        <p className="font-semibold text-ink">{item.code}</p>
                      </div>
                      <p className="text-sm text-muted">
                        {item.redeemed_at ? formatDateTime(item.redeemed_at) : "未使用"}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {item.reward_type === "plan"
                        ? `${item.plan_name ?? "套餐权益"} / ${item.billing_cycle === "yearly" ? "年付" : "月付"}`
                        : `${item.quota_amount ?? 0} 次额外额度`}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-line bg-canvas px-4 py-4 text-sm text-muted">
                  还没有兑换记录。支持兑换套餐码和额度码。
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="当前状态"
          eyebrow="Overview"
          description="购买和兑换之外，账户页也保留最关键的状态信息，避免在多个页面间来回切换。"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard label="账号" value={`${currentUser.name} / ${currentUser.email}`} />
            <InfoCard label="套餐亮点" value={currentUser.plan.highlight} />
            <InfoCard
              label="最近订单"
              value={nextOrder ? `${nextOrder.plan_name} / ${currencyFormatter.format(nextOrder.amount)}` : "暂无订单"}
            />
            <InfoCard
              label="最近任务"
              value={
                overview.recent_jobs[0]
                  ? `${getJobStatusLabel(overview.recent_jobs[0].status)} / ${getModelProfileLabel(overview.recent_jobs[0].model_profile)}`
                  : "当前没有任务"
              }
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {currentUser.can_access_admin ? (
              <Link href="/admin" className="button-secondary">
                打开运营后台
              </Link>
            ) : null}
            <Link href="/workspace" className="button-secondary">
              返回控制台
            </Link>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="套餐矩阵"
        eyebrow="Pricing"
        description="直接购买和兑换码开通并行存在。建议先选适合你的使用频率，再决定是否补充兑换额度。"
      >
        <div className="grid gap-6 xl:grid-cols-4">
          {overview.available_plans.map((plan) => {
            const isCurrentPlan = plan.id === currentUser.plan.id;

            return (
              <article
                key={plan.id}
                className={`flex h-full flex-col rounded-[1.6rem] border p-5 ${
                  isCurrentPlan
                    ? "border-brand/30 bg-[rgba(31,111,255,0.06)]"
                    : "border-line bg-white/92"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="tech-pill">{tierTags[plan.tier] ?? "精选"}</span>
                  {isCurrentPlan ? <span className="status-pill">当前套餐</span> : null}
                </div>
                <div className="mt-4">
                  <h2 className="text-2xl font-semibold text-ink">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{plan.description}</p>
                </div>

                <div className="mt-5">
                  <p className="text-3xl font-semibold text-ink">
                    {currencyFormatter.format(plan.monthly_price)}
                    <span className="ml-1 text-sm font-normal text-muted">/月</span>
                  </p>
                  <p className="mt-2 text-sm text-muted">年付 {currencyFormatter.format(plan.yearly_price)}</p>
                </div>

                <ul className="mt-5 flex-1 space-y-3 text-sm leading-6 text-muted">
                  {plan.features.map((feature) => (
                    <li key={feature} className="rounded-2xl border border-line/80 bg-canvas px-3 py-2">
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 rounded-[1rem] border border-line bg-panel/80 p-4 text-sm text-muted">
                  <p>模型档位：{plan.allowed_model_profiles.map(getModelProfileLabel).join(" / ")}</p>
                  <p className="mt-2">并发上限：{plan.max_concurrent_jobs} 个</p>
                  <p className="mt-2">团队席位：{plan.team_seats} 个</p>
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
    <div className="rounded-[1.25rem] border border-line bg-white/92 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-line bg-white/92 p-4">
      <p className="text-xs tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-sm leading-6 text-ink">{value}</p>
    </div>
  );
}
