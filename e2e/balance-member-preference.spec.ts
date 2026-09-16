import { expect, test, type Page } from "@playwright/test";
import {
  createIsolatedBalanceFixture,
  type BalanceTestUser,
} from "./isolated-balance-fixture";

async function loginAt(page: Page, origin: string, user: BalanceTestUser) {
  await page.goto(`${origin}/sign-in`);
  await page.getByLabel("이메일").fill(user.email);
  await page.getByLabel("비밀번호", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.waitForURL(`${origin}/games`, { timeout: 45_000 });
}

test("서로 다른 루프백 탭: 클랜원 선호 저장·프로필 복귀·운영진 조작 숨김", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const fixture = await createIsolatedBalanceFixture(2);
  const origin = new URL(baseURL!);
  const operatorOrigin = `${origin.protocol}//localhost:${origin.port}`;
  const memberOrigin = `${origin.protocol}//127.0.0.1:${origin.port}`;
  const member = await context.newPage();
  const leaderClient = await fixture.memberClient(0);
  try {
    const opened = await leaderClient.rpc("open_balance_session_series", {
      p_clan_id: fixture.clanId,
    });
    expect(opened.error).toBeNull();
    const emptyTeam = { tank: null, dmg: [null, null], sup: [null, null] };
    const roster = {
      team1: { ...emptyTeam, tank: fixture.users[0].id },
      team2: { ...emptyTeam, tank: fixture.users[1].id },
    };
    const initial = await fixture.activeRound();
    const saved = await leaderClient
      .from("balance_sessions")
      .update({ roster })
      .eq("id", initial.id);
    expect(saved.error).toBeNull();
    const round = await fixture.activeRound();
    const settings = await leaderClient.rpc("set_balance_formation_settings", {
      p_round_id: round.id,
      p_revision: round.formation_revision,
      p_settings: {
        roles: "lottery",
        teams: "random",
        auctionBudget: 1000,
        minBid: 10,
        durationSeconds: 20,
      },
      p_map_ban: false,
      p_hero_ban: false,
    });
    expect(settings.error).toBeNull();
    expect(settings.data).toBe(true);
    await loginAt(page, operatorOrigin, fixture.users[0]);
    await loginAt(member, memberOrigin, fixture.users[1]);
    await page.goto(`${operatorOrigin}${fixture.path}`);
    await member.goto(`${memberOrigin}${fixture.path}`);
    const operatorPanel = page.getByTestId("clan-balance-session-panel");
    const memberPanel = member.getByTestId("clan-balance-session-panel");
    await expect(
      operatorPanel.getByRole("button", { name: "라운드 설정", exact: true }),
    ).toBeVisible();
    for (const name of [
      "라운드 설정",
      "명단 변경 되돌리기",
      "출전 명단 초기화",
      "화면 안내",
      "편성 시작",
      "방송용 화면",
    ]) {
      await expect(
        memberPanel.getByRole("button", { name, exact: true }),
      ).toHaveCount(0);
    }

    const picker = memberPanel.getByRole("group", {
      name: "이번 라운드 내 선호",
      exact: true,
    });
    const options = picker.getByRole("button", {
      name: "선호 옵션",
      exact: true,
    });
    const readOwnPreference = async () => {
      const { data, error } = await fixture.service
        .from("balance_round_role_preferences")
        .select("ranking")
        .eq("round_id", round.id)
        .eq("user_id", fixture.users[1].id)
        .maybeSingle();
      expect(error).toBeNull();
      return data?.ranking ?? null;
    };
    await expect(picker.getByRole("list").getByRole("button")).toHaveCount(3);
    await expect(member.getByRole("menuitemradio")).toHaveCount(0);
    await options.click();
    await member
      .getByRole("menuitemradio", { name: "선호 없음", exact: true })
      .click();
    await expect.poll(readOwnPreference).toEqual([]);
    await expect(options).toBeEnabled({ timeout: 20_000 });
    await picker.getByRole("button", { name: /탱커/ }).click();
    await picker.getByRole("button", { name: /딜러/ }).click();
    await expect.poll(readOwnPreference).toEqual(["dmg", "tank", "sup"]);
    await expect(options).toBeEnabled({ timeout: 20_000 });
    await member.reload();
    await expect(
      picker.getByRole("button", { name: "1순위 딜러", exact: true }),
    ).toBeVisible();
    await options.click();
    await member
      .getByRole("menuitemradio", { name: "프로필 기본값", exact: true })
      .click();
    await expect.poll(readOwnPreference).toBeNull();
    await expect(options).toBeEnabled({ timeout: 20_000 });
    await options.click();
    await expect(
      member.getByRole("menuitemradio", { name: "프로필 기본값", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(
      member.getByRole("menuitem", {
        name: "프로필에서 기본값 설정",
        exact: true,
      }),
    ).toHaveAttribute("href", "/profile");
    await member.keyboard.press("Escape");

    const { data: preferences, error } = await fixture.service
      .from("balance_round_role_preferences")
      .select("user_id")
      .eq("round_id", round.id);
    expect(error).toBeNull();
    expect(preferences).toEqual([]);
    // Both logins survive in the same browser context without sharing cookies.
    await page.reload();
    await expect(
      operatorPanel.getByRole("button", { name: "라운드 설정", exact: true }),
    ).toBeVisible();
    await expect(
      memberPanel.getByRole("button", { name: "라운드 설정", exact: true }),
    ).toHaveCount(0);
  } finally {
    await member.close();
    await leaderClient.auth.signOut({ scope: "local" });
    await fixture.cleanup();
  }
});
