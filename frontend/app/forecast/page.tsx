import { Suspense } from "react";

import { AnalysisForm } from "@/components/analysis-form";

export default function ForecastPage() {
  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="eyebrow">Mode 01</p>
        <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
          走向预测
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          当你的核心问题是“接下来大概率会怎样发展”时，用这个模式。它会识别关键变量、梳理因果关系，并告诉你哪些信号会改变当前判断。
        </p>
      </section>
      <Suspense fallback={<div className="surface-card p-6 text-sm text-muted">正在加载推演表单...</div>}>
        <AnalysisForm mode="forecast" />
      </Suspense>
    </div>
  );
}
