import "server-only";

import type { User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/database.types";

type UserGender = Database["public"]["Enums"]["user_gender"];
type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

function clampBirthYear(y: number): number {
  const maxY = new Date().getFullYear() - 10;
  if (y < 1950) return 1950;
  if (y > maxY) return maxY;
  return y;
}

function rowFromAuthUser(user: User): UserInsert {
  const meta = user.user_metadata ?? {};
  let nickname = String(
    meta.nickname ?? user.email?.split("@")[0] ?? "user",
  ).trim();
  nickname = nickname.slice(0, 20);
  if (!nickname) nickname = "user";

  const birthRaw = meta.birth_year;
  const birthYear =
    typeof birthRaw === "number" && Number.isFinite(birthRaw)
      ? clampBirthYear(birthRaw)
      : clampBirthYear(new Date().getFullYear() - 15);

  const g = meta.gender;
  const gender: UserGender =
    g === "male" || g === "female" || g === "undisclosed"
      ? g
      : "undisclosed";

  return {
    id: user.id,
    nickname,
    email: user.email ?? "",
    birth_year: birthYear,
    gender,
    auto_login: meta.auto_login === true,
  };
}

/**
 * auth.users 와 1:1 인 public.users 행이 없을 때 보강 (FK·RLS 흐름용).
 * 트리거 누락·닉네임 유니크 충돌 등으로 프로필이 빠진 계정을 복구한다.
 */
export async function ensurePublicUserProfile(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const svc = createServiceRoleClient();
  const { data: existing } = await svc
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return { ok: true };

  const { data: admin, error: adminErr } =
    await svc.auth.admin.getUserById(userId);
  if (adminErr || !admin.user) {
    return {
      ok: false,
      error: adminErr?.message ?? "Auth 사용자를 찾을 수 없습니다.",
    };
  }

  let row = rowFromAuthUser(admin.user);
  let { error } = await svc.from("users").insert(row);

  if (error?.code === "23505") {
    row = {
      ...row,
      nickname: `${row.nickname!.slice(0, 12)}_${userId.replace(/-/g, "").slice(0, 8)}`,
    };
    ({ error } = await svc.from("users").insert(row));
  }

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
