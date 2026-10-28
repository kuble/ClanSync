import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { CHAT_SERVICES, normalizeChatInviteUrl, parseClanCommunityLinks, readClanCommunityLinks, type ClanCommunityLinks } from "../src/lib/clan/community-links";

const links: ClanCommunityLinks = {
  discord: "https://discord.gg/ClanSyncQA",
  kakao: "https://open.kakao.com/o/gClanSyncQA",
  line: "https://line.me/ti/g2/ClanSyncQA?utm_source=invitation",
  telegram: "https://t.me/+ClanSyncQA_2026",
  whatsapp: "https://chat.whatsapp.com/ClanSyncQA2026",
  steam: "https://steamcommunity.com/chat/invite/ClanSyncQA",
};

test("chat invite links accept official formats and reject spoofed destinations", () => {
  expect(parseClanCommunityLinks(links)).toEqual({ ok:true, links });
  for (const service of CHAT_SERVICES) {
    for (const invalid of ["javascript:alert(1)", "http://example.com/room", "https://example.com/room", links[service.id].replace("https://", "https://user@"), links[service.id].replace("https://", "https://evil.example/path/"), links[service.id]+"\\evil", links[service.id]+"\u0000"]) {
      expect(normalizeChatInviteUrl(service.id, invalid)).toBeNull();
    }
    expect(normalizeChatInviteUrl(service.id, " ")).toBe("");
  }
  expect(normalizeChatInviteUrl("discord", "https://discord.gg.evil.example/room")).toBeNull();
  expect(normalizeChatInviteUrl("discord", "https://discord.gg:8443/room")).toBeNull();
  expect(normalizeChatInviteUrl("discord", "https://discord.com/invite/room")).toBe("https://discord.com/invite/room");
  expect(normalizeChatInviteUrl("line", "https://line.me/R/ti/g/room")).toBe("https://line.me/R/ti/g/room");
  expect(normalizeChatInviteUrl("telegram", "https://t.me/joinchat/room")).toBe("https://t.me/joinchat/room");
  expect(parseClanCommunityLinks({ unknown:"https://example.com" }).ok).toBe(false);
  expect(parseClanCommunityLinks({ discord:[] }).ok).toBe(false);
  expect(parseClanCommunityLinks([]).ok).toBe(false);
  const legacy = { discord_url:links.discord, kakao_url:links.kakao };
  expect(readClanCommunityLinks({}, legacy).discord).toBe(links.discord);
  expect(readClanCommunityLinks({ discord:"", kakao:"javascript:alert(1)" }, legacy).discord).toBe("");
  expect(readClanCommunityLinks({ discord:"", kakao:"javascript:alert(1)" }, legacy).kakao).toBe("");
});

test("leaders manage chat links and active members open dashboard icons", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const fixture = await createIsolatedBalanceFixture(4);
  const { service:svc, clanId } = fixture;
  const base = `/games/overwatch/clan/${clanId}`;
  try {
    expect((await svc.from("clans").update({ subscription_tier:"free", discord_url:links.discord, kakao_url:links.kakao }).eq("id",clanId)).error).toBeNull();
    expect((await svc.from("clan_members").update({ role:"officer" }).eq("clan_id",clanId).eq("user_id",fixture.users[1].id)).error).toBeNull();
    expect((await svc.from("clan_members").delete().eq("clan_id",clanId).eq("user_id",fixture.users[3].id)).error).toBeNull();
    const { data:original } = await svc.from("clan_settings").select("event_notify").eq("clan_id",clanId).single();
    await loginIsolatedBalanceUser(page,fixture.users[0]);
    await page.goto(base+"/manage?tab=notifications");
    const form = page.getByRole("region",{ name:"클랜 채팅방",exact:true });
    await expect(form.getByLabel("Discord",{ exact:true })).toHaveValue(links.discord);
    await expect(form.getByLabel("카카오톡 오픈채팅",{ exact:true })).toHaveValue(links.kakao);
    for (const { id,label } of CHAT_SERVICES) await form.getByLabel(label,{ exact:true }).fill(links[id]);
    await form.getByLabel("카카오톡 오픈채팅",{ exact:true }).fill("https://discord.gg/wrong-service");
    await form.getByRole("button",{ name:"링크 저장",exact:true }).click();
    await expect(form.getByRole("alert")).toContainText("카카오톡");
    expect((await svc.from("clan_settings").select("community_links").eq("clan_id",clanId).single()).data?.community_links).toEqual({});
    await form.getByLabel("카카오톡 오픈채팅",{ exact:true }).fill(links.kakao);
    await form.getByRole("button",{ name:"링크 저장",exact:true }).click();
    await expect.poll(async () => (await svc.from("clan_settings").select("community_links").eq("clan_id",clanId).single()).data?.community_links).toEqual(links);
    expect((await svc.from("clan_settings").select("event_notify").eq("clan_id",clanId).single()).data?.event_notify).toEqual(original?.event_notify);
    await page.reload();
    for (const { id,label } of CHAT_SERVICES) await expect(form.getByLabel(label,{ exact:true })).toHaveValue(links[id]);
    await page.setViewportSize({ width:1280,height:1000 });
    await page.screenshot({ path:test.info().outputPath("community-link-settings.png") });

    await page.goto(base);
    const chats = page.getByRole("navigation",{ name:"클랜 채팅방",exact:true });
    await expect(chats.getByRole("link")).toHaveCount(6);
    for (const { id,label } of CHAT_SERVICES) {
      const invite = chats.getByRole("link",{ name:`${label} 열기`,exact:true });
      await expect(invite).toHaveAttribute("href",links[id]);
      await expect(invite).toHaveAttribute("target","_blank");
      await expect(invite).toHaveAttribute("rel","noopener noreferrer");
    }
    for (const width of [1280,900,698,390,320]) {
      await page.setViewportSize({ width,height:900 });
      await expect(chats).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const hero = (await page.getByRole("region",{ name:"클랜 소개",exact:true }).boundingBox())!;
      const icons = (await chats.boundingBox())!;
      expect(icons.x).toBeGreaterThanOrEqual(hero.x);
      expect(icons.x+icons.width).toBeLessThanOrEqual(hero.x+hero.width);
      expect(icons.y+icons.height).toBeLessThanOrEqual(hero.y+hero.height);
      if (width===1280 || width===320) await page.screenshot({ path:test.info().outputPath(`community-links-${width}.png`) });
    }

    for (const userIndex of [2,1]) {
      const otherContext = await browser.newContext();
      try {
        const other = await otherContext.newPage();
        await loginIsolatedBalanceUser(other,fixture.users[userIndex]);
        await other.goto(base);
        await expect(other.getByRole("navigation",{ name:"클랜 채팅방",exact:true }).getByRole("link")).toHaveCount(6);
        await other.goto(base+"/manage?tab=notifications");
        if (userIndex===2) {
          await expect(other.getByText("접근 권한이 없습니다",{ exact:false })).toBeVisible();
          await expect(other.getByRole("button",{ name:"링크 저장",exact:true })).toHaveCount(0);
        }
        else {
          const readOnly = other.getByRole("region",{ name:"클랜 채팅방",exact:true });
          await expect(readOnly.getByLabel("Discord",{ exact:true })).toHaveJSProperty("readOnly",true);
          await expect(readOnly.getByRole("button",{ name:"링크 저장",exact:true })).toHaveCount(0);
        }
      } finally { await otherContext.close(); }
    }

    for (const userIndex of [1,2,3]) {
      const client = await fixture.memberClient(userIndex);
      const read = await client.from("clan_settings").select("community_links").eq("clan_id",clanId);
      expect(read.error).toBeNull();
      expect(read.data).toHaveLength(userIndex===3 ? 0:1);
      const write = await client.from("clan_settings").update({ community_links:{} }).eq("clan_id",clanId).select("clan_id");
      expect(write.data ?? []).toHaveLength(0);
    }
    const leader = await fixture.memberClient(0);
    expect((await leader.from("clan_settings").update({ community_links:[] }).eq("clan_id",clanId)).error?.code).toBe("23514");
    expect((await leader.from("clan_settings").update({ community_links:{ unknown:"https://example.com" } }).eq("clan_id",clanId)).error?.code).toBe("23514");
    await page.setViewportSize({ width:1280,height:900 });
    await page.goto(base+"/manage?tab=notifications");
    await form.getByLabel("Discord",{ exact:true }).fill("");
    await form.getByRole("button",{ name:"링크 저장",exact:true }).click();
    await expect.poll(async () => (await svc.from("clan_settings").select("community_links").eq("clan_id",clanId).single()).data?.community_links).toEqual({ ...links,discord:"" });
    await page.goto(base);
    await expect(chats.getByRole("link")).toHaveCount(5);
    await expect(chats.getByRole("link",{ name:"Discord 열기",exact:true })).toHaveCount(0);
    await page.goto(base+"/manage?tab=notifications");
    for (const { label } of CHAT_SERVICES) await form.getByLabel(label,{ exact:true }).fill("");
    await form.getByRole("button",{ name:"링크 저장",exact:true }).click();
    await expect.poll(async () => (await svc.from("clan_settings").select("community_links").eq("clan_id",clanId).single()).data?.community_links).toEqual(Object.fromEntries(CHAT_SERVICES.map(({id})=>[id,""])));
    await page.goto(base);
    await expect(chats).toHaveCount(0);
  } finally { await fixture.cleanup(); }
});
