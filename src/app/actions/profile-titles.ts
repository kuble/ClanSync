"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function purchaseProfileTitleAction(optionId: unknown): Promise<{ ok: true; optionId: string; coinBalance: number } | { ok: false; error: string }> {
  if (typeof optionId !== "string" || !/^[0-9a-f-]{36}$/i.test(optionId)) return { ok: false, error: "구매할 칭호를 확인해 주세요." };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { data, error } = await db.rpc("purchase_profile_title", { p_option_id: optionId });
  if (error) return { ok: false, error: error.message.includes("title_insufficient_coins") ? "개인 코인이 부족합니다." : "칭호를 구매하지 못했습니다. 다시 시도해도 중복 차감되지 않습니다." };
  const result = data as { optionId: string; coinBalance: number };
  revalidatePath("/profile");
  revalidatePath("/store");
  return { ok: true, ...result };
}
