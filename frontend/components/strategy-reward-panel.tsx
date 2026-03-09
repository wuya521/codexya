import { getOptimizationLabel, getRiskLabel } from "@/lib/display";
import type {
  OptimizationTarget,
  RecommendedPaths,
  RiskItem
} from "@/types/analysis";

type StrategyRewardPanelProps = {
  recommendedPaths: RecommendedPaths;
  confidence: number;
  risks: RiskItem[];
};

type RewardCard = {
  target: OptimizationTarget;
  title: string;
  overall: number;
  speed: number;
  stability: number;
  leverage: number;
  optionality: number;
  steps: number;
  tradeoffs: number;
  highlighted: boolean;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildRewardCard(
  target: OptimizationTarget,
  recommendedPaths: RecommendedPaths,
  confidence: number,
  risks: RiskItem[]
): RewardCard {
  const path = recommendedPaths[target];
  const highRisks = risks.filter((risk) => risk.level === "high").length;
  const mediumRisks = risks.filter((risk) => risk.level === "medium").length;
  const stepWeight = path.steps.length;
  const tradeoffWeight = path.tradeoffs.length;

  const speed = clamp(
    92 - stepWeight * 9 + (target === "fastest" ? 18 : target === "best" ? 4 : -8)
  );
  const stability = clamp(
    confidence * 100 - highRisks * 10 - mediumRisks * 4 + (target === "safest" ? 20 : 4)
  );
  const leverage = clamp(
    confidence * 100 +
      (target === "best" ? 14 : target === "fastest" ? 8 : 10) -
      tradeoffWeight * 2
  );
  const optionality = clamp(
    78 - Math.max(stepWeight - 3, 0) * 4 - tradeoffWeight * 3 + (target === "best" ? 10 : 4)
  );

  const overall = clamp(
    speed * 0.24 +
      stability * 0.31 +
      leverage * 0.25 +
      optionality * 0.2 +
      (recommendedPaths.primary_choice === target ? 6 : 0)
  );

  return {
    target,
    title: getOptimizationLabel(target),
    overall,
    speed,
    stability,
    leverage,
    optionality,
    steps: path.steps.length,
    tradeoffs: path.tradeoffs.length,
    highlighted: recommendedPaths.primary_choice === target
  };
}

export function StrategyRewardPanel({
  recommendedPaths,
  confidence,
  risks
}: StrategyRewardPanelProps) {
  const cards = [
    buildRewardCard("fastest", recommendedPaths, confidence, risks),
    buildRewardCard("best", recommendedPaths, confidence, risks),
    buildRewardCard("safest", recommendedPaths, confidence, risks)
  ];
  const highestRisk = risks[0];

  return (
    <div className="space-y-5">
      <div className="rounded-[1.3rem] border border-line bg-canvas p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">路线奖励模拟</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              这里不是伪装成“强化学习训练”的黑箱分数，而是根据当前路径长度、权衡成本、风险密度和整体置信度做出的可解释奖励估算。
            </p>
          </div>
          {highestRisk ? (
            <span className="rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-xs tracking-[0.16em] text-warning">
              当前最高风险：{getRiskLabel(highestRisk.level)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.target}
            className={`rounded-[1.4rem] border p-5 ${
              card.highlighted
                ? "border-brand/35 bg-[rgba(179,92,52,0.08)]"
                : "border-line bg-canvas"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.18em] text-muted">路径策略</p>
                <h3 className="mt-2 text-xl font-semibold text-ink">
                  {card.title}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-xs tracking-[0.16em] text-muted">综合奖励</p>
                <p className="mt-2 text-3xl font-semibold text-ink">
                  {card.overall}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <RewardMetric label="速度" value={card.speed} />
              <RewardMetric label="稳定性" value={card.stability} />
              <RewardMetric label="杠杆效率" value={card.leverage} />
              <RewardMetric label="保留选项" value={card.optionality} />
            </div>

            <div className="mt-5 rounded-[1rem] border border-line bg-panel/60 p-4 text-sm leading-6 text-muted">
              <p>动作步数：{card.steps}</p>
              <p className="mt-2">权衡项：{card.tradeoffs}</p>
              <p className="mt-2">
                主推荐：{card.highlighted ? "是" : "否"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RewardMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-medium text-ink">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#21486b,#b35c34)]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
