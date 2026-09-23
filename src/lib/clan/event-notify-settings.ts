import type { Json } from "@/lib/supabase/database.types";

export function readClanEventNotifySettings(raw: Json | null | undefined) {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    discord_enabled: o.discord_enabled === true,
    discord_configured: o.discord_configured === true,
    kakao_notifications_opt_in: o.kakao_notifications_opt_in === true,
  };
}
