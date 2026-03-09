export type AnalysisMode = "forecast" | "best_path";
export type OptimizationTarget = "fastest" | "best" | "safest";
export type GenerationMode = "initial" | "rerun";
export type ModelProfile = "fast" | "balanced" | "deep";
export type AnalysisJobStatus = "queued" | "running" | "completed" | "failed";

export interface ProblemDefinition {
  objective: string;
  time_horizon: string;
  success_criteria: string[];
}

export interface CurrentState {
  facts: string[];
  constraints: string[];
  unknowns: string[];
}

export interface VariableItem {
  name: string;
  direction: "positive" | "negative" | "mixed";
  controllability: "high" | "medium" | "low";
  observability: "high" | "medium" | "low";
  importance: number;
  current_state: string;
}

export interface CausalEdge {
  source: string;
  target: string;
  relationship: "amplifies" | "constrains" | "enables" | "weakens";
  explanation: string;
}

export interface ScenarioItem {
  name: string;
  probability_low: number;
  probability_high: number;
  trigger_conditions: string[];
  trajectory: string;
  signals: string[];
}

export interface PathPlan {
  label: string;
  steps: string[];
  tradeoffs: string[];
}

export interface RecommendedPaths {
  fastest: PathPlan;
  best: PathPlan;
  safest: PathPlan;
  primary_choice: OptimizationTarget;
  reason: string;
}

export interface RiskItem {
  name: string;
  level: "high" | "medium" | "low";
  description: string;
  mitigation: string;
}

export interface WatchSignal {
  signal: string;
  why_it_matters: string;
  what_change_means: string;
}

export interface NextAction {
  horizon: "now" | "7d" | "30d" | "90d";
  action: string;
  expected_outcome: string;
}

export interface AnalysisGeneration {
  generation_mode?: GenerationMode;
  provider?: string;
  model?: string;
  model_profile?: ModelProfile;
  elapsed_ms?: number | null;
  source_analysis_id?: string | null;
  source_title?: string | null;
  source_updated_at?: string | null;
  rerun_sequence?: number;
  changed?: boolean;
  change_summary?: string;
  changed_sections?: string[];
  confidence_delta?: number;
  previous_confidence?: number | null;
  primary_choice_changed?: boolean;
  previous_primary_choice?: OptimizationTarget | null;
}

export interface AnalysisRecord {
  id: string;
  mode: AnalysisMode;
  title: string;
  summary: string;
  confidence: number;
  status: "draft" | "ready";
  updated_at: string;
  problem_definition: ProblemDefinition;
  current_state: CurrentState;
  variables: VariableItem[];
  causal_edges: CausalEdge[];
  scenarios: ScenarioItem[];
  recommended_paths: RecommendedPaths;
  risks: RiskItem[];
  watch_signals: WatchSignal[];
  next_actions: NextAction[];
  generation?: AnalysisGeneration;
}

export interface AnalysisJobEvent {
  at: string;
  status: AnalysisJobStatus;
  progress: number;
  step: string;
  message: string;
}

export interface AnalysisJobRecord {
  id: string;
  user_id: string;
  organization_id: string | null;
  source_analysis_id: string | null;
  result_analysis_id: string | null;
  mode: AnalysisMode;
  title: string;
  model_profile: ModelProfile;
  provider: string;
  selected_model: string;
  status: AnalysisJobStatus;
  progress: number;
  step: string;
  queue_position: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  events: AnalysisJobEvent[];
  result: AnalysisRecord | null;
}

export interface AnalysisRequest {
  mode: AnalysisMode;
  title: string;
  prompt: string;
  time_horizon: string;
  facts: string[];
  constraints: string[];
  unknowns: string[];
  stakeholders: string[];
  user_hypothesis: string;
  target_outcome: string;
  resources: string[];
  tried_actions: string[];
  optimization_target: OptimizationTarget;
  risk_preference: string;
  model_profile: ModelProfile;
}

export interface TemplateRecord {
  id: string;
  mode: AnalysisMode;
  name: string;
  description: string;
  scenario: string;
  starter_prompt: string;
}
