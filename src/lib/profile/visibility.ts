import type { HousingCatalogItem, HousingInventoryItem } from "@/lib/housing/types";
import type { ProfileGameIdentity, ProfileMembership } from "@/components/profile/profile-identity";
import type { NamecardAppearance } from "./namecard";

export type PlayerIdentity = { userId: string; intro: string; memberships: ProfileMembership[]; games: ProfileGameIdentity[]; appearance: NamecardAppearance };

export type PlayerProfileVisit = {
  userId: string;
  intro: string | null;
  games: { slug: string; nameKo: string }[];
  memberships: ProfileMembership[];
  housing: {
    catalog: HousingCatalogItem[];
    inventory: HousingInventoryItem[];
    room: { wallpaper: string; floor: string };
  };
};
