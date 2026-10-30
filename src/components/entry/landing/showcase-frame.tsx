import type { ReactNode } from "react";
import styles from "./showcase.module.css";

export function ShowcaseFrame({ title, description, className = "", reverse = false, children }: { title: string; description: string; className?: string; reverse?: boolean; children: ReactNode }) {
  return <figure className={`${styles.frame} ${reverse ? styles.reverse : ""} ${className}`}>
    <div className={styles.canvas}>{children}</div>
    <figcaption><h3>{title}</h3><p>{description}</p></figcaption>
  </figure>;
}
