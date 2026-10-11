import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { loadGameOnboarding } from "@/lib/onboarding/load-game-onboarding";
import { mergeCookies, updateSession } from "@/lib/supabase/middleware";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
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

  if (path === "/profile" && !user) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", "/profile");
    const r = NextResponse.redirect(signIn);
    return mergeCookies(response, r);
  }

  if ((path === "/sign-in" || path === "/sign-up") && user) {
    const r = NextResponse.redirect(new URL(safeNextPath(url.searchParams.get("next")), request.url));
    return mergeCookies(response, r);
  }

  // D-AUTH-01 — `/games/[gameSlug]/...` 게이트 (Main_GameSelect 제외)
  if (user && path.startsWith("/games/")) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const gameSlug = parts[1];
      const rest = parts.slice(2);
      const nextTarget = `${path}${request.nextUrl.search}`;

      const state = await loadGameOnboarding(supabase, user.id, gameSlug);
      if (!state) {
        const r = NextResponse.redirect(new URL("/games", request.url));
        return mergeCookies(response, r);
      }

      if (rest.length === 0) {
        if (!state.authVerified) {
          const r = NextResponse.redirect(
            new URL(
              `/games/${encodeURIComponent(gameSlug)}/auth?next=${encodeURIComponent(nextTarget)}`,
              request.url,
            ),
          );
          return mergeCookies(response, r);
        }
        return response;
      }

      const sub = rest[0];

      if (sub === "auth") {
        const reauth = url.searchParams.get("reauth") === "1";
        if (state.authVerified && !reauth) {
          const next = safeNextPath(url.searchParams.get("next"), "");
          if (next.startsWith(`/games/${gameSlug}/`) && !next.startsWith(`/games/${gameSlug}/auth`)) {
            return mergeCookies(response, NextResponse.redirect(new URL(next, request.url)));
          }
          if (state.clanStatus === "member" && state.clanId) {

            const r = NextResponse.redirect(
              new URL(
                `/games/${encodeURIComponent(gameSlug)}/clan/${state.clanId}`,
                request.url,
              ),
            );
            return mergeCookies(response, r);
          }
          const pendingQs =
            state.clanStatus === "pending" ? "?pending=1" : "";
          const r = NextResponse.redirect(
            new URL(
              `/games/${encodeURIComponent(gameSlug)}/clan${pendingQs}`,
              request.url,
            ),
          );
          return mergeCookies(response, r);
        }
        return response;
      }

      if (sub === "clan") {
        if (rest.length === 1) {
          if (!state.authVerified) {
            const r = NextResponse.redirect(
              new URL(
                `/games/${encodeURIComponent(gameSlug)}/auth?next=${encodeURIComponent(nextTarget)}`,
                request.url,
              ),
            );
            return mergeCookies(response, r);
          }
          if (state.clanStatus === "member" && state.clanId) {
            const next = safeNextPath(request.cookies.get("clansync-clan-return")?.value, "");
            if (next.startsWith(`/games/${gameSlug}/clan/${state.clanId}/`) || next.startsWith(`/games/${gameSlug}/clan/${state.clanId}?`)) {
              const r = NextResponse.redirect(new URL(next, request.url));
              r.cookies.delete("clansync-clan-return");
              return mergeCookies(response, r);
            }
            const r = NextResponse.redirect(
              new URL(
                `/games/${encodeURIComponent(gameSlug)}/clan/${state.clanId}`,
                request.url,
              ),
            );
            return mergeCookies(response, r);
          }
          return response;
        }

        const clanIdSeg = rest[1];
        if (!state.authVerified) {
          const r = NextResponse.redirect(
            new URL(
              `/games/${encodeURIComponent(gameSlug)}/auth?next=${encodeURIComponent(nextTarget)}`,
              request.url,
            ),
          );
          return mergeCookies(response, r);
        }
        if (state.clanStatus !== "member" || !state.clanId) {
          const r = NextResponse.redirect(
            new URL(
              `/games/${encodeURIComponent(gameSlug)}/clan`,
              request.url,
            ),
          );
          r.cookies.set("clansync-clan-return", safeNextPath(nextTarget), { httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", path: "/", maxAge: 60*60*24*7 });
          return mergeCookies(response, r);
        }
        if (clanIdSeg !== state.clanId) {
          const r = NextResponse.redirect(
            new URL(
              `/games/${encodeURIComponent(gameSlug)}/clan/${state.clanId}`,
              request.url,
            ),
          );
          return mergeCookies(response, r);
        }
        return response;
      }

      if (!state.authVerified) {
        const r = NextResponse.redirect(
          new URL(
            `/games/${encodeURIComponent(gameSlug)}/auth?next=${encodeURIComponent(nextTarget)}`,
            request.url,
          ),
        );
        return mergeCookies(response, r);
      }
    }
  }

  return response;
}

export const config = { matcher: ["/", "/sign-in", "/sign-up", "/profile", "/games/:path*"] };
