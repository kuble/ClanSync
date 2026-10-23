import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("계정 탭의 공개 설정은 방문 화면에만 반영되고 계정·코인·보관함은 노출하지 않는다", async ({ page, browser }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(2);
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  try {
    const intro = `공개 소개 ${f.users[0].nickname}`;
    expect((await f.service.auth.admin.updateUserById(f.users[0].id, { user_metadata: { profile_intro: intro } })).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await loginIsolatedBalanceUser(visitor, f.users[1]);
    await page.goto("/profile");
    const privateGame = await f.service.from("user_game_profiles").select("game_uid").eq("user_id", f.users[0].id).single();
    expect(privateGame.error).toBeNull();
    const plant = await f.service.from("user_housing_inventory").select("id").eq("user_id", f.users[0].id).eq("catalog_id", "small-plant").single();
    expect(plant.error).toBeNull();
    expect((await f.service.from("user_housing_inventory").update({ x: null, y: null }).eq("id", plant.data!.id)).error).toBeNull();
    const visitUrl = `/profile/${f.users[0].id}`;
    const response = await visitor.goto(visitUrl);
    expect(response?.status()).toBe(200);
    const html = await response!.text();
    for (const value of [f.users[0].email, String(privateGame.data!.game_uid), intro, plant.data!.id, "coinBalance", "auto_login"]) expect(html).not.toContain(value);
    await expect(visitor.getByRole("heading", { name: f.users[0].nickname, exact: true })).toBeVisible();
    await expect(visitor.getByRole("tab", { name: "계정 정보", exact: true })).toHaveCount(0);
    await expect(visitor.getByRole("button", { name: "방 꾸미기", exact: true })).toHaveCount(0);
    await expect(visitor.getByRole("button", { name: "가구 상점", exact: true })).toHaveCount(0);
    await expect(visitor.getByText(intro, { exact: true })).toHaveCount(0);
    await expect(visitor.getByText(f.clanId, { exact: true })).toHaveCount(0);
    await expect(visitor.getByRole("button", { name: "민트 소파 선택", exact: true })).toBeDisabled();
    const scene = visitor.getByTestId("housing-room-stage");
    const sofa = await visitor.getByRole("button", { name: "민트 소파 선택", exact: true }).boundingBox();
    await visitor.mouse.move(sofa!.x + sofa!.width / 2, sofa!.y + sofa!.height / 2);
    await visitor.mouse.down();
    await visitor.waitForTimeout(550);
    await visitor.mouse.up();
    await expect(scene).toHaveAttribute("data-editing", "false");

    await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    await expect(page.getByRole("switch", { name: "미니룸 공개", exact: true })).toBeChecked();
    for (const name of ["한 줄 소개 공개", "플레이 게임 공개", "함께하는 클랜 공개", "대표 엠블럼 공개"]) {
      const control = page.getByRole("switch", { name, exact: true });
      await expect(control).not.toBeChecked();
      await control.click();
      await expect(control).toBeChecked();
      await expect(control).toBeEnabled();
    }
    await visitor.reload();
    await expect(visitor.getByText(intro, { exact: true })).toBeVisible();
    await expect(visitor.getByRole("img", { name: "오버워치 로고", exact: true })).toBeVisible();
    await expect(visitor.getByRole("region", { name: "대표 엠블럼", exact: true })).toBeVisible();
    await expect(visitor.getByRole("region", { name: "플레이어 소개", exact: true }).getByRole("link", { name: new RegExp("^BalanceUI-") })).toBeVisible();
    await page.reload();
    await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    await expect(page.getByRole("switch", { name: "한 줄 소개 공개", exact: true })).toBeChecked();
    await expect(page.getByText(f.users[0].email, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "프로필 설정", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "뱃지 케이스", exact: true })).toHaveCount(0);

    // A failed save leaves the last confirmed policy and switch state intact.
    const control = page.getByRole("switch", { name: "한 줄 소개 공개", exact: true });
    await page.route("**/profile", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await control.click();
    await expect(page.getByRole("region", { name: "프로필 공개 설정", exact: true }).getByRole("alert")).toContainText("공개 설정을 저장하지 못했습니다");
    await expect(control).toBeChecked();
    await page.unroute("**/profile");
    await control.click();
    await expect(control).not.toBeChecked();
    await visitor.reload();
    await expect(visitor.getByText(intro, { exact: true })).toHaveCount(0);

    for (const width of [1280, 874, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await visitor.setViewportSize({ width, height: 900 });
      for (const surface of [page, visitor]) expect(await surface.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    const lighting = await scene.getAttribute("data-lighting");
    await visitor.getByRole("button", { name: lighting === "day" ? "다크 테마" : "라이트 테마", exact: true }).click();
    await expect(scene).toHaveAttribute("data-lighting", lighting === "day" ? "night" : "day");
    await visitor.setViewportSize({ width: 1280, height: 900 });
    await visitor.screenshot({ path: test.info().outputPath("miniroom-visit.png") });
    await page.getByRole("switch", { name: "미니룸 공개", exact: true }).click();
    await expect(page.getByRole("switch", { name: "미니룸 공개", exact: true })).not.toBeChecked();
    await visitor.reload();
    await expect(visitor.getByRole("heading", { name: "방문할 수 없는 미니룸입니다", exact: true })).toBeVisible();
    await expect(visitor.getByTestId("profile-hero")).toHaveCount(0);
    await page.getByRole("tab", { name: "3D 미니룸", exact: true }).click();
    await expect(page.getByRole("button", { name: "방 꾸미기", exact: true })).toBeVisible();
    await visitor.goto("/profile/not-a-player");
    await expect(visitor.getByTestId("profile-hero")).toHaveCount(0);
    const signedOutContext = await browser.newContext();
    try {
      const signedOut = await signedOutContext.newPage();
      await signedOut.goto(visitUrl);
      await expect(signedOut).toHaveURL(/\/sign-in\?next=/);
    } finally { await signedOutContext.close(); }
  } finally { await visitorContext.close(); await f.cleanup(); }
});
