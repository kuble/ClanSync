import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  createIsolatedBalanceFixture,
  loginIsolatedBalanceUser,
} from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000 });

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}

function sceneFurniture(housing: Locator, inventoryId: string) {
  return housing
    .getByRole("group", { name: "나의 방", exact: true })
    .locator(`[data-inventory-id="${inventoryId}"]`);
}

async function expectWebglRoom(housing: Locator) {
  const scene = housing.getByRole("group", { name: "나의 방", exact: true });
  await expect(scene).toHaveAttribute("data-renderer", "webgl");
  const canvas = scene.locator("canvas");
  await expect(canvas).toBeVisible();
  expect(await canvas.evaluate((element: HTMLCanvasElement) => element.width > 0 && element.height > 0)).toBe(true);
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

test("개인 코인 가구 구매·배치·회전·보관은 저장 후 유지되고 잔액 부족은 차감되지 않는다", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const fixture = await createIsolatedBalanceFixture(2);
  const poorContext = await browser.newContext({ baseURL });
  const unsupportedContext = await browser.newContext({ baseURL });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    const [buyer, poorUser] = fixture.users;
    const balanceSetup = await fixture.service
      .from("users")
      .update({ coin_balance: 1_000 })
      .eq("id", buyer.id);
    expect(balanceSetup.error).toBeNull();

    await loginIsolatedBalanceUser(page, buyer);
    await page.goto("/profile");
    const housing = page.getByRole("region", { name: "프로필 하우징" });
    const wallet = housing.getByTestId("housing-coin-balance");
    await expect(wallet).toContainText("1,000");
    await expectWebglRoom(housing);

    const catalogResult = await fixture.service
      .from("housing_catalog")
      .select("id,name,price,width,depth")
      .eq("id", "oak-desk")
      .single();
    expect(catalogResult.error).toBeNull();
    const desk = catalogResult.data!;
    expect(desk.price).toBe(180);
    const starterResult = await fixture.service
      .from("user_housing_inventory")
      .select("id,catalog_id,x,y,rotation,surface")
      .eq("user_id", buyer.id);
    expect(starterResult.error).toBeNull();
    expect(starterResult.data).toHaveLength(10);
    expect(starterResult.data!.every((item) => item.x !== null && item.y !== null)).toBe(true);

    // Existing profile controls still work with the room above them.
    await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    await expect(page.getByRole("region", { name: "게임별 선호 역할" })).toBeVisible();
    await page.getByRole("tab", { name: "3D 미니룸", exact: true }).click();
    await expect(housing).toBeVisible();

    await housing.getByRole("button", { name: "방 꾸미기", exact: true }).click();
    await housing.getByRole("button", { name: "가구 상점", exact: true }).click();
    const buy = housing.getByRole("button", { name: `${desk.name} 구매`, exact: true });
    const deskCard = housing.getByRole("list", { name: "가구 상품", exact: true }).getByRole("listitem").filter({ has: page.getByRole("button", { name: `${desk.name} 구매`, exact: true }) });
    await deskCard.scrollIntoViewIfNeeded();
    const deskPreview = deskCard.locator('[data-preview-state="ready"] img');
    await expect(deskPreview).toBeVisible();
    expect(await deskPreview.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 384)).toBe(true);
    await buy.focus();
    await buy.press("Enter");
    const purchase = page.getByRole("dialog", { name: "가구 구매", exact: true });
    await expect(purchase).toBeVisible();
    await expect(purchase).toContainText(desk.name);
    await page.keyboard.press("Escape");
    await expect(purchase).toBeHidden();
    await expect(buy).toBeFocused();
    await expect(wallet).toContainText("1,000");

    await buy.click();
    await purchase
      .getByRole("button", { name: "180 코인으로 구매", exact: true })
      .click();
    await expect(purchase).toBeHidden();
    await expect(wallet).toContainText("820");
    const inventoryResult = await fixture.service
      .from("user_housing_inventory")
      .select("id,catalog_id,x,y,rotation,acquired_price,coin_transaction_id")
      .eq("user_id", buyer.id)
      .eq("catalog_id", desk.id)
      .single();
    expect(inventoryResult.error).toBeNull();
    const ownedDesk = inventoryResult.data!;
    expect(ownedDesk.acquired_price).toBe(180);
    expect(ownedDesk.x).toBeNull();
    expect(ownedDesk.y).toBeNull();

    await openInventory(housing);
    await housing
      .getByRole("list", { name: "보유 가구", exact: true })
      .getByRole("button", { name: `${desk.name} 선택`, exact: true })
      .click();
    await closePanel(housing);

    // Reserve a 2x2 area so placing and rotating a 2x1 desk are both valid.
    const catalog = await fixture.service.from("housing_catalog").select("id,width,depth");
    expect(catalog.error).toBeNull();
    const occupied = new Set<string>();
    for (const item of starterResult.data!) {
      if (item.surface !== "floor") continue;
      const shape = catalog.data!.find((entry) => entry.id === item.catalog_id)!;
      const width = item.rotation % 2 ? shape.depth : shape.width;
      const depth = item.rotation % 2 ? shape.width : shape.depth;
      for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < depth; dy++) {
          occupied.add(`${item.x! + dx},${item.y! + dy}`);
        }
      }
    }
    let anchor: { x: number; y: number } | undefined;
    for (let y = 4; y >= 0 && !anchor; y--) {
      for (let x = 4; x >= 0 && !anchor; x--) {
        if (
          ["0,0", "0,1", "1,0", "1,1"].every((offset) => {
            const [dx, dy] = offset.split(",").map(Number);
            return !occupied.has(`${x + dx},${y + dy}`);
          })
        ) anchor = { x, y };
      }
    }
    expect(anchor).toBeDefined();
    const { x, y } = anchor!;
    const targetCell = housing.getByRole("button", {
      name: `배치 위치 ${x + 1}열 ${y + 1}행`,
      exact: true,
    });
    await targetCell.focus();
    await targetCell.press("Enter");
    await expect(sceneFurniture(housing, ownedDesk.id)).toHaveAttribute("data-x", String(x));
    await expect(sceneFurniture(housing, ownedDesk.id)).toHaveAttribute("data-y", String(y));
    await sceneFurniture(housing, ownedDesk.id).focus();
    await sceneFurniture(housing, ownedDesk.id).press("r");
    await expect(sceneFurniture(housing, ownedDesk.id)).toHaveAttribute("data-rotation", "1");
    await housing.getByRole("button", { name: "방 저장", exact: true }).click();
    await expect(housing.getByRole("button", { name: "방 꾸미기", exact: true })).toBeVisible();
    await page.reload();
    await expect(sceneFurniture(housing, ownedDesk.id)).toHaveAttribute("data-rotation", "1");
    await expect(sceneFurniture(housing, ownedDesk.id)).toHaveAttribute("data-x", String(x));
    await expect(sceneFurniture(housing, ownedDesk.id)).toHaveAttribute("data-y", String(y));

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(housing).toBeVisible();
      await expectWebglRoom(housing);
      await expectNoHorizontalOverflow(page);
      await housing.getByRole("button", { name: "방 꾸미기", exact: true }).click();
      await housing.getByRole("button", { name: "가구 상점", exact: true }).click();
      await expectNoHorizontalOverflow(page);
      await housing.getByRole("button", { name: "편집 취소", exact: true }).click();
    }
    await page.setViewportSize({ width: 1280, height: 900 });

    await housing.getByRole("button", { name: "방 꾸미기", exact: true }).click();
    await sceneFurniture(housing, ownedDesk.id).focus();
    await sceneFurniture(housing, ownedDesk.id).press("Enter");
    await sceneFurniture(housing, ownedDesk.id).press("Delete");
    await expect(sceneFurniture(housing, ownedDesk.id)).toHaveCount(0);
    await housing.getByRole("button", { name: "편집 취소", exact: true }).click();
    await page
      .getByRole("dialog", { name: "변경 내용을 버릴까요?", exact: true })
      .getByRole("button", { name: "변경 내용 버리기", exact: true })
      .click();
    await expect(sceneFurniture(housing, ownedDesk.id)).toBeVisible();
    await housing.getByRole("button", { name: "방 꾸미기", exact: true }).click();
    await sceneFurniture(housing, ownedDesk.id).focus();
    await sceneFurniture(housing, ownedDesk.id).press("Enter");
    await sceneFurniture(housing, ownedDesk.id).press("Delete");
    await housing.getByRole("button", { name: "방 저장", exact: true }).click();
    await expect(housing.getByRole("button", { name: "방 꾸미기", exact: true })).toBeVisible();
    await page.reload();
    await expect(sceneFurniture(housing, ownedDesk.id)).toHaveCount(0);
    await expect(wallet).toContainText("820");
    const storedResult = await fixture.service
      .from("user_housing_inventory")
      .select("id,x,y,rotation")
      .eq("id", ownedDesk.id)
      .single();
    expect(storedResult.error).toBeNull();
    expect(storedResult.data).toMatchObject({ x: null, y: null });
    const ledger = await fixture.service
      .from("coin_transactions")
      .select("amount,balance_after,reason,reference_type,reference_id,clan_id")
      .eq("user_id", buyer.id);
    expect(ledger.error).toBeNull();
    expect(ledger.data).toEqual([expect.objectContaining({
      amount: -180,
      balance_after: 820,
      reason: "purchase_housing",
      reference_type: "housing_purchase",
      reference_id: ownedDesk.id,
      clan_id: null,
    })]);

    const poorPage = await poorContext.newPage();
    poorPage.on("pageerror", (error) => pageErrors.push(error.message));
    await loginIsolatedBalanceUser(poorPage, poorUser);
    await poorPage.goto("/profile");
    const poorHousing = poorPage.getByRole("region", { name: "프로필 하우징" });
    await poorHousing.getByRole("button", { name: "방 꾸미기", exact: true }).click();
    await poorHousing.getByRole("button", { name: "가구 상점", exact: true }).click();
    await expect(
      poorHousing.getByRole("button", { name: `${desk.name} 구매`, exact: true }),
    ).toBeDisabled();
    const poorClient = await fixture.memberClient(1);
    const insufficient = await poorClient.rpc("purchase_housing_furniture", {
      p_catalog_id: desk.id,
    });
    expect(insufficient.error?.message).toContain("housing_insufficient_coins");
    const [poorBalance, poorPurchases, poorLedger] = await Promise.all([
      fixture.service.from("users").select("coin_balance").eq("id", poorUser.id).single(),
      fixture.service.from("user_housing_inventory").select("id").eq("user_id", poorUser.id).eq("catalog_id", desk.id),
      fixture.service.from("coin_transactions").select("id").eq("user_id", poorUser.id),
    ]);
    expect(poorBalance.error).toBeNull();
    expect(poorBalance.data?.coin_balance).toBe(0);
    expect(poorPurchases.error).toBeNull();
    expect(poorPurchases.data).toEqual([]);
    expect(poorLedger.error).toBeNull();
    expect(poorLedger.data).toEqual([]);

    // A lost GPU context must preserve the unsaved room and its keyboard controls.
    await expectWebglRoom(poorHousing);
    const plantResult = await fixture.service.from("user_housing_inventory").select("id").eq("user_id", poorUser.id).eq("catalog_id", "small-plant").single();
    expect(plantResult.error).toBeNull();
    const plantId = plantResult.data!.id;
    await openInventory(poorHousing);
    const plantButton = poorHousing.getByRole("list", { name: "보유 가구", exact: true }).getByRole("button", { name: "작은 화분 선택", exact: true });
    await plantButton.focus();
    await plantButton.press("Enter");
    await closePanel(poorHousing);
    // The plant's rectangular overlay overlaps this empty tile. A real pointer
    // must reach the floor instead of selecting the surrounding empty hitbox.
    const behindPlant = poorHousing.getByRole("button", { name: "배치 위치 4열 1행", exact: true });
    await behindPlant.scrollIntoViewIfNeeded();
    const behindPlantBounds = await behindPlant.boundingBox();
    expect(behindPlantBounds).not.toBeNull();
    await poorPage.mouse.click(behindPlantBounds!.x + behindPlantBounds!.width / 2, behindPlantBounds!.y + behindPlantBounds!.height / 2);
    await expect(sceneFurniture(poorHousing, plantId)).toHaveAttribute("data-x", "3");
    await expect(sceneFurniture(poorHousing, plantId)).toHaveAttribute("data-y", "0");
    const corner = poorHousing.getByRole("button", { name: "배치 위치 1열 6행", exact: true });
    await corner.focus();
    await corner.press("Enter");
    await expect(sceneFurniture(poorHousing, plantId)).toHaveAttribute("data-y", "5");
    const poorScene = poorHousing.getByRole("group", { name: "나의 방", exact: true });
    await poorScene.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
      const extension = canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context");
      if (!extension) throw new Error("The test browser must support WebGL context loss");
      extension.loseContext();
    });
    await expect(poorScene).toHaveAttribute("data-renderer", "fallback");
    await expect(poorScene.locator("canvas")).toHaveCount(0);
    await expect(sceneFurniture(poorHousing, plantId)).toHaveAttribute("data-x", "0");
    await expect(sceneFurniture(poorHousing, plantId)).toHaveAttribute("data-y", "5");
    await expect(poorHousing.getByRole("button", { name: "방 저장", exact: true })).toBeEnabled();
    await poorHousing.getByRole("button", { name: "방 저장", exact: true }).click();
    await expect(poorHousing.getByRole("button", { name: "방 꾸미기", exact: true })).toBeVisible();
    await poorPage.reload();
    await expectWebglRoom(poorHousing);
    await expect(sceneFurniture(poorHousing, plantId)).toHaveAttribute("data-y", "5");

    // Browsers without WebGL still expose the same room and editable furniture.
    await unsupportedContext.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        if (["webgl", "webgl2", "experimental-webgl"].includes(type)) return null;
        return Reflect.apply(original, this, [type, ...args]);
      } as typeof original;
    });
    const unsupportedPage = await unsupportedContext.newPage();
    unsupportedPage.on("pageerror", (error) => pageErrors.push(error.message));
    await loginIsolatedBalanceUser(unsupportedPage, poorUser);
    await unsupportedPage.goto("/profile");
    const fallbackHousing = unsupportedPage.getByRole("region", { name: "프로필 하우징" });
    await expect(fallbackHousing.getByRole("group", { name: "나의 방", exact: true })).toHaveAttribute("data-renderer", "fallback");
    await fallbackHousing.getByRole("button", { name: "방 꾸미기", exact: true }).click();
    const fallbackPlant = sceneFurniture(fallbackHousing, plantId);
    await fallbackPlant.focus();
    await fallbackPlant.press("Enter");
    await expect(fallbackPlant).toHaveAttribute("aria-pressed", "true");
    await fallbackPlant.press("r");
    await expect(fallbackPlant).toHaveAttribute("data-rotation", "1");
    await expect(fallbackHousing.getByTestId("housing-coin-balance")).toHaveText("0");
    expect(pageErrors).toEqual([]);
    await poorClient.auth.signOut();
  } finally {
    await unsupportedContext.close();
    await poorContext.close();
    await fixture.cleanup();
  }
});
