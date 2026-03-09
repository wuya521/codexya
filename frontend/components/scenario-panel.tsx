import type { ScenarioItem } from "@/types/analysis";

type ScenarioPanelProps = {
  scenarios: ScenarioItem[];
};

function asPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function ScenarioPanel({ scenarios }: ScenarioPanelProps) {
  return (
    <div className="space-y-4">
      {scenarios.map((scenario, index) => (
        <article
          key={scenario.name}
          className="rounded-[1.35rem] border border-line bg-canvas p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.18em] text-muted">
                情景 {index + 1}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-ink">
                {scenario.name}
              </h3>
            </div>
            <span className="rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-sm text-brand">
              {asPercent(scenario.probability_low)} -{" "}
              {asPercent(scenario.probability_high)}
            </span>
          </div>

          <div className="mt-4 rounded-full bg-panel p-1">
            <div className="relative h-2 rounded-full bg-white/70">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-[linear-gradient(90deg,#21486b,#b35c34)]"
                style={{ width: asPercent(scenario.probability_high) }}
              />
              <div
                className="absolute top-[-4px] h-4 w-4 rounded-full border border-white bg-brand shadow"
                style={{ left: `calc(${asPercent(scenario.probability_low)} - 8px)` }}
              />
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-muted">
            {scenario.trajectory}
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1rem] border border-line bg-panel/60 p-4">
              <p className="text-xs tracking-[0.18em] text-muted">触发条件</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/85">
                {scenario.trigger_conditions.map((condition) => (
                  <li key={condition}>{condition}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[1rem] border border-line bg-panel/60 p-4">
              <p className="text-xs tracking-[0.18em] text-muted">观察信号</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/85">
                {scenario.signals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
