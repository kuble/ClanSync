import type { ProfileGameIdentity, ProfileMembership } from "@/components/profile/profile-identity";
import type { NamecardAppearance } from "./namecard";
import type { PlayerProfile } from "@/lib/clan/player-profile";

export type PlayerIdentity = { userId: string; intro: string; memberships: ProfileMembership[]; games: ProfileGameIdentity[]; appearance: NamecardAppearance; clanProfile?: Pick<PlayerProfile, "gender" | "birthYear" | "clanJoinedAt"> & { altAccounts: string[]; canManageAlts?: true } };

export type PlayerProfileVisit = {
  userId: string;
  intro: string | null;
  games: { slug: string; nameKo: string }[];
  memberships: ProfileMembership[];
};
