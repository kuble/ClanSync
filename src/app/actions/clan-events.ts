"use server";

import { revalidatePath } from "next/cache";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type CreateClanEventResult =
  | { ok: true }
  | { ok: false; error: string };

const KINDS = new Set<Database["public"]["Enums"]["clan_event_kind"]>([
  "intra",
  "scrim",
  "event",
]);

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
  const kind = KINDS.has(kindRaw as Database["public"]["Enums"]["clan_event_kind"])
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
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/events`);
  return { ok: true };
}
