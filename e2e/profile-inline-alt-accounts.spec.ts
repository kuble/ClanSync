import { expect, test, type Request } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("부계정은 소개·본인 개인 기록에서 편집하고 다른 사람의 수정 요청은 차단한다", async ({ page, browser }, info) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(2), owner = f.users[0], peer = f.users[1];
  const visitorContext = await browser.newContext(), visitor = await visitorContext.newPage();
  const stats = f.path.replace(/balance$/, "stats");
  let updateRequest: Request;
  async function replay(target: typeof page, request: Request, input?: Record<string, unknown>) {
    const args = JSON.parse(request.postData()!);
    if (input) args[0] = { ...args[0], ...input };
    return target.evaluate(async payload => {
      const response = await fetch(payload.url, { method: "POST", headers: payload.headers, body: payload.body });
      return response.text();
    }, { url: new URL("/profile", request.url()).href, headers: { "next-action": request.headers()["next-action"], "content-type": request.headers()["content-type"], accept: "text/x-component" }, body: JSON.stringify(args) });
  }
  try {
    expect((await f.service.from("user_alt_accounts").insert([
      { user_id: owner.id, game_id: f.gameId, alt_nick: "Duplicate#7777" },
      { user_id: peer.id, game_id: f.gameId, alt_nick: "PeerSide#8888", note: "peer-private-note" },
    ])).error).toBeNull();
    await loginIsolatedBalanceUser(page, owner);
    await page.goto("/profile");
    const overview = page.getByRole("tabpanel", { name: "플레이어 소개", exact: true });
    const alts = overview.getByRole("region", { name: "부계정", exact: true });
    const load = page.waitForRequest(request => !!request.headers()["next-action"] && !!request.postData()?.includes('"overwatch"'));
    await alts.getByRole("button", { name: "부계정 편집", exact: true }).click();
    const loadRequest = await load;
    const manager = page.getByRole("dialog", { name: "부계정 편집", exact: true });
    await expect(manager.getByRole("button", { name: "부계정 추가", exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath("inline-alt-editor.png") });
    await manager.getByRole("button", { name: "부계정 추가", exact: true }).click();
    const add = page.getByRole("dialog", { name: "부계정 추가", exact: true });
    await add.getByRole("textbox", { name: "부계정 닉네임", exact: true }).fill("Added#1001");
    await add.getByRole("textbox", { name: "메모 (선택)", exact: true }).fill("owner-private-note");
    await expect(add.getByRole("button", { name: "추가", exact: true })).toBeDisabled();
    await add.getByRole("checkbox").check();
    await add.getByRole("button", { name: "추가", exact: true }).click();
    await expect(add).toBeHidden();
    await expect(manager.getByText("Added#1001", { exact: true })).toBeVisible();
    const original = await f.service.from("user_alt_accounts").select("id").eq("user_id", owner.id).eq("alt_nick", "Added#1001").single();
    expect(original.error).toBeNull();
    await manager.getByRole("button", { name: "Added#1001 부계정 수정", exact: true }).click();
    const edit = page.getByRole("dialog", { name: "부계정 수정", exact: true });
    const nick = edit.getByRole("textbox", { name: "부계정 닉네임", exact: true });
    await expect(edit.getByRole("textbox", { name: "메모 (선택)", exact: true })).toHaveValue("owner-private-note");
    await nick.fill("Duplicate#7777");
    await edit.getByRole("checkbox").check();
    await edit.getByRole("button", { name: "수정", exact: true }).click();
    await expect(edit.getByRole("alert")).toContainText("이미 같은 닉네임");
    await nick.fill("Renamed#1002");
    await edit.getByRole("button", { name: "수정", exact: true }).click();
    await expect(edit).toBeHidden();
    await manager.getByRole("button", { name: "Renamed#1002 부계정 수정", exact: true }).click();
    await nick.fill("Cancelled#9999");
    await edit.getByRole("button", { name: "취소", exact: true }).click();
    await expect(edit).toBeHidden();
    await expect(manager.getByText("Renamed#1002", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(manager).toBeHidden();
    await expect(alts).toContainText("Renamed#1002");
    await page.goto(stats + "?player=" + owner.id);
    const banner = page.getByRole("region", { name: "플레이어 배너", exact: true });
    await banner.getByRole("button", { name: "부계정 편집", exact: true }).click();
    await manager.getByRole("button", { name: "Renamed#1002 부계정 수정", exact: true }).click();
    await nick.fill("StatsEdit#1003");
    await edit.getByRole("checkbox").check();
    const request = page.waitForRequest(request => !!request.headers()["next-action"] && !!request.postData()?.includes('"altNick":"StatsEdit#1003"'));
    await edit.getByRole("button", { name: "수정", exact: true }).click();
    updateRequest = await request;
    await expect(edit).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(banner.getByRole("region", { name: "부계정", exact: true })).toContainText("StatsEdit#1003");
    const saved = await f.service.from("user_alt_accounts").select("id,alt_nick,note").eq("id", original.data!.id).single();
    expect(saved.data).toMatchObject({ alt_nick: "StatsEdit#1003", note: "owner-private-note" });
    await loginIsolatedBalanceUser(visitor, peer);
    await visitor.goto(stats + "?player=" + owner.id);
    const peerBanner = visitor.getByRole("region", { name: "플레이어 배너", exact: true });
    await expect(peerBanner).toHaveAttribute("aria-busy", "false");
    await expect(peerBanner.getByRole("button", { name: "부계정 편집", exact: true })).toHaveCount(0);
    expect(await replay(visitor, updateRequest, { altNick: "Hijacked#9999" })).toContain("수정 가능한 부계정을 찾을 수 없습니다.");
    const ownRead = await replay(visitor, loadRequest);
    expect(ownRead).toContain("PeerSide#8888"); expect(ownRead).not.toContain("owner-private-note");
    expect((await f.service.from("user_game_profiles").update({ is_verified: false }).eq("user_id", owner.id).eq("game_id", f.gameId)).error).toBeNull();
    expect(await replay(page, updateRequest, { altNick: "Unverified#9999" })).toContain("이 게임을 먼저 인증해야 수정할 수 있습니다.");
    expect((await f.service.from("user_alt_accounts").select("alt_nick").eq("id", original.data!.id).single()).data?.alt_nick).toBe("StatsEdit#1003");
    expect((await f.service.from("user_game_profiles").update({ is_verified: true }).eq("user_id", owner.id).eq("game_id", f.gameId)).error).toBeNull();
    await page.setViewportSize({ width: 320, height: 884 });
    await page.goto("/profile");
    await alts.getByRole("button", { name: "부계정 편집", exact: true }).click();
    await manager.getByRole("button", { name: "StatsEdit#1003 부계정 삭제", exact: true }).click();
    const remove = page.getByRole("dialog", { name: "부계정 등록 삭제", exact: true });
    await remove.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(remove).toBeHidden();
    await expect(manager.getByText("StatsEdit#1003", { exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect((await f.service.from("user_alt_accounts").select("id").eq("id", original.data!.id))).toMatchObject({ data: [], error: null });
  } finally { await visitorContext.close(); await f.cleanup(); }
});
