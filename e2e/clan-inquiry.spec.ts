import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("pending applicant can reopen the inquiry from their promotion and profile",async({page})=>{
  const f=await createIsolatedBalanceFixture(2);
  const title="문의방 QA 홍보글";
  try {
    const service=f.service;
    expect((await service.from("clan_members").delete().eq("clan_id",f.clanId).eq("user_id",f.users[1].id)).error).toBeNull();
    expect((await service.from("board_posts").insert({game_id:f.gameId,clan_id:f.clanId,created_by:f.users[0].id,post_type:"promotion",title,content:"문의방 QA"})).error).toBeNull();
    expect((await service.from("clan_join_requests").insert({game_id:f.gameId,clan_id:f.clanId,user_id:f.users[1].id})).error).toBeNull();
    await loginIsolatedBalanceUser(page,f.users[1]);
    await page.goto("/games/overwatch/clan");
    const detail=page.getByRole("dialog",{name:title});
    await page.getByRole("region",{name:"현재 신청 중인 클랜"}).getByRole("button",{name:"클랜 문의방"}).click();
    const room=page.getByRole("dialog",{name:"클랜 문의방"});
    await room.getByRole("textbox",{name:"문의 메시지"}).fill("첫 문의입니다.");
    await room.getByRole("button",{name:"보내기"}).click();
    await expect(room.getByText("첫 문의입니다.",{exact:true})).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/profile");
    await page.getByRole("tab",{name:"계정 정보"}).click();
    await page.getByRole("link",{name:"홍보글 보기"}).click();
    await expect(detail).toBeVisible();
    await detail.getByRole("button",{name:"클랜 문의방"}).click();
    await expect(room.getByText("첫 문의입니다.",{exact:true})).toBeVisible();
  } finally { await f.cleanup(); }
});
