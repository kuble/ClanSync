import "server-only";
import { cache } from "react";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import {
  readClanAccessSnapshot,
  resolveClanPermission,
} from "@/lib/clan/clan-access-snapshot";
import type { ClanPermissionKey } from "@/lib/clan/permission-defaults";

/** Primitive keys and React.cache keep this snapshot within one RSC request. */
export const getRequestClanAccess = cache(async (clanId: string) => {
  const [supabase, user] = await Promise.all([
    getRequestClient(),
    getRequestUser(),
  ]);
  if (!user) return { membership: null, permissions: null };
  return readClanAccessSnapshot(supabase, clanId);
});

export async function hasRequestClanPermission(
  clanId: string,
  perm: ClanPermissionKey,
) {
  const access = await getRequestClanAccess(clanId);
  if (access.membership?.status !== "active") return false;
  return resolveClanPermission(
    access.membership.role,
    perm,
    access.permissions,
  );
}
