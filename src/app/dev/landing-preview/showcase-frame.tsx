import type { ReactNode } from "react";
import styles from "./showcase.module.css";

export function ShowcaseFrame({ title, description, className = "", children }: { title: string; description: string; className?: string; children: ReactNode }) {
  return <figure className={`${styles.frame} ${className}`}>
    <div className={styles.canvas}>{children}</div>
    <figcaption><h3>{title}</h3><p>{description}</p></figcaption>
  </figure>;
}
