import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";
import styles from "./entry.module.css";

export function EntryBrand({ href = "/?from=logo" }: { href?: string }) {
  return (
    <Link href={href} className={styles.brand} aria-label="ClanSync 홈">
      <BrandLogo />
    </Link>
  );
}
