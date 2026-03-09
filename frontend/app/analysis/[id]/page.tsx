import { AnalysisResult } from "@/components/analysis-result";
import { SectionCard } from "@/components/section-card";
import { getAnalysis } from "@/lib/api";

export const dynamic = "force-dynamic";

type AnalysisDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function AnalysisDetailPage({
  params
}: AnalysisDetailPageProps) {
  try {
    const analysis = await getAnalysis(params.id);
    return <AnalysisResult analysis={analysis} />;
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "结果加载失败。";

    return (
      <div className="space-y-8">
        <section className="max-w-4xl">
          <p className="eyebrow">分析结果</p>
          <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
            当前结果暂时不可用
          </h1>
          <p className="mt-4 text-base leading-7 text-muted">{message}</p>
        </section>
        <SectionCard title="排查建议" eyebrow="Recovery">
          <ul className="space-y-3 text-sm leading-6 text-muted">
            <li>确认后端服务已经启动，并且分析接口可以正常访问。</li>
            <li>确认当前分析记录仍然存在，没有被删除。</li>
            <li>如果刚刚发起重演，稍等几秒再刷新页面。</li>
          </ul>
        </SectionCard>
      </div>
    );
  }
}
