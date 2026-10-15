"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BarChart3, CreditCard, ImageIcon, LayoutDashboard, Megaphone, Swords, UserRoundPlus, Users } from "lucide-react";
import { MANAGE_SECTIONS, type ManageTab } from "@/lib/clan/manage-sections";
import { NavigationIcon } from "@/components/ui/navigation-icon";
import { ClanSectionLinks } from "./clan-section-links";

const icons = { overview: LayoutDashboard, notices: Megaphone, appearance: ImageIcon, requests: UserRoundPlus, members: Users, balance: Swords, notifications: Bell, insights: BarChart3, subscription: CreditCard };
const visibleSections = MANAGE_SECTIONS.filter(section => section.key !== "notices");
// Query changes can remount the page; convert each legacy link once per document.
const convertedLegacyLinks = new Set<string>();

/** Server navigation loads only the selected section, including on refresh/back. */
export function ClanManageNavigation({ selected, pendingCount, basePath }: {
  selected: ManageTab;
  pendingCount: number;
  basePath: string;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  useEffect(() => {
    // Preserve old plan links saved before query-based navigation.
    if (window.location.hash === "#subscription") {
      const firstVisit = !convertedLegacyLinks.has(basePath);
      convertedLegacyLinks.add(basePath);
      const current = new URL(window.location.href);
      current.hash = "";
      window.history.replaceState(window.history.state, "", current);
      if (firstVisit && selected !== "subscription") start(() => router.replace(`${basePath}?tab=subscription`, { scroll: false }));
    }
  }, [basePath, router, selected]);

  const group = visibleSections.find((section) => section.key === selected)?.group;
  const groups = [...new Set(visibleSections.map((section) => section.group))];
  const requestBadge = pendingCount > 0 ? <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] tabular-nums text-primary">{pendingCount}</span> : undefined;
  return <div className="min-w-0 space-y-2">
    <ClanSectionLinks label="클랜 관리 분류" items={groups.map((name) => ({
      label: name, href: `${basePath}?tab=${name === group ? selected : visibleSections.find((section) => section.group === name)!.key}`,
      selected: name === group, badge: name === "구성원 관리" ? requestBadge : undefined,
    }))} />
    <ClanSectionLinks label="클랜 관리 항목" compact items={visibleSections.filter((section) => section.group === group).map(({ key, label }) => ({
      label, href: `${basePath}?tab=${key}`, selected: key === selected,
      icon: <NavigationIcon icon={icons[key]} label={label} />, badge: key === "requests" ? requestBadge : undefined,
    }))} />
  </div>;
}
