import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("idle lobby avoids five-second renders and receives room and RSVP changes", async ({ page }) => {
  test.setTimeout(100_000);
  const fixture = await createIsolatedBalanceFixture(2);
  try {
    const room = await fixture.service.from("balance_rooms").insert({
      clan_id: fixture.clanId, game_id: fixture.gameId, created_by: fixture.users[0].id,
      kind: "flash", title: "로비 갱신 검증", status: "scheduled",
      scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
      rsvp_opens_at: new Date(Date.now() - 60_000).toISOString(),
    }).select("id").single();
    expect(room.error).toBeNull();
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    await page.goto(fixture.path);
    const row = page.getByTestId("balance-lobby-room").filter({ hasText: "로비 갱신 검증" });
    await expect(row).toContainText("참여 1");
    // Wait for the socket's catch-up render before measuring idle traffic.
    await page.waitForTimeout(3_000);
    let renders = 0;
    page.on("request", (request) => {
      if (request.url().includes("_rsc=") && new URL(request.url()).pathname.endsWith("/balance")) renders++;
    });
    await page.waitForTimeout(11_000);
    expect(renders).toBe(0);
    const began = Date.now();
    expect((await fixture.service.from("balance_room_rsvps").insert({
      room_id: room.data!.id, user_id: fixture.users[1].id, response: "going",
    })).error).toBeNull();
    await expect(row).toContainText("참여 2", { timeout: 10_000 });
    console.log(`Lobby RSVP event visible in ${Date.now() - began}ms; idle renders in 11s: 0`);
    expect((await fixture.service.from("balance_rooms").update({ title: "변경 알림 수신" }).eq("id", room.data!.id)).error).toBeNull();
    await expect(page.getByTestId("balance-lobby-room").filter({ hasText: "변경 알림 수신" })).toBeVisible({ timeout: 10_000 });
    // The fallback recovers a DELETE, which is deliberately not subscribed.
    expect((await fixture.service.from("balance_room_rsvps").delete().eq("room_id", room.data!.id)).error).toBeNull();
    await expect(page.getByTestId("balance-lobby-room").filter({ hasText: "변경 알림 수신" })).toContainText("참여 0", { timeout: 35_000 });
    await page.context().setOffline(true);
    expect((await fixture.service.from("balance_rooms").update({ title: "온라인 복구" }).eq("id", room.data!.id)).error).toBeNull();
    await page.context().setOffline(false);
    await expect(page.getByTestId("balance-lobby-room").filter({ hasText: "온라인 복구" })).toBeVisible({ timeout: 10_000 });
  } finally { await fixture.cleanup(); }
});
