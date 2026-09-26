import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { loadTestEnv } from "../scripts/test-env.mjs";
import { currentKstYearMonth } from "../src/lib/clan/stats/hof-config";

async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}

test("HoF comments RLS: membership, author, disclosure and thread boundaries", async () => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(3);
  let otherClan: string | undefined;
  const now = currentKstYearMonth();
  const month = `${now.year}-${String(now.month).padStart(2, "0")}`;
  try {
    const [leader, member, outsider] = await Promise.all([f.memberClient(0), f.memberClient(1), f.memberClient(2)]);
    await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
    const other = await ok(f.service.from("clans").insert({ game_id: f.gameId, name: `HofOther-${f.clanId.slice(0, 8)}` }).select("id").single());
    otherClan = other.id;
    await ok(f.service.from("clan_members").insert({ clan_id: other.id, user_id: f.users[2].id, role: "leader", status: "active" }));
    const thread = { clan_id: f.clanId, ranking: "rate", period_key: "all", content: "응원합니다" };
    const row = await ok(member.from("clan_hof_comments").insert(thread).select().single());
    expect(row.author_id).toBe(f.users[1].id);
    expect(await ok(leader.from("clan_hof_comments").select("id").eq("id", row.id))).toHaveLength(1);
    expect(await ok(outsider.from("clan_hof_comments").select("id").eq("id", row.id))).toEqual([]);
    expect((await outsider.from("clan_hof_comments").insert(thread)).error).not.toBeNull();
    expect((await member.from("clan_hof_comments").insert({ ...thread, clan_id: other.id })).error).not.toBeNull();
    expect((await member.from("clan_hof_comments").insert({ ...thread, author_id: f.users[0].id })).error).not.toBeNull();
    expect((await member.from("clan_hof_comments").insert({ ...thread, created_at: "2000-01-01" })).error).not.toBeNull();
    expect((await member.from("clan_hof_comments").update({ content: "forged", period_key: "2025" }).eq("id", row.id)).error).not.toBeNull();
    for (const values of [{ content: " \n\t" }, { content: "a".repeat(501) }, { period_key: "2026-13" }, { period_key: "9999" }, { ranking: "unknown" }]) {
      expect((await member.from("clan_hof_comments").insert({ ...thread, ...values })).error).not.toBeNull();
    }
    const env = loadTestEnv();
    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    expect((await anon.from("clan_hof_comments").select()).error).not.toBeNull();
    expect((await anon.from("clan_hof_comments").insert(thread)).error).not.toBeNull();

    const leaderRow = await ok(leader.from("clan_hof_comments").insert(thread).select().single());
    expect(await ok(member.from("clan_hof_comments").delete().eq("id", leaderRow.id).select())).toEqual([]);
    expect(await ok(member.from("clan_hof_comments").delete().eq("id", row.id).select())).toHaveLength(1);
    const moderated = await ok(member.from("clan_hof_comments").insert(thread).select().single());
    await ok(f.service.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[0].id));
    expect(await ok(leader.from("clan_hof_comments").delete().eq("id", moderated.id).select())).toHaveLength(1);

    await ok(f.service.from("clan_settings").upsert({ clan_id: f.clanId, hof_config: { win_rate_visible_top: 0, monthly_rank_visibility: "month_start", yearly_rank_visibility: "year_start" } }));
    expect(await ok(member.from("clan_hof_comments").select().eq("id", leaderRow.id))).toEqual([]);
    expect((await member.from("clan_hof_comments").insert(thread)).error).not.toBeNull();
    for (const period_key of [month, String(now.year)]) {
      expect((await member.from("clan_hof_comments").insert({ ...thread, ranking: "attendance", period_key })).error).not.toBeNull();
      await ok(leader.from("clan_hof_comments").insert({ ...thread, ranking: "attendance", period_key }));
    }
    await ok(member.from("clan_hof_comments").insert({ ...thread, ranking: "attendance", period_key: String(now.year - 1) }));
    await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    expect(await ok(member.from("clan_hof_comments").select().eq("clan_id", f.clanId))).toEqual([]);
    expect((await member.from("clan_hof_comments").insert({ ...thread, ranking: "attendance" })).error).not.toBeNull();
  } finally {
    if (otherClan) await ok(f.service.from("clans").delete().eq("id", otherClan));
    await f.cleanup();
  }
});

test("HoF reactions: persist, separate category/period, paginate and moderate", async ({ page, browser }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(2);
  const leaderContext = await browser.newContext();
  const leaderPage = await leaderContext.newPage();
  const path = f.path.replace(/balance$/, "stats");
  const content = "이번 승률도 응원합니다!";
  try {
    // Same timestamp exercises the ID tie-breaker in keyset pagination.
    await ok(f.service.from("clan_hof_comments").insert(Array.from({ length: 31 }, (_, i) => ({ clan_id: f.clanId, ranking: "rate", period_key: "all", content: `기존 반응 ${i + 1}`, author_id: f.users[0].id, created_at: "2025-01-01T00:00:00Z" }))));
    await loginIsolatedBalanceUser(page, f.users[1]);
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "누적 순위 변동" })).toHaveCount(0);
    const panel = page.getByLabel("전체 기간 · 승률 반응", { exact: true });
    await expect(panel.getByRole("listitem")).toHaveCount(30);
    await panel.getByRole("button", { name: "이전 댓글 더 보기" }).click();
    await expect(panel.getByRole("listitem")).toHaveCount(31);
    await expect(panel.getByRole("button", { name: /댓글 삭제/ })).toHaveCount(0);
    await page.getByLabel("순위에 댓글 남기기").fill(content);
    await page.getByRole("button", { name: "댓글 등록", exact: true }).click();
    await expect(panel.getByText(content, { exact: true })).toBeVisible();
    await page.reload();
    await expect(panel.getByText(content, { exact: true })).toBeVisible();
    await page.getByRole("radio", { name: "최다 출석", exact: true }).click();
    await expect(page.getByLabel("전체 기간 · 최다 출석 반응", { exact: true })).toBeVisible();
    await expect(page.getByText(content, { exact: true })).toHaveCount(0);
    await page.getByRole("radio", { name: "승률", exact: true }).click();
    await page.getByRole("radio", { name: "월별", exact: true }).click();
    await expect(page.getByText(content, { exact: true })).toHaveCount(0);
    const monthly = "이번 달 순위 응원";
    await page.getByLabel("순위에 댓글 남기기").fill(monthly);
    await page.getByRole("button", { name: "댓글 등록", exact: true }).click();
    await expect(page.getByText(monthly, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: `${f.users[1].nickname} 댓글 삭제`, exact: true }).click();
    await page.getByRole("button", { name: "삭제 확인", exact: true }).click();
    await expect(page.getByText(monthly, { exact: true })).toHaveCount(0);
    await page.getByRole("radio", { name: "전체", exact: true }).click();
    await expect(panel.getByText(content, { exact: true })).toBeVisible();
    await loginIsolatedBalanceUser(leaderPage, f.users[0]);
    await leaderPage.goto(path);
    await expect(leaderPage.getByText(content, { exact: true })).toBeVisible();
    await leaderPage.getByRole("button", { name: `${f.users[1].nickname} 댓글 삭제`, exact: true }).click();
    await leaderPage.getByRole("button", { name: "삭제 확인", exact: true }).click();
    await expect(leaderPage.getByText(content, { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "반응 새로고침", exact: true }).click();
    await expect(page.getByText(content, { exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByLabel("순위에 댓글 남기기")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    await leaderContext.close();
    await f.cleanup();
  }
});
