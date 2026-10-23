import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  createIsolatedBalanceFixture,
  loginIsolatedBalanceUser,
} from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000 });

async function expectComposition(page: Page, intro: Locator, housing: Locator, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await expect(intro).toBeVisible();
  await expect(housing).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const [identity, room] = await Promise.all([intro.boundingBox(), housing.boundingBox()]);
  expect(identity).not.toBeNull();
  expect(room).not.toBeNull();
  if (width >= 1024) {
    expect(identity!.x + identity!.width).toBeLessThanOrEqual(room!.x + 1);
    expect(Math.abs(identity!.y - room!.y)).toBeLessThan(80);
  } else {
    expect(identity!.y + identity!.height).toBeLessThanOrEqual(room!.y + 1);
  }
}

test("소개·대표 엠블럼과 방이 한 화면을 이루며 탭 전환·소개 저장은 꾸미기 초안을 보존한다", async ({ page }) => {
  test.setTimeout(150_000);
  const fixture = await createIsolatedBalanceFixture(1);
  const [user] = fixture.users;
  const battleTag = `Compose${user.id.slice(0, 8)}#1234`;
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    expect((await fixture.service.from("user_game_profiles").update({ battle_tag: battleTag }).eq("user_id", user.id).eq("game_id", fixture.gameId)).error).toBeNull();
    const metadataSetup = await fixture.service.auth.admin.updateUserById(user.id, {
      user_metadata: { profile_composition_sentinel: fixture.clanId },
    });
    expect(metadataSetup.error).toBeNull();
    await loginIsolatedBalanceUser(page, user);
    await page.goto("/profile");
    const hero = page.getByTestId("profile-hero");
    const intro = page.getByRole("region", { name: "플레이어 소개", exact: true });
    const housing = page.getByRole("region", { name: "프로필 하우징", exact: true });
    const scene = housing.getByRole("group", { name: "나의 방", exact: true });
    await expect(hero.getByRole("heading", { name: user.nickname, level: 1, exact: true })).toHaveCount(0);
    await expect(intro.getByRole("article").getByText(battleTag, { exact: true })).toBeVisible();
    await expect(intro.getByRole("button", { name: "다음 클랜", exact: true })).toHaveCount(0);
    await expect(hero.getByRole("region", { name: "플레이어 소개", exact: true })).toBeVisible();
    await expect(hero.getByRole("region", { name: "프로필 하우징", exact: true })).toBeVisible();
    await expect(page.getByText(user.email, { exact: true })).toBeHidden();
    await expect(page.getByText("자동 로그인", { exact: true })).toBeHidden();
    await expect(page.getByRole("button", { name: "탈퇴", exact: true })).toBeHidden();

    const slots = intro.getByRole("group", { name: "대표 엠블럼 3칸", exact: true });
    await expect(slots.getByRole("link")).toHaveCount(3);
    const caseLink = intro.getByRole("link", { name: `${battleTag} 엠블럼 케이스 열기`, exact: true });
    const caseHref = `/games/overwatch/clan/${fixture.clanId}/emblems?player=${user.id}`;
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

    // Account navigation and editing another profile field must not remount the room.
    const plantResult = await fixture.service.from("user_housing_inventory").select("id,x,y").eq("user_id", user.id).eq("catalog_id", "small-plant").single();
    expect(plantResult.error).toBeNull();
    const plant = scene.locator(`[data-inventory-id="${plantResult.data!.id}"]`);
    await housing.getByRole("button", { name: "방 꾸미기", exact: true }).click();
    await plant.focus();
    await plant.press("Enter");
    await plant.press("Delete");
    await expect(plant).toHaveCount(0);
    await expect(housing.getByRole("button", { name: "방 저장", exact: true })).toBeEnabled();
    const accountTab = page.getByRole("tab", { name: "계정 정보", exact: true });
    const roomTab = page.getByRole("tab", { name: "3D 미니룸", exact: true });
    const settings = page.getByRole("tabpanel", { name: "계정 정보", exact: true });
    await accountTab.click();
    await expect(settings).toBeVisible();
    await expect(settings.getByText(user.email, { exact: true })).toBeVisible();
    await expect(settings.getByText("자동 로그인", { exact: true })).toBeVisible();
    await expect(settings.getByRole("button", { name: "탈퇴", exact: true })).toBeVisible();
    await expect(settings.getByText("대표 뱃지 (최대 5개)", { exact: true })).toHaveCount(0);
    await roomTab.click();
    await expect(settings).toBeHidden();
    await expect(plant).toHaveCount(0);
    await expect(housing.getByRole("button", { name: "방 저장", exact: true })).toBeEnabled();

    await intro.getByRole("button", { name: "한 줄 소개 편집", exact: true }).click();
    await input.fill("  함께 즐기는   게임과 작은 방.  ");
    await intro.getByRole("button", { name: "소개 저장", exact: true }).click();
    await expect(input).toBeHidden();
    await expect(intro.getByText("함께 즐기는 게임과 작은 방.", { exact: true })).toBeVisible();
    await expect(plant).toHaveCount(0);
    const untouchedPlant = await fixture.service.from("user_housing_inventory").select("x,y").eq("id", plantResult.data!.id).single();
    expect(untouchedPlant.error).toBeNull();
    expect(untouchedPlant.data).toEqual({ x: plantResult.data!.x, y: plantResult.data!.y });
    await housing.getByRole("button", { name: "편집 취소", exact: true }).click();
    await page.getByRole("dialog", { name: "변경 내용을 버릴까요?", exact: true }).getByRole("button", { name: "변경 내용 버리기", exact: true }).click();
    await expect(plant).toBeVisible();

    await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    await page.getByRole("button", { name: "오버워치 게임 정보", exact: true }).click();
    await expect(page.getByRole("region", { name: "게임별 선호 역할", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "네임카드 꾸미기", exact: true }).click();
    const nameplate = page.getByRole("dialog", { name: "네임카드 꾸미기", exact: true });
    await expect(nameplate).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(nameplate).toBeHidden();
    await page.getByRole("tab", { name: "3D 미니룸", exact: true }).click();
    await expect(intro.getByRole("img", { name: "오버워치 로고", exact: true }).first()).toBeVisible();

    for (const width of [1280, 390, 320]) {
      await expectComposition(page, intro, housing, width);
      await accountTab.click();
      await expect(settings).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await roomTab.click();
      await expect(settings).toBeHidden();
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await caseLink.click();
    await expect(page).toHaveURL(caseHref);
    await expect(page.getByRole("heading", { name: "개인 엠블럼 케이스", exact: true })).toBeVisible();
    const emblemApi = `**/api/clans/${fixture.clanId}/personal-emblems?player=${user.id}`;
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
    await expect(intro.locator("[data-personal-emblem-launcher]")).toHaveCount(0);
    await expect(housing).toBeVisible();
    for (const width of [1280, 320]) await expectComposition(page, intro, housing, width);
    expect(pageErrors).toEqual([]);
  } finally {
    await fixture.cleanup();
  }
});
