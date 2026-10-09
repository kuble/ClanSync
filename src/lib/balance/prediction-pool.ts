import type { Json } from "@/lib/supabase/database.types";

export type PredictionPool = {
  total: number;
  count: number;
  teams: [number, number, number];
  balance: number;
  mine: { pick: 1 | 2 | 3; stake: number; payout: number; settlement: "win" | "lose" | "refund" | null } | null;
  ranking: { user_id: string; nickname: string; played: number; hits: number; profit: number }[];
};

export function parsePredictionPool(value: Json): PredictionPool {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("예측 풀 정보를 확인하지 못했습니다.");
  const numeric = (key: string) => {
    const entry = value[key];
    if (typeof entry !== "number" || !Number.isFinite(entry)) throw new Error("예측 풀 수치가 올바르지 않습니다.");
    return entry;
  };
  if (!Array.isArray(value.teams) || value.teams.length !== 3 || value.teams.some((entry) => typeof entry !== "number")) throw new Error("예측 선택 정보를 확인하지 못했습니다.");
  return {
    total: numeric("total"), count: numeric("count"), balance: numeric("balance"),
    teams: value.teams as [number, number, number],
    mine: value.mine as PredictionPool["mine"],
    ranking: Array.isArray(value.ranking) ? value.ranking as PredictionPool["ranking"] : [],
  };
}

/** Display-only estimate. Settlement uses exact numeric arithmetic in the DB. */
export function predictionMultiplier(total: number, side: number) {
  return side > 0 ? total / side : null;
}
