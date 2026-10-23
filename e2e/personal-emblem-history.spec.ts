import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture } from "./isolated-balance-fixture";
import { finalizeClanPersonalEmblemAwards, loadClanPersonalEmblemCollection } from "../src/lib/clan/stats/load-clan-stats";
import type { PersonalEmblemCollection } from "../src/lib/personal-emblems/types";

async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}

function earnedHistory(collection: PersonalEmblemCollection | null) {
  expect(collection).not.toBeNull();
  return collection!.emblems.filter((emblem) => emblem.earned)
    .map(({ key, kind, rank, date }) => ({ key, kind, rank, date }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

test("영구 수상과 최초 달성일은 정정·삭제·설정 변경·탈퇴 이후에도 보존한다", async () => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(2);
  const config = {
    personal_record_min_role: "member", member_personal_sections: ["emblems", "records", "predictions"],
    win_rate_visible_top: 3, participation_visible_top: 3, cumulative_visible_top: 3,
    streak_visible_top: 3, prediction_visible_top: 3,
    monthly_rank_visibility: "month_start", yearly_rank_visibility: "year_start",
    eligibility_game_threshold: 100, eligibility_below_pct: 1, eligibility_above_min_games: 1,
    eligibility_session_pct: 1,
  };
  try {
    const [leader, member] = await Promise.all([f.memberClient(0), f.memberClient(1)]);
    await ok(f.service.from("clan_settings").update({ hof_config: config }).eq("clan_id", f.clanId));
    const guest = await ok(leader.rpc("save_clan_participant", {
      p_clan_id: f.clanId, p_id: null as unknown as string, p_nickname: "영구기록 게스트", p_alias: null as unknown as string,
    }));
    // Backdated event times distinguish the first achievement from the import/confirmation time.
    const records = Array.from({ length: 21 }, (_, index) => ({
      id: randomUUID() as string, clan_id: f.clanId, game_id: f.gameId,
      match_type: "intra" as const, status: "finished" as const, map_label: "부산", created_by: f.users[0].id,
      played_at: `2025-11-${String(index < 10 ? index + 1 : index + 2).padStart(2, "0")}T16:30:00Z`,
    }));
    await ok(f.service.from("matches").insert(records.slice(0, 10)));
    await ok(f.service.from("match_players").insert(records.slice(0, 10).flatMap((record) => [
      { match_id: record.id, user_id: f.users[1].id, team: 1 },
      { match_id: record.id, user_id: f.users[0].id, team: 2 },
    ])));
    await ok(f.service.from("match_results").insert(records.slice(0, 10).map((record) => ({ match_id: record.id, winner_team: 1 }))));
    // Guest subjects belong to the correction JSON projection; raw match_players accepts account IDs only.
    for (const record of records.slice(10)) {
      record.id = await ok(f.service.rpc("edit_clan_match_record", {
        p_clan_id: f.clanId, p_actor_id: f.users[0].id, p_id: null as unknown as string,
        p_operation: "create", p_revision: null as unknown as string,
        p_record: { playedAt: record.played_at, occurredAt: record.played_at, mapLabel: "부산", outcome: "team1",
          players: [{ userId: guest, team: 1, role: "tank" }, { userId: f.users[0].id, team: 2, role: "tank" }] },
      }));
    }

    // Concurrent finalizers must commit one immutable snapshot per closed period.
    await Promise.all([
      finalizeClanPersonalEmblemAwards(f.clanId, new Date("2026-01-01T00:00:00+09:00")),
      finalizeClanPersonalEmblemAwards(f.clanId, new Date("2026-01-01T00:00:00+09:00")),
    ]);
    const read = () => loadClanPersonalEmblemCollection(member, f.users[1].id, f.clanId);
    const original = await read();
    const originalEarned = earnedHistory(original);
    const originalAwards = original!.emblems.filter((emblem) => emblem.kind === "award");
    for (const [period, date] of [["month", "2025-11"], ["year", "2025"]] as const) {
      // The unlinked guest holds first place; skipping that recipient must not promote the member.
      expect(originalAwards.find((emblem) => emblem.period === period && emblem.date === date && emblem.family === "victory"))
        .toMatchObject({ rank: 2, earned: true });
      expect(originalAwards.find((emblem) => emblem.period === period && emblem.date === date && emblem.family === "streak"))
        .toMatchObject({ rank: 2, earned: true });
      expect(originalAwards.find((emblem) => emblem.period === period && emblem.date === date && emblem.family === "appearances"))
        .toMatchObject({ rank: 3, earned: true });
    }
    const firstDates = {
      "milestone-matches-1": "2025-11-10T16:30:00.000Z",
      "milestone-wins-1": "2025-11-10T16:30:00.000Z",
      "milestone-streak-1": "2025-11-03T16:30:00.000Z",
      "milestone-streak-2": "2025-11-05T16:30:00.000Z",
      "milestone-streak-3": "2025-11-07T16:30:00.000Z",
      "milestone-streak-4": "2025-11-10T16:30:00.000Z",
    };
    for (const [key, date] of Object.entries(firstDates)) {
      const emblem = original!.emblems.find((entry) => entry.key === key);
      expect(emblem, key).toMatchObject({ earned: true });
      expect(emblem!.date, key).not.toBeNull();
      expect(new Date(emblem!.date!).toISOString(), key).toBe(date);
    }
    const tenthWin = original!.emblems.find((entry) => entry.key === "milestone-wins-1")!;
    expect(new Date(new Date(tenthWin.date!).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)).toBe("2025-11-11");

    const ledger = async () => {
      const [awards, milestones] = await Promise.all([
        ok(f.service.from("clan_personal_emblem_awards").select("*").eq("clan_id", f.clanId).order("user_id").order("emblem_key")),
        ok(f.service.from("clan_personal_emblem_milestones").select("*").eq("clan_id", f.clanId).order("user_id").order("emblem_key")),
      ]);
      return { awards, milestones };
    };
    const originalLedger = await ledger();
    const featuredKeys = ["month-2025-11-승률", "milestone-streak-4"];
    await ok(f.service.from("clan_personal_emblem_picks").upsert({
      clan_id: f.clanId, user_id: f.users[1].id, emblem_keys: featuredKeys,
    }));
    expect(originalLedger.awards.every((award) => f.users.some((user) => user.id === award.user_id))).toBe(true);
    for (const award of originalLedger.awards) {
      expect(new Date(award.earned_at).toISOString()).toBe(award.period_type === "month"
        ? "2025-11-30T15:00:00.000Z" : "2025-12-31T15:00:00.000Z");
    }
    const periods = await ok(f.service.from("clan_personal_emblem_award_periods").select("period_type,period_key").eq("clan_id", f.clanId));
    expect(periods.filter((period) => period.period_type === "month" && period.period_key === "2025-11")).toHaveLength(1);
    expect(periods.filter((period) => period.period_type === "year" && period.period_key === "2025")).toHaveLength(1);

    async function revision(id: string) {
      const rows = await ok(f.service.rpc("read_clan_stats_records", { p_clan_id: f.clanId, p_user_id: f.users[0].id }));
      const payload = rows.map((row) => row.payload as { id: string; _revision: string }).find((row) => row.id === id);
      expect(payload).toBeDefined();
      return payload!._revision;
    }
    await ok(f.service.rpc("edit_clan_match_record", {
      p_clan_id: f.clanId, p_actor_id: f.users[0].id, p_id: records[0].id, p_operation: "update",
      p_revision: await revision(records[0].id),
      p_record: { playedAt: records[0].played_at, occurredAt: records[0].played_at, mapLabel: "부산", outcome: "team2",
        players: [{ userId: f.users[1].id, team: 1, role: "tank" }, { userId: f.users[0].id, team: 2, role: "tank" }] },
    }));
    const corrected = await ok(f.service.rpc("read_clan_stats_summary", { p_clan_id: f.clanId, p_periods: ["all"] })) as unknown as {
      periods: { all: { players: { userId: string; wins: number }[] } };
    };
    expect(corrected.periods.all.players.find((player) => player.userId === f.users[1].id)?.wins).toBe(9);
    expect(earnedHistory(await read())).toEqual(originalEarned);

    const stricter = { ...config, eligibility_game_threshold: 1, eligibility_above_min_games: 2000 };
    await ok(f.service.from("clan_settings").update({ hof_config: stricter }).eq("clan_id", f.clanId));
    await finalizeClanPersonalEmblemAwards(f.clanId);
    expect(earnedHistory(await read())).toEqual(originalEarned);
    await ok(f.service.rpc("edit_clan_match_record", {
      p_clan_id: f.clanId, p_actor_id: f.users[0].id, p_id: records[0].id, p_operation: "delete",
      p_revision: await revision(records[0].id), p_record: {},
    }));
    const beforeDelete = await ok(f.service.rpc("read_clan_stats_records", { p_clan_id: f.clanId, p_user_id: f.users[0].id }));
    const guestRevisions = new Map(beforeDelete.map((row) => {
      const payload = row.payload as { id: string; _revision: string };
      return [payload.id, payload._revision];
    }));
    for (const record of records.slice(10)) await ok(f.service.rpc("edit_clan_match_record", {
      p_clan_id: f.clanId, p_actor_id: f.users[0].id, p_id: record.id, p_operation: "delete",
      p_revision: guestRevisions.get(record.id)!, p_record: {},
    }));
    await ok(f.service.from("matches").delete().in("id", records.slice(0, 10).map((record) => record.id)));
    const empty = await ok(f.service.rpc("read_clan_stats_records", { p_clan_id: f.clanId, p_user_id: f.users[0].id }));
    expect(empty).toEqual([]);
    expect(earnedHistory(await read())).toEqual(originalEarned);
    expect((await read())?.featuredKeys).toEqual(featuredKeys);
    expect(await ledger()).toEqual(originalLedger);

    const hidden = { ...stricter, win_rate_visible_top: 0, streak_visible_top: 0, cumulative_visible_top: 0 };
    await ok(f.service.from("clan_settings").update({ hof_config: hidden }).eq("clan_id", f.clanId));
    const hiddenAwards = await read();
    expect(hiddenAwards).not.toBeNull();
    expect(hiddenAwards!.emblems.filter((emblem) => emblem.kind === "award")).toEqual([]);
    expect(hiddenAwards!.emblems.filter((emblem) => emblem.kind === "milestone" && emblem.earned)).toHaveLength(6);
    const staffView = await loadClanPersonalEmblemCollection(leader, f.users[0].id, f.clanId, f.users[1].id);
    expect(earnedHistory(staffView)).toEqual(originalEarned);
    await ok(f.service.from("clan_settings").update({ hof_config: { ...hidden, member_personal_sections: ["emblems"] } }).eq("clan_id", f.clanId));
    const hiddenRecords = await read();
    expect(hiddenRecords).not.toBeNull();
    expect(hiddenRecords!.emblems.filter((emblem) => emblem.kind === "milestone")).toEqual([]);
    expect(await ledger()).toEqual(originalLedger);
    await ok(f.service.from("clan_settings").update({ hof_config: config }).eq("clan_id", f.clanId));
    expect(earnedHistory(await read())).toEqual(originalEarned);
    expect((await read())?.featuredKeys).toEqual(featuredKeys);

    await ok(f.service.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    expect(await read()).toBeNull();
    expect(await loadClanPersonalEmblemCollection(leader, f.users[0].id, f.clanId, f.users[1].id)).toBeNull();
    expect(await ledger()).toEqual(originalLedger);
    await ok(f.service.from("clan_members").update({ status: "active" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    await finalizeClanPersonalEmblemAwards(f.clanId);
    expect(earnedHistory(await read())).toEqual(originalEarned);
    expect((await read())?.featuredKeys).toEqual(featuredKeys);
    expect(await ledger()).toEqual(originalLedger);
  } finally { await f.cleanup(); }
});
