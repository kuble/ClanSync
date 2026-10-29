"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/safe-next-path";
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
import { createServiceRoleClient } from "@/lib/supabase/service";

export type AuthMessageState = { error?: string; ok?: string } | null;

const GENERIC_SIGN_IN_ERROR =
  "이메일 또는 비밀번호가 올바르지 않거나, 잠시 후 다시 시도해 주십시오.";

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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    await recordFailedPasswordAttempt(email, ip, ua);
    return { error: GENERIC_SIGN_IN_ERROR };
  }

  // The password endpoint has already verified this user. UPDATE ... RETURNING
  // also checks that the public profile exists, avoiding two auth reads and a
  // separate profile lookup on every successful login.
  const user = data.user;
  const [profile] = await Promise.all([
    supabase.from("users").update({ auto_login: remember }).eq("id", user.id)
      .select("id").maybeSingle(),
    clearLoginLockout(email, ip),
  ]);

  if (profile.error) {
    return { error: "로그인 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주십시오." };
  }

  if (!profile.data) {
    const ensured = await ensurePublicUserProfile(user.id, supabase, user);
    if (!ensured.ok) {
      return {
        error: `프로필을 준비하지 못했습니다. 잠시 후 다시 시도해 주십시오. (${ensured.error})`,
      };
    }
    const { error: updateError } = await supabase
      .from("users")
      .update({ auto_login: remember })
      .eq("id", user.id);
    if (updateError) {
      return { error: "로그인 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주십시오." };
    }
  }

  redirect(next);
}

export async function signUpAction(
  _prev: AuthMessageState,
  formData: FormData,
): Promise<AuthMessageState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const birthYear = Number.parseInt(String(formData.get("birth_year") ?? ""), 10);
  const gender = String(formData.get("gender") ?? "undisclosed");
  const terms = formData.get("terms") === "on";
  const next = safeNextPath(formData.get("next"));

  if (!terms) {
    return { error: "이용약관 및 개인정보 처리에 동의해 주십시오." };
  }
  if (!Number.isFinite(birthYear)) {
    return { error: "출생연도를 선택해 주십시오." };
  }

  const y = new Date().getFullYear();
  if (birthYear < 1950 || birthYear > y - 10) {
    return { error: "출생연도를 확인해 주십시오. (만 10세 이상만 가입 가능)" };
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
        birth_year: birthYear,
        gender: genderOk,
        auto_login: false,
      },
    },
  });

  if (error) {
    return { error: "가입하지 못했습니다. 이메일 주소를 확인하거나 잠시 후 다시 시도해 주십시오." };
  }

  if (!signData.session) {
    return { ok: "입력한 주소로 온 가입 안내 메일을 확인해 주십시오. 확인을 마친 뒤 로그인하면 게임 계정을 연결할 수 있습니다." };
  }

  if (signData.user) {
    const ensured = await ensurePublicUserProfile(signData.user.id, supabase);
    if (!ensured.ok) {
      return {
        error: `가입은 되었으나 프로필 행을 만들지 못했습니다. 관리자에게 문의해 주십시오. (${ensured.error})`,
      };
    }
  }

  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createAuthActionClient(60 * 60 * 24);
  await supabase.auth.signOut();
  redirect("/");
}

/** 본인 계정 삭제. 공동 운영 기록은 작성자 연결만 해제하고 표시 이름을 보존한다. */
export async function deleteAccountAction(): Promise<{ error: string } | void> {
  const supabase = await createAuthActionClient(60 * 60 * 24);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/sign-in");
  }

  let svc: ReturnType<typeof createServiceRoleClient>;
  try {
    svc = createServiceRoleClient();
  } catch {
    return { error: "서버 설정 오류로 탈퇴를 처리할 수 없습니다." };
  }

  const { error: delErr } = await svc.auth.admin.deleteUser(user.id);
  if (delErr) {
    return {
      error:
        delErr.message ||
        "계정을 삭제하지 못했습니다. 잠시 후 다시 시도해 주십시오.",
    };
  }

  // Delete after Auth succeeds; uploads racing account deletion fail their FK/CAS and clean up.
  for (;;) {
    const { data: photos, error: listError } = await svc.storage.from("profile-photos").list(user.id, { limit: 1000 });
    if (listError) { console.error("Account profile photo cleanup failed", listError.message); break; }
    if (!photos?.length) break;
    const { error: removeError } = await svc.storage.from("profile-photos").remove(photos.map(photo => `${user.id}/${photo.name}`));
    if (removeError) { console.error("Account profile photo cleanup failed", removeError.message); break; }
  }

  await supabase.auth.signOut();
  redirect("/");
}
