import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000 });

test("그림 테마의 원자적 저장·심벌/초상 프레임 교차 조합·공개 기록·모바일", async ({ page, browser }, info) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(2);
  const viewerContext = await browser.newContext({ viewport: { width: 320, height: 900 } });
  try {
    const battleTag = `ThemePlayer#${f.users[0].id.replace(/\D/g, "").slice(0, 8).padEnd(8, "1")}`;
    expect((await f.service.from("user_game_profiles").update({ battle_tag: battleTag }).eq("user_id", f.users[0].id).eq("game_id", f.gameId)).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto("/profile");
    await page.getByRole("button", { name: "네임카드 꾸미기", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "네임카드 꾸미기", exact: true });
    const current = editor.getByRole("region", { name: "현재 네임카드", exact: true }).locator("[data-namecard]");
    await expect(current).toContainText(battleTag);
    const categories = editor.getByRole("group", { name: "네임카드 꾸미기 분류", exact: true });
    const themes = [["arcade", "심야 아케이드"], ["tactical", "전술 기록"], ["nebula", "성운 항해"]];
    for (const [id, name] of themes) {
      await editor.getByRole("button", { name: `${name} 테마 적용`, exact: true }).click();
      await expect(editor.getByRole("status")).toContainText("저장했습니다");
      await expect(current).toHaveAttribute("data-art", id);
      await expect(current).toHaveAttribute("data-portrait", id);
      await expect(current).toHaveAttribute("data-frame", `theme-${id}-frame`);
      expect((await page.request.get(`/namecards/v1/${id}.webp`)).ok()).toBe(true);
      await page.screenshot({ path: info.outputPath(`theme-${id}-desktop.png`) });
    }
    expect(await current.locator('[data-symbol] > span').evaluate(node => getComputedStyle(node).borderRadius)).toBe("50%");
    await page.route("**/profile", route => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await editor.getByRole("button", { name: "심야 아케이드 테마 적용", exact: true }).click();
    await expect(editor.getByRole("alert")).toBeVisible();
    await expect(current).toHaveAttribute("data-art", "nebula");
    await page.unroute("**/profile");
    await categories.getByRole("button", { name: "심벌", exact: true }).click();
    await editor.getByRole("button", { name: "심벌 왕관 적용", exact: true }).click();
    await expect(current.locator('[data-symbol="symbol-crown"]')).toBeVisible();
    await expect(current).toHaveAttribute("data-portrait", "nebula");
    await categories.getByRole("button", { name: "배경", exact: true }).click();
    await editor.getByRole("button", { name: "배경 전술 기록 적용", exact: true }).click();
    await expect(current).toHaveAttribute("data-art", "tactical");
    await expect(current).toHaveAttribute("data-portrait", "nebula");
    await categories.getByRole("button", { name: "초상 프레임", exact: true }).click();
    await editor.getByRole("button", { name: "초상 프레임 심야 아케이드 적용", exact: true }).click();
    await expect(current).toHaveAttribute("data-portrait", "arcade");
    await expect(current.locator('[data-symbol="symbol-crown"]')).toBeVisible();
    await editor.getByRole("button", { name: "초상 프레임 장식 없음 적용", exact: true }).click();
    await expect(current).toHaveAttribute("data-portrait", "default");
    await editor.getByRole("button", { name: "초상 프레임 성운 항해 적용", exact: true }).click();
    await expect(current).toHaveAttribute("data-portrait", "nebula");
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await editor.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      expect(await current.locator("strong").evaluate(node => node.getBoundingClientRect().width > 80)).toBe(true);
    }
    await categories.getByRole("button", { name: "테마", exact: true }).click();
    await page.screenshot({ path: info.outputPath("theme-picker-mobile.png") });
    await page.keyboard.press("Escape");
    await page.reload();
    const own = page.getByRole("region", { name: "공통 네임카드", exact: true }).locator("[data-namecard]");
    await expect(own).toHaveAttribute("data-art", "tactical");
    await expect(own).toHaveAttribute("data-portrait", "nebula");
    const identity = await page.request.get(`/api/player-profiles/${f.users[0].id}`);
    expect((await identity.json()).profile.appearance).toMatchObject({ portrait: "theme-nebula-portrait", emblem: "symbol-crown", frame: "theme-nebula-frame", namebar: "theme-tactical-namebar" });
    const viewer = await viewerContext.newPage();
    await loginIsolatedBalanceUser(viewer, f.users[1]);
    await viewer.goto(f.path.replace(/balance$/, "stats") + "?player=" + f.users[0].id);
    const publicCard = viewer.getByRole("region", { name: "플레이어 배너", exact: true }).locator("[data-namecard]");
    await expect(publicCard).toHaveAttribute("data-art", "tactical");
    await expect(publicCard).toHaveAttribute("data-portrait", "nebula");
    await expect(publicCard.locator('[data-symbol="symbol-crown"]')).toBeVisible();
    await viewer.screenshot({ path: info.outputPath("theme-public-record-mobile.png") });
  } finally { await viewerContext.close(); await f.cleanup(); }
});
