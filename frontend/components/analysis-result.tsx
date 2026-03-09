import Link from "next/link";

import { AnalysisActions } from "@/components/analysis-actions";
import { AnalysisRoadmapPanel } from "@/components/analysis-roadmap-panel";
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

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[1.2rem] border border-line bg-canvas p-4">
      <p className="text-xs tracking-[0.18em] text-muted">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-[0.95rem] border border-line bg-panel/65 px-3 py-2 text-sm leading-6 text-ink/85"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function PathCard({ title, path }: { title: string; path: PathPlan }) {
  return (
    <article className="rounded-[1.4rem] border border-line bg-canvas p-5">
      <p className="text-xs tracking-[0.18em] text-muted">{title}</p>
      <h3 className="mt-2 text-xl font-semibold text-ink">{path.label}</h3>
      <div className="mt-4 space-y-3">
        {path.steps.map((step, index) => (
          <div
            key={step}
            className="flex gap-3 rounded-[1rem] border border-line bg-panel/65 px-4 py-3"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#12263a,#1d4768)] text-xs font-semibold text-white">
              {index + 1}
            </span>
            <p className="text-sm leading-6 text-ink/85">{step}</p>
          </div>
        ))}
      </div>
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
      <section className="grid gap-6 rounded-[2rem] border border-line bg-panel p-7 shadow-panel lg:grid-cols-[1.3fr_0.7fr]">
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
            <VersionMetric label="主路线" value={currentChoice} />
            <VersionMetric
              label="时间范围"
              value={analysis.problem_definition.time_horizon}
            />
            <VersionMetric
              label="模型档位"
              value={getModelProfileLabel(generation.model_profile ?? "balanced")}
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
        eyebrow="Version"
        description="这部分只回答一个问题：这一版和上一版相比，到底变化了什么。"
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
                  ? `这是第 ${generation.rerun_sequence} 次重演后的新版本`
                  : "这是首次生成的初版结果"}
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
                      这次没有明显结构变化
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
                          上一版更新时间：{formatDateTime(generation.source_updated_at)}
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
                这还是第一版结果，所以没有对比对象。后续重演后，这里会继续展示版本来源、差异模块和主路线变化。
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
              label="本次耗时"
              value={formatDurationMs(generation.elapsed_ms)}
            />
            <VersionMetric label="置信度变化" value={confidenceDeltaText} />
            <VersionMetric
              label="主路线变化"
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

      <SectionCard
        title="执行地图"
        eyebrow="Roadmap"
        description="先决定主路线，再看时间轴动作。这样用户看完结果页就能直接开始执行。"
      >
        <AnalysisRoadmapPanel
          nextActions={analysis.next_actions}
          recommendedPaths={analysis.recommended_paths}
        />
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
        <SectionCard
          title="问题框定"
          eyebrow="Problem"
          description="如果目标定义不清楚，后面的路径再漂亮也没有意义。"
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
          description="把事实、约束和未知项拆开看，才能知道判断建立在什么地基上。"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <ListBlock title="事实" items={analysis.current_state.facts} />
            <ListBlock title="约束" items={analysis.current_state.constraints} />
            <ListBlock title="未知项" items={analysis.current_state.unknowns} />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="关键变量"
        eyebrow="Drivers"
        description="这些变量是当前问题里最值得盯住的杠杆，不是装饰性的标签云。"
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

      <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <SectionCard
          title="因果图谱"
          eyebrow="Causal Map"
          description="把变量之间的推动、约束和削弱关系画清楚，路径判断才有来历。"
        >
          <CausalGraphPanel
            variables={analysis.variables}
            edges={analysis.causal_edges}
          />
        </SectionCard>
        <SectionCard
          title="情景分支"
          eyebrow="Scenarios"
          description="不是只给一个结论，而是给出几种可能走向、触发条件和观察信号。"
        >
          <ScenarioPanel scenarios={analysis.scenarios} />
        </SectionCard>
      </div>

      <SectionCard
        title="路径收益模拟"
        eyebrow="Reward Map"
        description="把三条路线的速度、稳定性、杠杆效率和可回退空间并排比较。"
      >
        <StrategyRewardPanel
          recommendedPaths={analysis.recommended_paths}
          confidence={analysis.confidence}
          risks={analysis.risks}
        />
      </SectionCard>

      <SectionCard
        title="路线对比"
        eyebrow="Path Options"
        description="最快、最好、最稳三条路线都展开给你看，便于直接比较和落地。"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <PathCard title="最快路线" path={analysis.recommended_paths.fastest} />
          <PathCard title="最好路线" path={analysis.recommended_paths.best} />
          <PathCard title="最稳路线" path={analysis.recommended_paths.safest} />
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
        <SectionCard
          title="风险缓冲"
          eyebrow="Risk"
          description="结果不是只告诉你去做什么，也要告诉你哪些地方最容易失手。"
        >
          <div className="space-y-4">
            {analysis.risks.map((risk) => (
              <div
                key={risk.name}
                className="rounded-[1.2rem] border border-line bg-canvas p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base font-semibold text-ink">{risk.name}</p>
                  <span className="status-pill">{getRiskLabel(risk.level)}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {risk.description}
                </p>
                <p className="mt-2 text-sm text-ink/85">
                  缓冲动作：{risk.mitigation}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="观察信号"
          eyebrow="Signals"
          description="这些信号决定你该继续推进、暂停，还是发起下一次重演。"
        >
          <div className="space-y-4">
            {analysis.watch_signals.map((item) => (
              <div
                key={item.signal}
                className="rounded-[1.2rem] border border-line bg-canvas p-4"
              >
                <p className="text-base font-semibold text-ink">{item.signal}</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  为什么重要：{item.why_it_matters}
                </p>
                <p className="mt-2 text-sm text-ink/85">
                  一旦变化意味着：{item.what_change_means}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
