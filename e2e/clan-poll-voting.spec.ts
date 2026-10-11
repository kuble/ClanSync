import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ timezoneId: "Asia/Seoul" });

async function ok<T>(request: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

async function capture(page: Page, name: string) {
  const directory = process.env.POLL_UI_CAPTURE_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, name), animations: "disabled" });
}

test("투표 목록·선택·변경·결과·직접 링크와 모바일 복수 선택", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(3);
  const memberContext = await browser.newContext();
  try {
    await ok(f.service.from("clans").update({ name: "ClanSync 데모 클랜" }).eq("id", f.clanId));
    const deadline = new Date(Date.now() + 172_800_000).toISOString();
    async function makePoll(title: string, labels: string[], multiple = false, closed = false, expired = false) {
      const poll = await ok(f.service.from("clan_polls").insert({
        clan_id: f.clanId, title, multiple_choice: multiple, anonymous: multiple,
        deadline_at: expired ? new Date(Date.now() - 60_000).toISOString() : deadline,
        closed_at: closed ? new Date().toISOString() : null, created_by: f.users[0].id,
        created_at: new Date(Date.now() - (expired ? 120_000 : 1000)).toISOString(),
      }).select("id").single());
      if (!poll) throw new Error("Test poll was not returned");
      const options = await ok(f.service.from("poll_options").insert(labels.map((label, index) => ({ poll_id: poll.id, label, sort_order: index }))).select("id, label, sort_order").order("sort_order"));
      if (!options) throw new Error("Test options were not returned");
      return { id: poll.id, options };
    }
    const single = await makePoll("이번 주 내전은 언제 할까요?", ["금요일 오후 9시", "토요일 오후 8시", "일요일 오후 8시"]);
    const multiple = await makePoll("참여하고 싶은 이벤트를 골라 주세요", Array.from({ length: 12 }, (_, index) => index === 11 ? "마지막 선택지도 잘리는 부분 없이 읽을 수 있도록 긴 이벤트 이름을 모두 표시해 주세요" : `이벤트 ${index + 1}`), true);
    const tied = await makePoll("다음 내전 시간 투표", ["금요일 오후 9시", "토요일 오후 8시", "일요일 오후 8시"], false, true);
    const empty = await makePoll("마감된 빈 투표", ["첫 번째 선택지", "두 번째 선택지"], false, false, true);
    await ok(f.service.from("poll_votes").insert([
      { poll_id: single.id, option_id: single.options[0].id, user_id: f.users[1].id },
      { poll_id: single.id, option_id: single.options[1].id, user_id: f.users[2].id },
      { poll_id: tied.id, option_id: tied.options[0].id, user_id: f.users[1].id },
      { poll_id: tied.id, option_id: tied.options[1].id, user_id: f.users[2].id },
    ]));
    await page.setViewportSize({ width: 1304, height: 884 });
    await loginIsolatedBalanceUser(page, f.users[0]);
    const events = f.path.replace(/balance$/, "events") + "?tab=polls";
    await page.goto(events);
    await expect(page.getByRole("region", { name: "진행 중인 투표", exact: true }).getByRole("button")).toHaveCount(2);
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "종료된 투표", exact: true }).getByRole("button")).toHaveCount(2);
    await capture(page, "poll-list-desktop.png");
    await page.getByRole("button", { name: "이번 주 내전은 언제 할까요? 투표하기", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "이번 주 내전은 언제 할까요?", exact: true });
    const submit = dialog.getByRole("button", { name: "투표하기", exact: true });
    await expect(submit).toBeDisabled();
    await expect(dialog.getByRole("radio")).toHaveCount(3);
    await dialog.getByRole("radio", { name: "금요일 오후 9시", exact: true }).press("Space");
    await dialog.getByRole("radio", { name: "토요일 오후 8시", exact: true }).press("Space");
    await expect(dialog.getByRole("radio", { name: "금요일 오후 9시", exact: true })).not.toBeChecked();
    await expect(dialog.getByRole("radio", { name: "토요일 오후 8시", exact: true })).toBeChecked();
    await capture(page, "poll-ballot-desktop.png");
    await submit.click();
    const results = dialog.getByRole("region", { name: "투표 결과", exact: true });
    await expect(results.getByText("총 3표", { exact: true })).toBeVisible();
    await expect(results.getByRole("listitem").filter({ hasText: "토요일 오후 8시" })).toContainText("내 선택");
    const readVote = () => ok(f.service.from("poll_votes").select("option_id").eq("poll_id", single.id).eq("user_id", f.users[0].id));
    expect(await readVote()).toEqual([{ option_id: single.options[1].id }]);
    await dialog.getByRole("button", { name: "투표 변경", exact: true }).click();
    await dialog.getByRole("radio", { name: "일요일 오후 8시", exact: true }).press("Space");
    await dialog.getByRole("button", { name: "변경 저장", exact: true }).click();
    await expect(results.getByRole("listitem").filter({ hasText: "일요일 오후 8시" })).toContainText("내 선택");
    expect(await readVote()).toEqual([{ option_id: single.options[2].id }]);
    await dialog.getByRole("button", { name: "투표 변경", exact: true }).click();
    await dialog.getByRole("radio", { name: "금요일 오후 9시", exact: true }).press("Space");
    await dialog.getByRole("button", { name: "변경 취소", exact: true }).click();
    await expect(results.getByRole("listitem").filter({ hasText: "일요일 오후 8시" })).toContainText("내 선택");
    await dialog.getByRole("button", { name: "투표 변경", exact: true }).click();
    await expect(dialog.getByRole("radio", { name: "일요일 오후 8시", exact: true })).toBeChecked();
    // Another operator closes the poll after this viewer started editing.
    await ok(f.service.from("clan_polls").update({ closed_at: new Date().toISOString() }).eq("id", single.id));
    await dialog.getByRole("radio", { name: "금요일 오후 9시", exact: true }).press("Space");
    await dialog.getByRole("button", { name: "변경 저장", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("종료된 투표입니다.");
    await expect(dialog.getByRole("radio", { name: "금요일 오후 9시", exact: true })).toBeChecked();
    expect(await readVote()).toEqual([{ option_id: single.options[2].id }]);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "이번 주 내전은 언제 할까요? 내 투표 보기", exact: true })).toBeFocused();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "참여하고 싶은 이벤트를 골라 주세요 투표하기", exact: true }).click();
    const multiDialog = page.getByRole("dialog", { name: "참여하고 싶은 이벤트를 골라 주세요", exact: true });
    await expect(multiDialog.getByRole("checkbox")).toHaveCount(12);
    await multiDialog.getByRole("checkbox", { name: "이벤트 1", exact: true }).press("Space");
    await capture(page, "poll-ballot-mobile.png");
    await multiDialog.getByRole("checkbox").last().press("Space");
    await expect(multiDialog.getByText("2개 선택됨", { exact: true })).toBeVisible();
    const footer = await multiDialog.getByRole("button", { name: "투표하기", exact: true }).boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(844);
    expect(await multiDialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await multiDialog.getByRole("button", { name: "투표하기", exact: true }).click();
    await expect(multiDialog.getByRole("region", { name: "투표 결과", exact: true }).getByText("내 선택", { exact: true })).toHaveCount(2);
    expect(await ok(f.service.from("poll_votes").select("option_id").eq("poll_id", multiple.id).eq("user_id", f.users[0].id))).toEqual(expect.arrayContaining([{ option_id: multiple.options[0].id }, { option_id: multiple.options[11].id }]));
    page.once("dialog", (confirmation) => confirmation.accept());
    await multiDialog.getByRole("button", { name: "조기 종료", exact: true }).click();
    await expect(multiDialog.getByText("최종 결과", { exact: true })).toBeVisible();
    await expect(multiDialog.getByText("공동 1위", { exact: true })).toHaveCount(2);
    await expect(multiDialog.getByRole("button", { name: "투표 변경", exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await page.setViewportSize({ width: 1304, height: 884 });
    await page.goto(`${events}&poll=${tied.id}`);
    const finalDialog = page.getByRole("dialog", { name: "다음 내전 시간 투표", exact: true });
    await expect(finalDialog).toBeVisible();
    await expect(finalDialog.getByText("공동 1위", { exact: true })).toHaveCount(2);
    await expect(finalDialog.getByRole("radio")).toHaveCount(0);
    await expect(finalDialog.getByRole("region", { name: "투표 결과", exact: true }).getByRole("listitem").first()).toContainText("금요일 오후 9시");
    await capture(page, "poll-results-desktop.png");
    if (process.env.POLL_GALLERY_CAPTURE === "1") await page.screenshot({ path: "public/images/discord/polls.jpg", type: "jpeg", quality: 85, clip: { x: 80, y: 75, width: 1210, height: 756 } });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "마감된 빈 투표 결과 보기", exact: true }).click();
    const emptyDialog = page.getByRole("dialog", { name: "마감된 빈 투표", exact: true });
    await expect(emptyDialog.getByText("참여한 표가 없습니다.", { exact: true })).toBeVisible();
    await expect(emptyDialog.getByText("공동 1위", { exact: true })).toHaveCount(0);
    expect(empty.id).toBeTruthy();
    const member = await memberContext.newPage();
    await loginIsolatedBalanceUser(member, f.users[2]);
    await member.goto(`${events}&poll=${tied.id}`);
    await expect(member.getByRole("dialog", { name: "다음 내전 시간 투표", exact: true })).toBeVisible();
    await expect(member.getByRole("button", { name: "조기 종료", exact: true })).toHaveCount(0);
    await expect(member.getByRole("dialog").getByText("내 선택", { exact: true })).toHaveCount(1);
  } finally { await memberContext.close(); await f.cleanup(); }
});
