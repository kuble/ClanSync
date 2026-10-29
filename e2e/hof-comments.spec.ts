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
    await ok(member.rpc("set_hof_comment_reaction", { p_comment_id: row.id, p_kind: "like" }));
    await ok(member.rpc("set_hof_comment_reaction", { p_comment_id: row.id, p_kind: "like" }));
    expect(await ok(member.rpc("list_hof_comment_reactions", { p_comment_ids: [row.id] }))).toEqual([{ comment_id: row.id, kind: "like", total: 1, mine: true }]);
    await ok(leader.rpc("set_hof_comment_reaction", { p_comment_id: row.id, p_kind: "heart" }));
    await ok(member.rpc("set_hof_comment_reaction", { p_comment_id: row.id, p_kind: "clap" }));
    const summaries = await ok(member.rpc("list_hof_comment_reactions", { p_comment_ids: [row.id] }));
    expect(summaries).toEqual(expect.arrayContaining([{ comment_id: row.id, kind: "clap", total: 1, mine: true }, { comment_id: row.id, kind: "heart", total: 1, mine: false }]));
    expect(summaries).toHaveLength(2);
    expect(await ok(member.from("clan_hof_comment_reactions").delete().eq("comment_id", row.id).eq("user_id", f.users[0].id).select())).toEqual([]);
    expect((await member.from("clan_hof_comment_reactions").insert({ comment_id: row.id, kind: "heart", user_id: f.users[0].id })).error).not.toBeNull();
    expect((await member.from("clan_hof_comment_reactions").update({ user_id: f.users[0].id }).eq("comment_id", row.id)).error).not.toBeNull();
    expect((await member.rpc("set_hof_comment_reaction", { p_comment_id: row.id, p_kind: "invalid" })).error).not.toBeNull();
    expect((await outsider.rpc("set_hof_comment_reaction", { p_comment_id: row.id, p_kind: "like" })).error).not.toBeNull();
    expect(await ok(outsider.rpc("list_hof_comment_reactions", { p_comment_ids: [row.id] }))).toEqual([]);
    await ok(member.rpc("set_hof_comment_reaction", { p_comment_id: row.id }));
    expect(await ok(member.rpc("list_hof_comment_reactions", { p_comment_ids: [row.id] }))).toEqual([{ comment_id: row.id, kind: "heart", total: 1, mine: false }]);
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
    expect(await ok(f.service.from("clan_hof_comment_reactions").select().eq("comment_id", row.id))).toEqual([]);
    const moderated = await ok(member.from("clan_hof_comments").insert(thread).select().single());
    await ok(f.service.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[0].id));
    expect(await ok(leader.from("clan_hof_comments").delete().eq("id", moderated.id).select())).toHaveLength(1);

    await ok(f.service.from("clan_settings").upsert({ clan_id: f.clanId, hof_config: { win_rate_visible_top: 0, monthly_rank_visibility: "month_start", yearly_rank_visibility: "year_start" } }));
    await ok(leader.rpc("set_hof_comment_reaction", { p_comment_id: leaderRow.id, p_kind: "heart" }));
    expect(await ok(member.rpc("list_hof_comment_reactions", { p_comment_ids: [leaderRow.id] }))).toEqual([]);
    expect((await member.rpc("set_hof_comment_reaction", { p_comment_id: leaderRow.id, p_kind: "like" })).error).not.toBeNull();
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
  page.setDefaultTimeout(15_000);
  await page.setViewportSize({ width: 1015, height: 884 });
  const f = await createIsolatedBalanceFixture(2);
  const leaderContext = await browser.newContext();
  const leaderPage = await leaderContext.newPage();
  leaderPage.setDefaultTimeout(15_000);
  const path = f.path.replace(/balance$/, "stats");
  const draft = "이번 승률도 응원합니다!";
  const content = draft + "👏";
  try {
    await ok(f.service.from("clan_settings").upsert({ clan_id: f.clanId, hof_config: { eligibility_below_pct: 100 } }));
    const matches = await ok(f.service.from("matches").insert(Array.from({ length: 3 }, () => ({ clan_id: f.clanId, game_id: f.gameId, status: "finished" as const }))).select("id"));
    await ok(f.service.from("match_players").insert([
      ...matches.map((match, i) => ({ match_id: match.id, user_id: f.users[0].id, team: i === 2 ? 2 : 1 })),
      { match_id: matches[0].id, user_id: f.users[1].id, team: 1 },
    ]));
    await ok(f.service.from("match_results").insert(matches.map((match) => ({ match_id: match.id, winner_team: 1 }))));
    // Same timestamp exercises the ID tie-breaker in keyset pagination.
    const seeded = await ok(f.service.from("clan_hof_comments").insert([
      ...Array.from({ length: 31 }, (_, i) => ({ clan_id: f.clanId, ranking: "rate", period_key: "all", content: `기존 반응 ${i + 1}`, author_id: f.users[0].id, created_at: "2025-01-01T00:00:00Z" })),
      ...["2024-12-31T14:59:00Z", "2024-12-31T15:00:00Z"].map((created_at, i) => ({ clan_id: f.clanId, ranking: "rate", period_key: "all", content: `한국 자정 ${i === 0 ? "이전" : "이후"}`, author_id: f.users[0].id, created_at })),
    ]).select("id, content, created_at"));
    const chronological = seeded.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)).map((row) => row.content);
    await loginIsolatedBalanceUser(page, f.users[1]);
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "누적 순위 변동" })).toHaveCount(0);
    const panel = page.getByLabel("전체 기간 · 승률 반응", { exact: true });
    await expect(panel.getByRole("heading", { name: "반응", exact: true })).toBeVisible();
    await expect(panel.getByText("순위 토크", { exact: true })).toHaveCount(0);
    await expect(panel.getByText("전체 기간 · 승률", { exact: true })).toHaveCount(0);
    await expect(panel.getByRole("listitem")).toHaveCount(30);
    const viewport = panel.getByRole("region", { name: "순위 댓글 목록", exact: true });
    await expect(viewport).toHaveAttribute("data-more-below", "false");
    await expect(viewport).toHaveAttribute("data-more-above", "true");
    await expect(panel.getByRole("listitem").locator("p")).toHaveText(chronological.slice(3));
    await expect(panel.getByRole("separator")).toHaveCount(1);
    const more = panel.getByRole("button", { name: "이전 댓글 더 보기" });
    await more.scrollIntoViewIfNeeded();
    const anchor = panel.getByText(chronological[3], { exact: true });
    const anchorY = (await anchor.boundingBox())!.y;
    await more.click();
    await expect(panel.getByRole("listitem")).toHaveCount(33);
    await expect(panel.getByRole("listitem").locator("p")).toHaveText(chronological);
    expect(Math.abs((await anchor.boundingBox())!.y - anchorY)).toBeLessThan(2);
    await expect(panel.getByRole("separator")).toHaveText(["2024년 12월 31일 화요일", "2025년 1월 1일 수요일"]);
    await expect(panel.getByRole("listitem").filter({ hasText: "한국 자정 이전" }).locator("time")).toHaveText("오후 11:59");
    await expect(panel.getByRole("listitem").filter({ hasText: "한국 자정 이후" }).locator("time")).toHaveText("오전 12:00");
    await expect(panel.getByRole("button", { name: /댓글 삭제/ })).toHaveCount(0);
    await page.getByLabel("순위 보고 한마디").fill(draft);
    await panel.getByRole("button", { name: "댓글 이모티콘 선택", exact: true }).click();
    await page.getByRole("button", { name: "박수 이모티콘", exact: true }).click();
    await expect(page.getByLabel("순위 보고 한마디")).toHaveText(content);
    await page.getByRole("button", { name: "댓글 등록", exact: true }).click();
    await expect(panel.getByText(content, { exact: true })).toBeVisible();
    const reply = panel.getByRole("listitem").filter({ has: page.getByText(content, { exact: true }) });
    await expect(panel.getByRole("listitem").last()).toContainText(content);
    await expect(reply.locator("[data-comment-row]")).toHaveCSS("flex-direction", "row-reverse");
    await expect(panel.getByRole("listitem").first().locator("[data-comment-row]")).toHaveCSS("flex-direction", "row");
    await expect(panel.getByRole("separator")).toHaveCount(3);
    await expect(reply.locator("time")).toHaveText(/^(오전|오후) \d{1,2}:\d{2}$/);
    await expect(reply.getByRole("button", { name: `${f.users[1].nickname} 댓글 삭제`, exact: true })).toHaveText("");
    await expect(reply.getByRole("button", { name: `${f.users[1].nickname} 댓글 삭제`, exact: true }).locator("svg")).toBeVisible();
    await expect(viewport).toHaveAttribute("data-more-below", "false");
    for (const { row, nickname, mine } of [
      { row: reply, nickname: f.users[1].nickname, mine: true },
      { row: panel.getByRole("listitem").nth(32), nickname: f.users[0].nickname, mine: false },
    ]) {
      const picker = row.getByRole("button", { name: `${nickname} 댓글 공감 선택`, exact: true });
      await page.getByLabel("순위 보고 한마디").focus();
      await page.getByRole("heading", { name: "클랜 통계", exact: true }).hover();
      await expect(picker).toHaveCSS("opacity", "0");
      await row.hover();
      await expect(picker).toHaveCSS("opacity", "1");
      const bubble = (await row.locator("p").boundingBox())!, button = (await picker.boundingBox())!;
      const time = (await row.locator("time").boundingBox())!;
      if (mine) expect(button.x + button.width).toBeLessThanOrEqual(bubble.x);
      else expect(button.x).toBeGreaterThanOrEqual(bubble.x + bubble.width);
      if (mine) expect(time.x + time.width).toBeLessThanOrEqual(bubble.x);
      else expect(time.x).toBeGreaterThanOrEqual(bubble.x + bubble.width);
      expect(time.y + time.height).toBeCloseTo(bubble.y + bubble.height, 0);
      expect(button.y + button.height).toBeLessThanOrEqual(time.y);
      await expect(row.locator("[data-comment-row] > div > div").first().locator("time")).toHaveCount(0);
      if (mine) {
        const remove = row.getByRole("button", { name: `${nickname} 댓글 삭제`, exact: true });
        const removeBox = (await remove.boundingBox())!;
        expect(removeBox.y).toBeCloseTo(button.y, 0);
        expect(button.x - removeBox.x - removeBox.width).toBeGreaterThanOrEqual(0);
        expect(button.x - removeBox.x - removeBox.width).toBeLessThanOrEqual(8);
      }
      await picker.click();
      await page.getByRole("heading", { name: "클랜 통계", exact: true }).hover();
      await expect(picker).toHaveCSS("opacity", "1");
      await page.keyboard.press("Escape");
      await expect(picker).toBeFocused();
      await expect(picker).toHaveCSS("opacity", "1");
    }
    await reply.hover();
    await page.screenshot({ path: test.info().outputPath("hof-comment-hover.png"), animations: "disabled" });
    await reply.getByRole("button", { name: `${f.users[1].nickname} 댓글 공감 선택`, exact: true }).click();
    await page.getByRole("button", { name: "하트 공감", exact: true }).click();
    await expect(reply.getByRole("button", { name: "하트 공감 1명", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel("순위 보고 한마디").focus();
    await page.getByRole("heading", { name: "클랜 통계", exact: true }).hover();
    const replyPicker = reply.getByRole("button", { name: `${f.users[1].nickname} 댓글 공감 선택`, exact: true });
    const replyDelete = reply.getByRole("button", { name: `${f.users[1].nickname} 댓글 삭제`, exact: true });
    await expect(replyPicker).toHaveCSS("opacity", "0");
    await expect(replyDelete).toHaveCSS("opacity", "0");
    await expect(reply.getByRole("button", { name: "하트 공감 1명", exact: true })).toHaveCSS("opacity", "1");
    await page.screenshot({ path: test.info().outputPath("hof-comment-controls-idle.png"), animations: "disabled" });
    await reply.hover();
    await expect(replyPicker).toHaveCSS("opacity", "1");
    await expect(replyDelete).toHaveCSS("opacity", "1");
    await replyPicker.click();
    await page.getByRole("heading", { name: "클랜 통계", exact: true }).hover();
    await expect(replyPicker).toHaveCSS("opacity", "1");
    await expect(replyDelete).toHaveCSS("opacity", "1");
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(panel.getByText(content, { exact: true })).toBeVisible();
    await expect(panel.getByRole("listitem").last()).toContainText(content);
    await expect(reply.locator("[data-comment-row]")).toHaveCSS("flex-direction", "row-reverse");
    await expect(reply.getByRole("button", { name: "하트 공감 1명", exact: true })).toHaveAttribute("aria-pressed", "true");
    const commentId = (await ok(f.service.from("clan_hof_comments").select("id").eq("clan_id", f.clanId).eq("content", content).single())).id;
    await ok(f.service.from("clan_hof_comment_reactions").insert({ comment_id: commentId, user_id: f.users[0].id, kind: "heart" }));
    await page.getByRole("button", { name: "반응 새로고침", exact: true }).click();
    const heart = reply.getByRole("button", { name: "하트 공감 2명", exact: true });
    await loginIsolatedBalanceUser(leaderPage, f.users[0]);
    await leaderPage.goto(path);
    const otherReply = leaderPage.getByRole("listitem").filter({ has: leaderPage.getByText(content, { exact: true }) });
    for (const { row, mine } of [{ row: reply, mine: true }, { row: otherReply, mine: false }]) {
      const pill = row.getByRole("button", { name: "하트 공감 2명", exact: true });
      await pill.scrollIntoViewIfNeeded();
      await row.hover();
      const bubble = (await row.locator("p").boundingBox())!, reaction = (await pill.boundingBox())!;
      const picker = (await row.getByRole("button", { name: `${f.users[1].nickname} 댓글 공감 선택`, exact: true }).boundingBox())!;
      const remove = (await row.getByRole("button", { name: `${f.users[1].nickname} 댓글 삭제`, exact: true }).boundingBox())!;
      if (mine) {
        expect(reaction.x + reaction.width).toBeCloseTo(bubble.x + bubble.width, 0);
        expect(picker.x + picker.width).toBeLessThanOrEqual(reaction.x);
        expect(remove.x + remove.width).toBeLessThanOrEqual(picker.x);
      } else {
        expect(reaction.x).toBeCloseTo(bubble.x, 0);
        expect(picker.x).toBeGreaterThanOrEqual(reaction.x + reaction.width);
        expect(remove.x).toBeGreaterThanOrEqual(picker.x + picker.width);
      }
    }
    await reply.hover();
    await page.screenshot({ path: test.info().outputPath("hof-reaction-mirrored.png"), animations: "disabled" });
    const peopleRequest = page.waitForRequest(request => request.headers()["next-action"] !== undefined && !!request.postData()?.includes('"kind":"heart"'));
    await heart.hover();
    const actionRequest = await peopleRequest;
    const people = page.getByRole("tooltip");
    await expect(people.getByRole("listitem")).toHaveText([f.users[0].nickname, f.users[1].nickname].sort((a, b) => a.localeCompare(b, "ko")));
    const [thread, target, selector] = JSON.parse(actionRequest.postData()!);
    const actionHeaders = { "next-action": actionRequest.headers()["next-action"], "content-type": actionRequest.headers()["content-type"], origin: new URL(page.url()).origin };
    for (const args of [
      [{ ...thread, periodKey: "1998" }, target, selector],
      [thread, target, { kind: "invalid" }],
      [thread, target, { ...selector, emojiId: target }],
    ]) {
      const denied = await page.request.post(path, { headers: actionHeaders, data: JSON.stringify(args) });
      expect(await denied.text()).toContain('"ok":false');
    }
    const anonContext = await browser.newContext();
    try {
      const denied = await anonContext.request.post(new URL(path, page.url()).href, { headers: actionHeaders, data: actionRequest.postData()!, maxRedirects: 0 });
      expect(denied.status()).toBe(307);
      expect(denied.headers().location).toContain("/sign-in?next=");
    } finally { await anonContext.close(); }
    await ok(f.service.from("clan_settings").update({ hof_config: { eligibility_below_pct: 100, win_rate_visible_top: 0 } }).eq("clan_id", f.clanId));
    const hidden = await page.request.post(path, { headers: actionHeaders, data: actionRequest.postData()! });
    expect(await hidden.text()).toContain('"ok":false');
    await ok(f.service.from("clan_settings").update({ hof_config: { eligibility_below_pct: 100 } }).eq("clan_id", f.clanId));
    await page.getByLabel("순위 보고 한마디").focus();
    await page.getByRole("heading", { name: "클랜 통계", exact: true }).hover();
    const failPeople = async (route: import("@playwright/test").Route) => {
      if (route.request().headers()["next-action"] === actionHeaders["next-action"]) await route.abort();
      else await route.continue();
    };
    await page.route("**/stats", failPeople);
    await heart.hover();
    await expect(people).toContainText("공감한 멤버를 불러오지 못했습니다.");
    await page.unroute("**/stats", failPeople);
    await page.getByRole("heading", { name: "클랜 통계", exact: true }).hover();
    await reply.getByRole("button", { name: `${f.users[1].nickname} 댓글 공감 선택`, exact: true }).focus();
    await page.keyboard.press("Shift+Tab");
    await expect(heart).toBeFocused();
    await expect(people.getByRole("listitem")).toHaveCount(2);
    await page.screenshot({ path: test.info().outputPath("hof-reaction-people.png"), animations: "disabled" });
    await heart.click();
    await expect(reply.getByRole("button", { name: "하트 공감 1명", exact: true })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("heading", { name: "클랜 통계", exact: true }).hover();
    await expect(replyPicker).toHaveCSS("opacity", "0");
    await expect(replyDelete).toHaveCSS("opacity", "0");
    await reply.getByRole("button", { name: "하트 공감 1명", exact: true }).hover();
    await expect(people.getByRole("listitem")).toHaveText([f.users[0].nickname]);
    await ok(f.service.from("clan_hof_comment_reactions").delete().eq("comment_id", commentId).eq("user_id", f.users[0].id));
    await page.getByRole("button", { name: "반응 새로고침", exact: true }).click();
    await expect(reply.getByRole("button", { name: "하트 공감 1명", exact: true })).toHaveCount(0);
    await page.getByRole("radio", { name: "최다 참여", exact: true }).click();
    await expect(page.getByLabel("전체 기간 · 최다 참여 반응", { exact: true })).toBeVisible();
    await expect(page.getByText(content, { exact: true })).toHaveCount(0);
    await page.getByRole("radio", { name: "승률", exact: true }).click();
    await page.getByRole("radio", { name: "월별", exact: true }).click();
    await expect(page.getByText(content, { exact: true })).toHaveCount(0);
    const monthly = "이번 달 순위 응원";
    await page.getByLabel("순위 보고 한마디").fill(monthly);
    await page.getByRole("button", { name: "댓글 등록", exact: true }).click();
    await expect(page.getByText(monthly, { exact: true })).toBeVisible();
    await page.getByText(monthly, { exact: true }).hover();
    const monthlyDelete = page.getByRole("button", { name: `${f.users[1].nickname} 댓글 삭제`, exact: true });
    const deleteBox = (await monthlyDelete.boundingBox())!;
    await page.mouse.move(deleteBox.x + deleteBox.width / 2, deleteBox.y + deleteBox.height / 2);
    await expect(monthlyDelete).toHaveCSS("opacity", "1");
    await monthlyDelete.click();
    await page.getByRole("button", { name: "삭제 확인", exact: true }).click();
    await expect(page.getByText(monthly, { exact: true })).toHaveCount(0);
    await page.getByRole("radio", { name: "전체", exact: true }).click();
    await expect(panel.getByText(content, { exact: true })).toBeVisible();
    const touchContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      storageState: await page.context().storageState(),
    });
    try {
      const touchPage = await touchContext.newPage();
      await touchPage.goto(path);
      const touchReply = touchPage.getByRole("listitem").filter({ has: touchPage.getByText(content, { exact: true }) });
      const touchPicker = touchReply.getByRole("button", { name: `${f.users[1].nickname} 댓글 공감 선택`, exact: true });
      await expect(touchPicker).toHaveCSS("opacity", "1");
      await touchPicker.tap();
      await expect(touchPage.getByRole("dialog", { name: "공감 선택", exact: true })).toBeVisible();
      expect(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { await touchContext.close(); }
    await leaderPage.goto(path);
    await expect(leaderPage.getByText(content, { exact: true })).toBeVisible();
    const staffComments = leaderPage.getByLabel("전체 기간 · 승률 반응", { exact: true }).getByRole("listitem");
    await expect(staffComments.last().locator("[data-comment-row]")).toHaveCSS("flex-direction", "row");
    await expect(staffComments.first().locator("[data-comment-row]")).toHaveCSS("flex-direction", "row-reverse");
    await expect(leaderPage.getByRole("button", { name: "클랜 통계 도움말", exact: true })).toHaveCount(0);
    await expect(leaderPage.getByRole("button", { name: "명예의 전당 도움말", exact: true })).toHaveCount(0);
    const rankCard = leaderPage.getByLabel("승률 순위", { exact: true });
    await expect(rankCard.getByRole("heading").locator("svg")).toBeVisible();
    const talkCard = leaderPage.getByLabel("전체 기간 · 승률 반응", { exact: true });
    const [rankBox, talkBox] = await Promise.all([rankCard.boundingBox(), talkCard.boundingBox()]);
    expect(rankBox?.height).toBe(talkBox?.height);
    await expect(rankCard.getByText(/규정 미달 ·/)).toHaveCount(1);
    await expect(rankCard.getByText("--순위 제외", { exact: true })).toHaveCount(1);
    const rankRows = rankCard.getByRole("listitem");
    await expect(rankRows.nth(0)).toContainText(f.users[1].nickname);
    await expect(rankRows.nth(0)).toContainText("100.0%");
    await expect(rankRows.nth(1)).toContainText(f.users[0].nickname);
    await expect(rankRows.nth(1)).toContainText("01");
    await expect(page.getByText(/규정 미달 ·/)).toHaveCount(0);
    await leaderPage.getByRole("button", { name: "명예의 전당 설정", exact: true }).click();
    const settings = leaderPage.getByRole("dialog", { name: "명예의 전당 설정" });
    await expect(settings.getByRole("heading", { name: "프로필 공개", exact: true })).toBeVisible();
    await settings.getByRole("tab", { name: "순위 공개", exact: true }).click();
    for (const name of ["순위 공개 범위", "공개 시점"]) await expect(settings.getByRole("heading", { name, exact: true })).toBeVisible();
    await settings.getByRole("tab", { name: "등재 기준", exact: true }).click();
    await expect(settings.getByRole("spinbutton", { name: "기준 전환점", exact: true })).toBeVisible();
    await settings.getByRole("button", { name: "취소", exact: true }).click();
    await staffComments.last().hover();
    await leaderPage.getByRole("button", { name: `${f.users[1].nickname} 댓글 삭제`, exact: true }).click();
    await leaderPage.getByRole("button", { name: "삭제 확인", exact: true }).click();
    await expect(leaderPage.getByText(content, { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "반응 새로고침", exact: true }).click();
    await expect(page.getByText(content, { exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByLabel("순위 보고 한마디")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    try { await leaderContext.close(); } finally { await f.cleanup(); }
  }
});
