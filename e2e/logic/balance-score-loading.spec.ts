import { expect, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { loadBalanceScoreData } from "../../src/lib/balance/load-balance-score-data";
import { EMPTY_ROSTER } from "../../src/lib/balance/roster-schema";

type Round = Database["public"]["Tables"]["balance_sessions"]["Row"];
const session = { phase: "editing", roster: EMPTY_ROSTER, ma_snapshot: {}, opened_at: "2026-01-01T00:00:00Z" } as unknown as Round;
function historyClient(missing = false) {
  const offsets: number[] = [];
  let active = 0, maximum = 0;
  const client = { from(table: string) {
    expect(table).toBe("balance_sessions");
    const query = {
      select() { return query; }, eq() { return query; }, in() { return query; }, order() { return query; },
      async range(offset: number) {
        offsets.push(offset); active++; maximum = Math.max(maximum, active);
        await new Promise(resolve => setTimeout(resolve, 5)); active--;
        const count = missing && offset === 500 ? 0 : Math.max(0, Math.min(500, 2001 - offset));
        const data = Array.from({ length: count }, (_, index) => ({
          id: `row-${offset + index}`, ma_snapshot: { oldest: { m: 2, a: 7 } },
          roster: offset + index === 2000 ? { ...EMPTY_ROSTER, team1: { ...EMPTY_ROSTER.team1, tank: "oldest" } } : EMPTY_ROSTER,
        }));
        return { data, error: null, count: 2001 };
      },
    };
    return query;
  } } as unknown as SupabaseClient<Database>;
  return { client, offsets, maximum: () => maximum };
}

test("점수 과거 기록은 두 요청 이내로 병렬 조회하고 마지막 페이지의 역할 점수도 보존한다", async () => {
  const source = historyClient();
  const result = await loadBalanceScoreData(source.client, "clan", session, true, false, Promise.resolve(new Map()));
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("점수 조회 실패");
  expect(result.scores.oldest.roles?.tank?.m).toBe(2);
  expect(result.scores.oldest.roles?.tank?.a).toBeNull();
  expect(source.offsets).toEqual([0, 500, 1000, 1500, 2000]);
  expect(source.maximum()).toBe(2);
});

test("중간 페이지 누락은 일부 점수만 성공한 결과로 공개하지 않는다", async () => {
  expect(await loadBalanceScoreData(historyClient(true).client, "clan", session, true, false, Promise.resolve(new Map()))).toEqual({ ok: false });
});

test("완성된 경기의 현재 점수와 비공개 화면은 과거 전체 기록을 다시 조회하지 않는다", async () => {
  const client = { from() { throw new Error("과거 조회 금지"); }, rpc() { throw new Error("분석 재계산 금지"); } } as unknown as SupabaseClient<Database>;
  expect(await loadBalanceScoreData(client, "clan", session, false, true, Promise.resolve(new Map()))).toEqual({ ok: true, scores: {} });
  const ids = Array.from({ length: 10 }, (_, index) => `player-${index}`);
  const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
  const live = { ...session, phase: "match_live", roster, ma_snapshot: Object.fromEntries(ids.map(id => [id, { m: 1.5, a: 2 }])) } as unknown as Round;
  const result = await loadBalanceScoreData(client, "clan", live, true, true, Promise.resolve(new Map()));
  if (!result.ok) throw new Error("현재 점수 조회 실패");
  expect(Object.keys(result.scores)).toHaveLength(10);
  expect(result.scores[ids[0]].roles?.tank).toMatchObject({ m: 1.5, a: 2 });
});

test("맵 투표는 현재 역할 점수만 반환하고 이력·분석 모델을 조회하지 않는다", async () => {
  const client = { from() { throw new Error("이력 조회 금지"); }, rpc() { throw new Error("예측 모델 조회 금지"); } } as unknown as SupabaseClient<Database>;
  const voting = { ...session, phase: "map_ban", roster: { ...EMPTY_ROSTER, team1: { ...EMPTY_ROSTER.team1, tank: "tank" } },
    ma_snapshot: { tank: { m: 1, a: 2 } } } as unknown as Round;
  for (const premium of [true, false]) {
    const result = await loadBalanceScoreData(client, "clan", voting, true, premium, Promise.resolve(new Map()));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("현재 점수 조회 실패");
    expect(result.scores.tank.roles?.tank).toEqual({ m: 1, a: premium ? 2 : null });
    expect(result.predictionModel).toBeUndefined();
    expect(result.analysisContext).toBeUndefined();
  }
});
