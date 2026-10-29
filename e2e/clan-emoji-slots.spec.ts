import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("three emoji slots cost 100 and can be purchased repeatedly", async ({ page, browser }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(2);
  const base = `/games/overwatch/clan/${f.clanId}`;
  const memberContext = await browser.newContext();
  try {
    expect((await f.service.from("clans").update({ coin_balance: 1000 }).eq("id", f.clanId)).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(base + "/store");
    await page.getByRole("radio", { name: "반응", exact: true }).click();
    const product = page.getByRole("article", { name: "공용 이모티콘 3슬롯", exact: true });
    await expect(product.getByText("구매마다 3슬롯 추가", { exact: true })).toBeVisible();
    await expect(product.getByText("100", { exact: false })).toBeVisible();
    for (const [index, coins] of [900, 800].entries()) {
      await product.getByRole("button", { name: index ? "추가 구매" : "구매", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "꾸미기 구매", exact: true });
      await expect(dialog).toContainText("3슬롯이 추가됩니다");
      await dialog.getByRole("button", { name: "구매 확정", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByLabel("보유 코인", { exact: true })).toContainText(String(coins));
      await expect(product.getByRole("button", { name: "추가 구매", exact: true })).toBeEnabled();
    }
    await page.reload();
    await page.getByRole("radio", { name: "반응", exact: true }).click();
    await expect(product.getByRole("button", { name: "추가 구매", exact: true })).toBeEnabled();
    await product.getByRole("link", { name: "등록하기", exact: true }).click();
    const slots = page.getByRole("region", { name: "공용 이모티콘", exact: true });
    await expect(slots).toContainText("0 / 6슬롯");
    await expect(slots.getByRole("button", { name: "빈 이모티콘 슬롯", exact: true })).toHaveCount(6);
    const buffer = await sharp({ create: { width: 80, height: 80, channels: 4, background: "#50b887" } }).png().toBuffer();
    await slots.getByLabel("이모티콘 이미지", { exact: true }).setInputFiles({ name: "cheer.png", mimeType: "image/png", buffer });
    const crop = page.getByRole("dialog", { name: "공용 이모티콘 추가", exact: true });
    await crop.getByLabel("이모티콘 이름", { exact: true }).fill("응원");
    await crop.getByRole("button", { name: "등록", exact: true }).click();
    await expect(crop).toBeHidden();
    await expect(slots).toContainText("1 / 6슬롯");
    await expect(slots.getByRole("img", { name: "응원", exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/store");
    await page.getByRole("radio", { name: "반응", exact: true }).click();
    await expect(product.getByRole("button", { name: "추가 구매", exact: true })).toBeEnabled();
    expect(await product.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    const member = await memberContext.newPage();
    await loginIsolatedBalanceUser(member, f.users[1]);
    await member.goto(base + "/store");
    await member.getByRole("radio", { name: "반응", exact: true }).click();
    await expect(member.getByRole("article", { name: "공용 이모티콘 3슬롯", exact: true }).getByRole("button", { name: "권한 필요", exact: true })).toBeDisabled();
    const purchases = await f.service.from("purchases").select("price_coins,repeatable").eq("clan_id", f.clanId);
    expect(purchases.error).toBeNull();
    expect(purchases.data).toEqual([{ price_coins: 100, repeatable: true }, { price_coins: 100, repeatable: true }]);
  } finally {
    await memberContext.close();
    const paths = (await f.service.from("clan_emojis").select("image_path").eq("clan_id", f.clanId)).data ?? [];
    if (paths.length) await f.service.storage.from("clan-emojis").remove(paths.map(row => row.image_path));
    await f.cleanup();
  }
});
