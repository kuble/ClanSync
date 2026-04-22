import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  CLAN_PERMISSION_DEFAULTS,
  LOCKED_LEADER_ONLY,
  LOCKED_OFFICER_PLUS,
  type ClanMemberRole,
  type ClanPermissionKey,
} from "@/lib/clan/permission-defaults";

/**
 * D-PERM-01 — 서버 컴포넌트·액션용 권한 판정 (Phase 2+ SQL 함수와 동일 규칙).
 */
export async function hasClanPermission(
  supabase: SupabaseClient<Database>,
  userId: string,
  clanId: string,
  perm: ClanPermissionKey,
): Promise<boolean> {
  const { data: row } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", clanId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!row?.role) return false;
  const role = row.role as ClanMemberRole;

  if (LOCKED_LEADER_ONLY.has(perm)) return role === "leader";
  if (LOCKED_OFFICER_PLUS.has(perm)) {
    return role === "leader" || role === "officer";
  }

  const { data: settings } = await supabase
    .from("clan_settings")
    .select("permissions")
    .eq("clan_id", clanId)
    .maybeSingle();

  const raw = settings?.permissions as Record<string, unknown> | null;
  const fromDb = raw?.[perm];
  let allowed: readonly string[];
  if (Array.isArray(fromDb)) {
    allowed = fromDb.filter((x): x is string => typeof x === "string");
    if (allowed.length === 0) {
      allowed = CLAN_PERMISSION_DEFAULTS[perm];
    }
  } else {
    allowed = CLAN_PERMISSION_DEFAULTS[perm];
  }

  return (allowed as readonly string[]).includes(role);
}
