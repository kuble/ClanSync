"use client";

import { createContext, useContext, type ReactNode } from "react";
import { analysisWinPercent, type PredictionModel } from "@/lib/balance/analysis-prediction";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
import type { ScoreMode } from "@/lib/balance/score-display";

const ModelContext = createContext<{ model: PredictionModel; map: string | null } | null>(null);

export function BalanceAnalysisProvider({ model, map, children }: { model?: PredictionModel; map: string | null; children: ReactNode }) {
  return <ModelContext.Provider value={model ? { model, map } : null}>{children}</ModelContext.Provider>;
}

// undefined means this view has no analysis model; null means an incomplete lineup.
export function useAnalysisPrediction(roster: BalanceRoster, mode: ScoreMode, map?: string | null) {
  const context = useContext(ModelContext);
  if (!context || mode !== "a") return undefined;
  return analysisWinPercent(context.model, roster, map === undefined ? context.map : map);
}
