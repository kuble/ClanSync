"use server";

import { revalidatePath } from "next/cache";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { readClanEventNotifySettings } from "@/lib/clan/event-notify-settings";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";

export type CreateClanEventResult =
  | { ok: true }
  | { ok: false; error: string };

/** D-EVENTS-01: 수동 등록은 내전·이벤트만 (스크림은 확정 시 자동). */
const MANUAL_CREATE_KINDS = new Set<
  Database["public"]["Enums"]["clan_event_kind"]
>(["intra", "event"]);

function pgTimeFromDate(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

type ParsedRepeatFields = {
  repeat: Database["public"]["Enums"]["clan_event_repeat"];
  repeat_weekdays: number[] | null;
  repeat_time: string | null;
};

function parseRepeatRule(
  formData: FormData,
  startAt: Date,
): ParsedRepeatFields | { error: string } {
  const raw = String(formData.get("repeat") ?? "none").trim();
  if (raw !== "none" && raw !== "weekly" && raw !== "monthly") {
    return { error: "반복 설정이 올바르지 않습니다." };
  }

  const pgTime = pgTimeFromDate(startAt);

  if (raw === "none") {
    return { repeat: "none", repeat_weekdays: null, repeat_time: null };
  }

  if (raw === "weekly") {
    const vals = formData.getAll("repeat_weekday");
    const set = new Set<number>();
    for (const v of vals) {
      const n = parseInt(String(v), 10);
      if (n >= 1 && n <= 7) set.add(n);
    }
    const repeat_weekdays = [...set].sort((a, b) => a - b);
    if (repeat_weekdays.length === 0) {
      return {
        error: "매주 반복일 때 요일을 하나 이상 선택해 주세요.",
      };
    }
    return {
      repeat: "weekly",
      repeat_weekdays,
      repeat_time: pgTime,
    };
  }

  return {
    repeat: "monthly",
    repeat_weekdays: null,
    repeat_time: pgTime,
  };
}

function kindLabelKo(kind: Database["public"]["Enums"]["clan_event_kind"]): string {
  if (kind === "intra") return "내전";
  if (kind === "scrim") return "스크림";
  return "이벤트";
}

async function notifyDiscordNewEvent(opts: {
  svc: ReturnType<typeof createServiceRoleClient>;
  clanId: string;
  gameSlug: string;
  title: string;
  kind: Database["public"]["Enums"]["clan_event_kind"];
  startAt: Date;
  place: string | null;
}): Promise<void> {
  const { data: s } = await opts.svc
    .from("clan_settings")
    .select("event_notify")
    .eq("clan_id", opts.clanId)
    .maybeSingle();

  const n = readClanEventNotifySettings(s?.event_notify as Json | null);
  if (!n.discord_enabled || n.discord_webhook_url.length === 0) return;

  const when = opts.startAt.toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const path = `/games/${opts.gameSlug}/clan/${opts.clanId}/events`;
  const link = base ? `${base.replace(/\/$/, "")}${path}` : path;

  const lines = [
    "📅 **클랜 일정 등록**",
    `**${opts.title}**`,
    `유형: ${kindLabelKo(opts.kind)}`,
    `시작: ${when}`,
    opts.place ? `메모: ${opts.place}` : null,
    `열기: ${link}`,
  ].filter(Boolean);

  try {
    const res = await fetch(n.discord_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: lines.join("\n") }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.warn("Discord webhook non-OK", res.status);
    }
  } catch {
    /* 웹훅 실패는 일정 등록 성공과 분리 */
  }
}

export async function createClanEventAction(
  gameSlug: string,
  clanId: string,
  formData: FormData,
): Promise<CreateClanEventResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const allowed = await hasClanPermission(
    supabase,
    user.id,
    clanId,
    "manage_clan_events",
  );
  if (!allowed) return { ok: false, error: "일정을 등록할 권한이 없습니다." };

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 1 || title.length > 120) {
    return { ok: false, error: "제목은 1~120자입니다." };
  }

  const kindRaw = String(formData.get("kind") ?? "event");
  const kind = MANUAL_CREATE_KINDS.has(
    kindRaw as Database["public"]["Enums"]["clan_event_kind"],
  )
    ? (kindRaw as Database["public"]["Enums"]["clan_event_kind"])
    : "event";

  const startIso = String(formData.get("start_at") ?? "").trim();
  if (!startIso) return { ok: false, error: "시작 시각을 입력해 주세요." };
  const startAt = new Date(startIso);
  if (Number.isNaN(startAt.getTime())) {
    return { ok: false, error: "시작 시각이 올바르지 않습니다." };
  }

  const placeRaw = String(formData.get("place") ?? "").trim();
  const place = placeRaw ? placeRaw.slice(0, 500) : null;

  const parsedRepeat = parseRepeatRule(formData, startAt);
  if ("error" in parsedRepeat) return { ok: false, error: parsedRepeat.error };

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

  const { error } = await svc.from("clan_events").insert({
    clan_id: clanId,
    title,
    kind,
    start_at: startAt.toISOString(),
    place,
    source: "manual",
    created_by: user.id,
    repeat: parsedRepeat.repeat,
    repeat_weekdays: parsedRepeat.repeat_weekdays,
    repeat_time: parsedRepeat.repeat_time,
  });

  if (error) return { ok: false, error: error.message };

  void notifyDiscordNewEvent({
    svc,
    clanId,
    gameSlug,
    title,
    kind,
    startAt,
    place,
  });

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/events`);
  return { ok: true };
}

export async function updateClanEventAction(
  gameSlug: string,
  clanId: string,
  formData: FormData,
): Promise<CreateClanEventResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const allowed = await hasClanPermission(
    supabase,
    user.id,
    clanId,
    "manage_clan_events",
  );
  if (!allowed) return { ok: false, error: "일정을 수정할 권한이 없습니다." };

  const eventId = String(formData.get("event_id") ?? "").trim();
  if (!eventId) return { ok: false, error: "일정을 찾을 수 없습니다." };

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 1 || title.length > 120) {
    return { ok: false, error: "제목은 1~120자입니다." };
  }

  const kindRaw = String(formData.get("kind") ?? "event");
  const kind = MANUAL_CREATE_KINDS.has(
    kindRaw as Database["public"]["Enums"]["clan_event_kind"],
  )
    ? (kindRaw as Database["public"]["Enums"]["clan_event_kind"])
    : "event";

  const local = String(formData.get("start_at_local") ?? "");
  let startIso = String(formData.get("start_at") ?? "").trim();
  if (local) {
    const d = new Date(local);
    if (!Number.isNaN(d.getTime())) startIso = d.toISOString();
  }
  if (!startIso) return { ok: false, error: "시작 시각을 입력해 주세요." };
  const startAt = new Date(startIso);
  if (Number.isNaN(startAt.getTime())) {
    return { ok: false, error: "시작 시각이 올바르지 않습니다." };
  }

  const placeRaw = String(formData.get("place") ?? "").trim();
  const place = placeRaw ? placeRaw.slice(0, 500) : null;

  const parsedRepeat = parseRepeatRule(formData, startAt);
  if ("error" in parsedRepeat) return { ok: false, error: parsedRepeat.error };

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

  const { data: ev, error: selErr } = await svc
    .from("clan_events")
    .select("id, clan_id, source, cancelled_at")
    .eq("id", eventId)
    .maybeSingle();

  if (selErr || !ev || ev.clan_id !== clanId) {
    return { ok: false, error: "일정을 찾을 수 없습니다." };
  }
  if (ev.source !== "manual") {
    return { ok: false, error: "자동 생성 일정은 여기서 수정할 수 없습니다." };
  }
  if (ev.cancelled_at != null) {
    return { ok: false, error: "이미 취소된 일정입니다." };
  }

  const { error } = await svc
    .from("clan_events")
    .update({
      title,
      kind,
      start_at: startAt.toISOString(),
      place,
      repeat: parsedRepeat.repeat,
      repeat_weekdays: parsedRepeat.repeat_weekdays,
      repeat_time: parsedRepeat.repeat_time,
    })
    .eq("id", eventId)
    .eq("clan_id", clanId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/events`);
  return { ok: true };
}

export async function cancelClanEventAction(
  gameSlug: string,
  clanId: string,
  eventId: string,
): Promise<CreateClanEventResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const allowed = await hasClanPermission(
    supabase,
    user.id,
    clanId,
    "manage_clan_events",
  );
  if (!allowed) return { ok: false, error: "일정을 취소할 권한이 없습니다." };

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

  const { data: ev } = await svc
    .from("clan_events")
    .select("id, clan_id, source, cancelled_at")
    .eq("id", eventId)
    .maybeSingle();

  if (!ev || ev.clan_id !== clanId) {
    return { ok: false, error: "일정을 찾을 수 없습니다." };
  }
  if (ev.source !== "manual") {
    return { ok: false, error: "자동 생성 일정은 여기서 취소할 수 없습니다." };
  }
  if (ev.cancelled_at != null) {
    return { ok: false, error: "이미 취소된 일정입니다." };
  }

  const { error } = await svc
    .from("clan_events")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("clan_id", clanId)
    .is("cancelled_at", null);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/events`);
  return { ok: true };
}
