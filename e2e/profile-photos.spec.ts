import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { PROFILE_PHOTO_BUCKET as bucket } from "../src/lib/profile/photo";

test("account photo is shared by discussion avatars, preserves symbols and restricts reads/writes", async ({ page, browser, request }) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(15_000);
  const f = await createIsolatedBalanceFixture(3), svc = f.service, actor = f.users[0];
  const peerContext = await browser.newContext(), peerPage = await peerContext.newPage();
  peerPage.setDefaultTimeout(15_000);
  const base = f.path.replace(/\/balance$/, ""), endpoint = "/api/profile-photo";
  const image = { name: "avatar.png", mimeType: "image/png", buffer: await sharp({ create: { width: 180, height: 120, channels: 4, background: "#5ba7ce" } }).png().toBuffer() };
  const photo = async () => (await svc.from("account_profile_photos").select("image_path").eq("user_id", actor.id).single()).data?.image_path;
  try {
    expect((await svc.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[2].id)).error).toBeNull();
    await loginIsolatedBalanceUser(page, actor);
    await page.goto("/profile");
    await page.getByRole("button", { name: "네임카드 꾸미기", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "네임카드 꾸미기", exact: true });
    await editor.getByRole("button", { name: "심벌", exact: true }).click();
    await editor.getByRole("button", { name: "심벌 왕관 적용", exact: true }).click();
    await expect(editor.getByRole("status")).toContainText("저장했습니다");
    await page.keyboard.press("Escape");
    const settings = page.getByRole("region", { name: "공통 프로필 사진", exact: true });
    await page.reload();
    await expect(settings.getByRole("img", { name: "내 프로필 심볼", exact: true })).toHaveAttribute("src", /crown/);
    await settings.getByLabel("프로필 사진 파일", { exact: true }).setInputFiles(image);
    await expect(settings.getByRole("img", { name: "내 프로필 사진", exact: true })).toHaveAttribute("src", /^blob:/);
    await settings.getByRole("button", { name: "사진 저장", exact: true }).click();
    const saved = settings.getByRole("img", { name: "내 프로필 사진", exact: true });
    await expect(saved).toHaveAttribute("src", /\/api\/profile-photo\//);
    const firstUrl = new URL((await saved.getAttribute("src"))!, page.url()).pathname, firstPath = (await photo())!;
    const original = await svc.storage.from(bucket).download(firstPath);
    expect(original.error).toBeNull();
    expect(await sharp(Buffer.from(await original.data!.arrayBuffer())).metadata()).toMatchObject({ format: "webp", width: 256, height: 256 });
    expect((await page.request.get(firstUrl)).headers()["cache-control"]).toBe("private, no-store");
    expect((await request.get(firstUrl)).status()).toBe(401);
    expect((await request.post(endpoint, { multipart: { image } })).status()).toBe(401);
    expect((await page.request.post(endpoint, { headers: { Origin: "https://other.example" }, multipart: { image } })).status()).toBe(403);
    expect((await page.request.delete(endpoint, { headers: { Origin: "https://other.example" } })).status()).toBe(403);
    for (const file of [
      { ...image, buffer: Buffer.from("not an image") },
      { ...image, buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"/>') },
      { ...image, buffer: await sharp({ create: { width: 4097, height: 4097, channels: 3, background: "#fff" } }).png().toBuffer() },
      { ...image, mimeType: "image/gif", buffer: Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64") },
    ]) expect((await page.request.post(endpoint, { multipart: { image: file } })).status()).toBe(400);
    expect([400, 413]).toContain((await page.request.post(endpoint, { multipart: { image: { ...image, buffer: Buffer.alloc(2 * 1024 * 1024 + 100000) } } })).status());
    expect(await photo()).toBe(firstPath);

    const [self, peer, outsider] = await Promise.all([f.memberClient(0), f.memberClient(1), f.memberClient(2)]);
    expect((await self.from("account_profile_photos").update({ image_path: null }).eq("user_id", actor.id)).error).not.toBeNull();
    expect((await peer.from("account_profile_photos").insert({ user_id: actor.id, image_path: null })).error).not.toBeNull();
    expect((await peer.from("account_profile_photos").select("user_id").eq("user_id", actor.id)).data).toHaveLength(1);
    expect((await outsider.from("account_profile_photos").select("user_id").eq("user_id", actor.id)).data).toEqual([]);
    expect((await self.storage.from(bucket).upload(`${actor.id}/${randomUUID()}.webp`, image.buffer, { contentType: "image/webp" })).error).not.toBeNull();
    expect((await peer.storage.from(bucket).download(firstPath)).error).not.toBeNull();
    expect((await request.get(svc.storage.from(bucket).getPublicUrl(firstPath).data.publicUrl)).ok()).toBe(false);

    // A failed save keeps the pending selection and the stored photo for retry.
    await settings.getByLabel("프로필 사진 파일", { exact: true }).setInputFiles(image);
    await page.route("**/api/profile-photo", route => route.fulfill({ status: 500, json: { ok: false, error: "사진 저장 실패 테스트" } }), { times: 1 });
    await settings.getByRole("button", { name: "사진 저장", exact: true }).click();
    await expect(page.getByText("사진 저장 실패 테스트", { exact: true })).toBeVisible();
    await expect(saved).toHaveAttribute("src", /^blob:/);
    expect(await photo()).toBe(firstPath);
    await settings.getByRole("button", { name: "사진 저장", exact: true }).click();
    await expect(saved).toHaveAttribute("src", /\/api\/profile-photo\//);
    expect(await photo()).not.toBe(firstPath);
    expect((await page.request.get(firstUrl)).status()).toBe(404);
    expect((await svc.storage.from(bucket).list(actor.id, { search: firstPath.split("/")[1] })).data).toEqual([]);
    const currentUrl = new URL((await saved.getAttribute("src"))!, page.url()).pathname;
    await expect(page.locator('[data-namecard] [data-symbol="symbol-crown"]').first()).toBeVisible();
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`profile-photo-${width}.png`), animations: "disabled" });
    }
    await page.setViewportSize({ width: 1280, height: 900 });

    const post = await svc.from("clan_board_posts").insert({ clan_id: f.clanId, kind: "free", title: "아바타 테스트", content: "사진 공유", author_id: actor.id }).select("id").single();
    expect(post.error).toBeNull();
    expect((await svc.from("clan_board_comments").insert({ post_id: post.data!.id, author_id: actor.id, content: "같은 사진" })).error).toBeNull();
    expect((await svc.from("clan_hof_comments").insert({ clan_id: f.clanId, ranking: "rate", period_key: "all", author_id: actor.id, content: "통계에서도 같은 사진" })).error).toBeNull();
    await loginIsolatedBalanceUser(peerPage, f.users[1]);
    await peerPage.goto(base + "/board/free/" + post.data!.id);
    const avatar = peerPage.getByRole("img", { name: `${actor.nickname} 프로필 사진`, exact: true });
    await expect(avatar).toHaveAttribute("src", new RegExp(currentUrl + "$"));
    await expect.poll(() => avatar.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(256);
    await peerPage.goto(base + "/stats");
    await expect(avatar).toHaveAttribute("src", new RegExp(currentUrl + "$"));
    await expect.poll(() => avatar.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(256);
    await peerPage.screenshot({ path: test.info().outputPath("discussion-avatar.png"), animations: "disabled" });
    expect((await peerPage.request.get(currentUrl)).status()).toBe(200);
    expect((await svc.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id)).error).toBeNull();
    expect((await peerPage.request.get(currentUrl)).status()).toBe(404);
    expect((await svc.from("clan_members").update({ status: "active" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id)).error).toBeNull();

    await settings.getByRole("button", { name: "프로필 사진 제거", exact: true }).click();
    await expect(settings.getByRole("img", { name: "내 프로필 심볼", exact: true })).toHaveAttribute("src", /crown/);
    await peerPage.reload();
    await expect(peerPage.getByRole("img", { name: `${actor.nickname} 프로필 심볼`, exact: true })).toHaveAttribute("src", /crown/);
    expect((await peerPage.request.get(currentUrl)).status()).toBe(404);

    const results = await Promise.all([1, 2].map(() => page.request.post(endpoint, { multipart: { image } })));
    expect(results.some(result => result.status() === 200)).toBe(true);
    expect(results.every(result => [200, 409].includes(result.status()))).toBe(true);
    expect((await svc.storage.from(bucket).list(actor.id)).data).toHaveLength(1);
    await page.reload();
    // Account withdrawal removes the photo record and the private object too.
    await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    await page.getByRole("button", { name: "ClanSync 탈퇴", exact: true }).click();
    await page.getByRole("button", { name: "ClanSync 탈퇴하기", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    const deleted = await svc.auth.admin.getUserById(actor.id);
    expect(deleted.data.user).toBeNull();
    expect((await svc.storage.from(bucket).list(actor.id)).data).toEqual([]);
    expect((await svc.from("account_profile_photos").select("user_id").eq("user_id", actor.id)).data).toEqual([]);
  } finally {
    await peerContext.close();
    for (const user of [...f.users]) {
      const files = await svc.storage.from(bucket).list(user.id);
      if (files.data?.length) await svc.storage.from(bucket).remove(files.data.map(file => `${user.id}/${file.name}`));
      const result = await svc.auth.admin.getUserById(user.id);
      if (!result.data.user && result.error?.status === 404) f.users.splice(f.users.indexOf(user), 1);
    }
    await f.cleanup();
  }
});
