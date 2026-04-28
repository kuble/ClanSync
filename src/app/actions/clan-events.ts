"use server";

import { revalidatePath } from "next/cache";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { readClanEventNotifySettings } from "@/lib/clan/event-notify-settings";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  isOccurrenceValidForTemplate,
  type ClanEventRecord,
} from "@/lib/clan/expand-clan-event-occurrences";

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

function clanEventRowToRecord(row: {
  id: string;
  title: string;
  kind: Database["public"]["Enums"]["clan_event_kind"];
  start_at: string;
  place: string | null;
  source: Database["public"]["Enums"]["clan_event_source"];
  repeat: Database["public"]["Enums"]["clan_event_repeat"] | null;
  repeat_weekdays: number[] | null;
  repeat_time: string | null;
}): ClanEventRecord {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind as ClanEventRecord["kind"],
    start_at: row.start_at,
    place: row.place,
    source: row.source as ClanEventRecord["source"],
    repeat: (row.repeat ?? "none") as ClanEventRecord["repeat"],
    repeat_weekdays: row.repeat_weekdays,
    repeat_time: row.repeat_time,
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

export async function toggleClanEventRsvpAction(
  gameSlug: string,
  clanId: string,
  formData: FormData,
): Promise<CreateClanEventResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: memRows } = await supabase.rpc("select_my_clan_membership", {
    p_clan_id: clanId,
  });
  const mem = memRows?.[0];
  if (!mem || mem.status !== "active") {
    return { ok: false, error: "클랜 구성원만 참가할 수 있습니다." };
  }

  const eventId = String(formData.get("event_id") ?? "").trim();
  const rawIdx = String(formData.get("instance_idx") ?? "").trim();
  const instanceIdx = Number(rawIdx);
  if (!eventId || !Number.isFinite(instanceIdx)) {
    return { ok: false, error: "요청이 올바르지 않습니다." };
  }

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

  const { data: row, error: selErr } = await svc
    .from("clan_events")
    .select(
      "id, clan_id, title, kind, start_at, place, source, cancelled_at, repeat, repeat_weekdays, repeat_time",
    )
    .eq("id", eventId)
    .maybeSingle();

  if (selErr || !row || row.clan_id !== clanId) {
    return { ok: false, error: "일정을 찾을 수 없습니다." };
  }
  if (row.cancelled_at != null) {
    return { ok: false, error: "취소된 일정입니다." };
  }
  if (row.kind !== "scrim") {
    return { ok: false, error: "참가 응답은 스크림 일정만 가능합니다." };
  }

  const template = clanEventRowToRecord(row);
  if (!isOccurrenceValidForTemplate(template, instanceIdx)) {
    return { ok: false, error: "선택한 일정 회차가 올바르지 않습니다." };
  }

  const { data: existing } = await svc
    .from("event_rsvps")
    .select("status")
    .eq("event_id", eventId)
    .eq("instance_idx", instanceIdx)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.status === "going") {
    const { error } = await svc
      .from("event_rsvps")
      .delete()
      .eq("event_id", eventId)
      .eq("instance_idx", instanceIdx)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await svc.from("event_rsvps").upsert(
      {
        event_id: eventId,
        instance_idx: instanceIdx,
        user_id: user.id,
        status: "going",
        responded_at: new Date().toISOString(),
      },
      { onConflict: "event_id,instance_idx,user_id" },
    );
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/events`);
  return { ok: true };
}

export async function listClanEventRsvpAttendeesAction(
  gameSlug: string,
  clanId: string,
  eventId: string,
  instanceIdx: number,
): Promise<
  | { ok: true; attendees: { userId: string; nickname: string }[] }
  | { ok: false; error: string }
> {
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
  if (!allowed) return { ok: false, error: "참가 명단은 운영진만 볼 수 있습니다." };

  if (!Number.isFinite(instanceIdx)) {
    return { ok: false, error: "요청이 올바르지 않습니다." };
  }

  const svc = createServiceRoleClient();
  const { data: clanRow } = await svc
    .from("clans")
    .select("id, games!inner(slug)")
    .eq("id", clanId)
    .maybeSingle();

  const cg = clanRow?.games as unknown as { slug: string } | undefined;
  if (!clanRow || cg?.slug !== gameSlug) {
    return { ok: false, error: "클랜을 찾을 수 없습니다." };
  }

  const { data: ev } = await svc
    .from("clan_events")
    .select("id, clan_id, kind")
    .eq("id", eventId)
    .maybeSingle();

  if (!ev || ev.clan_id !== clanId || ev.kind !== "scrim") {
    return { ok: false, error: "일정을 찾을 수 없습니다." };
  }

  const { data: templateRow } = await svc
    .from("clan_events")
    .select(
      "id, title, kind, start_at, place, source, repeat, repeat_weekdays, repeat_time",
    )
    .eq("id", eventId)
    .maybeSingle();

  if (!templateRow) return { ok: false, error: "일정을 찾을 수 없습니다." };

  const template = clanEventRowToRecord(templateRow);
  if (!isOccurrenceValidForTemplate(template, instanceIdx)) {
    return { ok: false, error: "선택한 일정 회차가 올바르지 않습니다." };
  }

  const { data: clanGame } = await svc
    .from("clans")
    .select("game_id")
    .eq("id", clanId)
    .maybeSingle();

  const gameId = clanGame?.game_id as string | undefined;
  if (!gameId) return { ok: false, error: "게임 정보를 찾을 수 없습니다." };

  const { data: rsvpRows } = await svc
    .from("event_rsvps")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("instance_idx", instanceIdx)
    .eq("status", "going");

  const ids = [...new Set((rsvpRows ?? []).map((r) => r.user_id as string))];
  if (ids.length === 0) return { ok: true, attendees: [] };

  const { data: profiles } = await svc
    .from("user_game_profiles")
    .select("user_id, nickname")
    .eq("game_id", gameId)
    .in("user_id", ids);

  const { data: users } = await svc
    .from("users")
    .select("id, nickname")
    .in("id", ids);

  const profileNick = new Map(
    (profiles ?? []).map((p) => [p.user_id as string, p.nickname as string]),
  );
  const userNick = new Map(
    (users ?? []).map((u) => [u.id as string, u.nickname as string]),
  );

  const attendees = ids.map((uid) => ({
    userId: uid,
    nickname: profileNick.get(uid) ?? userNick.get(uid) ?? "알 수 없음",
  }));

  attendees.sort((a, b) => a.nickname.localeCompare(b.nickname, "ko"));

  return { ok: true, attendees };
}
