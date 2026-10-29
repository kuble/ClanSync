"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { NAMECARD_THEMES, namecardThemeSelections } from "@/lib/profile/namecard";
import { isNamecardPalette } from "@/lib/profile/backgrounds";

import type { ActionResult } from "./game-clan-onboarding";

export type NameplateCategory = Database["public"]["Enums"]["nameplate_category"];

const NAMEPLATE_CATEGORIES: NameplateCategory[] = [
  "emblem",
  "namebar",
  "sub",
  "frame",
  "portrait",
];

export async function saveNameplateSelectionAction(input: {
  category: string;
  optionId: string;
  paletteId?: string | null;
}): Promise<ActionResult> {
  if (!input || typeof input.optionId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.optionId)) return { ok: false, error: "선택한 꾸미기를 확인해 주십시오." };
  const cat = input.category as NameplateCategory;
  if (!NAMEPLATE_CATEGORIES.includes(cat)) {
    return { ok: false, error: "잘못된 카테고리입니다." };
  }
  if (input.paletteId != null && (cat === "sub" || !isNamecardPalette(input.paletteId))) return { ok: false, error: "선택한 색상을 확인해 주십시오." };

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
      palette_id: input.paletteId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,category" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}

export async function saveNamecardThemeAction(themeId: string): Promise<ActionResult> {
  if (!NAMECARD_THEMES.some(theme => theme.id === themeId)) return { ok: false, error: "선택한 테마를 확인해 주십시오." };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { data, error } = await db.from("nameplate_options").select("id,category,code,name_ko,unlock_source,price_coins")
    .eq("is_active", true).in("code", ["frame", "namebar", "portrait"].map(category => `theme-${themeId}-${category}`));
  if (error || !data || data.length !== 3) return { ok: false, error: "테마를 불러오지 못했습니다. 다시 시도해 주십시오." };
  // A single upsert keeps the three pieces atomic; the existing ownership trigger checks each one.
  const { error: saveError } = await db.from("user_namecard_selections").upsert(
    namecardThemeSelections(data, themeId).map(selection => ({ user_id: user.id, ...selection, palette_id: null, updated_at: new Date().toISOString() })),
    { onConflict: "user_id,category" },
  );
  if (saveError) return { ok: false, error: "테마를 저장하지 못했습니다. 다시 시도해 주십시오." };
  revalidatePath("/profile");
  return { ok: true };
}
