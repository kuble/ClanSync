"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type ClanManageMemberResult =
  | { ok: true }
  | { ok: false; error: string };

type ClanMemberRole = Database["public"]["Enums"]["clan_member_role"];

async function verifyClanInGame(
  svc: ReturnType<typeof createServiceRoleClient>,
  gameSlug: string,
  clanId: string,
): Promise<boolean> {
  const { data: clanRow } = await svc
    .from("clans")
    .select("id, games!inner(slug)")
    .eq("id", clanId)
    .maybeSingle();
  const g = clanRow?.games as unknown as { slug: string } | undefined;
  return !!clanRow && g?.slug === gameSlug;
}

async function changeMembership(gameSlug: string, clanId: string, action: "leave" | "kick" | "allow_rejoin", targetUserId?: string): Promise<ClanManageMemberResult> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!/^[a-z0-9-]+$/.test(gameSlug) || !uuid.test(clanId) || (targetUserId !== undefined && !uuid.test(targetUserId)))
    return { ok: false, error: "클랜과 구성원 정보를 확인해 주세요." };
  try {
    const client = await createClient();
    if (!(await client.auth.getUser()).data.user) return { ok: false, error: "로그인이 필요합니다." };
    if (!await verifyClanInGame(createServiceRoleClient(), gameSlug, clanId)) return { ok: false, error: "클랜을 찾을 수 없습니다." };
    const { error } = await client.rpc("change_clan_membership", { p_clan_id: clanId, p_action: action, ...(targetUserId ? { p_user_id: targetUserId } : {}) });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/profile");
    revalidatePath("/games");
    revalidatePath(`/games/${gameSlug}/clan`);
    revalidatePath(`/games/${gameSlug}/clan/${clanId}`, "layout");
    return { ok: true };
  } catch { return { ok: false, error: "처리하지 못했습니다. 연결을 확인하고 다시 시도해 주세요." }; }
}

export async function kickClanMemberAction(gameSlug: string, clanId: string, targetUserId: string): Promise<ClanManageMemberResult> {
  return changeMembership(gameSlug, clanId, "kick", targetUserId);
}
export async function leaveClanAction(gameSlug: string, clanId: string): Promise<ClanManageMemberResult> {
  return changeMembership(gameSlug, clanId, "leave");
}
export async function allowClanRejoinAction(gameSlug: string, clanId: string, targetUserId: string): Promise<ClanManageMemberResult> {
  return changeMembership(gameSlug, clanId, "allow_rejoin", targetUserId);
}

export async function setClanMemberRoleAction(
  gameSlug: string,
  clanId: string,
  targetUserId: string,
  newRole: Extract<ClanMemberRole, "officer" | "member">,
): Promise<ClanManageMemberResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (targetUserId === user.id) {
    return { ok: false, error: "본인의 역할은 여기서 바꿀 수 없습니다." };
  }

  const { data: meRows } = await supabase.rpc("select_my_clan_membership", {
    p_clan_id: clanId,
  });
  const me = meRows?.[0];
  if (me?.status !== "active" || me.role !== "leader") {
    return { ok: false, error: "역할 변경은 클랜장만 할 수 있습니다." };
  }

  const svc = createServiceRoleClient();
  if (!(await verifyClanInGame(svc, gameSlug, clanId))) {
    return { ok: false, error: "클랜을 찾을 수 없습니다." };
  }

  const { data: target } = await svc
    .from("clan_members")
    .select("user_id, role, status")
    .eq("clan_id", clanId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!target || target.status !== "active") {
    return { ok: false, error: "대상 멤버를 찾을 수 없습니다." };
  }

  const cur = target.role as ClanMemberRole;
  if (cur === "leader") {
    return { ok: false, error: "클랜장 역할은 변경할 수 없습니다." };
  }

  if (newRole === "officer" && cur !== "member") {
    return { ok: false, error: "멤버만 운영진으로 승격할 수 있습니다." };
  }
  if (newRole === "member" && cur !== "officer") {
    return { ok: false, error: "운영진만 멤버로 강등할 수 있습니다." };
  }

  const { error } = await svc
    .from("clan_members")
    .update({ role: newRole })
    .eq("clan_id", clanId)
    .eq("user_id", targetUserId)
    .eq("status", "active");

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/manage`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}`);
  return { ok: true };
}
