import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Action 전용 — D-AUTH-07 자동 로그인 토글에 따른 세션 쿠키 maxAge.
 */
export async function createAuthActionClient(sessionMaxAgeSec: number) {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: sessionMaxAgeSec,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component 경로 등에서 쓰기 실패 시 무시
          }
        },
      },
    },
  );
}
