"use client";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import styles from "./profile.module.css";

export function ProfilePanels({ overview, account }: { overview: ReactNode; account: ReactNode }) {
  return <Tabs defaultValue="overview" className={styles.profileCard}>
    <TabsList variant="line" className={styles.topTabs} aria-label="프로필 메뉴"><TabsTrigger value="overview">플레이어 소개</TabsTrigger><TabsTrigger value="account">계정 정보</TabsTrigger></TabsList>
    <TabsContent value="overview" keepMounted className={styles.panel}>{overview}</TabsContent>
    <TabsContent value="account" keepMounted className={styles.panel}>{account}</TabsContent>
  </Tabs>;
}
