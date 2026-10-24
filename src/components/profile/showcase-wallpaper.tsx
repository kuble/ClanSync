import { useId } from "react";
import type { ShowcaseCabinet } from "@/lib/showcase/domain";
import styles from "./showcase.module.css";

/** The source art combines green plaster and warm wood. Tint only the plaster. */
export function ShowcaseWallpaper({ template, background }: Pick<ShowcaseCabinet, "template" | "background">) {
  const id = useId().replace(/:/g, "");
  if (background === "forest") return null;
  const image = template === "focus" ? "/images/showcase/cabinet-focus-bare-v4.webp" : "/images/showcase/cabinet-unlit-v3.webp";
  return <svg className={styles.wallpaper} viewBox="0 0 1200 923" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <filter id={`${id}-plaster`} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
        {/* Green minus red isolates both wall areas around the arch, excluding warm wood. */}
        <feColorMatrix type="matrix" values={background === "cream" ? "-128 128 0 0 0  -128 128 0 0 0  -128 128 0 0 0  0 0 0 1 0" : "-32 32 0 0 -.04  -32 32 0 0 -.04  -32 32 0 0 -.04  0 0 0 1 0"} />
        <feGaussianBlur stdDeviation="1.5" />
      </filter>
      <filter id={`${id}-cream`} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
        <feColorMatrix type="saturate" values="0" />
        {/* Lift the plaster while retaining the continuous contact-shadow gradient. */}
        <feComponentTransfer>
          <feFuncR type="gamma" amplitude="1.45" exponent=".28" offset="0" />
          <feFuncG type="gamma" amplitude="1.39" exponent=".28" offset="0" />
          <feFuncB type="gamma" amplitude="1.28" exponent=".28" offset="0" />
        </feComponentTransfer>
      </filter>
      <mask id={`${id}-wall`} maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="923" style={{ maskType: "luminance" }}>
        <image href={image} width="1200" height="923" preserveAspectRatio="none" filter={`url(#${id}-plaster)`} />
      </mask>
    </defs>
    <image href={image} width="1200" height="923" preserveAspectRatio="none" mask={`url(#${id}-wall)`} filter={background === "cream" ? `url(#${id}-cream)` : undefined} />
  </svg>;
}
