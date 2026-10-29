import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { PROFILE_PHOTO_BUCKET } from "../src/lib/profile/photo";

test("article metadata precedes its title and footer actions adapt to desktop and mobile", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2), other = await createIsolatedBalanceFixture(1);
  const base = f.path.replace(/\/balance$/, ""), ids = [randomUUID(), randomUUID(), randomUUID()].sort();
  const imagePath = `${f.users[0].id}/${randomUUID()}.webp`;
  try {
    const image = await sharp({ create: { width: 64, height: 64, channels: 4, background: "#31875f" } }).webp().toBuffer();
    expect((await f.service.storage.from(PROFILE_PHOTO_BUCKET).upload(imagePath, image, { contentType: "image/webp" })).error).toBeNull();
    expect((await f.service.from("account_profile_photos").upsert({ user_id: f.users[0].id, image_path: imagePath })).error).toBeNull();
    expect((await f.service.from("clan_board_posts").insert(ids.map((id, index) => ({ id, clan_id: f.clanId, author_id: f.users[0].id, kind: "free" as const, title: `동일 시각 게시글 ${index}`, content: "게시글 이동 검증", created_at: "2026-10-28T10:00:00Z" })))).error).toBeNull();
    expect((await f.service.from("clan_board_posts").insert({ id: randomUUID(), clan_id: f.clanId, author_id: f.users[0].id, kind: "channels", title: "다른 게시판", content: "", created_at: "2026-10-29T10:00:00Z" })).error).toBeNull();
    expect((await other.service.from("clan_board_posts").insert({ id: randomUUID(), clan_id: other.clanId, author_id: other.users[0].id, kind: "free", title: "다른 클랜", content: "경계 검증", created_at: "2026-10-27T10:00:00Z" })).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.setViewportSize({ width: 1015, height: 884 });
    await page.goto(`${base}/board/free/${ids[1]}`);
    const article = page.locator("article"), nav = article.getByRole("navigation", { name: "게시글 이동", exact: true });
    const avatar = article.locator("header").getByRole("img", { name: `${f.users[0].nickname} 프로필 사진`, exact: true });
    await expect(avatar).toHaveAttribute("src", /\/api\/profile-photo\//);
    await expect.poll(() => avatar.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const actions = article.locator("footer").getByRole("group", { name: "게시글 관리", exact: true });
    await expect(article.locator("header").getByRole("button")).toHaveCount(0);
    await expect(actions.getByRole("button", { name: "편집", exact: true })).toBeVisible();
    const title = (await article.locator("header h3").boundingBox())!, date = (await article.locator("header time").boundingBox())!, authorPhoto = (await avatar.boundingBox())!;
    expect(title.y).toBeGreaterThan(date.y + date.height);
    expect(title.y).toBeGreaterThan(authorPhoto.y + authorPhoto.height);
    await expect(page.getByRole("link", { name: "목록으로", exact: true })).toHaveCount(1);
    await expect(nav.getByRole("link", { name: "이전 글", exact: true })).toHaveAttribute("href", `${base}/board/free/${ids[2]}`);
    await expect(nav.getByRole("link", { name: "다음 글", exact: true })).toHaveAttribute("href", `${base}/board/free/${ids[0]}`);
    const footer = (await article.locator("footer").boundingBox())!, middle = (await nav.boundingBox())!;
    expect(Math.abs(middle.x + middle.width / 2 - footer.x - footer.width / 2)).toBeLessThan(2);
    const tools = (await actions.boundingBox())!;
    expect(tools.x).toBeGreaterThanOrEqual(middle.x + middle.width);
    expect(Math.abs(tools.y + tools.height / 2 - middle.y - middle.height / 2)).toBeLessThan(2);
    await expect(article.locator("footer").getByText(/댓글/)).toHaveCount(0);
    await expect(page.locator("#comments").getByRole("heading", { name: "댓글 0", exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("article-navigation-desktop.png"), animations: "disabled" });
    await actions.getByRole("button", { name: "편집", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "글 편집", exact: true })).toBeVisible();
    await page.getByRole("dialog", { name: "글 편집", exact: true }).getByRole("button", { name: "취소", exact: true }).click();
    await actions.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "글을 삭제하시겠습니까?", exact: true })).toBeVisible();
    await page.getByRole("dialog", { name: "글을 삭제하시겠습니까?", exact: true }).getByRole("button", { name: "취소", exact: true }).click();
    await nav.getByRole("link", { name: "이전 글", exact: true }).click(); await expect(page).toHaveURL(`${base}/board/free/${ids[2]}`);
    await expect(nav.getByLabel("이전 글", { exact: true })).toHaveAttribute("aria-disabled", "true");
    await nav.getByRole("link", { name: "다음 글", exact: true }).click(); await expect(page).toHaveURL(`${base}/board/free/${ids[1]}`);
    await nav.getByRole("link", { name: "다음 글", exact: true }).click(); await expect(page).toHaveURL(`${base}/board/free/${ids[0]}`);
    await expect(nav.getByLabel("다음 글", { exact: true })).toHaveAttribute("aria-disabled", "true");
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await article.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      const mobileFooter = (await article.locator("footer").boundingBox())!, mobileNav = (await nav.boundingBox())!, mobileTools = (await actions.boundingBox())!, mobileLike = (await article.getByRole("button", { name: "공감 0", exact: true }).boundingBox())!;
      expect(mobileNav.y).toBeGreaterThanOrEqual(mobileTools.y + mobileTools.height);
      expect(Math.abs(mobileTools.y + mobileTools.height / 2 - mobileLike.y - mobileLike.height / 2)).toBeLessThan(2);
      expect(mobileTools.x).toBeGreaterThanOrEqual(mobileLike.x + mobileLike.width);
      const list = (await nav.getByRole("link", { name: "목록으로", exact: true }).boundingBox())!;
      expect(Math.abs(list.x + list.width / 2 - mobileFooter.x - mobileFooter.width / 2)).toBeLessThan(2);
      for (const control of [nav.getByRole("link", { name: "목록으로", exact: true }), actions.getByRole("button", { name: "편집", exact: true }), actions.getByRole("button", { name: "삭제", exact: true })]) {
        const box = (await control.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      await page.screenshot({ path: test.info().outputPath(`article-navigation-mobile-${width}.png`), animations: "disabled" });
    }
    await nav.getByRole("link", { name: "목록으로", exact: true }).click(); await expect(page).toHaveURL(base + "/board/free");
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, f.users[1]);
    await page.goto(`${base}/board/free/${ids[1]}`);
    await expect(article.getByRole("heading", { name: "동일 시각 게시글 1", exact: true })).toBeVisible();
    await expect(actions).toHaveCount(0);
  } finally {
    await f.service.storage.from(PROFILE_PHOTO_BUCKET).remove([imagePath]);
    await f.cleanup(); await other.cleanup();
  }
});
