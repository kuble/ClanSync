import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { applySessionCookiePolicy, getSessionMaxAge } from "@/lib/supabase/session-cookies";

function getBrowserCookies() {
  return parseCookieHeader(document.cookie).map(({ name, value }) => ({ name, value: value ?? "" }));
}

/**
 * 브라우저(Client Component)용 Supabase 클라이언트.
 *
 * 세션은 `@supabase/ssr` 의 내장 쿠키 스토리지(= 동일 도메인의 Server-side 쿠키)
 * 에서 읽는다. 브라우저 SDK의 자동 갱신과 middleware의 갱신 모두 같은
 * 자동 로그인 선택을 유지한다.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: typeof document === "undefined" ? undefined : {
        getAll: getBrowserCookies,
        setAll(cookiesToSet) {
          // Read on every write: the singleton can outlive a logout/new login.
          const sessionCookies = applySessionCookiePolicy(cookiesToSet, getSessionMaxAge(getBrowserCookies()));
          for (const { name, value, options } of sessionCookies) {
            document.cookie = serializeCookieHeader(name, value, options);
          }
        },
      },
    },
  );
}
