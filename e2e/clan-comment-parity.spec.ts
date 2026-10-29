import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { emojiToken } from "../src/lib/clan/emoji-text";

test("board and stats comments share basic and custom emoji behavior", async ({ page, context }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2), svc = f.service;
  const postId = randomUUID(), boardId = randomUUID(), hofId = randomUUID(), emojiId = randomUUID();
  const base = f.path.replace(/\/balance$/, ""), content = "같은 조건의 댓글입니다.";
  const imagePath = `${f.clanId}/${emojiId}/${randomUUID()}.webp`;
  try {
    expect((await svc.from("clan_board_posts").insert({ id: postId, clan_id: f.clanId, author_id: f.users[0].id, kind: "free", title: "댓글 비교", content })).error).toBeNull();
    expect((await svc.from("clan_board_comments").insert({ id: boardId, post_id: postId, author_id: f.users[0].id, content, created_at: "2026-10-28T15:04:00Z" })).error).toBeNull();
    expect((await svc.from("clan_hof_comments").insert({ id: hofId, clan_id: f.clanId, author_id: f.users[0].id, ranking: "rate", period_key: "all", content, created_at: "2026-10-28T15:04:00Z" })).error).toBeNull();
    expect((await svc.from("clan_board_comments").insert({ post_id: postId, author_id: f.users[1].id, content: "상대 댓글입니다.", created_at: "2026-10-28T15:05:00Z" })).error).toBeNull();
    expect((await svc.from("clan_hof_comments").insert({ clan_id: f.clanId, author_id: f.users[1].id, ranking: "rate", period_key: "all", content: "상대 댓글입니다.", created_at: "2026-10-28T15:05:00Z" })).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.setViewportSize({ width: 1015, height: 884 });
    const board = await context.newPage();
    await board.setViewportSize({ width: 1015, height: 884 });
    await board.goto(`${base}/board/free/${postId}`);
    await page.goto(`${base}/stats?tab=hof`);
    const boardComments = board.locator("#comments"), statsComments = page.getByLabel("전체 기간 · 승률 반응", { exact: true });
    const boardRow = boardComments.getByRole("listitem").filter({ hasText: content });
    const statsRow = statsComments.getByRole("listitem").filter({ hasText: content });
    const surfaces = [
      { page: board, scope: boardComments, own: boardRow, name: "board", input: "댓글 내용", composerPicker: "댓글 내용 이모티콘 선택" },
      { page, scope: statsComments, own: statsRow, name: "stats", input: "순위 보고 한마디", composerPicker: "댓글 이모티콘 선택" },
    ];
    // A clan with no purchased image slots must still have all six basic reactions.
    for (const surface of surfaces) {
      const { page: current, own } = surface;
      const picker = own.getByRole("button", { name: `${f.users[0].nickname} 댓글 공감 선택`, exact: true });
      await expect(own).toBeVisible();
      await expect(own.locator("time")).toHaveText("오전 12:04");
      await own.hover();await picker.click();
      for (const label of ["좋아요", "하트", "웃음", "박수", "놀람", "슬픔"]) await expect(current.getByRole("button", { name: `${label} 공감`, exact: true })).toBeVisible();
      await current.getByRole("button", { name: "좋아요 공감", exact: true }).click();
      await expect(own.getByRole("button", { name: "좋아요 공감 1명", exact: true })).toHaveAttribute("aria-pressed", "true");
      await own.getByRole("button", { name: "좋아요 공감 1명", exact: true }).hover();
      await expect(current.locator('[role="tooltip"][data-open]').getByRole("listitem")).toHaveText([f.users[0].nickname]);
      await current.reload();await expect(own).toBeVisible();await own.hover();await picker.click();
      await current.getByRole("button", { name: "하트 공감", exact: true }).click();
      await expect(own.getByRole("button", { name: "하트 공감 1명", exact: true })).toBeVisible();
      await expect(own.getByRole("button", { name: /좋아요 공감 \d+명/ })).toHaveCount(0);
      await own.getByRole("button", { name: "하트 공감 1명", exact: true }).click();
      await expect(own.getByRole("button", { name: /하트 공감 \d+명/ })).toHaveCount(0);
      await own.hover();await picker.click();await current.getByRole("button", { name: "좋아요 공감", exact: true }).click();
      await expect(own.getByRole("button", { name: "좋아요 공감 1명", exact: true })).toBeVisible();
    }
    expect((await svc.from("clans").update({ coin_balance: 1000 }).eq("id", f.clanId)).error).toBeNull();
    const pack = await svc.from("store_items").select("slug").like("slug", "clan_emoji_slots_%").eq("is_active", true).order("slug").limit(1).single();
    expect(pack.error).toBeNull();
    expect((await svc.rpc("apply_store_purchase", { p_actor_id: f.users[0].id, p_context_clan_id: f.clanId, p_item_slug: pack.data!.slug, p_checkout_id: randomUUID() })).data).toMatchObject({ ok: true });
    const image = await sharp({ create: { width: 128, height: 128, channels: 4, background: "#50b887" } }).webp().toBuffer();
    expect((await svc.storage.from("clan-emojis").upload(imagePath, image, { contentType: "image/webp" })).error).toBeNull();
    const added = await svc.rpc("add_clan_emoji", { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_id: emojiId, p_name: "응원", p_image_path: imagePath });
    expect(added.error).toBeNull();expect(added.data).toMatchObject({ ok: true });
    for (const surface of surfaces) {
      const { page: current, scope, own } = surface;
      await current.reload();await expect(own).toBeVisible();
      const input = scope.getByRole("textbox", { name: surface.input, exact: true });
      await input.fill("이모티콘 확인 ");
      await scope.getByRole("button", { name: surface.composerPicker, exact: true }).click();
      await current.getByRole("button", { name: "응원 이모티콘", exact: true }).click();
      await expect(input.locator("img")).toHaveCount(1);
      await scope.getByRole("button", { name: surface.composerPicker, exact: true }).click();
      await current.getByRole("button", { name: "기본", exact: true }).click();
      await current.getByRole("button", { name: "박수 이모티콘", exact: true }).click();
      await scope.getByRole("button", { name: "댓글 등록", exact: true }).click();
      const composed = scope.getByRole("listitem").filter({ hasText: "이모티콘 확인" });
      await expect(composed.getByRole("img", { name: ":응원:", exact: true })).toBeVisible();
      await expect(composed.locator("p")).toContainText("👏");
      await expect.poll(() => composed.getByRole("img", { name: ":응원:", exact: true }).evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      const saved = surface.name === "board"
        ? await svc.from("clan_board_comments").select("content").eq("post_id", postId).like("content", "이모티콘 확인%")
        : await svc.from("clan_hof_comments").select("content").eq("clan_id", f.clanId).like("content", "이모티콘 확인%");
      expect(saved.error).toBeNull();expect(saved.data).toEqual([{ content: `이모티콘 확인 ${emojiToken(emojiId)}👏` }]);
      await own.hover();await own.getByRole("button", { name: /댓글 공감 선택$/ }).click();
      await current.getByRole("button", { name: "응원 이모티콘", exact: true }).click();
      const custom = own.getByRole("button", { name: "응원 공감 1명", exact: true });
      await expect(custom).toHaveAttribute("aria-pressed", "true");
      await current.reload();await expect(custom).toBeVisible();
      await custom.hover();await expect(current.locator('[role="tooltip"][data-open]').getByRole("listitem")).toHaveText([f.users[0].nickname]);
      await input.focus();await current.mouse.move(5, 5);
      await expect(own.getByRole("button", { name: /댓글 공감 선택$/ })).toHaveCSS("opacity", "0");
      await expect(custom).toHaveCSS("opacity", "1");
      await own.hover();
      const [basicBox, customBox, pickerBox] = await Promise.all([
        own.getByRole("button", { name: "좋아요 공감 1명", exact: true }).boundingBox(), custom.boundingBox(), own.getByRole("button", { name: /댓글 공감 선택$/ }).boundingBox(),
      ]);
      expect(customBox!.height).toBe(basicBox!.height);expect(customBox!.y).toBe(basicBox!.y);
      expect(customBox!.x + customBox!.width).toBeLessThanOrEqual(basicBox!.x);
      expect(pickerBox!.x + pickerBox!.width).toBeLessThanOrEqual(customBox!.x);
      await current.screenshot({ path: test.info().outputPath(`${surface.name}-desktop.png`), animations: "disabled" });
      await current.setViewportSize({ width: 390, height: 844 });
      const peer = scope.getByRole("listitem").filter({ hasText: "상대 댓글입니다." });
      await peer.hover();const peerBubble = (await peer.locator("p").boundingBox())!, peerPicker = (await peer.getByRole("button", { name: /댓글 공감 선택$/ }).boundingBox())!;
      expect(peerPicker.x).toBeGreaterThanOrEqual(peerBubble.x + peerBubble.width);
      expect(await current.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await current.screenshot({ path: test.info().outputPath(`${surface.name}-mobile.png`), animations: "disabled" });
      await current.setViewportSize({ width: 1015, height: 884 });
      await custom.click();await expect(custom).toHaveCount(0);
    }
  } finally {
    try { await svc.storage.from("clan-emojis").remove([imagePath]);await svc.from("purchases").delete().eq("clan_id", f.clanId); }
    finally { await f.cleanup(); }
  }
});
