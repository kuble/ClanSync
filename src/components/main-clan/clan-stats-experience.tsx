"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Crown, Swords, UserRound, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { HallOfFame } from "./clan-hall-of-fame";
import { StatTitle } from "./stat-help";
import { StatsMemberPicker } from "./stats-member-picker";
import { StatsDetailLoader, type StatsDetailCache } from "./stats-detail-loader";

const IntraClanStats = dynamic(() => import("./clan-intra-stats").then((module) => module.IntraClanStats));
const ClanMatchHistory = dynamic(() => import("./clan-match-history").then((module) => module.ClanMatchHistory));
const PersonalStats = dynamic(() => import("./clan-personal-stats").then((module) => module.PersonalStats));

export function ClanStatsExperience({ gameSlug, clanId, model }: { gameSlug: string; clanId: string; model: ClanStatsPageModel }) {
  const [tab, setTab] = useState("hof");
  const [personId, setPersonId] = useState<string | null>(null);
  // A refreshed model (score edit, settings change, or navigation) discards old detail responses.
  const { requests: cache } = useMemo(() => ({ model, requests: new Map() as StatsDetailCache }), [model]);
  const choosePerson = (id: string) => {
    if (!model.personal.people.some((person) => person.userId === id)) return;
    setPersonId(id);
    setTab("personal");
  };
  return <div className="mx-auto w-full max-w-[1120px] space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="text-xl font-bold tracking-tight"><StatTitle title="클랜 통계" help="명예의 전당, 내전 통계, 경기 기록과 개인 기록을 살펴봅니다." /></h2></div>{model.hof.exposeHof && <Badge variant="secondary">명예의 전당 공개 중</Badge>}</div>
    <Tabs value={tab} onValueChange={(value) => { setTab(value); if (value === "personal") setPersonId(null); }} className="w-full"><TabsList variant="line" className="mb-4 h-auto w-full justify-start gap-0 border-b [&_button]:gap-1 [&_button]:px-1 [&_button]:text-xs sm:[&_button]:text-sm [&_svg]:hidden sm:[&_svg]:block"><TabsTrigger value="hof"><Crown className="size-4" aria-hidden="true" /> 명예의 전당</TabsTrigger><TabsTrigger value="intra"><Swords className="size-4" aria-hidden="true" /> 내전 통계</TabsTrigger>{model.permissions.viewMatchRecords && <TabsTrigger value="records"><History className="size-4" aria-hidden="true" /> 경기 기록</TabsTrigger>}{model.permissions.viewPersonalRecords && <TabsTrigger value="personal"><UserRound className="size-4" aria-hidden="true" /> 개인 기록</TabsTrigger>}</TabsList>
      <TabsContent value="hof"><HallOfFame model={model} gameSlug={gameSlug} clanId={clanId} onChoosePerson={choosePerson} /></TabsContent>
      <TabsContent value="intra"><IntraClanStats model={model} /></TabsContent>
      {model.permissions.viewMatchRecords && <TabsContent value="records">{model.deferredDetails
        ? <StatsDetailLoader cache={cache} initial={{ kind: "archive", archive: model.archive }} url={`/api/clans/${clanId}/stats?section=archive`}>{(detail) => detail.kind === "archive" && <ClanMatchHistory model={{ ...model, archive: detail.archive }} />}</StatsDetailLoader>
        : <ClanMatchHistory model={model} />}</TabsContent>}
      {model.permissions.viewPersonalRecords && <TabsContent value="personal">{personId ? model.deferredDetails
        ? <StatsDetailLoader cache={cache} url={`/api/clans/${clanId}/stats?section=personal&userId=${personId}`}>{(detail) => detail.kind === "personal" && <PersonalStats key={personId} model={{ ...model, personal: { ...model.personal, people: [detail.person] } }} selectedId={personId} onBack={() => setPersonId(null)} gameSlug={gameSlug} clanId={clanId} />}</StatsDetailLoader>
        : <PersonalStats key={personId} model={model} selectedId={personId} onBack={() => setPersonId(null)} gameSlug={gameSlug} clanId={clanId} />
        : <StatsMemberPicker people={model.personal.people} onSelect={choosePerson} />}</TabsContent>}
    </Tabs>
  </div>;
}
