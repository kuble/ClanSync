"use client";

import Image from "next/image";
import { useId } from "react";
import type { PersonalEmblem } from "@/lib/personal-emblems/types";
import { awardColor, enamelFilter } from "../../../public/personal-emblems/v1/catalog.mjs";
import styles from "./personal-emblem-case.module.css";

export function EmblemArtwork({ emblem, className, eager = false }: {
  emblem: PersonalEmblem; className?: string; eager?: boolean;
}) {
  const filterId = "emblem-" + useId().replace(/[^a-z0-9-]/gi, "").toLowerCase();
  let color: string | undefined;
  if (emblem.kind === "award" && emblem.period && emblem.date) {
    try { color = awardColor(emblem.period, emblem.date)[1]; }
    catch { /* An invalid legacy period keeps the original enamel. */ }
  }
  return <span className={className} data-emblem-artwork>
    {color && <svg aria-hidden="true" focusable="false" className={styles.filterDefs} width="0" height="0">
      <defs dangerouslySetInnerHTML={{ __html: enamelFilter(filterId, color) }} />
    </svg>}
    <Image src={emblem.artwork} alt="" width={256} height={256}
      loading={eager ? "eager" : "lazy"} sizes="(max-width: 640px) 160px, 256px"
      style={color ? { filter: `url(#${filterId})` } : undefined} className={styles.artworkImage} />
  </span>;
}
