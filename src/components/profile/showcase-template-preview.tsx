import { shelfGeometry, type ShowcaseCabinet } from "@/lib/showcase/domain";
import styles from "./showcase.module.css";

export function ShowcaseTemplatePreview({ template }: { template: ShowcaseCabinet["template"] }) {
  return <div className={`${styles.templatePreview} ${template === "focus" ? styles.focus : ""}`} aria-hidden="true">
    <div className={styles.backboard} />
    {[0, 1, 2].map(index => {
      const rail = shelfGeometry(template, index);
      return <div key={index} className={styles.shelf} style={{ left: `${rail.left}%`, width: `${rail.width}%`, top: `${rail.top}%` }}><svg viewBox="10 148 1180 134" preserveAspectRatio="none"><image href="/images/showcase/shelf-v2.webp" width="1200" height="400" /></svg></div>;
    })}
  </div>;
}
