import { expect, test } from "@playwright/test";
import {
  advanceFormation,
  AUCTION_AWARD_DURATION_MS,
  canFit,
  canControlTeam,
  createFormation,
  draftTurn,
  getFormationDeadline,
  maxBid,
  sameFormationSettings,
  type FormationState,
  type Role,
  type Team,
} from "../src/lib/balance/formation";
import {
  rosterAssignedUserIds,
  type BalanceRoster,
} from "../src/lib/balance/roster-schema";

const roster: BalanceRoster = {
  team1: { dmg: ["d1", "d2"], tank: "t1", sup: ["s1", "s2"] },
  team2: { dmg: ["d3", "d4"], tank: "t2", sup: ["s3", "s4"] },
};
const manager = { id: "operator", manager: true };
const member = { id: "member", manager: false };
// Fisher–Yates selecting its current index preserves the given order.
const keepOrder = (max: number) => max - 1;
const chooseFirst = () => 0;
const startTime = 100_000;

test("settings baseline compares rule values independently of JSON property order", () => {
  const left = { roles: "manual", teams: "auction", auctionBudget: 2000, minBid: 50, durationSeconds: 30, captains: ["a", "b"] };
  const right = Object.fromEntries(Object.entries(left).reverse());
  expect(sameFormationSettings(left, right)).toBe(true);
  expect(sameFormationSettings(left, { ...right, minBid: 100 })).toBe(false);
  expect(sameFormationSettings(left, { ...right, captains: ["b", "a"] })).toBe(false);
  expect(sameFormationSettings(left, { ...right, showPlayerCardScore: false })).toBe(false);
  expect(sameFormationSettings(left, { ...right, showTeamComparisonSummary: false })).toBe(false);
  expect(sameFormationSettings(left, { ...right, showPlayerSessionSummary: false })).toBe(false);
  expect(sameFormationSettings(left, { ...right, playerCardInfo: "streak" })).toBe(false);
  expect(sameFormationSettings(left, { ...right, auctionItemsEnabled: true })).toBe(false);
  expect(sameFormationSettings(left, { ...right, strategySeconds: 60 })).toBe(false);
});

function make(mode: "draft" | "auction", random = keepOrder) {
  return createFormation(roster, { roles: "manual", teams: mode }, random);
}

function captain(state: FormationState, team: Team) {
  return {
    id: state.captains![team === "team1" ? 0 : 1],
    manager: false,
  };
}

function openAuction() {
  return advanceFormation(
    make("auction"),
    { type: "lot" },
    manager,
    startTime,
    keepOrder,
  );
}

function expectComplete(state: FormationState) {
  const expectedIds = rosterAssignedUserIds(roster).sort();
  const actualIds = rosterAssignedUserIds(state.roster).sort();
  expect(actualIds).toEqual(expectedIds);
  expect(new Set(actualIds).size).toBe(10);
  expect(state.remaining).toEqual([]);
  expect(state.stage).toBe("complete");
  for (const team of [state.roster.team1, state.roster.team2]) {
    expect(team.tank).toBeTruthy();
    expect(team.dmg.filter(Boolean)).toHaveLength(2);
    expect(team.sup.filter(Boolean)).toHaveLength(2);
  }
}

test("formation requires ten distinct players and preserves manual teams", () => {
  const incomplete = structuredClone(roster);
  incomplete.team2.sup[1] = null;
  expect(() =>
    createFormation(incomplete, { roles: "manual", teams: "keep" }, keepOrder),
  ).toThrow(/10명/);
  const duplicate = structuredClone(roster);
  duplicate.team2.sup[1] = "d1";
  expect(() =>
    createFormation(duplicate, { roles: "manual", teams: "keep" }, keepOrder),
  ).toThrow(/10명/);
  const result = createFormation(
    roster,
    { roles: "manual", teams: "keep" },
    keepOrder,
  );
  expectComplete(result);
  expect(result.roster).toEqual(roster);
  expect(result.roster).not.toBe(roster);
});

test("applying a completed formation preserves its result and original acknowledgement", () => {
  const state = createFormation(
    roster,
    { roles: "lottery", teams: "random" },
    keepOrder,
  );
  const before = structuredClone(state);
  const noReroll = () => { throw new Error("applying must not draw again"); };
  const applied = advanceFormation(state, { type: "apply" }, manager, startTime, noReroll);
  expect(applied).toEqual({ ...before, appliedAt: startTime });
  expect(state).toEqual(before);
  expect(advanceFormation(applied, { type: "apply" }, manager, startTime + 1000, noReroll)).toEqual(applied);
});

test("only managers can apply a completed formation", () => {
  const complete = createFormation(roster, { roles: "manual", teams: "keep" }, keepOrder);
  expect(() => advanceFormation(complete, { type: "apply" }, member, startTime, keepOrder)).toThrow(/운영진/);
  for (const mode of ["draft", "auction"] as const) {
    const incomplete = make(mode);
    expect(() => advanceFormation(incomplete, { type: "apply" }, manager, startTime, keepOrder)).toThrow(/먼저 완료/);
    expect(incomplete.appliedAt).toBeUndefined();
  }
});

test("applying waits for lottery or random-team reveal but manual keep has no reveal gate", () => {
  for (const setup of [
    { roles: "lottery", teams: "keep" },
    { roles: "manual", teams: "random" },
  ] as const) {
    const draw = { id: "apply-draw", startedAt: startTime, durationMs: 4000, roleMode: setup.roles };
    const state = createFormation(roster, setup, keepOrder, draw);
    expect(() => advanceFormation(state, { type: "apply" }, manager, startTime + 3999, keepOrder)).toThrow(/공개가 끝난/);
    const applied = advanceFormation(state, { type: "apply" }, manager, startTime + 4000, keepOrder);
    expect(applied).toEqual({ ...state, appliedAt: startTime + 4000 });
  }
  const manual = createFormation(roster, { roles: "manual", teams: "keep" }, keepOrder,
    { id: "manual-draw", startedAt: startTime, durationMs: 4000, roleMode: "manual" });
  expect(advanceFormation(manual, { type: "apply" }, manager, startTime, keepOrder).appliedAt).toBe(startTime);
});

test("one common order assigns each player's best remaining role within 2/4/4 quotas", () => {
  const preferences = Object.fromEntries(
    rosterAssignedUserIds(roster).map((id) => [
      id,
      ["tank", "sup", "dmg"] as Role[],
    ]),
  );
  const before = structuredClone({ roster, preferences });
  const result = createFormation(
    roster,
    { roles: "lottery", teams: "random", preferences },
    keepOrder,
  );
  expect(result.order).toEqual([
    "d1",
    "d2",
    "t1",
    "s1",
    "s2",
    "d3",
    "d4",
    "t2",
    "s3",
    "s4",
  ]);
  expect(
    result.order.map((id) => result.players.find((p) => p.id === id)!.role),
  ).toEqual([
    "tank",
    "tank",
    "sup",
    "sup",
    "sup",
    "sup",
    "dmg",
    "dmg",
    "dmg",
    "dmg",
  ]);
  expectComplete(result);
  expect({ roster, preferences }).toEqual(before);
  const changedFallbacks = structuredClone(preferences);
  changedFallbacks.d1 = ["tank", "dmg", "sup"];
  const rerun = createFormation(
    roster,
    { roles: "lottery", teams: "random", preferences: changedFallbacks },
    keepOrder,
  );
  expect(rerun.players.find((p) => p.id === "d1")!.role).toBe("tank");
});

test("lottery accepts absent preferences without check-in and rejects invalid rankings", () => {
  const preferences = Object.fromEntries(
    rosterAssignedUserIds(roster).map((id) => [
      id,
      ["tank", "dmg", "sup"] as Role[],
    ]),
  );
  expectComplete(createFormation(roster, { roles: "lottery", teams: "random" }, keepOrder));
  preferences.s4 = ["tank", "tank", "sup"];
  expect(() =>
    createFormation(
      roster,
      { roles: "lottery", teams: "random", preferences },
      keepOrder,
    ),
  ).toThrow(/우선순위/);
});

test("unconfigured preferences draw remaining slots and public state never exposes rankings", () => {
  const preferences = { t1: ["sup", "tank", "dmg"] as Role[], d1: [] as Role[] };
  const draw = { id: "draw-1", startedAt: 2000, durationMs: 4000, roleMode: "lottery" as const };
  const state = createFormation(roster, { roles: "lottery", teams: "random", preferences }, keepOrder, draw);
  expectComplete(state);
  expect(state.draw).toEqual(draw);
  expect(JSON.stringify(state)).not.toContain("preferences");
  expect(state.players.find((player) => player.id === "t1")?.role).toBe("sup");
});

test("saved auction rules bound spending, reserve and the round clock", () => {
  const state = createFormation(roster, { roles: "manual", teams: "auction", auctionBudget: 2000, minBid: 50, durationSeconds: 30 }, keepOrder);
  expect(state.budgets).toEqual({ team1: 2000, team2: 2000 });
  expect(maxBid(state, "team1")).toBe(1850);
  const lot = advanceFormation(state, { type: "lot" }, manager, startTime, keepOrder);
  expect(lot.auction?.deadline).toBe(startTime + 30000);
  expect(() => advanceFormation(lot, { type: "bid", team: "team1", amount: 10 }, manager, startTime, keepOrder)).toThrow(/50P/);
  expect(() => createFormation(roster, { roles: "manual", teams: "auction", auctionBudget: 100, minBid: 50 }, keepOrder)).toThrow(/예산/);
});

test("captains must be different participants with the same assigned role", () => {
  expect(() => createFormation(roster, { roles: "lottery", teams: "draft", captains: ["t1", "t2"] }, keepOrder)).toThrow(/탱커/);
  for (const captains of [
    ["t1", "t1"],
    ["t1", "d3"],
    ["t1", "absent"],
  ] as [string, string][]) {
    expect(() =>
      createFormation(
        roster,
        { roles: "manual", teams: "draft", captains },
        keepOrder,
      ),
    ).toThrow(/주장/);
  }
  const result = createFormation(
    roster,
    { roles: "manual", teams: "draft", captains: ["d1", "d3"] },
    keepOrder,
  );
  expect(result.captains).toEqual(["d1", "d3"]);
  expect(result.roster.team1.dmg).toContain("d1");
  expect(result.roster.team2.dmg).toContain("d3");
  expect(result.remaining).toHaveLength(8);
});

test("snake draft gives each captain four picks and rejects off-turn or non-captain picks", () => {
  let state = make("draft", chooseFirst);
  expect(state.first).toBe("team1");
  const turns: Team[] = [];
  for (let i = 0; i < 8; i++) {
    const team = draftTurn(state);
    const player = state.remaining.find((id) => canFit(state, team, id))!;
    const before = structuredClone(state);
    const other = team === "team1" ? "team2" : "team1";
    expect(() =>
      advanceFormation(
        state,
        { type: "pick", player },
        member,
        startTime,
        keepOrder,
      ),
    ).toThrow(/주장/);
    expect(() =>
      advanceFormation(
        state,
        { type: "pick", player },
        captain(state, other),
        startTime,
        keepOrder,
      ),
    ).toThrow(/주장/);
    expect(state).toEqual(before);
    state = advanceFormation(
      state,
      { type: "pick", player },
      captain(state, team),
      startTime,
      keepOrder,
    );
    turns.push(team);
  }
  expect(turns).toEqual([
    "team1",
    "team2",
    "team2",
    "team1",
    "team1",
    "team2",
    "team2",
    "team1",
  ]);
  expect(state.picks).toBe(8);
  expectComplete(state);
  expect(() =>
    advanceFormation(
      state,
      { type: "pick", player: "d1" },
      manager,
      startTime,
      keepOrder,
    ),
  ).toThrow(/완료/);
});

test("draft cannot select an assigned player or overfill a role", () => {
  let state = make("draft", chooseFirst);
  expect(canFit(state, "team1", "t2")).toBe(false);
  expect(() =>
    advanceFormation(
      state,
      { type: "pick", player: "t2" },
      manager,
      startTime,
      keepOrder,
    ),
  ).toThrow();
  for (const player of ["d1", "d3", "s1", "d2"]) {
    state = advanceFormation(
      state,
      { type: "pick", player },
      manager,
      startTime,
      keepOrder,
    );
  }
  expect(draftTurn(state)).toBe("team1");
  expect(canFit(state, "team1", "d4")).toBe(false);
  expect(() =>
    advanceFormation(
      state,
      { type: "pick", player: "d4" },
      manager,
      startTime,
      keepOrder,
    ),
  ).toThrow(/가득/);
  expect(() =>
    advanceFormation(
      state,
      { type: "pick", player: "d1" },
      manager,
      startTime,
      keepOrder,
    ),
  ).toThrow();
});

test("auction reserves the minimum price for remaining slots and debits only on settlement", () => {
  let state = openAuction();
  const before = structuredClone(state);
  expect(maxBid(state, "team1")).toBe(970);
  for (const amount of [0, 15, 980, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(() =>
      advanceFormation(
        state,
        { type: "bid", team: "team1", amount },
        captain(state, "team1"),
        startTime + 1,
        keepOrder,
      ),
    ).toThrow(/10P/);
  }
  state = advanceFormation(
    state,
    { type: "bid", team: "team1", amount: 970 },
    captain(state, "team1"),
    startTime + 1,
    keepOrder,
  );
  expect(state.budgets.team1).toBe(1000);
  expect(before.auction!.bid).toBe(0);
  expect(() =>
    advanceFormation(
      state,
      { type: "settle" },
      manager,
      state.auction!.deadline - 1,
      keepOrder,
    ),
  ).toThrow(/종료/);
  state = advanceFormation(
    state,
    { type: "settle" },
    manager,
    state.auction!.deadline,
    keepOrder,
  );
  expect(state.budgets.team1).toBe(30);
  expect(maxBid(state, "team1")).toBe(10);
  expect(state.remaining).toHaveLength(7);
  expect(() =>
    advanceFormation(
      state,
      { type: "settle" },
      manager,
      startTime + 30_000,
      keepOrder,
    ),
  ).toThrow(/공개/);
  expect(state.budgets.team1).toBe(30);
});

test("auction checks captain identity, operator controls and higher bid increments", () => {
  let state = make("auction");
  expect(() =>
    advanceFormation(state, { type: "lot" }, member, startTime, keepOrder),
  ).toThrow(/운영진/);
  state = advanceFormation(
    state,
    { type: "lot" },
    manager,
    startTime,
    keepOrder,
  );
  expect(() =>
    advanceFormation(state, { type: "lot" }, manager, startTime, keepOrder),
  ).toThrow(/마감/);
  expect(() =>
    advanceFormation(
      state,
      { type: "bid", team: "team1", amount: 10 },
      captain(state, "team2"),
      startTime + 1,
      keepOrder,
    ),
  ).toThrow(/주장/);
  expect(() =>
    advanceFormation(
      state,
      { type: "bid", team: "team1", amount: 10 },
      member,
      startTime + 1,
      keepOrder,
    ),
  ).toThrow(/주장/);
  state = advanceFormation(
    state,
    { type: "bid", team: "team1", amount: 20 },
    captain(state, "team1"),
    startTime + 1,
    keepOrder,
  );
  expect(() =>
    advanceFormation(
      state,
      { type: "bid", team: "team2", amount: 20 },
      captain(state, "team2"),
      startTime + 2,
      keepOrder,
    ),
  ).toThrow(/10P/);
  expect(() =>
    advanceFormation(
      state,
      { type: "settle" },
      member,
      state.auction!.deadline,
      keepOrder,
    ),
  ).toThrow(/운영진/);
});

test("late bids reset remaining time to five seconds without exceeding fifty seconds", () => {
  let state = openAuction();
  state = advanceFormation(
    state,
    { type: "bid", team: "team1", amount: 10 },
    manager,
    startTime + 1_000,
    keepOrder,
  );
  expect(state.auction!.deadline).toBe(startTime + 20_000);
  state = advanceFormation(
    state,
    { type: "bid", team: "team2", amount: 20 },
    manager,
    startTime + 19_000,
    keepOrder,
  );
  expect(state.auction!.deadline).toBe(startTime + 24_000);
  for (
    let amount = 30;
    state.auction!.deadline < startTime + 50_000;
    amount += 10
  ) {
    const time = state.auction!.deadline - 1_000;
    state = advanceFormation(
      state,
      { type: "bid", team: "team1", amount },
      manager,
      time,
      keepOrder,
    );
  }
  expect(state.auction!.deadline).toBe(startTime + 50_000);
  state = advanceFormation(
    state,
    { type: "bid", team: "team2", amount: 200 },
    manager,
    startTime + 49_999,
    keepOrder,
  );
  expect(state.auction!.deadline).toBe(startTime + 50_000);
  expect(() =>
    advanceFormation(
      state,
      { type: "bid", team: "team1", amount: 210 },
      manager,
      startTime + 50_000,
      keepOrder,
    ),
  ).toThrow(/종료/);
});

test("operator pause freezes both the auction deadline and its maximum duration", () => {
  let state = openAuction();
  expect(() =>
    advanceFormation(
      state,
      { type: "pause" },
      captain(state, "team1"),
      startTime + 5_000,
      keepOrder,
    ),
  ).toThrow(/운영진/);
  state = advanceFormation(
    state,
    { type: "pause" },
    manager,
    startTime + 5_000,
    keepOrder,
  );
  expect(() =>
    advanceFormation(
      state,
      { type: "bid", team: "team1", amount: 10 },
      manager,
      startTime + 6_000,
      keepOrder,
    ),
  ).toThrow(/재개/);
  expect(() =>
    advanceFormation(
      state,
      { type: "settle" },
      manager,
      startTime + 60_000,
      keepOrder,
    ),
  ).toThrow(/재개/);
  expect(() =>
    advanceFormation(
      state,
      { type: "resume" },
      member,
      startTime + 65_000,
      keepOrder,
    ),
  ).toThrow(/운영진/);
  state = advanceFormation(
    state,
    { type: "resume" },
    manager,
    startTime + 65_000,
    keepOrder,
  );
  expect(state.pausedAt).toBeNull();
  expect(state.auction!.startedAt).toBe(startTime + 60_000);
  expect(state.auction!.deadline).toBe(startTime + 80_000);
  state = advanceFormation(
    state,
    { type: "bid", team: "team1", amount: 10 },
    manager,
    startTime + 79_000,
    keepOrder,
  );
  expect(state.auction!.deadline).toBe(startTime + 84_000);
});

test("two no-bid rounds per player always finish the auction with ten unique players", () => {
  let state = make("auction");
  let now = startTime;
  state = advanceFormation(state, { type: "tick" }, member, now, keepOrder);
  for (let count = 0; count < 8; count++) {
    const remaining = state.remaining.length;
    now = state.auction!.deadline;
    state = advanceFormation(
      state,
      { type: "settle" },
      manager,
      now,
      keepOrder,
    );
    expect(state.auction!.retry).toBe(true);
    expect(state.remaining).toHaveLength(remaining);
    now = state.auction!.deadline;
    state = advanceFormation(
      state,
      { type: "settle" },
      manager,
      now,
      keepOrder,
    );
    expect(state.auction).toBeNull();
    expect(state.remaining).toHaveLength(remaining - 1);
    expect(state.stage).toBe("auction");
    now = state.award!.endsAt;
    state = advanceFormation(state, { type: "tick" }, member, now, keepOrder);
  }
  expectComplete(state);
  expect(state.budgets).toEqual({ team1: 960, team2: 960 });
  expect(state.appliedAt).toBe(now);
});

test("a manager who captains one team cannot pick or bid for the other team", () => {
  let draft = make("draft", chooseFirst);
  const leader = { ...captain(draft, "team1"), manager: true };
  expect(canControlTeam(draft, leader, "team1")).toBe(true);
  expect(canControlTeam(draft, leader, "team2")).toBe(false);
  draft = advanceFormation(draft, { type: "pick", player: draft.remaining[0]! }, leader, startTime, keepOrder);
  expect(() => advanceFormation(draft, { type: "pick", player: draft.remaining[0]! }, leader, startTime, keepOrder)).toThrow(/주장/);
  const auction = openAuction();
  expect(() => advanceFormation(auction, { type: "bid", team: "team2", amount: 10 }, leader, startTime, keepOrder)).toThrow(/주장/);
  expect(advanceFormation(auction, { type: "bid", team: "team1", amount: 10 }, leader, startTime, keepOrder).auction?.team).toBe("team1");
  expect(canControlTeam(auction, manager, "team2")).toBe(true);
});

test("member clock wakeups wait for reveal, settle once and retain award before next player", () => {
  const draw = { id: "reveal", startedAt: startTime, durationMs: 4000, roleMode: "lottery" as const };
  let state = createFormation(roster, { roles: "lottery", teams: "auction" }, keepOrder, draw);
  expect(getFormationDeadline(state)).toBe(startTime + 4000);
  expect(advanceFormation(state, { type: "tick" }, member, startTime + 3999, keepOrder)).toEqual(state);
  state = advanceFormation(state, { type: "tick" }, member, startTime + 4000, keepOrder);
  state = advanceFormation(state, { type: "bid", team: "team1", amount: 100 }, captain(state, "team1"), startTime + 4001, keepOrder);
  const deadline = state.auction!.deadline;
  state = advanceFormation(state, { type: "tick" }, member, deadline, keepOrder);
  expect(state.award).toMatchObject({ team: "team1", amount: 100, endsAt: deadline + AUCTION_AWARD_DURATION_MS });
  expect(state.budgets.team1).toBe(900);
  expect(state.auction).toBeNull();
  expect(advanceFormation(state, { type: "tick" }, member, deadline + 1, keepOrder)).toEqual(state);
  const next = advanceFormation(state, { type: "tick" }, member, state.award!.endsAt, keepOrder);
  expect(next.auction?.player).not.toBe(state.award!.player);
  expect(next.budgets.team1).toBe(900);
  expect(next.award).toBeUndefined();
});

const itemCatalog = [
  { id: "map", name: "맵 선정권", description: "맵 선택", cost: 100 },
  { id: "ban", name: "밴 무효화", description: "밴 무효화", cost: 100 },
  { id: "health", name: "체력 증가", description: "체력 증가", cost: 200 },
  { id: "expensive", name: "고가 아이템", description: "고가", cost: 1000 },
];

function makeStrategy() {
  return createFormation(roster, { roles: "manual", teams: "auction", auctionItemsEnabled: true, strategySeconds: 10 }, keepOrder,
    { id: "strategy", startedAt: startTime, durationMs: 4000, roleMode: "manual" }, itemCatalog);
}

function finishPlayers(state: FormationState) {
  let now = getFormationDeadline(state)!;
  while (state.stage !== "items" && state.stage !== "complete") {
    state = advanceFormation(state, { type: "tick" }, member, now, keepOrder);
    now = getFormationDeadline(state)!;
  }
  return state;
}

test("strategy snapshots three random catalog entries before auction and freezes while paused", () => {
  let state = makeStrategy();
  expect(state.stage).toBe("strategy");
  expect(state.strategy!.items).toHaveLength(3);
  expect(state.strategy!.items).not.toBe(itemCatalog);
  expect(state.strategy!.items[0]).not.toBe(itemCatalog[0]);
  expect(state.strategy!.deadline).toBe(startTime + 10_000);
  expect(advanceFormation(state, { type: "tick" }, member, startTime + 9999, keepOrder)).toEqual(state);
  state = advanceFormation(state, { type: "pause" }, manager, startTime + 1000, keepOrder);
  expect(getFormationDeadline(state)).toBeNull();
  expect(advanceFormation(state, { type: "tick" }, member, startTime + 20_000, keepOrder)).toEqual(state);
  state = advanceFormation(state, { type: "resume" }, manager, startTime + 21_000, keepOrder);
  expect(state.strategy!.deadline).toBe(startTime + 30_000);
  state = advanceFormation(state, { type: "tick" }, member, state.strategy!.deadline, keepOrder);
  expect(state.stage).toBe("auction");
  expect(state.auction!.startedAt).toBe(startTime + 30_000);
  expect(() => createFormation(roster, { roles: "manual", teams: "auction", auctionItemsEnabled: true }, keepOrder, undefined, itemCatalog.slice(0, 2))).toThrow(/3개/);
});

test("item purchases spend remaining budgets, permit same item, require both captain choices", () => {
  let state = finishPlayers(makeStrategy());
  expect(state.stage).toBe("items");
  expect(state.appliedAt).toBeUndefined();
  expect(state.budgets).toEqual({ team1: 960, team2: 960 });
  const leader = { ...captain(state, "team1"), manager: true };
  expect(() => advanceFormation(state, { type: "choose-item", team: "team2", itemId: "map" }, leader, startTime, keepOrder)).toThrow(/주장/);
  expect(() => advanceFormation(state, { type: "choose-item", team: "team1", itemId: "expensive" }, leader, startTime, keepOrder)).toThrow(/공개된/);
  const pricey = structuredClone(state);
  pricey.budgets.team1 = 50;
  expect(() => advanceFormation(pricey, { type: "choose-item", team: "team1", itemId: "map" }, leader, startTime, keepOrder)).toThrow(/부족/);
  state = advanceFormation(state, { type: "choose-item", team: "team1", itemId: "map" }, leader, startTime, keepOrder);
  expect(state.budgets.team1).toBe(860);
  expect(state.stage).toBe("items");
  expect(() => advanceFormation(state, { type: "choose-item", team: "team1", itemId: "ban" }, leader, startTime, keepOrder)).toThrow(/이미/);
  const skipped = advanceFormation(state, { type: "choose-item", team: "team2", itemId: null }, captain(state, "team2"), startTime, keepOrder);
  expect(skipped.itemChoices).toEqual({ team1: "map", team2: null });
  expect(skipped.budgets.team2).toBe(960);
  const purchased = advanceFormation(state, { type: "choose-item", team: "team2", itemId: "map" }, captain(state, "team2"), startTime, keepOrder);
  expect(purchased.itemChoices).toEqual({ team1: "map", team2: "map" });
  expect(purchased.budgets.team2).toBe(860);
  expectComplete(purchased);
  expect(purchased.appliedAt).toBe(startTime);
});

test("pause preserves award time and completed draft can apply through a member tick", () => {
  let state = openAuction();
  state = advanceFormation(state, { type: "bid", team: "team1", amount: 10 }, manager, startTime, keepOrder);
  state = advanceFormation(state, { type: "tick" }, member, state.auction!.deadline, keepOrder);
  const endsAt = state.award!.endsAt;
  state = advanceFormation(state, { type: "pause" }, manager, endsAt - 1000, keepOrder);
  state = advanceFormation(state, { type: "resume" }, manager, endsAt + 9000, keepOrder);
  expect(state.award!.endsAt).toBe(endsAt + 10_000);
  const complete = createFormation(roster, { roles: "manual", teams: "keep" }, keepOrder);
  expect(advanceFormation(complete, { type: "tick" }, member, startTime, keepOrder).appliedAt).toBe(startTime);
});
