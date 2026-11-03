"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Language } from "@/lib/i18n/language";
import { createTranslator, type Messages } from "@/lib/i18n/translate";

const Context = createContext(createTranslator("ko"));
export function LanguageProvider({ language, messages, children }: { language: Language; messages?: Messages; children: ReactNode }) {
  const translate = useMemo(() => createTranslator(language, messages), [language, messages]);
  return <Context.Provider value={translate}>{children}</Context.Provider>;
}
export function useTranslator() {
  return useContext(Context);
}
