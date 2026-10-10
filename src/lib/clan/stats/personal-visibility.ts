import type { PersonalMatch } from "./clan-stats-analytics";

export const PERSONAL_STATS_SECTIONS = [
  { id: "records", label: "경기 전적", description: "역할별·맵별 승률, 최근 흐름과 연승·연패" },
  { id: "evaluation", label: "평가 점수", description: "평가 점수 변동 이력" },
  { id: "analysis", label: "분석 점수", description: "분석 점수 변동 이력" },
  { id: "predictions", label: "승부예측 적중", description: "참여 횟수와 적중률" },
  { id: "prediction_points", label: "승부예측 포인트", description: "본인의 수익·손실과 누적 포인트" },
  { id: "emblems", label: "엠블럼", description: "월간·연간 순위 수상 이력" },
] as const;
export type PersonalStatsSection = (typeof PERSONAL_STATS_SECTIONS)[number]["id"];
export type PersonalScore = Pick<PersonalMatch, "date" | "occurredAt" | "evaluation" | "analysis">;
export const DEFAULT_PERSONAL_SECTIONS = PERSONAL_STATS_SECTIONS.map(({ id }) => id);

/** Missing settings preserve prior behavior; malformed explicit values disclose nothing. */
export function resolvePersonalSections(value: unknown): PersonalStatsSection[] {
  return value === undefined ? [...DEFAULT_PERSONAL_SECTIONS]
    : Array.isArray(value) ? DEFAULT_PERSONAL_SECTIONS.filter((id) => value.includes(id)) : [];
}

export function restrictPersonalStats<T extends { matches: PersonalMatch[]; predictions: unknown[]; predictionPoints: unknown[]; emblems?: unknown[]; lastPlayedAt?: string | null }>(
  person: T, sections: readonly PersonalStatsSection[],
): T & { visibleSections: PersonalStatsSection[]; scores: PersonalScore[] } {
  const visible = (id: PersonalStatsSection) => sections.includes(id);
  const scores = person.matches.map(({ date, occurredAt, evaluation, analysis }) => ({ date, occurredAt,
    evaluation: visible("evaluation") ? evaluation : null, analysis: visible("analysis") ? analysis : null }));
  return { ...person, visibleSections: [...sections],
    lastPlayedAt: visible("records") ? person.lastPlayedAt : null,
    matches: visible("records") ? person.matches.map((match) => ({ ...match, peers: [],
      evaluation: visible("evaluation") ? match.evaluation : null, analysis: visible("analysis") ? match.analysis : null })) : [],
    scores: visible("evaluation") || visible("analysis") ? scores : [],
    predictions: visible("predictions") ? person.predictions : [],
    predictionPoints: visible("prediction_points") ? person.predictionPoints : [],
    emblems: visible("emblems") ? person.emblems ?? [] : [],
  } as T & { visibleSections: PersonalStatsSection[]; scores: PersonalScore[] };
}
