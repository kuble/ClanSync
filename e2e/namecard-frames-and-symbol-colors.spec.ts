import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { NORMAL_CARD_FRAMES, NORMAL_PORTRAIT_FRAMES } from "../src/lib/profile/frames";
import { COSMETIC_COLOR_PRESETS } from "../src/lib/cosmetics/color-presets";

test("symbol colors and ten free frames persist across cards, profiles and comment avatars", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2), peerContext = await browser.newContext(), postId = randomUUID();
  try {
    expect((await f.service.from("clan_board_posts").insert({ id: postId, clan_id: f.clanId, author_id: f.users[0].id, kind: "free", title: "프레임 검증", content: "프레임과 심벌 색상" })).error).toBeNull();
    expect((await f.service.from("clan_board_comments").insert({ post_id: postId, author_id: f.users[0].id, content: "색상 공유 확인" })).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto("/store");
    const categories = page.getByRole("radiogroup", { name: "개인 꾸미기 분류" });
    await categories.getByRole("radio", { name: "심벌", exact: true }).click();
    await page.getByRole("button", { name: "오비트 미리보기", exact: true }).click();
    const symbolDialog = page.getByRole("dialog", { name: "오비트 미리보기", exact: true });
    const colors = symbolDialog.getByRole("group", { name: /심벌 색상/ });
    for (const palette of COSMETIC_COLOR_PRESETS) {
      await colors.getByRole("radio", { name: palette.name, exact: true }).check();
      await expect(symbolDialog.locator("[data-symbol-art]")).toHaveAttribute("data-symbol-palette", palette.id);
    }
    await colors.getByRole("radio", { name: "블루", exact: true }).check();
    await symbolDialog.getByRole("button", { name: "오비트 적용", exact: true }).click();
    await expect(symbolDialog.getByRole("button", { name: "오비트 적용", exact: true })).toBeDisabled();
    await symbolDialog.getByRole("button", { name: "미리보기 닫기", exact: true }).click();
    for (const [label, category, designs] of [["초상 프레임", "portrait", NORMAL_PORTRAIT_FRAMES], ["카드 프레임", "frame", NORMAL_CARD_FRAMES]] as const) {
      await categories.getByRole("radio", { name: label, exact: true }).click();
      await expect(page.getByRole("article")).toHaveCount(6);
      for (const design of designs) {
        const item = page.getByRole("article", { name: design.name, exact: true });
        await expect(item.getByText("기본 제공", { exact: true })).toBeVisible();
        await expect(item.getByText("노말", { exact: true })).toBeVisible();
        await expect(item.locator(`[data-frame-kind="${category}"][data-frame-design="${design.id}"]`)).toBeVisible();
        await item.getByRole("button", { name: `${design.name} 미리보기`, exact: true }).click();
        const dialog = page.getByRole("dialog", { name: `${design.name} 미리보기`, exact: true });
        await expect(dialog.locator(`[data-${category}="${design.id}"]`)).toBeVisible();
        await expect(dialog.locator('[data-symbol-palette="blue"]')).toBeVisible();
        await dialog.getByRole("button", { name: `${design.name} 적용`, exact: true }).click();
        await expect(dialog.getByRole("button", { name: `${design.name} 적용`, exact: true })).toBeDisabled();
        await dialog.getByRole("button", { name: "미리보기 닫기", exact: true }).click();
      }
      await page.setViewportSize({ width: 1100, height: 1050 });
      await page.screenshot({ path: test.info().outputPath(`${category}-store-desktop.png`), animations: "disabled" });
    }
    await page.reload();
    await categories.getByRole("radio", { name: "심벌", exact: true }).click();
    await expect(page.getByRole("article", { name: "오비트", exact: true }).locator("[data-symbol-art]")).toHaveAttribute("data-symbol-palette", "blue");
    await page.goto("/profile");
    await page.getByRole("button", { name: "네임카드 꾸미기", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "네임카드 꾸미기", exact: true });
    const card = editor.getByRole("region", { name: "현재 네임카드" }).locator("[data-namecard]");
    await expect(card).toHaveAttribute("data-portrait", "capsule");
    await expect(card).toHaveAttribute("data-frame", "tab");
    for (const width of [1100, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await editor.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
    await page.screenshot({ path: test.info().outputPath("frames-composed-mobile.png"), animations: "disabled" });
    const peer = await peerContext.newPage();
    await loginIsolatedBalanceUser(peer, f.users[1]);
    await peer.goto(f.path.replace(/balance$/, "stats") + "?player=" + f.users[0].id);
    const shared = peer.getByRole("region", { name: "플레이어 배너" }).locator("[data-namecard]");
    await expect(shared).toHaveAttribute("data-frame", "tab");
    await expect(shared).toHaveAttribute("data-portrait", "capsule");
    await expect(shared.locator("[data-symbol-art]")).toHaveAttribute("data-symbol-palette", "blue");
    await peer.goto(f.path.replace(/balance$/, `board/free/${postId}`));
    await expect(peer.locator("#comments").getByRole("img", { name: `${f.users[0].nickname} 프로필 심볼`, exact: true })).toHaveAttribute("data-symbol-palette", "blue");
    await expect(peer.locator('#comments [data-frame-design="capsule"]')).toBeVisible();
    await editor.getByRole("group", { name: /심벌 색상/ }).getByRole("radio", { name: "기본", exact: true }).click();
    await expect(card.locator("img[data-symbol-art]")).toHaveAttribute("data-symbol-palette", "default");
    await page.reload();
    await expect(page.getByRole("region", { name: "공통 네임카드" }).locator("img[data-symbol-art]").first()).toHaveAttribute("data-symbol-palette", "default");
    expect((await f.service.from("coin_transactions").select("id").eq("user_id", f.users[0].id)).data).toEqual([]);
    expect((await f.service.from("user_nameplate_inventory").select("option_id").eq("user_id", f.users[0].id)).data).toEqual([]);
  } finally { await peerContext.close(); await f.cleanup(); }
});
