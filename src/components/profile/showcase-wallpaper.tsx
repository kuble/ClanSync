import type { ShowcaseCabinet } from "@/lib/showcase/domain";
import styles from "./showcase.module.css";

/** Independent layers: wallpaper first, transparent wooden frame above it. */
export function ShowcaseBackdrop({ template, background }: Pick<ShowcaseCabinet, "template" | "background">) {
  return <>
    <div className={styles.wallpaper+" "+styles[background]} data-testid="showcase-wallpaper" aria-hidden="true" />
    <div className={styles.frame+(template === "focus" ? " "+styles.focusFrame : "")} data-testid="showcase-frame" aria-hidden="true" />
    <div className={styles.recess} data-testid="showcase-recess" aria-hidden="true">
      <span className={styles.innerLeft} />
      <span className={styles.innerRight} />
      <span className={styles.innerTop} />
      <span className={styles.innerBottom} />
      <span className={styles.backShadow} />
    </div>
  </>;
}
