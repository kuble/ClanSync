"use client";

import { useState, useTransition } from "react";
import { saveLanguage } from "@/app/actions/profile-language";
import { useTranslator } from "@/components/ui/language-provider";
import { supportedLanguage } from "@/lib/i18n/language";

export function ProfileLanguage({ initial }: { initial: string }) {
  const tx = useTranslator();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  return <>
    <select id="profile-language" value={supportedLanguage(initial)} disabled={pending}
      className="rounded-md border bg-background px-2 py-1 text-sm focus-visible:outline-ring"
      onChange={event => {
        const next = event.target.value;
        setFailed(false);
        startTransition(async () => {
          try { setFailed(!await saveLanguage(next)); }
          catch { setFailed(true); }
        });
      }}>
      <option value="ko" lang="ko">한국어</option>
      <option value="en" lang="en">English</option>
    </select>
    {failed && <p role="alert">{tx.locale === "en-US" ? "Couldn’t save your language. Please try again." : "언어를 저장하지 못했습니다. 다시 시도해 주세요."}</p>}
  </>;
}
