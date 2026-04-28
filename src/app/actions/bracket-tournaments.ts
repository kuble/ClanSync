"use server";

import { revalidatePath } from "next/cache";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type BracketTournamentMutationResult =
  | { ok: true }
  | { ok: false; error: string };

type BracketFormat = Database["public"]["Enums"]["bracket_format"];

const TEAM_COUNTS = new Set([2, 4, 8, 16]);

export async function createBracketTournamentAction(
  gameSlug: string,
  clanId: string,
  formData: FormData,
): Promise<BracketTournamentMutationResult> {
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
  if (!allowed) return { ok: false, error: "대진표를 만들 권한이 없습니다." };

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 1 || title.length > 120) {
    return { ok: false, error: "대회명은 1~120자입니다." };
  }

  const formatRaw = String(formData.get("format") ?? "single_elim").trim();
  const fmt = (
    ["single_elim", "double_elim", "round_robin"] as const
  ).includes(formatRaw as BracketFormat)
    ? (formatRaw as BracketFormat)
    : ("single_elim" as BracketFormat);

  const tc = parseInt(String(formData.get("team_count") ?? ""), 10);
  if (!TEAM_COUNTS.has(tc)) {
    return { ok: false, error: "팀 수는 2·4·8·16 중 하나여야 합니다." };
  }

  const svc = createServiceRoleClient();
  const { data: clanRow } = await svc
    .from("clans")
    .select("id, subscription_tier, games!inner(slug)")
    .eq("id", clanId)
    .maybeSingle();

  const g = clanRow?.games as unknown as { slug: string } | undefined;
  if (!clanRow || g?.slug !== gameSlug) {
    return { ok: false, error: "클랜을 찾을 수 없습니다." };
  }
  if (clanRow.subscription_tier !== "premium") {
    return { ok: false, error: "Premium 클랜만 대진표를 개최할 수 있습니다." };
  }

  const snapshot = {
    v: 1,
    teams: [] as unknown[],
    matches: [] as unknown[],
  };

  const { error } = await svc.from("bracket_tournaments").insert({
    host_clan_id: clanId,
    title,
    format: fmt,
    team_count: tc,
    status: "draft",
    snapshot,
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/events`);
  return { ok: true };
}

export async function deleteBracketTournamentDraftAction(
  gameSlug: string,
  clanId: string,
  tournamentId: string,
): Promise<BracketTournamentMutationResult> {
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
  if (!allowed) return { ok: false, error: "삭제할 권한이 없습니다." };

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

  const { data: row } = await svc
    .from("bracket_tournaments")
    .select("id, host_clan_id, status")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!row || row.host_clan_id !== clanId) {
    return { ok: false, error: "대회를 찾을 수 없습니다." };
  }
  if (row.status !== "draft") {
    return { ok: false, error: "초안(draft)만 삭제할 수 있습니다." };
  }

  const { error } = await svc
    .from("bracket_tournaments")
    .delete()
    .eq("id", tournamentId)
    .eq("host_clan_id", clanId)
    .eq("status", "draft");

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/events`);
  return { ok: true };
}
