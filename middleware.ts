import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * 루트 미들웨어 — Phase 2 M1 골격.
 *
 * - `@supabase/ssr` 기반 세션 쿠키 자동 갱신.
 * - D-SHELL-02 디버그 쿼리(`?role=`·`?plan=`·`?game=`) 운영 빌드 원천 차단.
 *
 * 페이지별 가드 체인(비로그인 리다이렉트·게임 인증·클랜 소속 매트릭스)은
 * M2(`/sign-in`·`/games`) 이후 단계에서 이 파일에 덧붙인다. 현재는 세션 refresh
 * 와 쿼리 정화만 수행하는 최소 골격이다.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 요청에 매칭:
     *  - `_next/static` · `_next/image` (Next 내부 자산)
     *  - `favicon.ico`
     *  - 이미지/폰트 확장자 (정적 자산)
     *  - `api/` 이하는 필요 시 각 Route Handler 가 자체 세션 체크를 수행
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
