import type { CSSProperties } from "react";
import { NORMAL_CLAN_BANNERS, type ClanBannerSelection } from "@/lib/clan/banner-catalog";
import { COSMETIC_COLOR_PRESETS } from "@/lib/cosmetics/color-presets";
import styles from "./clan-banner-artwork.module.css";

export function ClanBannerArtwork({ selection }: { selection: ClanBannerSelection }) {
  const design = NORMAL_CLAN_BANNERS.find(item => item.id === selection.designId) ?? NORMAL_CLAN_BANNERS[0];
  const palette = COSMETIC_COLOR_PRESETS.find(item => item.id === selection.paletteId) ?? COSMETIC_COLOR_PRESETS[0];
  return <span aria-hidden="true" className={styles.artwork} data-banner-design={design.id} data-banner-palette={palette.id} style={{
    "--banner-background": palette.background,
    "--banner-pattern": palette.pattern,
    "--banner-mask": `url("${design.maskUrl}")`,
  } as CSSProperties}><span className={styles.pattern} /></span>;
}
