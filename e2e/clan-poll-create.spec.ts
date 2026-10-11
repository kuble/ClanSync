import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000, timezoneId: "Asia/Seoul" });

async function capture(page: Page, filename: string) {
  const directory = process.env.POLL_CREATE_CAPTURE_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, filename), fullPage: false, animations: "disabled" });
}

test("투표 생성: 선택지 편집·검증·알림 기본값·저장과 모바일 고정 작업 영역", async ({ page }) => {
  test.setTimeout(180_000);
  const fixture = await createIsolatedBalanceFixture(2);
  try {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    await page.goto(fixture.path.replace(/balance$/, "events") + "?tab=polls");
    const createButton = page.getByRole("button", { name: "투표 만들기", exact: true });
    await createButton.click();
    const dialog = page.getByRole("dialog", { name: "투표 만들기", exact: true });
    const title = dialog.getByRole("textbox", { name: "투표 질문", exact: true });
    const addOption = dialog.getByRole("button", { name: /^선택지 추가/ });
    const submit = dialog.getByRole("button", { name: "투표 시작하기", exact: true });
    const notify = dialog.getByRole("switch", { name: "참여 알림 보내기", exact: true });
    const multipleChoice = dialog.getByRole("switch", { name: "중복 투표", exact: true });
    const deadlineDay = dialog.getByLabel("마감 날짜", { exact: true });
    const deadlineTime = dialog.getByLabel("마감 시간", { exact: true });
    await expect(title).toBeFocused();
    await expect(multipleChoice).not.toBeChecked();
    await expect(dialog.getByRole("button", { name: /^(1일 후|2일 후|1주 후)$/ })).toHaveCount(0);
    await expect(dialog.getByRole("region", { name: "선택지 작성", exact: true }).getByRole("switch")).toHaveCount(2);
    await expect(notify).not.toBeChecked();
    await expect(dialog.getByLabel("알림 빈도", { exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "선택지 1 삭제", exact: true })).toBeDisabled();
    await submit.click();
    await expect(dialog.getByText("투표 질문을 입력해 주세요.", { exact: true })).toBeVisible();
    await expect(title).toBeFocused();
    await title.fill("이번 주 내전은 언제 할까요?");
    await dialog.getByRole("textbox", { name: "선택지 1", exact: true }).fill("금요일 오후 9시");
    await dialog.getByRole("textbox", { name: "선택지 2", exact: true }).fill("금요일 오후 9시");
    await submit.click();
    await expect(dialog.getByText("다른 선택지와 같은 내용입니다. 내용을 바꿔 주세요.", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "선택지 2", exact: true })).toBeFocused();
    await dialog.getByRole("textbox", { name: "선택지 2", exact: true }).fill("삭제할 항목");
    await addOption.click();
    await expect(dialog.getByRole("textbox", { name: "선택지 3", exact: true })).toBeFocused();
    await dialog.getByRole("textbox", { name: "선택지 3", exact: true }).fill("토요일 오후 8시");
    await dialog.getByRole("button", { name: "선택지 2 삭제", exact: true }).click();
    await expect(dialog.getByRole("textbox", { name: "선택지 2", exact: true })).toHaveValue("토요일 오후 8시");
    await expect(dialog.getByRole("textbox", { name: "선택지 2", exact: true })).toBeFocused();
    await addOption.click();
    await submit.click();
    await expect(dialog.getByText("선택지를 입력하거나 이 항목을 삭제해 주세요.", { exact: true })).toBeVisible();
    await dialog.getByRole("textbox", { name: "선택지 3", exact: true }).fill("일요일 오후 8시");

    const initialTime = await deadlineTime.inputValue();
    await deadlineTime.fill("");
    await submit.click();
    await expect(dialog.getByText("마감 시간을 입력해 주세요.", { exact: true })).toBeVisible();
    await expect(deadlineTime).toBeFocused();
    await deadlineTime.fill(initialTime);

    await notify.check();
    await expect(dialog.getByLabel("알림 빈도", { exact: true })).toHaveValue("once");
    await expect(dialog.getByLabel("알림 시각 (한국 시간)", { exact: true })).toHaveCount(0);
    await dialog.getByLabel("알림 빈도", { exact: true }).selectOption("daily");
    const deadlineDays = await page.evaluate(() => {
      const dayAfter = (days: number) => {
        const date = new Date(Date.now() + days * 86_400_000);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      };
      return { tomorrow: dayAfter(1), nextWeek: dayAfter(7) };
    });
    await deadlineDay.fill(deadlineDays.tomorrow);
    await submit.click();
    await expect(dialog.getByText(/48시간 이내 마감에는/)).toBeVisible();
    const { data: invalidPolls, error: invalidError } = await fixture.service.from("clan_polls").select("id").eq("clan_id", fixture.clanId);
    expect(invalidError).toBeNull();
    expect(invalidPolls).toEqual([]);
    await deadlineDay.fill(deadlineDays.nextWeek);
    await dialog.getByLabel("알림 시각 (한국 시간)", { exact: true }).selectOption("21");
    await multipleChoice.check();
    await dialog.getByRole("switch", { name: "익명 투표", exact: true }).check();
    const deadline = `${await deadlineDay.inputValue()}T${await deadlineTime.inputValue()}`;
    const expectedDeadline = await page.evaluate((value) => new Date(value).toISOString(), deadline);
    // Capture the main input flow with the supplementary settings below the fold.
    await title.focus();
    await capture(page, "poll-create-desktop.png");
    await submit.click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });
    await expect(page.getByText("이번 주 내전은 언제 할까요?", { exact: true })).toBeVisible({ timeout: 30_000 });
    const { data: poll, error: pollError } = await fixture.service.from("clan_polls").select("id, title, deadline_at, anonymous, multiple_choice, notify_repeat, notify_hour").eq("clan_id", fixture.clanId).single();
    expect(pollError).toBeNull();
    expect(poll).toMatchObject({ title: "이번 주 내전은 언제 할까요?", anonymous: true, multiple_choice: true, notify_repeat: "daily", notify_hour: 21 });
    expect(new Date(poll!.deadline_at).toISOString()).toBe(expectedDeadline);
    const { data: choices, error: choicesError } = await fixture.service.from("poll_options").select("label").eq("poll_id", poll!.id).order("sort_order");
    expect(choicesError).toBeNull();
    expect(choices?.map((choice) => choice.label)).toEqual(["금요일 오후 9시", "토요일 오후 8시", "일요일 오후 8시"]);
    const { data: notifications, error: notificationsError } = await fixture.service.from("notification_log").select("slot_kind, channel").eq("poll_id", poll!.id);
    expect(notificationsError).toBeNull();
    expect(notifications).toEqual(expect.arrayContaining([expect.objectContaining({ slot_kind: "poll_created", channel: "inapp" })]));

    await expect(page.getByText("투표가 시작되었습니다.", { exact: true })).toBeHidden({ timeout: 10_000 });
    await page.setViewportSize({ width: 390, height: 844 });
    await createButton.click();
    await expect(title).toHaveValue("");
    await expect(notify).not.toBeChecked();
    await expect(multipleChoice).not.toBeChecked();
    await title.fill("모바일 선택지 확인");
    for (let index = 3; index <= 12; index++) await addOption.click();
    await expect(addOption).toBeDisabled();
    await expect(dialog.getByRole("textbox", { name: /^선택지 \d+$/ })).toHaveCount(12);
    await expect(dialog.getByRole("textbox", { name: "선택지 12", exact: true })).toBeFocused();
    const footer = await submit.boundingBox();
    const popup = await dialog.boundingBox();
    expect(footer).not.toBeNull();
    expect(popup).not.toBeNull();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(844);
    expect(footer!.y).toBeGreaterThanOrEqual(popup!.y);
    expect(popup!.x).toBeGreaterThanOrEqual(0);
    expect(popup!.x + popup!.width).toBeLessThanOrEqual(390);
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await capture(page, "poll-create-mobile-many-options.png");
    await dialog.getByRole("button", { name: "취소", exact: true }).click();
    await expect(dialog).toBeHidden();
    await createButton.click();
    await expect(dialog.getByRole("textbox", { name: /^선택지 \d+$/ })).toHaveCount(2);
    await expect(title).toHaveValue("");
    await title.fill("이번 주 내전은 언제 할까요?");
    await dialog.getByRole("textbox", { name: "선택지 1", exact: true }).fill("금요일 오후 9시");
    await dialog.getByRole("textbox", { name: "선택지 2", exact: true }).fill("토요일 오후 8시");
    await title.focus();
    await capture(page, "poll-create-mobile.png");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  } finally {
    await fixture.cleanup();
  }
});
