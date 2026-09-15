import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  CLAN_PERMISSION_DEFAULTS,
  LOCKED_LEADER_ONLY,
  LOCKED_OFFICER_PLUS,
  type ClanMemberRole,
  type ClanPermissionKey,
} from "@/lib/clan/permission-defaults";

export type ClanAccessSnapshot = {
  membership:
    | Database["public"]["Functions"]["select_my_clan_membership"]["Returns"][number]
    | null;
  permissions: Json | null;
};

export async function readClanAccessSnapshot(
  supabase: SupabaseClient<Database>,
  clanId: string,
): Promise<ClanAccessSnapshot> {
  const [membership, settings] = await Promise.all([
    supabase.rpc("select_my_clan_membership", { p_clan_id: clanId }),
    supabase
      .from("clan_settings")
      .select("permissions")
      .eq("clan_id", clanId)
      .maybeSingle(),
  ]);
  return {
    membership: membership.error ? null : (membership.data?.[0] ?? null),
    permissions: settings.error ? null : (settings.data?.permissions ?? null),
  };
}

/** Call only after verifying active membership. Invalid settings fail closed. */
export function resolveClanPermission(
  role: ClanMemberRole,
  perm: ClanPermissionKey,
  permissions: unknown,
): boolean {
  if (LOCKED_LEADER_ONLY.has(perm)) return role === "leader";
  if (LOCKED_OFFICER_PLUS.has(perm))
    return role === "leader" || role === "officer";
  if (
    !permissions ||
    typeof permissions !== "object" ||
    Array.isArray(permissions)
  )
    return false;
  const value = (permissions as Record<string, unknown>)[perm];
  const allowed = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : value === undefined
      ? CLAN_PERMISSION_DEFAULTS[perm]
      : [];
  return (allowed as readonly string[]).includes(role);
}
