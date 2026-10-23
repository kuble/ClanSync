"use server";

import { createClient } from "@/lib/supabase/server";
import { PROFILE_VISIBILITY_KEYS, type ProfileVisibility } from "@/lib/profile/visibility";

export async function saveProfileVisibilityAction(input: unknown): Promise<
  { ok: true; visibility: ProfileVisibility } | { ok: false; error: string }
> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "공개 설정을 확인해 주세요." };
  const record = input as Record<string, unknown>;
  if (Object.keys(record).length !== PROFILE_VISIBILITY_KEYS.length || PROFILE_VISIBILITY_KEYS.some((key) => typeof record[key] !== "boolean")) {
    return { ok: false, error: "공개 설정을 확인해 주세요." };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const visibility = Object.fromEntries(PROFILE_VISIBILITY_KEYS.map((key) => [key, record[key]])) as ProfileVisibility;
  const { error } = await supabase.from("profile_visibility").upsert({ user_id: user.id, ...visibility });
  if (error) return { ok: false, error: "공개 설정을 저장하지 못했습니다. 다시 시도해 주세요." };
  return { ok: true, visibility };
}
