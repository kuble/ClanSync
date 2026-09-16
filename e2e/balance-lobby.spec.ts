import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  createAndEnterBalanceRoom,
  createIsolatedBalanceFixture,
  loginIsolatedBalanceUser,
} from "./isolated-balance-fixture";
import { parseRoster, rosterAssignedUserIds } from "../src/lib/balance/roster-schema";

test.use({ actionTimeout: 20_000 });
type Fixture = Awaited<ReturnType<typeof createIsolatedBalanceFixture>>;

const roomRow = (page: Page, roomId: string) =>
  page.getByTestId("balance-lobby-room").and(page.locator(`[data-room-id="${roomId}"]`));

async function readRoom(fixture: Fixture, roomId: string) {
  const { data, error } = await fixture.service.from("balance_rooms")
    .select("*").eq("clan_id", fixture.clanId).eq("id", roomId).single();
  if (error) throw error;
  return data;
}

async function scheduledRoom(
  page: Page,
  fixture: Fixture,
  kind: "regular" | "flash",
  title: string,
) {
  await page.goto(fixture.path);
  await page.getByRole("button", { name: "내전 추가", exact: true }).click();
  const create = page.getByRole("dialog", { name: "내전 만들기", exact: true });
  if (kind === "flash")
    await expect(create.getByRole("radio", { name: "정규 내전", exact: true })).toBeDisabled();
  await create.getByRole("radio", {
    name: kind === "regular" ? "정규 내전" : "깜짝 내전", exact: true,
  }).check();
  await create.getByRole("textbox", { name: "내전 이름", exact: true }).fill(title);
  await create.getByRole("radio", { name: "예약", exact: true }).check();
  // The form explicitly accepts KST regardless of browser/server time zone.
  const kstStart = new Date(Date.now() + (48 + 9) * 60 * 60 * 1000).toISOString().slice(0, 16);
  await create.getByLabel("예약 시각 (한국 시간)", { exact: true }).fill(kstStart);
  if (kind === "regular") {
    await create.getByRole("checkbox", { name: "매주 같은 요일·시각", exact: true }).check();
  } else {
    await create.getByRole("checkbox", { name: "참석 응답 받기", exact: true }).check();
    await create.getByRole("spinbutton", { name: "참석 응답 시작 일수", exact: true }).fill("3");
  }
  await create.getByRole("button", { name: "내전 만들기", exact: true }).click();
  await expect(create).toBeHidden();
  const row = page.getByTestId("balance-lobby-room").filter({
    has: page.getByRole("button", { name: title, exact: true }),
  });
  await expect(row).toBeVisible();
  const roomId = await row.getAttribute("data-room-id");
  if (!roomId) throw new Error("Scheduled room is missing its identifier");
  const room = await readRoom(fixture, roomId);
  expect(room.status).toBe("scheduled");
  expect(room.series_id).toBeNull();
  expect(Date.parse(room.scheduled_at)).toBe(Date.parse(`${kstStart}:00+09:00`));
  return room;
}

async function details(page: Page, roomId: string) {
  await roomRow(page, roomId).getByRole("button", { name: / 방 정보$/ }).click();
  const detail = page.getByRole("dialog", { name: "내전 정보", exact: true });
  await expect(detail).toBeVisible();
  return detail;
}

async function addPlayer(panel: Locator, nickname: string) {
  await panel.getByRole("region", { name: "참가 가능 클랜원", exact: true })
    .getByRole("button", { name: `${nickname} 출전 명단에 추가`, exact: true }).click();
  await expect(panel.locator('[data-roster-slot="team1:d0"]')).toHaveText(nickname);
}

test("정규 내전 예약: 주간 반복·임시 진행자 저장과 예약 방 입장", async ({ page }) => {
  test.setTimeout(150_000);
  const fixture = await createIsolatedBalanceFixture(3);
  try {
    const promoted = await fixture.service.from("clan_members").update({ role: "officer" })
      .eq("clan_id", fixture.clanId).eq("user_id", fixture.users[1].id);
    expect(promoted.error).toBeNull();
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const room = await scheduledRoom(page, fixture, "regular", "주간 정규 검증");
    expect(room.schedule_id).toBeTruthy();
    const readSchedule = async () => {
      const { data, error } = await fixture.service.from("balance_room_schedules")
        .select("interval_days,enabled").eq("clan_id", fixture.clanId)
        .eq("id", room.schedule_id!).single();
      if (error) throw error;
      return data;
    };
    expect(await readSchedule()).toMatchObject({ interval_days: 7, enabled: true });
    let detail = await details(page, room.id);
    await detail.getByRole("combobox", { name: "임시 진행 운영진", exact: true })
      .selectOption(fixture.users[1].id);
    await detail.getByRole("button", { name: "진행 운영진 지정", exact: true }).click();
    await expect.poll(async () => (await readRoom(fixture, room.id)).delegated_to)
      .toBe(fixture.users[1].id);
    const repeat = detail.getByRole("checkbox", { name: "반복 예약 유지", exact: true });
    await repeat.click();
    await expect.poll(async () => (await readSchedule()).enabled).toBe(false);
    await expect(repeat).not.toBeChecked();
    await page.reload();
    detail = await details(page, room.id);
    await expect(detail.getByRole("combobox", { name: "임시 진행 운영진", exact: true }))
      .toHaveValue(fixture.users[1].id);
    await expect(detail.getByRole("checkbox", { name: "반복 예약 유지", exact: true }))
      .not.toBeChecked();
    await detail.getByRole("checkbox", { name: "반복 예약 유지", exact: true }).click();
    await expect.poll(async () => (await readSchedule()).enabled).toBe(true);
    await expect(detail.getByRole("checkbox", { name: "반복 예약 유지", exact: true })).toBeChecked();
    await detail.getByRole("button", { name: "지금 열기", exact: true }).click();
    await page.waitForURL((url) => url.searchParams.get("room") === room.id);
    const panel = page.getByTestId("clan-balance-session-panel");
    await expect(panel).toHaveAttribute("data-balance-phase", "editing");
    const opened = await readRoom(fixture, room.id);
    expect(opened.status).toBe("open");
    expect(opened.delegated_to).toBe(fixture.users[1].id);
    expect((await fixture.activeRound(opened.series_id!)).host_user_id).toBe(fixture.users[1].id);
    await panel.getByRole("button", { name: "세션 종료", exact: true }).click();
    await expect(page.getByTestId("clan-balance-lobby")).toBeVisible();
    await expect.poll(async () => {
      const closed = await readRoom(fixture, room.id);
      return { status: closed.status, delegated_to: closed.delegated_to };
    }).toEqual({ status: "closed", delegated_to: null });
  } finally {
    await fixture.cleanup();
  }
});

test("깜짝 내전: 클랜원 개설·참석 응답과 출전 명단 분리·동시 방 격리", async ({ page, browser }) => {
  test.setTimeout(210_000);
  const fixture = await createIsolatedBalanceFixture(3);
  const ownerContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const visitorContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  ownerContext.setDefaultTimeout(20_000);
  visitorContext.setDefaultTimeout(20_000);
  const owner = await ownerContext.newPage();
  const visitor = await visitorContext.newPage();
  try {
    await Promise.all([
      loginIsolatedBalanceUser(page, fixture.users[0]),
      loginIsolatedBalanceUser(owner, fixture.users[1]),
      loginIsolatedBalanceUser(visitor, fixture.users[2]),
    ]);
    const regular = await createAndEnterBalanceRoom(page, fixture.path, "분리된 정규 방");
    const regularPanel = page.getByTestId("clan-balance-session-panel");
    await addPlayer(regularPanel, fixture.users[0].nickname);
    await expect.poll(async () => rosterAssignedUserIds(parseRoster(
      (await fixture.activeRound(regular.roomId)).roster,
    ))).toEqual([fixture.users[0].id]);
    const beforeRsvp = await fixture.activeRound(regular.roomId);
    const flash = await scheduledRoom(owner, fixture, "flash", "클랜원 깜짝 방");
    expect(flash.created_by).toBe(fixture.users[1].id);
    expect(flash.rsvp_days).toBe(3);
    await visitor.goto(fixture.path);
    await expect(roomRow(visitor, regular.roomId)).toBeVisible();
    await expect(roomRow(visitor, flash.id)).toBeVisible();
    for (const [name, width, height] of [
      ["balance-lobby-desktop", 1280, 900],
      ["balance-lobby-mobile", 390, 844],
    ] as const) {
      await visitor.setViewportSize({ width, height });
      await expect.poll(() => visitor.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      )).toBe(true);
      const path = test.info().outputPath(`${name}.png`);
      await visitor.screenshot({ path, fullPage: true });
      await test.info().attach(name, { path, contentType: "image/png" });
    }
    await visitor.setViewportSize({ width: 1280, height: 900 });
    let visitorDetail = await details(visitor, flash.id);
    await expect(visitorDetail.getByRole("button", { name: "지금 열기", exact: true })).toHaveCount(0);
    await expect(visitorDetail.getByRole("button", { name: "예약 변경 저장", exact: true })).toHaveCount(0);
    await visitorDetail.getByRole("button", { name: /^참석 \d+$/ }).click();
    const readRsvp = async () => {
      const { data, error } = await fixture.service.from("balance_room_rsvps")
        .select("response").eq("room_id", flash.id).eq("user_id", fixture.users[2].id).maybeSingle();
      if (error) throw error;
      return data?.response;
    };
    await expect.poll(readRsvp).toBe("going");
    await visitor.reload();
    visitorDetail = await details(visitor, flash.id);
    await expect(visitorDetail.getByRole("button", { name: "참석 1", exact: true }))
      .toHaveAttribute("aria-pressed", "true");
    expect((await readRoom(fixture, flash.id)).series_id).toBeNull();
    expect(await fixture.activeRound(regular.roomId)).toEqual(beforeRsvp);
    const ownerDetail = await details(owner, flash.id);
    await expect(ownerDetail.getByRole("button", { name: "참석 1", exact: true })).toBeVisible();
    await ownerDetail.getByRole("button", { name: "지금 열기", exact: true }).click();
    await owner.waitForURL((url) => url.searchParams.get("room") === flash.id);
    const flashUrl = owner.url();
    const flashPanel = owner.getByTestId("clan-balance-session-panel");
    await expect(flashPanel).toHaveAttribute("data-balance-phase", "editing");
    const openedFlash = await readRoom(fixture, flash.id);
    const flashSeries = openedFlash.series_id!;
    expect(rosterAssignedUserIds(parseRoster((await fixture.activeRound(flashSeries)).roster))).toEqual([]);
    await addPlayer(flashPanel, fixture.users[1].nickname);
    await expect.poll(async () => rosterAssignedUserIds(parseRoster(
      (await fixture.activeRound(flashSeries)).roster,
    ))).toEqual([fixture.users[1].id]);
    await Promise.all([page.reload(), owner.reload()]);
    await expect(page).toHaveURL(regular.url);
    await expect(owner).toHaveURL(flashUrl);
    await expect(regularPanel.locator('[data-roster-slot="team1:d0"]')).toHaveText(fixture.users[0].nickname);
    await expect(flashPanel.locator('[data-roster-slot="team1:d0"]')).toHaveText(fixture.users[1].nickname);
    await visitor.goto(flashUrl);
    const visitorPanel = visitor.getByTestId("clan-balance-session-panel");
    await expect(visitorPanel.locator('[data-board-slot="team1:d0"]')).toContainText(fixture.users[1].nickname);
    await expect(visitorPanel.getByRole("button", { name: "라운드 설정", exact: true })).toHaveCount(0);
    await expect(visitorPanel.locator("[data-roster-slot]")).toHaveCount(0);
    await owner.goto(regular.url);
    await expect(flashPanel.locator('[data-board-slot="team1:d0"]')).toContainText(fixture.users[0].nickname);
    await expect(flashPanel.getByRole("button", { name: "라운드 설정", exact: true })).toHaveCount(0);
    await owner.goto(flashUrl);
    await expect(flashPanel.getByRole("button", { name: "라운드 설정", exact: true })).toBeVisible();
  } finally {
    await Promise.all([ownerContext.close(), visitorContext.close()]);
    await fixture.cleanup();
  }
});
