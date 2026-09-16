import { expect, test } from "@playwright/test";
import {
  createIsolatedBalanceFixture,
  loginIsolatedBalanceUser,
} from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000 });

test("프로필 선호는 연속 저장 후 즉시 다시 편집되며 실패 시 마지막 확정값으로 복구된다", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const fixture = await createIsolatedBalanceFixture(1);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    await page.goto("/profile");
    await page.getByRole("tab", { name: "게임별", exact: true }).click();
    const preference = page.getByRole("region", { name: "게임별 선호 역할" });
    const roleButtons = preference
      .getByRole("list", { name: "역할 선호 순위" })
      .getByRole("button");
    const role = (name: string) =>
      preference.getByRole("button", { name: new RegExp(name) });
    await expect(roleButtons).toHaveCount(3);
    await expect(preference.getByRole("combobox")).toHaveCount(0);
    await expect(
      preference.getByRole("button", { name: "선호 없음", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await role("탱커").click();
    await expect(role("탱커")).toHaveAttribute("aria-pressed", "true");
    const untouched = await fixture.service
      .from("profile_role_preferences")
      .select("ranking")
      .eq("user_id", fixture.users[0].id)
      .eq("game_id", fixture.gameId)
      .maybeSingle();
    expect(untouched.error).toBeNull();
    expect(untouched.data).toBeNull();
    await role("탱커").click();
    const changes = [
      {
        ranking: "tank,sup,dmg",
        apply: async () => {
          await role("딜러").click();
          await role("힐러").click();
        },
      },
      {
        ranking: "dmg,sup,tank",
        apply: () => role("탱커").dragTo(role("딜러")),
      },
      {
        ranking: "dmg,tank,sup",
        apply: () => role("힐러").press("ArrowRight"),
      },
    ];
    for (const { ranking, apply } of changes) {
      await apply();
      await expect
        .poll(
          async () => {
            const { data, error } = await fixture.service
              .from("profile_role_preferences")
              .select("ranking")
              .eq("user_id", fixture.users[0].id)
              .eq("game_id", fixture.gameId)
              .single();
            return error ? null : data.ranking.join(",");
          },
          { timeout: 15_000 },
        )
        .toBe(ranking);
      await expect(roleButtons.first()).toBeEnabled({ timeout: 15_000 });
      await expect(roleButtons).toHaveText(["1", "2", "3"]);
      await expect(preference.getByRole("alert")).toHaveCount(0);
    }
    // Abort only the next preference action, without touching another QA session.
    await page.route("**/profile", async (route) => {
      if (route.request().method() === "POST") await route.abort("failed");
      else await route.continue();
    });
    await role("탱커").press("ArrowLeft");
    await expect(preference.getByRole("alert")).toContainText(
      "저장하지 못했습니다",
    );
    await expect(roleButtons.first()).toBeEnabled();
    await expect(role("딜러")).toHaveAccessibleName("1순위 딜러");
    await expect(role("탱커")).toHaveAccessibleName("2순위 탱커");
    await expect(role("힐러")).toHaveAccessibleName("3순위 힐러");
    await page.unroute("**/profile");
    await page.reload();
    await page.getByRole("tab", { name: "게임별", exact: true }).click();
    await expect(role("딜러")).toHaveAccessibleName("1순위 딜러");
    await expect(role("탱커")).toHaveAccessibleName("2순위 탱커");
    await expect(role("힐러")).toHaveAccessibleName("3순위 힐러");
    await preference
      .getByRole("button", { name: "선호 없음", exact: true })
      .click();
    await expect(roleButtons.first()).toBeEnabled();
    await expect
      .poll(async () => {
        const { data } = await fixture.service
          .from("profile_role_preferences")
          .select("ranking")
          .eq("user_id", fixture.users[0].id)
          .eq("game_id", fixture.gameId)
          .single();
        return data?.ranking;
      })
      .toEqual([]);
    await expect(roleButtons).toHaveText(["–", "–", "–"]);
  } finally {
    await fixture.cleanup();
  }
});
