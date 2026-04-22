import type { Json } from "@/lib/supabase/database.types";

export function readClanEventNotifySettings(raw: Json | null | undefined): {
  discord_enabled: boolean;
  discord_webhook_url: string;
} {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { discord_enabled: false, discord_webhook_url: "" };
  }
  const o = raw as Record<string, unknown>;
  const discord_enabled = o.discord_enabled === true;
  const url =
    typeof o.discord_webhook_url === "string" ? o.discord_webhook_url : "";
  return { discord_enabled, discord_webhook_url: url };
}
