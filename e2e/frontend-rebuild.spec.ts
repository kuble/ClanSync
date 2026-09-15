import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { loadTestEnv } from "../scripts/test-env.mjs";
import { gotoOverwatchLeaderClanBase, loginAsFixtureRole } from "./fixture-login-helper";
import { credentialsForFixture } from "./qa-fixture-credentials";

test.use({ timezoneId: "Asia/Seoul" });
test.setTimeout(90_000);

function qaService() {
  const env = loadTestEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function leaderContext(page: Page, svc: ReturnType<typeof qaService>) {
  const base = await gotoOverwatchLeaderClanBase(page);
  const clanId = base.split("/").at(-1)!;
  const { data, error } = await svc.from("clan_members").select("user_id")
    .eq("clan_id", clanId).eq("role", "leader").eq("status", "active").single();
  expect(error).toBeNull();
  expect(data).not.toBeNull();
  return { base, clanId, userId: data!.user_id };
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const main = document.querySelector("main");
    return Math.max(documentWidth - window.innerWidth, main ? main.scrollWidth - main.clientWidth : 0);
  })).toBeLessThanOrEqual(1);
}

test("community promotion modal publishes a real post and opens its detail", async ({ page }) => {
  const svc = qaService();
  const { clanId, userId } = await leaderContext(page, svc);
  const title = `frontend-promo-${randomUUID().slice(0, 8)}`;
  const content = `${title} 클랜원을 모집합니다.\n함께 즐겁게 플레이할 팀원을 기다립니다.`;
  try {
    await page.goto("/games/overwatch?tab=promo");
    await expect(page.getByRole("heading", { name: "홍보", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "홍보 글 작성", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "홍보 글 작성", exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("제목", { exact: true }).fill(title);
    await dialog.getByLabel("내용", { exact: true }).fill(content);
    await dialog.getByRole("button", { name: "등록", exact: true }).click();
    await expect(page.getByText("홍보글이 등록되었습니다.", { exact: true })).toBeVisible();
    await expect(dialog).toBeHidden();
    const link = page.getByTestId("main-game-tab-promo").getByRole("link", { name: title, exact: true });
    await expect(link).toBeVisible();
    const { data, error } = await svc.from("board_posts").select("id,content,post_type,created_by")
      .eq("clan_id", clanId).eq("created_by", userId).eq("title", title).single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ content, post_type: "promotion", created_by: userId });
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/games/overwatch/board/${data!.id}$`));
    const article = page.locator(`[data-board-post-id="${data!.id}"]`);
    await expect(article.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(article).toContainText(content);
    await page.getByRole("link", { name: /홍보 탭으로/ }).click();
    await expect(page).toHaveURL(/\/games\/overwatch\?tab=promo$/);
    await expect(link).toBeVisible();
  } finally {
    const { error } = await svc.from("board_posts").delete()
      .eq("clan_id", clanId).eq("created_by", userId).eq("title", title);
    expect(error).toBeNull();
  }
});

test("KST LFG modal defaults to a future local deadline and stores the same UTC instant", async ({ page }) => {
  const svc = qaService();
  const { userId } = await leaderContext(page, svc);
  const description = `frontend-lfg-${randomUUID()}`;
  try {
    await page.goto("/games/overwatch?tab=lfg");
    await page.getByRole("button", { name: "LFG 모집 등록", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "LFG 모집 등록", exact: true });
    await expect(dialog).toBeVisible();
    const deadline = await dialog.getByLabel("모집 마감 (로컬 시각)", { exact: true }).inputValue();
    const browserTime = await page.evaluate((value) => ({
      iso: new Date(value).toISOString(),
      remaining: new Date(value).getTime() - Date.now(),
      offset: new Date(value).getTimezoneOffset(),
    }), deadline);
    expect(browserTime.offset).toBe(-540);
    expect(browserTime.remaining).toBeGreaterThan(0);
    expect(browserTime.remaining).toBeLessThanOrEqual(3 * 60 * 60 * 1000);
    await dialog.getByLabel("모집 인원 (슬롯)", { exact: true }).fill("3");
    await dialog.getByLabel("한마디 (선택)", { exact: true }).fill(description);
    await dialog.getByLabel("마이크 필수", { exact: true }).check();
    await dialog.getByRole("button", { name: "모집 등록", exact: true }).click();
    await expect(page.getByText("LFG 모집을 등록했습니다.", { exact: true })).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(description, { exact: true })).toBeVisible();
    const { data, error } = await svc.from("lfg_posts")
      .select("expires_at,slots,mic_required,status,creator_user_id")
      .eq("creator_user_id", userId).eq("description", description).single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ slots: 3, mic_required: true, status: "open", creator_user_id: userId });
    expect(new Date(data!.expires_at).toISOString()).toBe(browserTime.iso);
  } finally {
    const { error } = await svc.from("lfg_posts").delete()
      .eq("creator_user_id", userId).eq("description", description);
    expect(error).toBeNull();
  }
});

test("390px community menu closes after navigation and browser history restores the tab", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsFixtureRole(page, "Leader");
  await page.goto("/games/overwatch");
  await expect(page.getByRole("heading", { name: /커뮤니티$/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: /커뮤니티$/ });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("navigation", { name: "모바일 커뮤니티 메뉴", exact: true })
    .getByRole("button", { name: "LFG", exact: true }).click();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/\/games\/overwatch\?tab=lfg$/);
  await expect(page.getByRole("heading", { name: "같이 할 사람", level: 1, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "LFG 모집 등록", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/games\/overwatch$/);
  await expect(page.getByRole("heading", { name: /커뮤니티$/ })).toBeVisible();
  await expect(drawer).toBeHidden();
  await page.goForward();
  await expect(page).toHaveURL(/\/games\/overwatch\?tab=lfg$/);
  await expect(page.getByRole("heading", { name: "같이 할 사람", level: 1, exact: true })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "LFG", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("store tabs show real coins, Free/Premium comparison and canceling purchase preserves balances", async ({ page }) => {
  const svc = qaService();
  const { base, clanId, userId } = await leaderContext(page, svc);
  const [clanResult, userResult, adminResult, catalogResult, clanPurchases, personalPurchases] = await Promise.all([
    svc.from("clans").select("coin_balance,subscription_tier").eq("id", clanId).single(),
    svc.from("users").select("coin_balance").eq("id", userId).single(),
    svc.from("users").select("id").ilike("email", credentialsForFixture("Admin").email).single(),
    svc.from("store_items").select("id,slug,name_ko,price_coins")
      .in("slug", ["clan_banner_slot", "profile_entrance_fx"]).eq("is_active", true),
    svc.from("purchases").select("*").eq("clan_id", clanId).eq("pool_source", "clan"),
    svc.from("purchases").select("*").eq("user_id", userId).eq("pool_source", "personal"),
  ]);
  for (const result of [clanResult, userResult, adminResult, catalogResult, clanPurchases, personalPurchases]) {
    expect(result.error).toBeNull();
  }
  const originalClan = clanResult.data!;
  const originalUser = userResult.data!;
  const catalog = catalogResult.data!;
  const banner = catalog.find((item) => item.slug === "clan_banner_slot")!;
  const personal = catalog.find((item) => item.slug === "profile_entrance_fx")!;
  expect(banner).toBeDefined();
  expect(personal).toBeDefined();
  const originalPurchases = [...clanPurchases.data!, ...personalPurchases.data!];
  const originalPurchaseIds = new Set(originalPurchases.map((purchase) => purchase.id));
  const catalogIds = new Set(catalog.map((item) => item.id));
  const temporarilyHidden = originalPurchases.filter((purchase) => !purchase.voided_at && catalogIds.has(purchase.item_id));
  const clanBalance = Math.max(originalClan.coin_balance, banner.price_coins + 137);
  const personalBalance = Math.max(originalUser.coin_balance, personal.price_coins + 251);

  try {
    // The allowlisted QA fixtures are restored even when an assertion fails.
    // This only changes purchase visibility, never purchase/refund RPCs or inventory.
    for (const purchase of temporarilyHidden) {
      const voider = purchase.user_id === userId ? adminResult.data!.id : userId;
      const { error } = await svc.from("purchases").update({
        voided_at: new Date().toISOString(), voided_by: voider, void_reason: "QA store dialog visibility",
      }).eq("id", purchase.id);
      expect(error).toBeNull();
    }
    const setup = await Promise.all([
      svc.from("clans").update({ coin_balance: clanBalance, subscription_tier: "free" }).eq("id", clanId),
      svc.from("users").update({ coin_balance: personalBalance }).eq("id", userId),
    ]);
    for (const result of setup) expect(result.error).toBeNull();
    await page.goto(`${base}/store`);
    await expect(page.getByRole("heading", { name: "클랜 스토어", exact: true })).toBeVisible();
    const coinCards = page.locator('[aria-label="보유 코인"]');
    await expect(coinCards.getByText("클랜 코인", { exact: true }).locator("..").locator("strong"))
      .toHaveText(clanBalance.toLocaleString("ko-KR"));
    await expect(coinCards.getByText("내 코인", { exact: true }).locator("..").locator("strong"))
      .toHaveText(personalBalance.toLocaleString("ko-KR"));
    await expect(page.getByRole("tab", { name: "클랜 꾸미기", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: banner.name_ko, exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "개인 꾸미기", exact: true }).click();
    await expect(page.getByRole("heading", { name: personal.name_ko, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "플랜 비교 보기", exact: true }).click();
    const planDialog = page.getByRole("dialog", { name: "Free / Premium 플랜 비교", exact: true });
    await expect(planDialog).toBeVisible();
    await expect(planDialog.getByRole("columnheader", { name: "Free", exact: true })).toBeVisible();
    await expect(planDialog.getByRole("columnheader", { name: "Premium", exact: true })).toBeVisible();
    await planDialog.locator('[data-slot="dialog-footer"]').getByRole("button", { name: "닫기", exact: true }).click();
    await expect(planDialog).toBeHidden();

    await page.getByRole("tab", { name: "클랜 꾸미기", exact: true }).click();
    const bannerCard = page.getByRole("article").filter({ has: page.getByRole("heading", { name: banner.name_ko, exact: true }) });
    await bannerCard.getByRole("button", { name: "구매", exact: true }).click();
    const purchaseDialog = page.getByRole("dialog", { name: "꾸미기 구매", exact: true });
    await expect(purchaseDialog).toBeVisible();
    await expect(purchaseDialog).toContainText(banner.name_ko);
    await expect(purchaseDialog.getByText("클랜 코인 사용", { exact: true })).toBeVisible();
    await expect(purchaseDialog.getByRole("button", { name: "구매 확정", exact: true })).toBeEnabled();
    await purchaseDialog.getByRole("button", { name: "취소", exact: true }).click();
    await expect(purchaseDialog).toBeHidden();
    await page.reload();
    await expect(coinCards.getByText("클랜 코인", { exact: true }).locator("..").locator("strong"))
      .toHaveText(clanBalance.toLocaleString("ko-KR"));
    const afterCancel = await Promise.all([
      svc.from("clans").select("coin_balance").eq("id", clanId).single(),
      svc.from("users").select("coin_balance").eq("id", userId).single(),
      svc.from("purchases").select("id").eq("clan_id", clanId).eq("pool_source", "clan").is("voided_at", null).eq("item_id", banner.id),
    ]);
    for (const result of afterCancel) expect(result.error).toBeNull();
    expect(afterCancel[0].data!.coin_balance).toBe(clanBalance);
    expect(afterCancel[1].data!.coin_balance).toBe(personalBalance);
    expect(afterCancel[2].data).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
  } finally {
    // If a regression accidentally bought on Cancel, remove only the new QA
    // banner purchase and its ledger entry before restoring any older purchase.
    try {
      const { data, error } = await svc.from("purchases").select("id,coin_transaction_id")
        .eq("clan_id", clanId).eq("user_id", userId).eq("item_id", banner.id);
      expect(error).toBeNull();
      const unexpected = data!.filter((purchase) => !originalPurchaseIds.has(purchase.id));
      if (unexpected.length) {
        expect((await svc.from("purchases").delete().in("id", unexpected.map((purchase) => purchase.id))).error).toBeNull();
        expect((await svc.from("coin_transactions").delete().in("id", unexpected.map((purchase) => purchase.coin_transaction_id))).error).toBeNull();
      }
    } finally {
      const restored = await Promise.all([
        svc.from("clans").update(originalClan).eq("id", clanId),
        svc.from("users").update(originalUser).eq("id", userId),
        ...temporarilyHidden.map((purchase) => svc.from("purchases").update({
          voided_at: purchase.voided_at, voided_by: purchase.voided_by, void_reason: purchase.void_reason,
        }).eq("id", purchase.id)),
      ]);
      for (const result of restored) expect(result.error).toBeNull();
    }
    const [clan, user, clanRows, personalRows] = await Promise.all([
      svc.from("clans").select("coin_balance,subscription_tier").eq("id", clanId).single(),
      svc.from("users").select("coin_balance").eq("id", userId).single(),
      svc.from("purchases").select("*").eq("clan_id", clanId).eq("pool_source", "clan"),
      svc.from("purchases").select("*").eq("user_id", userId).eq("pool_source", "personal"),
    ]);
    for (const result of [clan, user, clanRows, personalRows]) expect(result.error).toBeNull();
    expect(clan.data).toEqual(originalClan);
    expect(user.data).toEqual(originalUser);
    const order = <T extends { id: string }>(rows: T[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
    expect(order([...clanRows.data!, ...personalRows.data!])).toEqual(order(originalPurchases));
  }
});
