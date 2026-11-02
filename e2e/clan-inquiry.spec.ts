import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ actionTimeout: 15_000 });

test("pending applicant can reopen the shared clan room until their request is resolved",async({page,browser})=>{
  test.setTimeout(100_000);
  const f=await createIsolatedBalanceFixture(2);
  const title="문의방 QA 홍보글";
  try {
    const service=f.service;
    expect((await service.from("clan_members").delete().eq("clan_id",f.clanId).eq("user_id",f.users[1].id)).error).toBeNull();
    expect((await service.from("board_posts").insert({game_id:f.gameId,clan_id:f.clanId,created_by:f.users[0].id,post_type:"promotion",title,content:"문의방 QA"})).error).toBeNull();
    const request = await service.from("clan_join_requests").insert({game_id:f.gameId,clan_id:f.clanId,user_id:f.users[1].id}).select("id").single();
    expect(request.error).toBeNull();
    await loginIsolatedBalanceUser(page,f.users[1]);
    await page.goto("/games/overwatch/clan");
    const detail=page.getByRole("dialog",{name:title});
    await page.getByRole("region",{name:"현재 신청 중인 클랜"}).getByRole("button",{name:"클랜 문의방"}).click();
    const room=page.getByRole("dialog",{name:"클랜 문의방"});
    const editor = room.getByRole("textbox",{name:"문의 메시지"});
    const send = room.getByRole("button",{name:"보내기"});
    await expect(room.getByRole("button", {name:/이모티콘|공감/})).toHaveCount(0);
    for (const value of ["참여할게요 👍", "[e:00000000-0000-0000-0000-000000000001]"]) {
      await editor.fill(value);
      await expect(send).toBeDisabled();
      await expect(room.getByRole("alert")).toContainText("이모지");
    }
    await editor.fill("첫 문의입니다.");
    await editor.press("Control+Enter");
    const mine = room.getByRole("listitem").filter({hasText:"첫 문의입니다."});
    await expect(mine.locator("[data-comment-row]")).toHaveCSS("flex-direction","row-reverse");
    await expect(mine.locator("time")).toBeVisible();
    await expect(mine.locator("strong")).toHaveText(f.users[1].nickname);
    await editor.fill("두 번째 문의입니다.");
    await send.click();
    const second = room.getByRole("listitem").filter({hasText:"두 번째 문의입니다."});
    await expect(second.locator("p")).toBeVisible();
    await expect(second.locator("strong")).toHaveCount(0);
    await page.keyboard.press("Escape");
    const staffPage = await browser.newPage({ baseURL: new URL(page.url()).origin, viewport: { width: 976, height: 884 } });
    try {
      await loginIsolatedBalanceUser(staffPage,f.users[0]);
      await staffPage.goto(`/games/overwatch/clan/${f.clanId}/manage?tab=requests`);
      await expect(staffPage.getByRole("heading", {name:"대기 중인 가입 요청"})).toBeVisible();
      await expect(staffPage.getByRole("button", {name:"클랜 문의방 · 새 댓글"})).toBeVisible();
      await staffPage.getByRole("button", {name:/^알림.*미읽음/}).click();
      await staffPage.getByRole("button", {name:/클랜 문의방에 새 댓글/}).first().click();
      const staffRoom = staffPage.getByRole("dialog", {name:"클랜 문의방"});
      await expect(staffRoom.getByText("두 번째 문의입니다.", {exact:true})).toBeVisible();
      await staffRoom.getByRole("textbox",{name:"문의 메시지"}).fill("운영진 답변입니다.");
      await staffRoom.getByRole("button",{name:"보내기"}).click();
      await expect(staffRoom.getByText("운영진 답변입니다.", {exact:true})).toBeVisible();
      await staffPage.keyboard.press("Escape");
      await expect(staffPage).not.toHaveURL(/inquiry=1/);
      await staffPage.getByRole("button",{name:"클랜 문의방",exact:true}).click();
      await expect(staffRoom).toBeVisible();
    } finally { await staffPage.close(); }
    await page.bringToFront();
    const applicantButton = page.getByRole("region",{name:"현재 신청 중인 클랜"}).getByRole("button",{name:"클랜 문의방 · 새 댓글"});
    await applicantButton.click({timeout:35_000});
    const reply = room.getByRole("listitem").filter({hasText:"운영진 답변입니다."});
    await expect(reply.locator("strong")).toHaveText(f.users[0].nickname, {timeout:10000});
    await expect(reply.locator("[data-comment-row]")).toHaveCSS("flex-direction","row");
    await expect(reply.getByRole("button",{name:/삭제|공감/})).toHaveCount(0);
    await page.setViewportSize({width:390,height:844});
    expect(await room.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await second.hover();
    await expect(room.getByRole("button",{name:/삭제/})).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.goto("/profile");
    const accountTab = page.getByRole("tab", {name:"계정 정보"});
    await expect(async () => {
      await accountTab.click();
      await expect(accountTab).toHaveAttribute("aria-selected", "true", {timeout:1000});
    }).toPass({timeout:10000});
    await page.getByRole("button",{name:"클랜 문의방"}).click();
    await expect(room.getByText("두 번째 문의입니다.",{exact:true})).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("link",{name:"홍보글 보기"}).click();
    await expect(detail).toBeVisible();
    await detail.getByRole("button",{name:"클랜 문의방"}).click();
    await expect(room.getByText("첫 문의입니다.",{exact:true})).toBeVisible();
    const leader = await f.memberClient(0);
    try {
      expect((await leader.rpc("resolve_clan_join_request", {p_clan_id:f.clanId, p_request_id:request.data!.id, p_decision:"rejected"})).error).toBeNull();
    } finally { await leader.auth.signOut(); }
    await expect(room.getByRole("alert")).toHaveText("이 문의방에 접근할 수 없습니다.", {timeout:10000});
    await expect(room.getByRole("listitem")).toHaveCount(0);
    await expect(editor).toHaveCount(0);
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page,f.users[0]);
    await page.goto(`/games/overwatch/clan/${f.clanId}/manage?tab=requests`);
    await expect(page.getByText("대기 중인 가입 신청이 없습니다.")).toBeVisible();
    await page.getByRole("button",{name:"클랜 문의방"}).click();
    await expect(room.getByText("첫 문의입니다.",{exact:true})).toBeVisible();
    await expect(room.getByRole("button",{name:/삭제/})).toHaveCount(0);
  } finally { await f.cleanup(); }
});
