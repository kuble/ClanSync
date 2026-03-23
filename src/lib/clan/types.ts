export type ClanMemberRole = "leader" | "officer" | "member";

export type ClanMemberStatus = "pending" | "active" | "left" | "banned";

export type ClanSubscriptionTier = "free" | "pro";

export interface ClanLayoutContext {
  locale: string;
  gameSlug: string;
  clanId: string;
  clan: {
    id: string;
    name: string;
    description: string | null;
  };
  game: {
    slug: string;
    displayName: string;
  };
  membership: {
    role: ClanMemberRole;
    status: ClanMemberStatus;
  };
  subscriptionTier: ClanSubscriptionTier;
  /** Supabase 미설정 등으로 목업 컨텍스트인지 표시 */
  isMock: boolean;
}

export function isOfficerRole(role: ClanMemberRole): boolean {
  return role === "leader" || role === "officer";
}
