import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("예시 배너 제거 후 기본 배너·프로필 업로드와 구성원 권한을 유지한다", async ({ page, browser, request }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2);
  const base = f.path.replace(/\/balance$/, "");
  const endpoint = "/api/games/overwatch/clans/" + f.clanId + "/profile-image";
  const image = { name: "profile.png", mimeType: "image/png", buffer: readFileSync("public/brand/clansync-symbol.png") };
  // Browser fetch sends Secure cookies on loopback in production, unlike APIRequestContext.
  const imageRequest = (target: Page, method: "POST" | "DELETE", malformed = false) => target.evaluate(async ({ endpoint, method, bytes }) => {
    const body = new FormData();
    if (method === "POST") body.set("image", new Blob([new Uint8Array(bytes)], { type: "image/png" }), "profile.png");
    return (await fetch(endpoint, { method, body: method === "POST" ? body : undefined })).status;
  }, { endpoint, method, bytes: Array.from(malformed ? Buffer.from("<svg/>") : image.buffer) });
  const memberContext = await browser.newContext();
  try {
    expect((await request.post(endpoint, { multipart: { image } })).status()).toBe(401);
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(base + "/manage?tab=appearance");
    const profiles = page.getByRole("region", { name: "클랜 프로필 이미지", exact: true });
    const banners = page.getByRole("region", { name: "클랜 배너", exact: true });
    await expect(banners.getByRole("group", { name: "보유 배너 선택" }).getByRole("button")).toHaveCount(1);
    await expect(banners.getByRole("button", { name: "기본 배너", exact: true })).toBeVisible();
    expect((await page.request.post(endpoint, { headers: { Origin: "https://evil.example" }, multipart: { image } })).status()).toBe(403);
    expect(await imageRequest(page, "POST", true)).toBe(400);
    await profiles.getByLabel("클랜 프로필 이미지 파일").setInputFiles(image);
    const saved = page.waitForResponse(r => r.url().endsWith(endpoint) && r.request().method() === "POST");
    await profiles.getByRole("button", { name: "이미지 저장", exact: true }).click();
    expect((await saved).status()).toBe(200);
    const clan = await f.service.from("clans").select("icon_url,banner_url").eq("id", f.clanId).single();
    expect(clan.error).toBeNull(); expect(clan.data!.banner_url).toBeNull();
    await expect(profiles.getByRole("img", { name: "클랜 프로필 미리보기" })).toHaveAttribute("src", clan.data!.icon_url!);
    await page.goto(base + "/store");
    await page.getByRole("radio", { name: "배너", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(10);
    await expect(page.getByRole("article").getByText("노말", { exact: true })).toHaveCount(10);
    expect((await f.service.rpc("set_clan_banner", { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_item_slug: "clan_banner_slot" })).data).toEqual({ ok: false, error: "not_owned" });
    const member = await memberContext.newPage();
    await loginIsolatedBalanceUser(member, f.users[1]);
    expect(await imageRequest(member, "POST")).toBe(403);
    expect(await imageRequest(member, "DELETE")).toBe(403);
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await page.screenshot({ path: test.info().outputPath("empty-banner-shop-mobile.png") });
    expect(await imageRequest(page, "DELETE")).toBe(200);
    expect((await f.service.storage.from("clan-profiles").list(f.clanId)).data).toEqual([]);
  } finally {
    const objects = await f.service.storage.from("clan-profiles").list(f.clanId);
    if (objects.data?.length) await f.service.storage.from("clan-profiles").remove(objects.data.map(o => f.clanId + "/" + o.name));
    await memberContext.close(); await f.cleanup();
  }
});
