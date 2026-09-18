import {
  EMPTY_ROSTER,
  rosterAssignedUserIds,
  type BalanceRoster,
} from "./roster-schema";

export type Role = "tank" | "dmg" | "sup";
export type Team = "team1" | "team2";
export type TeamMode = "keep" | "random" | "draft" | "auction";
export type PlayerCardInfoMode = "record" | "streak";
export type FormationSetup = {
  roles: "manual" | "lottery";
  teams: TeamMode;
  showPlayerCardScore?: boolean;
  showPlayerCardInfo?: boolean;
  playerCardInfo?: PlayerCardInfoMode;
  preferences?: Record<string, Role[]>;
  captains?: [string, string];
  auctionBudget?: number;
  minBid?: number;
  durationSeconds?: number;
};
export type FormationSettings = Omit<FormationSetup, "preferences" | "showPlayerCardScore" | "showPlayerCardInfo" | "playerCardInfo"> & {
  auctionBudget: number;
  minBid: number;
  durationSeconds: number;
  showPlayerCardScore: boolean;
  showPlayerCardInfo: boolean;
  playerCardInfo: PlayerCardInfoMode;
};
export const DEFAULT_FORMATION_SETTINGS: FormationSettings = {
  roles: "manual",
  teams: "keep",
  auctionBudget: 1000,
  minBid: 10,
  durationSeconds: 20,
  showPlayerCardScore: true,
  showPlayerCardInfo: true,
  playerCardInfo: "record",
};
export function parseFormationSettings(value: unknown): FormationSettings {
  const input =
    value && typeof value === "object"
      ? (value as Partial<FormationSettings>)
      : {};
  return { ...DEFAULT_FORMATION_SETTINGS, ...input };
}
export function sameFormationSettings(left: unknown, right: unknown): boolean {
  const a = parseFormationSettings(left),
    b = parseFormationSettings(right);
  return (
    a.roles === b.roles &&
    a.teams === b.teams &&
    a.auctionBudget === b.auctionBudget &&
    a.minBid === b.minBid &&
    a.durationSeconds === b.durationSeconds &&
    a.showPlayerCardScore === b.showPlayerCardScore &&
    a.showPlayerCardInfo === b.showPlayerCardInfo &&
    a.playerCardInfo === b.playerCardInfo &&
    (a.captains?.[0] ?? null) === (b.captains?.[0] ?? null) &&
    (a.captains?.[1] ?? null) === (b.captains?.[1] ?? null)
  );
}

export function validateFormationSettings(value: FormationSettings): void {
  if (
    !["manual", "lottery"].includes(value.roles) ||
    !["keep", "random", "draft", "auction"].includes(value.teams) ||
    typeof value.showPlayerCardScore !== "boolean" ||
    typeof value.showPlayerCardInfo !== "boolean" ||
    !["record", "streak"].includes(value.playerCardInfo)
  )
    throw new Error("편성 방식을 확인하세요.");
  if (
    !Number.isSafeInteger(value.minBid) ||
    value.minBid < 10 ||
    value.minBid > 1000 ||
    value.minBid % 10 !== 0 ||
    !Number.isSafeInteger(value.auctionBudget) ||
    value.auctionBudget < value.minBid * 4 ||
    value.auctionBudget > 100000 ||
    value.auctionBudget % value.minBid !== 0 ||
    !Number.isSafeInteger(value.durationSeconds) ||
    value.durationSeconds < 10 ||
    value.durationSeconds > 60
  )
    throw new Error("경매 예산·최소 입찰·시간을 확인하세요.");
  if (
    value.captains &&
    (value.captains.length !== 2 ||
      value.captains[0] === value.captains[1] ||
      value.captains.some((id) => typeof id !== "string" || !id))
  )
    throw new Error("서로 다른 주장 두 명을 선택하세요.");
  if (value.roles === "lottery" && value.captains)
    throw new Error("역할 추첨에서는 배정된 탱커 두 명이 주장이 됩니다.");
}
export type FormationDraw = {
  id: string;
  startedAt: number;
  durationMs: number;
  roleMode: "manual" | "lottery";
};
export type FormationState = {
  version: 1;
  mode: TeamMode;
  stage: "draft" | "auction" | "complete";
  players: { id: string; role: Role }[];
  order: string[];
  captains: [string, string] | null;
  first: Team;
  picks: number;
  roster: BalanceRoster;
  sourceRoster: BalanceRoster;
  /** Optional only for rounds created before saved settings were introduced. */
  settings?: FormationSettings;
  draw?: FormationDraw;
  /** Server time when the manager acknowledged this completed formation. */
  appliedAt?: number;
  budgets: Record<Team, number>;
  remaining: string[];
  auction: {
    player: string;
    startedAt: number;
    deadline: number;
    bid: number;
    team: Team | null;
    retry: boolean;
  } | null;
  pausedAt: number | null;
  log: { text: string; player?: string; team?: Team; amount?: number }[];
};
export type FormationCommand =
  | {
      type: "start";
      setup: FormationSetup;
      expectedRoster?: BalanceRoster;
      expectedBans?: { mapBan: boolean; heroBan: boolean };
      expectedDrawHistoryLength: number;
    }
  | { type: "reset" }
  | { type: "apply" }
  | { type: "pick"; player: string }
  | { type: "bid"; team: Team; amount: number }
  | { type: "lot" | "settle" | "pause" | "resume" };
export const ROLE_LABEL: Record<Role, string> = {
  tank: "탱커",
  dmg: "딜러",
  sup: "힐러",
};
export const TEAM_LABEL: Record<Team, string> = { team1: "1팀", team2: "2팀" };
const CAPACITY: Record<Role, number> = { tank: 1, dmg: 2, sup: 2 };
const ROLES: Role[] = ["dmg", "tank", "sup"];
type RandomIndex = (max: number) => number;
function shuffle<T>(items: T[], random: RandomIndex): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
export function rosterPlayers(
  roster: BalanceRoster,
): FormationState["players"] {
  return (["team1", "team2"] as const).flatMap((team) =>
    ROLES.flatMap((role) => {
      const ids = role === "tank" ? [roster[team].tank] : roster[team][role];
      return ids
        .filter((id): id is string => Boolean(id))
        .map((id) => ({ id, role }));
    }),
  );
}
export function canFit(
  state: FormationState,
  team: Team,
  player: string,
): boolean {
  const p = state.players.find((p) => p.id === player);
  if (!p || rosterAssignedUserIds(state.roster).includes(player)) return false;
  const count = roleCount(state.roster, team, p.role);
  return count < CAPACITY[p.role];
}
function roleCount(roster: BalanceRoster, team: Team, role: Role) {
  return role === "tank"
    ? Number(Boolean(roster[team].tank))
    : roster[team][role].filter(Boolean).length;
}
function assign(state: FormationState, team: Team, id: string) {
  if (!canFit(state, team, id))
    throw new Error("이 팀의 해당 역할 자리가 가득 찼습니다.");
  const role = state.players.find((p) => p.id === id)!.role;
  if (role === "tank") state.roster[team].tank = id;
  else {
    const index = state.roster[team][role].findIndex((v) => !v);
    state.roster[team][role][index] = id;
  }
  state.remaining = state.remaining.filter((p) => p !== id);
  if (!state.remaining.length) state.stage = "complete";
}
export function draftTurn(state: FormationState): Team {
  const a = state.first,
    b = a === "team1" ? "team2" : "team1";
  return [a, b, b, a, a, b, b, a][state.picks] as Team;
}
export function maxBid(state: FormationState, team: Team): number {
  const remainingSlots =
    5 -
    rosterPlayers({
      ...structuredClone(EMPTY_ROSTER),
      [team]: state.roster[team],
    }).length;
  return (
    state.budgets[team] -
    Math.max(0, remainingSlots - 1) * (state.settings?.minBid ?? 10)
  );
}
export function createFormation(
  roster: BalanceRoster,
  setup: FormationSetup,
  random: RandomIndex,
  draw?: FormationDraw,
): FormationState {
  const settings = parseFormationSettings(setup);
  validateFormationSettings(settings);
  const players = rosterPlayers(roster);
  if (players.length !== 10 || new Set(players.map((p) => p.id)).size !== 10)
    throw new Error("출전자 10명을 먼저 저장하세요.");
  if (
    !["manual", "lottery"].includes(setup.roles) ||
    !["keep", "random", "draft", "auction"].includes(setup.teams)
  )
    throw new Error("편성 방식을 확인하세요.");
  const order = shuffle(
    players.map((p) => p.id),
    random,
  );
  if (setup.roles === "lottery") {
    const counts: Record<Role, number> = { tank: 2, dmg: 4, sup: 4 };
    for (const id of order) {
      const player = players.find((p) => p.id === id)!;
      const ranking = setup.preferences?.[id] ?? [];
      if (
        (ranking.length !== 0 && ranking.length !== 3) ||
        new Set(ranking).size !== ranking.length ||
        ranking.some((r) => !ROLES.includes(r))
      )
        throw new Error("역할 우선순위를 확인하세요.");
      // No preference: draw one of the remaining role slots, rather than
      // silently giving every unconfigured player the same role priority.
      const remainingSlots = ROLES.flatMap((role) =>
        Array<Role>(counts[role]).fill(role),
      );
      const role = ranking.length
        ? ranking.find((r) => counts[r] > 0)!
        : remainingSlots[random(remainingSlots.length)]!;
      player.role = role;
      counts[role]--;
    }
  }
  const state: FormationState = {
    version: 1,
    mode: setup.teams,
    stage: "complete",
    players,
    order,
    captains: null,
    first: random(2) === 0 ? "team1" : "team2",
    picks: 0,
    roster: structuredClone(EMPTY_ROSTER),
    sourceRoster: structuredClone(roster),
    settings: {
      roles: settings.roles,
      teams: settings.teams,
      captains: settings.captains,
      auctionBudget: settings.auctionBudget,
      minBid: settings.minBid,
      durationSeconds: settings.durationSeconds,
      showPlayerCardScore: settings.showPlayerCardScore,
      showPlayerCardInfo: settings.showPlayerCardInfo,
      playerCardInfo: settings.playerCardInfo,
    },
    ...(draw ? { draw } : {}),
    budgets: { team1: settings.auctionBudget, team2: settings.auctionBudget },
    remaining: players.map((p) => p.id),
    auction: null,
    pausedAt: null,
    log: [
      {
        text:
          setup.roles === "lottery"
            ? "공통 추첨순서로 역할을 배정했습니다."
            : "대기방 역할 배치를 확정했습니다.",
      },
    ],
  };
  if (setup.teams === "keep" && setup.roles === "manual") {
    state.roster = structuredClone(roster);
    state.remaining = [];
    return state;
  }
  if (setup.teams === "keep" || setup.teams === "random") {
    for (const role of ROLES) {
      shuffle(
        players.filter((p) => p.role === role),
        random,
      ).forEach((p, i) =>
        assign(state, i < CAPACITY[role] ? "team1" : "team2", p.id),
      );
    }
    return state;
  }
  const captainIds =
    setup.captains ??
    (players.filter((p) => p.role === "tank").map((p) => p.id) as [
      string,
      string,
    ]);
  const [a, b] = captainIds.map((id) => players.find((p) => p.id === id));
  if (captainIds.length !== 2 || !a || !b || a.id === b.id || a.role !== b.role)
    throw new Error(
      "같은 역할의 주장 두 명을 선택하세요. 역할 추첨 시 기본 주장은 탱커입니다.",
    );
  state.captains = [a.id, b.id];
  assign(state, "team1", a.id);
  assign(state, "team2", b.id);
  state.remaining = shuffle(state.remaining, random);
  state.stage = setup.teams;
  return state;
}

/** Server supplies identity, clock and randomness; client inputs never determine those. */
export function advanceFormation(
  previous: FormationState,
  command: Exclude<FormationCommand, { type: "start" | "reset" }>,
  actor: { id: string; manager: boolean },
  now: number,
  random: RandomIndex,
): FormationState {
  const state = structuredClone(previous);
  const manager = () => {
    if (!actor.manager) throw new Error("운영진만 진행할 수 있습니다.");
  };
  if (command.type === "apply") {
    manager();
    if (state.stage !== "complete")
      throw new Error("팀 편성을 먼저 완료하세요.");
    if (
      state.draw &&
      (state.draw.roleMode === "lottery" || state.mode === "random") &&
      now < state.draw.startedAt + state.draw.durationMs
    )
      throw new Error("추첨 결과 공개가 끝난 뒤 편성을 적용하세요.");
    state.appliedAt ??= now;
    return state;
  }
  if (state.stage === "complete")
    throw new Error("이미 편성이 완료되었습니다.");
  const captain = (team: Team) => {
    if (
      !actor.manager &&
      state.captains?.[team === "team1" ? 0 : 1] !== actor.id
    )
      throw new Error("현재 팀 주장만 조작할 수 있습니다.");
  };
  if (command.type === "pause") {
    manager();
    if (state.pausedAt !== null) throw new Error("이미 일시정지 상태입니다.");
    state.pausedAt = now;
    return state;
  }
  if (command.type === "resume") {
    manager();
    if (state.pausedAt === null) throw new Error("일시정지 상태가 아닙니다.");
    if (state.auction) {
      const gap = now - state.pausedAt;
      state.auction.startedAt += gap;
      state.auction.deadline += gap;
    }
    state.pausedAt = null;
    return state;
  }
  if (state.pausedAt !== null) throw new Error("진행을 재개한 뒤 조작하세요.");
  if (command.type === "pick") {
    if (state.stage !== "draft") throw new Error("지명 단계가 아닙니다.");
    const team = draftTurn(state);
    captain(team);
    assign(state, team, command.player);
    state.picks++;
    state.log.push({ text: "지명", player: command.player, team });
    return state;
  }
  if (state.stage !== "auction") throw new Error("경매 단계가 아닙니다.");
  if (command.type === "lot") {
    manager();
    if (state.auction) throw new Error("진행 중인 경매를 먼저 마감하세요.");
    state.auction = {
      player: state.remaining[0]!,
      startedAt: now,
      deadline: now + (state.settings?.durationSeconds ?? 20) * 1000,
      bid: 0,
      team: null,
      retry: false,
    };
    return state;
  }
  const lot = state.auction;
  if (!lot) throw new Error("경매 선수를 먼저 공개하세요.");
  if (command.type === "bid") {
    if (!["team1", "team2"].includes(command.team))
      throw new Error("잘못된 팀입니다.");
    captain(command.team);
    if (now >= lot.deadline) throw new Error("입찰 시간이 종료되었습니다.");
    if (!canFit(state, command.team, lot.player))
      throw new Error("해당 역할 자리가 없습니다.");
    if (
      !Number.isSafeInteger(command.amount) ||
      command.amount % (state.settings?.minBid ?? 10) !== 0 ||
      command.amount < lot.bid + (state.settings?.minBid ?? 10) ||
      command.amount > maxBid(state, command.team)
    )
      throw new Error(
        `최소 ${state.settings?.minBid ?? 10}P 단위이며 남은 선수의 최소 비용을 남겨야 합니다.`,
      );
    lot.bid = command.amount;
    lot.team = command.team;
    lot.deadline = Math.min(
      lot.startedAt + ((state.settings?.durationSeconds ?? 20) + 30) * 1000,
      Math.max(lot.deadline, now + 5_000),
    );
    return state;
  }
  if (command.type === "settle") {
    manager();
    if (now < lot.deadline)
      throw new Error("입찰 종료 후 낙찰을 확정할 수 있습니다.");
    if (!lot.team && !lot.retry) {
      state.auction = {
        ...lot,
        startedAt: now,
        deadline: now + (state.settings?.durationSeconds ?? 20) * 1000,
        retry: true,
      };
      state.log.push({ text: "무입찰 · 한 번 더 경매", player: lot.player });
      return state;
    }
    const fallback = !lot.team;
    if (!lot.team) {
      const eligible = (["team1", "team2"] as const).filter(
        (t) =>
          canFit(state, t, lot.player) &&
          maxBid(state, t) >= (state.settings?.minBid ?? 10),
      );
      if (!eligible.length) throw new Error("배정 가능한 팀이 없습니다.");
      lot.team = eligible[random(eligible.length)]!;
      lot.bid = state.settings?.minBid ?? 10;
    }
    state.budgets[lot.team] -= lot.bid;
    assign(state, lot.team, lot.player);
    state.log.push({
      text: fallback ? "무입찰 · 최소가 추첨 배정" : "낙찰",
      player: lot.player,
      team: lot.team,
      amount: lot.bid,
    });
    state.auction = null;
    return state;
  }
  throw new Error("지원하지 않는 조작입니다.");
}
