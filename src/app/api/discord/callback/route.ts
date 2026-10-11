import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeDiscordBotCode, listDiscordBotChannels, verifyDiscordGuildManager } from "@/lib/notifications/discord-bot";
import { discordConnectionLeader } from "@/lib/notifications/discord-connection";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const cookie = (await cookies()).get("clansync-discord-state")?.value;
  let session: { state: string; clanId: string; actorId: string; gameSlug: string } | undefined;
  try { session = cookie ? JSON.parse(cookie) : undefined; } catch { /* Invalid state is rejected below. */ }
  const invalid = () => {
    const response = NextResponse.json({ error: "Discord 연결 요청이 만료되었거나 유효하지 않습니다." }, { status: 400 });
    response.cookies.delete({ name: "clansync-discord-state", path: "/api/discord" });
    return response;
  };
  if (!session || !session.state || session.state !== query.get("state")) return invalid();
  const actor = await discordConnectionLeader(session.clanId);
  if (!actor || actor.user.id !== session.actorId || actor.gameSlug !== session.gameSlug) return invalid();
  let connected = false;
  if (query.get("code") && !query.has("error")) {
    try {
      const token = await exchangeDiscordBotCode(query.get("code")!);
      const guildId = token.guild?.id ?? query.get("guild_id") ?? "";
      if (!await verifyDiscordGuildManager(token.access_token, guildId)) throw new Error("Guild permission denied");
      const guild = await listDiscordBotChannels(guildId);
      const { error } = await actor.svc.rpc("connect_clan_discord_bot", { p_clan_id: session.clanId, p_actor_id: actor.user.id, p_guild_id: guildId, p_guild_name: guild.guildName });
      connected = !error;
    } catch { /* No OAuth token, code or Discord payload is sent to the client or logs. */ }
  }
  const target = new URL(`/games/${actor.gameSlug}/clan/${session.clanId}/manage?tab=notifications`, request.url);
  target.searchParams.set("discord", connected ? "connected" : "failed");
  const response = NextResponse.redirect(target);
  response.cookies.delete({ name: "clansync-discord-state", path: "/api/discord" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
