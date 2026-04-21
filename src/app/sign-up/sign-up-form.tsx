"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { AuthMessageState } from "@/app/actions/auth";
import { signUpAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "가입 처리 중…" : "가입하기"}
    </Button>
  );
}

function yearOptions() {
  const max = new Date().getFullYear() - 10;
  const out: number[] = [];
  for (let y = max; y >= 1950; y--) out.push(y);
  return out;
}

export function SignUpForm() {
  const [state, formAction] = useFormState<AuthMessageState, FormData>(
    signUpAction,
    null,
  );
  const years = yearOptions();

  return (
    <Card className="w-full max-w-md border shadow-md">
      <CardHeader>
        <CardTitle>회원가입</CardTitle>
        <CardDescription>
          이메일과 비밀번호로 ClanSync 계정을 만듭니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error ? (
            <p
              className="text-destructive text-sm"
              role="alert"
              aria-live="polite"
            >
              {state.error}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <Input
              id="nickname"
              name="nickname"
              autoComplete="nickname"
              required
              minLength={2}
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_year">출생연도</Label>
            <select
              id="birth_year"
              name="birth_year"
              required
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="">선택</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">성별 (선택)</legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="gender" value="undisclosed" defaultChecked />
                비공개
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="gender" value="male" />
                남성
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="gender" value="female" />
                여성
              </label>
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
            />
            <p className="text-muted-foreground text-xs">
              영문·숫자·특수문자를 모두 포함, 8~72자 (bcrypt 한도).
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="terms"
              className="border-input mt-0.5 size-4 rounded border"
              required
            />
            <span>
              이용약관 및 개인정보 처리방침에 동의합니다. 만 14세 미만은 가입 시
              법정대리인 동의가 필요합니다. (서비스 오픈 시 추가 절차 안내)
            </span>
          </label>

          <SubmitButton />
        </form>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          이미 계정이 있나요?{" "}
          <Link
            href="/sign-in"
            className="text-primary underline-offset-4 hover:underline"
          >
            로그인
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
