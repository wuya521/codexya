import Link from "next/link";

import { AnalysisActions } from "@/components/analysis-actions";
import { CausalGraphPanel } from "@/components/causal-graph-panel";
import { ScenarioPanel } from "@/components/scenario-panel";
import { SectionCard } from "@/components/section-card";
import { StrategyRewardPanel } from "@/components/strategy-reward-panel";
import {
  formatDateTime,
  formatDurationMs,
  formatSignedPercent,
  getDirectionLabel,
  getGenerationModeLabel,
  getHorizonLabel,
  getLevelLabel,
  getModeLabel,
  getModelProfileLabel,
  getOptimizationLabel,
  getProviderLabel,
  getRiskLabel,
  sanitizeAnalysisTitle
} from "@/lib/display";
import type {
  AnalysisGeneration,
  AnalysisRecord,
  GenerationMode,
  PathPlan
} from "@/types/analysis";

type AnalysisResultProps = {
  analysis: AnalysisRecord;
};

type NormalizedGeneration = {
  generation_mode: GenerationMode;
  provider: string;
  model: string;
  model_profile: AnalysisGeneration["model_profile"];
  elapsed_ms: number | null;
  source_analysis_id: string | null;
  source_title: string | null;
  source_updated_at: string | null;
  rerun_sequence: number;
  changed: boolean;
  change_summary: string;
  changed_sections: string[];
  confidence_delta: number;
  previous_confidence: number | null;
  primary_choice_changed: boolean;
  previous_primary_choice: AnalysisGeneration["previous_primary_choice"];
};

function normalizeGeneration(analysis: AnalysisRecord): NormalizedGeneration {
  return {
    generation_mode: analysis.generation?.generation_mode ?? "initial",
    provider: analysis.generation?.provider ?? "unknown",
    model: analysis.generation?.model ?? "unknown",
    model_profile: analysis.generation?.model_profile ?? "balanced",
    elapsed_ms: analysis.generation?.elapsed_ms ?? null,
    source_analysis_id: analysis.generation?.source_analysis_id ?? null,
    source_title: analysis.generation?.source_title ?? null,
    source_updated_at: analysis.generation?.source_updated_at ?? null,
    rerun_sequence: analysis.generation?.rerun_sequence ?? 0,
    changed: analysis.generation?.changed ?? true,
    change_summary:
      analysis.generation?.change_summary ?? "这是当前最新的一版结果。",
    changed_sections: analysis.generation?.changed_sections ?? [],
    confidence_delta: analysis.generation?.confidence_delta ?? 0,
    previous_confidence: analysis.generation?.previous_confidence ?? null,
    primary_choice_changed: analysis.generation?.primary_choice_changed ?? false,
    previous_primary_choice:
      analysis.generation?.previous_primary_choice ?? null
  };
}

function VersionMetric({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-line bg-canvas p-4">
      <p className="text-xs tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-sm leading-6 text-ink">{value}</p>
    </div>
  );
}

function PathCard({ title, path }: { title: string; path: PathPlan }) {
  return (
    <article className="rounded-[1.4rem] border border-line bg-canvas p-5">
      <p className="text-xs tracking-[0.18em] text-muted">{title}</p>
      <h3 className="mt-2 text-xl font-semibold text-ink">{path.label}</h3>
      <ol className="mt-4 space-y-3 text-sm leading-6 text-ink/85">
        {path.steps.map((step) => (
          <li key={step} className="rounded-[1rem] border border-line bg-panel/60 px-4 py-3">
            {step}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        {path.tradeoffs.map((tradeoff) => (
          <span
            key={tradeoff}
            className="rounded-full border border-line bg-panel/70 px-3 py-1 text-xs text-muted"
          >
            {tradeoff}
          </span>
        ))}
      </div>
    </article>
  );
}

export function AnalysisResult({ analysis }: AnalysisResultProps) {
  const generation = normalizeGeneration(analysis);
  const displayTitle = sanitizeAnalysisTitle(analysis.title);
  const currentChoice = getOptimizationLabel(
    analysis.recommended_paths.primary_choice
  );
  const previousChoice = generation.previous_primary_choice
    ? getOptimizationLabel(generation.previous_primary_choice)
    : null;
  const confidenceDeltaText =
    Math.abs(generation.confidence_delta) >= 0.01
      ? `${formatSignedPercent(generation.confidence_delta)} (${Math.round(
          (generation.previous_confidence ?? 0) * 100
        )}% → ${Math.round(analysis.confidence * 100)}%)`
      : "基本不变";

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-[2rem] border border-line bg-panel p-7 shadow-panel lg:grid-cols-[1.35fr_0.65fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="status-pill">{getModeLabel(analysis.mode)}</span>
            <span className="status-pill">
              {getGenerationModeLabel(generation.generation_mode)}
            </span>
            <span className="status-pill">
              {getProviderLabel(generation.provider)} / {generation.model}
            </span>
          </div>
          <h1 className="display-title mt-5 text-3xl font-semibold text-ink lg:text-4xl">
            {displayTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            {analysis.summary}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <VersionMetric
              label="主推荐路径"
              value={currentChoice}
            />
            <VersionMetric
              label="运行档位"
              value={getModelProfileLabel(generation.model_profile ?? "balanced")}
            />
            <VersionMetric
              label="最近更新时间"
              value={formatDateTime(analysis.updated_at)}
            />
          </div>
        </div>

        <div className="grid gap-4 rounded-[1.5rem] border border-line bg-canvas p-5">
          <div>
            <p className="text-xs tracking-[0.2em] text-muted">置信度</p>
            <p className="mt-2 text-4xl font-semibold text-ink">
              {Math.round(analysis.confidence * 100)}%
            </p>
          </div>
          <div>
            <p className="text-xs tracking-[0.2em] text-muted">本次耗时</p>
            <p className="mt-2 text-sm text-ink">
              {formatDurationMs(generation.elapsed_ms)}
            </p>
          </div>
          <div>
            <p className="text-xs tracking-[0.2em] text-muted">推荐理由</p>
            <p className="mt-2 text-sm leading-6 text-ink/85">
              {analysis.recommended_paths.reason}
            </p>
          </div>
          <AnalysisActions analysisId={analysis.id} />
        </div>
      </section>

      <SectionCard
        title={
          generation.generation_mode === "rerun" ? "重演版本说明" : "结果版本说明"
        }
        eyebrow="版本"
        description="让用户清楚看到这次结果来自哪里、变化了什么，而不是只看到一页新的回答。"
      >
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div
              className={`rounded-[1.25rem] border p-5 ${
                generation.generation_mode === "rerun" && generation.changed
                  ? "border-brand/20 bg-brand/10"
                  : "border-line bg-canvas"
              }`}
            >
              <p className="text-xs tracking-[0.2em] text-muted">
                {getGenerationModeLabel(generation.generation_mode)}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-ink">
                {generation.generation_mode === "rerun"
                  ? `这是第 ${generation.rerun_sequence} 次重演生成的新版本`
                  : "这是首次生成的初始版本"}
              </h3>
              <p className="mt-3 text-sm leading-6 text-ink/85">
                {generation.change_summary}
              </p>
            </div>

            {generation.generation_mode === "rerun" ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {generation.changed_sections.length ? (
                    generation.changed_sections.map((section) => (
                      <span
                        key={section}
                        className="rounded-full border border-line bg-canvas px-3 py-1 text-xs tracking-[0.16em] text-ink/80"
                      >
                        {section}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs tracking-[0.16em] text-muted">
                      本次没有明显的结构性变化
                    </span>
                  )}
                </div>

                <div className="rounded-[1.25rem] border border-line bg-canvas p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs tracking-[0.2em] text-muted">
                        来源版本
                      </p>
                      <p className="mt-2 text-sm text-ink">
                        {sanitizeAnalysisTitle(
                          generation.source_title ?? "上一版结果"
                        )}
                      </p>
                      {generation.source_updated_at ? (
                        <p className="mt-1 text-xs text-muted">
                          上一版更新时间：
                          {formatDateTime(generation.source_updated_at)}
                        </p>
                      ) : null}
                    </div>
                    {generation.source_analysis_id ? (
                      <Link
                        href={`/analysis/${generation.source_analysis_id}`}
                        className="text-sm text-brand underline underline-offset-4"
                      >
                        查看上一版
                      </Link>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm leading-6 text-muted">
                这还是第一版结果，所以没有对比对象。后续重演后，这里会展示版本来源、变化模块和差异摘要。
              </p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <VersionMetric
              label="生成方式"
              value={
                generation.generation_mode === "rerun"
                  ? `${getGenerationModeLabel(generation.generation_mode)} V${generation.rerun_sequence}`
                  : getGenerationModeLabel(generation.generation_mode)
              }
            />
            <VersionMetric
              label="运行模型"
              value={`${getProviderLabel(generation.provider)} / ${generation.model}`}
            />
            <VersionMetric
              label="模型档位"
              value={getModelProfileLabel(generation.model_profile ?? "balanced")}
            />
            <VersionMetric label="本次耗时" value={formatDurationMs(generation.elapsed_ms)} />
            <VersionMetric label="置信度变化" value={confidenceDeltaText} />
            <VersionMetric
              label="主推荐变化"
              value={
                previousChoice
                  ? generation.primary_choice_changed
                    ? `${previousChoice} → ${currentChoice}`
                    : `${currentChoice}（未变化）`
                  : currentChoice
              }
            />
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
        <SectionCard
          title="问题框定"
          eyebrow="Problem Frame"
          description="先对齐目标，再看变量。否则后面的路径都只是漂亮话。"
        >
          <p className="text-sm leading-6 text-muted">
            {analysis.problem_definition.objective}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {analysis.problem_definition.success_criteria.map((item) => (
              <div
                key={item}
                className="rounded-[1rem] border border-line bg-canvas px-4 py-3 text-sm text-ink/85"
              >
                {item}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="当前基线"
          eyebrow="Baseline"
          description="事实、约束和未知项被拆开后，才有资格谈因果和策略。"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <ListBlock title="事实" items={analysis.current_state.facts} />
            <ListBlock title="约束" items={analysis.current_state.constraints} />
            <ListBlock title="未知项" items={analysis.current_state.unknowns} />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="关键变量雷达"
        eyebrow="Drivers"
        description="这里展示当前问题里最值得盯住的变量，而不是堆满一张无关信息表。"
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {analysis.variables.map((variable) => (
            <article
              key={variable.name}
              className="rounded-[1.35rem] border border-line bg-canvas p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    {variable.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    {getDirectionLabel(variable.direction)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs tracking-[0.16em] text-muted">重要度</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">
                    {Math.round(variable.importance * 100)}%
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm leading-6 text-muted">
                <p>可控性：{getLevelLabel(variable.controllability)}</p>
                <p>可观察性：{getLevelLabel(variable.observability)}</p>
                <p>当前状态：{variable.current_state}</p>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="因果图谱"
          eyebrow="Causal Map"
          description="不是简单列点，而是把变量之间的推动、约束和削弱关系结构化展示出来。"
        >
          <CausalGraphPanel
            variables={analysis.variables}
            edges={analysis.causal_edges}
          />
        </SectionCard>
        <SectionCard
          title="情景分支"
          eyebrow="Scenario Lanes"
          description="从单一路径改成概率带 + 触发条件 + 观察信号，更适合真实决策。"
        >
          <ScenarioPanel scenarios={analysis.scenarios} />
        </SectionCard>
      </div>

      <SectionCard
        title="路线奖励模拟"
        eyebrow="Reward Map"
        description="用可解释维度去比较三条路径的速度、稳定性、杠杆效率和保留选项。"
      >
        <StrategyRewardPanel
          recommendedPaths={analysis.recommended_paths}
          confidence={analysis.confidence}
          risks={analysis.risks}
        />
      </SectionCard>

      <SectionCard
        title="推荐路径"
        eyebrow="Action Design"
        description="把最快、最好、最稳三条路径并排展示，方便直接比较。"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <PathCard title="最快路径" path={analysis.recommended_paths.fastest} />
          <PathCard title="最好路径" path={analysis.recommended_paths.best} />
          <PathCard title="最稳路径" path={analysis.recommended_paths.safest} />
        </div>
        <div className="mt-5 rounded-[1.25rem] border border-brand/20 bg-brand/10 px-5 py-4 text-sm text-brand">
          {analysis.recommended_paths.reason}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="风险点"
          eyebrow="Failure Modes"
          description="风险不会被省略，只会被说清楚。每个风险都要配上应对动作。"
        >
          <div className="space-y-4">
            {analysis.risks.map((risk) => (
              <div
                key={risk.name}
                className="rounded-[1.25rem] border border-line bg-canvas p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-semibold text-ink">{risk.name}</h3>
                  <span className="rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-xs tracking-[0.18em] text-warning">
                    {getRiskLabel(risk.level)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {risk.description}
                </p>
                <p className="mt-3 text-sm text-ink/85">{risk.mitigation}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="观察信号"
          eyebrow="Signals"
          description="这部分决定你之后该盯什么，而不是做完一次推演就结束。"
        >
          <div className="space-y-4">
            {analysis.watch_signals.map((signal) => (
              <div
                key={signal.signal}
                className="rounded-[1.25rem] border border-line bg-canvas p-5"
              >
                <h3 className="text-base font-semibold text-ink">
                  {signal.signal}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {signal.why_it_matters}
                </p>
                <p className="mt-3 text-sm text-ink/85">
                  {signal.what_change_means}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="下一步动作"
        eyebrow="Execution"
        description="把结论压缩成可执行动作，避免结果页停留在理解层。"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {analysis.next_actions.map((item) => (
            <div
              key={`${item.horizon}-${item.action}`}
              className="rounded-[1.25rem] border border-line bg-canvas p-5"
            >
              <p className="text-xs tracking-[0.2em] text-muted">
                {getHorizonLabel(item.horizon)}
              </p>
              <h3 className="mt-2 text-base font-semibold text-ink">
                {item.action}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">
                {item.expected_outcome}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[1.25rem] border border-line bg-canvas p-5">
      <p className="text-xs tracking-[0.2em] text-muted">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-ink/85">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
