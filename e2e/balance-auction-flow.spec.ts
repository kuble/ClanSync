import { expect, test, type Locator, type Page, type Request } from "@playwright/test";
import {
  createAndEnterBalanceRoom,
  createIsolatedBalanceFixture,
  loginIsolatedBalanceUser,
} from "./isolated-balance-fixture";
import {
  DEFAULT_FORMATION_SETTINGS,
  type FormationCommand,
  type FormationState,
} from "../src/lib/balance/formation";
import { rosterAssignedUserIds, type BalanceRoster } from "../src/lib/balance/roster-schema";
import type { Json } from "../src/lib/supabase/database.types";

test.use({ actionTimeout: 20_000 });

type Fixture = Awaited<ReturnType<typeof createIsolatedBalanceFixture>>;

function formationRequest(page: Page, type: FormationCommand["type"]) {
  return page.waitForRequest((request) =>
    request.method() === "POST" &&
    Boolean(request.headers()["next-action"]) &&
    Boolean(request.postData()?.includes(`"type":"${type}"`)),
  );
}

/** Replay the actual public Server Action with the current caller's cookies. */
async function replayFormation(
  page: Page,
  request: Request,
  revision: number,
  command: FormationCommand,
) {
  const args = JSON.parse(request.postData()!) as unknown[];
  expect(args).toHaveLength(5);
  args[3] = revision;
  args[4] = command;
  return page.evaluate(async ({ url, headers, body }) => {
    const response = await fetch(url, { method: "POST", headers, body });
    if (!response.ok) throw new Error(`Formation response: ${response.status}`);
    return response.text();
  }, {
    url: request.url(),
    headers: {
      "next-action": request.headers()["next-action"],
      "content-type": request.headers()["content-type"],
      accept: "text/x-component",
      "next-router-state-tree": request.headers()["next-router-state-tree"] ?? "",
    },
    body: JSON.stringify(args),
  });
}

async function expectFormationAboveRoster(panel: Locator) {
  const formation = panel.getByTestId("balance-formation");
  const roster = panel.locator("[data-roster-slot], [data-board-slot]").first();
  await expect(formation).toBeVisible();
  await expect(roster).toBeVisible();
  const [formationBox, rosterBox] = await Promise.all([
    formation.boundingBox(), roster.boundingBox(),
  ]);
  expect(formationBox!.y + formationBox!.height).toBeLessThanOrEqual(rosterBox!.y);
}

/** Move only this temporary round's clock; the browser must still trigger the transition. */
async function finishRemainingLots(fixture: Fixture, roomId: string) {
  for (let attempt = 0; attempt < 32; attempt++) {
    const round = await fixture.activeRound(roomId);
    const state = structuredClone(round.formation_state) as unknown as FormationState;
    if (state.stage === "items") return state;
    expect(state.stage).toBe("auction");
    if (state.award) state.award.endsAt = Date.now() - 100;
    else if (state.auction) state.auction.deadline = Date.now() - 100;
    else state.nextLotAt = Date.now() - 100;
    const revision = round.formation_revision + 1;
    const { data, error } = await fixture.service.from("balance_sessions")
      .update({ formation_state: state as unknown as Json, formation_revision: revision })
      .eq("id", round.id).eq("formation_revision", round.formation_revision)
      .select("id");
    expect(error).toBeNull();
    if (!data?.length) continue;
    await expect.poll(async () => (await fixture.activeRound(roomId)).formation_revision, {
      timeout: 20_000,
      message: "The shared countdown must advance without a host button click",
    }).toBeGreaterThan(revision);
  }
  throw new Error("Auction did not reach item selection after all lot deadlines");
}

test("주장 전용 지명·입찰, 자동 경매와 공개 아이템 선택 후 편성 완료", async ({ page, browser }) => {
  test.setTimeout(360_000);
  const fixture = await createIsolatedBalanceFixture(10);
  const memberContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  memberContext.setDefaultTimeout(20_000);
  const member = await memberContext.newPage();
  try {
    await Promise.all([
      loginIsolatedBalanceUser(page, fixture.users[0]),
      loginIsolatedBalanceUser(member, fixture.users[1]),
    ]);
    const room = await createAndEnterBalanceRoom(page, fixture.path, "격리된 주장 경매 검증");
    const panel = page.getByTestId("clan-balance-session-panel");
    const memberPanel = member.getByTestId("clan-balance-session-panel");
    const ids = fixture.users.map((user) => user.id);
    const roster: BalanceRoster = {
      team1: { tank: ids[0], dmg: [ids[2], ids[3]], sup: [ids[4], ids[5]] },
      team2: { tank: ids[1], dmg: [ids[6], ids[7]], sup: [ids[8], ids[9]] },
    };
    const initial = await fixture.activeRound(room.roomId);
    const seeded = await fixture.service.from("balance_sessions").update({
      roster,
      formation_settings: { ...DEFAULT_FORMATION_SETTINGS, teams: "draft", captains: [ids[0], ids[1]] },
      map_ban_enabled: false,
      hero_ban_enabled: false,
    }).eq("id", initial.id);
    expect(seeded.error).toBeNull();
    await page.reload();
    await member.goto(room.url);
    const draftRequestPromise = formationRequest(page, "start");
    await panel.getByRole("button", { name: "편성 진행", exact: true }).click();
    const draftRequest = await draftRequestPromise;
    await expect.poll(async () => ((await fixture.activeRound(room.roomId)).formation_state as unknown as FormationState)?.stage)
      .toBe("draft");
    const draftRound = await fixture.activeRound(room.roomId);
    const draft = draftRound.formation_state as unknown as FormationState;
    // Make the opposing captain's turn deterministic, without changing either caller's role.
    draft.first = "team2";
    const changedTurn = await fixture.service.from("balance_sessions").update({
      formation_state: draft as unknown as Json,
      formation_revision: draftRound.formation_revision + 1,
    }).eq("id", draftRound.id);
    expect(changedTurn.error).toBeNull();
    await Promise.all([page.reload(), member.reload()]);
    await expectFormationAboveRoster(panel);
    const player = fixture.users.find((user) => user.id === draft.remaining[0])!;
    const leaderPick = panel.getByTestId("balance-formation").getByRole("button", { name: new RegExp(player.nickname) });
    const memberPick = memberPanel.getByTestId("balance-formation").getByRole("button", { name: new RegExp(player.nickname) });
    await expect(leaderPick).toBeDisabled();
    await expect(memberPick).toBeEnabled();
    const beforeDeniedPick = await fixture.activeRound(room.roomId);
    expect(await replayFormation(page, draftRequest, beforeDeniedPick.formation_revision, {
      type: "pick", player: player.id,
    })).toContain("현재 팀 주장만 조작할 수 있습니다.");
    expect((await fixture.activeRound(room.roomId)).formation_state).toEqual(beforeDeniedPick.formation_state);
    await memberPick.click();
    await expect.poll(async () => ((await fixture.activeRound(room.roomId)).formation_state as unknown as FormationState).picks)
      .toBe(1);
    const afterPick = (await fixture.activeRound(room.roomId)).formation_state as unknown as FormationState;
    expect(Object.values(afterPick.roster.team2).flat()).toContain(player.id);
    const nextPlayer = fixture.users.find((user) => user.id === afterPick.remaining[0])!;
    await expect(panel.getByTestId("balance-formation").getByRole("button", { name: new RegExp(nextPlayer.nickname) })).toBeEnabled();

    // Start a second scenario in this fixture only; no shared QA session or roster is touched.
    const current = await fixture.activeRound(room.roomId);
    const reset = await fixture.service.from("balance_sessions").update({
      formation_state: null,
      formation_revision: current.formation_revision + 1,
      draw_history: [],
      roster,
    }).eq("id", current.id);
    expect(reset.error).toBeNull();
    const catalog = await fixture.service.from("clan_auction_items").insert([
      { clan_id: fixture.clanId, name: "맵 선정권", description: "맵을 선택할 권리", cost: 100, enabled: true },
      { clan_id: fixture.clanId, name: "영웅 밴 무효화", description: "한 영웅 밴을 취소", cost: 100, enabled: true },
      { clan_id: fixture.clanId, name: "돌격 영웅 체력 증가", description: "게임에서 체력을 조정", cost: 200, enabled: true },
      { clan_id: fixture.clanId, name: "진영 선택권", description: "시작 진영을 선택", cost: 150, enabled: true },
      { clan_id: fixture.clanId, name: "비활성 아이템", description: "공개되면 안 됨", cost: 10, enabled: false },
    ]).select("id,name,description,cost,enabled");
    expect(catalog.error).toBeNull();
    await page.reload();
    await panel.getByRole("button", { name: "라운드 설정", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "라운드 설정", exact: true });
    await settings.getByRole("combobox", { name: "팀원 선발 방식", exact: true }).selectOption("auction");
    await settings.getByLabel("입찰 시간(초)", { exact: true }).fill("20");
    await settings.getByRole("checkbox", { name: "전략 아이템 사용", exact: true }).check();
    await settings.getByLabel("전략 준비 시간(초)", { exact: true }).fill("10");
    await settings.getByRole("button", { name: "설정 적용", exact: true }).click();
    await expect(settings).toBeHidden();
    expect((await fixture.activeRound(room.roomId)).formation_settings).toMatchObject({
      teams: "auction", durationSeconds: 20, strategySeconds: 10, auctionItemsEnabled: true,
    });
    const auctionRequestPromise = formationRequest(page, "start");
    await panel.getByRole("button", { name: "편성 진행", exact: true }).click();
    const auctionRequest = await auctionRequestPromise;
    const strategyPanel = panel.locator('[data-testid="auction-stage"][data-auction-stage="strategy"]');
    await expect(strategyPanel).toBeVisible();
    await expect(memberPanel.locator('[data-auction-stage="strategy"]')).toBeVisible();
    await expectFormationAboveRoster(panel);
    const strategy = ((await fixture.activeRound(room.roomId)).formation_state as unknown as FormationState).strategy!;
    expect(strategy.deadline - strategy.startedAt).toBe(10_000);
    expect(strategy.items).toHaveLength(3);
    expect(new Set(strategy.items.map((item) => item.id)).size).toBe(3);
    for (const item of strategy.items) {
      expect(catalog.data!.some((candidate) => candidate.id === item.id && candidate.enabled)).toBe(true);
      await expect(strategyPanel).toContainText(item.name);
      await expect(memberPanel.locator('[data-auction-stage="strategy"]')).toContainText(item.name);
    }
    await expect(strategyPanel).not.toContainText("비활성 아이템");
    await strategyPanel.screenshot({ path: test.info().outputPath("auction-strategy-desktop.png") });
    const selectedItem = strategy.items[0];
    const editCatalog = await fixture.service.from("clan_auction_items")
      .update({ name: "다음 경매부터 바뀐 아이템", cost: 9990 })
      .eq("clan_id", fixture.clanId).eq("id", selectedItem.id);
    expect(editCatalog.error).toBeNull();
    const firstLot = panel.getByTestId("auction-player");
    // This transition uses the actual configured strategy timer, with no fixture clock shortcut.
    await expect(firstLot).toBeVisible({ timeout: 20_000 });
    await expect(strategyPanel).toHaveCount(0);
    const lotRound = await fixture.activeRound(room.roomId);
    const lot = (lotRound.formation_state as unknown as FormationState).auction!;
    expect(lot.deadline - lot.startedAt).toBe(20_000);
    await expect(firstLot).toHaveAttribute("data-player-id", lot.player);
    await expect(panel.getByTestId("balance-formation").getByRole("button", { name: /^2팀 입찰/ })).toHaveCount(0);
    await expect(memberPanel.getByTestId("balance-formation").getByRole("button", { name: /^1팀 입찰/ })).toHaveCount(0);
    expect(await replayFormation(page, auctionRequest, lotRound.formation_revision, {
      type: "bid", team: "team2", amount: 10,
    })).toContain("현재 팀 주장만 조작할 수 있습니다.");
    expect(((await fixture.activeRound(room.roomId)).formation_state as unknown as FormationState).auction?.bid).toBe(0);
    const formation = panel.getByTestId("balance-formation");
    const bidInput = formation.getByLabel("입찰 포인트", { exact: true });
    for (const [button, value] of [["+100", "110"], ["+10", "120"], ["-10", "110"], ["-100", "10"]]) {
      await formation.getByRole("button", { name: button, exact: true }).click();
      await expect(bidInput).toHaveValue(value);
    }
    await formation.getByRole("button", { name: "+100", exact: true }).click();
    await formation.getByRole("button", { name: /^1팀 입찰/ }).click();
    await expect.poll(async () => ((await fixture.activeRound(room.roomId)).formation_state as unknown as FormationState).auction)
      .toMatchObject({ player: lot.player, team: "team1", bid: 110 });
    await expect(firstLot).toContainText("1팀 최고 입찰");
    await formation.screenshot({ path: test.info().outputPath("auction-countdown-desktop.png") });
    // The other captain remains on the page; an absent session manager must not stop the clock.
    await page.goto(fixture.path);
    const award = memberPanel.getByTestId("auction-award");
    await expect(award).toBeVisible({ timeout: 25_000 });
    await expect(award).toHaveAttribute("data-player-id", lot.player);
    await expect(award).toContainText("110");
    await award.screenshot({ path: test.info().outputPath("auction-award-desktop.png") });
    const memberLot = memberPanel.getByTestId("auction-player");
    await expect(memberLot).toBeVisible({ timeout: 15_000 });
    await expect(memberLot).not.toHaveAttribute("data-player-id", lot.player);
    const awarded = (await fixture.activeRound(room.roomId)).formation_state as unknown as FormationState;
    expect(awarded.budgets.team1).toBe(890);
    expect(awarded.remaining).not.toContain(lot.player);
    await page.goto(room.url);
    await page.setViewportSize({ width: 858, height: 1032 });
    await expect(formation).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("auction-page-858.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(formation).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect((await bidInput.boundingBox())!.width).toBeGreaterThanOrEqual(70);
    await formation.screenshot({ path: test.info().outputPath("auction-controls-mobile.png") });
    await page.setViewportSize({ width: 320, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect((await bidInput.boundingBox())!.width).toBeGreaterThanOrEqual(70);
    await formation.screenshot({ path: test.info().outputPath("auction-controls-320.png") });
    await page.setViewportSize({ width: 1280, height: 900 });

    const itemState = await finishRemainingLots(fixture, room.roomId);
    expect(itemState.remaining).toEqual([]);
    expect(rosterAssignedUserIds(itemState.roster).sort()).toEqual([...ids].sort());
    expect(itemState.strategy!.items).toEqual(strategy.items);
    expect(itemState.itemChoices).toEqual({});
    const itemPanel = panel.locator('[data-testid="auction-stage"][data-auction-stage="items"]');
    await expect(itemPanel).toBeVisible();
    await expect(memberPanel.locator('[data-auction-stage="items"]')).toBeVisible();
    await expect(panel).toHaveAttribute("data-balance-phase", "editing");
    await itemPanel.screenshot({ path: test.info().outputPath("auction-items-desktop.png") });
    const beforeItems = await fixture.activeRound(room.roomId);
    expect(await replayFormation(page, auctionRequest, beforeItems.formation_revision, {
      type: "choose-item", team: "team2", itemId: selectedItem.id, expectedDrawId: itemState.draw!.id,
    })).toContain("현재 팀 주장만 조작할 수 있습니다.");
    expect(await replayFormation(page, auctionRequest, beforeItems.formation_revision, {
      type: "choose-item", team: "team1", itemId: selectedItem.id, expectedDrawId: draft.draw!.id,
    })).toContain("편성이 변경되었습니다.");
    expect((await fixture.activeRound(room.roomId)).formation_state).toEqual(beforeItems.formation_state);
    const buyButton = itemPanel.locator('[aria-label="이번 경매 아이템"] > div')
      .filter({ has: page.getByRole("heading", { name: selectedItem.name, exact: true }) })
      .getByRole("button", { name: "1팀 구매", exact: true });
    const skipButton = memberPanel.locator('[data-auction-stage="items"]')
      .getByRole("button", { name: "2팀 구매 없이 완료", exact: true });
    await Promise.all([expect(buyButton).toBeEnabled(), expect(skipButton).toBeEnabled()]);
    const buyResponse = page.waitForResponse((response) =>
      response.request().method() === "POST" &&
      response.request().headers()["next-action"] === auctionRequest.headers()["next-action"] &&
      Boolean(response.request().postData()?.includes('"type":"choose-item"')),
    );
    const skipResponse = member.waitForResponse((response) =>
      response.request().method() === "POST" &&
      response.request().headers()["next-action"] === auctionRequest.headers()["next-action"] &&
      Boolean(response.request().postData()?.includes('"type":"choose-item"')),
    );
    // Both captains act on the same item selection screen; neither waits for the opponent's refresh.
    await Promise.all([buyButton.click(), skipButton.click()]);
    const [bought, skipped] = await Promise.all([buyResponse, skipResponse]);
    expect(await bought.text()).toContain('"ok":true');
    expect(await skipped.text()).toContain('"ok":true');
    await expect.poll(async () => ((await fixture.activeRound(room.roomId)).formation_state as unknown as FormationState).stage, { timeout: 20_000 })
      .toBe("complete");
    const complete = (await fixture.activeRound(room.roomId)).formation_state as unknown as FormationState;
    expect(complete.itemChoices).toEqual({ team1: selectedItem.id, team2: null });
    expect(complete.budgets.team1).toBe(itemState.budgets.team1 - selectedItem.cost);
    expect(complete.budgets.team2).toBe(itemState.budgets.team2);
    expect(complete.appliedAt).toEqual(expect.any(Number));
    await expect(panel.getByRole("heading", { name: /맵 선택.*라운드 1/ })).toBeVisible({ timeout: 20_000 });
    await expect(panel.getByTestId("balance-formation")).toHaveCount(0);
    await expect(panel.getByRole("complementary", { name: "구매한 전략 아이템", exact: true }))
      .toContainText(selectedItem.name);
    await expect(memberPanel.getByRole("complementary", { name: "구매한 전략 아이템", exact: true }))
      .toContainText(selectedItem.name);
  } finally {
    await memberContext.close();
    await fixture.cleanup();
  }
});
