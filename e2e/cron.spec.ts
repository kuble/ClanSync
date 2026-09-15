import { expect, test } from "@playwright/test";

test("cron rejects requests without its secret", async ({ request }) => {
  const response = await request.get("/api/cron/dispatch-notifications");
  expect(response.status()).toBe(401);
});

test("cron can dispatch against the isolated QA database", async ({ request }) => {
  const secret = process.env.CRON_SECRET;
  expect(secret, "Configure a test-only CRON_SECRET in .env.e2e.local").toBeTruthy();
  const response = await request.get("/api/cron/dispatch-notifications", {
    headers: { Authorization: `Bearer ${secret}` },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true, lfg_note: null, discord_note: null });
});
