from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


AnalysisMode = Literal["forecast", "best_path"]
OptimizationTarget = Literal["fastest", "best", "safest"]
Direction = Literal["positive", "negative", "mixed"]
Level = Literal["high", "medium", "low"]
Relationship = Literal["amplifies", "constrains", "enables", "weakens"]
Status = Literal["draft", "ready"]
Horizon = Literal["now", "7d", "30d", "90d"]
GenerationMode = Literal["initial", "rerun"]
ModelProfile = Literal["fast", "balanced", "deep"]
AnalysisJobStatus = Literal["queued", "running", "completed", "failed"]


class StrictBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProblemDefinition(StrictBaseModel):
    objective: str
    time_horizon: str
    success_criteria: list[str]


class CurrentState(StrictBaseModel):
    facts: list[str]
    constraints: list[str]
    unknowns: list[str]


class VariableItem(StrictBaseModel):
    name: str
    direction: Direction
    controllability: Level
    observability: Level
    importance: float = Field(ge=0.0, le=1.0)
    current_state: str


class CausalEdge(StrictBaseModel):
    source: str
    target: str
    relationship: Relationship
    explanation: str


class ScenarioItem(StrictBaseModel):
    name: str
    probability_low: float = Field(ge=0.0, le=1.0)
    probability_high: float = Field(ge=0.0, le=1.0)
    trigger_conditions: list[str]
    trajectory: str
    signals: list[str]


class PathPlan(StrictBaseModel):
    label: str
    steps: list[str]
    tradeoffs: list[str]


class RecommendedPaths(StrictBaseModel):
    fastest: PathPlan
    best: PathPlan
    safest: PathPlan
    primary_choice: OptimizationTarget
    reason: str


class RiskItem(StrictBaseModel):
    name: str
    level: Level
    description: str
    mitigation: str


class WatchSignal(StrictBaseModel):
    signal: str
    why_it_matters: str
    what_change_means: str


class NextAction(StrictBaseModel):
    horizon: Horizon
    action: str
    expected_outcome: str


class AnalysisRequest(StrictBaseModel):
    mode: AnalysisMode
    title: str
    prompt: str
    time_horizon: str
    facts: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    unknowns: list[str] = Field(default_factory=list)
    stakeholders: list[str] = Field(default_factory=list)
    user_hypothesis: str = ""
    target_outcome: str = ""
    resources: list[str] = Field(default_factory=list)
    tried_actions: list[str] = Field(default_factory=list)
    optimization_target: OptimizationTarget = "best"
    risk_preference: str = "平衡"
    model_profile: ModelProfile = "balanced"


class GeneratedAnalysisPayload(StrictBaseModel):
    mode: AnalysisMode
    title: str
    summary: str
    confidence: float = Field(ge=0.0, le=1.0)
    problem_definition: ProblemDefinition
    current_state: CurrentState
    variables: list[VariableItem]
    causal_edges: list[CausalEdge]
    scenarios: list[ScenarioItem]
    recommended_paths: RecommendedPaths
    risks: list[RiskItem]
    watch_signals: list[WatchSignal]
    next_actions: list[NextAction]


class AnalysisGeneration(StrictBaseModel):
    generation_mode: GenerationMode = "initial"
    provider: str = "unknown"
    model: str = "unknown"
    model_profile: ModelProfile = "balanced"
    elapsed_ms: int | None = None
    source_analysis_id: str | None = None
    source_title: str | None = None
    source_updated_at: datetime | None = None
    rerun_sequence: int = 0
    changed: bool = True
    change_summary: str = ""
    changed_sections: list[str] = Field(default_factory=list)
    confidence_delta: float = 0.0
    previous_confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    primary_choice_changed: bool = False
    previous_primary_choice: OptimizationTarget | None = None


class AnalysisRecord(GeneratedAnalysisPayload):
    id: str
    status: Status
    updated_at: datetime
    generation: AnalysisGeneration = Field(default_factory=AnalysisGeneration)


class AnalysisJobEvent(StrictBaseModel):
    at: datetime
    status: AnalysisJobStatus
    progress: int = Field(ge=0, le=100)
    step: str
    message: str


class AnalysisJobRecord(StrictBaseModel):
    id: str
    user_id: str
    organization_id: str | None = None
    source_analysis_id: str | None = None
    result_analysis_id: str | None = None
    mode: AnalysisMode
    title: str
    model_profile: ModelProfile
    provider: str
    selected_model: str
    status: AnalysisJobStatus
    progress: int = Field(ge=0, le=100)
    step: str
    queue_position: int = 0
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    events: list[AnalysisJobEvent] = Field(default_factory=list)
    result: AnalysisRecord | None = None


class TemplateRecord(StrictBaseModel):
    id: str
    mode: AnalysisMode
    name: str
    description: str
    scenario: str
    starter_prompt: str
