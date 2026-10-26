import { shelfGeometry, type ShowcaseCabinet } from "@/lib/showcase/domain";
import styles from "./showcase.module.css";

/** The display surface extends around the saved placement rail, not the reverse. */
export function ShowcaseShelf({ template, index }: { template: ShowcaseCabinet["template"]; index: number }) {
  const rail = shelfGeometry(template, index);
  const fullWidth = template === "classic";
  return <div className={styles.shelf} data-shelf={index} style={{
    left: `${fullWidth ? 4 : rail.left}%`, width: `${fullWidth ? 92 : rail.width}%`,
    top: `${rail.top}%`, height: `${6 + index * .8}%`,
  }} aria-hidden="true">
    <svg viewBox="10 148 1180 134" preserveAspectRatio="none"><image href="/images/showcase/shelf-v2.webp" width="1200" height="400" /></svg>
  </div>;
}
