"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PageStatus } from "@/components/page-status";
import { SectionCard } from "@/components/section-card";
import { getSessionToken } from "@/lib/auth";
import { buildAnalysisJobEventsUrl, getAnalysisJob } from "@/lib/api";
import {
  formatDateTime,
  getJobStatusLabel,
  getModeLabel,
  getModelProfileLabel,
  getProviderLabel
} from "@/lib/display";
import type { AnalysisJobRecord } from "@/types/analysis";

type AnalysisJobProgressProps = {
  jobId: string;
};

export function AnalysisJobProgress({ jobId }: AnalysisJobProgressProps) {
  const router = useRouter();
  const [job, setJob] = useState<AnalysisJobRecord | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [transport, setTransport] = useState("polling");

  const progressPercent = useMemo(() => job?.progress ?? 0, [job]);

  useEffect(() => {
    let mounted = true;
    let intervalId: number | undefined;
    let eventSource: EventSource | null = null;

    const refreshJob = async () => {
      try {
        const nextJob = await getAnalysisJob(jobId);
        if (!mounted) {
          return;
        }
        setJob(nextJob);
        setError("");
        if (nextJob.status === "completed" && nextJob.result_analysis_id) {
          router.replace(`/analysis/${nextJob.result_analysis_id}`);
        }
      } catch (caughtError) {
        if (mounted) {
          setError(
            caughtError instanceof Error ? caughtError.message : "任务状态加载失败。"
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void refreshJob();
    intervalId = window.setInterval(() => {
      void refreshJob();
    }, 1500);

    const token = getSessionToken();
    if (token) {
      eventSource = new EventSource(buildAnalysisJobEventsUrl(jobId, token));
      eventSource.onopen = () => {
        if (mounted) {
          setTransport("sse + polling");
        }
      };
      eventSource.onmessage = () => {
        void refreshJob();
      };
      eventSource.onerror = () => {
        if (mounted) {
          setTransport("polling");
        }
      };
    }

    return () => {
      mounted = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      eventSource?.close();
    };
  }, [jobId, router]);

  if (isLoading) {
    return (
      <PageStatus
        eyebrow="异步任务"
        title="正在连接任务状态"
        description="系统正在读取后台队列、模型执行状态和实时事件流。"
      />
    );
  }

  if (!job) {
    return (
      <PageStatus
        eyebrow="异步任务"
        title="当前任务暂时不可用"
        description={error || "未找到对应任务，请稍后重试。"}
        actionHref="/workspace"
        actionLabel="返回工作台"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-[2rem] border border-line bg-panel p-7 shadow-panel lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="eyebrow">异步任务</p>
          <h1 className="display-title mt-4 text-3xl font-semibold text-ink">
            {job.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            {getModeLabel(job.mode)}已经进入后台执行。页面会同时用轮询和
            SSE 刷新状态，完成后自动跳转到结果页。
          </p>

          <div className="mt-6 rounded-[1.5rem] border border-line bg-canvas p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.2em] text-muted">当前状态</p>
                <p className="mt-2 text-xl font-semibold text-ink">
                  {getJobStatusLabel(job.status)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs tracking-[0.2em] text-muted">进度</p>
                <p className="mt-2 text-xl font-semibold text-ink">
                  {progressPercent}%
                </p>
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-line/70">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#21486b,#b35c34)] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-4 text-sm text-muted">{job.step}</p>
          </div>
        </div>

        <div className="grid gap-4 rounded-[1.5rem] border border-line bg-canvas p-5">
          <Meta label="同步方式" value={transport} />
          <Meta label="模型档位" value={getModelProfileLabel(job.model_profile)} />
          <Meta
            label="目标模型"
            value={`${getProviderLabel(job.provider)} / ${job.selected_model}`}
          />
          <Meta
            label="队列位置"
            value={job.queue_position > 0 ? `第 ${job.queue_position} 位` : "正在执行"}
          />
          <Meta label="创建时间" value={formatDateTime(job.created_at)} />
          {job.source_analysis_id ? (
            <Link
              href={`/analysis/${job.source_analysis_id}`}
              className="text-sm text-brand underline underline-offset-4"
            >
              查看上一版结果
            </Link>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="实时事件" eyebrow="Timeline">
          <div className="space-y-4">
            {job.events.map((event) => (
              <div
                key={`${event.at}-${event.progress}-${event.step}`}
                className="rounded-[1.25rem] border border-line bg-canvas p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{event.step}</p>
                  <p className="text-xs text-muted">{formatDateTime(event.at)}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {event.message}
                </p>
                <p className="mt-2 text-xs text-ink/80">
                  {getJobStatusLabel(event.status)} / {event.progress}%
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="执行原理"
          eyebrow="How It Works"
          description="这条链路专门用来解决长推理任务卡页面、体验断裂和进度不可见的问题。"
        >
          <div className="space-y-4 text-sm leading-7 text-muted">
            <p>1. 提交表单后，后端先创建任务记录并写入异步队列。</p>
            <p>2. Worker 领取任务后，先校验套餐额度、并发上限和模型权限。</p>
            <p>3. 模型输出固定结构化 JSON，再落盘为可回看的分析记录。</p>
            <p>4. 前端同时用轮询和 SSE 保持更新，完成后自动跳转。</p>
            {job.error_message ? (
              <div className="rounded-[1.25rem] border border-warning/25 bg-warning/10 p-4 text-warning">
                <p className="font-semibold">失败原因</p>
                <p className="mt-2">{job.error_message}</p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-line bg-panel/70 p-4">
      <p className="text-xs tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 text-sm leading-6 text-ink">{value}</p>
    </div>
  );
}
