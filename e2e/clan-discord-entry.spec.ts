import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { createDiscordGuildInvite, DISCORD_CONNECT_PERMISSIONS, DISCORD_SEND_PERMISSIONS } from "../src/lib/notifications/discord-bot";
import { resolveClanDiscordEntry } from "../src/lib/clan/resolve-clan-discord-entry";
import { loadTestEnv } from "../scripts/test-env.mjs";
import type { Database } from "../src/lib/supabase/database.types";

const guild = "123456789012345678", channel = "234567890123456789", bot = "345678901234567890";
const manual = "https://discord.gg/ManualClanQA";

test("bot creates reusable invites only inside the connected guild and checks invite permissions", async () => {
  const original = globalThis.fetch, token = process.env.DISCORD_BOT_TOKEN;
  const calls: { path: string; init?: RequestInit }[] = [];
  let wrongGuild = false, badCode = false, fail = false, allowed = true;
  try {
    process.env.DISCORD_BOT_TOKEN = "isolated-test-token";
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      expect(url.origin).toBe("https://discord.com");
      expect(init?.redirect).toBe("error");
      expect(init?.cache).toBe("no-store");
      calls.push({ path: url.pathname, init });
      if (url.pathname.endsWith("/invites")) return fail ? new Response("private-payload", { status: 429 }) : Response.json({ code: badCode ? "//evil.example" : "Reusable-QA", guild: { id: guild }, channel: { id: channel } });
      if (url.pathname.endsWith("/users/@me")) return Response.json({ id: bot });
      if (url.pathname.endsWith(`/members/${bot}`)) return Response.json({ roles: [] });
      if (url.pathname.endsWith(`/guilds/${guild}`)) return Response.json({ name: "QA server", roles: [{ id: guild, permissions: "19456" }] });
      const text = { id: channel, guild_id: wrongGuild ? bot : guild, type: 0, name: "welcome", permission_overwrites: [{ id: guild, type: 0, allow: allowed ? "1" : "0", deny: "0" }] };
      return Response.json(url.pathname.endsWith("/channels") ? [{ ...text, id: bot, type: 2 }, text] : text);
    };
    expect(await createDiscordGuildInvite(guild, channel)).toBe("https://discord.gg/Reusable-QA");
    expect(calls.map(call => call.path)).toEqual([`/api/v10/channels/${channel}`, `/api/v10/channels/${channel}/invites`]);
    expect(calls[1].init?.headers).toMatchObject({ Authorization: "Bot isolated-test-token" });
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ max_age: 86400, max_uses: 0, temporary: false, unique: false });
    expect(DISCORD_CONNECT_PERMISSIONS).toBe(BigInt(19457));
    expect(DISCORD_SEND_PERMISSIONS).toBe(BigInt(19456));
    wrongGuild = true;
    await expect(createDiscordGuildInvite(guild, channel)).rejects.toThrow("Invalid Discord destination");
    wrongGuild = false;
    badCode = true;
    await expect(createDiscordGuildInvite(guild, channel)).rejects.toThrow("Invalid Discord invite");
    badCode = false;
    fail = true;
    await expect(createDiscordGuildInvite(guild, channel)).rejects.toThrow("Discord HTTP 429");
    fail = false;
    expect(await createDiscordGuildInvite(guild, null)).toBe("https://discord.gg/Reusable-QA");
    allowed = false;
    const before = calls.filter(call => call.path.endsWith("/invites")).length;
    await expect(createDiscordGuildInvite(guild, null)).rejects.toThrow("Discord invite permission required");
    expect(calls.filter(call => call.path.endsWith("/invites"))).toHaveLength(before);
    await expect(createDiscordGuildInvite("https://evil.example", channel)).rejects.toThrow("Invalid Discord destination");
  } finally {
    globalThis.fetch = original;
    if (token === undefined) delete process.env.DISCORD_BOT_TOKEN; else process.env.DISCORD_BOT_TOKEN = token;
  }
});

test("connected clan members use automatic entry; disconnected clans keep their manual link", async ({ page }) => {
  test.setTimeout(120_000);
  const fixture = await createIsolatedBalanceFixture(3);
  const { service: svc, clanId } = fixture;
  const base = `/games/overwatch/clan/${clanId}`;
  const original = globalThis.fetch, token = process.env.DISCORD_BOT_TOKEN;
  let discordCalls = 0, failDiscord = false;
  try {
    expect((await svc.from("clans").update({ subscription_tier: "free" }).eq("id", clanId)).error).toBeNull();
    expect((await svc.from("clan_settings").update({ community_links: { discord: manual } }).eq("clan_id", clanId)).error).toBeNull();
    expect((await svc.from("clan_discord_connections").insert({ clan_id: clanId, guild_id: guild, guild_name: "QA Discord", channel_id: channel, channel_name: "welcome" })).error).toBeNull();
    process.env.DISCORD_BOT_TOKEN = "isolated-test-token";
    globalThis.fetch = async (input, init) => {
      if (!String(input).startsWith("https://discord.com/api/v10/")) return original(input, init);
      discordCalls++;
      if (failDiscord) return new Response("private-bot-error", { status: 403 });
      if (String(input).endsWith("/invites")) return Response.json({ code: "AutoClanQA", guild: { id: guild }, channel: { id: channel } });
      return Response.json({ id: channel, guild_id: guild, type: 0 });
    };
    const member = await fixture.memberClient(1);
    expect(await resolveClanDiscordEntry(member, "overwatch", clanId)).toEqual({ ok: true, href: "https://discord.gg/AutoClanQA" });
    const beforeDenied = discordCalls;
    expect(await resolveClanDiscordEntry(member, "valorant", clanId)).toEqual({ ok: false, reason: "forbidden" });
    const env = loadTestEnv();
    const anon = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    expect(await resolveClanDiscordEntry(anon, "overwatch", clanId)).toEqual({ ok: false, reason: "forbidden" });
    expect((await svc.from("clan_members").update({ status: "left" }).eq("clan_id", clanId).eq("user_id", fixture.users[2].id)).error).toBeNull();
    expect(await resolveClanDiscordEntry(await fixture.memberClient(2), "overwatch", clanId)).toEqual({ ok: false, reason: "forbidden" });
    expect(discordCalls).toBe(beforeDenied);
    failDiscord = true;
    expect(await resolveClanDiscordEntry(member, "overwatch", clanId)).toEqual({ ok: false, reason: "unavailable" });
    failDiscord = false;

    await loginIsolatedBalanceUser(page, fixture.users[0]);
    await page.goto(base);
    await expect(page.getByRole("navigation", { name: "클랜 채팅방", exact: true }).getByRole("link", { name: "Discord 열기", exact: true })).toHaveAttribute("href", `${base}/discord`);
    await page.goto(base + "/manage?tab=notifications");
    const form = page.getByRole("region", { name: "클랜 채팅방", exact: true });
    await expect(form.getByText("봇 연결됨 · 자동 입장")).toBeVisible();
    await expect(form.getByLabel("Discord", { exact: true })).toHaveCount(0);
    await form.getByLabel("Telegram", { exact: true }).fill("https://t.me/+OtherChatQA");
    await form.getByRole("button", { name: "링크 저장", exact: true }).click();
    await expect.poll(async () => (await svc.from("clan_settings").select("community_links").eq("clan_id", clanId).single()).data?.community_links).toMatchObject({ discord: manual, telegram: "https://t.me/+OtherChatQA" });
    await page.screenshot({ path: test.info().outputPath("discord-auto-entry-settings.png") });
    // The app server has no live bot token, so errors must stay inside the themed UI.
    await page.goto(base + "/discord");
    await expect(page.getByRole("heading", { name: "Discord에 연결할 수 없어요" })).toBeVisible();
    await expect(page.getByRole("link", { name: "다시 시도", exact: true })).toHaveAttribute("href", base + "/discord");
    await expect(page.getByText("private-bot-error")).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("discord-entry-retry.png") });

    expect((await svc.from("clan_discord_connections").delete().eq("clan_id", clanId)).error).toBeNull();
    const beforeManual = discordCalls;
    expect(await resolveClanDiscordEntry(member, "overwatch", clanId)).toEqual({ ok: true, href: manual });
    expect(discordCalls).toBe(beforeManual);
    await page.goto(base);
    await expect(page.getByRole("navigation", { name: "클랜 채팅방", exact: true }).getByRole("link", { name: "Discord 열기", exact: true })).toHaveAttribute("href", manual);
    await page.goto(base + "/manage?tab=notifications");
    await expect(form.getByLabel("Discord", { exact: true })).toHaveValue(manual);
    expect((await svc.from("clan_settings").update({ community_links: { discord: "javascript:alert(1)" } }).eq("clan_id", clanId)).error).toBeNull();
    expect(await resolveClanDiscordEntry(member, "overwatch", clanId)).toEqual({ ok: false, reason: "no-link" });
  } finally {
    globalThis.fetch = original;
    if (token === undefined) delete process.env.DISCORD_BOT_TOKEN; else process.env.DISCORD_BOT_TOKEN = token;
    await fixture.cleanup();
  }
});
