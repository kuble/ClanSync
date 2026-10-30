import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture } from "./isolated-balance-fixture";
import { gameProfileIdentity } from "../src/lib/game-auth/game-profile-identity";

test("primary and alt IDs enforce game-specific formats even through direct database requests", async () => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2);
  const owner = await f.memberClient(0), peer = await f.memberClient(1);
  const valorant = await f.service.from("games").select("id").eq("slug", "valorant").single();
  try {
    expect(valorant.error).toBeNull();
    const cases = [
      { slug: "overwatch", gameId: f.gameId, valid: ["Player#1234", "한글#12345", "कुमार#1234", "𐐀𐐁#1234", "Ｐｌａｙｅｒ＃１２３４"], invalid: ["kkkk", "A#1234", "Name#123", "Name#12345678901", "Name#1234#5678", "Name #1234", "Name_#1234", "@@#1234", "😀😀#1234", "a".repeat(21) + "#1234"] },
      { slug: "valorant", gameId: valorant.data!.id, valid: ["Player#KR1", "함께하는 사람#KR1", "Name#1234"], invalid: ["kkkk", "ab#KR1", "Name#K1", "Name#KR1234", "Name#KR1#x", "Name\n#KR1", "a".repeat(17) + "#KR1"] },
    ];
    for (const c of cases) {
      const profile = () => f.service.from("user_game_profiles").select("game_uid,battle_tag,riot_id,is_verified,verified_at").eq("user_id", f.users[0].id).eq("game_id", c.gameId).single();
      for (const value of c.valid) {
        const expected = gameProfileIdentity(c.slug, { battle_tag: value, riot_id: value });
        expect(expected).not.toBeNull();
        expect((await owner.rpc("save_my_game_identity", { p_game_slug: c.slug, p_identity: value })).error).toBeNull();
        const saved = (await profile()).data!;
        expect(c.slug === "overwatch" ? saved.battle_tag : saved.riot_id).toBe(expected);
        expect(saved.is_verified).toBe(false);
      }
      const before = (await profile()).data!;
      const add = (value: string, userId = f.users[0].id) => owner.from("user_alt_accounts").insert({ user_id: userId, game_id: c.gameId, alt_nick: value }).select("id,alt_nick").single();
      for (const value of c.invalid) {
        expect(gameProfileIdentity(c.slug, { battle_tag: value, riot_id: value })).toBeNull();
        expect((await owner.rpc("save_my_game_identity", { p_game_slug: c.slug, p_identity: value })).error, `primary ${c.slug}: ${value}`).toBeTruthy();
        expect((await add(value)).error, `alt ${c.slug}: ${value}`).toBeTruthy();
      }
      expect((await profile()).data).toEqual(before);
      const valid = c.valid[0];
      const alt = await add(valid);
      expect(alt.error, "self-reported primary IDs must allow valid own alts").toBeNull();
      expect((await owner.from("user_alt_accounts").update({ alt_nick: "kkkk" }).eq("id", alt.data!.id)).error).toBeTruthy();
      expect((await f.service.from("user_alt_accounts").select("alt_nick").eq("id", alt.data!.id).single()).data?.alt_nick).toBe(valid);
      expect((await add(valid, f.users[1].id)).error).toBeTruthy();
      const forged = await peer.from("user_alt_accounts").update({ alt_nick: c.valid[1] }).eq("id", alt.data!.id).select();
      expect(forged.error || !forged.data?.length).toBeTruthy();
    }
  } finally {
    await Promise.all([owner.auth.signOut(), peer.auth.signOut()]);
    await f.cleanup();
  }
});
