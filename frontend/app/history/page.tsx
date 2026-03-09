import { HistoryBoard } from "@/components/history-board";
import { SectionCard } from "@/components/section-card";
import { getAnalyses } from "@/lib/api";
import type { AnalysisRecord } from "@/types/analysis";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  let analyses: AnalysisRecord[] = [];
  let error = "";

  try {
    analyses = await getAnalyses();
  } catch (caughtError) {
    error = caughtError instanceof Error ? caughtError.message : "历史记录加载失败。";
  }

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="eyebrow">历史记录</p>
        <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
          已保存的推演与重演
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          这里沉淀每一次真实推演结果，方便回看、比较和继续重演。
        </p>
      </section>

      {error ? (
        <div className="rounded-[1.5rem] border border-warning/25 bg-warning/10 px-5 py-4 text-sm text-warning">
          {error}
        </div>
      ) : null}

      {analyses.length ? (
        <HistoryBoard analyses={analyses} />
      ) : (
        <SectionCard title="暂无可展示记录" eyebrow="Archive">
          <p className="text-sm leading-6 text-muted">
            还没有真实推演结果。去首页或推演页发起第一条任务后，这里会自动更新。
          </p>
        </SectionCard>
      )}
    </div>
  );
}
