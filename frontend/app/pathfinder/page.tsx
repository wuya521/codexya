import { Suspense } from "react";

import { AnalysisForm } from "@/components/analysis-form";

export default function PathfinderPage() {
  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="eyebrow">Mode 02</p>
        <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
          最佳路径
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          当你的问题是“在现实约束下，怎样把事情做成”时，用这个模式。它会并排比较最快、最好、最稳三条路径，并明确每条路线的权衡和下一步动作。
        </p>
      </section>
      <Suspense fallback={<div className="surface-card p-6 text-sm text-muted">正在加载推演表单...</div>}>
        <AnalysisForm mode="best_path" />
      </Suspense>
    </div>
  );
}
