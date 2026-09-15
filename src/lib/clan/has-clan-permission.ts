import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  LOCKED_LEADER_ONLY,
  LOCKED_OFFICER_PLUS,
  type ClanMemberRole,
  type ClanPermissionKey,
} from "@/lib/clan/permission-defaults";
import { resolveClanPermission } from "@/lib/clan/clan-access-snapshot";

/**
 * D-PERM-01 — 서버 컴포넌트·액션용 권한 판정 (Phase 2+ SQL 함수와 동일 규칙).
 */
export async function hasClanPermission(
  supabase: SupabaseClient<Database>,
  userId: string,
  clanId: string,
  perm: ClanPermissionKey,
): Promise<boolean> {
  void userId;
  const { data: rows, error: membershipError } = await supabase.rpc(
    "select_my_clan_membership",
    {
      p_clan_id: clanId,
    },
  );
  const row = rows?.[0];
  if (membershipError || !row || row.status !== "active" || !row.role)
    return false;
  const role = row.role as ClanMemberRole;

  if (LOCKED_LEADER_ONLY.has(perm)) return role === "leader";
  if (LOCKED_OFFICER_PLUS.has(perm)) {
    return role === "leader" || role === "officer";
  }

  const { data: settings, error: settingsError } = await supabase
    .from("clan_settings")
    .select("permissions")
    .eq("clan_id", clanId)
    .maybeSingle();

  if (settingsError || !settings) return false;

  return resolveClanPermission(role, perm, settings.permissions);
}
