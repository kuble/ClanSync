"use client";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import styles from "./profile.module.css";

export function ProfilePanels({ room, account }: { room: ReactNode; account: ReactNode }) {
  return <Tabs defaultValue="room" className={styles.profileCard}>
    <TabsList variant="line" className={styles.topTabs} aria-label="프로필 메뉴"><TabsTrigger value="room">3D 미니룸</TabsTrigger><TabsTrigger value="account">계정 정보</TabsTrigger></TabsList>
    <TabsContent value="room" keepMounted className={styles.panel}>{room}</TabsContent>
    <TabsContent value="account" keepMounted className={styles.panel}>{account}</TabsContent>
  </Tabs>;
}
