import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * D-SHELL-02 — 운영 빌드에서 반드시 드롭되는 테스트/디버그 쿼리 파라미터.
 *
 * 목업이 `?role=`, `?plan=`, `?game=` 등으로 역할/플랜/게임 상태를 스텁했던 흔적.
 * 운영에서는 쿼리가 그대로 남으면 권한 우회 오해가 생길 수 있어 원천 차단한다.
 *
 * 참고: docs/01-plan/pages.md §페이지별 가드 체인 표 01행.
 */
const DEBUG_QUERY_KEYS = ["role", "plan", "game"] as const;

/**
 * Next.js 미들웨어에서 호출되는 Supabase 세션 갱신 헬퍼.
 *
 * 1) `?role=`·`?plan=`·`?game=` 등 디버그 쿼리를 운영 빌드에서 제거 (D-SHELL-02).
 * 2) `@supabase/ssr` 쿠키 브릿지를 통해 access token 을 자동 갱신.
 *    (세션이 만료됐고 refresh token 이 유효한 경우에만 set-cookie 가 발생.)
 *
 * 주의: 이 함수는 `NextResponse` 를 반환한다. 호출 측(`middleware.ts`)에서 그대로
 * 반환해야 갱신된 쿠키가 브라우저로 전달된다.
 */
export async function updateSession(request: NextRequest) {
  const url = request.nextUrl;

  // 1) 운영 빌드에서 디버그 쿼리 제거 → 안전한 정화 URL 로 리다이렉트.
  if (process.env.NODE_ENV === "production") {
    const stripped = DEBUG_QUERY_KEYS.filter((key) =>
      url.searchParams.has(key),
    );
    if (stripped.length > 0) {
      const redirectUrl = url.clone();
      for (const key of stripped) {
        redirectUrl.searchParams.delete(key);
      }
      return NextResponse.redirect(redirectUrl);
    }
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() 가 필요한 경우에만 토큰 갱신이 트리거된다.
  // (M2 이후 이 반환값을 사용해 비로그인 리다이렉트 구현 — Phase 2 M2 범위)
  await supabase.auth.getUser();

  return response;
}
