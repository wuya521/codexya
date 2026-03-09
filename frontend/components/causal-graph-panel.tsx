import { getRelationshipLabel } from "@/lib/display";
import type { CausalEdge, VariableItem } from "@/types/analysis";

type CausalGraphPanelProps = {
  variables: VariableItem[];
  edges: CausalEdge[];
};

const relationshipColor: Record<CausalEdge["relationship"], string> = {
  amplifies: "#b35c34",
  constrains: "#a5462a",
  enables: "#245f63",
  weakens: "#617487"
};

export function CausalGraphPanel({
  variables,
  edges
}: CausalGraphPanelProps) {
  const sortedVariables = [...variables]
    .sort((left, right) => right.importance - left.importance)
    .slice(0, 6);

  const centerX = 160;
  const centerY = 145;
  const radiusX = 120;
  const radiusY = 88;

  const positions = sortedVariables.map((variable, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(sortedVariables.length, 1) - Math.PI / 2;
    return {
      variable,
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY
    };
  });

  const nodeByName = new Map(positions.map((item) => [item.variable.name, item]));
  const visibleEdges = edges.filter(
    (edge) => nodeByName.has(edge.source) && nodeByName.has(edge.target)
  );

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[1.4rem] border border-line bg-canvas p-4">
        <svg viewBox="0 0 320 290" className="h-[320px] w-full">
          <defs>
            <radialGradient id="graphGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#21486b" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#21486b" stopOpacity="0" />
            </radialGradient>
            <marker
              id="graphArrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="#617487" />
            </marker>
          </defs>

          <ellipse
            cx={centerX}
            cy={centerY}
            rx={120}
            ry={88}
            fill="url(#graphGlow)"
          />

          {visibleEdges.map((edge) => {
            const source = nodeByName.get(edge.source);
            const target = nodeByName.get(edge.target);
            if (!source || !target) {
              return null;
            }
            return (
              <line
                key={`${edge.source}-${edge.target}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={relationshipColor[edge.relationship]}
                strokeOpacity={0.75}
                strokeWidth={2.6}
                markerEnd="url(#graphArrow)"
              />
            );
          })}

          {positions.map(({ variable, x, y }) => (
            <g key={variable.name} transform={`translate(${x}, ${y})`}>
              <circle r="34" fill="#f8f3ec" stroke="#21486b" strokeOpacity="0.18" />
              <circle
                r={26 + variable.importance * 10}
                fill="rgba(33,72,107,0.08)"
                stroke="rgba(179,92,52,0.18)"
              />
              <text
                x="0"
                y="-4"
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#13263b"
              >
                {variable.name.slice(0, 8)}
              </text>
              <text
                x="0"
                y="14"
                textAnchor="middle"
                fontSize="10"
                fill="#607184"
              >
                {Math.round(variable.importance * 100)}%
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="grid gap-3">
        {visibleEdges.map((edge) => (
          <div
            key={`legend-${edge.source}-${edge.target}`}
            className="rounded-[1.1rem] border border-line bg-canvas px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: relationshipColor[edge.relationship] }}
              />
              <p className="text-sm font-medium text-ink">
                {edge.source} → {edge.target}
              </p>
              <span className="text-xs tracking-[0.16em] text-muted">
                {getRelationshipLabel(edge.relationship)}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              {edge.explanation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
