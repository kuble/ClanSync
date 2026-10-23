import { expect, test, type CDPSession, type Locator, type Page } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000, viewport: { width: 1280, height: 1500 } });

type Point = { x: number; y: number };

function room(housing: Locator) {
  return housing.getByRole("group", { name: "나의 방", exact: true });
}

function furniture(housing: Locator, id: string) {
  return room(housing).locator(`[data-inventory-id="${id}"]`);
}

async function point(locator: Locator, vertical = .5): Promise<Point> {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  return { x: bounds!.x + bounds!.width / 2, y: bounds!.y + bounds!.height * vertical };
}

function tile(housing: Locator, x: number, y: number) {
  return housing.getByRole("button", { name: `배치 위치 ${x + 1}열 ${y + 1}행`, exact: true });
}

async function dragPoints(housing: Locator, id: string, targetX: number, targetY: number) {
  const model = furniture(housing, id);
  const x = Number(await model.getAttribute("data-x"));
  const y = Number(await model.getAttribute("data-y"));
  const start = await point(model, .8); // The solid flowerpot, below the open leaves.
  const origin = await point(tile(housing, x, y));
  const target = await point(tile(housing, targetX, targetY));
  return { start, end: { x: start.x + target.x - origin.x, y: start.y + target.y - origin.y } };
}

async function mouseStart(page: Page, start: Point, end: Point) {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
}

async function touchStart(cdp: CDPSession, start: Point, end: Point) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 1, radiusX: 5, radiusY: 5 }] });
  for (let step = 1; step <= 12; step++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: start.x + (end.x - start.x) * step / 12, y: start.y + (end.y - start.y) * step / 12, id: 1, radiusX: 5, radiusY: 5 }],
    });
  }
}

async function expectPosition(housing: Locator, id: string, x: number, y: number) {
  await expect(furniture(housing, id)).toHaveAttribute("data-x", String(x));
  await expect(furniture(housing, id)).toHaveAttribute("data-y", String(y));
}

test("마우스·터치로 가구를 이동하고 보관함에서 다시 꺼내며 잘못된 드롭·취소는 원래 배치를 유지한다", async ({ page, browser, baseURL }) => {
  test.setTimeout(180_000);
  const fixture = await createIsolatedBalanceFixture(1);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let mobile: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  try {
    const owner = fixture.users[0];
    await loginIsolatedBalanceUser(page, owner);
    await page.goto("/profile");
    const housing = page.getByRole("region", { name: "프로필 하우징", exact: true });
    await expect(room(housing)).toHaveAttribute("data-renderer", "webgl");
    const inventory = await fixture.service.from("user_housing_inventory").select("id,catalog_id").eq("user_id", owner.id);
    expect(inventory.error).toBeNull();
    const plantId = inventory.data!.find((item) => item.catalog_id === "small-plant")!.id;
    await housing.getByRole("button", { name: "방 꾸미기", exact: true }).click();
    await room(housing).scrollIntoViewIfNeeded();

    // Real model picking and pointer capture preserve the original grab offset.
    const first = await dragPoints(housing, plantId, 4, 4);
    await mouseStart(page, first.start, first.end);
    await expect(housing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await page.mouse.up();
    await expectPosition(housing, plantId, 4, 4);
    await expect(housing.getByTestId("housing-drag-preview")).toHaveCount(0);

    const overlap = await dragPoints(housing, plantId, 1, 1);
    await mouseStart(page, overlap.start, overlap.end);
    await expect(housing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "false");
    await page.mouse.up();
    await expectPosition(housing, plantId, 4, 4);

    const outsideStart = await point(furniture(housing, plantId), .8);
    const sceneBounds = await room(housing).boundingBox();
    await mouseStart(page, outsideStart, { x: sceneBounds!.x + 8, y: sceneBounds!.y + 8 });
    await page.mouse.up();
    await expectPosition(housing, plantId, 4, 4);

    const escape = await dragPoints(housing, plantId, 3, 4);
    await mouseStart(page, escape.start, escape.end);
    await expect(housing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expectPosition(housing, plantId, 4, 4);
    await expect(housing.getByTestId("housing-drag-preview")).toHaveCount(0);

    // A stored item can be retrieved directly without choosing coordinates.
    await housing.getByRole("button", { name: "가구 보관", exact: true }).click();
    await expect(furniture(housing, plantId)).toHaveCount(0);
    await housing.getByRole("button", { name: "작은 화분 꺼내기", exact: true }).click();
    await expect(furniture(housing, plantId)).toBeVisible();
    await housing.getByRole("button", { name: "가구 보관", exact: true }).click();
    const handle = housing.getByRole("button", { name: "작은 화분 끌어서 배치", exact: true });
    await handle.scrollIntoViewIfNeeded();
    const handleStart = await point(handle);
    const handleEnd = await point(tile(housing, 4, 4));
    await mouseStart(page, handleStart, handleEnd);
    await expect(housing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await page.mouse.up();
    await expectPosition(housing, plantId, 4, 4);
    await housing.getByRole("button", { name: "방 저장", exact: true }).click();
    await expect(housing.getByRole("button", { name: "방 꾸미기", exact: true })).toBeVisible();
    await page.reload();
    await expectPosition(housing, plantId, 4, 4);

    mobile = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, storageState: await page.context().storageState() });
    const touchPage = await mobile.newPage();
    touchPage.on("pageerror", (error) => errors.push(error.message));
    await touchPage.goto("/profile");
    const touchHousing = touchPage.getByRole("region", { name: "프로필 하우징", exact: true });
    await expect(room(touchHousing)).toHaveAttribute("data-renderer", "webgl");
    await touchHousing.getByRole("button", { name: "방 꾸미기", exact: true }).tap();
    await room(touchHousing).scrollIntoViewIfNeeded();
    const cdp = await mobile.newCDPSession(touchPage);
    const touch = await dragPoints(touchHousing, plantId, 4, 2);
    const scrollBefore = await touchPage.evaluate(() => window.scrollY);
    await touchStart(cdp, touch.start, touch.end);
    await expect(touchHousing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expectPosition(touchHousing, plantId, 4, 2);
    expect(Math.abs(await touchPage.evaluate(() => window.scrollY) - scrollBefore)).toBeLessThan(2);

    const cancelled = await dragPoints(touchHousing, plantId, 4, 4);
    await touchStart(cdp, cancelled.start, cancelled.end);
    await expect(touchHousing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await expectPosition(touchHousing, plantId, 4, 2);
    await expect(touchHousing.getByTestId("housing-drag-preview")).toHaveCount(0);

    await touchHousing.getByRole("button", { name: "방 저장", exact: true }).tap();
    await touchHousing.getByRole("button", { name: "방 꾸미기", exact: true }).tap();
    await touchHousing.getByRole("list", { name: "보유 가구", exact: true }).getByRole("button", { name: "작은 화분 선택", exact: true }).tap();

    await touchHousing.getByRole("button", { name: "가구 보관", exact: true }).tap();
    await expect(furniture(touchHousing, plantId)).toHaveCount(0);
    await touchHousing.getByRole("button", { name: "작은 화분 꺼내기", exact: true }).tap();
    await expect(furniture(touchHousing, plantId)).toBeVisible();

    // A short phone viewport cannot show the shelf and the whole room together.
    // Holding the actual touch at the upper edge brings the room into reach.
    await touchPage.setViewportSize({ width: 390, height: 568 });
    await touchHousing.getByRole("button", { name: "가구 보관", exact: true }).tap();
    const touchHandle = touchHousing.getByRole("button", { name: "작은 화분 끌어서 배치", exact: true });
    await touchHandle.scrollIntoViewIfNeeded();
    const shelfStart = await point(touchHandle);
    expect((await room(touchHousing).boundingBox())!.y).toBeLessThan(0);
    await touchStart(cdp, shelfStart, { x: shelfStart.x, y: 12 });
    await expect.poll(async () => (await room(touchHousing).boundingBox())!.y).toBeGreaterThanOrEqual(60);
    const dropPoint = await point(tile(touchHousing, 4, 4));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...dropPoint, id: 1, radiusX: 5, radiusY: 5 }] });
    await expect(touchHousing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expectPosition(touchHousing, plantId, 4, 4);

    const restoredX = await furniture(touchHousing, plantId).getAttribute("data-x");
    const restoredY = await furniture(touchHousing, plantId).getAttribute("data-y");
    await touchHousing.getByRole("button", { name: "방 저장", exact: true }).tap();
    await expect(touchHousing.getByRole("button", { name: "방 꾸미기", exact: true })).toBeVisible();
    await touchPage.reload();
    await expect(furniture(touchHousing, plantId)).toHaveAttribute("data-x", restoredX!);
    await expect(furniture(touchHousing, plantId)).toHaveAttribute("data-y", restoredY!);
    expect(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(touchHousing.getByTestId("housing-coin-balance")).toHaveText("0");
    const ledger = await fixture.service.from("coin_transactions").select("id").eq("user_id", owner.id);
    expect(ledger.error).toBeNull();
    expect(ledger.data).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await mobile?.close();
    await fixture.cleanup();
  }
});
