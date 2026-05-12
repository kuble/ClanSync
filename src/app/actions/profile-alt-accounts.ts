"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./game-clan-onboarding";

const ALT_NICK_MAX = 32;

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
      error: `부계정 닉네임은 1~${ALT_NICK_MAX}자로 입력해 주세요.`,
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
