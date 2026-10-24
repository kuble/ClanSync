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
  await expect(page.getByTestId("housing-carried-furniture")).toBeVisible();
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
    await page.goto("/profile/miniroom");
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
    await expect(room(housing)).toHaveAttribute("data-editing", "false");
    await expect.poll(async () => (await fixture.service.from("user_housing_inventory").select("x,y").eq("id", plantId).single()).data).toEqual({ x: 4, y: 4 });
    await page.reload();
    await expectPosition(housing, plantId, 4, 4);

    mobile = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, storageState: await page.context().storageState() });
    const touchPage = await mobile.newPage();
    touchPage.on("pageerror", (error) => errors.push(error.message));
    await touchPage.goto("/profile/miniroom");
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
    await expect(room(touchHousing)).toHaveAttribute("data-editing", "false");
    await expect.poll(async () => (await fixture.service.from("user_housing_inventory").select("x,y").eq("id", plantId).single()).data).toEqual({ x: 4, y: 2 });
    await touchPage.reload();
    await expectPosition(touchHousing, plantId, 4, 2);
    await expect(touchHousing.getByTestId("housing-coin-balance")).toHaveText("0");
    expect(errors).toEqual([]);
  } finally {
    await mobile?.close();
    await fixture.cleanup();
  }
});

test("겹침·방 밖은 저장하지 않고 Esc·창 전환·터치 취소로 집기를 끝내며 짧은 화면의 보관함에서 꺼낸다", async ({ page, browser, baseURL }) => {
  test.setTimeout(90_000);
  const f = await createIsolatedBalanceFixture(1);
  let mobile: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  try {
    await loginIsolatedBalanceUser(page, f.users[0]); await page.goto("/profile/miniroom");
    const housing = page.getByRole("region", { name: "프로필 하우징", exact: true });
    const stage = room(housing);
    await expect(stage).toHaveAttribute("data-renderer", "webgl");
    const plant = (await f.service.from("user_housing_inventory").select("id,x,y").eq("user_id", f.users[0].id).eq("catalog_id", "small-plant").single()).data!;
    const model = furniture(housing, plant.id);
    const read = async () => (await f.service.from("user_housing_inventory").select("x,y,rotation").eq("id", plant.id).single()).data!;
    await model.press("Enter");
    const overlap = await dragPoints(housing, plant.id, 1, 1);
    await page.keyboard.press("Escape");
    await mouseStart(page, overlap.start, overlap.end);
    await expect(housing.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "false");
    await page.mouse.up();
    await expectPosition(housing, plant.id, plant.x!, plant.y!);
    await expect(stage).toHaveAttribute("data-editing", "true");
    await page.keyboard.press("Escape"); await expect(stage).toHaveAttribute("data-editing", "false");
    const bounds = await stage.boundingBox();
    await mouseStart(page, await point(model, .8), { x: bounds!.x + 4, y: bounds!.y + 4 });
    await page.mouse.up(); await expectPosition(housing, plant.id, plant.x!, plant.y!);
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(stage).toHaveAttribute("data-editing", "false");
    await model.press("Enter"); await model.press("r");
    await expect(model).toHaveAttribute("data-rotation", "1");
    await page.keyboard.press("Escape");
    await expect.poll(read).toMatchObject({ x: plant.x, y: plant.y, rotation: 1 });
    await model.press("Enter"); await model.press("Delete");
    await expect.poll(read).toMatchObject({ x: null, y: null });

    mobile = await browser.newContext({ baseURL, hasTouch: true, isMobile: true, viewport: { width: 390, height: 568 }, storageState: await page.context().storageState() });
    const phone = await mobile.newPage(); await phone.goto("/profile/miniroom");
    const h = phone.getByRole("region", { name: "프로필 하우징", exact: true });
    await expect(room(h)).toHaveAttribute("data-renderer", "webgl");
    await room(h).scrollIntoViewIfNeeded(); await openInventory(h);
    const grip = h.getByRole("button", { name: "작은 화분 끌어서 배치", exact: true });
    await grip.scrollIntoViewIfNeeded(); const at = await point(grip);
    const cdp = await mobile.newCDPSession(phone);
    await touchStart(cdp, at, { x: at.x, y: at.y - 48 });
    await expect(h.getByTestId("housing-carried-furniture")).toBeVisible();
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await expect(room(h)).toHaveAttribute("data-editing", "false");
    expect(await read()).toMatchObject({ x: null, y: null });
    await openInventory(h); await grip.scrollIntoViewIfNeeded(); const again = await point(grip);
    await touchStart(cdp, again, { x: again.x, y: again.y - 48 });
    const front = await point(tile(h, 5, 5));
    const drawer = await h.getByRole("region", { name: "내 가구 보관함", exact: true }).boundingBox();
    expect(front.y).toBeLessThan(drawer!.y);
    const target = await point(tile(h, 5, 2));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...target, id: 1, radiusX: 5, radiusY: 5 }] });
    await expect(h.getByTestId("housing-drag-preview")).toHaveAttribute("data-valid", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(room(h)).toHaveAttribute("data-editing", "false");
    await expect.poll(read).toMatchObject({ x: 5, y: 2, rotation: 1 });
    await cdp.detach();
  } finally { await page.mouse.up(); await mobile?.close(); await f.cleanup(); }
});
