"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { AuthMessageState } from "@/app/actions/auth";
import { signInAction } from "@/app/actions/auth";
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
      {pending ? "처리 중…" : "로그인"}
    </Button>
  );
}

export function SignInForm({ nextPath }: { nextPath: string }) {
  const [state, formAction] = useFormState<AuthMessageState, FormData>(
    signInAction,
    null,
  );

  return (
    <Card className="w-full max-w-md border shadow-md">
      <CardHeader>
        <CardTitle>로그인</CardTitle>
        <CardDescription>
          ClanSync 계정 이메일과 비밀번호를 입력해 주세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={nextPath} />

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
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="remember"
              className="border-input mt-1 size-4 rounded border"
            />
            <span>
              자동 로그인 (약 30일) — 공용 PC에서는 해제해 주세요.
            </span>
          </label>

          <SubmitButton />
        </form>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          계정이 없으신가요?{" "}
          <Link href="/sign-up" className="text-primary underline-offset-4 hover:underline">
            회원가입
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
