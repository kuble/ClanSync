import { isoToKstYmd } from "./kst";

export type PredictionRecord = {
  sessionId: string;
  userId: string;
  playedAt: string;
  map: string | null;
  pickTeam: number;
  outcome: "team1" | "team2" | "draw" | "void";
};

export type PredictionResult = "correct" | "incorrect" | "draw" | "void";

export type PredictionPointDay = { date: string; earned: number; lost: number; net: number };
/** Actual personal ledger amounts only; a correct pick does not imply a payout. */
export function predictionPointHistory(rows: readonly PredictionRecord[], transactions: readonly {
  user_id: string | null; reference_id: string; amount: number; created_at: string;
}[], userId: string): PredictionPointDay[] {
  const own = rows.filter((row) => row.userId === userId);
  const sessions = new Set(own.map((row) => row.sessionId));
  const days = new Map<string, PredictionPointDay>();
  const day = (date: string) => {
    if (!days.has(date)) days.set(date, { date, earned: 0, lost: 0, net: 0 });
    return days.get(date)!;
  };
  for (const row of own) day(isoToKstYmd(row.playedAt));
  for (const row of transactions) {
    if (row.user_id !== userId || !sessions.has(row.reference_id)) continue;
    const target = day(isoToKstYmd(row.created_at));
    target.earned += Math.max(0, row.amount);
    target.lost += Math.max(0, -row.amount);
    target.net += row.amount;
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function predictionResult(row: PredictionRecord): PredictionResult {
  if (row.outcome === "draw" || row.outcome === "void") return row.outcome;
  return row.pickTeam === (row.outcome === "team1" ? 1 : 2) ? "correct" : "incorrect";
}

export function predictionTotals(rows: readonly PredictionRecord[]) {
  const correct = rows.filter((row) => predictionResult(row) === "correct").length;
  const valid = rows.filter((row) => {
    const result = predictionResult(row);
    return result === "correct" || result === "incorrect";
  }).length;
  return { correct, valid, rate: valid ? Math.round(correct / valid * 1000) / 10 : null };
}

export function personalPredictions(rows: readonly PredictionRecord[], userId: string) {
  return rows.filter((row) => row.userId === userId).map((row) => ({
    sessionId: row.sessionId,
    date: isoToKstYmd(row.playedAt),
    map: row.map,
    result: predictionResult(row),
  }));
}
