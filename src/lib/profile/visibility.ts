import type { HousingCatalogItem, HousingInventoryItem } from "@/lib/housing/types";
import type { ProfileMembership } from "@/components/profile/profile-identity";

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
