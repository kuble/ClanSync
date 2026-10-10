import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { discordBotConfigured } from "@/lib/notifications/discord-bot";
import { discordConnectionLeader } from "@/lib/notifications/discord-connection";

export async function GET(request: Request) {
  const clanId = new URL(request.url).searchParams.get("clanId") ?? "";
  const actor = await discordConnectionLeader(clanId);
  if (!actor) return NextResponse.json({ error: "Premium 클랜장만 봇을 연결할 수 있습니다." }, { status: 403 });
  if (!discordBotConfigured()) return NextResponse.json({ error: "공용 Discord 봇 등록을 준비 중입니다." }, { status: 503 });
  const state = randomUUID();
  const target = new URL("https://discord.com/oauth2/authorize");
  target.search = new URLSearchParams({ client_id: process.env.DISCORD_CLIENT_ID!, scope: "bot guilds", response_type: "code",
    redirect_uri: process.env.DISCORD_REDIRECT_URI!, permissions: "3072", state, integration_type: "0" }).toString();
  const response = NextResponse.redirect(target);
  response.cookies.set("clansync-discord-state", JSON.stringify({ state, clanId, actorId: actor.user.id, gameSlug: actor.gameSlug }),
    { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/api/discord", maxAge: 600 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
