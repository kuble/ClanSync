import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { loadTestEnv } from "../scripts/test-env.mjs";
import { gotoOverwatchLeaderClanBase, loginAsFixtureRole } from "./fixture-login-helper";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

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

test("separate stores cancel purchases without changing balances or ownership", async ({ page }) => {
  const f=await createIsolatedBalanceFixture(1), titleId=randomUUID();
  try {
    expect((await f.service.from("users").update({coin_balance:500}).eq("id",f.users[0].id)).error).toBeNull();
    expect((await f.service.from("clans").update({coin_balance:500}).eq("id",f.clanId)).error).toBeNull();
    expect((await f.service.from("nameplate_options").insert({id:titleId,game_id:f.gameId,category:"sub",code:"title-e2e-"+titleId,name_ko:"취소 검증 칭호",unlock_source:"store",price_coins:50})).error).toBeNull();
    const item=await f.service.from("store_items").select("name_ko").eq("slug","clan_photo_frames").single();expect(item.error).toBeNull();
    await loginIsolatedBalanceUser(page,f.users[0]);await page.goto(f.path.replace(/balance$/,"store"));
    await page.getByRole("article",{name:item.data!.name_ko,exact:true}).getByRole("button",{name:"구매",exact:true}).click();
    await page.getByRole("dialog",{name:"꾸미기 구매",exact:true}).getByRole("button",{name:"취소",exact:true}).click();
    await page.goto("/store");
    await page.getByRole("radiogroup",{name:"개인 꾸미기 분류"}).getByRole("radio",{name:"칭호",exact:true}).click();
    await page.getByRole("button",{name:"취소 검증 칭호 구매",exact:true}).click();
    await page.getByRole("dialog",{name:"네임카드 디자인 구매",exact:true}).getByRole("button",{name:"취소",exact:true}).click();
    expect((await f.service.from("users").select("coin_balance").eq("id",f.users[0].id).single()).data?.coin_balance).toBe(500);
    expect((await f.service.from("clans").select("coin_balance").eq("id",f.clanId).single()).data?.coin_balance).toBe(500);
    expect((await f.service.from("purchases").select("id").eq("user_id",f.users[0].id)).data).toEqual([]);
    expect((await f.service.from("user_nameplate_inventory").select("option_id").eq("user_id",f.users[0].id)).data).toEqual([]);
  } finally {await f.cleanup();expect((await f.service.from("nameplate_options").delete().eq("id",titleId)).error).toBeNull();}
});
