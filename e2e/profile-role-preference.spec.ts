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
    const select = preference.getByRole("combobox");
    await expect(select).toBeVisible();
    for (const ranking of ["tank,sup,dmg", "sup,dmg,tank", "dmg,tank,sup"]) {
      await select.selectOption(ranking);
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
      await expect(select).toBeEnabled({ timeout: 15_000 });
      await expect(select).toHaveValue(ranking);
      await expect(preference.getByRole("alert")).toHaveCount(0);
    }
    // Abort only the next preference action, without touching another QA session.
    await page.route("**/profile", async (route) => {
      if (route.request().method() === "POST") await route.abort("failed");
      else await route.continue();
    });
    await select.selectOption("tank,dmg,sup");
    await expect(preference.getByRole("alert")).toContainText(
      "저장하지 못했습니다",
    );
    await expect(select).toBeEnabled();
    await expect(select).toHaveValue("dmg,tank,sup");
    await page.unroute("**/profile");
    await page.reload();
    await page.getByRole("tab", { name: "게임별", exact: true }).click();
    await expect(select).toHaveValue("dmg,tank,sup");
  } finally {
    await fixture.cleanup();
  }
});
