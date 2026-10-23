import type { HousingCatalogItem, HousingInventoryItem } from "@/lib/housing/types";
import type { ProfileMembership } from "@/components/profile/profile-identity";

export const DEFAULT_PROFILE_VISIBILITY = {
  room_public: true,
  show_intro: false,
  show_games: false,
  show_clan: false,
  show_emblems: false,
};
export type ProfileVisibility = typeof DEFAULT_PROFILE_VISIBILITY;
export const PROFILE_VISIBILITY_KEYS = Object.keys(DEFAULT_PROFILE_VISIBILITY) as (keyof ProfileVisibility)[];

export type PlayerProfileVisit = {
  userId: string;
  nickname: string;
  intro: string | null;
  games: { slug: string; nameKo: string }[];
  memberships: (ProfileMembership & { showEmblems: boolean })[];
  housing: {
    catalog: HousingCatalogItem[];
    inventory: HousingInventoryItem[];
    room: { wallpaper: string; floor: string };
  };
};
