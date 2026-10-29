import { NORMAL_CLAN_BANNERS } from "@/lib/clan/banner-catalog";

export const MVP_STORE_SLUGS = [
  ...NORMAL_CLAN_BANNERS.map(design => design.sku),
  "clan_banner_slot",
  "clan_banner_midnight",
  "clan_banner_sunset",
  "clan_emoji_slots_3",
  "clan_photo_frames",
  "clan_photo_stickers",
  "profile_entrance_fx",
] as const;

export type MvpStoreSlug = (typeof MVP_STORE_SLUGS)[number];

export function isMvpStoreSlug(s: string): s is MvpStoreSlug {
  return (MVP_STORE_SLUGS as readonly string[]).includes(s);
}
