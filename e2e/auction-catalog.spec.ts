import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("운영진이 경매 아이템 예시·수정·사용 여부·추가·삭제를 관리한다", async ({ page }) => {
  test.setTimeout(120_000);
  const fixture = await createIsolatedBalanceFixture(2);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const managePath = `/games/overwatch/clan/${fixture.clanId}/manage?tab=balance`;
    await page.goto(managePath);
    const catalog = page.locator("#auction-items");
    await expect(catalog.getByText("사용 중 0개", { exact: false })).toBeVisible();
    await catalog.getByRole("button", { name: "예시 아이템 추가", exact: true }).click();
    await expect(catalog.getByText("사용 중 3개", { exact: true })).toBeVisible();
    await expect(catalog.getByRole("listitem")).toHaveCount(3);

    await catalog.getByRole("button", { name: "맵 선정권 수정", exact: true }).click();
    const editor = catalog.getByRole("form", { name: "아이템 수정", exact: true });
    await editor.getByLabel("가격 (pt)", { exact: true }).fill("120");
    await editor.getByLabel("설명과 적용 방법", { exact: true }).fill("이번 경기의 맵을 구매 팀이 정합니다.");
    await editor.getByRole("button", { name: "아이템 저장", exact: true }).click();
    await expect(editor).toBeHidden();
    await expect(catalog.getByRole("listitem").filter({ hasText: "맵 선정권" })).toContainText("120pt");
    const enabled = catalog.getByRole("switch", { name: "맵 선정권 사용", exact: true });
    await enabled.click();
    await expect(enabled).toHaveAttribute("aria-checked", "false");
    await expect(catalog.getByText("사용 중 2개", { exact: false })).toBeVisible();

    await catalog.getByRole("button", { name: "아이템 추가", exact: true }).click();
    const create = catalog.getByRole("form", { name: "아이템 추가", exact: true });
    await create.getByLabel("아이템 이름", { exact: true }).fill("진영 선택권");
    await create.getByLabel("가격 (pt)", { exact: true }).fill("50");
    await create.getByLabel("설명과 적용 방법", { exact: true }).fill("공격 또는 수비 시작 진영을 선택합니다.");
    await create.getByRole("button", { name: "아이템 저장", exact: true }).click();
    await expect(create).toBeHidden();
    await expect(catalog.getByRole("listitem")).toHaveCount(4);
    await page.reload();
    await expect(catalog.getByRole("listitem")).toHaveCount(4);
    await expect(catalog.getByRole("switch", { name: "맵 선정권 사용", exact: true })).toHaveAttribute("aria-checked", "false");

    const { data: stored, error } = await fixture.service.from("clan_auction_items").select("name,cost,description,enabled").eq("clan_id", fixture.clanId).eq("name", "맵 선정권").single();
    expect(error).toBeNull();
    expect(stored).toEqual({ name: "맵 선정권", cost: 120, description: "이번 경기의 맵을 구매 팀이 정합니다.", enabled: false });

    await catalog.getByRole("button", { name: "진영 선택권 삭제", exact: true }).click();
    await catalog.getByRole("listitem").filter({ hasText: "진영 선택권" }).getByRole("button", { name: "삭제", exact: true }).click();
    await expect(catalog.getByRole("listitem")).toHaveCount(3);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    await fixture.cleanup();
  }
});
