"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UpdateBalanceAutoCloseResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateBalanceAutoCloseSettingsAction(
  gameSlug: string,
  clanId: string,
  enabled: boolean,
  hours: number,
): Promise<UpdateBalanceAutoCloseResult> {
  if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
    return { ok: false, error: "자동 종료 시간은 1~168시간으로 설정해 주세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase.rpc("update_balance_auto_close_settings", {
    p_clan_id: clanId,
    p_enabled: enabled,
    p_hours: hours,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/manage`);
  return { ok: true };
}
