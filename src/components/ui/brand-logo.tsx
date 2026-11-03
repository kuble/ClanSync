import Image from "next/image";
import { cn } from "@/lib/utils";
import styles from "./brand-logo.module.css";

export function BrandSymbol({ size, className }: { size?: number; className?: string }) {
  return (
    <span className={cn(styles.symbol, className)} style={size ? { width: size } : undefined} aria-hidden="true" data-brand-symbol>
      <Image src="/brand/clansync-symbol.png" alt="" width={289} height={227} sizes="32px" loading="eager" draggable={false} className={cn(styles.lightImage, styles.symbolImage)} />
      <Image src="/brand/clansync-symbol-dark.png" alt="" width={286} height={230} sizes="32px" loading="eager" draggable={false} className={cn(styles.darkImage, styles.symbolImage)} />
    </span>
  );
}

export function BrandLogo() {
  return (
    <span className={styles.logo} aria-hidden="true">
      <BrandSymbol />
      <span className={styles.wordmark} data-brand-wordmark>
        <Image src="/brand/clansync-wordmark.png" alt="" width={1942} height={809} sizes="(max-width: 560px) 150px, 180px" loading="eager" draggable={false} className={cn(styles.image, styles.lightImage, styles.wordmarkImage)} />
        <Image src="/brand/clansync-dark-d1.png" alt="" width={2172} height={724} sizes="256px" loading="eager" draggable={false} className={cn(styles.image, styles.darkImage, styles.darkWordmarkImage)} />
      </span>
    </span>
  );
}
