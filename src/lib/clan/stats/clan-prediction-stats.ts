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
