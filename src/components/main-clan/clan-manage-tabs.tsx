"use client";

import { useTranslator } from "#use-translator";
import { useEffect } from "react";
import { Bell, BarChart3, CreditCard, ImageIcon, LayoutDashboard, Megaphone, Swords, UserRoundPlus, Users } from "lucide-react";
import { MANAGE_SECTIONS, type ManageTab } from "@/lib/clan/manage-sections";
import { NavigationIcon } from "@/components/ui/navigation-icon";
import { ClanSectionLinks } from "./clan-section-links";

const icons = { overview: LayoutDashboard, promotion: Megaphone, notices: Megaphone, appearance: ImageIcon, requests: UserRoundPlus, members: Users, balance: Swords, notifications: Bell, insights: BarChart3, subscription: CreditCard };
const visibleSections = MANAGE_SECTIONS.filter(section => section.key !== "notices");

/** Server navigation loads only the selected section, including on refresh/back. */
export function ClanManageNavigation({ selected, pendingCount, basePath }: {
  selected: ManageTab;
  pendingCount: number;
  basePath: string;
}) {
  const tx = useTranslator();
  useEffect(() => {
    const convertLegacyLink = () => {
      if (window.location.hash !== "#subscription") return;
      const current = new URL(window.location.href);
      current.hash = "";
      current.searchParams.set("tab", "subscription");
      // Next can learn the initial hash in its route cache; reload the normalized entry.
      window.history.replaceState(window.history.state, "", `${basePath}${current.search}`);
      window.location.reload();
    };
    convertLegacyLink();
    window.addEventListener("hashchange", convertLegacyLink);
    return () => window.removeEventListener("hashchange", convertLegacyLink);
  }, [basePath]);

  const group = visibleSections.find((section) => section.key === selected)?.group;
  const groups = [...new Set(visibleSections.map((section) => section.group))];
  const requestBadge = pendingCount > 0 ? <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] tabular-nums text-primary">{pendingCount}</span> : undefined;
  return <div className="grid min-w-0 gap-2">
    <ClanSectionLinks label={tx("클랜 관리 분류")} items={groups.map((name) => ({
      label: name, href: `${basePath}?tab=${name === group ? selected : visibleSections.find((section) => section.group === name)!.key}`,
      selected: name === group, badge: name === "구성원 관리" ? requestBadge : undefined,
    }))} />
    <ClanSectionLinks label={tx("클랜 관리 항목")} compact items={visibleSections.filter((section) => section.group === group).map(({ key, label, description }) => ({
      label, description, href: `${basePath}?tab=${key}`, selected: key === selected,
      icon: <NavigationIcon icon={icons[key]} label={tx(label)} />, badge: key === "requests" ? requestBadge : undefined,
    }))} />
  </div>;
}
