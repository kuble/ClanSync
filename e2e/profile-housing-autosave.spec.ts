import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("내 가구의 벽지·바닥 샘플을 적용하고 자동 저장·실패 재시도·충돌 복구·모바일을 유지한다", async ({ page }, info) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(1);
  let release: (() => void) | undefined;
  try {
    await loginIsolatedBalanceUser(page, f.users[0]); await page.goto("/profile");
    const housing = page.getByRole("region", { name: "프로필 하우징", exact: true });
    const stage = housing.getByTestId("housing-room-stage");
    await housing.getByRole("button", { name: "방 꾸미기", exact: true }).click();
    await expect(housing.getByRole("button", { name: "방 저장", exact: true })).toHaveCount(0);
    await expect(housing.getByRole("button", { name: "방 분위기", exact: true })).toHaveCount(0);
    await housing.getByRole("button", { name: "내 가구", exact: true }).click();
    const panel = housing.getByRole("region", { name: "내 가구 보관함", exact: true });
    const categories = panel.getByRole("group", { name: "내 가구 분류", exact: true });
    const status = housing.getByRole("status", { name: "방 저장 상태", exact: true });
    const read = async () => (await f.service.from("user_housing_rooms").select("revision,wallpaper,floor").eq("user_id", f.users[0].id).single()).data!;
    await categories.getByRole("button", { name: "벽지", exact: true }).click();
    await expect(panel.getByRole("list", { name: "벽지 목록", exact: true }).getByRole("button")).toHaveCount(4);
    await expect(panel.locator('[data-material="wallpaper"]')).toHaveCount(4);
    await panel.getByRole("button", { name: "세이지 벽지 적용", exact: true }).click();
    await panel.getByRole("button", { name: "로즈 벽지 적용", exact: true }).click();
    await categories.getByRole("button", { name: "바닥", exact: true }).click();
    await panel.getByRole("button", { name: "아이보리 타일 바닥 적용", exact: true }).click();
    await expect(status).toHaveText("자동 저장됨");
    expect(await read()).toMatchObject({ wallpaper: "rose", floor: "ivory" });

    let fail = true, hold = false; let arrival: (() => void) | undefined;
    await page.route("**/profile", async route => {
      if (route.request().method() !== "POST") return route.continue();
      if (fail) { fail = false; return route.fulfill({ status: 503, contentType: "text/plain", body: "Temporary test outage" }); }
      if (hold) { hold = false; const blocked = new Promise<void>(done => { release = done; }); arrival?.(); await blocked; }
      return route.continue();
    });
    await categories.getByRole("button", { name: "벽지", exact: true }).click();
    await panel.getByRole("button", { name: "세이지 벽지 적용", exact: true }).click();
    await expect(housing.getByRole("alert")).toBeVisible();
    await expect(panel.getByRole("button", { name: "세이지 벽지 적용", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(stage).toHaveAttribute("data-wallpaper", "sage");
    expect((await read()).wallpaper).toBe("rose");
    await housing.getByRole("button", { name: "자동 저장 다시 시도", exact: true }).click();
    await expect(status).toHaveText("자동 저장됨"); expect((await read()).wallpaper).toBe("sage");

    hold = true; const arrived = new Promise<void>(done => { arrival = done; });
    await panel.getByRole("button", { name: "미드나잇 벽지 적용", exact: true }).click(); await arrived;
    await categories.getByRole("button", { name: "바닥", exact: true }).click();
    const walnut = panel.getByRole("button", { name: "짙은 원목 바닥 적용", exact: true });
    await expect(walnut).toBeEnabled(); await walnut.click();
    await expect(stage).toHaveAttribute("data-floor", "walnut");
    release!(); release = undefined;
    await expect(status).toHaveText("자동 저장됨");
    expect(await read()).toMatchObject({ wallpaper: "midnight", floor: "walnut" });
    await page.unroute("**/profile");

    const revision = (await read()).revision;
    expect((await f.service.from("user_housing_rooms").update({ revision: revision + 1, wallpaper: "cream" }).eq("user_id", f.users[0].id)).error).toBeNull();
    await categories.getByRole("button", { name: "벽지", exact: true }).click();
    await panel.getByRole("button", { name: "로즈 벽지 적용", exact: true }).click();
    await expect(housing.getByRole("alert")).toBeVisible();
    await expect(stage).toHaveAttribute("data-wallpaper", "rose");
    await housing.getByRole("button", { name: "최신 방 불러오기", exact: true }).click();
    await page.getByRole("dialog", { name: "변경 내용을 버릴까요?", exact: true }).getByRole("button", { name: "변경 내용 버리기", exact: true }).click();
    await expect(status).toHaveText("자동 저장됨"); await expect(stage).toHaveAttribute("data-wallpaper", "cream");
    await expect(housing.getByRole("alert")).toHaveCount(0);

    for (const width of [1280, 802, 390, 320]) {
      await page.setViewportSize({ width, height: 982 });
      await stage.scrollIntoViewIfNeeded();
      await categories.getByRole("button", { name: "벽지", exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const bounds = await panel.boundingBox(), outer = await stage.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(outer!.x); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(outer!.x + outer!.width);
      await page.screenshot({ path: info.outputPath("room-wallpaper-" + width + ".png") });
      await categories.getByRole("button", { name: "바닥", exact: true }).click();
      await page.screenshot({ path: info.outputPath("room-floor-" + width + ".png") });
    }
    await housing.getByRole("button", { name: "완료", exact: true }).click();
    await page.reload(); await expect(stage).toHaveAttribute("data-wallpaper", "cream"); await expect(stage).toHaveAttribute("data-floor", "walnut");
  } finally { release?.(); await f.cleanup(); }
});

test("계정 전환 뒤 이전 화면의 자동 저장은 새 계정의 방을 바꾸지 않는다", async ({ page, browser }) => {
  const f = await createIsolatedBalanceFixture(2);
  const other = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  try {
    await loginIsolatedBalanceUser(page, f.users[0]); await page.goto("/profile");
    const housing = page.getByRole("region", { name: "프로필 하우징", exact: true });
    await housing.getByRole("button", { name: "방 꾸미기", exact: true }).click();
    await housing.getByRole("button", { name: "내 가구", exact: true }).click();
    await housing.getByRole("group", { name: "내 가구 분류", exact: true }).getByRole("button", { name: "벽지", exact: true }).click();
    const second = await other.newPage();
    await loginIsolatedBalanceUser(second, f.users[1]); await second.goto("/profile");
    await expect(second.getByRole("button", { name: "방 꾸미기", exact: true })).toBeVisible();
    const read = async () => (await f.service.from("user_housing_rooms").select("revision,wallpaper,floor").eq("user_id", f.users[1].id).single()).data!;
    const before = await read();
    // Replace only the session; retain the previous account's mounted editor.
    await page.context().clearCookies(); await page.context().addCookies(await other.cookies());
    await housing.getByRole("button", { name: "로즈 벽지 적용", exact: true }).click();
    await expect(housing.getByRole("alert")).toHaveText("로그인한 계정이 변경되었습니다. 프로필을 다시 열어 주세요.");
    await expect(housing.getByTestId("housing-room-stage")).toHaveAttribute("data-wallpaper", "rose");
    expect(await read()).toEqual(before);
  } finally { await other.close(); await f.cleanup(); }
});
