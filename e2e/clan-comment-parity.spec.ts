import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { expect, test, type Locator } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { emojiToken } from "../src/lib/clan/emoji-text";

async function readableConversation(row: Locator) {
  const result = await row.evaluate(root => {
    const body = getComputedStyle(root.querySelector("p")!);
    const author = getComputedStyle(root.querySelector("strong")!);
    const time = getComputedStyle(root.querySelector("time")!);
    const card = getComputedStyle(root).getPropertyValue("--card").trim();
    const canvas = document.createElement("canvas");canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    function luminance(color: string) {
      ctx.fillStyle = color;ctx.fillRect(0, 0, 1, 1);
      const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
      return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
    }
    function contrast(a: string, b: string) { const values = [luminance(a), luminance(b)].sort((x, y) => y - x);return (values[0] + .05) / (values[1] + .05); }
    return { bodySize: parseFloat(body.fontSize), authorSize: parseFloat(author.fontSize), timeSize: parseFloat(time.fontSize), leading: parseFloat(body.lineHeight) / parseFloat(body.fontSize), bodyContrast: contrast(body.color, body.backgroundColor), authorContrast: contrast(author.color, card), timeContrast: contrast(time.color, card) };
  });
  expect(result.bodySize).toBeGreaterThan(result.authorSize);
  expect(result.bodySize).toBeGreaterThan(result.timeSize);
  expect(result.leading).toBeGreaterThanOrEqual(1.5);
  expect(result.bodyContrast).toBeGreaterThanOrEqual(7);
  expect(result.authorContrast).toBeGreaterThanOrEqual(4.5);
  expect(result.timeContrast).toBeGreaterThanOrEqual(4.5);
}

test("board and stats comments share basic and custom emoji behavior", async ({ page, context }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2), svc = f.service;
  const postId = randomUUID(), boardId = randomUUID(), hofId = randomUUID(), emojiId = randomUUID();
  const base = f.path.replace(/\/balance$/, ""), content = "상대가 들어오기 전에 위치를 먼저 잡아보십시오.\n방벽 뒤에서 시야를 확보하면 다음 교전에 대응하기 쉬워요.";
  const peerContent = "말씀하신 위치에서 다시 해볼게요. 궁극기는 다음 교전에 쓰면 될까요?";
  const imagePath = `${f.clanId}/${emojiId}/${randomUUID()}.webp`;
  try {
    expect((await svc.from("clan_board_posts").insert({ id: postId, clan_id: f.clanId, author_id: f.users[0].id, kind: "free", title: "댓글 비교", content })).error).toBeNull();
    expect((await svc.from("clan_board_comments").insert({ id: boardId, post_id: postId, author_id: f.users[0].id, content, created_at: "2026-10-28T15:04:00Z" })).error).toBeNull();
    expect((await svc.from("clan_hof_comments").insert({ id: hofId, clan_id: f.clanId, author_id: f.users[0].id, ranking: "rate", period_key: "all", content, created_at: "2026-10-28T15:04:00Z" })).error).toBeNull();
    expect((await svc.from("clan_board_comments").insert({ post_id: postId, author_id: f.users[1].id, content: peerContent, created_at: "2026-10-28T15:05:00Z" })).error).toBeNull();
    expect((await svc.from("clan_hof_comments").insert({ clan_id: f.clanId, author_id: f.users[1].id, ranking: "rate", period_key: "all", content: peerContent, created_at: "2026-10-28T15:05:00Z" })).error).toBeNull();
    await context.addInitScript(() => localStorage.setItem("clansync-theme", "dark"));
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
      await expect(surface.scope.getByRole("button", { name: /댓글 편집$/ })).toHaveCount(0);
      await expect(surface.scope.getByRole("button", { name: "댓글 수정", exact: true })).toHaveCount(0);
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
      const peer = scope.getByRole("listitem").filter({ hasText: peerContent });
      await peer.hover();const peerBubble = (await peer.locator("p").boundingBox())!, peerPicker = (await peer.getByRole("button", { name: /댓글 공감 선택$/ }).boundingBox())!;
      expect(peerPicker.x).toBeGreaterThanOrEqual(peerBubble.x + peerBubble.width);
      expect(await current.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await current.screenshot({ path: test.info().outputPath(`${surface.name}-mobile.png`), animations: "disabled" });
      for (const row of [own, peer]) await readableConversation(row);
      await current.getByRole("button", { name: "라이트 테마", exact: true }).click();
      await expect(current.locator("html")).toHaveClass(/\blight\b/);
      for (const row of [own, peer]) await readableConversation(row);
      await peer.hover();
      await current.screenshot({ path: test.info().outputPath(`${surface.name}-light-mobile.png`), animations: "disabled" });
      await current.setViewportSize({ width: 1015, height: 884 });
      await own.hover();
      await current.screenshot({ path: test.info().outputPath(`${surface.name}-light-desktop.png`), animations: "disabled" });
      await custom.click();await expect(custom).toHaveCount(0);
    }
  } finally {
    try { await svc.storage.from("clan-emojis").remove([imagePath]);await svc.from("purchases").delete().eq("clan_id", f.clanId); }
    finally { await f.cleanup(); }
  }
});

test("comment groups share identity until the author or KST day changes", async ({ page, context }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2), svc = f.service, postId = randomUUID();
  const base = f.path.replace(/\/balance$/, "");
  const messages = [
    { author_id: f.users[0].id, content: "어제 대화를 마무리합니다.", created_at: "2026-10-28T14:59:00Z" },
    { author_id: f.users[0].id, content: "오늘 첫 댓글입니다.", created_at: "2026-10-28T15:00:05Z" },
    { author_id: f.users[0].id, content: "같은 사람이 이어서 남긴 댓글입니다.", created_at: "2026-10-28T15:00:45Z" },
    { author_id: f.users[1].id, content: "다른 멤버가 이야기합니다.", created_at: "2026-10-28T15:00:46Z" },
    { author_id: f.users[1].id, content: "다른 멤버도 연속으로 이야기합니다.", created_at: "2026-10-28T15:00:55Z" },
    { author_id: f.users[0].id, content: "다시 대화에 참여합니다.", created_at: "2026-10-28T15:00:59Z" },
    { author_id: f.users[0].id, content: "분이 바뀌면 시간을 다시 보여요.", created_at: "2026-10-28T15:01:00Z" },
    { author_id: null, content: "연결이 해제된 작성자의 댓글 하나", created_at: "2026-10-28T15:01:10Z" },
    { author_id: null, content: "연결이 해제된 작성자의 댓글 둘", created_at: "2026-10-28T15:01:20Z" },
  ];
  try {
    expect((await svc.from("clan_board_posts").insert({ id: postId, clan_id: f.clanId, author_id: f.users[0].id, kind: "free", title: "연속 댓글", content: "대화를 묶어서 읽습니다." })).error).toBeNull();
    expect((await svc.from("clan_board_comments").insert(messages.map(message => ({ ...message, post_id: postId })))).error).toBeNull();
    expect((await svc.from("clan_hof_comments").insert(messages.map(message => ({ ...message, clan_id: f.clanId, ranking: "rate", period_key: "all" })))).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    const board = await context.newPage();
    await board.goto(`${base}/board/free/${postId}`);await page.goto(`${base}/stats?tab=hof`);
    for (const surface of [{ page: board, scope: board.locator("#comments"), name: "board" }, { page, scope: page.getByLabel("전체 기간 · 승률 반응", { exact: true }), name: "stats" }]) {
      const rows = messages.map(message => surface.scope.getByRole("listitem").filter({ hasText: message.content }));
      await expect(rows[0]).toBeVisible();await expect(surface.scope.getByRole("separator")).toHaveCount(2);
      for (const index of [0, 1, 3, 5, 7, 8]) {
        await expect(rows[index].locator("strong")).toHaveCount(1);
        await expect(rows[index].getByRole("img", { name: /프로필 (사진|심볼)$/ })).toHaveCount(1);
      }
      for (const index of [1, 3]) await expect(rows[index].locator("time")).toHaveCount(0);
      for (const index of [0, 2, 4, 5, 6, 7, 8]) await expect(rows[index].locator("time")).toHaveCount(1);
      await expect(rows[2].locator("time")).toHaveText("오전 12:00");
      await expect(rows[6].locator("time")).toHaveText("오전 12:01");
      for (const index of [2, 4, 6]) {
        await expect(rows[index].locator("strong")).toHaveCount(0);
        await expect(rows[index].getByRole("img", { name: /프로필 (사진|심볼)$/ })).toHaveCount(0);
        await expect(rows[index].locator("time")).toHaveCount(1);
        await rows[index].hover();
        const current = (await rows[index].locator("p").boundingBox())!, previous = (await rows[index - 1].locator("p").boundingBox())!;
        expect(current.y - previous.y - previous.height).toBeGreaterThanOrEqual(4);
        expect(current.y - previous.y - previous.height).toBeLessThanOrEqual(8);
        if (index === 4) expect(current.x).toBeCloseTo(previous.x, 0);
        else expect(current.x + current.width).toBeCloseTo(previous.x + previous.width, 0);
      }
      await rows[2].hover();await rows[2].getByRole("button", { name: /댓글 공감 선택$/ }).click();
      await surface.page.getByRole("button", { name: "좋아요 공감", exact: true }).click();
      await expect(rows[2].getByRole("button", { name: "좋아요 공감 1명", exact: true })).toHaveAttribute("aria-pressed", "true");
      await rows[3].hover();await rows[3].getByRole("button", { name: /댓글 삭제$/ }).click();
      await rows[3].getByRole("button", { name: "삭제 확인", exact: true }).click();
      await expect(rows[3]).toHaveCount(0);
      await expect(rows[4].locator("strong")).toHaveCount(1);
      await expect(rows[4].getByRole("img", { name: /프로필 (사진|심볼)$/ })).toHaveCount(1);
      await rows[4].hover();await rows[4].getByRole("button", { name: /댓글 삭제$/ }).click();
      await rows[4].getByRole("button", { name: "삭제 확인", exact: true }).click();
      await expect(rows[4]).toHaveCount(0);
      await expect(rows[5].locator("strong")).toHaveCount(0);
      await expect(rows[5].getByRole("img", { name: /프로필 (사진|심볼)$/ })).toHaveCount(0);
      await expect(rows[2].locator("time")).toHaveCount(0);
      await expect(rows[5].locator("time")).toHaveCount(1);
      for (const width of [1015, 390]) {
        await surface.page.setViewportSize({ width, height: 884 });await rows[1].hover();
        expect(await surface.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await surface.page.screenshot({ path: test.info().outputPath(`${surface.name}-groups-${width}.png`), animations: "disabled" });
      }
      await rows[5].hover();await rows[5].getByRole("button", { name: /댓글 삭제$/ }).click();
      await rows[5].getByRole("button", { name: "삭제 확인", exact: true }).click();
      await expect(rows[5]).toHaveCount(0);
      await expect(rows[1].locator("time")).toHaveCount(0);
      await expect(rows[2].locator("time")).toHaveText("오전 12:00");
      await expect(rows[6].locator("time")).toHaveText("오전 12:01");
    }
  } finally { await f.cleanup(); }
});
