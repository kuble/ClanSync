import { namecardFrame } from "@/lib/profile/frames";
import styles from "./namecard-frame-artwork.module.css";
import { COSMETIC_COLOR_PRESETS } from "@/lib/cosmetics/color-presets";

export function NamecardFrameArtwork({ code, category = "frame", paletteId }: { code?: string | null; category?: "portrait" | "frame"; paletteId?: string | null }) {
  const design = namecardFrame(code, category);
  const palette = COSMETIC_COLOR_PRESETS.find(item => item.id === paletteId);
  return design ? <span aria-hidden="true" className={styles.artwork} data-frame-kind={category} data-frame-design={design.id} data-frame-palette={palette?.id ?? "default"} style={palette ? { color: palette.swatch } : undefined}><span /><span /></span> : null;
}
