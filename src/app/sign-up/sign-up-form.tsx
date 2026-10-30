"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowRight, LoaderCircle, MailCheck } from "lucide-react";
import type { AuthMessageState } from "@/app/actions/auth";
import { signUpAction } from "@/app/actions/auth";
import { PasswordInput } from "@/components/entry/password-input";
import styles from "@/components/entry/auth.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className={styles.submit} disabled={pending}>{pending ? <><LoaderCircle className={styles.spinner} size={16} aria-hidden="true" />가입 처리 중…</> : <>가입하기<ArrowRight size={16} aria-hidden="true" /></>}</button>;
}

export function SignUpForm({ nextPath = "/games" }: { nextPath?: string }) {
  const [state, formAction] = useActionState<AuthMessageState, FormData>(signUpAction, null);
  const maxYear = new Date().getFullYear() - 10;
  const years = Array.from({ length: maxYear - 1949 }, (_, index) => maxYear - index);
  if (state?.ok) return <div className={styles.confirmation}>
    <span className={styles.confirmationIcon}><MailCheck size={24} aria-hidden="true" /></span>
    <h1 id="sign-up-title" className={styles.authHeading}>이메일을 확인해 주십시오</h1>
    <p className={styles.authSubtitle} role="status">{state.ok}</p>
    <Link className={styles.submit} href={`/sign-in?next=${encodeURIComponent(nextPath)}`}>로그인 화면으로<ArrowRight size={16} aria-hidden="true" /></Link>
  </div>;
  return (
    <>
      <h1 id="sign-up-title" className={styles.authHeading}>함께하게 되어 반갑습니다.</h1>
      <p className={styles.authSubtitle}>계정을 만들고, 함께할 클랜을 만나보세요.</p>
      <form action={formAction} className={`${styles.form} ${styles.signUpForm}`} onReset={(event) => event.preventDefault()}>
        <input type="hidden" name="next" value={nextPath} />
        {state?.error ? <p className={styles.error} role="alert" aria-live="polite">{state.error}</p> : null}
        <div className={styles.field}>
          <label htmlFor="email">이메일</label>
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">비밀번호</label>
          <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} maxLength={72} placeholder="비밀번호 설정" aria-describedby="password-hint" />
          <p id="password-hint" className={styles.inputHint}>영문·숫자·특수문자를 모두 포함해 8~72자로 입력해 주십시오.</p>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="birth_year">출생연도</label>
            <select id="birth_year" name="birth_year" required defaultValue="">
              <option value="" disabled>선택</option>
              {years.map((year) => <option key={year} value={year}>{year}년</option>)}
            </select>
          </div>
          <fieldset className={styles.genderField}>
            <legend>성별 (선택)</legend>
            <div className={styles.genderOptions}>
              <label><input type="radio" name="gender" value="male" /><span>남성</span></label>
              <label><input type="radio" name="gender" value="female" /><span>여성</span></label>
              <label><input type="radio" name="gender" value="undisclosed" defaultChecked /><span>비공개</span></label>
            </div>
          </fieldset>
        </div>
        <label className={styles.terms}>
          <input type="checkbox" name="terms" required />
          <span>이용약관 및 개인정보 처리방침에 동의합니다. (필수)<span className={styles.termsNote}>만 14세 미만은 가입 시 법정대리인 동의가 필요합니다. (서비스 오픈 시 추가 절차 안내)</span></span>
        </label>
        <SubmitButton />
      </form>
      <p className={styles.authFooter}>이미 계정이 있으신가요? <Link href={`/sign-in?next=${encodeURIComponent(nextPath)}`}>로그인<ArrowRight size={13} aria-hidden="true" /></Link></p>
    </>
  );
}
