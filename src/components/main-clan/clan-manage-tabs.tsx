"use client";

import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  UserRoundPlus,
  Users,
  CreditCard,
  Swords,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ManageTab =
  | "overview"
  | "requests"
  | "members"
  | "balance"
  | "subscription";

function subscribeToNavigation(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}
function readTab(fallback: ManageTab): ManageTab {
  const url = new URL(window.location.href);
  const value =
    url.hash === "#subscription" ? "subscription" : url.searchParams.get("tab");
  return value === "overview" ||
    value === "requests" ||
    value === "members" ||
    value === "balance" ||
    value === "subscription"
    ? value
    : fallback;
}
export function ClanManageTabs({
  initialTab,
  pendingCount,
  overview,
  requests,
  members,
  balance,
  subscription,
}: {
  initialTab: ManageTab;
  pendingCount: number;
  overview: ReactNode;
  requests: ReactNode;
  members: ReactNode;
  balance: ReactNode;
  subscription: ReactNode;
}) {
  const tab = useSyncExternalStore(
    subscribeToNavigation,
    () => readTab(initialTab),
    () => initialTab,
  );
  function change(next: string) {
    const url = new URL(window.location.href);
    url.hash = "";
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  const tabs = [
    { key: "overview", label: "개요", Icon: LayoutDashboard },
    { key: "requests", label: "가입 요청", Icon: UserRoundPlus },
    { key: "members", label: "구성원", Icon: Users },
    { key: "balance", label: "내전 관리 설정", Icon: Swords },
    { key: "subscription", label: "구독결제", Icon: CreditCard },
  ];
  return (
    <Tabs value={tab} onValueChange={change} className="w-full">
      <TabsList
        variant="line"
        aria-label="클랜 관리"
        className="mb-6 h-auto w-full justify-start gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-border pb-0 sm:gap-6"
      >
        {tabs.map(({ key, label, Icon }) => (
          <TabsTrigger
            key={key}
            value={key}
            className="shrink-0 gap-2 rounded-none px-1 py-3 text-[13px]"
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
            {key === "requests" && pendingCount > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] leading-none text-white">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="overview">{overview}</TabsContent>
      <TabsContent value="requests">{requests}</TabsContent>
      <TabsContent value="members">{members}</TabsContent>
      <TabsContent value="balance">{balance}</TabsContent>
      <TabsContent value="subscription">{subscription}</TabsContent>
    </Tabs>
  );
}
