import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { gotoOverwatchLeaderClanBase } from "./fixture-login-helper";
import { loadTestEnv } from "../scripts/test-env.mjs";

test.use({ timezoneId: "Asia/Seoul" });

test("R06/R07 KST create, title edit and time edit preserve UTC instants and reservations", async ({
  page,
}) => {
  const env = loadTestEnv();
  const svc = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const title = `timezone-${Date.now()}`;
  const base = await gotoOverwatchLeaderClanBase(page);
  const clanId = base.split("/").at(-1)!;
  const date = await page.evaluate(() => {
    const day = new Date();
    day.setDate(day.getDate() + 2);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  });
  let eventId: string | undefined;
  try {
    await page.goto(`${base}/events`);
    await expect(page.locator("#evt-title")).toBeHidden();
    await page.getByRole("button", { name: "일정 등록", exact: true }).click();
    const createDialog = page.getByRole("dialog", {
      name: "일정 등록",
      exact: true,
    });
    await expect(createDialog).toBeVisible();
    await page.locator("#evt-title").fill(title);
    await page.locator("#evt-start").fill(`${date}T20:00`);
    await page.getByRole("button", { name: "등록", exact: true }).click();
    await expect(
      page.getByText("일정을 추가했습니다.", { exact: true }),
    ).toBeVisible();
    await expect(createDialog).toBeHidden();
    const { data, error } = await svc
      .from("clan_events")
      .select("id,start_at")
      .eq("clan_id", clanId)
      .eq("title", title)
      .single();
    expect(error).toBeNull();
    eventId = data!.id;
    const original = `${date}T11:00:00.000Z`;
    expect(new Date(data!.start_at).toISOString()).toBe(original);
    const dayCell = page.locator(`[data-date="${date}"]`);
    if (!(await dayCell.count()))
      await page.getByRole("button", { name: "다음 달" }).click();
    await dayCell.click();
    await page.getByRole("button", { name: new RegExp(title) }).click();
    await page.getByRole("button", { name: "편집", exact: true }).click();
    await page.locator("#edit-title").fill(`${title}-edited`);
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(
      page.getByText("일정을 수정했습니다.", { exact: true }),
    ).toBeVisible();
    const firstEdit = await svc
      .from("clan_events")
      .select("start_at")
      .eq("id", eventId!)
      .single();
    expect(firstEdit.error).toBeNull();
    expect(new Date(firstEdit.data!.start_at).toISOString()).toBe(original);
    await page
      .getByRole("button", { name: new RegExp(`${title}-edited`) })
      .click();
    await page.getByRole("button", { name: "편집", exact: true }).click();
    await page.locator("#edit-start").fill(`${date}T21:30`);
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect
      .poll(async () => {
        const r = await svc
          .from("clan_events")
          .select("start_at")
          .eq("id", eventId!)
          .single();
        return new Date(r.data!.start_at).toISOString();
      })
      .toBe(`${date}T12:30:00.000Z`);
    const logs = await svc
      .from("notification_log")
      .select("id,status,scheduled_at")
      .eq("event_id", eventId!);
    expect(logs.error).toBeNull();
    expect(logs.data!.length).toBeGreaterThan(0);
    expect(logs.data!.every((r) => r.status === "scheduled")).toBe(true);
  } finally {
    const cleanup = eventId
      ? svc.from("clan_events").delete().eq("id", eventId)
      : svc
          .from("clan_events")
          .delete()
          .eq("clan_id", clanId)
          .eq("title", title);
    expect((await cleanup).error).toBeNull();
  }
});
