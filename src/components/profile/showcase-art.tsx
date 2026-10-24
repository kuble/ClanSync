import { SHOWCASE_ART } from "@/lib/showcase/art";
import { useId } from "react";
import styles from "./showcase.module.css";

export function ShowcaseArt({ sprite, imagePath, className = "" }: { sprite: number; imagePath?: string | null; className?: string }) {
  const clipId = useId();
  const art = SHOWCASE_ART[sprite];
  if (imagePath || !art) return <span aria-hidden className={`${styles.art} ${styles.customArt} ${className}`} style={{ backgroundImage: imagePath ? `url("${imagePath}")` : undefined }} />;
  return <svg aria-hidden="true" focusable="false" className={`${styles.art} ${className}`} viewBox={art.bounds.join(" ")} preserveAspectRatio="xMidYMax meet">
    <defs><clipPath id={clipId}><rect x={art.bounds[0]} y={art.bounds[1]} width={art.bounds[2]} height={art.bounds[3]} /></clipPath></defs>
    <image href={art.path} width={art.size[0]} height={art.size[1]} clipPath={`url(#${clipId})`} />
  </svg>;
}
