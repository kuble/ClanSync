import type { Language } from "./language";

export type Messages = Readonly<Record<string, string>>;
export function createTranslator(language: Language, messages?: Messages) {
  function translate<T>(value: T, ...args: unknown[]): T {
    if (typeof value !== "string") return value;
    const message = messages && Object.hasOwn(messages, value) ? messages[value] : value;
    return (args.length
      ? message.replace(/\{(\d+)\}/g, (key, index) => index < args.length ? String(args[index]) : key)
      : message) as T;
  }
  return Object.assign(translate, { locale: language === "en" ? "en-US" : "ko-KR" });
}
