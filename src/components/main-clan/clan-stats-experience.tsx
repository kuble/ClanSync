"use client";

import { useTranslator } from "#use-translator";
import { useMemo, useState } from "react";
import { Crown, Swords, UserRound, History } from "lucide-react";
import { ClanSectionPicker } from "./clan-section-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { HallOfFame } from "./clan-hall-of-fame";
import { StatsPlayerBanner } from "./stats-emblems";
import { StatsMemberPicker } from "./stats-member-picker";
import { StatsDetailLoader, type StatsDetailCache } from "./stats-detail-loader";
import { ClanStatsSettings } from "./clan-stats-settings";

import { IntraClanStats } from "./clan-intra-stats";
import { ClanMatchHistory } from "./clan-match-history";
import { PersonalStats } from "./clan-personal-stats";
import { Button } from "@/components/ui/button";

export function ClanStatsExperience({ gameSlug, clanId, model, initialPlayer }: { gameSlug: string; clanId: string; model: ClanStatsPageModel; initialPlayer?: string }) {
  const tx = useTranslator();
  const requestedPersonId = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(initialPlayer ?? "") ? initialPlayer : undefined;
  const showPersonalTab = true;
  const people = model.personal.profilePeople ?? model.personal.people;
  const defaultPersonId = null;
  const [tab, setTab] = useState(initialPlayer && showPersonalTab ? "personal" : "hof");
  const [personId, setPersonId] = useState<string | null>(requestedPersonId ?? defaultPersonId);
  const canViewSelectedStats = model.permissions.viewPersonalRecords && (!personId || model.personal.people.some(person => person.userId === personId));
  const settingsFor = (scope: "hof" | "intra" | "records" | "personal") => <ClanStatsSettings scope={scope} model={model} gameSlug={gameSlug} clanId={clanId} />;
  // A refreshed model (score edit, settings change, or navigation) discards old detail responses.
  const { requests: cache } = useMemo(() => ({ model, requests: new Map() as StatsDetailCache }), [model]);
  const choosePerson = (id: string) => {
    if (!people.some((person) => person.userId === id)) return;
    setPersonId(id);
    setTab("personal");
  };
  const sections = [
    { value: "hof", label: "명예의 전당", icon: Crown },
    ...(model.permissions.viewIntraStats !== false ? [{ value: "intra", label: "내전 통계", icon: Swords }] : []),
    ...(model.permissions.viewMatchRecords ? [{ value: "records", label: "경기 기록", icon: History }] : []),
    { value: "personal", label: "개인 기록", icon: UserRound },
  ];
  function selectTab(value: string) {
    setTab(value);
    if (value === "personal") setPersonId(null);
  }
  return <div className="mx-auto w-full max-w-[1120px] space-y-6">
    <Tabs value={tab} onValueChange={selectTab} className="w-full gap-2 sm:gap-4">
      <ClanSectionPicker label={tx("통계 선택")} items={sections.map(({value,label,icon: Icon}) => ({
        label, icon: <Icon className="size-4" aria-hidden />, selected: tab === value, onSelect: () => selectTab(value),
      }))}>
          <TabsList variant="line" className="h-auto w-full border-b">
            {sections.map(({value,label,icon: Icon}) => <TabsTrigger key={value} value={value} onClick={() => selectTab(value)}>
              <Icon className="size-4" aria-hidden />{tx(label)}
            </TabsTrigger>)}
          </TabsList>
      </ClanSectionPicker>
      <TabsContent value="hof"><HallOfFame model={model} clanId={clanId} onChoosePerson={choosePerson} settings={settingsFor("hof")} /></TabsContent>
      {model.permissions.viewIntraStats !== false && <TabsContent value="intra"><IntraClanStats model={model} settings={settingsFor("intra")} /></TabsContent>}
      {model.permissions.viewMatchRecords && <TabsContent value="records">{model.deferredDetails
        ? <StatsDetailLoader cache={cache} initial={{ kind: "archive", archive: model.archive }} url={`/api/clans/${clanId}/stats?section=archive`}>{(detail, pending) => detail.kind === "archive" && <ClanMatchHistory gameSlug={gameSlug} pending={pending} model={{ ...model, archive: detail.archive }} settings={settingsFor("records")} />}</StatsDetailLoader>
        : <ClanMatchHistory gameSlug={gameSlug} model={model} settings={settingsFor("records")} />}</TabsContent>}
      {showPersonalTab && <TabsContent value="personal">{personId && !canViewSelectedStats ? <div className="space-y-3"><div className="flex justify-end"><Button type="button" variant="outline" size="sm" onClick={() => setPersonId(null)}>{tx("멤버 선택")}</Button></div><StatsPlayerBanner gameSlug={gameSlug} clanId={clanId} hof={model.hof} userId={personId} nickname={people.find(person => person.userId === personId)?.nickname ?? "플레이어"} /><section className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4"><p className="text-sm text-muted-foreground">{tx("개인 기록 열람이 제한되어 있습니다.")}</p>{settingsFor("personal")}</section></div> : personId ? model.deferredDetails
        ? <StatsDetailLoader cache={cache} initial={{ kind: "personal", person: model.personal.people.find(person => person.userId === personId)! }} url={`/api/clans/${clanId}/stats?section=personal&userId=${personId}`}>{(detail, pending) => detail.kind === "personal" && <PersonalStats key={personId} pending={pending} model={{ ...model, personal: { ...model.personal, people: [detail.person] } }} selectedId={personId} onBack={() => setPersonId(null)} gameSlug={gameSlug} clanId={clanId} settings={settingsFor("personal")} />}</StatsDetailLoader>
        : <PersonalStats key={personId} model={model} selectedId={personId} onBack={() => setPersonId(null)} gameSlug={gameSlug} clanId={clanId} settings={settingsFor("personal")} />
        : <StatsMemberPicker people={people} onSelect={choosePerson} settings={settingsFor("personal")} />}</TabsContent>}
    </Tabs>
  </div>;
}
