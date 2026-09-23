"use server";

import { revalidatePath } from "next/cache";
import { isDiscordWebhookUrl } from "@/lib/notifications/discord-webhook";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export type UpdateClanEventNotifyResult =
  | { ok: true }
  | { ok: false; error: string };

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

  if (webhookRaw && !isDiscordWebhookUrl(webhookRaw)) {
    return { ok: false, error: "올바른 Discord 웹훅 URL을 입력해 주세요." };
  }
  const { error } = await supabase.rpc("set_clan_notification_settings", {
    p_clan_id: clanId,
    p_enabled: discordEnabled,
    p_url: webhookRaw || undefined,
    p_kakao: formData.get("kakao_notifications_opt_in") === "on",
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/events`);
  return { ok: true };
}
