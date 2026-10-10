"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Crown, Swords, UserRound, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { HallOfFame } from "./clan-hall-of-fame";
import { StatsMemberPicker } from "./stats-member-picker";
import { StatsDetailLoader, type StatsDetailCache } from "./stats-detail-loader";
import { ClanStatsSettings } from "./clan-stats-settings";

const IntraClanStats = dynamic(() => import("./clan-intra-stats").then((module) => module.IntraClanStats));
const ClanMatchHistory = dynamic(() => import("./clan-match-history").then((module) => module.ClanMatchHistory));
const PersonalStats = dynamic(() => import("./clan-personal-stats").then((module) => module.PersonalStats));

export function ClanStatsExperience({ gameSlug, clanId, model }: { gameSlug: string; clanId: string; model: ClanStatsPageModel }) {
  const [tab, setTab] = useState("hof");
  const [personId, setPersonId] = useState<string | null>(null);
  const showPersonalTab = model.permissions.viewPersonalRecords || (model.permissions.isStaff && model.permissions.setHofRules);
  const settingsFor = (scope: "hof" | "intra" | "records" | "personal") => <ClanStatsSettings scope={scope} model={model} gameSlug={gameSlug} clanId={clanId} />;
  // A refreshed model (score edit, settings change, or navigation) discards old detail responses.
  const { requests: cache } = useMemo(() => ({ model, requests: new Map() as StatsDetailCache }), [model]);
  const choosePerson = (id: string) => {
    if (!model.personal.people.some((person) => person.userId === id)) return;
    setPersonId(id);
    setTab("personal");
  };
  return <div className="mx-auto w-full max-w-[1120px] space-y-6">
    <Tabs value={tab} onValueChange={(value) => { setTab(value); if (value === "personal") setPersonId(null); }} className="w-full gap-4"><div className="flex items-center gap-2 border-b"><TabsList variant="line" className="h-auto min-w-0 flex-1 justify-start gap-0 [&_button]:gap-1 [&_button]:px-1 [&_button]:text-xs sm:[&_button]:text-sm [&_svg]:hidden sm:[&_svg]:block"><TabsTrigger value="hof"><Crown className="size-4" aria-hidden="true" /> 명예의 전당</TabsTrigger>{model.permissions.viewIntraStats !== false && <TabsTrigger value="intra"><Swords className="size-4" aria-hidden="true" /> 내전 통계</TabsTrigger>}{model.permissions.viewMatchRecords && <TabsTrigger value="records"><History className="size-4" aria-hidden="true" /> 경기 기록</TabsTrigger>}{showPersonalTab && <TabsTrigger value="personal"><UserRound className="size-4" aria-hidden="true" /> 개인 기록</TabsTrigger>}</TabsList>{model.hof.exposeHof && <Badge variant="secondary" className="hidden sm:inline-flex">명예의 전당 공개 중</Badge>}</div>
      <TabsContent value="hof"><HallOfFame model={model} clanId={clanId} onChoosePerson={choosePerson} settings={settingsFor("hof")} /></TabsContent>
      {model.permissions.viewIntraStats !== false && <TabsContent value="intra"><IntraClanStats model={model} settings={settingsFor("intra")} /></TabsContent>}
      {model.permissions.viewMatchRecords && <TabsContent value="records">{model.deferredDetails
        ? <StatsDetailLoader cache={cache} initial={{ kind: "archive", archive: model.archive }} url={`/api/clans/${clanId}/stats?section=archive`}>{(detail) => detail.kind === "archive" && <ClanMatchHistory model={{ ...model, archive: detail.archive }} settings={settingsFor("records")} />}</StatsDetailLoader>
        : <ClanMatchHistory model={model} settings={settingsFor("records")} />}</TabsContent>}
      {showPersonalTab && <TabsContent value="personal">{!model.permissions.viewPersonalRecords ? <section className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4"><p className="text-sm text-muted-foreground">개인 기록 열람이 제한되어 있습니다.</p>{settingsFor("personal")}</section> : personId ? model.deferredDetails
        ? <StatsDetailLoader cache={cache} url={`/api/clans/${clanId}/stats?section=personal&userId=${personId}`}>{(detail) => detail.kind === "personal" && <PersonalStats key={personId} model={{ ...model, personal: { ...model.personal, people: [detail.person] } }} selectedId={personId} onBack={() => setPersonId(null)} gameSlug={gameSlug} clanId={clanId} settings={settingsFor("personal")} />}</StatsDetailLoader>
        : <PersonalStats key={personId} model={model} selectedId={personId} onBack={() => setPersonId(null)} gameSlug={gameSlug} clanId={clanId} settings={settingsFor("personal")} />
        : <StatsMemberPicker people={model.personal.people} onSelect={choosePerson} settings={settingsFor("personal")} />}</TabsContent>}
    </Tabs>
  </div>;
}
