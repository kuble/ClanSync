import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { expect, test, type Locator } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { boardThumbnail } from "../src/lib/clan/board";
import { DEFAULT_STICKER_PLACEMENT } from "../src/lib/clan/photo-sticker";

async function expectWholePhoto(image: Locator, width: number, height: number) {
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate(node => {
    const img = node as HTMLImageElement, imageStyle = getComputedStyle(img), canvasStyle = getComputedStyle(img.parentElement!);
    // Gallery cards rotate; compare layout dimensions before that decorative transform.
    return { loaded: img.complete && img.naturalWidth > 0, ratio: parseFloat(imageStyle.width) / parseFloat(imageStyle.height), canvasRatio: parseFloat(canvasStyle.width) / parseFloat(canvasStyle.height), fit: imageStyle.objectFit };
  })).toMatchObject({ loaded: true, ratio: expect.closeTo(width / height, 2), canvasRatio: expect.closeTo(width / height, 2), fit: "contain" });
}

test("memory photos keep landscape, portrait and square proportions inside every frame", async ({ page }) => {
  test.setTimeout(180_000); page.setDefaultTimeout(15_000);
  const f = await createIsolatedBalanceFixture(1), svc = f.service, base = f.path.replace(/\/balance$/, "");
  const cases = [
    { width: 1200, height: 300, frame: "classic", label: "가로 원본" },
    { width: 300, height: 900, frame: "film", label: "세로 원본" },
    { width: 500, height: 500, frame: "tape", label: "정사각형 원본" },
  ];
  try {
    expect((await svc.from("clans").update({ coin_balance: 1000 }).eq("id", f.clanId)).error).toBeNull();
    for (const slug of ["clan_photo_frames", "clan_photo_stickers"]) expect((await svc.rpc("apply_store_purchase", { p_actor_id: f.users[0].id, p_context_clan_id: f.clanId, p_item_slug: slug, p_checkout_id: randomUUID() })).data).toMatchObject({ ok: true });
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.setViewportSize({ width: 1015, height: 884 });
    for (const item of cases) {
      const { width, height, frame, label } = item;
      const buffer = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#6e9b87"/><rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="white" stroke-width="8"/><circle cx="22" cy="22" r="14" fill="#e96e75"/><circle cx="${width - 22}" cy="${height - 22}" r="14" fill="#769ee8"/><text x="50%" y="50%" text-anchor="middle" fill="white" font-size="28">${width} x ${height}</text></svg>`)).png().toBuffer();
      await page.goto(base + "/board/memories");
      await page.getByRole("button", { name: "추억 남기기", exact: true }).click();
      const editor = page.getByRole("dialog", { name: "추억 남기기", exact: true });
      await editor.getByLabel("사진", { exact: true }).setInputFiles({ name: `${frame}.png`, mimeType: "image/png", buffer });
      const photo = editor.locator("[data-photo-frame]").first().locator("img").first();
      await expectWholePhoto(photo, width, height);
      if (frame !== "classic") {
        await editor.getByRole("tab", { name: "추억 사진 프레임 팩", exact: true }).click();
        await editor.getByRole("radio", { name: frame === "film" ? "필름" : "마스킹 테이프", exact: true }).check();
        await expectWholePhoto(photo, width, height);
      }
      await editor.getByRole("tab", { name: "스티커", exact: true }).click();
      await editor.getByRole("tab", { name: "추억 사진 스티커 팩", exact: true }).click();
      await editor.getByRole("button", { name: "하트 추가", exact: true }).click();
      await editor.getByLabel("글", { exact: true }).fill(label);
      await editor.getByRole("button", { name: "저장", exact: true }).click();
      await expect(page).toHaveURL(/\/memories\/[0-9a-f-]{36}$/, { timeout: 30_000 });
      const postId = page.url().split("/").at(-1)!;
      const post = (await svc.from("clan_board_posts").select("image_path,details").eq("id", postId).single()).data!;
      const original = await svc.storage.from("clan-board-images").download(post.image_path!);
      expect(original.error).toBeNull();
      expect(Buffer.from(await original.data!.arrayBuffer()).equals(buffer)).toBe(true);
      const details = post.details as { photoStickers: { id: string; placement: typeof DEFAULT_STICKER_PLACEMENT }[] };
      const placement = details.photoStickers[0].placement;
      for (const viewport of [{ width: 1015, height: 884 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        await expectWholePhoto(page.getByRole("img", { name: label, exact: true }), width, height);
        const sticker = page.locator(`[data-sticker-id="${details.photoStickers[0].id}"]`);
        expect(await sticker.evaluate(el => ({ x: (el as HTMLElement).style.left, y: (el as HTMLElement).style.top }))).toEqual({ x: `${placement.x}%`, y: `${placement.y}%` });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.screenshot({ path: test.info().outputPath(`${frame}-original-ratio.png`), animations: "disabled" });
      await page.getByRole("button", { name: "편집", exact: true }).click();
      await expectWholePhoto(page.getByRole("dialog", { name: "글 편집", exact: true }).locator("[data-photo-frame]").first().locator("img").first(), width, height);
      await page.getByRole("dialog", { name: "글 편집", exact: true }).getByRole("button", { name: "취소", exact: true }).click();
      await page.setViewportSize({ width: 1015, height: 884 });
    }
    for (const viewport of [{ width: 1015, height: 884 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport); await page.goto(base + "/board/memories");
      for (const { width, height, label } of cases) await expectWholePhoto(page.getByRole("img", { name: label, exact: true }), width, height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  } finally {
    const posts = (await svc.from("clan_board_posts").select("image_path").eq("clan_id", f.clanId)).data ?? [];
    try {
      const paths = posts.flatMap(post => post.image_path ? [post.image_path, boardThumbnail(post.image_path)] : []);
      const bucket = svc.storage.from("clan-board-images"), prefix = `${f.clanId}/${f.users[0].id}`;
      for (const folder of (await bucket.list(prefix)).data ?? []) {
        for (const file of (await bucket.list(`${prefix}/${folder.name}`)).data ?? []) paths.push(`${prefix}/${folder.name}/${file.name}`);
      }
      if (paths.length) expect((await bucket.remove([...new Set(paths)])).error).toBeNull();
    } finally { await f.cleanup(); }
  }
});
