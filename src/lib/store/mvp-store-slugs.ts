export const MVP_STORE_SLUGS = [
  "clan_banner_slot",
  "profile_entrance_fx",
] as const;

export type MvpStoreSlug = (typeof MVP_STORE_SLUGS)[number];

export function isMvpStoreSlug(s: string): s is MvpStoreSlug {
  return (MVP_STORE_SLUGS as readonly string[]).includes(s);
}
