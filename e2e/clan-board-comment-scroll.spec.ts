import { randomUUID } from "node:crypto";
import { expect, test, type Locator } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

async function outerScroll(section: Locator) {
  return section.evaluate(root => {
    const ancestors = [];
    for (let element = root.parentElement; element; element = element.parentElement) {
      if (/^(auto|scroll)$/.test(getComputedStyle(element).overflowY)) {
        ancestors.push({ top: element.scrollTop, height: element.scrollHeight });
      }
    }
    return { height: root.getBoundingClientRect().height, ancestors, windowTop: window.scrollY };
  });
}

test("board comments grow to a hidden-scrollbar viewport and new replies keep the outer page stable", async ({ page }) => {
  test.setTimeout(120_000);
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
    await page.setViewportSize({ width: 1015, height: 884 });
    await page.goto(`${base}/board/free/${postId}`);
    const section = page.getByRole("region", { name: "게시글 댓글", exact: true });
    const viewport = section.getByRole("region", { name: "게시글 댓글 목록", exact: true });
    const input = section.getByRole("textbox", { name: "댓글 내용", exact: true });
    await expect(viewport.getByRole("listitem")).toHaveCount(2);
    const short = await viewport.evaluate(el => ({ height: el.clientHeight, content: el.scrollHeight }));
    expect(short.content - short.height).toBeLessThanOrEqual(1);
    expect((await viewport.boundingBox())!.height).toBeLessThan(300);

    expect((await f.service.from("clan_board_comments").insert(comments.slice(2))).error).toBeNull();
    await page.reload();
    await expect(viewport.getByRole("listitem")).toHaveCount(20);
    for (const [index, width] of [1015, 390].entries()) {
      await page.setViewportSize({ width, height: 844 });
      const dimensions = await viewport.evaluate(el => ({ height: el.clientHeight, content: el.scrollHeight, scrollbar: getComputedStyle(el).scrollbarWidth, webkitScrollbar: getComputedStyle(el, "::-webkit-scrollbar").display }));
      expect(dimensions.height).toBeLessThanOrEqual(422);
      expect(dimensions.content).toBeGreaterThan(dimensions.height);
      expect(dimensions.scrollbar).toBe("none");
      expect(dimensions.webkitScrollbar).toBe("none");
      await viewport.evaluate(el => { el.scrollTop = 0; });
      await viewport.hover();
      const beforeWheel = await outerScroll(section);
      await page.mouse.wheel(0, 250);
      await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
      expect((await outerScroll(section)).ancestors).toEqual(beforeWheel.ancestors);
      await viewport.evaluate(el => { el.scrollTop = el.scrollHeight; });
      const atEnd = await outerScroll(section);
      await page.mouse.wheel(0, 250);
      await expect(viewport).toHaveAttribute("data-more-below", "false");
      expect((await outerScroll(section)).ancestors).toEqual(atEnd.ancestors);

      const content = `새 댓글 ${width}`;
      await input.fill(content);
      const submit = section.getByRole("button", { name: "댓글 등록", exact: true });
      await submit.scrollIntoViewIfNeeded();
      const beforeSubmit = await outerScroll(section);
      await submit.click();
      await expect(input).toBeEmpty();
      await expect(viewport.getByRole("listitem")).toHaveCount(21 + index);
      const afterSubmit = await outerScroll(section);
      expect(afterSubmit.height).toBeCloseTo(beforeSubmit.height, 0);
      expect(afterSubmit.ancestors).toEqual(beforeSubmit.ancestors);
      expect(afterSubmit.windowTop).toBe(beforeSubmit.windowTop);
      expect(await viewport.evaluate(el => el.scrollHeight)).toBeGreaterThan(dimensions.content);
      await viewport.evaluate(el => { el.scrollTop = el.scrollHeight; });
      await expect(viewport.getByText(content, { exact: true })).toBeInViewport();
      expect(await input.evaluate(el => el.closest('[aria-label="게시글 댓글 목록"]'))).toBeNull();
      await page.screenshot({ path: test.info().outputPath(`board-comment-scroll-${width}.png`), animations: "disabled" });
    }
  } finally { await f.cleanup(); }
});
