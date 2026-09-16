import { expect, test } from "@playwright/test";
import {
  advanceFormation,
  canFit,
  createFormation,
  draftTurn,
  maxBid,
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

test("lottery requires an explicit complete ranking from every participant", () => {
  const preferences = Object.fromEntries(
    rosterAssignedUserIds(roster).map((id) => [
      id,
      ["tank", "dmg", "sup"] as Role[],
    ]),
  );
  expect(() =>
    createFormation(roster, { roles: "lottery", teams: "random" }, keepOrder),
  ).toThrow(/우선순위/);
  preferences.s4 = ["tank", "tank", "sup"];
  expect(() =>
    createFormation(
      roster,
      { roles: "lottery", teams: "random", preferences },
      keepOrder,
    ),
  ).toThrow(/우선순위/);
});

test("captains must be different participants with the same assigned role", () => {
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
  for (let count = 0; count < 8; count++) {
    state = advanceFormation(state, { type: "lot" }, manager, now, keepOrder);
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
    now++;
  }
  expectComplete(state);
  expect(state.budgets).toEqual({ team1: 960, team2: 960 });
});
