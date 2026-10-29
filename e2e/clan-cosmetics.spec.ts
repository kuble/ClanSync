import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { boardThumbnail } from "../src/lib/clan/board";

test("clan cosmetic purchases, bounded private emoji slots, reactions and shared photo styles", async ({ page, browser, request }) => {
  test.setTimeout(240_000);
  const f = await createIsolatedBalanceFixture(3), svc = f.service;
  const base = `/games/overwatch/clan/${f.clanId}`, endpoint = `/api/games/overwatch/clans/${f.clanId}/emojis`;
  const buffer = await sharp({ create: { width: 160, height: 100, channels: 4, background: "#50b887" } }).png().toBuffer();
  const image = { name: "cheer.png", mimeType: "image/png", buffer };
  const postId = randomUUID(), photos: string[] = [], emojiPaths = new Set<string>();
  const balance = async () => (await svc.from("clans").select("coin_balance").eq("id", f.clanId).single()).data!.coin_balance;
  const buy = async (name: string) => {
    await page.goto(base + "/store");
    await page.getByRole("radio", { name: name.includes("이모티콘") ? "반응" : "사진", exact: true }).click();
    await page.getByRole("article", { name, exact: true }).getByRole("button", { name: /^(구매|추가 구매)$/, exact: true }).click();
    await page.getByRole("dialog", { name: "꾸미기 구매", exact: true }).getByRole("button", { name: "구매 확정", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "꾸미기 구매", exact: true })).toBeHidden();
  };
  const upload = (name: string) => page.request.post(endpoint, { multipart: { name, image } });
  try {
    expect((await svc.from("clans").update({ coin_balance: 1000 }).eq("id", f.clanId)).error).toBeNull();
    expect((await svc.from("clan_board_posts").insert({ id: postId, clan_id: f.clanId, author_id: f.users[1].id, kind: "free", title: "공용 반응 검증", content: "우리 클랜 반응" })).error).toBeNull();
    const member = await f.memberClient(1);
    expect((await member.rpc("clan_cosmetic_access", { p_clan_id: f.clanId })).data).toEqual({ emojiSlots: 0, frames: false, stickers: false });
    expect((await member.rpc("add_clan_emoji", { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_id: randomUUID(), p_name: "위조", p_image_path: "forged" })).error).not.toBeNull();
    const memoryId = randomUUID(), fakePath = `${f.clanId}/${f.users[1].id}/${memoryId}/${randomUUID()}.png`;
    for (const details of [{ photoFrame: "film" }, { photoSticker: "gg" }, { photoFrame: "fake" }]) {
      expect((await member.from("clan_board_posts").insert({ id: memoryId, clan_id: f.clanId, kind: "memories", title: "위조 꾸미기", image_path: fakePath, details })).error?.code).toBe("23514");
    }
    expect((await request.post(endpoint, { multipart: { name: "환호", image } })).status()).toBe(401);
    await loginIsolatedBalanceUser(page, f.users[0]);
    expect((await upload("환호")).status()).toBe(400);
    await buy("공용 이모티콘 3슬롯");
    expect(await balance()).toBe(900);
    await buy("공용 이모티콘 3슬롯");
    expect(await balance()).toBe(800);
    expect((await upload("잘못된 이름!")).status()).toBe(400);
    expect((await page.request.post(endpoint, { headers: { Origin: "https://evil.example" }, multipart: { name: "환호", image } })).status()).toBe(403);
    expect((await page.request.post(endpoint.replace("overwatch", "valorant"), { multipart: { name: "환호", image } })).status()).toBe(404);
    expect((await page.request.post(endpoint, { multipart: { name: "환호", image: { ...image, buffer: Buffer.from("<svg/>") } } })).status()).toBe(400);
    expect((await page.request.post(endpoint, { multipart: { name: "환호", image: { ...image, name: "bad.gif", mimeType: "image/gif" } } })).status()).toBe(400);
    expect((await page.request.post(endpoint, { multipart: { name: "환호", image: { ...image, buffer: Buffer.alloc(400000) } } })).status()).toBe(413);
    await page.goto(base + "/manage?tab=appearance#clan-emojis");
    const settings = page.getByRole("region", { name: "공용 이모티콘", exact: true });
    await settings.getByLabel("이모티콘 이미지", { exact: true }).setInputFiles(image);
    const crop = page.getByRole("dialog",{name:"공용 이모티콘 추가",exact:true});
    await crop.getByLabel("이모티콘 이름",{exact:true}).fill("환호");
    await crop.getByRole("button",{name:"등록",exact:true}).click();
    await expect(crop).toBeHidden();
    await expect(settings.getByRole("img", { name: "환호", exact: true })).toBeVisible();
    const first = (await svc.from("clan_emojis").select("id,image_path").eq("clan_id", f.clanId).single()).data!;
    emojiPaths.add(first.image_path);
    const privateUrl = `/api/clans/${f.clanId}/emojis/${first.id}`;
    expect((await request.get(privateUrl)).status()).toBe(404);
    expect((await page.request.get(privateUrl)).status()).toBe(200);
    const object = await svc.storage.from("clan-emojis").download(first.image_path);
    const meta = await sharp(Buffer.from(await object.data!.arrayBuffer())).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([128, 128, "webp"]);
    expect((await upload("환호")).status()).toBe(400);
    const concurrent = await Promise.all(Array.from({ length: 11 }, (_, i) => upload("반응_" + i)));
    expect(concurrent.filter(r => r.ok())).toHaveLength(5);
    const rows = (await svc.from("clan_emojis").select("id,name,image_path").eq("clan_id", f.clanId)).data!;
    expect(rows).toHaveLength(6); rows.forEach(row => emojiPaths.add(row.image_path));
    const storedPaths: string[] = [];
    for (const folder of (await svc.storage.from("clan-emojis").list(f.clanId)).data ?? []) {
      for (const file of (await svc.storage.from("clan-emojis").list(`${f.clanId}/${folder.name}`)).data ?? []) storedPaths.push(`${f.clanId}/${folder.name}/${file.name}`);
    }
    expect(storedPaths.sort()).toEqual([...emojiPaths].sort());
    const outsider = await f.memberClient(2);
    expect((await svc.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[2].id)).error).toBeNull();
    expect((await outsider.from("clan_emojis").select("id").eq("clan_id", f.clanId)).data).toHaveLength(0);
    expect((await outsider.rpc("clan_cosmetic_access", { p_clan_id: f.clanId })).data).toEqual({});
    expect((await outsider.from("clan_emoji_reactions").insert({ post_id: postId, emoji_id: first.id })).error).not.toBeNull();
    await page.reload(); await settings.scrollIntoViewIfNeeded();
    await expect.poll(() => settings.getByRole("img").evaluateAll(nodes => nodes.every(node => (node as HTMLImageElement).naturalWidth === 128))).toBe(true);
    await page.screenshot({ animations: "disabled", path: test.info().outputPath("emoji-slots.png") });
    const memberContext = await browser.newContext();
    try {
      const memberPage = await memberContext.newPage(); await loginIsolatedBalanceUser(memberPage, f.users[1]);
      expect((await memberPage.request.post(endpoint, { multipart: { name: "불가", image } })).status()).toBe(403);
      expect((await memberPage.request.delete(endpoint, { data: { id: first.id } })).status()).toBe(403);
      expect((await member.storage.from("clan-emojis").upload(`${f.clanId}/forged.webp`, buffer)).error).not.toBeNull();
      await memberPage.goto(base + "/board/free/" + postId);
      await memberPage.getByRole("button", { name: "클랜 이모티콘 선택", exact: true }).click();
      await memberPage.getByRole("button", { name: "환호 이모티콘", exact: true }).click();
      const reaction = memberPage.getByRole("button", { name: "환호 공감 1명", exact: true });
      await expect(reaction).toHaveAttribute("aria-pressed", "true");
      await memberPage.reload(); await expect(reaction).toBeVisible();
      expect((await member.from("clan_emoji_reactions").insert({ post_id: randomUUID(), emoji_id: first.id })).error).not.toBeNull();
      await reaction.click(); await expect(reaction).toHaveCount(0);
      expect((await member.from("clan_emoji_reactions").insert({ post_id: postId, emoji_id: first.id })).error).toBeNull();
      expect((await page.request.delete(endpoint, { data: { id: first.id } })).ok()).toBe(true);
      expect((await svc.from("clan_emoji_reactions").select("post_id").eq("emoji_id", first.id)).data).toHaveLength(0);
      expect((await page.request.get(privateUrl)).status()).toBe(404);
      expect((await svc.storage.from("clan-emojis").list(`${f.clanId}/${first.id}`)).data).toHaveLength(0);
      await buy("추억 사진 프레임 팩"); await buy("추억 사진 스티커 팩");
      expect(await balance()).toBe(550);
      await memberPage.goto(base + "/board/memories");
      await memberPage.getByRole("button", { name: "추억 남기기", exact: true }).click();
      const editor = memberPage.getByRole("dialog");
      await editor.getByLabel("사진", { exact: true }).setInputFiles(image);
      await editor.getByRole("tab", { name: "추억 사진 프레임 팩", exact: true }).click();
      await editor.getByRole("radio", { name: "마스킹 테이프", exact: true }).check();
      await editor.getByRole("tab", { name: "스티커", exact: true }).click();
      await editor.getByRole("tab", { name: "추억 사진 스티커 팩", exact: true }).click();
      await editor.getByRole("button", { name: "GG 추가", exact: true }).click();
      await editor.getByLabel("글", { exact: true }).fill("함께한 순간");
      await memberPage.screenshot({ animations: "disabled", path: test.info().outputPath("photo-styling.png") });
      await editor.getByRole("button", { name: "저장", exact: true }).click();
      await expect(memberPage).toHaveURL(/\/board\/memories\/[0-9a-f-]{36}$/, { timeout: 30_000 });
      const saved = (await svc.from("clan_board_posts").select("id,image_path,details").eq("clan_id", f.clanId).eq("kind", "memories").single()).data!;
      photos.push(saved.image_path!, boardThumbnail(saved.image_path!));
      expect(saved.details).toEqual({ photoFrame: "tape", photoStickers: [{ id: expect.any(String), sticker: "gg", placement: { x: 40, y: 40, rotation: 12, flipX: false, flipY: false, scale: 1 } }] });
      await expect(memberPage.locator('[data-photo-frame="tape"]').getByLabel("GG 스티커", { exact: true })).toBeVisible();
      await memberPage.goto(base + "/board/memories");
      await expect(memberPage.locator('[data-photo-frame="tape"]').getByLabel("GG 스티커", { exact: true })).toBeVisible();
      await memberPage.screenshot({ animations: "disabled", path: test.info().outputPath("photo-gallery.png") });
      expect((await svc.from("clan_members").update({ status: "active", role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[2].id)).error).toBeNull();
      for (const p of (await svc.from("purchases").select("id").eq("clan_id", f.clanId).is("voided_at", null)).data!) {
        const refund = await svc.rpc("void_clan_store_purchase", { p_actor_id: f.users[2].id, p_purchase_id: p.id, p_reason: "격리 꾸미기 검증 정정" });
        expect(refund.error).toBeNull(); expect(refund.data).toEqual({ ok: true });
      }
      expect(await balance()).toBe(1000);
      expect((await member.rpc("clan_cosmetic_access", { p_clan_id: f.clanId })).data).toEqual({ emojiSlots: 0, frames: false, stickers: false });
      expect((await member.from("clan_emojis").select("id").eq("clan_id", f.clanId)).data).toHaveLength(0);
      expect((await memberPage.request.get(`/api/clans/${f.clanId}/emojis/${rows.find(r => r.id !== first.id)!.id}`)).status()).toBe(404);
      await memberPage.reload(); await expect(memberPage.locator('[data-photo-frame="classic"][data-photo-sticker="none"]')).toBeVisible();
      expect((await svc.from("clan_board_posts").select("details").eq("id", saved.id).single()).data?.details).toEqual(saved.details);
      expect((await member.from("clan_board_posts").update({ details: { photoFrame: "film" } }).eq("id", saved.id)).error?.code).toBe("23514");
    } finally { await memberContext.close(); }
    await page.goto(base + "/store");
    await expect(page.getByRole("region", { name: "클랜 소개", exact: true })).toHaveCount(0);
    await expect(page.getByRole("article")).toHaveCount(10);
    await page.screenshot({ animations: "disabled", path: test.info().outputPath("clan-store-desktop.png"), fullPage: true });
    for (const [width, height] of [[1280, 900], [390, 844], [320, 640], [740, 360]]) {
      await page.setViewportSize({ width, height });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("button", { name: "사선 미리보기", exact: true }).click();
      const modal = page.getByRole("dialog", { name: "사선 미리보기", exact: true });
      await expect(modal.getByRole("region", { name: "클랜 소개", exact: true })).toBeVisible();
      const rect = (await modal.boundingBox())!;
      expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.x + rect.width).toBeLessThanOrEqual(width);
      expect(rect.y).toBeGreaterThanOrEqual(0); expect(rect.height).toBeLessThanOrEqual(height);
      expect(await modal.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ animations: "disabled", path: test.info().outputPath(`banner-preview-${width}.png`) });
      await modal.getByRole("radio", { name: "이미지 전체", exact: true }).click();
      const original = modal.locator('[data-banner-design="forest-diagonal"]');
      const imageRect = (await original.boundingBox())!;
      expect(imageRect.width / imageRect.height).toBeCloseTo(3, 1);
      await modal.locator('[data-slot="dialog-footer"]').getByRole("button", { name: "닫기", exact: true }).click();
      await expect(modal).toBeHidden();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("heading", { name: "클랜 스토어", exact: true, level: 1 }).scrollIntoViewIfNeeded();
    await page.screenshot({ animations: "disabled", path: test.info().outputPath("clan-store-mobile.png"), fullPage: true });
  } finally {
    const rows = await svc.from("clan_emojis").select("image_path").eq("clan_id", f.clanId);
    rows.data?.forEach(row => emojiPaths.add(row.image_path));
    if (emojiPaths.size) expect((await svc.storage.from("clan-emojis").remove([...emojiPaths])).error).toBeNull();
    const posts = (await svc.from("clan_board_posts").select("image_path").eq("clan_id", f.clanId)).data ?? [];
    for (const p of posts) if (p.image_path) photos.push(p.image_path, boardThumbnail(p.image_path));
    if (photos.length) expect((await svc.storage.from("clan-board-images").remove([...new Set(photos)])).error).toBeNull();
    expect((await svc.from("purchases").delete().eq("clan_id", f.clanId)).error).toBeNull();
    await f.cleanup();
  }
});
