"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  clearLoginLockout,
  getRequestIp,
  isLoginLocked,
  normalizeEmail,
  recordFailedPasswordAttempt,
  recordLockedAttempt,
} from "@/lib/auth/lockout";
import { ensurePublicUserProfile } from "@/lib/auth/ensure-public-user";
import { isStrongPassword, passwordPolicyHint } from "@/lib/auth/password-policy";
import { createAuthActionClient } from "@/lib/supabase/auth-action-client";

export type AuthMessageState = { error?: string; ok?: string } | null;

const GENERIC_SIGN_IN_ERROR =
  "이메일 또는 비밀번호가 올바르지 않거나, 잠시 후 다시 시도해 주세요.";

function safeNextPath(next: string): string {
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return "/games";
}

export async function signInAction(
  _prev: AuthMessageState,
  formData: FormData,
): Promise<AuthMessageState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  const next = safeNextPath(String(formData.get("next") ?? "/games"));

  const ip = await getRequestIp();
  const h = await headers();
  const ua = h.get("user-agent");

  if (await isLoginLocked(email, ip)) {
    await recordLockedAttempt(email, ip, ua);
    return { error: GENERIC_SIGN_IN_ERROR };
  }

  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
  const supabase = await createAuthActionClient(maxAge);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await recordFailedPasswordAttempt(email, ip, ua);
    return { error: GENERIC_SIGN_IN_ERROR };
  }

  await clearLoginLockout(email, ip);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const ensured = await ensurePublicUserProfile(user.id);
    if (!ensured.ok) {
      return {
        error: `프로필을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요. (${ensured.error})`,
      };
    }
    await supabase
      .from("users")
      .update({ auto_login: remember })
      .eq("id", user.id);
  }

  redirect(next);
}

export async function signUpAction(
  _prev: AuthMessageState,
  formData: FormData,
): Promise<AuthMessageState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nickname = String(formData.get("nickname") ?? "").trim();
  const birthYear = Number.parseInt(String(formData.get("birth_year") ?? ""), 10);
  const gender = String(formData.get("gender") ?? "undisclosed");
  const terms = formData.get("terms") === "on";

  if (!terms) {
    return { error: "이용약관 및 개인정보 처리에 동의해 주세요." };
  }
  if (nickname.length < 2 || nickname.length > 20) {
    return { error: "닉네임은 2~20자로 입력해 주세요." };
  }
  if (!Number.isFinite(birthYear)) {
    return { error: "출생연도를 선택해 주세요." };
  }

  const y = new Date().getFullYear();
  if (birthYear < 1950 || birthYear > y - 10) {
    return { error: "출생연도를 확인해 주세요. (만 10세 이상만 가입 가능)" };
  }

  if (!isStrongPassword(password)) {
    return { error: passwordPolicyHint() };
  }

  const maxAge = 60 * 60 * 24;
  const supabase = await createAuthActionClient(maxAge);

  const genderOk =
    gender === "male" || gender === "female" || gender === "undisclosed"
      ? gender
      : "undisclosed";

  const { data: signData, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      data: {
        nickname,
        birth_year: birthYear,
        gender: genderOk,
        auto_login: false,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (signData.user) {
    const ensured = await ensurePublicUserProfile(signData.user.id);
    if (!ensured.ok) {
      return {
        error: `가입은 되었으나 프로필 행을 만들지 못했습니다. 관리자에게 문의해 주세요. (${ensured.error})`,
      };
    }
  }

  redirect("/games");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createAuthActionClient(60 * 60 * 24);
  await supabase.auth.signOut();
  redirect("/");
}
