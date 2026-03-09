import {
  getHorizonLabel,
  getOptimizationLabel
} from "@/lib/display";
import type {
  NextAction,
  OptimizationTarget,
  RecommendedPaths
} from "@/types/analysis";

type AnalysisRoadmapPanelProps = {
  nextActions: NextAction[];
  recommendedPaths: RecommendedPaths;
};

const horizons: NextAction["horizon"][] = ["now", "7d", "30d", "90d"];

export function AnalysisRoadmapPanel({
  nextActions,
  recommendedPaths
}: AnalysisRoadmapPanelProps) {
  const primaryTarget = recommendedPaths.primary_choice;
  const primaryPath = recommendedPaths[primaryTarget];

  return (
    <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="rounded-[1.35rem] border border-brand/20 bg-brand/10 p-5">
        <p className="text-xs tracking-[0.2em] text-muted">主路线</p>
        <h3 className="mt-2 text-2xl font-semibold text-ink">
          {getOptimizationLabel(primaryTarget)}
        </h3>
        <p className="mt-3 text-sm leading-6 text-ink/85">
          {recommendedPaths.reason}
        </p>

        <div className="mt-5 space-y-3">
          {primaryPath.steps.map((step, index) => (
            <div
              key={step}
              className="flex gap-3 rounded-[1.15rem] border border-white/50 bg-white/60 px-4 py-3"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#12263a,#1d4768)] text-xs font-semibold text-white">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-ink">{step}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {horizons.map((horizon) => {
          const items = nextActions.filter((action) => action.horizon === horizon);
          return (
            <div
              key={horizon}
              className="rounded-[1.35rem] border border-line bg-canvas p-5"
            >
              <p className="text-xs tracking-[0.18em] text-muted">
                {getHorizonLabel(horizon)}
              </p>
              <div className="mt-4 space-y-3">
                {items.length ? (
                  items.map((action) => (
                    <div
                      key={`${horizon}-${action.action}`}
                      className="rounded-[1rem] border border-line bg-panel/70 p-4"
                    >
                      <p className="text-sm font-semibold text-ink">{action.action}</p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        预期结果：{action.expected_outcome}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-line bg-panel/50 p-4 text-sm text-muted">
                    当前这段时间没有新增动作，优先完成上一阶段。
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
