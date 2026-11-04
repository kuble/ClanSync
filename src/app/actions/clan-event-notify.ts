"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { discordConnectionLeader } from "@/lib/notifications/discord-connection";
import { discordBotConfigured, listDiscordBotChannels } from "@/lib/notifications/discord-bot";
import { DISCORD_NOTIFICATION_TYPES, type DiscordNotificationRoutes } from "@/lib/clan/discord-notification-settings";

export async function disconnectClanDiscordAction(gameSlug: string, clanId: string, guildId: string) {
  const actor = await discordConnectionLeader(clanId, { requirePremium: false });
  if (!actor || actor.gameSlug !== gameSlug) return { error: "클랜장만 Discord 연결을 해제할 수 있습니다." };
  const { error } = await actor.svc.rpc("disconnect_clan_discord_bot", {
    p_clan_id: clanId, p_actor_id: actor.user.id, p_guild_id: guildId,
  });
  if (error) return { error: "연결을 해제하지 못했습니다. 현재 연결된 서버를 확인한 뒤 다시 시도해 주세요." };
  const path = `/games/${gameSlug}/clan/${clanId}`;
  revalidatePath(path, "layout");
  redirect(`${path}/manage?tab=notifications&discord=disconnected`, RedirectType.replace);
}

export async function listClanDiscordChannelsAction(gameSlug: string, clanId: string) {
  const actor = await discordConnectionLeader(clanId);
  if (!actor || actor.gameSlug !== gameSlug) return { ok: false as const, error: "알림 설정은 Premium 클랜의 클랜장만 변경할 수 있습니다." };
  const { data: connection } = await actor.svc.from("clan_discord_connections").select("guild_id,channel_id,channel_name").eq("clan_id", clanId).maybeSingle();
  if (!connection || !discordBotConfigured()) return { ok: false as const, error: "공용 봇을 먼저 연결해 주십시오." };
  try {
    const result = await listDiscordBotChannels(connection.guild_id);
    return { ok: true as const, guildId: connection.guild_id, channels: result.channels };
  } catch {
    return { ok: false as const, error: "채널을 불러오지 못했습니다. 서버의 봇 연결과 채널 권한을 확인해 주십시오." };
  }
}

export async function updateClanEventNotifyAction(gameSlug: string, clanId: string, formData: FormData) {
  const actor = await discordConnectionLeader(clanId);
  if (!actor || actor.gameSlug !== gameSlug) return { ok: false as const, error: "알림 설정은 Premium 클랜의 클랜장만 변경할 수 있습니다." };
  const enabled = formData.get("discord_enabled") === "on";
  const channelId = String(formData.get("discord_channel_id") ?? "").trim();
  const routes = Object.fromEntries(DISCORD_NOTIFICATION_TYPES.map(({ id }) => [id, {
    enabled: formData.get(`discord_${id}_enabled`) === "on",
    channel_id: String(formData.get(`discord_${id}_channel`) ?? "").trim(),
    created: id !== "polls" || formData.get("discord_polls_created") === "on",
    ended: id !== "polls" || formData.get("discord_polls_ended") === "on",
  }])) as DiscordNotificationRoutes;
  const { data: connection } = await actor.svc.from("clan_discord_connections").select("guild_id,channel_id,channel_name").eq("clan_id", clanId).maybeSingle();
  // The browser supplies an ID, never a destination URL or trusted channel name.
  if (!connection || connection.guild_id !== formData.get("discord_guild_id")) return { ok: false as const, error: "서버 연결이 변경되었습니다. 새로고침 후 다시 시도해 주세요." };
  let channelName = connection.channel_name ?? "";
  if (enabled) {
    if (!discordBotConfigured()) return { ok: false as const, error: "공용 봇을 먼저 연결해 주십시오." };
    try {
      const result = await listDiscordBotChannels(connection.guild_id);
      const channel = result.channels.find((entry) => entry.id === channelId);
      if (!channel) return { ok: false as const, error: "봇이 메시지를 보낼 수 있는 채널을 선택해 주십시오." };
      if (Object.values(routes).some((route) => route.channel_id && !result.channels.some((entry) => entry.id === route.channel_id))) return { ok: false as const, error: "종류별 채널 권한을 확인해 주십시오. 기본 채널 사용으로 변경할 수 있습니다." };
      channelName = channel.name;
    } catch {
      return { ok: false as const, error: "채널 권한을 확인하지 못했습니다. 잠시 후 다시 저장해 주십시오." };
    }
  }
  const { error } = await actor.svc.rpc("set_clan_discord_notification_preferences", {
    p_actor_id: actor.user.id, p_clan_id: clanId, p_guild_id: connection.guild_id,
    p_channel_id: channelId, p_channel_name: channelName,
    p_enabled: enabled,
    p_routes: routes,
  });
  if (error) return { ok: false as const, error: "알림 설정을 저장하지 못했습니다. 연결 상태를 확인해 주십시오." };
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/events`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/manage`);
  return { ok: true as const };
}
