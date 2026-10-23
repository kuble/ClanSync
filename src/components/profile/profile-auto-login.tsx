"use client";
import { useRef, useState } from "react";
import { saveAutoLoginAction } from "@/app/actions/profile-auto-login";
import { Switch } from "@/components/ui/switch";
import styles from "./profile.module.css";

export function ProfileAutoLogin({ initial }: { initial: boolean }) {
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  return <div className={styles.autoLogin}><label><span><strong>자동 로그인</strong><small>이 브라우저에서 로그인을 최대 30일 유지합니다. 끄면 기존 1일 기준을 사용합니다.</small></span><Switch aria-label="자동 로그인" checked={value} disabled={pending} onChange={async (event) => {
    if (busy.current) return;
    const next = event.target.checked;
    busy.current = true; setPending(true); setError("");
    try { const result = await saveAutoLoginAction(next); if (result.ok) setValue(result.value); else setError(result.error); }
    catch { setError("자동 로그인 설정을 저장하지 못했습니다. 다시 시도해 주세요."); }
    finally { busy.current = false; setPending(false); }
  }} /></label><span role="status" className="sr-only">{pending ? "자동 로그인 설정 저장 중" : ""}</span>{error && <p role="alert" className={styles.error}>{error}</p>}</div>;
}
