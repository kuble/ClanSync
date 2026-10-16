import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "../scripts/test-env.mjs";
import { isoToKstYmd } from "../src/lib/clan/stats/kst";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("member management shows the current visit immediately and persists activity for other viewers", async ({ page, browser, baseURL }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(3);
  const management = f.path.replace(/\/balance$/, "/manage?tab=members");
  const memberContext = await browser.newContext({ baseURL });
  try {
    const stale = new Date(Date.now() - 65 * 86400000).toISOString();
    expect((await f.service.from("clan_members").update({ joined_at: stale, last_activity_at: null }).eq("clan_id", f.clanId)).error).toBeNull();
    const inactive = new Date(Date.now() - 35 * 86400000).toISOString();
    expect((await f.service.from("clan_members").update({ last_activity_at: inactive }).eq("clan_id", f.clanId).eq("user_id", f.users[2].id)).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(management);
    const row = (nickname: string) => page.getByRole("row").filter({ hasText: nickname });
    await expect(row(f.users[0].nickname).getByText("활성", { exact: true })).toBeVisible();
    await expect(row(f.users[1].nickname).getByText("휴면", { exact: true })).toBeVisible();
    await expect(row(f.users[2].nickname).getByText("비활성", { exact: true })).toBeVisible();
    const activity = async (userId: string) => {
      const result = await f.service.from("clan_members").select("last_activity_at").eq("clan_id", f.clanId).eq("user_id", userId).single();
      expect(result.error).toBeNull();
      return result.data!.last_activity_at;
    };
    await expect.poll(() => activity(f.users[0].id)).not.toBeNull();
    const memberPage = await memberContext.newPage();
    await loginIsolatedBalanceUser(memberPage, f.users[1]);
    await memberPage.goto(f.path);
    await expect(memberPage.getByRole("heading", { name: "내전 로비", exact: true })).toBeVisible();
    await expect.poll(() => activity(f.users[1].id)).not.toBeNull();
    await page.reload();
    await expect(row(f.users[1].nickname).getByText("활성", { exact: true })).toBeVisible();
    await page.getByRole("combobox", { name: "활동 상태", exact: true }).selectOption("inactive");
    await expect(row(f.users[2].nickname)).toBeVisible();
    await expect(row(f.users[0].nickname)).toHaveCount(0);
    await expect(row(f.users[1].nickname)).toHaveCount(0);
  } finally {
    await memberContext.close();
    await f.cleanup();
  }
});

test("activity RPC only updates the active caller, throttles repeat visits and keeps one KST person-day", async () => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(4);
  const env = loadTestEnv();
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const clients = await Promise.all(f.users.map((_, i) => f.memberClient(i)));
  try {
    const stale = new Date(Date.now() - 65 * 86400000).toISOString();
    expect((await f.service.from("clan_members").update({ last_activity_at: stale }).eq("clan_id", f.clanId)).error).toBeNull();
    for (const [index, status] of [[2, "left"], [3, "banned"]] as const) {
      expect((await f.service.from("clan_members").update({ status }).eq("clan_id", f.clanId).eq("user_id", f.users[index].id)).error).toBeNull();
    }
    const snapshot = async () => {
      const result = await f.service.from("clan_members").select("user_id,status,last_activity_at").eq("clan_id", f.clanId).order("user_id");
      expect(result.error).toBeNull();
      return result.data!;
    };
    const before = await snapshot();
    expect((await anon.rpc("record_clan_activity", { p_clan_id: f.clanId })).error).not.toBeNull();
    for (const client of clients.slice(2)) expect((await client.rpc("record_clan_activity", { p_clan_id: f.clanId })).error).toBeNull();
    expect((await clients[1].rpc("record_clan_activity", { p_clan_id: crypto.randomUUID() })).error).toBeNull();
    expect(await snapshot()).toEqual(before);

    expect((await clients[1].rpc("record_clan_activity", { p_clan_id: f.clanId })).error).toBeNull();
    const first = await snapshot();
    const member = first.find((row) => row.user_id === f.users[1].id)!;
    expect(Date.parse(member.last_activity_at!)).toBeGreaterThan(Date.now() - 60_000);
    expect(first.filter((row) => row.user_id !== member.user_id)).toEqual(before.filter((row) => row.user_id !== member.user_id));
    expect((await clients[1].rpc("record_clan_activity", { p_clan_id: f.clanId })).error).toBeNull();
    expect(await snapshot()).toEqual(first);

    const visits = await f.service.from("clan_daily_member_activity").select("user_id,activity_date").eq("clan_id", f.clanId);
    expect(visits.error).toBeNull();
    expect(visits.data).toEqual([{ user_id: f.users[1].id, activity_date: isoToKstYmd(new Date().toISOString()) }]);
    const direct = await clients[1].from("clan_members").update({ last_activity_at: new Date().toISOString() }).eq("clan_id", f.clanId).eq("user_id", f.users[0].id).select("user_id");
    expect(direct.data ?? []).toEqual([]);
    expect(await snapshot()).toEqual(first);
  } finally {
    await Promise.all(clients.map((client) => client.auth.signOut()));
    await f.cleanup();
  }
});
