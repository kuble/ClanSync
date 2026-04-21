import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server Component / Route Handler / Server Action 용 Supabase 클라이언트.
 *
 * `next/headers` 의 `cookies()` 로부터 요청 쿠키를 읽고, 응답 쿠키에 세션 변경분을
 * 기록한다. Server Component 에서는 쿠키 쓰기가 금지되므로 `try/catch` 로 감싸
 * `middleware.ts` 의 갱신 경로에 위임한다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            // Server Component 에서 호출된 경우: 쓰기 실패는 무시.
            // 세션 갱신은 middleware.ts 에서 수행되므로 안전.
          }
        },
      },
    },
  );
}
