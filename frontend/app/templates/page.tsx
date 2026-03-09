import { SectionCard } from "@/components/section-card";
import { TemplateStudio } from "@/components/template-studio";
import { getTemplates } from "@/lib/api";
import type { TemplateRecord } from "@/types/analysis";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  let templates: TemplateRecord[] = [];
  let error = "";

  try {
    templates = await getTemplates();
  } catch (caughtError) {
    error = caughtError instanceof Error ? caughtError.message : "模板库加载失败。";
  }

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className="eyebrow">模板</p>
        <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
          可直接套用的分析起点
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          模板不是“帮你偷懒”的装饰，而是把高频决策场景预先组织好，让团队在相同结构下持续复盘。
        </p>
      </section>

      {error ? (
        <div className="rounded-[1.5rem] border border-warning/25 bg-warning/10 px-5 py-4 text-sm text-warning">
          {error}
        </div>
      ) : null}

      {templates.length ? (
        <TemplateStudio templates={templates} />
      ) : (
        <SectionCard title="模板库暂时不可用" eyebrow="Templates">
          <p className="text-sm leading-6 text-muted">
            后端模板接口没有返回数据，请先确认后端服务已启动。
          </p>
        </SectionCard>
      )}
    </div>
  );
}
