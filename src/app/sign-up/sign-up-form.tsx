"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { AuthMessageState } from "@/app/actions/auth";
import { signUpAction } from "@/app/actions/auth";
import { PasswordInput } from "@/components/entry/password-input";
import styles from "@/components/entry/entry.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className={styles.submit} disabled={pending}>{pending ? "가입 처리 중…" : "가입하기"}</button>;
}

export function SignUpForm() {
  const [state, formAction] = useActionState<AuthMessageState, FormData>(signUpAction, null);
  const maxYear = new Date().getFullYear() - 10;
  const years = Array.from({ length: maxYear - 1949 }, (_, index) => maxYear - index);
  return (
    <>
      <h1 className={styles.authHeading}>ClanSync에 오신 걸 환영해요</h1>
      <p className={styles.authSubtitle}>몇 가지 정보만 입력하면 바로 시작할 수 있어요.</p>
      <form action={formAction} className={styles.form}>
        {state?.error ? <p className={styles.error} role="alert" aria-live="polite">{state.error}</p> : null}
        <div className={styles.field}>
          <label htmlFor="email">이메일</label>
          <input className={styles.input} id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <div className={styles.field}>
          <label htmlFor="nickname">닉네임</label>
          <input className={styles.input} id="nickname" name="nickname" autoComplete="nickname" required minLength={2} maxLength={20} placeholder="클랜에서 사용할 닉네임 (2~20자)" />
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="birth_year">출생연도</label>
            <select className={styles.input} id="birth_year" name="birth_year" required defaultValue="">
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
        <div className={styles.field}>
          <label htmlFor="password">비밀번호</label>
          <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} maxLength={72} placeholder="영문 + 숫자 + 특수문자, 8~72자" aria-describedby="password-hint" />
          <p id="password-hint" className={styles.inputHint}>영문·숫자·특수문자를 모두 포함해 8~72자로 입력해 주세요.</p>
        </div>
        <label className={styles.terms}>
          <input type="checkbox" name="terms" required />
          <span>이용약관 및 개인정보 처리방침에 동의합니다. (필수)<br />만 14세 미만은 가입 시 법정대리인 동의가 필요합니다. (서비스 오픈 시 추가 절차 안내)</span>
        </label>
        <SubmitButton />
      </form>
      <p className={styles.authFooter}>이미 계정이 있으신가요? <Link href="/sign-in">로그인</Link></p>
    </>
  );
}
