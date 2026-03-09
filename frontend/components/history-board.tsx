"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { formatDateTime, getGenerationModeLabel, getModeLabel } from "@/lib/display";
import type { AnalysisMode, AnalysisRecord } from "@/types/analysis";

type HistoryBoardProps = {
  analyses: AnalysisRecord[];
};

function averageConfidence(analyses: AnalysisRecord[]) {
  if (analyses.length === 0) {
    return 0;
  }
  return Math.round(
    (analyses.reduce((sum, item) => sum + item.confidence, 0) / analyses.length) *
      100
  );
}

export function HistoryBoard({ analyses }: HistoryBoardProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<AnalysisMode | "all">("all");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    return analyses.filter((analysis) => {
      const matchesMode = mode === "all" || analysis.mode === mode;
      const haystack =
        `${analysis.title} ${analysis.summary} ${analysis.recommended_paths.reason}`.toLowerCase();
      const matchesQuery =
        deferredQuery.trim() === "" ||
        haystack.includes(deferredQuery.trim().toLowerCase());
      return matchesMode && matchesQuery;
    });
  }, [analyses, deferredQuery, mode]);

  const forecastCount = analyses.filter((item) => item.mode === "forecast").length;
  const pathCount = analyses.filter((item) => item.mode === "best_path").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="总记录" value={String(analyses.length)} />
        <MetricCard label="走向预测" value={String(forecastCount)} />
        <MetricCard label="平均置信度" value={`${averageConfidence(analyses)}%`} />
      </section>

      <div className="grid gap-4 rounded-[1.6rem] border border-line bg-panel p-5 shadow-panel md:grid-cols-[1fr_auto]">
        <input
          className="input-base"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索标题、摘要或推荐理由"
        />
        <select
          className="input-base md:min-w-[180px]"
          value={mode}
          onChange={(event) => setMode(event.target.value as AnalysisMode | "all")}
        >
          <option value="all">全部记录</option>
          <option value="forecast">走向预测</option>
          <option value="best_path">最佳路径</option>
        </select>
      </div>

      <div className="space-y-4">
        {filtered.map((analysis) => (
          <Link
            key={analysis.id}
            href={`/analysis/${analysis.id}`}
            className="grid gap-4 rounded-[1.5rem] border border-line bg-panel p-5 shadow-panel transition hover:border-brand/35 hover:-translate-y-0.5 lg:grid-cols-[1.2fr_0.5fr_0.3fr]"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="status-pill">{getModeLabel(analysis.mode)}</span>
                <span className="status-pill">
                  {getGenerationModeLabel(
                    analysis.generation?.generation_mode ?? "initial"
                  )}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-ink">
                {analysis.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                {analysis.summary}
              </p>
            </div>
            <div className="text-sm text-muted">
              <p>更新时间</p>
              <p className="mt-2 text-ink">{formatDateTime(analysis.updated_at)}</p>
              <p className="mt-4">推荐路径</p>
              <p className="mt-2 text-ink">
                {analysis.recommended_paths.reason}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs tracking-[0.16em] text-muted">置信度</p>
              <p className="mt-2 text-3xl font-semibold text-ink">
                {Math.round(analysis.confidence * 100)}%
              </p>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[1.6rem] border border-dashed border-line bg-panel p-6 text-sm text-muted">
          当前筛选条件下没有找到结果。你可以清空关键词或切回全部模式。
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-line bg-panel p-5 shadow-panel">
      <p className="text-xs tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}
