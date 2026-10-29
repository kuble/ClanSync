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
    return { ok: false, error: "클랜과 구성원 정보를 확인해 주십시오." };
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
  } catch { return { ok: false, error: "처리하지 못했습니다. 연결을 확인하고 다시 시도해 주십시오." }; }
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

async function changeMemberRole(gameSlug: string, clanId: string, targetUserId: string, role: ClanMemberRole): Promise<ClanManageMemberResult> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!/^[a-z0-9-]+$/.test(gameSlug) || !uuid.test(clanId) || !uuid.test(targetUserId)) return { ok: false, error: "클랜과 구성원 정보를 확인해 주십시오." };
  try {
    const client = await createClient();
    if (!(await client.auth.getUser()).data.user) return { ok: false, error: "로그인이 필요합니다." };
    if (!await verifyClanInGame(createServiceRoleClient(), gameSlug, clanId)) return { ok: false, error: "클랜을 찾을 수 없습니다." };
    const { error } = await client.rpc("set_clan_member_role", { p_clan_id: clanId, p_user_id: targetUserId, p_role: role });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/profile");
    revalidatePath("/games");
    revalidatePath(`/games/${gameSlug}/clan/${clanId}`, "layout");
    return { ok: true };
  } catch { return { ok: false, error: "역할을 변경하지 못했습니다. 다시 시도해 주십시오." }; }
}

export async function setClanMemberRoleAction(gameSlug: string, clanId: string, targetUserId: string, newRole: Extract<ClanMemberRole, "officer" | "member">): Promise<ClanManageMemberResult> {
  if (newRole !== "officer" && newRole !== "member") return { ok: false, error: "변경할 역할을 확인해 주십시오." };
  return changeMemberRole(gameSlug, clanId, targetUserId, newRole);
}

export async function transferClanLeadershipAction(gameSlug: string, clanId: string, targetUserId: string): Promise<ClanManageMemberResult> {
  return changeMemberRole(gameSlug, clanId, targetUserId, "leader");
}
