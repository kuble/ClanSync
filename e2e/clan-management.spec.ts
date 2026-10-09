import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

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
    await expect(page.getByText("사이트 이용 통계", { exact: true })).toHaveCount(0);
    await page.getByRole("navigation", { name: "클랜 관리 항목" }).getByRole("link", { name: "공지·규칙", exact: true }).click();
    await expect(page).toHaveURL(/tab=notices/);
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
      .getByRole("button", { name: new RegExp(editedTitle) })
      .click();
    await expect(
      page
        .getByRole("dialog")
        .getByText("모임 시작 10분 전에 접속해 주세요.", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
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
    await page.getByRole("navigation", { name: "클랜 관리 항목" }).getByRole("link", { name: "공지·규칙", exact: true }).click();
    await expect(page).toHaveURL(/tab=notices/);
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
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("combobox", { name: "클랜 관리 항목", exact: true }).selectOption("members");
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
  try {
    expect((await f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[2].id)).error).toBeNull();
    const request = await f.service.from("clan_join_requests").insert({ clan_id: f.clanId, game_id: f.gameId, user_id: f.users[2].id, message: "신청 전용 메시지", status: "pending" }).select("id").single();
    expect(request.error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    const initial = await page.goto(`${base}/manage`);
    expect(await initial!.text()).not.toContain("신청 전용 메시지");
    const nav = page.getByRole("navigation", { name: "클랜 관리 항목", exact: true });
    await expect(nav.getByRole("link", { name: "가입 요청 1", exact: true })).toBeVisible();
    await nav.getByRole("link", { name: "가입 요청 1", exact: true }).click();
    await page.getByTestId(`manage-join-approve-${request.data!.id}`).click();
    await expect(page.getByText("대기 중인 가입 신청이 없습니다.", { exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "가입 요청", exact: true })).toBeVisible();
    await expect.poll(async () => (await f.service.from("clan_members").select("status").eq("clan_id", f.clanId).eq("user_id", f.users[2].id).single()).data?.status).toBe("active");

    for (const [label, heading] of [["클랜 꾸미기", "클랜 배너"], ["내전·경매", "세션 자동 종료"], ["운영 통계", "내전 운영 통계"], ["코인·플랜", "구독·플랜"]]) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }
    await page.goBack();
    await expect(nav.getByRole("link", { name: "운영 통계", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("사이트 이용 통계", { exact: true })).toBeVisible();
    await page.reload();
    await expect(nav.getByRole("link", { name: "운영 통계", exact: true })).toHaveAttribute("aria-current", "page");
    await page.goto(`${base}/manage#subscription`);
    await expect(page).toHaveURL(/tab=subscription/);
    await expect(page.getByRole("heading", { name: "구독·플랜", exact: true })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const select = page.getByRole("combobox", { name: "클랜 관리 항목", exact: true });
    for (const key of ["overview", "notices", "appearance", "requests", "members", "balance", "insights", "subscription"]) {
      await select.selectOption(key);
      await expect(page).toHaveURL(new RegExp(`tab=${key}$`));
      await expect(select).toHaveValue(key);
      await expect(page.getByRole("status").filter({ hasText: "불러오는 중" })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }

    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, f.users[1]);
    const denied = await page.goto(`${base}/manage?tab=insights`);
    const deniedBody = await denied!.text();
    expect(deniedBody).not.toContain("신청 전용 메시지");
    await expect(page.getByRole("heading", { name: "접근 권한이 없습니다", exact: true })).toBeVisible();
    await expect(page.getByText("사이트 이용 통계", { exact: true })).toHaveCount(0);
    expect((await f.service.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id)).error).toBeNull();
    await page.reload();
    await expect(page.getByText("사이트 이용 통계", { exact: true })).toBeVisible();
    await select.selectOption("subscription");
    await expect(page.getByRole("heading", { name: "구독·플랜", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "테스트 플랜 전환", exact: true })).toHaveCount(0);
  } finally { await f.cleanup(); }
});
