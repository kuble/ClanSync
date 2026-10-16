import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("깜짝 내전 호스트가 기본 아이템을 선택하고 내전 전용 아이템을 구성·저장한다", async ({ page }) => {
  test.setTimeout(150_000);
  const fixture = await createIsolatedBalanceFixture(2);
  try {
    const original = await fixture.service.from("clan_auction_items").select("*").eq("clan_id", fixture.clanId).order("id");
    expect(original.error).toBeNull();
    await loginIsolatedBalanceUser(page, fixture.users[1]);
    const { roomId, url } = await createAndEnterBalanceRoom(page, fixture.path, "멤버 아이템 구성", "flash");
    await page.setViewportSize({ width: 1244, height: 884 });
    const open = async () => {
      await page.getByRole("button", { name: "경기 설정", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "경기 설정", exact: true });
      await dialog.getByLabel("팀원 선발 방식", { exact: true }).selectOption("auction");
      await dialog.getByRole("switch", { name: "전략 아이템 사용", exact: true }).check();
      return dialog;
    };
    const dialog = await open();
    const config = dialog.getByTestId("round-auction-items");
    await expect(config.getByText("선택한 아이템 3개", { exact: false })).toBeVisible();
    await expect(config.getByRole("button", { name: "기본 아이템 관리", exact: true })).toHaveCount(0);
    const shared = config.getByRole("region", { name: "클랜 기본 아이템 선택", exact: true });
    await expect(shared.getByRole("button", { name: /수정|삭제/ })).toHaveCount(0);
    const captain1 = (await dialog.getByLabel("1팀 주장", { exact: true }).boundingBox())!;
    const captain2 = (await dialog.getByLabel("2팀 주장", { exact: true }).boundingBox())!;
    expect(Math.abs(captain1.y - captain2.y)).toBeLessThan(2);
    expect(captain1.x + captain1.width).toBeLessThan(captain2.x);
    const panel = dialog.getByTestId("balance-settings-panel");
    const left = (await config.boundingBox())!;
    expect(left.x + left.width).toBeLessThan((await panel.boundingBox())!.x);

    await config.getByRole("button", { name: "아이템 추가", exact: true }).click();
    const create = config.getByRole("form", { name: "아이템 추가", exact: true });
    await create.getByLabel("아이템 이름", { exact: true }).fill("깜짝 진영 선택권");
    await create.getByLabel("가격 (pt)", { exact: true }).fill("70");
    await create.getByLabel("설명과 적용 방법", { exact: true }).fill("이번 내전에서 시작 진영을 선택합니다.");
    await create.getByRole("button", { name: "아이템 저장", exact: true }).click();
    await expect(create).toBeHidden();
    expect((await fixture.activeRound(roomId)).formation_settings).not.toHaveProperty("auctionCatalog");
    await config.getByRole("button", { name: "깜짝 진영 선택권 수정", exact: true }).click();
    const edit = config.getByRole("form", { name: "아이템 수정", exact: true });
    await edit.getByLabel("가격 (pt)", { exact: true }).fill("120");
    await edit.getByRole("button", { name: "아이템 저장", exact: true }).click();
    await expect(edit).toBeHidden();
    await shared.getByRole("checkbox", { name: "맵 선정권 선택", exact: true }).uncheck();
    await expect(config.getByText("선택한 아이템 3개", { exact: false })).toBeVisible();
    await dialog.getByRole("button", { name: "설정 적용", exact: true }).click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    const saved = await fixture.activeRound(roomId);
    expect(saved.formation_settings).toMatchObject({ auctionItemsEnabled: true, auctionCatalog: { items: [{ name: "깜짝 진영 선택권", cost: 120 }] } });
    const catalog = (saved.formation_settings as { auctionCatalog: { excludedItemIds: string[]; items: { id: string }[] } }).auctionCatalog;
    expect(catalog.excludedItemIds).toEqual([original.data!.find((item) => item.name === "맵 선정권")!.id]);
    expect((await fixture.service.from("clan_auction_items").select("*").eq("clan_id", fixture.clanId).order("id")).data).toEqual(original.data);

    await page.goto(url);
    await open();
    await expect(config.getByRole("checkbox", { name: "맵 선정권 선택", exact: true })).not.toBeChecked();
    await expect(config.getByRole("listitem").filter({ hasText: "깜짝 진영 선택권" })).toContainText("120pt");
    await dialog.getByRole("switch", { name: "전략 아이템 사용", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath("flash-item-settings.png"), animations: "disabled" });
    await config.getByRole("button", { name: "깜짝 진영 선택권 삭제", exact: true }).click();
    await config.getByRole("listitem").filter({ hasText: "깜짝 진영 선택권" }).getByRole("button", { name: "삭제", exact: true }).click();
    await expect(config.getByText("선택한 아이템 2개", { exact: false })).toBeVisible();
    await dialog.getByRole("button", { name: "닫기", exact: true }).click();
    expect((await fixture.activeRound(roomId)).formation_settings).toEqual(saved.formation_settings);
    await page.setViewportSize({ width: 390, height: 844 });
    await open();
    await expect(config.getByRole("button", { name: "깜짝 진영 선택권 수정", exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await dialog.getByRole("button", { name: "닫기", exact: true }).click();
    const second = await createAndEnterBalanceRoom(page, fixture.path, "다른 깜짝 내전", "flash");
    expect((await fixture.activeRound(second.roomId)).formation_settings).not.toHaveProperty("auctionCatalog");

    // Exercise the real start action with inexpensive guest participants, too.
    const guests = await fixture.service.from("clan_participants").insert(Array.from({ length: 8 }, (_, n) => ({ clan_id: fixture.clanId, nickname: `아이템검증${n}`, is_guest: true }))).select("id");
    expect(guests.error).toBeNull();
    const ids = [...fixture.users.map((user) => user.id), ...guests.data!.map((guest) => guest.id)];
    const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
    expect((await fixture.service.from("balance_sessions").update({ roster, resolved_map_label: "부산" }).eq("id", saved.id)).error).toBeNull();
    await page.setViewportSize({ width: 1244, height: 884 });
    await page.goto(url);
    await page.getByRole("button", { name: "편성 진행", exact: true }).click();
    await expect.poll(async () => (await fixture.activeRound(roomId)).formation_state).not.toBeNull();
    const state = (await fixture.activeRound(roomId)).formation_state as { strategy: { items: { id: string; cost: number }[] } };
    expect(state.strategy.items).toHaveLength(3);
    expect(state.strategy.items.find((item) => item.id === catalog.items[0].id)?.cost).toBe(120);
    expect(state.strategy.items.some((item) => catalog.excludedItemIds.includes(item.id))).toBe(false);
    await page.getByRole("button", { name: "경기 설정", exact: true }).click();
    await expect(config.getByRole("button", { name: "아이템 추가", exact: true })).toBeDisabled();
    await expect(shared.getByRole("checkbox").first()).toBeDisabled();
  } finally { await fixture.cleanup(); }
});
