import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("rules are managed individually and shared with the ticker and member view", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const fixture = await createIsolatedBalanceFixture(2);
  const base = fixture.path.replace(/\/balance$/, "");
  const legacy = "1. 첫 번째 규칙\n\n2. 두 번째 규칙\n- 세 번째 규칙";
  try {
    expect((await fixture.service.from("clans").update({ rules: legacy }).eq("id", fixture.clanId)).error).toBeNull();
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    await page.goto(base + "/board/notices#rules");
    const region = page.getByRole("region", { name: "클랜 규칙", exact: true });
    const list = region.getByRole("list", { name: "클랜 규칙 목록", exact: true });
    const input = region.getByRole("textbox", { name: "새 규칙", exact: true });
    const add = region.getByRole("button", { name: "규칙 추가", exact: true });
    await expect(list.getByRole("listitem")).toHaveCount(3);
    await expect(list.getByRole("listitem").first().getByText("첫 번째 규칙", { exact: true })).toBeVisible();
    expect((await fixture.service.from("clans").select("rules").eq("id", fixture.clanId).single()).data!.rules).toBe(legacy);
    await expect(region.locator("textarea")).toHaveCount(0);
    await input.fill("   ");
    await expect(add).toBeDisabled();

    await input.fill("새로 추가한 규칙");
    await page.route("**/board/notices", route => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await add.click();
    await expect(page.getByText("규칙을 저장하지 못했습니다. 다시 시도해 주십시오.", { exact: true })).toBeVisible();
    await expect(input).toHaveValue("새로 추가한 규칙");
    await expect(list.getByRole("listitem")).toHaveCount(3);
    await page.unroute("**/board/notices");
    await add.click();
    await expect(list.getByRole("listitem")).toHaveCount(4);
    await expect(input).toHaveValue("");
    await page.reload();
    await expect(list.getByRole("listitem")).toHaveCount(4);

    await region.getByRole("button", { name: "2번 규칙 수정", exact: true }).click();
    const edit = page.getByRole("dialog", { name: "규칙 수정", exact: true });
    await edit.getByRole("textbox", { name: "규칙 내용", exact: true }).fill("수정한 두 번째 규칙");
    await edit.getByRole("button", { name: "취소", exact: true }).click();
    await expect(list.getByRole("listitem").nth(1)).toContainText("두 번째 규칙");
    await region.getByRole("button", { name: "2번 규칙 수정", exact: true }).click();
    await edit.getByRole("textbox", { name: "규칙 내용", exact: true }).fill("수정한 두 번째 규칙");
    await edit.getByRole("button", { name: "저장", exact: true }).click();
    await expect(edit).toBeHidden();
    await expect(list.getByRole("listitem").nth(1)).toContainText("수정한 두 번째 규칙");

    await region.getByRole("button", { name: "1번 규칙 삭제", exact: true }).click();
    const remove = page.getByRole("dialog", { name: "이 규칙을 삭제하시겠습니까?", exact: true });
    await expect(remove).toContainText("첫 번째 규칙");
    await remove.getByRole("button", { name: "취소", exact: true }).click();
    await expect(list.getByRole("listitem")).toHaveCount(4);
    await region.getByRole("button", { name: "1번 규칙 삭제", exact: true }).click();
    await remove.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(remove).toBeHidden();
    await expect(list.getByRole("listitem")).toHaveCount(3);
    const saved = "수정한 두 번째 규칙\n세 번째 규칙\n새로 추가한 규칙";
    expect((await fixture.service.from("clans").select("rules").eq("id", fixture.clanId).single()).data!.rules).toBe(saved);

    await input.fill("x".repeat(20000));
    await add.click();
    await expect(page.getByText("전체 규칙은 20,000자 이내로 입력해 주십시오.", { exact: true })).toBeVisible();
    await expect(list.getByRole("listitem")).toHaveCount(3);
    await input.fill("");
    for (const width of [1280, 698, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    await page.screenshot({ path: test.info().outputPath("rules-individual-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: test.info().outputPath("rules-individual-desktop.png") });

    await page.clock.install();
    await page.goto(base);
    const ticker = page.getByRole("region", { name: "클랜 규칙", exact: true });
    await expect(ticker.locator("[data-rule-text]")).toHaveText("수정한 두 번째 규칙");
    await page.clock.fastForward(8100);
    await expect(ticker.locator("[data-rule-text]")).toHaveText("세 번째 규칙");

    const memberContext = await browser.newContext();
    try {
      const member = await memberContext.newPage();
      await loginIsolatedBalanceUser(member, fixture.users[1]);
      await member.goto(base + "/board/notices#rules");
      const memberRules = member.getByRole("region", { name: "클랜 규칙", exact: true });
      await expect(memberRules.getByRole("listitem")).toHaveCount(3);
      await expect(memberRules.getByText("수정한 두 번째 규칙", { exact: true })).toBeVisible();
      await expect(memberRules.getByRole("textbox")).toHaveCount(0);
      await expect(memberRules.getByRole("button")).toHaveCount(0);
    } finally { await memberContext.close(); }
  } finally { await fixture.cleanup(); }
});
