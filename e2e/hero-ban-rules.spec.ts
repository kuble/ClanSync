import { expect, test } from "@playwright/test";
import { isValidOwHeroId, owHeroLabel, owHeroRole, resolveTeamHeroBans, type HeroBanVote } from "../src/lib/balance/ow-hero-ban";
import { EMPTY_ROSTER } from "../src/lib/balance/roster-schema";

test("team hero bans respect each team's votes, limit, abstention and overlap", () => {
  const roster = structuredClone(EMPTY_ROSTER);
  roster.team1.tank = "a";
  roster.team1.dmg[0] = "b";
  roster.team2.tank = "c";
  const vote = (user_id: string, pick_1: string, pick_2: string | null = null): HeroBanVote => ({ user_id, pick_1, pick_2, pick_3: null });
  const votes = [vote("a", "ana", "dva"), vote("b", "ana", "echo"), vote("c", "ana", "mercy"), vote("spectator", "winston")];
  const one = resolveTeamHeroBans(votes, roster, 1);
  expect(one.bannedHeroes).toEqual(["ana"]);
  expect(one.context.teams.team1).toEqual([{ heroId: "ana", role: "support", votes: 2 }]);
  expect(one.context.teams.team2).toEqual([{ heroId: "ana", role: "support", votes: 1 }]);
  const two = resolveTeamHeroBans(votes, roster, 2);
  expect(two.bannedHeroes).toEqual(["ana", "dva", "mercy"]);
  expect(two.context.teams.team2.map((hero) => hero.heroId)).toEqual(["ana", "mercy"]);
  expect(resolveTeamHeroBans(votes.slice(0, 2), roster, 2).context.teams.team2).toEqual([]);
  expect(resolveTeamHeroBans([], roster, 2).bannedHeroes).toEqual([]);
});

test("hero ban roster includes every current hero missing from the original selection", () => {
  const additions = [
    ["dmon", "D.Mon", "tank"], ["domina", "도미나", "tank"], ["hazard", "해저드", "tank"],
    ["anran", "안란", "dps"], ["emre", "엠레", "dps"], ["sierra", "시에라", "dps"],
    ["shion", "시온", "dps"], ["vendetta", "벤데타", "dps"],
    ["jetpack_cat", "제트팩 캣", "support"], ["mizuki", "미즈키", "support"], ["wuyang", "우양", "support"],
  ] as const;
  for (const [id, label, role] of additions) {
    expect(isValidOwHeroId(id)).toBe(true);
    expect(owHeroLabel(id)).toBe(label);
    expect(owHeroRole(id)).toBe(role);
  }
});
