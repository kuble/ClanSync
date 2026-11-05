import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("production browser login also authenticates local API requests", async ({ page, request }) => {
  const fixture = await createIsolatedBalanceFixture(1);
  try {
    const endpoint = `/api/personal-emblems/featured?player=${fixture.users[0].id}`;
    expect((await request.get(endpoint)).status()).toBe(401);
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const response = await page.request.get(endpoint);
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    expect((await request.get(endpoint)).status()).toBe(401);
  } finally {
    await fixture.cleanup();
  }
});
