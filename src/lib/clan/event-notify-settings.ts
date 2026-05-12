import type { Json } from "@/lib/supabase/database.types";

/** clan_settings.event_notify JSON — Discord 발송 가능, 카카오는 옵트인 의사만(발송 미구현 시 기본 OFF 유지). */
export type ClanEventNotifySettings = {
  discord_enabled: boolean;
  discord_webhook_url: string;
  /** 카카오 알림톡 수신 의사 저장용. 번호 검증·실 발송 파이프는 Phase 2+ (D-EVENTS-03). */
  kakao_notifications_opt_in: boolean;
};

export function readClanEventNotifySettings(
  raw: Json | null | undefined,
): ClanEventNotifySettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      discord_enabled: false,
      discord_webhook_url: "",
      kakao_notifications_opt_in: false,
    };
  }
  const o = raw as Record<string, unknown>;
  const discord_enabled = o.discord_enabled === true;
  const url =
    typeof o.discord_webhook_url === "string" ? o.discord_webhook_url : "";
  const kakao_notifications_opt_in = o.kakao_notifications_opt_in === true;
  return { discord_enabled, discord_webhook_url: url, kakao_notifications_opt_in };
}

/** 업데이트 병합 — 알 수 없는 키는 유지 후 Discord·카카오 필드 반영 */
export function mergeEventNotifyPayload(
  existing: Json | null | undefined,
  next: ClanEventNotifySettings,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  base.discord_enabled = next.discord_enabled;
  base.discord_webhook_url = next.discord_webhook_url;
  base.kakao_notifications_opt_in = next.kakao_notifications_opt_in;
  return base;
}
