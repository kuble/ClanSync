import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { gotoOverwatchLeaderClanBase } from "./fixture-login-helper";
import { loadTestEnv } from "../scripts/test-env.mjs";

test.use({ timezoneId: "Asia/Seoul" });

test("clan dashboard shows real notices, rules, local repeats and member-only MVPs", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const env = loadTestEnv();
  const svc = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const base = await gotoOverwatchLeaderClanBase(page);
  const clanId = base.split("/").at(-1)!;
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
            hof_config: { ...settings!.hof_config, eligibility_below_pct: 1 },
          })
          .eq("clan_id", clanId)
      ).error,
    ).toBeNull();
    const local = await page.evaluate(() => {
      const day = new Date();
      day.setDate(day.getDate() + 1);
      day.setHours(20, 0, 0, 0);
      const previous = new Date(day.getFullYear(), day.getMonth() - 1, 15, 20);
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
          match_type: "intra",
          status: "finished",
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
        .getByText("승률 100%", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "지난달 참여율 MVP", exact: true })
        .getByText("참여율 100%", { exact: true }),
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
    expect(notices!.width).toBeGreaterThan(rules!.width * 1.8);

    const rulesTrigger = page.getByRole("button", {
      name: "클랜 규칙 전체 보기",
      exact: true,
    });
    await rulesTrigger.click();
    await expect(
      page.getByRole("dialog").getByText(`${title} 규칙`, { exact: false }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(rulesTrigger).toBeFocused();
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
  }
});
