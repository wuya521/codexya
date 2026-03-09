"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { getModeLabel } from "@/lib/display";
import type { AnalysisMode, TemplateRecord } from "@/types/analysis";

type TemplateStudioProps = {
  templates: TemplateRecord[];
};

export function TemplateStudio({ templates }: TemplateStudioProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<AnalysisMode | "all">("all");
  const [copiedId, setCopiedId] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesMode = mode === "all" || template.mode === mode;
      const haystack = `${template.name} ${template.description} ${template.scenario} ${template.starter_prompt}`.toLowerCase();
      const matchesQuery =
        deferredQuery.trim() === "" ||
        haystack.includes(deferredQuery.trim().toLowerCase());
      return matchesMode && matchesQuery;
    });
  }, [deferredQuery, mode, templates]);

  async function copyPrompt(template: TemplateRecord) {
    await navigator.clipboard.writeText(template.starter_prompt);
    setCopiedId(template.id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === template.id ? "" : current));
    }, 1500);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-[1.6rem] border border-line bg-panel p-5 shadow-panel md:grid-cols-[1fr_auto_auto]">
        <input
          className="input-base"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索模板名称、场景、描述或起始问题"
        />
        <select
          className="input-base md:min-w-[180px]"
          value={mode}
          onChange={(event) => setMode(event.target.value as AnalysisMode | "all")}
        >
          <option value="all">全部模式</option>
          <option value="forecast">走向预测</option>
          <option value="best_path">最佳路径</option>
        </select>
        <div className="status-pill h-fit">
          共 {filteredTemplates.length} 个可用模板
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {filteredTemplates.map((template) => (
          <article
            key={template.id}
            className="flex h-full flex-col rounded-[1.7rem] border border-line bg-panel p-6 shadow-panel"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{getModeLabel(template.mode)}</p>
                <h2 className="mt-3 text-2xl font-semibold text-ink">
                  {template.name}
                </h2>
              </div>
              <span className="status-pill">模板</span>
            </div>

            <p className="mt-4 text-sm leading-6 text-muted">
              {template.description}
            </p>

            <div className="mt-5 rounded-[1.2rem] border border-line bg-canvas p-4">
              <p className="text-xs tracking-[0.18em] text-muted">适用场景</p>
              <p className="mt-2 text-sm leading-6 text-ink/85">
                {template.scenario}
              </p>
            </div>

            <div className="mt-4 rounded-[1.2rem] border border-line bg-canvas p-4">
              <p className="text-xs tracking-[0.18em] text-muted">起始问题</p>
              <p className="mt-2 text-sm leading-6 text-ink/85">
                {template.starter_prompt}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`${template.mode === "forecast" ? "/forecast" : "/pathfinder"}?template=${template.id}`}
                className="button-primary"
              >
                套用模板
              </Link>
              <button
                type="button"
                className="button-secondary"
                onClick={() => void copyPrompt(template)}
              >
                {copiedId === template.id ? "已复制起始问题" : "复制起始问题"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="rounded-[1.6rem] border border-dashed border-line bg-panel p-6 text-sm text-muted">
          没有找到符合筛选条件的模板。你可以先清空关键词，或切换模式继续查看。
        </div>
      ) : null}
    </div>
  );
}
