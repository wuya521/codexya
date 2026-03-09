"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageStatus } from "@/components/page-status";
import { SectionCard } from "@/components/section-card";
import { getAccountOverview, getMyAnalyses, getMyAnalysisJobs, getSession } from "@/lib/api";
import {
  formatDateTime,
  getJobStatusLabel,
  getModelProfileLabel
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

  if (isLoading) {
    return (
      <PageStatus
        eyebrow="工作台"
        title="正在加载你的工作台"
        description="系统正在拉取真实分析、异步任务、组织和订阅数据。"
      />
    );
  }

  if (!sessionUser || !overview) {
    return (
      <PageStatus
        eyebrow="工作台"
        title="个人与组织工作台"
        description={error || "请先登录，再查看你的私有分析、任务和组织信息。"}
        actionHref="/login"
        actionLabel="去登录"
      />
    );
  }

  const activeJobs = jobs.filter(
    (job) => job.status !== "completed" || !job.result_analysis_id
  );

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="eyebrow">工作台</p>
        <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
          {sessionUser.name} 的决策工作台
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          这里聚合你的推演结果、异步任务、组织状态和套餐额度，是实际使用时的主控制面板。
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="当前套餐" value={sessionUser.plan.name} />
        <MetricCard
          label="本月额度"
          value={`${sessionUser.monthly_usage} / ${sessionUser.monthly_limit}`}
        />
        <MetricCard label="剩余额度" value={String(sessionUser.remaining_quota)} />
        <MetricCard label="活动任务" value={String(sessionUser.active_job_count)} />
        <MetricCard
          label="组织"
          value={sessionUser.organization?.name ?? "未绑定"}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <SectionCard
          title="进行中的任务"
          eyebrow="Queue"
          description="不再让长推理卡住页面，所有长任务都进入后台队列。"
        >
          <div className="space-y-4">
            {activeJobs.length ? (
              activeJobs.slice(0, 6).map((job) => (
                <Link
                  key={job.id}
                  href={job.result_analysis_id ? `/analysis/${job.result_analysis_id}` : `/jobs/${job.id}`}
                  className="block rounded-[1.25rem] border border-line bg-canvas px-5 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-ink">{job.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {getModelProfileLabel(job.model_profile)} / {getJobStatusLabel(job.status)}
                      </p>
                    </div>
                    <p className="text-sm text-ink">{job.progress}%</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{job.step}</p>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-line bg-canvas p-5 text-sm text-muted">
                当前没有进行中的任务。你在推演页提交后，这里会实时显示进度。
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="组织与套餐状态"
          eyebrow="Account"
          description="在一个面板里看清组织、角色、并发和可用模型。"
        >
          <div className="space-y-4 text-sm leading-6 text-muted">
            <InfoCard label="组织名称" value={overview.organization?.name ?? "未绑定组织"} />
            <InfoCard label="组织角色" value={sessionUser.organization_role ?? "未设置"} />
            <InfoCard label="并发上限" value={`${sessionUser.plan.max_concurrent_jobs} 个任务`} />
            <InfoCard
              label="可用模型档位"
              value={sessionUser.plan.allowed_model_profiles
                .map((item) => getModelProfileLabel(item))
                .join(" / ")}
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="最近结果"
        eyebrow="Analyses"
        description="保存下来的分析和重演结果会在这里持续积累。"
      >
        <div className="space-y-4">
          {analyses.length ? (
            analyses.map((analysis) => (
              <Link
                key={analysis.id}
                href={`/analysis/${analysis.id}`}
                className="block rounded-[1.25rem] border border-line bg-canvas px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base font-semibold text-ink">{analysis.title}</p>
                  <p className="text-sm text-muted">
                    {formatDateTime(analysis.updated_at)}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {analysis.summary}
                </p>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-line bg-canvas p-5 text-sm text-muted">
              还没有真实推演记录。去首页或推演页发起第一条任务后，这里会自动更新。
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-line bg-panel p-5 shadow-panel">
      <p className="text-xs uppercase tracking-[0.22em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-line bg-canvas p-5">
      <p className="font-semibold text-ink">{label}</p>
      <p className="mt-2">{value}</p>
    </div>
  );
}
