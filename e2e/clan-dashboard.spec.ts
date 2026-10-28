import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import type { Json } from "../src/lib/supabase/database.types";

test.use({ timezoneId: "Asia/Seoul" });

test("clan dashboard shows real notices, rules, local repeats and member-only MVPs", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const fixture = await createIsolatedBalanceFixture(3);
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
  const secondWinMatchId = crypto.randomUUID();
  const seriesId = crypto.randomUUID();
  const roundIds = [crypto.randomUUID(), crypto.randomUUID()];
  try {
    expect(
      (
        await svc
          .from("clans")
          .update({
            rules: Array.from({ length: 16 }, (_, index) => `${index + 1}. ${title} 규칙: 서로 존중하고 즐겁게 게임해요.`).join("\n"),
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
        [matchId, drawMatchId, unrecordedMatchId, secondWinMatchId].map((id) => ({
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
            [...[matchId, drawMatchId, unrecordedMatchId, secondWinMatchId].map((id) => ({
              match_id: id,
              user_id: leader!.user_id,
              team: 1,
            })),
            ...[matchId, drawMatchId, secondWinMatchId].map(id => ({ match_id: id, user_id: fixture.users[1].id, team: id === matchId ? 2 : 1 })),
            ...[matchId, secondWinMatchId].map(id => ({ match_id: id, user_id: fixture.users[2].id, team: 2 }))],
          )
      ).error,
    ).toBeNull();
    expect(
      (
        await svc.from("match_results").insert([
          { match_id: matchId, winner_team: 1 },
          { match_id: drawMatchId, winner_team: null },
          { match_id: secondWinMatchId, winner_team: 1 },
        ])
      ).error,
    ).toBeNull();

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.clock.install();
    await page.goto(base);
    const grid = page.getByTestId("clan-dashboard-grid");
    await expect(grid).toBeVisible();
    const ticker = page.getByRole("region", { name: "클랜 규칙", exact: true });
    const ruleText = ticker.locator("[data-rule-text]");
    await expect(ticker.getByRole("button")).toHaveCount(0);
    await expect(ticker.getByRole("link", { name: /^규칙 1:/ })).toBeVisible();
    await page.clock.fastForward(8100);
    await expect(ticker.getByRole("link", { name: /^규칙 2:/ })).toBeVisible();
    await ticker.hover();
    const heldText = await ruleText.textContent();
    await page.clock.fastForward(16000);
    await expect(ruleText).toHaveText(heldText!);
    await page.locator("h1").hover();
    await ticker.getByRole("link", { name: "클랜 규칙", exact: true }).focus();
    await page.clock.fastForward(16000);
    await expect(ruleText).toHaveText(heldText!);
    await page.getByRole("link", { name: "클랜 공지사항", exact: true }).focus();
    await page.clock.fastForward(8100);
    await expect(ticker.getByRole("link", { name: /^규칙 3:/ })).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await expect(ticker.getByRole("link", { name: /^규칙 1:/ })).toBeVisible();
    await page.clock.fastForward(16000);
    await expect(ticker.getByRole("link", { name: /^규칙 1:/ })).toBeVisible();
    expect(await ruleText.evaluate(element => getComputedStyle(element).animationName)).toBe("none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(
      page.getByRole("heading", { name: "클랜 공지사항", exact: true }),
    ).toBeVisible();
    for (const [name, ratios] of [["지난달 승률 MVP", [100, 50, 0]], ["지난달 참여율 MVP", [100, 75, 50]]] as const) {
      const winner = page.getByRole("region", { name, exact: true });
      const places = winner.getByRole("listitem");
      await expect(places).toHaveCount(3);
      for (const [index, percentage] of ratios.entries()) {
        await expect(places.nth(index)).toHaveAttribute("data-rank", String(index + 1));
        await expect(places.nth(index)).toContainText(fixture.users[index].nickname);
        await expect(places.nth(index).getByText(`${percentage.toFixed(1)}%`, { exact: true })).toBeVisible();
      }
      expect(new Set(await places.locator("svg").evaluateAll(icons => icons.map(icon => getComputedStyle(icon).color))).size).toBe(3);
      await expect(winner.locator("[data-namecard]")).toHaveCount(0);
      await expect(winner.getByRole("meter")).toHaveCount(0);
    }
    await expect(page.getByRole("link", { name: "내전 로비 열기", exact: true })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "다가오는 일정 목록", exact: true }).getByRole("link")).toHaveCount(3);
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
        .getByText("100.0%", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "지난달 참여율 MVP", exact: true })
        .getByText("100.0%", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "지난달 MVP", exact: true }).getByText(/경기 참여|경기 중|칭호 없음/)).toHaveCount(0);
    await expect(page.getByText("세션 요약", { exact: true })).toHaveCount(0);

    const notices = await page
      .getByRole("region", { name: "클랜 공지사항", exact: true })
      .boundingBox();
    const rules = await page
      .getByRole("region", { name: "클랜 규칙", exact: true })
      .boundingBox();
    expect(rules!.x).toBeCloseTo(notices!.x, 0);
    expect(rules!.y + rules!.height).toBeLessThan(notices!.y);

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
    for (const [name, path] of destinations.slice(0, 5).filter(([name]) => name !== "클랜 규칙")) {
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
    expect(mobileRules!.y + mobileRules!.height).toBeLessThan(mobileNotice!.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    for (const theme of ["dark", "light"]) {
      const toggle = page.getByRole("button", { name: "라이트 테마", exact: true });
      if ((await toggle.getAttribute("aria-pressed")) !== String(theme === "light")) await toggle.click();
      await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
      for (const width of [1304, 1100, 900, 768, 698, 390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        const noticeBox = (await page.getByRole("region", { name: "클랜 공지사항", exact: true }).boundingBox())!;
        const eventBox = (await page.getByRole("region", { name: "다가오는 일정", exact: true }).boundingBox())!;
        const badgesBox = (await page.getByRole("region", { name: "클랜 배지", exact: true }).boundingBox())!;
        const rulesBox = (await page.getByRole("region", { name: "클랜 규칙", exact: true }).boundingBox())!;
        const heroBox = (await page.getByRole("region", { name: "클랜 소개", exact: true }).boundingBox())!;
        const mvpBox = (await page.getByRole("region", { name: "지난달 MVP", exact: true }).boundingBox())!;
        const gap = width >= 640 ? 16 : 12;
        if (width >= 800) {
          expect(eventBox.y).toBeCloseTo(noticeBox.y, 0);
          expect(eventBox.height).toBeCloseTo(noticeBox.height, 0);
          expect(eventBox.width).toBeGreaterThan(noticeBox.width * (width >= 1024 ? 1.2 : 1.8));
        } else expect(eventBox.y - noticeBox.y - noticeBox.height).toBeCloseTo(gap, 0);
        expect(mvpBox.y - Math.max(eventBox.y + eventBox.height, noticeBox.y + noticeBox.height)).toBeCloseTo(gap, 0);
        expect(rulesBox.height).toBeCloseTo(52, 0);
        expect(rulesBox.y - heroBox.y - heroBox.height).toBeCloseTo(20, 0);
        expect(noticeBox.y - rulesBox.y - rulesBox.height).toBeCloseTo(16, 0);
        expect(badgesBox.x).toBeGreaterThanOrEqual(heroBox.x);
        expect(badgesBox.y).toBeGreaterThanOrEqual(heroBox.y);
        expect(badgesBox.y + badgesBox.height).toBeLessThanOrEqual(heroBox.y + heroBox.height);
        expect(await ticker.locator("[data-rule-text]").evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(24);
        const eventList = page.getByRole("region", { name: "다가오는 일정 목록", exact: true });
        expect(await eventList.locator("[data-event-title], time").evaluateAll((elements) => elements.every((element) => element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1))).toBe(true);
        await expect(eventList.locator("time").first()).toContainText("20:00");
        const eventRows = await eventList.getByRole("link").evaluateAll((elements) => elements.map((element) => { const rect = element.getBoundingClientRect(); return { y: rect.y, height: rect.height }; }));
        expect(eventRows).toHaveLength(3);
        expect(eventRows[0].height).toBeGreaterThanOrEqual(96);
        expect(eventRows[1].y - eventRows[0].y - eventRows[0].height).toBeCloseTo(12, 0);
        if (width >= 1024) {
          const listHeight = eventRows.reduce((sum, row) => sum + row.height, 0) + 24;
          expect(eventBox.height - listHeight).toBeLessThan(80);
        }
        const mvp = page.getByRole("region", { name: "지난달 MVP", exact: true });
        expect(await grid.locator(":scope > section").last().getAttribute("aria-label")).toBe("지난달 MVP");
        await expect(mvp.locator("[data-namecard]")).toHaveCount(0);
        const winners = await mvp.locator("section").evaluateAll(els => els.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
        expect(new Set(winners.map(box => box.y)).size).toBe(width >= 800 ? 1 : 3);
        const podium = page.getByRole("region", { name: "지난달 승률 MVP", exact: true }).getByRole("listitem");
        const [gold, silver, bronze] = await podium.evaluateAll(items => items.map(item => { const box = item.getBoundingClientRect(); return { x: box.x, y: box.y, bottom: box.bottom }; }));
        expect(silver.x).toBeLessThan(gold.x);
        expect(gold.x).toBeLessThan(bronze.x);
        expect(gold.y).toBeLessThan(silver.y);
        expect(silver.y).toBeLessThan(bronze.y);
        expect(gold.bottom).toBeCloseTo(bronze.bottom, 0);
        if (width === 320 || width === 1304) {
          await page.getByRole("heading", { name: "클랜 공지사항", exact: true }).scrollIntoViewIfNeeded();
          await page.screenshot({ path: test.info().outputPath(`dashboard-${width}-${theme}.png`) });
          await mvp.scrollIntoViewIfNeeded();
          await page.screenshot({ path: test.info().outputPath(`mvp-${width}-${theme}.png`) });
        }
      }
    }

    // Prediction shows only the actual ranked player, with empty remaining places.
    expect((await svc.from("clans").update({ subscription_tier: "premium" }).eq("id", clanId)).error).toBeNull();
    expect((await svc.from("balance_session_series").insert({ id: seriesId, clan_id: clanId, game_id: clan!.game_id, host_user_id: leader!.user_id, opened_at: local.previous, closed_at: local.previous })).error).toBeNull();
    expect((await svc.from("balance_rooms").update({ kind: "regular", status: "closed" }).eq("id", seriesId)).error).toBeNull();
    for (const [index, id] of roundIds.entries()) {
      expect((await svc.from("balance_sessions").insert({ id, series_id: seriesId, round_number: index + 1, clan_id: clanId, game_id: clan!.game_id, host_user_id: leader!.user_id, opened_at: local.previous, phase: "map_ban", match_outcome: "pending", prediction_pool_enabled: false, map_ban_deadline_at: new Date(Date.now() + 60_000).toISOString() })).error).toBeNull();
      expect((await svc.from("balance_session_predictions").insert({ session_id: id, user_id: fixture.users[1].id, pick_team: 1 })).error).toBeNull();
      expect((await svc.from("balance_sessions").update({ phase: "match_live", map_ban_deadline_at: null, resolved_map_label: "부산", match_outcome: index ? "team2" : "team1", closed_at: local.previous, predictions_settled_at: local.previous }).eq("id", id)).error).toBeNull();
    }
    await page.setViewportSize({ width: 1304, height: 844 });
    await page.goto(base);
    const predictor = page.getByRole("region", { name: "지난달 승부예측 MVP", exact: true });
    await expect(predictor.getByRole("listitem").first()).toContainText(fixture.users[1].nickname);
    await expect(predictor.getByText("50.0%", { exact: true })).toBeVisible();
    await expect(predictor.getByRole("listitem", { name: /기록 없음/ })).toHaveCount(2);
    await page.screenshot({ path: test.info().outputPath("dashboard-premium-podiums.png") });
    expect((await svc.from("match_players").update({ team: 1 }).eq("match_id", matchId).eq("user_id", fixture.users[1].id)).error).toBeNull();
    await page.goto(base);
    const tied = page.getByRole("region", { name: "지난달 승률 MVP", exact: true });
    await expect(tied.getByRole("listitem", { name: /^공동 1위/ })).toHaveCount(2);
    await expect(tied.getByRole("listitem").nth(2)).toHaveAttribute("data-rank", "3");
    await page.goto(base + "/store");
    await expect(page.getByRole("region", { name: "클랜 소개", exact: true })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "내전 로비 열기", exact: true })).toBeVisible();
    for (const rulesValue of ["한 가지 규칙", null]) {
      expect((await svc.from("clans").update({ rules: rulesValue }).eq("id", clanId)).error).toBeNull();
      await page.goto(base);
      await expect(ticker.getByRole("button")).toHaveCount(0);
      await expect(ruleText).toHaveText(rulesValue ?? "등록된 규칙이 없습니다.");
    }
  } finally {
    const cleanup = await Promise.all([
      svc.from("clan_events").delete().eq("id", eventId),
      svc.from("clan_polls").delete().eq("id", pollId),
      svc
        .from("matches")
        .delete()
        .in("id", [matchId, drawMatchId, unrecordedMatchId, secondWinMatchId]),
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
