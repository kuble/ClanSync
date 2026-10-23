"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

import type { ActionResult } from "./game-clan-onboarding";

export type NameplateCategory = Database["public"]["Enums"]["nameplate_category"];

const NAMEPLATE_CATEGORIES: NameplateCategory[] = [
  "emblem",
  "namebar",
  "sub",
  "frame",
];

export async function saveNameplateSelectionAction(input: {
  category: string;
  optionId: string;
}): Promise<ActionResult> {
  if (!input || typeof input.optionId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.optionId)) return { ok: false, error: "선택한 꾸미기를 확인해 주세요." };
  const cat = input.category as NameplateCategory;
  if (!NAMEPLATE_CATEGORIES.includes(cat)) {
    return { ok: false, error: "잘못된 카테고리입니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase.from("user_namecard_selections").upsert(
    {
      user_id: user.id,
      category: cat,
      option_id: input.optionId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,category" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}

export async function saveBadgePicksAction(input: {
  gameId: string;
  orderedBadgeIds: string[];
}): Promise<ActionResult> {
  const ids = [...new Set(input.orderedBadgeIds)].slice(0, 5);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase.rpc("save_my_badge_picks", {
    p_game_id: input.gameId,
    p_ordered_badge_ids: ids,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}
