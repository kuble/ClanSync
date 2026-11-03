"use client";
import { useState, type ReactNode } from "react";
import { ClanSectionPicker } from "@/components/main-clan/clan-section-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import styles from "./profile.module.css";

export function ProfilePanels({ overview, account }: { overview: ReactNode; account: ReactNode }) {
  const [selected, setSelected] = useState("overview");
  const sections = [{ value: "overview", label: "플레이어 소개" }, { value: "account", label: "계정 정보" }];
  return <Tabs value={selected} onValueChange={setSelected} className={styles.profileCard}>
    <ClanSectionPicker label="프로필 화면 선택" items={sections.map(({value, label}) => ({
      label, selected: selected === value, onSelect: () => setSelected(value),
    }))}>
      <TabsList variant="line" className={styles.topTabs} aria-label="프로필 메뉴">
        {sections.map(({value, label}) => <TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}
      </TabsList>
    </ClanSectionPicker>
    <TabsContent value="overview" keepMounted className={styles.panel}>{overview}</TabsContent>
    <TabsContent value="account" keepMounted className={styles.panel}>{account}</TabsContent>
  </Tabs>;
}
