import { namecardFrame } from "@/lib/profile/frames";
import styles from "./namecard-frame-artwork.module.css";

export function NamecardFrameArtwork({ code, category = "frame" }: { code?: string | null; category?: "portrait" | "frame" }) {
  const design = namecardFrame(code, category);
  return design ? <span aria-hidden="true" className={styles.artwork} data-frame-kind={category} data-frame-design={design.id}><span /><span /></span> : null;
}
