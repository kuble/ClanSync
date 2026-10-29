"use server";

import { createClient } from "@/lib/supabase/server";

type ProfileIntroResult =
  | { ok: true; intro: string }
  | { ok: false; error: string };

export async function saveProfileIntroAction(input: string): Promise<ProfileIntroResult> {
  if (typeof input !== "string") {
    return { ok: false, error: "한 줄 소개를 확인해 주십시오." };
  }
  if (input.length > 1_200) {
    return { ok: false, error: "한 줄 소개는 120자까지 입력할 수 있습니다." };
  }
  const intro = input.replace(/\s+/gu, " ").trim();
  if (intro.length > 120) {
    return { ok: false, error: "한 줄 소개는 120자까지 입력할 수 있습니다." };
  }

  try {
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return { ok: false, error: "로그인이 필요합니다." };

    const { error } = await client.auth.updateUser({
      data: { profile_intro: intro },
    });
    if (error) {
      return { ok: false, error: "소개를 저장하지 못했습니다. 잠시 후 다시 시도해 주십시오." };
    }
    return { ok: true, intro };
  } catch {
    return { ok: false, error: "소개를 저장하지 못했습니다. 잠시 후 다시 시도해 주십시오." };
  }
}
