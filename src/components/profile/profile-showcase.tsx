"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ShowcaseResult } from "@/lib/showcase/domain";
import { ShowcaseEditor } from "./showcase-editor";
import styles from "./showcase.module.css";

export function ProfileShowcase({ initial, userId, readOnly = false }: { initial: ShowcaseResult; userId: string; readOnly?: boolean }) {
  const router = useRouter();
  if (!initial.ok) return <section className={styles.unavailable}><p role="alert">{initial.error}</p><Button onClick={() => router.refresh()}>다시 불러오기</Button></section>;
  return <ShowcaseEditor key={userId} initial={initial.state} userId={userId} readOnly={readOnly} />;
}
