import { useTranslator } from "#use-translator";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";
import styles from "./entry.module.css";

export function EntryBrand({ href = "/?from=logo" }: { href?: string }) {
  const tx = useTranslator();
  return (
    <Link href={href} className={styles.brand} aria-label={tx("ClanSync 홈")}>
      <BrandLogo />
    </Link>
  );
}
