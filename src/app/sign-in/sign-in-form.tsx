"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import type { AuthMessageState } from "@/app/actions/auth";
import { signInAction } from "@/app/actions/auth";
import { PasswordInput } from "@/components/entry/password-input";
import { Switch } from "@/components/ui/switch";
import styles from "@/components/entry/sign-in.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className={styles.submit} disabled={pending}>{pending ? <><LoaderCircle size={16} className={styles.spinner} aria-hidden="true" />로그인 중…</> : <>로그인 <ArrowRight size={16} aria-hidden="true" /></>}</button>;
}

export function SignInForm({ nextPath }: { nextPath: string }) {
  const [state, formAction] = useActionState<AuthMessageState, FormData>(signInAction, null);
  return (
    <>
      <h1 id="sign-in-title" className={styles.authHeading}>다시 만나 반갑습니다.</h1>
      <p className={styles.authSubtitle}>로그인하고 우리 클랜의 활동을 이어가세요.</p>
      <form action={formAction} className={styles.form}>
        <input type="hidden" name="next" value={nextPath} />
        {state?.error ? <p className={styles.error} role="alert" aria-live="polite">{state.error}</p> : null}
        <div className={styles.field}>
          <label htmlFor="email">이메일</label>
          <input className={styles.input} id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">비밀번호</label>
          <PasswordInput id="password" name="password" autoComplete="current-password" required placeholder="비밀번호 입력" />
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
      <p className={styles.authFooter}>계정이 없으신가요? <Link href={`/sign-up?next=${encodeURIComponent(nextPath)}`}>회원가입 <ArrowRight size={13} aria-hidden="true" /></Link></p>
    </>
  );
}
