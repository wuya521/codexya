"use client";

import { create } from "zustand";

import type { AnalysisMode, AnalysisRequest } from "@/types/analysis";

const baseDraft = (mode: AnalysisMode): AnalysisRequest => ({
  mode,
  title: "",
  prompt: "",
  time_horizon: mode === "forecast" ? "未来 6 个月" : "未来 90 天",
  facts: [],
  constraints: [],
  unknowns: [],
  stakeholders: [],
  user_hypothesis: "",
  target_outcome: "",
  resources: [],
  tried_actions: [],
  optimization_target: "best",
  risk_preference: "平衡",
  model_profile: "balanced"
});

type DraftState = {
  drafts: Record<AnalysisMode, AnalysisRequest>;
  updateDraft: (mode: AnalysisMode, patch: Partial<AnalysisRequest>) => void;
  resetDraft: (mode: AnalysisMode) => void;
};

export const useDraftAnalysisStore = create<DraftState>((set) => ({
  drafts: {
    forecast: baseDraft("forecast"),
    best_path: baseDraft("best_path")
  },
  updateDraft: (mode, patch) =>
    set((state) => ({
      drafts: {
        ...state.drafts,
        [mode]: {
          ...state.drafts[mode],
          ...patch
        }
      }
    })),
  resetDraft: (mode) =>
    set((state) => ({
      drafts: {
        ...state.drafts,
        [mode]: baseDraft(mode)
      }
    }))
}));
