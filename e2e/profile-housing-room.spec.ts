import { expect, test, type Locator, type Page } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000, viewport: { width: 1280, height: 900 } });

type Surface = "floor" | "wall-left" | "wall-right";

async function center(locator: Locator, vertical = .5) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height * vertical };
}

async function inside(stage: Locator, overlay: Locator) {
  const outer = await stage.boundingBox();
  const inner = await overlay.boundingBox();
  expect(outer).not.toBeNull();
  expect(inner).not.toBeNull();
  expect(inner!.x).toBeGreaterThanOrEqual(outer!.x - 1);
  expect(inner!.y).toBeGreaterThanOrEqual(outer!.y - 1);
  expect(inner!.x + inner!.width).toBeLessThanOrEqual(outer!.x + outer!.width + 1);
  expect(inner!.y + inner!.height).toBeLessThanOrEqual(outer!.y + outer!.height + 1);
}

async function setLightTheme(page: Page, light: boolean) {
  const toggle = page.getByRole("button", { name: "라이트 테마", exact: true });
  if ((await toggle.getAttribute("aria-pressed") === "true") !== light) await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", String(light));
}

test("방 안에서 벽 가구를 옮기고 우클릭으로 회전·보관하며 앱 테마에 맞춰 낮과 밤을 표시한다", async ({ page }) => {
  test.setTimeout(180_000);
  const fixture = await createIsolatedBalanceFixture(1);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const owner = fixture.users[0];
    await loginIsolatedBalanceUser(page, owner);
    await page.goto("/profile");
    const housing = page.getByRole("region", { name: "프로필 하우징", exact: true });
    const stage = housing.getByTestId("housing-room-stage");
    await expect(stage).toHaveAttribute("data-renderer", "webgl");
    const model = (id: string) => stage.locator(`[data-inventory-id="${id}"]`);
    const [catalogResult, inventoryResult] = await Promise.all([
      fixture.service.from("housing_catalog").select("id,name,width,depth"),
      fixture.service.from("user_housing_inventory").select("id,catalog_id,x,y,rotation,surface").eq("user_id", owner.id),
    ]);
    expect(catalogResult.error).toBeNull();
    expect(inventoryResult.error).toBeNull();
    const catalog = catalogResult.data!;
    const inventory = inventoryResult.data!;
    expect(catalog).toHaveLength(23);
    expect(inventory).toHaveLength(10);
    expect(inventory.filter((item) => item.surface !== "floor").map((item) => item.catalog_id).sort()).toEqual([
      "wall-art-botanical", "wall-art-mini", "wall-art-sun", "wall-clock", "wall-curtains", "wall-shelf", "wall-window",
    ]);
    for (const item of inventory) {
      await expect(model(item.id)).toHaveAttribute("data-surface", item.surface);
    }
    await expect(housing.getByRole("complementary", { name: "방 소개", exact: true })).toHaveCount(0);
    await expect(housing.getByRole("combobox", { name: "가구 위치 열", exact: true })).toHaveCount(0);
    await expect(housing.getByText("MY LITTLE ROOM", { exact: true })).toHaveCount(0);

    await setLightTheme(page, true);
    await expect(stage).toHaveAttribute("data-lighting", "day");
    const daylight = await stage.locator("canvas").screenshot();
    await setLightTheme(page, false);
    await expect(stage).toHaveAttribute("data-lighting", "night");
    await expect(async () => expect((await stage.locator("canvas").screenshot()).equals(daylight)).toBe(false)).toPass();
    await setLightTheme(page, true);

    await stage.getByRole("button", { name: "방 꾸미기", exact: true }).click();
    await expect(stage.getByRole("button", { name: "가구 상점", exact: true })).toHaveCount(0);
    for (const name of ["내 가구", "완료"]) {
      await inside(stage, stage.getByRole("button", { name, exact: true }));
    }
    await stage.getByRole("button", { name: "내 가구", exact: true }).click();
    await stage.getByRole("group", { name: "내 가구 분류", exact: true }).getByRole("button", { name: "벽지", exact: true }).click();
    const wallpaper = stage.getByRole("button", { name: "미드나잇 벽지 적용", exact: true });
    await inside(stage, wallpaper);
    await wallpaper.click();
    await expect(stage).toHaveAttribute("data-wallpaper", "midnight");
    await expect(stage).toHaveAttribute("data-lighting", "day");
    await stage.getByRole("button", { name: "패널 닫기", exact: true }).click();

    const plant = inventory.find((item) => item.catalog_id === "small-plant")!;
    const plantPoint = await center(model(plant.id), .8);
    await page.mouse.click(plantPoint.x, plantPoint.y, { button: "right" });
    const context = stage.getByRole("menu");
    await expect(context).toBeVisible();
    await inside(stage, context);
    await context.getByRole("menuitem", { name: "가구 회전", exact: true }).click();
    await expect(model(plant.id)).toHaveAttribute("data-rotation", "1");

    const clock = inventory.find((item) => item.catalog_id === "wall-clock")!;
    const clockName = catalog.find((item) => item.id === "wall-clock")!.name;
    const clockPoint = await center(model(clock.id));
    await page.mouse.click(clockPoint.x, clockPoint.y, { button: "right" });
    await expect(context).toBeVisible();
    await expect(context.getByRole("menuitem", { name: "가구 회전", exact: true })).toHaveCount(0);
    await context.getByRole("menuitem", { name: "가구 보관", exact: true }).click();
    await expect(model(clock.id)).toHaveCount(0);
    await stage.getByRole("button", { name: "내 가구", exact: true }).click();
    await stage.getByRole("group", { name: "내 가구 분류", exact: true }).getByRole("button", { name: "가구", exact: true }).click();
    const owned = stage.getByRole("list", { name: "보유 가구", exact: true });
    await inside(stage, owned);
    await owned.getByRole("button", { name: `${clockName} 꺼내기`, exact: true }).click();
    const closePanel = stage.getByRole("button", { name: "패널 닫기", exact: true });
    if (await closePanel.isVisible()) await closePanel.click();
    await expect(model(clock.id)).toHaveAttribute("data-rotation", "0");
    await model(clock.id).press("Enter");

    const clockSurface = await model(clock.id).getAttribute("data-surface");
    const targetSurface: Surface = clockSurface === "wall-left" ? "wall-right" : "wall-left";
    const occupied = new Set<string>();
    for (const item of inventory.filter((entry) => entry.id !== clock.id && entry.surface === targetSurface)) {
      const shape = catalog.find((entry) => entry.id === item.catalog_id)!;
      for (let dx = 0; dx < shape.width; dx++) for (let dy = 0; dy < shape.depth; dy++) {
        occupied.add(`${item.x! + dx}/${item.y! + dy}`);
      }
    }
    const anchor = Array.from({ length: 24 }, (_, index) => ({ x: index % 6, y: Math.floor(index / 6) })).find(({ x, y }) => !occupied.has(`${x}/${y}`))!;
    expect(anchor).toBeDefined();
    const wallName = targetSurface === "wall-left" ? "왼쪽 벽" : "오른쪽 벽";
    const target = stage.getByRole("button", { name: `${wallName} 배치 위치 ${anchor.x + 1}열 ${anchor.y + 1}행`, exact: true });
    const start = await center(model(clock.id));
    const end = await center(target);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 15 });
    await expect(stage.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await page.mouse.up();
    await expect(model(clock.id)).toHaveAttribute("data-surface", targetSurface);
    await expect(model(clock.id)).toHaveAttribute("data-x", String(anchor.x));
    await expect(model(clock.id)).toHaveAttribute("data-y", String(anchor.y));
    await expect(model(clock.id)).toHaveAttribute("aria-pressed", "false");

    await stage.getByRole("button", { name: "완료", exact: true }).click();
    await expect(stage.getByRole("button", { name: "방 꾸미기", exact: true })).toBeVisible();
    await page.reload();
    await expect(model(clock.id)).toHaveAttribute("data-surface", targetSurface);
    await expect(model(clock.id)).toHaveAttribute("data-x", String(anchor.x));
    await expect(model(clock.id)).toHaveAttribute("data-y", String(anchor.y));
    await expect(model(clock.id)).toHaveAttribute("data-rotation", "0");
    await expect(model(plant.id)).toHaveAttribute("data-rotation", "1");
    await expect(stage).toHaveAttribute("data-wallpaper", "midnight");
    await expect(stage).toHaveAttribute("data-lighting", "day");
    await expect(housing.getByTestId("housing-coin-balance")).toHaveText("0");
    expect(errors).toEqual([]);
  } finally {
    await fixture.cleanup();
  }
});
