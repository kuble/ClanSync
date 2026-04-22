/** 09-BalanceMaker: 5v5 · 탱1 딜2 힐2 × 양팀 */

export type TeamRoster = {
  tank: string | null;
  dmg: [string | null, string | null];
  sup: [string | null, string | null];
};

export type BalanceRoster = {
  team1: TeamRoster;
  team2: TeamRoster;
};

export const EMPTY_ROSTER: BalanceRoster = {
  team1: {
    tank: null,
    dmg: [null, null],
    sup: [null, null],
  },
  team2: {
    tank: null,
    dmg: [null, null],
    sup: [null, null],
  },
};

function asNullableUuid(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string") return v;
  return null;
}

function normalizeTeam(raw: unknown): TeamRoster {
  if (!raw || typeof raw !== "object") return { ...EMPTY_ROSTER.team1 };
  const o = raw as Record<string, unknown>;
  const dmg = o.dmg;
  const sup = o.sup;
  const dmgArr = Array.isArray(dmg) ? dmg : [null, null];
  const supArr = Array.isArray(sup) ? sup : [null, null];
  return {
    tank: asNullableUuid(o.tank),
    dmg: [asNullableUuid(dmgArr[0]), asNullableUuid(dmgArr[1])],
    sup: [asNullableUuid(supArr[0]), asNullableUuid(supArr[1])],
  };
}

export function parseRoster(json: unknown): BalanceRoster {
  if (!json || typeof json !== "object") return structuredClone(EMPTY_ROSTER);
  const o = json as Record<string, unknown>;
  return {
    team1: normalizeTeam(o.team1),
    team2: normalizeTeam(o.team2),
  };
}

/** 슬롯에 배정된 고유 user_id (null 제외) */
export function rosterAssignedUserIds(r: BalanceRoster): string[] {
  const out: string[] = [];
  const push = (id: string | null) => {
    if (id) out.push(id);
  };
  for (const team of [r.team1, r.team2] as const) {
    push(team.tank);
    push(team.dmg[0]);
    push(team.dmg[1]);
    push(team.sup[0]);
    push(team.sup[1]);
  }
  return out;
}

export function rosterHasDuplicateUsers(r: BalanceRoster): boolean {
  const ids = rosterAssignedUserIds(r);
  return new Set(ids).size !== ids.length;
}
