import Link from "next/link";
import { Layers3 } from "lucide-react";
import styles from "./entry.module.css";

export function EntryBrand({ href = "/?from=logo" }: { href?: string }) {
  return (
    <Link href={href} className={styles.brand} aria-label="ClanSync 홈">
      <span className={styles.brandMark}><Layers3 size={19} aria-hidden="true" /></span>
      <span>ClanSync</span>
    </Link>
  );
}
