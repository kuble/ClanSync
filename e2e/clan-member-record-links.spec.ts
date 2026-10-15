import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("members show game verification without emails and link to authorized personal records", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(3);
  const base = f.path.replace(/\/balance$/, "");
  let otherGameId: string | undefined;
  try {
    const otherGame = await f.service.from("games").insert({ slug: `record-link-${f.clanId}`, name_ko: "기록 링크 테스트 게임", is_active: false }).select("id").single();
    expect(otherGame.error).toBeNull();
    otherGameId = otherGame.data!.id;
    expect((await f.service.from("user_game_profiles").insert({ user_id: f.users[1].id, game_id: otherGameId, game_uid: `test:${f.users[1].id}`, is_verified: true })).error).toBeNull();
    expect((await f.service.from("user_game_profiles").update({ is_verified: false }).eq("game_id", f.gameId).eq("user_id", f.users[1].id)).error).toBeNull();
    expect((await f.service.from("user_game_profiles").delete().eq("game_id", f.gameId).eq("user_id", f.users[2].id)).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    const response = await page.goto(`${base}/manage?tab=members`);
    const body = await response!.text();
    for (const user of f.users.slice(1)) expect(body).not.toContain(user.email);
    const table = page.getByRole("table");
    const row = (index: number) => table.getByRole("row").filter({ has: page.getByRole("link", { name: `${f.users[index].nickname} 개인 기록`, exact: true }) });
    await expect(table.getByRole("columnheader", { name: "게임 인증", exact: true })).toBeVisible();
    await expect(row(0)).toContainText("인증 완료");
    for (const index of [1, 2]) await expect(row(index)).toContainText("미인증");
    for (const user of f.users) await expect(table).not.toContainText(user.email);
    await expect(row(1).getByRole("button", { name: `${f.users[1].nickname} 운영진 승격`, exact: true })).toBeVisible();
    const search = page.getByRole("textbox", { name: "구성원 검색", exact: true });
    await search.fill(f.users[1].email);
    await expect(page.getByText("조건에 맞는 멤버가 없습니다.", { exact: true })).toBeVisible();
    await search.fill(f.users[1].nickname);
    await expect(table.getByRole("row")).toHaveCount(2);
    await page.getByRole("link", { name: `${f.users[1].nickname} 개인 기록`, exact: true }).click();
    await expect(page).toHaveURL(`${base}/stats?player=${f.users[1].id}`);
    await expect(page.getByRole("tab", { name: "개인 기록", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("region", { name: "플레이어 배너", exact: true })).toContainText(f.users[1].nickname);
    await expect(page.getByRole("region", { name: "플레이어 요약", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("region", { name: "플레이어 배너", exact: true })).toContainText(f.users[1].nickname);
    await page.goto(`${base}/stats?player=${f.clanId}`);
    await expect(page.getByRole("region", { name: "개인 기록 멤버 목록", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "플레이어 배너", exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/manage?tab=members`);
    await expect(page.getByRole("link", { name: `${f.users[0].nickname} 개인 기록`, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, f.users[1]);
    await page.goto(`${base}/stats?player=${f.users[0].id}`);
    await expect(page.getByRole("tab", { name: "개인 기록", exact: true })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "플레이어 배너", exact: true })).toHaveCount(0);
  } finally {
    try { await f.cleanup(); }
    finally { if (otherGameId) expect((await f.service.from("games").delete().eq("id", otherGameId)).error).toBeNull(); }
  }
});
