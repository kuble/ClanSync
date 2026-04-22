import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

/**
 * D-SHELL-02 — 운영 빌드에서 반드시 드롭되는 테스트/디버그 쿼리 파라미터.
 *
 * 목업이 `?role=`, `?plan=`, `?game=` 등으로 역할/플랜/게임 상태를 스텁했던 흔적.
 * 운영에서는 쿼리가 그대로 남으면 권한 우회 오해가 생길 수 있어 원천 차단한다.
 *
 * 참고: docs/01-plan/pages.md §페이지별 가드 체인 표 01행.
 */
const DEBUG_QUERY_KEYS = ["role", "plan", "game"] as const;

export type SessionUpdateResult = {
  response: NextResponse;
  user: User | null;
  supabase: SupabaseClient<Database>;
};

/**
 * Next.js 미들웨어에서 호출되는 Supabase 세션 갱신 헬퍼.
 *
 * 1) `@supabase/ssr` 쿠키 브릿지를 통해 access token 을 자동 갱신.
 * 2) `?role=`·`?plan=`·`?game=` 등 디버그 쿼리를 운영 빌드에서 제거 (D-SHELL-02).
 */
export async function updateSession(request: NextRequest): Promise<SessionUpdateResult> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl;
  if (process.env.NODE_ENV === "production") {
    const stripped = DEBUG_QUERY_KEYS.filter((key) =>
      url.searchParams.has(key),
    );
    if (stripped.length > 0) {
      const redirectUrl = url.clone();
      for (const key of stripped) {
        redirectUrl.searchParams.delete(key);
      }
      const redirectResponse = NextResponse.redirect(redirectUrl);
      return {
        response: mergeCookies(response, redirectResponse),
        user,
        supabase,
      };
    }
  }

  return { response, user, supabase };
}

/** 세션 쿠키를 리다이렉트 응답에 옮긴다. */
export function mergeCookies(
  from: NextResponse,
  onto: NextResponse,
): NextResponse {
  from.cookies.getAll().forEach((c) => {
    const { name, value, ...rest } = c;
    onto.cookies.set(
      name,
      value,
      rest as Omit<typeof c, "name" | "value">,
    );
  });
  return onto;
}
