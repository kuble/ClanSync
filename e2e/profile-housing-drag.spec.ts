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

async function openInventory(housing: Locator) {
  if (!await housing.getByRole("list", { name: "보유 가구", exact: true }).isVisible()) {
    await housing.getByRole("button", { name: "내 가구", exact: true }).click();
  }
}

async function closePanel(housing: Locator) {
  const close = housing.getByRole("button", { name: "패널 닫기", exact: true });
  if (await close.isVisible()) await close.click();
}

async function storeFromMenu(housing: Locator, touch = false) {
  const open = housing.getByRole("button", { name: "가구 메뉴 열기", exact: true });
  const store = housing.getByRole("menuitem", { name: "가구 보관", exact: true });
  if (touch) { await open.tap(); await store.tap(); }
  else { await open.click(); await store.click(); }
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

test("보기 모드의 가구를 길게 누르면 같은 마우스·터치로 바로 이동하고, 짧은 탭·스크롤·취소는 편집을 시작하지 않는다", async ({ page, browser, baseURL }) => {
  test.setTimeout(120_000);
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
    const originalX = Number(await furniture(housing, plantId).getAttribute("data-x"));
    const originalY = Number(await furniture(housing, plantId).getAttribute("data-y"));
    await room(housing).scrollIntoViewIfNeeded();
    const start = await point(furniture(housing, plantId), .8);
    const stillViewing = async () => {
      // Wait past the hold threshold so an orphaned timer cannot pass unnoticed.
      await page.waitForTimeout(650);
      await expect(room(housing)).toHaveAttribute("data-editing", "false");
      await expect(housing.getByTestId("housing-drag-preview")).toHaveCount(0);
      await expectPosition(housing, plantId, originalX, originalY);
    };

    await page.mouse.click(start.x, start.y);
    await stillViewing();
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 12, start.y);
    await stillViewing();
    await page.mouse.up();

    for (const cancel of ["escape", "blur"] as const) {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      if (cancel === "escape") await page.keyboard.press("Escape");
      else await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await stillViewing();
      await page.mouse.up();
    }
    const bounds = await room(housing).boundingBox();
    await page.mouse.move(bounds!.x + 12, bounds!.y + bounds!.height - 12);
    await page.mouse.down();
    await stillViewing();
    await page.mouse.up();

    // The original pointer stays down across the mode change and the drop.
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await expect(room(housing)).toHaveAttribute("data-editing", "true");
    const mouseDrop = await dragPoints(housing, plantId, 4, 4);
    await page.mouse.move(mouseDrop.end.x, mouseDrop.end.y, { steps: 12 });
    await expect(housing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await page.mouse.up();
    await expectPosition(housing, plantId, 4, 4);
    await expect(furniture(housing, plantId)).toHaveAttribute("aria-pressed", "false");
    await housing.getByRole("button", { name: "완료", exact: true }).click();
    await expect(room(housing)).toHaveAttribute("data-editing", "false");
    await page.reload();
    await expectPosition(housing, plantId, 4, 4);

    mobile = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, storageState: await page.context().storageState() });
    const touchPage = await mobile.newPage();
    touchPage.on("pageerror", (error) => errors.push(error.message));
    await touchPage.goto("/profile");
    const touchHousing = touchPage.getByRole("region", { name: "프로필 하우징", exact: true });
    await expect(room(touchHousing)).toHaveAttribute("data-renderer", "webgl");
    const cdp = await mobile.newCDPSession(touchPage);
    const touchDown = async (at: Point) => cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...at, id: 1, radiusX: 5, radiusY: 5 }] });
    await room(touchHousing).scrollIntoViewIfNeeded();
    const quickTouch = await point(furniture(touchHousing, plantId), .8);
    await touchDown(quickTouch);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await touchPage.waitForTimeout(650);
    await expect(room(touchHousing)).toHaveAttribute("data-editing", "false");

    await touchDown(quickTouch);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await touchPage.waitForTimeout(650);
    await expect(room(touchHousing)).toHaveAttribute("data-editing", "false");

    // An ordinary swipe over furniture must still scroll the page in view mode.
    const scrollBeforeSwipe = await touchPage.evaluate(() => window.scrollY);
    await touchDown(quickTouch);
    for (let step = 1; step <= 6; step++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: quickTouch.x, y: quickTouch.y - step * 15, id: 1, radiusX: 5, radiusY: 5 }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await touchPage.waitForTimeout(650);
    await expect(room(touchHousing)).toHaveAttribute("data-editing", "false");
    expect(await touchPage.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBeforeSwipe + 15);
    await expectPosition(touchHousing, plantId, 4, 4);

    await room(touchHousing).scrollIntoViewIfNeeded();
    const touchStartPoint = await point(furniture(touchHousing, plantId), .8);
    const scrollBeforeHold = await touchPage.evaluate(() => window.scrollY);
    await touchDown(touchStartPoint);
    await expect(room(touchHousing)).toHaveAttribute("data-editing", "true");
    const touchDrop = await dragPoints(touchHousing, plantId, 4, 2);
    for (let step = 1; step <= 12; step++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: touchStartPoint.x + (touchDrop.end.x - touchStartPoint.x) * step / 12, y: touchStartPoint.y + (touchDrop.end.y - touchStartPoint.y) * step / 12, id: 1, radiusX: 5, radiusY: 5 }] });
    }
    await expect(touchHousing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expectPosition(touchHousing, plantId, 4, 2);
    expect(Math.abs(await touchPage.evaluate(() => window.scrollY) - scrollBeforeHold)).toBeLessThan(2);
    await touchHousing.getByRole("button", { name: "완료", exact: true }).tap();
    await expect(room(touchHousing)).toHaveAttribute("data-editing", "false");
    await touchPage.reload();
    await expectPosition(touchHousing, plantId, 4, 2);
    await expect(touchHousing.getByTestId("housing-coin-balance")).toHaveText("0");
    expect(errors).toEqual([]);
  } finally {
    await mobile?.close();
    await fixture.cleanup();
  }
});

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
    await closePanel(housing);
    await room(housing).scrollIntoViewIfNeeded();

    // Real model picking and pointer capture preserve the original grab offset.
    const first = await dragPoints(housing, plantId, 4, 4);
    await mouseStart(page, first.start, first.end);
    await expect(housing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await page.mouse.up();
    await expectPosition(housing, plantId, 4, 4);
    await expect(housing.getByTestId("housing-drag-preview")).toHaveCount(0);
    await expect(furniture(housing, plantId)).toHaveAttribute("aria-pressed", "false");
    await expect(housing.getByRole("button", { name: "가구 메뉴 열기", exact: true })).toHaveCount(0);
    await expect(tile(housing, 3, 4)).toBeDisabled();
    const empty = await point(tile(housing, 3, 4));
    await page.mouse.click(empty.x, empty.y);
    await expectPosition(housing, plantId, 4, 4);

    // Keyboard placement also ends selection; the focused furniture remains movable.
    await furniture(housing, plantId).press("Enter");
    await tile(housing, 3, 4).focus();
    await tile(housing, 3, 4).press("Enter");
    await expectPosition(housing, plantId, 3, 4);
    await expect(furniture(housing, plantId)).toHaveAttribute("aria-pressed", "false");
    await furniture(housing, plantId).press("ArrowRight");
    await expectPosition(housing, plantId, 4, 4);
    await expect(furniture(housing, plantId)).toHaveAttribute("aria-pressed", "false");

    const overlap = await dragPoints(housing, plantId, 1, 1);
    await mouseStart(page, overlap.start, overlap.end);
    await expect(housing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "false");
    await page.mouse.up();
    await expectPosition(housing, plantId, 4, 4);
    await expect(furniture(housing, plantId)).toHaveAttribute("aria-pressed", "true");

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
    await storeFromMenu(housing);
    await expect(furniture(housing, plantId)).toHaveCount(0);
    await openInventory(housing);
    await housing.getByRole("button", { name: "작은 화분 꺼내기", exact: true }).click();
    await closePanel(housing);
    await expect(furniture(housing, plantId)).toBeVisible();
    await expect(furniture(housing, plantId)).toHaveAttribute("aria-pressed", "false");
    await furniture(housing, plantId).press("Enter");
    await storeFromMenu(housing);
    await openInventory(housing);
    const handle = housing.getByRole("button", { name: "작은 화분 끌어서 배치", exact: true });
    await handle.scrollIntoViewIfNeeded();
    const handleStart = await point(handle);
    const handleEnd = await point(tile(housing, 4, 4));
    await mouseStart(page, handleStart, handleEnd);
    await expect(housing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await page.mouse.up();
    await expectPosition(housing, plantId, 4, 4);
    await housing.getByRole("button", { name: "완료", exact: true }).click();
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
    await closePanel(touchHousing);
    await room(touchHousing).scrollIntoViewIfNeeded();
    const cdp = await mobile.newCDPSession(touchPage);
    const touch = await dragPoints(touchHousing, plantId, 4, 2);
    const scrollBefore = await touchPage.evaluate(() => window.scrollY);
    await touchStart(cdp, touch.start, touch.end);
    await expect(touchHousing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expectPosition(touchHousing, plantId, 4, 2);
    await expect(furniture(touchHousing, plantId)).toHaveAttribute("aria-pressed", "false");
    await expect(touchHousing.getByRole("button", { name: "가구 메뉴 열기", exact: true })).toHaveCount(0);
    expect(Math.abs(await touchPage.evaluate(() => window.scrollY) - scrollBefore)).toBeLessThan(2);

    const cancelled = await dragPoints(touchHousing, plantId, 4, 4);
    await touchStart(cdp, cancelled.start, cancelled.end);
    await expect(touchHousing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await expectPosition(touchHousing, plantId, 4, 2);
    await expect(touchHousing.getByTestId("housing-drag-preview")).toHaveCount(0);
    await expect(furniture(touchHousing, plantId)).toHaveAttribute("aria-pressed", "true");
    await touchHousing.getByRole("button", { name: "가구 메뉴 열기", exact: true }).tap();
    await touchHousing.getByRole("menuitem", { name: "가구 회전", exact: true }).tap();
    await expect(furniture(touchHousing, plantId)).toHaveAttribute("data-rotation", "1");
    await expect(furniture(touchHousing, plantId)).toHaveAttribute("aria-pressed", "true");

    await touchHousing.getByRole("button", { name: "완료", exact: true }).tap();
    await touchHousing.getByRole("button", { name: "방 꾸미기", exact: true }).tap();
    await expect(touchHousing.getByRole("menu")).toHaveCount(0);
    await openInventory(touchHousing);
    await touchHousing.getByRole("list", { name: "보유 가구", exact: true }).getByRole("button", { name: "작은 화분 선택", exact: true }).tap();
    await closePanel(touchHousing);

    await storeFromMenu(touchHousing, true);
    await expect(furniture(touchHousing, plantId)).toHaveCount(0);
    await openInventory(touchHousing);
    await touchHousing.getByRole("button", { name: "작은 화분 꺼내기", exact: true }).tap();
    await closePanel(touchHousing);
    await expect(furniture(touchHousing, plantId)).toBeVisible();

    await expect(furniture(touchHousing, plantId)).toHaveAttribute("aria-pressed", "false");
    await furniture(touchHousing, plantId).press("Enter");

    // Inventory and its touch grip stay within the room on short phone screens.
    await touchPage.setViewportSize({ width: 390, height: 568 });
    await storeFromMenu(touchHousing, true);
    await openInventory(touchHousing);
    const touchHandle = touchHousing.getByRole("button", { name: "작은 화분 끌어서 배치", exact: true });
    await touchHandle.scrollIntoViewIfNeeded();
    const shelfStart = await point(touchHandle);
    const stage = await room(touchHousing).boundingBox();
    expect(shelfStart.x).toBeGreaterThan(stage!.x);
    expect(shelfStart.x).toBeLessThan(stage!.x + stage!.width);
    expect(shelfStart.y).toBeGreaterThan(stage!.y);
    expect(shelfStart.y).toBeLessThan(stage!.y + stage!.height);
    const dropPoint = await point(tile(touchHousing, 4, 4));
    // The new inventory shelf may cover the destination; move out before dropping back.
    await touchStart(cdp, shelfStart, { x: shelfStart.x, y: shelfStart.y - 48 });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...dropPoint, id: 1, radiusX: 5, radiusY: 5 }] });
    await expect(touchHousing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expectPosition(touchHousing, plantId, 4, 4);
    await expect(furniture(touchHousing, plantId)).toHaveAttribute("aria-pressed", "false");

    const restoredX = await furniture(touchHousing, plantId).getAttribute("data-x");
    const restoredY = await furniture(touchHousing, plantId).getAttribute("data-y");
    await touchHousing.getByRole("button", { name: "완료", exact: true }).tap();
    await expect(touchHousing.getByRole("button", { name: "방 꾸미기", exact: true })).toBeVisible();
    await touchPage.reload();
    await expect(furniture(touchHousing, plantId)).toHaveAttribute("data-x", restoredX!);
    await expect(furniture(touchHousing, plantId)).toHaveAttribute("data-y", restoredY!);
    await expect(furniture(touchHousing, plantId)).toHaveAttribute("data-rotation", "1");
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
