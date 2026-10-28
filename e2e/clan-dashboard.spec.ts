import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import type { Json } from "../src/lib/supabase/database.types";

test.use({ timezoneId: "Asia/Seoul" });

test("clan dashboard shows real notices, rules, local repeats and member-only MVPs", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const fixture = await createIsolatedBalanceFixture(2);
  const svc = fixture.service;
  const clanId = fixture.clanId;
  const base = `/games/overwatch/clan/${clanId}`;
  await loginIsolatedBalanceUser(page, fixture.users[0]);
  const title = `dashboard-${Date.now()}`;
  const [{ data: clan }, { data: settings }, { data: leader }] =
    await Promise.all([
      svc
        .from("clans")
        .select("rules,subscription_tier,game_id")
        .eq("id", clanId)
        .single(),
      svc
        .from("clan_settings")
        .select("expose_hof,hof_config")
        .eq("clan_id", clanId)
        .single(),
      svc
        .from("clan_members")
        .select("user_id")
        .eq("clan_id", clanId)
        .eq("role", "leader")
        .eq("status", "active")
        .single(),
    ]);
  expect(clan).not.toBeNull();
  expect(settings).not.toBeNull();
  expect(leader).not.toBeNull();
  const eventId = crypto.randomUUID();
  const pollId = crypto.randomUUID();
  const matchId = crypto.randomUUID();
  const drawMatchId = crypto.randomUUID();
  const unrecordedMatchId = crypto.randomUUID();
  try {
    expect(
      (
        await svc
          .from("clans")
          .update({
            rules: `${title} 규칙\n서로 존중하고 즐겁게 게임해요.`,
            subscription_tier: "free",
          })
          .eq("id", clanId)
      ).error,
    ).toBeNull();
    expect(
      (
        await svc
          .from("clan_settings")
          .update({
            expose_hof: false,
            hof_config: { ...(settings!.hof_config as Record<string, Json>), eligibility_below_pct: 1 },
          })
          .eq("clan_id", clanId)
      ).error,
    ).toBeNull();
    const local = await page.evaluate(() => {
      const day = new Date();
      const previous = new Date(day.getFullYear(), day.getMonth() - 1, 15, 20);
      day.setDate(day.getDate() + 1);
      day.setHours(20, 0, 0, 0);
      return {
        start: day.toISOString(),
        weekday: day.getDay() || 7,
        previous: previous.toISOString(),
      };
    });
    const inserts = await Promise.all([
      svc.from("clan_events").insert({
        id: eventId,
        clan_id: clanId,
        created_by: leader!.user_id,
        title: `${title} 정기 내전`,
        kind: "intra",
        source: "manual",
        start_at: local.start,
        repeat: "weekly",
        repeat_weekdays: [local.weekday],
        repeat_time: "20:00:00",
      }),
      svc.from("clan_polls").insert({
        id: pollId,
        clan_id: clanId,
        created_by: leader!.user_id,
        title: `${title} 모임 투표`,
        deadline_at: local.start,
        post_to_notice: true,
      }),
      svc.from("matches").insert(
        [matchId, drawMatchId, unrecordedMatchId].map((id) => ({
          id,
          clan_id: clanId,
          game_id: clan!.game_id,
          created_by: leader!.user_id,
          match_type: "intra" as const,
          status: "finished" as const,
          played_at: local.previous,
        })),
      ),
    ]);
    for (const result of inserts) expect(result.error).toBeNull();
    expect(
      (
        await svc
          .from("match_players")
          .insert(
            [matchId, drawMatchId, unrecordedMatchId].map((id) => ({
              match_id: id,
              user_id: leader!.user_id,
              team: 1,
            })),
          )
      ).error,
    ).toBeNull();
    expect(
      (
        await svc.from("match_results").insert([
          { match_id: matchId, winner_team: 1 },
          { match_id: drawMatchId, winner_team: null },
        ])
      ).error,
    ).toBeNull();

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base);
    const grid = page.getByTestId("clan-dashboard-grid");
    await expect(grid).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "클랜 공지사항", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "다가오는 일정 목록", exact: true }).getByRole("link")).toHaveCount(2);
    await expect(
      page.getByRole("link", { name: new RegExp(`${title} 모임 투표`) }),
    ).toHaveAttribute("href", /events\?tab=polls$/);
    await expect(
      page
        .getByRole("region", { name: "다가오는 일정", exact: true })
        .getByText("20:00", { exact: false })
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "지난달 승률 MVP", exact: true })
        .getByText("승률 100.0%", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "지난달 참여율 MVP", exact: true })
        .getByText("참여율 100.0%", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "지난달 참여율 MVP", exact: true })
        .getByText("클랜 내전 3경기 중 3경기 참여", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "지난달 승률 MVP", exact: true })
        .getByText("3경기 참여 · 1승 0패", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("세션 요약", { exact: true })).toHaveCount(0);

    const notices = await page
      .getByRole("region", { name: "클랜 공지사항", exact: true })
      .boundingBox();
    const rules = await page
      .getByRole("region", { name: "클랜 규칙", exact: true })
      .boundingBox();
    expect(rules!.x).toBeGreaterThan(notices!.x + notices!.width);
    expect(notices!.width).toBeGreaterThan(rules!.width * 1.2);

    await expect(page.getByRole("heading", { name: "지난달 MVP", exact: true })).toHaveCount(0);
    await expect(grid.getByRole("link", { name: /공지 관리|배지 케이스 보기|^이벤트$/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "클랜 규칙 전체 보기", exact: true })).toHaveCount(0);
    const destinations = [
      ["클랜 공지사항", "/board/notices"], ["클랜 규칙", "/board/notices#rules"],
      ["다가오는 일정", "/events"], ["클랜 배지", "/badges"],
      ["지난달 승률 MVP", "/stats"], ["지난달 참여율 MVP", "/stats"], ["지난달 승부예측 MVP", "/stats"],
    ] as const;
    for (const [name, path] of destinations) {
      await expect(page.getByRole("region", { name, exact: true }).getByRole("link", { name, exact: true })).toHaveAttribute("href", base + path);
    }
    // Click non-title space to verify the card link, including the inert badge preview.
    for (const [name, path] of destinations.slice(0, 5)) {
      const region = page.getByRole("region", { name, exact: true });
      const bounds = (await region.boundingBox())!;
      await region.click({ position: { x: bounds.width - 12, y: bounds.height - 12 } });
      await expect(page).toHaveURL(base + path);
      await page.goto(base);
      await expect(page.getByTestId("clan-dashboard-grid")).toBeVisible();
    }
    await page
      .getByRole("button", { name: "Premium 알아보기", exact: true })
      .click();
    await expect(
      page
        .getByRole("dialog")
        .getByText("Free / Premium 플랜 비교", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    const outside = await browser.newContext();
    try {
      const visitor = await outside.newPage();
      await visitor.goto(base);
      await expect(visitor).toHaveURL(/sign-in/);
      await expect(visitor.getByTestId("clan-dashboard-grid")).toHaveCount(0);
    } finally {
      await outside.close();
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileNotice = await page
      .getByRole("region", { name: "클랜 공지사항", exact: true })
      .boundingBox();
    const mobileRules = await page
      .getByRole("region", { name: "클랜 규칙", exact: true })
      .boundingBox();
    expect(mobileRules!.y).toBeGreaterThan(
      mobileNotice!.y + mobileNotice!.height,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    for (const theme of ["dark", "light"]) {
      const toggle = page.getByRole("button", { name: "라이트 테마", exact: true });
      if ((await toggle.getAttribute("aria-pressed")) !== String(theme === "light")) await toggle.click();
      await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
      for (const width of [1304, 1100, 900, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        const noticeBox = (await page.getByRole("region", { name: "클랜 공지사항", exact: true }).boundingBox())!;
        const eventBox = (await page.getByRole("region", { name: "다가오는 일정", exact: true }).boundingBox())!;
        const badgesBox = (await page.getByRole("region", { name: "클랜 배지", exact: true }).boundingBox())!;
        const rulesBox = (await page.getByRole("region", { name: "클랜 규칙", exact: true }).boundingBox())!;
        const mvpBox = (await page.getByRole("region", { name: "지난달 MVP", exact: true }).boundingBox())!;
        const gap = width >= 640 ? 20 : 16;
        if (width >= 800) {
          expect(eventBox.y).toBeCloseTo(noticeBox.y, 0);
          expect(eventBox.height).toBeCloseTo(noticeBox.height, 0);
          expect(eventBox.width).toBeGreaterThan(noticeBox.width * (width >= 1200 ? 1.2 : 1.8));
        } else expect(eventBox.y - noticeBox.y - noticeBox.height).toBeCloseTo(gap, 0);
        expect(mvpBox.y - Math.max(eventBox.y + eventBox.height, noticeBox.y + noticeBox.height)).toBeCloseTo(gap, 0);
        if (width >= 1200) {
          expect(rulesBox.y).toBeCloseTo(noticeBox.y, 0);
          expect(rulesBox.x).toBeGreaterThan(eventBox.x + eventBox.width);
          expect(badgesBox.y - rulesBox.y - rulesBox.height).toBeCloseTo(gap, 0);
          expect(badgesBox.y + badgesBox.height).toBeCloseTo(noticeBox.y + noticeBox.height, 0);
        } else {
          expect(rulesBox.y - mvpBox.y - mvpBox.height).toBeCloseTo(gap, 0);
          if (width >= 640) expect(badgesBox.y).toBeCloseTo(rulesBox.y, 0);
          else expect(badgesBox.y - rulesBox.y - rulesBox.height).toBeCloseTo(gap, 0);
        }
        expect((await page.locator("[data-rules-preview]").boundingBox())!.height).toBeLessThanOrEqual(56);
        const eventList = page.getByRole("region", { name: "다가오는 일정 목록", exact: true });
        expect(await eventList.locator("[data-event-title], time").evaluateAll((elements) => elements.every((element) => element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1))).toBe(true);
        await expect(eventList.locator("time").first()).toContainText("20:00");
        const caseSpacing = await page.getByRole("region", { name: "클랜 배지", exact: true }).locator("[data-badge-case]").evaluate((element) => {
          const box = element.getBoundingClientRect(), style = getComputedStyle(element);
          const plate = element.firstElementChild!.getBoundingClientRect(), pins = element.lastElementChild!.getBoundingClientRect();
          return { top: plate.top - box.top - parseFloat(style.borderTopWidth), bottom: box.bottom - pins.bottom - parseFloat(style.borderBottomWidth) };
        });
        expect(Math.abs(caseSpacing.top - caseSpacing.bottom)).toBeLessThan(2);
        const mvp = page.getByRole("region", { name: "지난달 MVP", exact: true });
        const winners = await mvp.locator("section").evaluateAll(els => els.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
        expect(new Set(winners.map(box => box.y)).size).toBe(width >= 900 ? 1 : width >= 640 ? 2 : 3);
        if (width === 320 || width === 1304) {
          await page.getByRole("heading", { name: "클랜 공지사항", exact: true }).scrollIntoViewIfNeeded();
          await page.screenshot({ path: test.info().outputPath(`dashboard-${width}-${theme}.png`) });
          await mvp.scrollIntoViewIfNeeded();
          await page.screenshot({ path: test.info().outputPath(`mvp-${width}-${theme}.png`) });
        }
      }
    }
  } finally {
    const cleanup = await Promise.all([
      svc.from("clan_events").delete().eq("id", eventId),
      svc.from("clan_polls").delete().eq("id", pollId),
      svc
        .from("matches")
        .delete()
        .in("id", [matchId, drawMatchId, unrecordedMatchId]),
      svc
        .from("clans")
        .update({
          rules: clan!.rules,
          subscription_tier: clan!.subscription_tier,
        })
        .eq("id", clanId),
      svc
        .from("clan_settings")
        .update({
          expose_hof: settings!.expose_hof,
          hof_config: settings!.hof_config,
        })
        .eq("clan_id", clanId),
    ]);
    for (const result of cleanup) expect(result.error).toBeNull();
    await fixture.cleanup();
  }
});
