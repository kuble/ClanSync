"use client";

import { useRef, useState } from "react";
import { saveLanguage } from "@/app/actions/profile-language";
import { useTranslator } from "@/components/ui/language-provider";
import { supportedLanguage } from "@/lib/i18n/language";

export function ProfileLanguage({ initial }: { initial: string }) {
  const tx = useTranslator();
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [failed, setFailed] = useState(false);
  return <>
    <select id="profile-language" value={supportedLanguage(initial)} disabled={pending}
      className="rounded-md border bg-background px-2 py-1 text-sm focus-visible:outline-ring"
      onChange={async event => {
        if (busy.current) return;
        const next = event.target.value;
        busy.current = true;
        setPending(true);
        setFailed(false);
        let navigating = false;
        try {
          const saved = await saveLanguage(next);
          setFailed(!saved);
          if (saved) {
            // Reload the document so the root language, server text and client
            // dictionary switch together; stay on the account settings tab.
            window.location.replace("/profile?tab=account");
            navigating = true;
          }
        }
        catch { setFailed(true); }
        finally { if (!navigating) { busy.current = false; setPending(false); } }
      }}>
      <option value="ko" lang="ko">한국어</option>
      <option value="en" lang="en">English</option>
    </select>
    {failed && <p role="alert">{tx.locale === "en-US" ? "Couldn’t save your language. Please try again." : "언어를 저장하지 못했습니다. 다시 시도해 주십시오."}</p>}
  </>;
}
