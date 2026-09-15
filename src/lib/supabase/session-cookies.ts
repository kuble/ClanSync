import type { CookieOptions, SetAllCookies } from "@supabase/ssr";

export const SESSION_CHOICE_COOKIE = "clansync-session-days";
export const DAY_SESSION_SECONDS = 60 * 60 * 24;
export const REMEMBERED_SESSION_SECONDS = DAY_SESSION_SECONDS * 30;

type CookieValue = { name: string; value: string };
type CookiesToSet = Parameters<SetAllCookies>[0];

/** Browser persistence preference only; never use this cookie for authorization. */
export function getSessionMaxAge(cookies: CookieValue[]): number {
  return cookies.find(({ name }) => name === SESSION_CHOICE_COOKIE)?.value === "30"
    ? REMEMBERED_SESSION_SECONDS
    : DAY_SESSION_SECONDS;
}

/**
 * The SSR SDK overwrites cookieOptions.maxAge with 400 days. Enforce D-AUTH-07
 * at the final cookie write instead, including browser/server token refreshes.
 */
export function applySessionCookiePolicy(
  cookiesToSet: CookiesToSet,
  sessionMaxAge: number,
): CookiesToSet {
  const maxAge = sessionMaxAge === REMEMBERED_SESSION_SECONDS
    ? REMEMBERED_SESSION_SECONDS
    : DAY_SESSION_SECONDS;
  const sessionCookies = cookiesToSet.filter(({ name }) =>
    /^sb-.+-auth-token(?:\.\d+)?$/.test(name),
  );
  if (sessionCookies.length === 0) return cookiesToSet;

  const hasSession = sessionCookies.some(({ value, options }) =>
    value !== "" && options.maxAge !== 0,
  );
  const choiceOptions: CookieOptions = {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // The browser refresh client must read this per-device choice too.
    httpOnly: false,
    maxAge: hasSession ? maxAge : 0,
  };

  return [
    ...cookiesToSet.map((cookie) => {
      if (!sessionCookies.includes(cookie) || cookie.options.maxAge === 0) return cookie;
      return {
        ...cookie,
        options: { ...cookie.options, maxAge, secure: process.env.NODE_ENV === "production" },
      };
    }),
    {
      name: SESSION_CHOICE_COOKIE,
      value: hasSession ? (maxAge === REMEMBERED_SESSION_SECONDS ? "30" : "1") : "",
      options: choiceOptions,
    },
  ];
}
