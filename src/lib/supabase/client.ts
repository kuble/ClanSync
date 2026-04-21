import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저(Client Component)용 Supabase 클라이언트.
 *
 * 세션은 `@supabase/ssr` 의 내장 쿠키 스토리지(= 동일 도메인의 Server-side 쿠키)
 * 에서 읽는다. 토큰 갱신은 `middleware.ts` 가 수행하므로, 클라이언트 코드에서는
 * 직접 `refreshSession()` 을 호출하지 않는다.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
