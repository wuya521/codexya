"use client";

import Link from "next/link";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { rerunAnalysisJob } from "@/lib/api";

type AnalysisActionsProps = {
  analysisId: string;
};

const progressSteps = [
  "1/4 复制当前请求并创建重演任务",
  "2/4 读取上一版结果和上下文",
  "3/4 用最新逻辑重新生成结构化结果",
  "4/4 跳转到任务页并自动刷新状态"
];

export function AnalysisActions({ analysisId }: AnalysisActionsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(0);

  const helperText = isPending
    ? "系统正在创建新的重演任务。"
    : "重演会复用当前输入重新推演一版结果，适合在事实、约束或策略背景变化后重新校准。";

  const handleRerun = async () => {
    let timer: number | undefined;
    setIsPending(true);
    setError("");
    setCurrentStep(0);

    timer = window.setInterval(() => {
      setCurrentStep((previous) =>
        previous >= progressSteps.length - 1 ? previous : previous + 1
      );
    }, 800);

    try {
      const job = await rerunAnalysisJob(analysisId);
      startTransition(() => {
        router.push(`/jobs/${job.id}`);
        router.refresh();
      });
    } catch (rerunError) {
      setError(
        rerunError instanceof Error ? rerunError.message : "创建重演任务失败。"
      );
    } finally {
      if (timer) {
        window.clearInterval(timer);
      }
      setIsPending(false);
      setCurrentStep(0);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="button-primary justify-center"
        disabled={isPending}
        onClick={handleRerun}
      >
        {isPending ? "正在创建重演任务..." : "用最新逻辑重演"}
      </button>

      <div className="rounded-[1rem] border border-line bg-panel/70 p-3">
        <p className="text-xs tracking-[0.16em] text-muted">{helperText}</p>
        <div className="mt-3 space-y-2">
          {progressSteps.map((step, index) => {
            const isActive = isPending && index === currentStep;
            const isComplete = isPending && index < currentStep;

            return (
              <div
                key={step}
                className={`rounded-full px-3 py-2 text-xs transition ${
                  isActive
                    ? "border border-brand/30 bg-brand/10 text-brand"
                    : isComplete
                      ? "border border-line bg-canvas text-ink/80"
                      : "border border-line/60 bg-canvas/50 text-muted"
                }`}
              >
                {step}
              </div>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="text-sm text-warning">
          <p>{error}</p>
          {error.includes("登录") ? (
            <Link href="/login" className="underline">
              去登录
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
