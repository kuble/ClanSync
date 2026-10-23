import { expect, test, type Locator, type Page } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

async function point(target: Locator, y = .5) {
  const box = await target.boundingBox(); expect(box).not.toBeNull();
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height * y };
}
async function hold(page: Page, target: Locator) {
  const start = await point(target, .8);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await expect(page.getByTestId("housing-carried-furniture")).toBeVisible();
  await expect(target).toHaveAttribute("aria-pressed", "true");
  return start;
}

test("길게 집은 가구를 커서로 옮기고 하단 보관함에 넣거나 꺼내 놓으면 조작을 자동 종료한다", async ({ page }, info) => {
  test.setTimeout(90_000);
  const f = await createIsolatedBalanceFixture(1);
  try {
    await loginIsolatedBalanceUser(page, f.users[0]); await page.goto("/profile");
    const housing = page.getByRole("region", { name: "프로필 하우징", exact: true });
    const stage = housing.getByTestId("housing-room-stage");
    await expect(stage).toHaveAttribute("data-renderer", "webgl");
    const owned = (await f.service.from("user_housing_inventory").select("id,catalog_id,x,y").eq("user_id", f.users[0].id)).data!;
    const plant = owned.find(item => item.catalog_id === "small-plant")!;
    const model = () => stage.locator(`[data-inventory-id="${plant.id}"]`);
    const read = async () => (await f.service.from("user_housing_inventory").select("x,y,rotation,surface").eq("id", plant.id).single()).data!;
    await expect(housing.getByRole("button", { name: "방 꾸미기", exact: true })).toHaveCount(0);
    await expect(housing.getByRole("status", { name: "방 저장 상태", exact: true })).toHaveCount(0);
    await stage.scrollIntoViewIfNeeded();
    const short = await point(model(), .8); await page.mouse.click(short.x, short.y);
    await expect(stage).toHaveAttribute("data-editing", "false");
    const start = await hold(page, model());
    const drawer = housing.getByRole("region", { name: "내 가구 보관함", exact: true });
    await expect(drawer).toBeVisible();
    const rect = await stage.boundingBox(), panel = await drawer.boundingBox();
    expect(Math.abs(rect!.y + rect!.height - panel!.y - panel!.height)).toBeLessThan(2);
    const origin = await point(stage.getByRole("button", { name: `배치 위치 ${plant.x! + 1}열 ${plant.y! + 1}행`, exact: true }));
    const target = stage.getByRole("button", { name: "배치 위치 6열 3행", exact: true });
    await expect(target).toHaveAttribute("data-valid", "true");
    const targetPoint = await point(target);
    const end = { x: start.x + targetPoint.x - origin.x, y: start.y + targetPoint.y - origin.y };
    await page.mouse.move(end.x, end.y, { steps: 12 });
    await expect(housing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await page.screenshot({ path: info.outputPath("carrying-desktop.png"), animations: "disabled" });
    await page.mouse.up();
    await expect(stage).toHaveAttribute("data-editing", "false"); await expect(drawer).toHaveCount(0);
    await expect.poll(read).not.toMatchObject({ x: plant.x, y: plant.y });
    const placed = await read();

    // Releasing a stationary hold keeps the furniture attached until the next placement.
    await hold(page, model()); await page.mouse.up();
    await expect(housing.getByTestId("housing-carried-furniture")).toBeVisible();
    const original = await point(model(), .8);
    await page.mouse.click(original.x, original.y);
    await expect(stage).toHaveAttribute("data-editing", "false"); expect(await read()).toEqual(placed);
    await hold(page, model()); await page.mouse.up();
    await page.keyboard.press("Escape"); await expect(stage).toHaveAttribute("data-editing", "false");
    expect(await read()).toEqual(placed);

    await hold(page, model());
    const store = await point(drawer.locator("[data-housing-store]"));
    await page.mouse.move(store.x, store.y, { steps: 12 });
    await expect(housing.getByTestId("housing-drag-preview")).toHaveText("보관함에 넣기");
    await page.mouse.up(); await expect(stage).toHaveAttribute("data-editing", "false");
    await expect.poll(read).toMatchObject({ x: null, y: null });

    await housing.getByRole("button", { name: "내 가구", exact: true }).click();
    await drawer.getByRole("button", { name: /작은 화분 꺼내기/ }).click();
    await expect(housing.getByTestId("housing-carried-furniture")).toBeVisible();
    expect(await read()).toMatchObject({ x: null, y: null });
    const position = stage.getByRole("button", { name: `배치 위치 ${placed.x! + 1}열 ${placed.y! + 1}행`, exact: true });
    await position.focus(); await position.press("Enter");
    await expect(stage).toHaveAttribute("data-editing", "false");
    await expect.poll(read).toMatchObject(placed);
    await page.reload(); await expect(model()).toHaveAttribute("data-x", String(placed.x));
  } finally { await page.mouse.up(); await f.cleanup(); }
});

test("모바일 길게 누르기·보관함 꺼내기와 짧은 터치 취소, 간편 보기·벽 가구·키보드를 유지한다", async ({ page, context }, info) => {
  test.setTimeout(90_000);
  const f = await createIsolatedBalanceFixture(1);
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginIsolatedBalanceUser(page, f.users[0]); await page.goto("/profile");
    const housing = page.getByRole("region", { name: "프로필 하우징", exact: true });
    const stage = housing.getByTestId("housing-room-stage");
    await expect(stage).toHaveAttribute("data-renderer", "webgl"); await stage.scrollIntoViewIfNeeded();
    const owned = (await f.service.from("user_housing_inventory").select("id,catalog_id,x,y,surface").eq("user_id", f.users[0].id)).data!;
    const plant = owned.find(item => item.catalog_id === "small-plant")!;
    const model = (id: string) => stage.locator(`[data-inventory-id="${id}"]`);
    const cdp = await context.newCDPSession(page);
    const touch = async (type: "touchStart" | "touchMove" | "touchEnd" | "touchCancel", location?: { x: number; y: number }) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: location ? [{ ...location, id: 1, radiusX: 5, radiusY: 5 }] : [] });
    const start = await point(model(plant.id), .8);
    await touch("touchStart", start); await touch("touchEnd"); await page.waitForTimeout(550);
    await expect(stage).toHaveAttribute("data-editing", "false");
    await touch("touchStart", start); await expect(housing.getByTestId("housing-carried-furniture")).toBeVisible();
    const drawer = housing.getByRole("region", { name: "내 가구 보관함", exact: true });
    await page.screenshot({ path: info.outputPath("carrying-mobile-390.png"), animations: "disabled" });
    const store = await point(drawer.locator("[data-housing-store]"));
    await touch("touchMove", store); await touch("touchEnd");
    await expect(stage).toHaveAttribute("data-editing", "false"); await expect(model(plant.id)).toHaveCount(0);
    await housing.getByRole("button", { name: "내 가구", exact: true }).click();
    const plantCard = drawer.getByRole("list", { name: "보유 가구", exact: true }).getByRole("button", { name: "작은 화분 선택", exact: true });
    await plantCard.scrollIntoViewIfNeeded();
    const cardPoint = await point(plantCard);
    await touch("touchStart", cardPoint); await touch("touchEnd");
    await expect(housing.getByTestId("housing-carried-furniture")).toBeVisible();
    const freeTile = stage.getByRole("button", { name: "배치 위치 6열 3행", exact: true });
    await freeTile.focus(); await freeTile.press("Enter");
    await expect(stage).toHaveAttribute("data-editing", "false");
    await expect(model(plant.id)).toHaveAttribute("data-x", "5");

    // The same affordances work without WebGL, including wall-specific placement and cancellation.
    await stage.locator("canvas").evaluate(canvas => { (canvas as HTMLCanvasElement).getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext(); });
    await expect(stage).toHaveAttribute("data-renderer", "fallback");
    const clock = owned.find(item => item.catalog_id === "wall-clock")!;
    await model(clock.id).focus(); await model(clock.id).press("Enter");
    await expect(housing.getByTestId("housing-carried-furniture")).toBeVisible();
    await model(clock.id).press("Delete"); await expect(stage).toHaveAttribute("data-editing", "false");
    await housing.getByRole("button", { name: "내 가구", exact: true }).click();
    await drawer.getByRole("button", { name: /벽시계 꺼내기/ }).click();
    const target = stage.getByRole("button", { name: `${clock.surface === "wall-left" ? "왼쪽" : "오른쪽"} 벽 배치 위치 ${clock.x! + 1}열 ${clock.y! + 1}행`, exact: true });
    await target.focus(); await target.press("Enter");
    await expect(model(clock.id)).toHaveAttribute("data-surface", clock.surface);
    await expect(stage).toHaveAttribute("data-editing", "false");
    for (const width of [802, 320]) {
      await page.setViewportSize({ width, height: 982 });
      await housing.getByRole("button", { name: "내 가구", exact: true }).click();
      await expect(drawer).toBeVisible(); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: info.outputPath("drawer-" + width + ".png"), animations: "disabled" });
      await drawer.getByRole("button", { name: "패널 닫기", exact: true }).click();
    }
    await cdp.detach();
  } finally { await f.cleanup(); }
});
