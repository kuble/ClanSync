"use server";

import { revalidatePath } from "next/cache";
import { discordConnectionLeader } from "@/lib/notifications/discord-connection";
import { discordBotConfigured, listDiscordBotChannels } from "@/lib/notifications/discord-bot";

export async function listClanDiscordChannelsAction(gameSlug: string, clanId: string) {
  const actor = await discordConnectionLeader(clanId);
  if (!actor || actor.gameSlug !== gameSlug) return { ok: false as const, error: "알림 설정은 Premium 클랜의 클랜장만 변경할 수 있습니다." };
  const { data: connection } = await actor.svc.from("clan_discord_connections").select("guild_id,channel_id,channel_name").eq("clan_id", clanId).maybeSingle();
  if (!connection || !discordBotConfigured()) return { ok: false as const, error: "공용 봇을 먼저 연결해 주세요." };
  try {
    const result = await listDiscordBotChannels(connection.guild_id);
    return { ok: true as const, guildId: connection.guild_id, channels: result.channels };
  } catch {
    return { ok: false as const, error: "채널을 불러오지 못했습니다. 서버의 봇 연결과 채널 권한을 확인해 주세요." };
  }
}

export async function updateClanEventNotifyAction(gameSlug: string, clanId: string, formData: FormData) {
  const actor = await discordConnectionLeader(clanId);
  if (!actor || actor.gameSlug !== gameSlug) return { ok: false as const, error: "알림 설정은 Premium 클랜의 클랜장만 변경할 수 있습니다." };
  const enabled = formData.get("discord_enabled") === "on";
  const channelId = String(formData.get("discord_channel_id") ?? "").trim();
  const { data: connection } = await actor.svc.from("clan_discord_connections").select("guild_id,channel_id,channel_name").eq("clan_id", clanId).maybeSingle();
  // The browser supplies an ID, never a destination URL or trusted channel name.
  let channelName = connection?.channel_name ?? "";
  if (enabled || channelId && channelId !== connection?.channel_id) {
    if (!connection || !discordBotConfigured()) return { ok: false as const, error: "공용 봇을 먼저 연결해 주세요." };
    try {
      const result = await listDiscordBotChannels(connection.guild_id);
      const channel = result.channels.find((entry) => entry.id === channelId);
      if (!channel) return { ok: false as const, error: "봇이 메시지를 보낼 수 있는 채널을 선택해 주세요." };
      channelName = channel.name;
    } catch {
      return { ok: false as const, error: "채널 권한을 확인하지 못했습니다. 잠시 후 다시 저장해 주세요." };
    }
  }
  const { error } = await actor.svc.rpc("set_clan_discord_bot_settings", {
    p_actor_id: actor.user.id, p_clan_id: clanId, p_guild_id: connection?.guild_id ?? "",
    p_channel_id: channelId || undefined, p_channel_name: channelName || undefined,
    p_enabled: enabled, p_kakao: formData.get("kakao_notifications_opt_in") === "on",
  });
  if (error) return { ok: false as const, error: "알림 설정을 저장하지 못했습니다. 연결 상태를 확인해 주세요." };
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/events`);
  return { ok: true as const };
}
