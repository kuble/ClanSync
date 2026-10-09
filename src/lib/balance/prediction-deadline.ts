import { parseFormationSettings } from "./formation";

/** 경기 현황 진입부터 설정한 시간까지. 시작된 경기의 마감은 다시 계산하지 않는다. */
export function computeBalancePredictionDeadlineIso(settings?: unknown): string {
  return new Date(Date.now() + parseFormationSettings(settings).predictionMinutes * 60_000).toISOString();
}
