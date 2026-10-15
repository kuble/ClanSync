export type GuestRecord = {
  id: string;
  nickname: string;
  userId: string | null;
  played: number;
  lastPlayed: string | null;
  recentMatches: { id: string; day: string; map: string | null }[];
};

export function participantSearchName(value: string) {
  return value.normalize("NFKC").split("#")[0].toLocaleLowerCase().replace(/[\s_·-]/g, "");
}

/** Suggest labels only; even an exact match never selects an owner. */
export function participantRecommendation(name: string, nickname: string, gameTag: string | null) {
  const candidate = participantSearchName(name);
  const labels = [nickname, gameTag ?? ""].map(participantSearchName).filter(Boolean);
  if (!candidate) return 0;
  if (labels.includes(candidate)) return 2;
  return labels.some((label) => Math.min(label.length, candidate.length) >= 2 && (label.includes(candidate) || candidate.includes(label))) ? 1 : 0;
}
