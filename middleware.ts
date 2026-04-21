import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { mergeCookies, updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const url = request.nextUrl;
  const path = url.pathname;

  // D-LANDING-04: 로그인된 사용자는 `/` → `/games` (단 `?from=logo` 예외). 프래그먼트는 서버 미전달.
  if (path === "/" && user) {
    if (url.searchParams.get("from") !== "logo") {
      const r = NextResponse.redirect(new URL("/games", request.url));
      return mergeCookies(response, r);
    }
  }

  if (path === "/games" || path.startsWith("/games/")) {
    if (!user) {
      const signIn = new URL("/sign-in", request.url);
      signIn.searchParams.set(
        "next",
        `${path}${request.nextUrl.search}`,
      );
      const r = NextResponse.redirect(signIn);
      return mergeCookies(response, r);
    }
  }

  if ((path === "/sign-in" || path === "/sign-up") && user) {
    const r = NextResponse.redirect(new URL("/games", request.url));
    return mergeCookies(response, r);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
