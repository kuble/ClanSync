"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { discordConnectionLeader } from "@/lib/notifications/discord-connection";
import { discordBotConfigured, leaveDiscordGuild, listDiscordBotChannels } from "@/lib/notifications/discord-bot";
import { DISCORD_NOTIFICATION_TYPES, type DiscordNotificationRoutes } from "@/lib/clan/discord-notification-settings";

export async function disconnectClanDiscordAction(gameSlug: string, clanId: string, guildId: string) {
  const actor = await discordConnectionLeader(clanId, { requirePremium: false });
  if (!actor || actor.gameSlug !== gameSlug) return { error: "클랜장만 Discord 연결을 해제할 수 있습니다." };
  const started = performance.now();
  const { data: lastConnection, error } = await actor.svc.rpc("disconnect_clan_discord_and_check_departure", {
    p_clan_id: clanId, p_actor_id: actor.user.id, p_guild_id: guildId,
  });
  if (error) return { error: "연결을 해제하지 못했습니다. 현재 연결된 서버를 확인한 뒤 다시 시도해 주세요." };
  let result = "disconnected";
  if (lastConnection) {
    result = "departure-unconfirmed";
    // The database reserves the guild for 30s. Leave room for Discord's 8s timeout.
    if (performance.now() - started < 20_000) {
      try {
        await leaveDiscordGuild(guildId);
        result = "bot-left";
      } catch { /* The clan is already disconnected; offer manual removal. */ }
    }
  }
  const path = `/games/${gameSlug}/clan/${clanId}`;
  revalidatePath(path, "layout");
  redirect(`${path}/manage?tab=notifications&discord=${result}`, RedirectType.replace);
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
  const routes = Object.fromEntries(DISCORD_NOTIFICATION_TYPES.map(({ id }) => [id, {
    enabled: formData.get(`discord_${id}_enabled`) === "on",
    channel_id: String(formData.get(`discord_${id}_channel`) ?? "").trim(),
    created: id !== "polls" || formData.get("discord_polls_created") === "on",
    ended: id !== "polls" || formData.get("discord_polls_ended") === "on",
  }])) as DiscordNotificationRoutes;
  const { data: connection } = await actor.svc.from("clan_discord_connections").select("guild_id,channel_id,channel_name").eq("clan_id", clanId).maybeSingle();
  // The browser supplies an ID, never a destination URL or trusted channel name.
  if (!connection || connection.guild_id !== formData.get("discord_guild_id")) return { ok: false as const, error: "서버 연결이 변경되었습니다. 새로고침 후 다시 시도해 주세요." };
  let channelId = connection.channel_id ?? "";
  let channelName = connection.channel_name ?? "";
  if (enabled) {
    if (!discordBotConfigured()) return { ok: false as const, error: "공용 봇을 먼저 연결해 주십시오." };
    try {
      const result = await listDiscordBotChannels(connection.guild_id);
      const available = new Map(result.channels.map((entry) => [entry.id, entry]));
      const destinations = Object.values(routes);
      if (destinations.some((route) => route.enabled && !available.has(route.channel_id))) {
        return { ok: false as const, error: "알림을 켠 항목마다 봇이 메시지를 보낼 수 있는 채널을 선택해 주세요." };
      }
      // Keep the stored invite destination where possible. Notifications use the explicit routes.
      const channel = available.get(channelId) ?? destinations.map((route) => available.get(route.channel_id)).find(Boolean);
      if (!channel) return { ok: false as const, error: "봇이 메시지를 보낼 수 있는 채널을 선택해 주십시오." };
      channelId = channel.id;
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
