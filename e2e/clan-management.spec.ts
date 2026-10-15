import { expect, test, type Page } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { isoToKstYmd } from "../src/lib/clan/stats/kst";
test.use({actionTimeout:20000});

test("officers manage real notices and rules across management and dashboard", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(2);
  const svc = f.service;
  const clanId = f.clanId;
  const base = f.path.replace(/\/balance$/, "");
  const title = `notice-${Date.now()}`;
  const editedTitle = `${title}-edited`;
  let noticeId: string | undefined;
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    const response = await page.goto(`${base}/manage?tab=overview`);
    const body = await response!.text();
    expect(body).not.toContain(f.users[1].email);
    expect(body).not.toContain("scoreGaps");
    await expect(page.getByRole("button", { name: "공지 작성", exact: true })).toHaveCount(0);
    await expect(page.getByText("클랜 페이지", { exact: true })).toHaveCount(0);
    await page.goto(base+"/manage?tab=notices");
    await expect(page).toHaveURL(/\/board\/notices$/);
    await page.getByRole("button", { name: "공지 작성", exact: true }).click();
    const editor = page.getByRole("dialog");
    await editor.getByLabel("제목", { exact: true }).fill(title);
    await editor
      .getByLabel("본문", { exact: true })
      .fill("이번 주에도 즐겁게 게임해요.");
    await editor
      .getByRole("checkbox", { name: "대시보드 상단에 고정" })
      .check();
    await editor
      .getByRole("button", { name: "공지 저장", exact: true })
      .click();
    await expect(editor).toHaveCount(0);
    const created = await svc
      .from("clan_notices")
      .select("id,is_pinned")
      .eq("clan_id", clanId)
      .eq("title", title)
      .single();
    expect(created.error).toBeNull();
    noticeId = created.data!.id;
    expect(created.data!.is_pinned).toBe(true);
    await page
      .getByRole("button", { name: `${title} 편집`, exact: true })
      .click();
    await editor.getByLabel("제목", { exact: true }).fill(editedTitle);
    await editor
      .getByLabel("본문", { exact: true })
      .fill("모임 시작 10분 전에 접속해 주세요.");
    await editor
      .getByRole("button", { name: "공지 저장", exact: true })
      .click();
    await expect(editor).toHaveCount(0);
    const edited = await svc
      .from("clan_notices")
      .select("title,content")
      .eq("id", noticeId!)
      .single();
    expect(edited.error).toBeNull();
    expect(edited.data).toEqual({
      title: editedTitle,
      content: "모임 시작 10분 전에 접속해 주세요.",
    });
    await page
      .getByRole("button", { name: `${editedTitle} 고정 해제`, exact: true })
      .click();
    await expect
      .poll(async () => {
        const result = await svc
          .from("clan_notices")
          .select("is_pinned")
          .eq("id", noticeId!)
          .single();
        return result.data?.is_pinned;
      })
      .toBe(false);
    await page
      .getByRole("textbox", { name: "클랜 규칙", exact: true })
      .fill(`${title} 규칙\n서로 존중하며 플레이해요.`);
    await page.getByRole("button", { name: "규칙 저장", exact: true }).click();
    await expect(
      page.getByText("클랜 규칙을 저장했습니다.", { exact: true }),
    ).toBeVisible();

    await page.goto(base);
    await page
      .getByRole("region", { name: "클랜 공지사항", exact: true })
      .getByRole("link", { name: new RegExp(editedTitle) })
      .click();
    await expect(
      page
        .getByText("모임 시작 10분 전에 접속해 주세요.", { exact: true }),
    ).toBeVisible();
    await page.goto(base);
    await page
      .getByRole("button", { name: "클랜 규칙 전체 보기", exact: true })
      .click();
    await expect(
      page.getByRole("dialog").getByText(`${title} 규칙`, { exact: false }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto(`${base}/manage?tab=members`);
    await expect(
      page.getByRole("navigation", { name: "클랜 관리 항목" }).getByRole("link", { name: "구성원", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await page
      .getByRole("textbox", { name: "구성원 검색", exact: true })
      .fill(`missing-${title}`);
    await expect(
      page.getByText("조건에 맞는 멤버가 없습니다.", { exact: true }),
    ).toBeVisible();
    await page.goto(base+"/manage?tab=notices");
    await expect(page).toHaveURL(/\/board\/notices$/);
    await page
      .getByRole("button", { name: `${editedTitle} 삭제`, exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "공지 삭제", exact: true })
      .click();
    await expect
      .poll(async () => {
        const result = await svc
          .from("clan_notices")
          .select("id")
          .eq("id", noticeId!);
        return result.data?.length;
      })
      .toBe(0);
    await page.goto(base+"/manage");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("navigation", { name: "클랜 관리 분류", exact: true }).getByRole("link", { name: /^구성원 관리/ }).click();
    await page.getByRole("navigation", { name: "클랜 관리 항목", exact: true }).getByRole("link", { name: "구성원", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "구성원 검색", exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  } finally {
    await f.cleanup();
  }
});

test("management sections preserve navigation, pending counts and officer/member access", async ({ page }) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(3);
  const base = f.path.replace(/\/balance$/, "");
  const visitDate = isoToKstYmd(new Date(Date.now() - 86_400_000).toISOString());
  const today = isoToKstYmd(new Date().toISOString());
  const visitMonthKey = visitDate.slice(0, 7);
  const emptyDay = ["01", "02", "03"].find((day) => ![visitDate, today].includes(`${visitMonthKey}-${day}`))!;
  const emptyDate = `${visitMonthKey}-${emptyDay}`;
  const visitYear = Number(visitDate.slice(0, 4)), visitMonth = Number(visitDate.slice(5, 7));
  const visitMonthDays = new Date(Date.UTC(visitYear, visitMonth, 0)).getUTCDate();
  const historyYear = visitYear - 1;
  async function selectPopup(target: Page, label: string, option: string) {
    const trigger = target.getByRole("combobox", { name: label, exact: true });
    await trigger.click();
    await target.getByRole("option", { name: option, exact: true }).click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  }
  async function selectMonth(target: Page, value: string) {
    await selectPopup(target, "클랜 페이지 조회 연도", `${value.slice(0, 4)}년`);
    await selectPopup(target, "클랜 페이지 조회 월", `${Number(value.slice(5))}월`);
  }
  try {
    expect((await f.service.from("clan_daily_member_activity").upsert(f.users.slice(0, 2).map((user) => ({ clan_id: f.clanId, user_id: user.id, activity_date: visitDate })))).error).toBeNull();
    expect((await f.service.from("clan_daily_member_activity").upsert({ clan_id: f.clanId, user_id: f.users[2].id, activity_date: `${historyYear}-${visitDate.slice(5, 7)}-15` })).error).toBeNull();
    expect((await f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[2].id)).error).toBeNull();
    const request = await f.service.from("clan_join_requests").insert({ clan_id: f.clanId, game_id: f.gameId, user_id: f.users[2].id, message: "신청 전용 메시지", status: "pending" }).select("id").single();
    expect(request.error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    const initial = await page.goto(`${base}/manage`);
    expect(await initial!.text()).not.toContain("신청 전용 메시지");
    const nav = page.getByRole("navigation", { name: "클랜 관리 항목", exact: true });
    async function selectSection(key: string) {
      const group = ["overview", "appearance"].includes(key) ? "클랜 운영" : ["requests", "members"].includes(key) ? "구성원 관리" : "운영 설정";
      const label = { overview: "운영 현황", appearance: "클랜 꾸미기", requests: "가입 요청", members: "구성원", balance: "내전·경매", notifications: "알림·연동", insights: "운영 통계", subscription: "코인·플랜" }[key]!;
      await page.getByRole("navigation", { name: "클랜 관리 분류" }).getByRole("link", { name: new RegExp(`^${group}`) }).click();
      await nav.getByRole("link", { name: new RegExp(`^${label}`) }).click();
    }
    await page.getByRole("navigation", { name: "클랜 관리 분류" }).getByRole("link", { name: /^구성원 관리/ }).click();
    await expect(nav.getByRole("link", { name: "가입 요청 1", exact: true })).toBeVisible();
    await nav.getByRole("link", { name: "가입 요청 1", exact: true }).click();
    await page.getByTestId(`manage-join-approve-${request.data!.id}`).click();
    await page.getByRole("dialog", { name: "클랜 가입 승인", exact: true }).getByRole("button", { name: "가입 승인", exact: true }).click();
    await expect(page.getByText("대기 중인 가입 신청이 없습니다.", { exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "가입 요청", exact: true })).toBeVisible();
    await expect.poll(async () => (await f.service.from("clan_members").select("status").eq("clan_id", f.clanId).eq("user_id", f.users[2].id).single()).data?.status).toBe("active");

    for (const [label, heading] of [["클랜 꾸미기", "클랜 배너"], ["내전·경매", "세션 자동 종료"], ["운영 통계", "내전 운영 통계"], ["코인·플랜", "구독·플랜"]]) {
      await selectSection({ "클랜 꾸미기": "appearance", "내전·경매": "balance", "운영 통계": "insights", "코인·플랜": "subscription" }[label]!);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }
    await page.goBack();
    await expect(nav.getByRole("link", { name: "운영 통계", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("클랜 페이지", { exact: true })).toBeVisible();
    await expect(page.getByText("사이트 이용 통계", { exact: true })).toHaveCount(0);
    const usage = page.getByRole("region", { name: "클랜 페이지", exact: true });
    const usageNode = await usage.elementHandle();
    const usageHeight = (await usage.boundingBox())!.height;
    await usage.getByRole("button", { name: "방문 활동일 합계 도움말", exact: true }).hover();
    await expect(page.getByRole("tooltip")).toContainText("한 멤버가 하루 방문하면 1활동일");
    await page.keyboard.press("Escape");
    const monthFilter = usage.getByLabel("클랜 페이지 조회 월", { exact: true });
    await selectMonth(page, visitMonthKey);
    await expect(monthFilter).toHaveText(`${visitMonth}월`);
    await expect(usage.getByLabel("일별 방문자 그래프").getByRole("button")).toHaveCount(visitMonthDays);
    const visitBar = usage.getByRole("button", { name: `${visitDate} 방문 2명`, exact: true });
    const visitors = page.getByRole("tooltip").and(page.locator("[data-open]"));
    await visitBar.hover();
    await expect(visitors).toContainText(visitDate);
    for (const user of f.users.slice(0, 2)) await expect(visitors).toContainText(user.nickname);
    await visitors.hover();
    await expect(visitors).toBeVisible();
    await page.mouse.move(1, 1);
    await expect(visitors).toBeHidden();
    await visitBar.focus();
    await expect(visitors).toContainText(f.users[0].nickname);
    await page.keyboard.press("Escape");
    await expect(visitors).toBeHidden();
    await usage.getByRole("button", { name: `${emptyDate} 방문 0명`, exact: true }).hover();
    await expect(visitors).toContainText("방문 기록 없음");
    await expect(usage.getByText(/방문:/)).toHaveCount(0);
    await page.mouse.move(1, 1);
    await usage.getByRole("radio", { name: "표", exact: true }).click();
    await expect(usage.getByRole("table", { name: "날짜별 방문자 표", exact: true }).getByRole("row")).toHaveCount(visitMonthDays + 1);
    await expect(usage.getByRole("table", { name: "월별 방문자 표", exact: true }).getByRole("row")).toHaveCount(13);
    expect(Math.abs((await usage.boundingBox())!.height - usageHeight)).toBeLessThan(2);
    expect(await usageNode!.evaluate((node) => node.isConnected)).toBe(true);
    await usage.getByRole("radio", { name: "표", exact: true }).press("Home");
    await expect(usage.getByRole("radio", { name: "그래프", exact: true })).toHaveAttribute("aria-checked", "true");
    await selectMonth(page, "2024-02");
    await expect(usage.getByLabel("일별 방문자 그래프").getByRole("button")).toHaveCount(29);
    await expect(usage.getByText("2024.02.01 ~ 2024.02.29", { exact: true })).toBeVisible();
    await selectMonth(page, `${historyYear}-01`);
    await expect(usage.getByLabel("일별 방문자 그래프").getByRole("button")).toHaveCount(31);
    await usage.getByRole("button", { name: "방문한 멤버 도움말", exact: true }).focus();
    await expect(visitors).toContainText(`${historyYear - 1}-12-01 ~ ${historyYear - 1}-12-31`);
    await page.keyboard.press("Escape");
    await selectMonth(page, visitMonthKey);
    await monthFilter.click();
    await page.getByRole("option", { selected: true }).press("Home");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox", { name: "클랜 페이지 조회 월", exact: true })).toBeHidden();
    await expect(monthFilter).toHaveAttribute("aria-expanded", "false");
    await expect(monthFilter).toHaveText(`${visitMonth}월`);
    await expect(monthFilter).toBeFocused();
    const yearPicker = usage.getByRole("combobox", { name: "클랜 페이지 비교 연도", exact: true });
    await expect(yearPicker).toHaveText(`${visitYear}년`);
    expect(await usageNode!.evaluate((node) => node.isConnected)).toBe(true);
    expect(Math.abs((await usage.boundingBox())!.height - usageHeight)).toBeLessThan(2);
    const monthlyBar = usage.getByRole("button", { name: `${visitYear}년 ${visitMonth}월 방문 2명`, exact: true });
    await monthlyBar.hover();
    await expect(visitors).toContainText(`${visitYear}년 ${visitMonth}월`);
    for (const user of f.users.slice(0, 2)) await expect(visitors).toContainText(user.nickname);
    await expect(visitors.getByRole("listitem")).toHaveCount(2);
    await selectPopup(page, "클랜 페이지 비교 연도", `${historyYear}년`);
    const historyBar = usage.getByRole("button", { name: `${historyYear}년 ${visitMonth}월 방문 1명`, exact: true });
    await historyBar.focus();
    await expect(visitors).toContainText(`${historyYear}년 ${visitMonth}월`);
    await expect(visitors).toContainText(f.users[2].nickname);
    await expect(visitors.getByRole("listitem")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(visitors).toBeHidden();
    const emptyMonth = visitMonth === 12 ? 1 : visitMonth + 1;
    await usage.getByRole("button", { name: `${historyYear}년 ${emptyMonth}월 방문 0명`, exact: true }).hover();
    await expect(visitors).toContainText("방문 기록 없음");
    await page.mouse.move(1, 1);
    const touchContext = await page.context().browser()!.newContext({ hasTouch: true, viewport: { width: 390, height: 844 }, storageState: await page.context().storageState() });
    try {
      const touchPage = await touchContext.newPage();
      await touchPage.goto(`${base}/manage?tab=insights`);
      await touchPage.getByRole("combobox", { name: "클랜 페이지 조회 연도", exact: true }).tap();
      const touchYearList = touchPage.getByRole("listbox", { name: "클랜 페이지 조회 연도", exact: true });
      const yearPopupBox = (await touchYearList.boundingBox())!;
      expect(yearPopupBox.x).toBeGreaterThanOrEqual(0);
      expect(yearPopupBox.x + yearPopupBox.width).toBeLessThanOrEqual(390);
      expect(await touchYearList.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
      await touchPage.getByRole("option", { name: `${visitYear}년`, exact: true }).tap();
      await touchPage.getByRole("combobox", { name: "클랜 페이지 조회 월", exact: true }).tap();
      await touchPage.getByRole("option", { name: `${visitMonth}월`, exact: true }).tap();
      await touchPage.getByRole("button", { name: `${visitDate} 방문 2명`, exact: true }).tap();
      const touchVisitors = touchPage.getByRole("tooltip").and(touchPage.locator("[data-open]"));
      await expect(touchVisitors).toContainText(f.users[1].nickname);
      const popupBox = (await touchVisitors.boundingBox())!;
      expect(popupBox.x).toBeGreaterThanOrEqual(0);
      expect(popupBox.x + popupBox.width).toBeLessThanOrEqual(390);
      await expect.poll(() => touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await touchPage.getByRole("button", { name: `${visitDate} 방문 2명`, exact: true }).tap();
      await expect(touchVisitors).toBeHidden();
      await selectPopup(touchPage, "클랜 페이지 비교 연도", `${visitYear}년`);
      const touchMonth = touchPage.getByRole("button", { name: `${visitYear}년 ${visitMonth}월 방문 2명`, exact: true });
      await touchMonth.tap();
      await expect(touchVisitors).toContainText(`${visitYear}년 ${visitMonth}월`);
      await expect(touchVisitors).toContainText(f.users[1].nickname);
      const monthPopup = (await touchVisitors.boundingBox())!;
      expect(monthPopup.x).toBeGreaterThanOrEqual(0);
      expect(monthPopup.x + monthPopup.width).toBeLessThanOrEqual(390);
      await touchMonth.tap();
      await expect(touchVisitors).toBeHidden();
    } finally { await touchContext.close(); }
    await page.reload();
    await expect(nav.getByRole("link", { name: "운영 통계", exact: true })).toHaveAttribute("aria-current", "page");
    await page.goto(`${base}/manage#subscription`);
    await expect(page).toHaveURL(/tab=subscription/);
    await expect(page.getByRole("heading", { name: "구독·플랜", exact: true })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });

    for (const key of ["overview", "appearance", "requests", "members", "balance", "notifications", "insights", "subscription"]) {
      await selectSection(key);
      await expect(page).toHaveURL(new RegExp(`tab=${key}$`));
      await expect(nav.locator(`a[href$="tab=${key}"]`)).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("status").filter({ hasText: "불러오는 중" })).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }

    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, f.users[1]);
    const denied = await page.goto(`${base}/manage?tab=insights`);
    const deniedBody = await denied!.text();
    expect(deniedBody).not.toContain("신청 전용 메시지");
    await expect(page.getByRole("heading", { name: "접근 권한이 없습니다", exact: true })).toBeVisible();
    await expect(page.getByText("클랜 페이지", { exact: true })).toHaveCount(0);
    expect((await f.service.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id)).error).toBeNull();
    await page.reload();
    await expect(page.getByText("클랜 페이지", { exact: true })).toBeVisible();
    await selectSection("subscription");
    await expect(page.getByRole("heading", { name: "구독·플랜", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "테스트 플랜 전환", exact: true })).toHaveCount(0);
  } finally { await f.cleanup(); }
});
