import { expect, test } from "@playwright/test";
import {
  gotoOverwatchLeaderClanBase,
} from "./fixture-login-helper";

test.use({ viewport: { width: 1280, height: 800 } });
test.setTimeout(90_000);

test("clan navigation acknowledges the click before a delayed page response", async ({
  page,
}) => {
  await gotoOverwatchLeaderClanBase(page);
  await expect(
    page.getByRole("heading", { name: "클랜 대시보드", exact: true }),
  ).toBeVisible();
  let release: () => void = () => {};
  const heldResponse = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route("**/stats?*", async (route) => {
    if (route.request().headers().rsc === "1") {
      requested = true;
      await heldResponse;
    }
    await route.continue();
  });
  const link = page.getByRole("link", { name: "클랜 통계", exact: true });
  const click = link.click();
  try {
    await expect.poll(() => requested).toBe(true);
    const indicator = page.locator('[data-navigation-pending="true"]');
    const loading = page
      .getByRole("status")
      .filter({ hasText: "클랜 페이지를 불러오는 중" });
    await expect(indicator.or(loading).first()).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "클랜 메뉴", exact: true }),
    ).toBeVisible();
  } finally {
    release();
    await click;
  }
  await expect(
    page.getByRole("heading", { name: "클랜 통계", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-navigation-pending="true"]')).toHaveCount(0);
});
