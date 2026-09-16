"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

type RoomResult = { ok: true } | { ok: false; error: string };
type OpenRoomResult =
  | { ok: true; roomId: string; seriesId: string | null }
  | { ok: false; error: string };
type Client = Awaited<ReturnType<typeof createClient>>;

async function roomClient(gameSlug: string, clanId: string): Promise<Client> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  const [{ data: clan }, { data: game }, { data: membership }] = await Promise.all([
    client.from("clans").select("game_id").eq("id", clanId).maybeSingle(),
    client.from("games").select("id").eq("slug", gameSlug).maybeSingle(),
    client.rpc("select_my_clan_membership", { p_clan_id: clanId }),
  ]);
  if (!clan || clan.game_id !== game?.id || membership?.[0]?.status !== "active") {
    throw new Error("현재 활동 중인 클랜에서만 내전을 이용할 수 있습니다.");
  }
  return client;
}

function dateInput(value: string | null | undefined): string | undefined {
  if (value == null || value === "") return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("예약 시각을 확인하세요.");
  return date.toISOString();
}

function failure(error: unknown): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : "내전 방을 변경하지 못했습니다." };
}

function payload(data: Json | null, error: { message: string } | null): Record<string, Json | undefined> {
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data) || data.ok !== true) {
    throw new Error("내전 방을 변경하지 못했습니다.");
  }
  return data;
}

function invalidate(gameSlug: string, clanId: string) {
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/balance`);
}

export async function createBalanceRoomAction(
  gameSlug: string,
  clanId: string,
  input: { kind: "regular" | "flash"; title: string; scheduledAt?: string | null; rsvpDays?: number | null; repeatEveryDays?: number | null },
): Promise<OpenRoomResult> {
  try {
    const client = await roomClient(gameSlug, clanId);
    const { data, error } = await client.rpc("create_balance_room", {
      p_clan_id: clanId,
      p_kind: input.kind,
      p_title: input.title.trim(),
      p_scheduled_at: dateInput(input.scheduledAt),
      p_rsvp_days: input.rsvpDays ?? undefined,
      p_repeat_every_days: input.repeatEveryDays ?? undefined,
    });
    const result = payload(data, error);
    if (typeof result.room_id !== "string") throw new Error("내전 방을 확인하지 못했습니다.");
    invalidate(gameSlug, clanId);
    return { ok: true, roomId: result.room_id, seriesId: typeof result.series_id === "string" ? result.series_id : null };
  } catch (error) { return failure(error); }
}

export async function openBalanceRoomAction(gameSlug: string, clanId: string, roomId: string): Promise<OpenRoomResult> {
  try {
    const client = await roomClient(gameSlug, clanId);
    const { data, error } = await client.rpc("open_balance_room", { p_clan_id: clanId, p_room_id: roomId });
    const result = payload(data, error);
    if (typeof result.room_id !== "string" || typeof result.series_id !== "string") throw new Error("내전 세션을 확인하지 못했습니다.");
    invalidate(gameSlug, clanId);
    return { ok: true, roomId: result.room_id, seriesId: result.series_id };
  } catch (error) { return failure(error); }
}

export async function updateBalanceRoomAction(
  gameSlug: string, clanId: string, roomId: string,
  input: { title: string; scheduledAt: string; rsvpDays: number | null },
): Promise<RoomResult> {
  try {
    const client = await roomClient(gameSlug, clanId);
    const at = dateInput(input.scheduledAt);
    if (!at) throw new Error("예약 시각을 확인하세요.");
    const { data, error } = await client.rpc("update_balance_room", {
      p_clan_id: clanId, p_room_id: roomId, p_title: input.title.trim(), p_scheduled_at: at, p_rsvp_days: input.rsvpDays ?? undefined,
    });
    payload(data, error);
    invalidate(gameSlug, clanId);
    return { ok: true };
  } catch (error) { return failure(error); }
}

export async function cancelBalanceRoomAction(gameSlug: string, clanId: string, roomId: string): Promise<RoomResult> {
  try {
    const client = await roomClient(gameSlug, clanId);
    const { data, error } = await client.rpc("cancel_balance_room", { p_clan_id: clanId, p_room_id: roomId });
    payload(data, error);
    invalidate(gameSlug, clanId);
    return { ok: true };
  } catch (error) { return failure(error); }
}

export async function setBalanceRoomRsvpAction(gameSlug: string, clanId: string, roomId: string, response: "going" | "maybe" | "no"): Promise<RoomResult> {
  try {
    const client = await roomClient(gameSlug, clanId);
    const { data, error } = await client.rpc("set_balance_room_rsvp", { p_clan_id: clanId, p_room_id: roomId, p_response: response });
    payload(data, error);
    invalidate(gameSlug, clanId);
    return { ok: true };
  } catch (error) { return failure(error); }
}

export async function delegateBalanceRoomAction(gameSlug: string, clanId: string, roomId: string, officerId: string | null): Promise<RoomResult> {
  try {
    const client = await roomClient(gameSlug, clanId);
    const { data, error } = await client.rpc("delegate_balance_room", { p_clan_id: clanId, p_room_id: roomId, p_officer_id: officerId ?? undefined });
    payload(data, error);
    invalidate(gameSlug, clanId);
    return { ok: true };
  } catch (error) { return failure(error); }
}

export async function setBalanceRoomScheduleEnabledAction(gameSlug: string, clanId: string, scheduleId: string, enabled: boolean): Promise<RoomResult> {
  try {
    const client = await roomClient(gameSlug, clanId);
    const { data, error } = await client.rpc("set_balance_room_schedule_enabled", { p_clan_id: clanId, p_schedule_id: scheduleId, p_enabled: enabled });
    payload(data, error);
    invalidate(gameSlug, clanId);
    return { ok: true };
  } catch (error) { return failure(error); }
}
