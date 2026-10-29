import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ timezoneId: "Asia/Seoul" });
async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}
async function capture(page: Page, name: string) {
  const directory = process.env.MANAGE_OVERVIEW_CAPTURE_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, name), animations: "disabled" });
}

test("운영 현황의 회차·배지·중복 제거와 대시보드 공지 3개", async ({ page }) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(3);
  const base = f.path.replace(/\/balance$/, "");
  try {
    await ok(f.service.from("clans").update({ name: "ClanSync 데모 클랜", created_at: "2025-09-14T16:00:00Z", max_members: 30 }).eq("id", f.clanId));
    await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
    await ok(f.service.from("clan_join_requests").insert({ clan_id: f.clanId, game_id: f.gameId, user_id: f.users[2].id, status: "pending" }));
    const regular = Array.from({ length: 99 }, (_, index) => ({ id: randomUUID(), opened_at: new Date(Date.UTC(2026, 8, 1) + index * 3_600_000).toISOString() }));
    const flash = randomUUID(), current = randomUUID();
    await ok(f.service.from("balance_session_series").insert([
      ...regular.map((row) => ({ ...row, closed_at: "2026-09-10T00:00:00Z" })),
      { id: flash, opened_at: "2026-10-09T12:00:00Z", closed_at: "2026-10-09T14:00:00Z" },
      { id: current, opened_at: "2026-10-11T16:00:00Z", closed_at: null },
    ].map((row) => ({ ...row, clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id }))));
    // Compatibility creates the matching rooms; the flash must not count for badges.
    await ok(f.service.from("balance_rooms").update({ kind: "regular" }).in("id", [...regular.map((row) => row.id), current]));
    await ok(f.service.from("balance_rooms").update({ kind: "flash" }).eq("id", flash));
    await ok(f.service.from("balance_sessions").insert([
      ...regular.map(row=>({series_id:row.id,opened_at:row.opened_at,closed_at:"2026-09-10T00:00:00Z",match_outcome:"team1" as const})),
      {series_id:flash,opened_at:"2026-10-09T12:00:00Z",closed_at:"2026-10-09T14:00:00Z",match_outcome:"draw" as const},
      {series_id:current,opened_at:"2026-10-11T16:00:00Z",closed_at:null,match_outcome:"pending" as const},
    ].map(row=>({...row,clan_id:f.clanId,game_id:f.gameId,host_user_id:f.users[0].id,round_number:1}))));
    await ok(f.service.from("balance_rooms").insert({ clan_id: f.clanId, game_id: f.gameId, created_by: f.users[0].id, title: "예약만 된 내전", scheduled_at: new Date(Date.now() + 86_400_000).toISOString(), kind: "regular", status: "scheduled" }));
    const now = Date.now();
    await ok(f.service.from("clan_notices").insert(Array.from({ length: 6 }, (_, index) => ({ clan_id: f.clanId, created_by: f.users[0].id,
      title: index ? `클랜 소식 ${index}` : "먼저 확인할 고정 공지", content: `공지 내용 ${index}`, is_pinned: index === 0,
      created_at: new Date(now - (6 - index) * 60_000).toISOString(),
    }))));
    await ok(f.service.from("clan_polls").insert({ clan_id: f.clanId, created_by: f.users[0].id, title: "함께 정할 내전 시간", post_to_notice: true, deadline_at: new Date(now + 86_400_000).toISOString() }));
    await page.setViewportSize({ width: 1100, height: 884 });
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(`${base}/manage`);
    await expect(page.getByRole("region", { name: "총 내전 101회", exact: true })).toBeVisible();
    const counts = page.getByRole("region", { name: "총 내전 101회", exact: true });
    await expect(counts.getByText("정규 내전", { exact: true }).locator("..")).toContainText("100회");
    await expect(counts.getByText("깜짝 내전", { exact: true }).locator("..")).toContainText("1회");
    await expect(page.getByRole("region", { name: "구성원 2명", exact: true })).toContainText("2명");
    const summary = page.getByRole("group", { name: "클랜 운영 요약", exact: true });
    await expect(summary.getByRole("link")).toHaveCount(0);
    await expect(summary.getByText(/자리 여유|정원 \d+|개설 회차|잔액·플랜/)).toHaveCount(0);
    for (const label of ["구성원", "총 내전", "클랜 코인"]) await expect(summary.getByRole("heading", { name: label, exact: true }).locator("svg")).toHaveCount(1);
    const overviewUrl = page.url();
    await summary.getByRole("region", { name: "구성원 2명", exact: true }).click();
    await expect(page).toHaveURL(overviewUrl);
    await expect(page.getByRole("navigation", { name: "클랜 관리 분류", exact: true }).getByRole("link", { name: "구성원 관리 1", exact: true })).toBeVisible();
    await expect(page.getByText(/기다리고 있습니다/)).toHaveCount(0);
    await expect(page.getByRole("region", { name: "클랜 기본 정보", exact: true })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "운영 바로가기", exact: true })).toHaveCount(0);
    await expect(page.getByText("가입 대기", { exact: true })).toHaveCount(0);
    const history = page.getByRole("region", { name: "클랜 기록", exact: true });
    await expect(history).toContainText("2025년 9월 15일");
    await expect(history).toContainText("2026년 10월 12일");
    const badges = page.getByRole("region", { name: "클랜 배지", exact: true });
    await expect(badges.getByRole("link", { name: "배지 케이스 보기 →", exact: true })).toHaveCount(0);
    await capture(page, "manage-overview-desktop.png");
    await page.goto(base+"/badges");
    const mainCase = page.getByRole("group", { name:"배지 진열",exact:true });
    const dialog = page.getByRole("dialog");
    const description = dialog.getByRole("region", { name:"배지 계열 설명",exact:true });
    const related = dialog.getByRole("group", { name:"연관 단계 배지",exact:true });
    await expect(mainCase.locator("button")).toHaveCount(9);
    await expect(mainCase.locator('[data-badge="founding"] img')).toBeVisible();
    expect(await mainCase.locator('[data-badge="founding"] img').evaluate(img=>img.clientWidth)).toBeGreaterThan(120);
    await mainCase.locator('[data-badge="regular-50"]').click();
    await expect(related.locator("button")).toHaveCount(4);
    await related.locator('[data-badge="regular-100"]').click();
    await expect(description).toContainText("99 / 100회");
    await expect(description).toContainText("미획득");
    await expect(related.locator('[data-badge="regular-100"] img')).toHaveCount(0);
    await dialog.getByRole("button", { name:"닫기",exact:true }).click();
    await ok(f.service.from("balance_session_series").update({closed_at:new Date().toISOString()}).eq("id",current));
    await ok(f.service.from("balance_sessions").update({closed_at:new Date().toISOString(),match_outcome:"team2"}).eq("series_id",current));
    await page.reload();
    await expect(mainCase.locator('[data-badge="regular-50"]')).toHaveCount(0);
    await mainCase.locator('[data-badge="regular-100"]').click();
    await expect(description).toContainText("승·무·패를 기록한 정규 내전 100회차");
    await dialog.getByRole("button", { name:"대표 배지 해제",exact:true }).click();
    await expect(dialog.getByRole("button", { name:"대표 배지 지정",exact:true })).toBeVisible();
    await dialog.getByRole("button", { name:"대표 배지 지정",exact:true }).click();
    await expect(dialog.getByRole("button", { name:"대표 배지 해제",exact:true })).toBeVisible();
    await dialog.getByRole("button", { name:"닫기",exact:true }).click();
    await mainCase.locator('[data-badge="anniversary"]').click();
    await expect(description).toContainText("2026. 9. 15.");
    await expect(related.getByRole("button",{name:"3주년 미획득",exact:true})).toBeVisible();
    await dialog.getByRole("button", { name:"대표 배지 지정",exact:true }).click();
    await expect(page.getByText("대표 배지는 최대 3개입니다.",{exact:false})).toBeVisible();
    await dialog.getByRole("button", { name:"닫기",exact:true }).click();
    await mainCase.locator('[data-badge="founding"]').click();
    await page.getByRole("button", { name:"대표 배지 해제",exact:true }).click();
    await expect(page.getByRole("button", { name:"대표 배지 지정",exact:true })).toBeVisible();
    await dialog.getByRole("button", { name:"닫기",exact:true }).click();
    await mainCase.locator('[data-badge="anniversary"]').click();
    await dialog.getByRole("button", { name:"대표 배지 지정",exact:true }).click();
    await expect(dialog.getByRole("button", { name:"대표 배지 해제",exact:true })).toBeVisible();
    await dialog.getByRole("button", { name:"닫기",exact:true }).click();
    await expect.poll(async()=>(await f.service.from("clan_badge_featured").select("badge_keys").eq("clan_id",f.clanId).single()).data?.badge_keys).toEqual(["regular-1","regular-100","anniversary"]);
    await mainCase.locator('[data-badge="regular-1"]').click();
    await expect(related).toHaveCount(0);
    await dialog.getByRole("button", { name:"닫기",exact:true }).click();
    await expect(page.getByRole("radiogroup",{name:"배지 컬렉션",exact:true}).locator("[data-new-badges]")).toHaveCount(0);
    await expect(page.getByRole("button", { name:"획득 확인",exact:true })).toHaveCount(0);
    const tenYearsAgo = new Date(Date.now()-3_600_000);
    tenYearsAgo.setUTCFullYear(tenYearsAgo.getUTCFullYear()-10);
    await ok(f.service.from("clans").update({created_at:tenYearsAgo.toISOString()}).eq("id",f.clanId));
    await page.reload();
    await page.getByRole("radio", { name:"기념",exact:true }).click();
    await mainCase.locator('[data-badge="anniversary-10"]').click();
    for(const [years,key] of [[1,"anniversary"],[3,"anniversary-3"],[5,"anniversary-5"],[10,"anniversary-10"]] as const) {
      const slot = related.locator('[data-badge="'+key+'"]');
      await expect(slot).toHaveAccessibleName(years+"주년 획득");
      await slot.click();
      await expect(description).toContainText("클랜 창단 "+years+"주년");
      await expect(slot.locator("img")).toHaveAttribute("src",new RegExp("anniversary-growing-history-"+years+"y-gold-v3"));
      await expect.poll(()=>slot.locator("img").evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
    }
    await capture(page,"anniversary-series-desktop.png");
    await dialog.getByRole("button", { name:"닫기",exact:true }).click();
    await page.goto(base+"/manage");
    await expect(mainCase.locator('[data-badge="anniversary-10"] img')).toHaveAttribute("src",/anniversary-growing-history-10y-gold-v3/);
    await page.goto(base+"/badges");
    await page.getByRole("radio", { name:"기념",exact:true }).click();
    await page.setViewportSize({width:390,height:844});
    await mainCase.locator('[data-badge="anniversary-10"]').click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await capture(page,"anniversary-series-mobile.png");
    await dialog.getByRole("button", { name:"닫기",exact:true }).click();
    await page.setViewportSize({width:1100,height:884});
    const beforeTenth = new Date(Date.now()+86_400_000);
    beforeTenth.setUTCFullYear(beforeTenth.getUTCFullYear()-10);
    await ok(f.service.from("clans").update({created_at:beforeTenth.toISOString()}).eq("id",f.clanId));
    await page.reload();
    await expect(mainCase.locator('[data-badge="anniversary-5"]')).toBeVisible();
    await expect(mainCase.locator('[data-badge="anniversary-10"]')).toHaveCount(0);
    expect(await ok(f.service.from("clan_badge_awards").select("badge_key").eq("clan_id",f.clanId).eq("badge_key","anniversary-10"))).toHaveLength(0);
    await page.getByRole("radio", { name:"내전",exact:true }).click();
    await mainCase.locator('[data-badge="flash-10"]').click();
    await expect(related.locator("button")).toHaveCount(4);
    await related.locator('[data-badge="flash-10"]').click();
    await expect(description).toContainText("1 / 10");
    await dialog.getByRole("button", { name:"닫기",exact:true }).click();
    await page.goto(base+"/manage");
    await expect(mainCase.locator('[data-badge="anniversary-5"]')).toBeVisible();
    await expect(page.getByRole("region",{name:"총 내전 101회",exact:true})).toBeVisible();
    await page.goto(base);
    const notices = page.getByRole("list", { name: "최근 클랜 공지", exact: true });
    await expect(notices.getByRole("listitem")).toHaveCount(3);
    await expect(notices.getByRole("listitem").first()).toContainText("먼저 확인할 고정 공지");
    await expect(notices.getByRole("link", { name: /함께 정할 내전 시간/ })).toBeVisible();
    await expect(notices.getByRole("link", { name: /클랜 소식 5/ })).toBeVisible();
    expect(await notices.evaluate((node) => node.scrollHeight <= node.clientHeight)).toBe(true);
    await notices.getByRole("link", { name: /먼저 확인할 고정 공지/ }).click();
    await expect(page.getByText("공지 내용 0", { exact: true })).toBeVisible();
    await page.goto(base);
    await expect(page.getByRole("region", { name: "클랜 배지", exact: true }).getByRole("link", { name: "클랜 배지", exact: true })).toBeVisible();
    await capture(page, "dashboard-notices-desktop.png");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await notices.evaluate((node) => node.scrollHeight <= node.clientHeight)).toBe(true);
    await expect(notices.getByRole("listitem")).toHaveCount(3);
    await page.goto(`${base}/manage`);
    await expect(page.getByRole("region", { name: "총 내전 101회", exact: true })).toBeVisible();
    for (const width of [698, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      for (const label of ["구성원", "총 내전", "클랜 코인"]) await expect(summary.getByRole("heading", { name: label, exact: true })).toBeVisible();
    }
    await capture(page, "manage-overview-mobile.png");
  } finally { await f.cleanup(); }
});
