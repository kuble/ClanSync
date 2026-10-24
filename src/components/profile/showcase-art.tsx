import type { CSSProperties } from "react";
import styles from "./showcase.module.css";

export function ShowcaseArt({ sprite, imagePath, className = "" }: { sprite: number; imagePath?: string | null; className?: string }) {
  const style: CSSProperties = imagePath
    ? { backgroundImage: `url("${imagePath}")`, backgroundSize: "contain", backgroundPosition: "center" }
    : { backgroundPosition: `${(sprite % 3) * 50}% ${Math.floor(sprite / 3) * 50}%` };
  return <span aria-hidden className={`${styles.art} ${className}`} style={style} />;
}
