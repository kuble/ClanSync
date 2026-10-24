import type { ShowcaseCabinet } from "@/lib/showcase/domain";
import styles from "./showcase.module.css";

/** Independent layers: wallpaper first, transparent wooden frame above it. */
export function ShowcaseBackdrop({ template, background }: Pick<ShowcaseCabinet, "template" | "background">) {
  return <>
    <div className={styles.wallpaper+" "+styles[background]} data-testid="showcase-wallpaper" aria-hidden="true" />
    <div className={styles.frame+(template === "focus" ? " "+styles.focusFrame : "")} data-testid="showcase-frame" aria-hidden="true" />
  </>;
}
