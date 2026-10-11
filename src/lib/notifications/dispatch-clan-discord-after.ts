import { after } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { dispatchDiscordBotNotifications } from "./dispatch-discord-bot-notifications";

/** Actions drain only this clan; the minute worker handles future reservations. */
export function dispatchClanDiscordAfter(clanId: string) {
  if (!process.env.DISCORD_BOT_TOKEN) return;
  after(async () => {
    try {
      await dispatchDiscordBotNotifications(createServiceRoleClient(), 25, undefined, clanId);
    } catch {
      console.error("Discord notification dispatch deferred to worker");
    }
  });
}
