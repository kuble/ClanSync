/** bracket_tournaments.snapshot MVP 구조 (v1 · D-EVENTS-05 초안 단계). */

export const BRACKET_SNAPSHOT_VERSION = 1;

export type BracketTeamSlot = {
  slot: number;
  label: string;
};

const LABEL_MAX = 48;

/** 신규 대회 초안용 팀 슬롯(기본 라벨 팀 1…N). */
export function buildInitialBracketTeams(teamCount: number): BracketTeamSlot[] {
  return Array.from({ length: teamCount }, (_, i) => ({
    slot: i + 1,
    label: `팀 ${i + 1}`,
  }));
}

/** 스냅샷에서 팀 라벨 배열 추출(team_count 행 정합). 길이·형식 깨진 경우 기본값으로 패딩. */
export function parseTeamLabelsFromSnapshot(
  snapshot: Record<string, unknown>,
  teamCount: number,
): string[] {
  const defaults = Array.from({ length: teamCount }, (_, i) => `팀 ${i + 1}`);
  const teams = snapshot.teams;
  if (!Array.isArray(teams)) return defaults;

  return defaults.map((fallback, i) => {
    const raw = teams[i];
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const label = (raw as { label?: unknown }).label;
      if (typeof label === "string") {
        const t = label.trim().slice(0, LABEL_MAX).replace(/\s+/g, " ");
        if (t.length >= 1) return t;
      }
    }
    return fallback;
  });
}

/** 기존 snapshot의 v·matches·기타 키를 유지한 채 teams만 교체 */
export function mergeSnapshotTeamLabels(
  existingSnapshot: Record<string, unknown> | undefined,
  trimmedLabels: string[],
): Record<string, unknown> {
  const base =
    existingSnapshot &&
    typeof existingSnapshot === "object" &&
    !Array.isArray(existingSnapshot)
      ? { ...existingSnapshot }
      : {};
  const vRaw = base.v;
  base.v =
    typeof vRaw === "number" && Number.isFinite(vRaw)
      ? vRaw
      : BRACKET_SNAPSHOT_VERSION;
  if (!Array.isArray(base.matches)) {
    base.matches = [];
  }
  base.teams = trimmedLabels.map((label, idx) => ({
    slot: idx + 1,
    label,
  }));
  return base;
}
