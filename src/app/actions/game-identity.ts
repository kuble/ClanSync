"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { gameProfileIdentity } from "@/lib/game-auth/game-profile-identity";

export async function saveGameIdentityAction(_previous: { error: string | null }, form: FormData) {
  const gameSlug = String(form.get("gameSlug") ?? "");
  const value = String(form.get("identity") ?? "");
  const identity = gameProfileIdentity(gameSlug, { battle_tag: value, riot_id: value });
  if (!identity) return { error: gameSlug === "overwatch" ? "배틀태그 전체를 입력해 주십시오. 예: AimZero#12345" : "라이엇 ID 전체를 입력해 주십시오. 예: Player#KR1" };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const { error } = await db.rpc("save_my_game_identity", { p_game_slug: gameSlug, p_identity: identity });
  if (error) return { error: "게임 ID를 저장하지 못했습니다. 잠시 후 다시 시도해 주십시오." };
  revalidatePath("/profile");
  revalidatePath("/games", "layout");
  const next = safeNextPath(String(form.get("nextPath") ?? ""), `/games/${gameSlug}/clan`);
  redirect(next.startsWith(`/games/${gameSlug}/auth`) ? `/games/${gameSlug}/clan` : next);
}
