import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "../scripts/test-env.mjs";
import { isoToKstYmd } from "../src/lib/clan/stats/kst";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("participation dots ignore visits and refresh the preserved member list every five minutes", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(3), management = f.path.replace(/\/balance$/, "/manage?tab=members");
  try {
    const cutoff = new Date(isoToKstYmd(new Date().toISOString()) + "T00:00:00+09:00").getTime();
    for (const [index, days] of [[0, 28], [1, 56], [2, 2]]) expect((await f.service.from("clan_members").update({ joined_at: new Date(cutoff - days * 86400000).toISOString(), last_activity_at: null }).eq("clan_id", f.clanId).eq("user_id", f.users[index].id)).error).toBeNull();
    expect((await f.service.rpc("refresh_clan_member_participation", { p_clan_id: f.clanId })).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(management);
    const row = (index: number) => page.getByRole("row").filter({ hasText: f.users[index].nickname });
    const dot = (index: number, label: string) => row(index).getByRole("img", { name: f.users[index].nickname + " " + label, exact: true });
    await expect(dot(0, "비활성")).toHaveClass(/bg-amber-500/);
    await expect(dot(1, "휴면")).toHaveClass(/bg-slate-400/);
    await expect(dot(2, "활성")).toHaveClass(/bg-emerald-500/);
    await expect(row(0).getByText("비활성", { exact: true })).toHaveCount(0);
    await expect(row(1).getByText("휴면", { exact: true })).toHaveCount(0);
    await expect(dot(0, "비활성")).toHaveAttribute("title", /참여 이력 없음/);
    await expect(page.getByText("매일 00:00 내전 참여 기준 · 4주 비활성 · 8주 휴면", { exact: true })).toBeVisible();
    await expect.poll(async () => (await f.service.from("clan_members").select("last_activity_at").eq("clan_id", f.clanId).eq("user_id", f.users[0].id).single()).data?.last_activity_at).not.toBeNull();
    await page.reload();
    await expect(dot(0, "비활성")).toBeVisible();
    await page.getByRole("combobox", { name: "활동 상태", exact: true }).selectOption("inactive");
    await expect(row(0)).toBeVisible(); await expect(row(1)).toHaveCount(0); await expect(row(2)).toHaveCount(0);
    await page.getByRole("combobox", { name: "활동 상태", exact: true }).selectOption("all");
    await page.setViewportSize({ width: 1142, height: 884 });
    await page.screenshot({ path: test.info().outputPath("member-participation-dots.png"), animations: "disabled" });
    await page.clock.install();
    await page.reload();
    await page.getByRole("textbox", { name: "구성원 검색", exact: true }).fill(f.users[0].nickname);
    expect((await f.service.from("clan_members").update({ participation_status: "active" }).eq("clan_id", f.clanId).eq("user_id", f.users[0].id)).error).toBeNull();
    await page.clock.fastForward(5 * 60_000);
    await expect(dot(0, "활성")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "구성원 검색", exact: true })).toHaveValue(f.users[0].nickname);
  } finally { await f.cleanup(); }
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
