import type { ShowcaseCabinet } from "@/lib/showcase/domain";
import styles from "./showcase.module.css";
import { ShowcaseBackdrop } from "./showcase-wallpaper";
import { ShowcaseShelf } from "./showcase-shelf";

export function ShowcaseTemplatePreview({ template }: { template: ShowcaseCabinet["template"] }) {
  return <div className={`${styles.templatePreview} ${template === "focus" ? styles.focus : ""}`} aria-hidden="true">
    <ShowcaseBackdrop template={template} background="forest" />
    {[0, 1, 2].map(index => <ShowcaseShelf key={index} template={template} index={index} />)}
  </div>;
}
