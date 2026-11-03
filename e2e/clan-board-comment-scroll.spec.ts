import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("board comments open in the hall-of-fame drawer and allow replies", async ({ page }) => {
  test.setTimeout(120_000); page.setDefaultTimeout(12_000);
  const f = await createIsolatedBalanceFixture(1), postId = randomUUID();
  const base = f.path.replace(/\/balance$/, "");
  const comments = Array.from({ length: 20 }, (_, index) => ({
    post_id: postId, author_id: f.users[0].id, content: `대화 기록 ${index + 1}`,
    created_at: new Date(Date.UTC(2026, 9, 28, 9, index)).toISOString(),
  }));
  try {
    expect((await f.service.from("clan_board_posts").insert({ id: postId, clan_id: f.clanId, author_id: f.users[0].id, kind: "free", title: "댓글 스크롤", content: "긴 대화도 같은 영역에서 읽습니다." })).error).toBeNull();
    expect((await f.service.from("clan_board_comments").insert(comments.slice(0, 2))).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.setViewportSize({ width: 914, height: 884 });
    await page.goto(`${base}/board/free/${postId}`);
    const tab = page.getByRole("button", {name:"댓글 2",exact:true});
    const bounds = await tab.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y + bounds!.height / 2).toBeCloseTo(884 / 2, 0);
    expect(914 - bounds!.x - bounds!.width).toBeCloseTo(12, 0);
    const article = page.locator(".board-article > article");
    const before = await article.boundingBox();
    await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
    const section = page.getByRole("dialog");
    const viewport = section.getByRole("region", { name: "게시글 댓글 목록", exact: true });
    const input = section.getByRole("textbox", { name: "댓글 내용", exact: true });
    await expect(viewport.getByRole("listitem")).toHaveCount(2);
    expect((await article.boundingBox())!.width).toBe(before!.width);
    expect((await section.boundingBox())!.x).toBeLessThan(before!.x + before!.width);
    await expect(section.getByRole("button",{name:"댓글 새로고침"})).toBeVisible();
    await expect(section).toHaveCSS("position","fixed");
    await expect(section).toHaveCSS("width", "440px");
    const short = await viewport.evaluate(el => ({ height: el.clientHeight, content: el.scrollHeight }));
    expect(short.content - short.height).toBeLessThanOrEqual(1);


    expect((await f.service.from("clan_board_comments").insert(comments.slice(2))).error).toBeNull();
    await page.reload();
    await expect(viewport.getByRole("listitem")).toHaveCount(20);
    for (const [index, width] of [914, 390].entries()) {
      await page.setViewportSize({ width, height: 844 });
      expect(await viewport.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
      await viewport.hover(); await page.mouse.wheel(0,350);
      await expect.poll(()=>viewport.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
      await viewport.getByRole("listitem").last().scrollIntoViewIfNeeded();
      const content = `새 댓글 ${width}`;
      await input.fill(content);
      const submit = section.getByRole("button", { name: "댓글 등록", exact: true });
      await submit.scrollIntoViewIfNeeded();

      await submit.click();
      await expect(input).toBeEmpty();
      await expect(viewport.getByRole("listitem")).toHaveCount(21 + index);
      await viewport.getByText(content,{exact:true}).scrollIntoViewIfNeeded();
      await expect(viewport.getByText(content, { exact: true })).toBeInViewport();
      expect(await input.evaluate(el => el.closest('[aria-label="게시글 댓글 목록"]'))).toBeNull();
      await page.screenshot({ path: test.info().outputPath(`board-comment-scroll-${width}.png`), animations: "disabled" });
    }
  } finally { await f.cleanup(); }
});
