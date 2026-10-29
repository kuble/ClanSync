"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./game-clan-onboarding";
import type { AltAccountRow } from "@/components/profile/profile-game-alt-accounts";
import { effectiveViewAltAccountRoles, viewAltAudience, viewAltAudienceCaption } from "@/lib/clan/view-alt-disclosure";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const ALT_NICK_MAX = 32;

export type OwnAltAccountsResult = { ok: true; gameId: string; gameName: string; rows: AltAccountRow[]; disclosureLines: string[] } | { ok: false; error: string };

export async function loadOwnAltAccountsAction(gameSlug: string): Promise<OwnAltAccountsResult> {
  if (typeof gameSlug !== "string" || !/^[a-z0-9-]{1,40}$/.test(gameSlug)) return { ok: false, error: "게임을 확인할 수 없습니다." };
  const db: SupabaseClient<Database> = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const game = await db.from("user_game_profiles").select("game_id,games!inner(slug,name_ko)").eq("user_id", user.id).eq("is_verified", true).eq("games.slug", gameSlug).maybeSingle();
  if (game.error || !game.data) return { ok: false, error: "인증된 본인 게임 계정에서만 편집할 수 있습니다." };
  const linked = game.data;
  const [rows, memberships] = await Promise.all([
    db.from("user_alt_accounts").select("id,game_id,alt_nick,note").eq("user_id", user.id).eq("game_id", linked.game_id).order("alt_nick"),
    db.rpc("my_active_clans_by_game"),
  ]);
  if (rows.error || memberships.error) return { ok: false, error: "부계정을 불러오지 못했습니다." };
  const clans = memberships.data.filter(clan => clan.game_id === linked.game_id);
  const settings = clans.length ? await db.from("clan_settings").select("clan_id,permissions").in("clan_id", clans.map(clan => clan.clan_id)) : { data: [], error: null };
  if (settings.error) return { ok: false, error: "공개 범위를 확인하지 못했습니다." };
  const disclosureLines = clans.map(clan => `「${clan.clan_name}」${viewAltAudienceCaption(viewAltAudience(effectiveViewAltAccountRoles(settings.data?.find(row => row.clan_id === clan.clan_id)?.permissions as Record<string, unknown>)))}`);
  return { ok: true, gameId: linked.game_id, gameName: linked.games.name_ko, rows: rows.data, disclosureLines };
}

export async function updateUserAltAccountAction(input: { id: string; altNick: string; note?: string; acknowledgedDisclosure: boolean }): Promise<ActionResult> {
  const id = typeof input?.id === "string" ? input.id.trim() : "";
  if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) return { ok: false, error: "수정 대상을 찾을 수 없습니다." };
  if (input.acknowledgedDisclosure !== true) return { ok: false, error: "공개 범위 안내와 동의를 확인해야 수정할 수 있습니다." };
  const nick = normalizeNick(typeof input.altNick === "string" ? input.altNick : "");
  if (!nick.length || nick.length > ALT_NICK_MAX) return { ok: false, error: `부계정 닉네임은 1~${ALT_NICK_MAX}자로 입력해 주십시오.` };
  const db: SupabaseClient<Database> = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const row = await db.from("user_alt_accounts").select("game_id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (row.error || !row.data) return { ok: false, error: "수정 가능한 부계정을 찾을 수 없습니다." };
  const game = await db.from("user_game_profiles").select("game_id").eq("user_id", user.id).eq("game_id", row.data.game_id).eq("is_verified", true).maybeSingle();
  if (game.error || !game.data) return { ok: false, error: "이 게임을 먼저 인증해야 수정할 수 있습니다." };
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 500) : "";
  const updated = await db.from("user_alt_accounts").update({ alt_nick: nick, note: note || null }).eq("id", id).eq("user_id", user.id).eq("game_id", row.data.game_id).select("id");
  if (updated.error) return { ok: false, error: updated.error.code === "23505" ? "같은 게임에서 이미 같은 닉네임이 등록되어 있습니다." : "부계정을 수정하지 못했습니다." };
  if (updated.data.length !== 1) return { ok: false, error: "부계정이 변경되었습니다. 다시 불러와 주십시오." };
  revalidatePath("/profile");
  return { ok: true };
}

function normalizeNick(raw: string): string {
  return raw.normalize("NFKC").trim();
}

export async function addUserAltAccountAction(input: {
  gameId: string;
  altNick: string;
  note?: string;
  acknowledgedDisclosure: boolean;
}): Promise<ActionResult> {
  if (!input.acknowledgedDisclosure) {
    return { ok: false, error: "공개 범위 안내와 동의를 확인해야 등록할 수 있습니다." };
  }

  const nick = normalizeNick(input.altNick ?? "");
  if (nick.length < 1 || nick.length > ALT_NICK_MAX) {
    return {
      ok: false,
      error: `부계정 닉네임은 1~${ALT_NICK_MAX}자로 입력해 주십시오.`,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: gp, error: gpErr } = await supabase
    .from("user_game_profiles")
    .select("game_id")
    .eq("user_id", user.id)
    .eq("game_id", input.gameId)
    .eq("is_verified", true)
    .maybeSingle();

  if (gpErr) return { ok: false, error: gpErr.message };
  if (!gp?.game_id) {
    return { ok: false, error: "이 게임을 먼저 인증해야 부계동을 추가할 수 있습니다." };
  }

  const note = (input.note ?? "").trim();

  const { error: insErr } = await supabase.from("user_alt_accounts").insert({
    user_id: user.id,
    game_id: input.gameId,
    alt_nick: nick.slice(0, ALT_NICK_MAX),
    note: note === "" ? null : note.slice(0, 500),
  });

  if (insErr) {
    if (
      typeof insErr.message === "string" &&
      (insErr.message.includes("duplicate key") ||
        insErr.code === "23505")
    ) {
      return { ok: false, error: "같은 게임에서 이미 같은 닉네임이 등록되어 있습니다." };
    }
    return { ok: false, error: insErr.message };
  }

  revalidatePath("/profile");
  return { ok: true };
}

export async function deleteUserAltAccountAction(input: {
  id: string;
}): Promise<ActionResult> {
  const id = typeof input.id === "string" ? input.id.trim() : "";
  if (!id) return { ok: false, error: "삭제 대상을 찾을 수 없습니다." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("user_alt_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}
