import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { loadGamePlayerNames } from "../src/lib/game-auth/load-game-player-names";
import { loadBoardPostDetail } from "../src/lib/main-game/load-main-game-hub";

test("live names use verified game IDs despite unrelated legacy nicknames", async ({ page }, info) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(4);
  const leader = await f.memberClient(0), outsider = await f.memberClient(3);
  let valorantClan: string | null = null;
  const names = ["SameName#1001", "SameName#2002", "게임 ID 미등록"];
  try {
    for (let i = 0; i < 3; i++) {
      expect((await f.service.from("user_game_profiles").update({ battle_tag: i < 2 ? names[i] : "Unverified#3003", is_verified: i < 2 }).eq("user_id", f.users[i].id).eq("game_id", f.gameId)).error).toBeNull();
      expect((await f.service.from("users").update({ nickname: `LegacyAccount${i}` }).eq("id", f.users[i].id)).error).toBeNull();
    }
    expect((await f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[3].id)).error).toBeNull();
    const readNames = () => leader.rpc("clan_peer_nicknames", { p_clan_id: f.clanId });
    const peers = await readNames();
    expect(peers.error).toBeNull();
    for (let i = 0; i < 3; i++) expect(peers.data?.find(p => p.user_id === f.users[i].id)?.nickname).toBe(names[i]);
    expect((await outsider.rpc("clan_peer_nicknames", { p_clan_id: f.clanId })).data).toEqual([]);
    const pool = await leader.rpc("list_balance_roster_pool", { p_clan_id: f.clanId });
    expect(pool.error).toBeNull();
    expect(pool.data?.find(p => p.user_id === f.users[0].id)?.nickname).toBe(names[0]);
    const cards = await leader.rpc("get_clan_namecards", { p_clan_id: f.clanId });
    expect(cards.error).toBeNull();
    const appearances = cards.data as Record<string, { displayName: string }>;
    expect(appearances[f.users[0].id].displayName).toBe(names[0]);
    expect(appearances[f.users[2].id].displayName).toBe(names[2]);
    const mapped = await loadGamePlayerNames(f.gameId, f.users.map(u => u.id));
    expect(mapped.get(f.users[0].id)).toBe(names[0]);
    expect(mapped.has(f.users[2].id)).toBe(false);

    const guestId = randomUUID();
    const guest = await f.service.from("clan_participants").insert({ clan_id: f.clanId, id: guestId, is_guest: true, nickname: "게스트 기록명", alias: "기록 구분" });
    expect(guest.error).toBeNull();
    expect((await leader.rpc("list_balance_roster_pool", { p_clan_id: f.clanId })).data?.find(p => p.user_id === guestId)?.nickname).toBe("게스트 기록명 · 기록 구분");

    const { data: valorant } = await f.service.from("games").select("id").eq("slug", "valorant").single();
    expect(valorant).toBeTruthy();
    expect((await f.service.from("user_game_profiles").insert({ user_id: f.users[0].id, game_id: valorant!.id, game_uid: `riot-${f.users[0].id}`, riot_id: "RiotIdentity#QA1", is_verified: true })).error).toBeNull();
    const secondClan = await f.service.from("clans").insert({ name: `Identity-${f.clanId.slice(0, 8)}`, game_id: valorant!.id }).select("id").single();
    expect(secondClan.error).toBeNull(); valorantClan = secondClan.data!.id;
    expect((await f.service.from("clan_members").insert({ clan_id: valorantClan, user_id: f.users[0].id, role: "leader", status: "active" })).error).toBeNull();
    expect((await leader.rpc("clan_peer_nicknames", { p_clan_id: valorantClan })).data?.[0].nickname).toBe("RiotIdentity#QA1");
    expect((await loadGamePlayerNames(valorant!.id, [f.users[0].id])).get(f.users[0].id)).toBe("RiotIdentity#QA1");
    expect((await readNames()).data?.find(p => p.user_id === f.users[0].id)?.nickname).toBe(names[0]);

    const post = await f.service.from("board_posts").insert({ game_id: f.gameId, clan_id: f.clanId, created_by: f.users[0].id, post_type: "promotion", title: "게임 ID 확인", content: "검증용 임시 글" }).select("id").single();
    expect(post.error).toBeNull();
    expect((await loadBoardPostDetail(leader, f.gameId, post.data!.id))?.author_nickname).toBe(names[0]);
    const room = await f.service.from("balance_rooms").insert({ game_id: f.gameId, clan_id: f.clanId, kind: "regular", status: "scheduled", title: "게임 ID 확인", created_by: f.users[0].id, scheduled_at: new Date(Date.now() + 86400000).toISOString() }).select("id,operator_name").single();
    expect(room.error).toBeNull(); expect(room.data?.operator_name).toBe(names[0]);
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(f.path);
    const row = page.getByTestId("balance-lobby-room").filter({ hasText: "게임 ID 확인" });
    await expect(row).toContainText(names[0]);
    await expect(row).not.toContainText("LegacyAccount");
    await row.screenshot({ path: info.outputPath("lobby-game-id.png") });
    await page.goto(f.path.replace(/balance$/, "manage?tab=members"));
    await expect(page.getByRole("main")).toContainText(names[0]);
    await expect(page.getByRole("main")).not.toContainText("LegacyAccount");
    expect((await leader.rpc("open_balance_room", { p_clan_id: f.clanId, p_room_id: room.data!.id })).error).toBeNull();
    expect((await f.service.from("user_game_profiles").update({ battle_tag: null }).eq("game_id", f.gameId).eq("user_id", f.users[0].id)).error).toBeNull();
    expect((await f.service.from("users").update({ nickname: "LegacyAccount0" }).eq("id", f.users[0].id)).error).toBeNull();
    await page.goto(`${f.path}?room=${room.data!.id}`);
    await expect(page.getByText("호스트 · 게임 ID 미등록", { exact: true })).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("LegacyAccount0");
  } finally {
    if (valorantClan) await f.service.from("clans").delete().eq("id", valorantClan);
    await Promise.all([leader.auth.signOut(), outsider.auth.signOut()]);
    await f.cleanup();
  }
});
