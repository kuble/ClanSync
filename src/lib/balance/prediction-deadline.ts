/** 경기 진행 진입 후 승부예측 마감까지 (09-BalanceMaker: 경기 시작 후 타이머 — MVP 5분) */
export const BALANCE_PREDICTION_WINDOW_MS = 5 * 60 * 1000;

export function computeBalancePredictionDeadlineIso(): string {
  return new Date(Date.now() + BALANCE_PREDICTION_WINDOW_MS).toISOString();
}
