import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  createIsolatedBalanceFixture,
  loginIsolatedBalanceUser,
} from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000 });

async function expectComposition(page: Page, intro: Locator, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await expect(intro).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, content: document.documentElement.scrollWidth, viewport: innerWidth }))).toMatchObject({ overflow: false });
  const emblems = intro.getByRole("region", { name: "대표 엠블럼", exact: true });
  const heading = await emblems.getByRole("heading", { name: "대표 엠블럼", exact: true }).boundingBox();
  const launcher = await emblems.locator("[data-personal-emblem-launcher]").boundingBox();
  const summary = await intro.getByRole("button", { name: "한 줄 소개 편집", exact: true }).locator("..").boundingBox();
  expect(summary!.y + summary!.height).toBeLessThanOrEqual(heading!.y);
  expect(heading!.y + heading!.height).toBeLessThanOrEqual(launcher!.y);
  expect(Math.abs(heading!.x - launcher!.x)).toBeLessThan(1);
  const clans = intro.getByRole("region", { name: "클랜 프로필", exact: true });
  const card = await intro.getByRole("region", { name: "공통 네임카드", exact: true }).boundingBox();
  const facts = await intro.getByRole("region", { name: "기본 정보", exact: true }).boundingBox();
  expect(card!.y + card!.height).toBeLessThanOrEqual(facts!.y);
  if (await clans.isVisible()) {
    const cards = await clans.boundingBox();
    expect(cards!.y + cards!.height).toBeLessThanOrEqual(facts!.y);
  }
  if (width > 1000) {
    expect(card!.x + card!.width).toBeLessThan(summary!.x);
    expect(Math.abs(card!.y - summary!.y)).toBeLessThan(48);
  } else expect(facts!.y + facts!.height).toBeLessThanOrEqual(summary!.y);
  const hero = await page.getByTestId("profile-hero").boundingBox();
  const panel = await page.getByRole("tabpanel", { name: "플레이어 소개", exact: true }).boundingBox();
  expect(Math.abs(hero!.width - panel!.width)).toBeLessThan(2);
}

test("소개·대표 엠블럼·계정 탭을 유지하고 진열장 없이 프로필을 표시한다", async ({ page }, info) => {
  test.setTimeout(150_000);
  const fixture = await createIsolatedBalanceFixture(1);
  const [user] = fixture.users;
  const battleTag = `Compose${user.id.slice(0, 8)}#1234`;
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    expect((await fixture.service.from("user_game_profiles").update({ battle_tag: battleTag }).eq("user_id", user.id).eq("game_id", fixture.gameId)).error).toBeNull();
    expect((await fixture.service.from("users").update({ gender: "female", birth_year: 1998 }).eq("id", user.id)).error).toBeNull();
    const metadataSetup = await fixture.service.auth.admin.updateUserById(user.id, {
      user_metadata: { profile_composition_sentinel: fixture.clanId },
    });
    expect(metadataSetup.error).toBeNull();
    await loginIsolatedBalanceUser(page, user);
    await page.goto("/profile");
    const hero = page.getByTestId("profile-hero");
    const intro = page.getByRole("region", { name: "플레이어 소개", exact: true });
    const facts = intro.getByRole("region", { name: "기본 정보", exact: true });
    await expect(facts).toContainText("여성");
    await expect(facts).toContainText("1998");
    await expect(facts.getByRole("term")).toHaveText(["성별", "출생 연도", "가입일"]);
    await expect(intro.getByRole("region", { name: "공통 네임카드", exact: true })).toBeVisible();

    await expect(hero.getByRole("heading", { name: user.nickname, level: 1, exact: true })).toHaveCount(0);
    await expect(hero.getByRole("heading", { name: "플레이어 프로필", exact: true })).toHaveCount(0);
    await expect(intro.getByRole("article").getByText(battleTag, { exact: true })).toBeVisible();
    await expect(intro.getByRole("navigation", { name: "게임별 클랜", exact: true })).toHaveCount(0);
    await expect(hero.getByRole("region", { name: "플레이어 소개", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "진열장", exact: true })).toHaveCount(0);
    await expect(page.getByText(user.email, { exact: true })).toBeHidden();
    await expect(page.getByText("자동 로그인", { exact: true })).toBeHidden();
    await expect(page.getByRole("button", { name: "탈퇴", exact: true })).toBeHidden();

    const slots = intro.getByRole("group", { name: "대표 엠블럼 3칸", exact: true });
    await expect(slots.getByRole("link")).toHaveCount(3);
    const caseLink = intro.getByRole("link", { name: "플레이어 엠블럼 케이스 열기", exact: true });
    const caseHref = `/profile/${user.id}/emblems`;
    await expect(caseLink).toHaveAttribute("href", caseHref);

    await intro.getByRole("button", { name: "한 줄 소개를 남겨보세요", exact: true }).click();
    const input = intro.getByRole("textbox", { name: "한 줄 소개", exact: true });
    await expect(input).toHaveAttribute("maxlength", "120");
    const boundaryIntro = "함".repeat(120);
    await input.fill(boundaryIntro);
    await intro.getByRole("button", { name: "소개 저장", exact: true }).click();
    await expect(input).toBeHidden();
    await expect(intro.getByRole("button", { name: "한 줄 소개 편집", exact: true })).toBeVisible();
    await expect(intro.getByText(boundaryIntro, { exact: true })).toBeVisible();
    const saved = await fixture.service.auth.admin.getUserById(user.id);
    expect(saved.error).toBeNull();
    expect(saved.data.user?.user_metadata.profile_intro).toBe(boundaryIntro);
    expect(saved.data.user?.user_metadata.profile_composition_sentinel).toBe(fixture.clanId);
    await page.reload();
    await expect(intro.getByText(boundaryIntro, { exact: true })).toBeVisible();
    await intro.getByRole("button", { name: "한 줄 소개 편집", exact: true }).click();
    await input.fill("취소할 소개");
    await input.press("Escape");
    await expect(intro.getByText(boundaryIntro, { exact: true })).toBeVisible();

    const accountTab = page.getByRole("tab", { name: "계정 정보", exact: true });
    const overviewTab = page.getByRole("tab", { name: "플레이어 소개", exact: true });
    const settings = page.getByRole("tabpanel", { name: "계정 정보", exact: true });
    await accountTab.click();
    await expect(settings).toBeVisible();
    await expect(settings.getByText(user.email, { exact: true })).toBeVisible();
    await expect(settings.getByRole("region", { name: "공통 네임카드", exact: true })).toHaveCount(0);
    for (const label of ["성별", "출생 연도", "가입일"]) await expect(settings.getByRole("term").filter({ hasText: label })).toHaveCount(0);
    await expect(settings.getByText("자동 로그인", { exact: true })).toBeVisible();
    await expect(settings.getByRole("button", { name: "탈퇴", exact: true })).toBeVisible();
    await expect(settings.getByText("대표 뱃지 (최대 5개)", { exact: true })).toHaveCount(0);
    await overviewTab.click();
    await expect(settings).toBeHidden();


    await intro.getByRole("button", { name: "한 줄 소개 편집", exact: true }).click();
    await input.fill("  함께 즐기는   게임과 작은 방.  ");
    await intro.getByRole("button", { name: "소개 저장", exact: true }).click();
    await expect(input).toBeHidden();
    await expect(intro.getByText("함께 즐기는 게임과 작은 방.", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    await page.getByRole("button", { name: "오버워치 게임 정보", exact: true }).click();
    await expect(page.getByRole("region", { name: "게임별 선호 역할", exact: true })).toBeVisible();
    await overviewTab.click();
    await page.getByRole("button", { name: "네임카드 꾸미기", exact: true }).click();
    const nameplate = page.getByRole("dialog", { name: "네임카드 꾸미기", exact: true });
    await expect(nameplate).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(nameplate).toBeHidden();
    await overviewTab.click();
    await expect(intro.getByRole("article").getByRole("img", { name: "오버워치 로고", exact: true })).toHaveCount(0);
    await expect(intro.getByRole("article").getByRole("link").locator("..")).toContainText("클랜장");

    for (const width of [1280, 908, 509, 390, 320]) {
      await expectComposition(page, intro, width);
      await hero.screenshot({ path: info.outputPath(`profile-overview-${width}.png`) });
      await accountTab.click();
      await expect(settings).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await overviewTab.click();
      await expect(settings).toBeHidden();
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await caseLink.click();
    await expect(page).toHaveURL(caseHref);
    await expect(page.getByRole("heading", { name: "엠블럼 케이스", exact: true })).toBeVisible();
    const emblemApi = `**/api/personal-emblems/featured?player=${user.id}`;
    await page.route(emblemApi, (route) => route.abort("failed"));
    await page.goto("/profile");
    await expect(intro.getByText("함께 즐기는 게임과 작은 방.", { exact: true })).toBeVisible();
    await expect(intro.getByRole("alert")).toContainText("엠블럼을 불러오지 못했습니다.");
    await page.unroute(emblemApi);
    await intro.getByRole("button", { name: "대표 엠블럼 다시 불러오기", exact: true }).click();
    await expect(intro.getByRole("alert")).toHaveCount(0);
    await expect(slots.getByRole("link")).toHaveCount(3);

    // The same isolated user also covers a profile with no game or clan, without touching QA people.
    expect((await fixture.service.from("clan_members").delete().eq("clan_id", fixture.clanId).eq("user_id", user.id)).error).toBeNull();
    expect((await fixture.service.from("user_game_profiles").delete().eq("user_id", user.id)).error).toBeNull();
    await page.reload();
    await expect(hero.getByRole("heading", { name: user.nickname, level: 1, exact: true })).toHaveCount(0);
    await expect(intro.getByText(battleTag, { exact: true })).toHaveCount(0);
    await expect(intro.locator("[data-personal-emblem-launcher]")).toHaveCount(1);
    await expect(intro.locator("[data-namecard]").getByText("Player", { exact: true })).toBeVisible();
    await expect(intro).toBeVisible();
    for (const width of [1280, 320]) await expectComposition(page, intro, width);
    expect(pageErrors).toEqual([]);
  } finally {
    await fixture.cleanup();
  }
});
