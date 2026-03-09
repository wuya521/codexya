import type {
  AnalysisJobStatus,
  AnalysisMode,
  GenerationMode,
  ModelProfile,
  NextAction,
  OptimizationTarget,
  RiskItem,
  VariableItem
} from "@/types/analysis";

const modeLabels: Record<AnalysisMode, string> = {
  forecast: "走向预测",
  best_path: "路径规划"
};

const directionLabels: Record<VariableItem["direction"], string> = {
  positive: "正向推动",
  negative: "负向拖拽",
  mixed: "双向混合"
};

const levelLabels: Record<VariableItem["controllability"], string> = {
  high: "高",
  medium: "中",
  low: "低"
};

const relationshipLabels: Record<
  "amplifies" | "constrains" | "enables" | "weakens",
  string
> = {
  amplifies: "放大",
  constrains: "约束",
  enables: "使能",
  weakens: "削弱"
};

const optimizationLabels: Record<OptimizationTarget, string> = {
  fastest: "最快",
  best: "最好",
  safest: "最稳"
};

const modelProfileLabels: Record<ModelProfile, string> = {
  fast: "极速",
  balanced: "平衡",
  deep: "深度推理"
};

const horizonLabels: Record<NextAction["horizon"], string> = {
  now: "现在",
  "7d": "7 天内",
  "30d": "30 天内",
  "90d": "90 天内"
};

const riskLabels: Record<RiskItem["level"], string> = {
  high: "高风险",
  medium: "中风险",
  low: "低风险"
};

const generationLabels: Record<GenerationMode, string> = {
  initial: "首次生成",
  rerun: "重演版本"
};

const providerLabels: Record<string, string> = {
  deepseek: "DeepSeek",
  openai: "OpenAI",
  mock: "Mock"
};

const jobStatusLabels: Record<AnalysisJobStatus, string> = {
  queued: "排队中",
  running: "执行中",
  completed: "已完成",
  failed: "失败"
};

const rerunSuffixPattern = /(?:\s*[（(]重演[)）]\s*)+$/g;

export function getModeLabel(mode: AnalysisMode): string {
  return modeLabels[mode];
}

export function getDirectionLabel(
  direction: VariableItem["direction"]
): string {
  return directionLabels[direction];
}

export function getLevelLabel(level: VariableItem["controllability"]): string {
  return levelLabels[level];
}

export function getRelationshipLabel(
  relationship: "amplifies" | "constrains" | "enables" | "weakens"
): string {
  return relationshipLabels[relationship];
}

export function getOptimizationLabel(target: OptimizationTarget): string {
  return optimizationLabels[target];
}

export function getModelProfileLabel(profile: ModelProfile): string {
  return modelProfileLabels[profile];
}

export function getJobStatusLabel(status: AnalysisJobStatus): string {
  return jobStatusLabels[status];
}

export function getRiskLabel(level: RiskItem["level"]): string {
  return riskLabels[level];
}

export function getHorizonLabel(horizon: NextAction["horizon"]): string {
  return horizonLabels[horizon];
}

export function getGenerationModeLabel(mode: GenerationMode): string {
  return generationLabels[mode];
}

export function getProviderLabel(provider?: string): string {
  if (!provider) {
    return "Unknown";
  }
  return providerLabels[provider.toLowerCase()] ?? provider;
}

export function sanitizeAnalysisTitle(title: string): string {
  const cleaned = title.replace(rerunSuffixPattern, "").trim();
  return cleaned || title.trim();
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatSignedPercent(value: number): string {
  const percent = Math.abs(value * 100);
  if (percent < 0.5) {
    return "0%";
  }

  const sign = value > 0 ? "+" : "-";
  return `${sign}${Math.round(percent)}%`;
}

export function formatDurationMs(value?: number | null): string {
  if (!value || value <= 0) {
    return "未记录";
  }
  if (value < 1000) {
    return `${value} ms`;
  }
  return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} s`;
}
