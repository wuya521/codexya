"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PageStatus } from "@/components/page-status";
import { PaginationControls } from "@/components/pagination-controls";
import { SectionCard } from "@/components/section-card";
import {
  getAccountOverview,
  getMyAnalyses,
  getMyAnalysisJobs,
  getSession
} from "@/lib/api";
import {
  formatDateTime,
  getJobStatusLabel,
  getModelProfileLabel,
  getOptimizationLabel,
  sanitizeAnalysisTitle
} from "@/lib/display";
import type { AccountOverviewRecord, CurrentUserRecord } from "@/types/account";
import type { AnalysisJobRecord, AnalysisRecord } from "@/types/analysis";

export default function WorkspacePage() {
  const [sessionUser, setSessionUser] = useState<CurrentUserRecord | null>(null);
  const [overview, setOverview] = useState<AccountOverviewRecord | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [jobs, setJobs] = useState<AnalysisJobRecord[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    let mounted = true;

    Promise.all([getSession(), getAccountOverview(), getMyAnalyses(), getMyAnalysisJobs()])
      .then(([user, accountOverview, ownAnalyses, ownJobs]) => {
        if (!mounted) {
          return;
        }
        setSessionUser(user);
        setOverview(accountOverview);
        setAnalyses(ownAnalyses);
        setJobs(ownJobs);
      })
      .catch((caughtError) => {
        if (mounted) {
          setError(caughtError instanceof Error ? caughtError.message : "工作台加载失败。");
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

  const activeJobs = useMemo(
    () => jobs.filter((job) => job.status === "queued" || job.status === "running"),
    [jobs]
  );
  const totalPages = Math.max(1, Math.ceil(analyses.length / pageSize));
  const pagedAnalyses = analyses.slice((page - 1) * pageSize, page * pageSize);
  const nextJob = activeJobs[0] ?? null;
  const nextOrder = overview?.recent_orders[0] ?? null;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (isLoading) {
    return (
      <PageStatus
        eyebrow="Super OS"
        title="正在为你整理控制台"
        description="系统正在同步你的真实推演、套餐额度、异步任务和购买状态。"
      />
    );
  }

  if (!sessionUser || !overview) {
    return (
      <PageStatus
        eyebrow="Super OS"
        title="你的私有控制台"
        description={error || "请先登录，再查看你的推演记录、购买状态和当前任务。"}
        actionHref="/login"
        actionLabel="去登录"
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-[2rem] border border-line bg-panel p-7 shadow-panel lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="eyebrow">Super OS</p>
          <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
            欢迎回来，{sessionUser.name}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            这里不是信息堆场，而是你当前决策节奏的主控台。先看任务，再看路径，最后处理购买和额度。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/forecast" className="button-primary">
              发起走向预测
            </Link>
            <Link href="/pathfinder" className="button-secondary">
              规划最佳路径
            </Link>
            <Link href="/templates" className="button-secondary">
              套用模板
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <WorkspaceMetric label="当前套餐" value={sessionUser.plan.name} />
          <WorkspaceMetric
            label="剩余额度"
            value={`${sessionUser.remaining_quota} 次`}
          />
          <WorkspaceMetric
            label="进行中任务"
            value={`${activeJobs.length} 个`}
          />
          <WorkspaceMetric
            label="已保存结果"
            value={`${analyses.length} 条`}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <SectionCard
          title="当前焦点"
          eyebrow="Now"
          description="优先处理眼前最重要的一件事，而不是被所有模块同时拉扯。"
        >
          {nextJob ? (
            <div className="rounded-[1.4rem] border border-brand/20 bg-brand/10 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink">{nextJob.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {nextJob.step}
                  </p>
                </div>
                <span className="status-pill">
                  {getJobStatusLabel(nextJob.status)} / {nextJob.progress}%
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#17324a,#b35c34)]"
                  style={{ width: `${nextJob.progress}%` }}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={nextJob.result_analysis_id ? `/analysis/${nextJob.result_analysis_id}` : `/jobs/${nextJob.id}`}
                  className="button-primary"
                >
                  打开任务
                </Link>
                <span className="text-sm text-muted">
                  {getModelProfileLabel(nextJob.model_profile)} / {nextJob.selected_model}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-line bg-canvas p-5 text-sm leading-6 text-muted">
              当前没有排队任务。你可以直接从模板开始，或者针对手头最关键的问题发起一轮新的推演。
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="账户节奏"
          eyebrow="Account"
          description="把套餐、购买和可用模型放到一眼能看清的位置。"
        >
          <div className="space-y-4">
            <InfoCard
              label="可用模型档位"
              value={sessionUser.plan.allowed_model_profiles
                .map((item) => getModelProfileLabel(item))
                .join(" / ")}
            />
            <InfoCard
              label="下个周期节点"
              value={
                overview.active_subscription
                  ? formatDateTime(overview.active_subscription.current_period_end)
                  : "当前没有订阅周期"
              }
            />
            <InfoCard
              label="最近一次购买"
              value={
                nextOrder
                  ? `${nextOrder.plan_name} / ${formatDateTime(nextOrder.created_at)}`
                  : "还没有购买记录"
              }
            />
            <Link href="/account" className="button-secondary w-full justify-center">
              管理套餐与购买
            </Link>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="最近推演"
        eyebrow="Archive"
        description="按页整理你的结果，不再一股脑全部堆在页面里。"
      >
        <div className="space-y-4">
          {pagedAnalyses.length ? (
            pagedAnalyses.map((analysis) => (
              <Link
                key={analysis.id}
                href={`/analysis/${analysis.id}`}
                className="block rounded-[1.35rem] border border-line bg-canvas px-5 py-4 transition hover:border-brand/35 hover:-translate-y-0.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">
                      {sanitizeAnalysisTitle(analysis.title)}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {analysis.summary}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted">
                    <p>{formatDateTime(analysis.updated_at)}</p>
                    <p className="mt-2 text-ink">
                      {getOptimizationLabel(analysis.recommended_paths.primary_choice)}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-line bg-canvas p-5 text-sm text-muted">
              还没有可展示的推演结果。发起第一条任务后，这里会自动更新。
            </div>
          )}
        </div>
        <div className="mt-5">
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            itemLabel="最近推演"
          />
        </div>
      </SectionCard>
    </div>
  );
}

function WorkspaceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-line bg-canvas p-4">
      <p className="text-xs tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
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
