import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ServiceRoleClientResult =
  | { ok: true; client: SupabaseClient }
  | { ok: false; error: string };

/** 서버 액션 등에서 throw 대신 UI 메시지용으로 쓸 때 */
export function tryCreateServiceRoleClient(): ServiceRoleClientResult {
  try {
    return { ok: true, client: createServiceRoleClient() };
  } catch {
    return {
      ok: false,
      error:
        "서버 설정 오류입니다. 로컬에서는 `.env.local`의 SUPABASE_SERVICE_ROLE_KEY와 NEXT_PUBLIC_SUPABASE_URL을 확인해 주세요.",
    };
  }
}

/**
 * 서비스 롤 — RLS 우회. Route Handler·서버 전용 스크립트·로그인 잠금(D-AUTH-06)만.
 * 클라이언트 번들에 절대 import 금지.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_URL 누락");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
