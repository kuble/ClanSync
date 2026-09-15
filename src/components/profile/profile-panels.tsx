"use client";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import styles from "./profile.module.css";

export function ProfilePanels({ summary, games }: { summary: ReactNode; games: ReactNode }) {
  return <Tabs defaultValue="summary" className={styles.profileCard}>
    <TabsList variant="line" className={styles.topTabs}><TabsTrigger value="summary">요약</TabsTrigger><TabsTrigger value="games">게임별</TabsTrigger></TabsList>
    <TabsContent value="summary" className={styles.panel}>{summary}</TabsContent>
    <TabsContent value="games" className={styles.panel}>{games}</TabsContent>
  </Tabs>;
}
