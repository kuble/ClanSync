"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { AuthMessageState } from "@/app/actions/auth";
import { signInAction } from "@/app/actions/auth";
import { PasswordInput } from "@/components/entry/password-input";
import { Switch } from "@/components/ui/switch";
import styles from "@/components/entry/entry.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className={styles.submit} disabled={pending}>{pending ? "처리 중…" : "로그인"}</button>;
}

export function SignInForm({ nextPath }: { nextPath: string }) {
  const [state, formAction] = useActionState<AuthMessageState, FormData>(signInAction, null);
  return (
    <>
      <h1 className={styles.authHeading}>다시 오신 것을 환영합니다</h1>
      <p className={styles.authSubtitle}>ClanSync 계정으로 로그인하십시오.</p>
      <form action={formAction} className={styles.form}>
        <input type="hidden" name="next" value={nextPath} />
        {state?.error ? <p className={styles.error} role="alert" aria-live="polite">{state.error}</p> : null}
        <div className={styles.field}>
          <label htmlFor="email">이메일</label>
          <input className={styles.input} id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">비밀번호</label>
          <PasswordInput id="password" name="password" autoComplete="current-password" required placeholder="비밀번호를 입력하십시오" />
        </div>
        <div>
          <label className={styles.remember}>
            <span>자동 로그인</span>
            <Switch name="remember" aria-describedby="remember-hint" />
          </label>
          <p id="remember-hint" className={styles.inputHint}>약 30일 동안 유지됩니다. 공용 PC에서는 해제해 주십시오.</p>
        </div>
        <SubmitButton />
      </form>
      <p className={styles.authFooter}>계정이 없으십니까? <Link href={`/sign-up?next=${encodeURIComponent(nextPath)}`}>회원가입</Link></p>
    </>
  );
}
