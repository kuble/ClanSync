import type { Json } from "@/lib/supabase/database.types";

export const EVENT_DISCORD_SLOTS = [
  { id: "event_t_minus_24h", label: "하루 전" },
  { id: "event_t_minus_1h", label: "1시간 전" },
  { id: "event_t_minus_10min", label: "10분 전" },
  { id: "event_t_0", label: "시작 시" },
] as const;
export type EventDiscordSettings = { enabled: boolean; announce: boolean; slots: string[] };
export function readEventDiscordSettings(raw: Json | undefined): EventDiscordSettings {
  const settings = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return { enabled: settings.enabled === true, announce: settings.announce === true,
    slots: EVENT_DISCORD_SLOTS.filter(({ id }) => Array.isArray(settings.slots) && settings.slots.includes(id)).map(({ id }) => id) };
}
export function eventDiscordSettingsFromForm(form: FormData): EventDiscordSettings | undefined {
  if (form.get("discord_notify_present") !== "true") return undefined;
  return { enabled: form.get("event_discord_enabled") === "on", announce: form.get("event_discord_announce") === "on",
    slots: EVENT_DISCORD_SLOTS.filter(({ id }) => form.getAll("event_discord_slots").includes(id)).map(({ id }) => id) };
}
