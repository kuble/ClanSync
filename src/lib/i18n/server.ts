import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { languageCookie, supportedLanguage, type Language } from "./language";
import { createTranslator } from "./translate";

export const readLanguage = cache(async () => supportedLanguage((await cookies()).get(languageCookie)?.value));
export const loadMessages = cache(async (language: Language) => language === "en" ? (await import("./en.json")).default : undefined);
export const getTranslator = cache(async () => {
  const language = await readLanguage();
  return createTranslator(language, await loadMessages(language));
});

export async function writeLanguage(language: Language) {
  (await cookies()).set(languageCookie, language, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 31536000 });
}
