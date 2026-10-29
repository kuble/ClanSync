import { randomUUID } from "node:crypto";
import { expect, test, type Locator } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

async function viewportGeometry(body: Locator) {
  return body.evaluate(el => {
    const main = document.getElementById("main-content")!, mainBox = main.getBoundingClientRect(), box = el.getBoundingClientRect();
    return { bottom: box.bottom, availableBottom: mainBox.bottom - parseFloat(getComputedStyle(main).paddingBottom), height: box.height, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, documentHeight: document.documentElement.scrollHeight, viewportHeight: innerHeight, windowTop: scrollY, horizontal: document.documentElement.scrollWidth > innerWidth };
  });
}

test("board content fills the available viewport and scrolls the final notice fully into view", async ({ page }) => {
  test.setTimeout(150_000); page.setDefaultTimeout(15_000);
  const f = await createIsolatedBalanceFixture(1), svc = f.service, base = f.path.replace(/\/balance$/, ""), postId = randomUUID();
  try {
    expect((await svc.from("clans").update({ rules: Array.from({ length: 5 }, (_, i) => `규칙 ${i + 1}. 서로 존중하고 즐겁게 참여합니다.`).join("\n") }).eq("id", f.clanId)).error).toBeNull();
    const notices = Array.from({ length: 9 }, (_, i) => ({ id: randomUUID(), clan_id: f.clanId, created_by: f.users[0].id, title: `공지 ${i + 1}`, content: "공지 내용", created_at: new Date(Date.now() - i * 60_000).toISOString() }));
    expect((await svc.from("clan_notices").insert(notices)).error).toBeNull();
    expect((await svc.from("clan_board_posts").insert({ id: postId, clan_id: f.clanId, author_id: f.users[0].id, kind: "free", title: "높이 확인", content: "긴 본문\n".repeat(150) })).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]); await page.goto(base + "/board/notices");
    const body = page.getByRole("region", { name: "게시판 내용", exact: true }), panel = page.locator("#notices");
    await expect(panel.getByRole("link", { name: "공지 9", exact: true })).toBeVisible();
    await expect(page.getByRole("list", { name: "클랜 규칙 목록", exact: true }).getByRole("listitem")).toHaveCount(5);
    for (const [width, height] of [[1142, 1004], [957, 700], [533, 1004], [390, 640], [740, 360]]) {
      await page.setViewportSize({ width, height });
      await expect.poll(async () => { const g = await viewportGeometry(body); return Math.abs(g.bottom - g.availableBottom); }).toBeLessThan(2);
      const geometry = await viewportGeometry(body);
      expect(geometry.height).toBeGreaterThan(100); expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
      await expect.poll(async()=>(await viewportGeometry(body)).documentHeight).toBeLessThanOrEqual(height + 1);
      expect(geometry.windowTop).toBe(0); expect(geometry.horizontal).toBe(false);
      await body.evaluate(el => { el.scrollTop = 0; }); await body.focus(); await page.keyboard.press("Control+End");
      await expect(panel.getByRole("link", { name: "공지 9", exact: true })).toBeInViewport();
      await expect.poll(async () => { const b = (await body.boundingBox())!, p = (await panel.boundingBox())!; return b.y + b.height - p.y - p.height; }).toBeGreaterThanOrEqual(11);
      expect(await body.evaluate(el => Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop))).toBeLessThan(2);
      await page.screenshot({ path: test.info().outputPath(`notice-bottom-${width}-${height}.png`), animations: "disabled" });
    }
    await page.setViewportSize({ width: 1142, height: 1004 });
    for (const route of ["free", "feedback", "channels", "memories", `free/${postId}`]) {
      await page.goto(`${base}/board/${route}`);
      if (route.includes("/")) await expect(page.getByRole("heading", { name: "높이 확인", exact: true })).toBeVisible();
      else await expect(page.getByRole("region", { name: { free: "자유 게시판", feedback: "피드백 신청 게시판", channels: "방송 채널 홍보방", memories: "추억 열람방" }[route], exact: true })).toBeVisible();
      const g = await viewportGeometry(body);
      expect(Math.abs(g.bottom - g.availableBottom)).toBeLessThan(2); expect(g.documentHeight).toBeLessThanOrEqual(1005);
      expect(g.horizontal).toBe(false);
    }
    await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect(page.getByRole("button", { name: "댓글 등록", exact: true })).toBeInViewport();
    await page.goto(base); expect(await page.locator("#main-content").evaluate(el => getComputedStyle(el).overflowY)).toBe("visible");
  } finally { await f.cleanup(); }
});
