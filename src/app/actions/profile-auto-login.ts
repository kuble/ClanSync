"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { applySessionCookiePolicy, DAY_SESSION_SECONDS, REMEMBERED_SESSION_SECONDS } from "@/lib/supabase/session-cookies";

export async function saveAutoLoginAction(value: unknown) {
  if (typeof value !== "boolean") return { ok: false as const, error: "자동 로그인 설정을 확인해 주세요." };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
  const store = await cookies();
  const prefix = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;
  const session = store.getAll().filter(({ name }) => name === prefix || name.startsWith(prefix + "."));
  if (!session.length) return { ok: false as const, error: "다시 로그인한 뒤 시도해 주세요." };
  const { error } = await db.from("users").update({ auto_login: value }).eq("id", user.id);
  if (error) return { ok: false as const, error: "자동 로그인 설정을 저장하지 못했습니다." };
  applySessionCookiePolicy(session.map((item) => ({ ...item, options: { path: "/", sameSite: "lax" } })), value ? REMEMBERED_SESSION_SECONDS : DAY_SESSION_SECONDS)
    .forEach(({ name, value: cookieValue, options }) => store.set(name, cookieValue, options));
  return { ok: true as const, value };
}
