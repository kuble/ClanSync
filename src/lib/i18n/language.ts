export type Language = "ko" | "en";

export const languageCookie = "clansync-language";
export function supportedLanguage(value: unknown): Language {
  return value === "en" ? "en" : "ko";
}
