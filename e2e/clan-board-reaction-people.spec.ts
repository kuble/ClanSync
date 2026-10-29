import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { expect, test, type Route } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const result = await query;
  expect(result.error).toBeNull();
  return result.data!;
}

test("board comment reaction people: scoped names, keyboard, retry and access boundaries", async ({ page, browser }) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(15_000);
  const f = await createIsolatedBalanceFixture(2), svc = f.service;
  const emojiId = randomUUID(), postId = randomUUID(), ownId = randomUUID(), peerId = randomUUID();
  const imagePath = `${f.clanId}/${emojiId}/${randomUUID()}.webp`;
  const path = f.path.replace(/balance$/, `board/free/${postId}`);
  try {
    await ok(svc.from("clans").update({ coin_balance: 1000 }).eq("id", f.clanId));
    expect(await ok(svc.rpc("apply_store_purchase", { p_actor_id: f.users[0].id, p_context_clan_id: f.clanId, p_item_slug: "clan_emoji_slots_3", p_checkout_id: randomUUID() }))).toMatchObject({ ok: true });
    const image = await sharp({ create: { width: 128, height: 128, channels: 4, background: "#50b887" } }).webp().toBuffer();
    expect((await svc.storage.from("clan-emojis").upload(imagePath, image, { contentType: "image/webp" })).error).toBeNull();
    await ok(svc.from("clan_emojis").insert({ id: emojiId, clan_id: f.clanId, name: "응원", image_path: imagePath, slot_index: 1 }));
    await ok(svc.from("clan_board_posts").insert({ id: postId, clan_id: f.clanId, author_id: f.users[0].id, kind: "free", title: "게시판 공감자", content: "댓글별 공감자를 확인합니다." }));
    await ok(svc.from("clan_board_comments").insert([
      { id: ownId, post_id: postId, author_id: f.users[0].id, content: "내 댓글" },
      { id: peerId, post_id: postId, author_id: f.users[1].id, content: "다른 멤버 댓글" },
    ]));
    await ok(svc.from("clan_emoji_reactions").insert([
      { board_comment_id: ownId, emoji_id: emojiId, user_id: f.users[0].id },
      { board_comment_id: ownId, emoji_id: emojiId, user_id: f.users[1].id },
      { board_comment_id: peerId, emoji_id: emojiId, user_id: f.users[0].id },
    ]));
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.setViewportSize({ width: 1015, height: 884 });
    await page.goto(path);
    const own = page.locator("#comments li").filter({ hasText: "내 댓글" });
    const peer = page.locator("#comments li").filter({ hasText: "다른 멤버 댓글" });
    const ownReaction = own.getByRole("button", { name: "응원 공감 2명", exact: true });
    const request = page.waitForRequest(req => req.headers()["next-action"] !== undefined && !!req.postData()?.includes(ownId));
    await ownReaction.hover();
    const call = await request, people = page.locator('[role="tooltip"][data-open]');
    await expect(people.getByRole("listitem")).toHaveText(f.users.map(user => user.nickname).sort((a, b) => a.localeCompare(b, "ko")));
    const args = JSON.parse(call.postData()!), url = page.url();
    const headers = { "next-action": call.headers()["next-action"], "content-type": call.headers()["content-type"], origin: new URL(url).origin };
    // Browser fetch preserves the Secure loopback cookies used by production sessions.
    const replay = (values: unknown[]) => page.evaluate(async ({ url, headers, body }) => {
      const response = await fetch(url, { method: "POST", headers, body, redirect: "manual" });
      return { status: response.status, type: response.type, body: await response.text() };
    }, { url, headers, body: JSON.stringify(values) });
    const allowed = await replay(args);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toContain('"ok":true');
    for (const user of f.users) expect(allowed.body).toContain(user.nickname);
    for (const values of [[args[0], f.gameId, ownId, emojiId], [args[0], f.clanId, postId, emojiId], [args[0], f.clanId, ownId, "invalid"], ["valorant", f.clanId, ownId, emojiId]]) {
      const denied = await replay(values);
      expect(denied.status).toBe(200);
      expect(denied.body).toContain('"ok":false');
    }
    const anon = await browser.newContext();
    try {
      const denied = await anon.request.post(url, { headers, data: call.postData()!, maxRedirects: 0 });
      expect(denied.status()).toBe(307);
      expect(denied.headers().location).toContain("/sign-in?next=");
    } finally { await anon.close(); }
    await peer.getByRole("button", { name: "응원 공감 1명", exact: true }).hover();
    await expect(people.getByRole("listitem")).toHaveText([f.users[0].nickname]);
    const fail = async (route: Route) => {
      if (route.request().headers()["next-action"] === headers["next-action"]) await route.abort();
      else await route.continue();
    };
    await page.route(url, fail);
    await ownReaction.hover();
    await expect(people).toContainText("공감한 멤버를 불러오지 못했습니다.");
    await page.unroute(url, fail);
    await page.getByLabel("댓글 내용", { exact: true }).focus();
    await page.mouse.move(5, 5);
    await own.getByRole("button", { name: `${f.users[0].nickname} 댓글 공감 선택`, exact: true }).focus();
    await page.keyboard.press("Shift+Tab");
    await expect(ownReaction).toBeFocused();
    await expect(people.getByRole("listitem")).toHaveCount(2);
    await page.screenshot({ path: test.info().outputPath("board-comment-reaction-people.png"), animations: "disabled" });
    await ok(svc.from("clan_board_comments").delete().eq("id", ownId));
    const deleted = await replay(args);
    expect(deleted.status).toBe(200);
    expect(deleted.body).toContain('"ok":false');
    await ok(svc.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[0].id));
    const departed = await replay([args[0], f.clanId, peerId, emojiId]);
    expect(departed.type === "opaqueredirect" || departed.status === 403 || (departed.status === 200 && departed.body.includes('"ok":false'))).toBe(true);
  } finally {
    try {
      expect((await svc.storage.from("clan-emojis").remove([imagePath])).error).toBeNull();
      await ok(svc.from("purchases").delete().eq("clan_id", f.clanId));
    } finally { await f.cleanup(); }
  }
});
