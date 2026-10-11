import type { Json } from "@/lib/supabase/database.types";

export const DISCORD_NOTIFICATION_TYPES = [
  { id: "regular", label: "정규 내전", description: "시작 10분 전, 내전 입장 링크를 보냅니다." },
  { id: "flash", label: "깜짝 내전", description: "시작 10분 전 알림 · 바로 시작하는 내전은 즉시 알림" },
  { id: "calendar", label: "캘린더 일정", description: "일정 등록·편집창에서 선택한 시점에 알립니다." },
  { id: "announcements", label: "새 공지", description: "새 공지를 게시하면 알립니다. 수정·고정은 다시 알리지 않습니다." },
  { id: "polls", label: "투표", description: "투표 시작과 종료를 알립니다." },
] as const;
export type DiscordNotificationType = (typeof DISCORD_NOTIFICATION_TYPES)[number]["id"];
export type DiscordNotificationRoute = { enabled: boolean; channel_id: string; created: boolean; ended: boolean };
export type DiscordNotificationRoutes = Record<DiscordNotificationType, DiscordNotificationRoute>;

export function readDiscordNotificationRoutes(raw: Json | undefined | null): DiscordNotificationRoutes {
  const config = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const routes = config.discord_routes && typeof config.discord_routes === "object" && !Array.isArray(config.discord_routes) ? config.discord_routes : {};
  return Object.fromEntries(DISCORD_NOTIFICATION_TYPES.map(({ id }) => {
    const value = routes[id];
    const route = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return [id, { enabled: route.enabled !== false, channel_id: typeof route.channel_id === "string" ? route.channel_id : "", created: route.created !== false, ended: route.ended !== false }];
  })) as DiscordNotificationRoutes;
}

export function discordDestination(raw: Json | null | undefined, category: DiscordNotificationType, fallback: string | null, stage?: "created" | "ended") {
  const config = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const route = readDiscordNotificationRoutes(raw)[category];
  if (config.discord_transport !== "bot" || config.discord_enabled !== true || !route.enabled || stage && !route[stage]) return null;
  return route.channel_id || fallback;
}
