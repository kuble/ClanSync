/** Only canonical, same-origin paths may cross an authentication redirect. */
export function safeNextPath(value: unknown, fallback = "/games"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") ||
      /[\\\u0000-\u0020\u007f]/.test(value) || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(value.split(/[?#]/, 1)[0])) return fallback;
  try {
    const origin = "https://clansync.invalid";
    const url = new URL(value, origin);
    if (url.origin !== origin || url.pathname.startsWith("//")) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}
