import { createClient } from "@supabase/supabase-js";

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
