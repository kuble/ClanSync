import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("pending applicant can reopen the inquiry from their promotion and profile",async({page})=>{
  test.setTimeout(60_000);
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
    const officer = await f.memberClient(0);
    try {
      expect((await officer.rpc("join_inquiry", {p_request:request.data!.id, p_body:"운영진 답변입니다."})).error).toBeNull();
    } finally { await officer.auth.signOut(); }
    const reply = room.getByRole("listitem").filter({hasText:"운영진 답변입니다."});
    await expect(reply.locator("strong")).toHaveText(f.users[0].nickname, {timeout:10000});
    await expect(reply.locator("[data-comment-row]")).toHaveCSS("flex-direction","row");
    await expect(reply.getByRole("button",{name:/삭제|공감/})).toHaveCount(0);
    await page.setViewportSize({width:390,height:844});
    expect(await room.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await second.hover();
    await second.getByRole("button",{name:/댓글 삭제/}).click();
    await second.getByRole("button",{name:"삭제 확인"}).click();
    await expect(second).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.goto("/profile");
    const accountTab = page.getByRole("tab", {name:"계정 정보"});
    await expect(async () => {
      await accountTab.click();
      await expect(accountTab).toHaveAttribute("aria-selected", "true", {timeout:1000});
    }).toPass({timeout:10000});
    await page.getByRole("link",{name:"홍보글 보기"}).click();
    await expect(detail).toBeVisible();
    await detail.getByRole("button",{name:"클랜 문의방"}).click();
    await expect(room.getByText("첫 문의입니다.",{exact:true})).toBeVisible();
  } finally { await f.cleanup(); }
});
