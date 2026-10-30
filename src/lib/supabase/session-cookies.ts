import type { CookieOptions, SetAllCookies } from "@supabase/ssr";

export const SESSION_CHOICE_COOKIE = "clansync-session-days";
export const DAY_SESSION_SECONDS = 60 * 60 * 24;
// Browser storage limit, renewed on every token refresh; not a session deadline.
export const REMEMBERED_SESSION_SECONDS = DAY_SESSION_SECONDS * 400;

type CookieValue = { name: string; value: string };
type CookiesToSet = Parameters<SetAllCookies>[0];

/** Browser persistence preference only; never use this cookie for authorization. */
export function getSessionMaxAge(cookies: CookieValue[]): number {
  const choice = cookies.find(({ name }) => name === SESSION_CHOICE_COOKIE)?.value;
  // Preserve enabled sessions from before the 30-day policy was removed.
  return choice === "on" || choice === "30"
    ? REMEMBERED_SESSION_SECONDS
    : DAY_SESSION_SECONDS;
}

/**
 * Apply the device's persistence choice at the final cookie write, including
 * browser/server refreshes. Enabled sessions use the SDK's storage lifetime.
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
      value: hasSession ? (maxAge === REMEMBERED_SESSION_SECONDS ? "on" : "off") : "",
      options: choiceOptions,
    },
  ];
}
