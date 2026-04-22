"use server";

import { revalidatePath } from "next/cache";
import { readClanEventNotifySettings } from "@/lib/clan/event-notify-settings";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type UpdateClanEventNotifyResult =
  | { ok: true }
  | { ok: false; error: string };

const DISCORD_WEBHOOK_PREFIX = "https://discord.com/api/webhooks/";

export async function updateClanEventNotifyAction(
  gameSlug: string,
  clanId: string,
  formData: FormData,
): Promise<UpdateClanEventNotifyResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: meRows } = await supabase.rpc("select_my_clan_membership", {
    p_clan_id: clanId,
  });
  const me = meRows?.[0];
  if (me?.status !== "active" || me.role !== "leader") {
    return { ok: false, error: "알림 설정은 클랜장만 저장할 수 있습니다." };
  }

  const discordEnabled = formData.get("discord_enabled") === "on";
  const webhookRaw = String(formData.get("discord_webhook_url") ?? "").trim();

  const svc = createServiceRoleClient();
  const { data: clanRow } = await svc
    .from("clans")
    .select("id, games!inner(slug)")
    .eq("id", clanId)
    .maybeSingle();
  const g = clanRow?.games as unknown as { slug: string } | undefined;
  if (!clanRow || g?.slug !== gameSlug) {
    return { ok: false, error: "클랜을 찾을 수 없습니다." };
  }

  const { data: existing } = await svc
    .from("clan_settings")
    .select("event_notify")
    .eq("clan_id", clanId)
    .maybeSingle();

  const prev = readClanEventNotifySettings(existing?.event_notify as Json | null);

  let webhookUrl = "";
  if (discordEnabled) {
    webhookUrl = webhookRaw.length > 0 ? webhookRaw : prev.discord_webhook_url;
    if (webhookUrl.length === 0) {
      return {
        ok: false,
        error: "Discord 알림을 켜려면 웹훅 URL을 입력해 주세요.",
      };
    }
    if (!webhookUrl.startsWith(DISCORD_WEBHOOK_PREFIX)) {
      return {
        ok: false,
        error: `웹훅 URL은 ${DISCORD_WEBHOOK_PREFIX} 로 시작해야 합니다.`,
      };
    }
  }

  const nextPayload = {
    discord_enabled: discordEnabled,
    discord_webhook_url: discordEnabled ? webhookUrl : "",
  };

  const { error } = await svc
    .from("clan_settings")
    .update({
      event_notify: nextPayload as unknown as Json,
      updated_by: user.id,
    })
    .eq("clan_id", clanId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/events`);
  return { ok: true };
}
