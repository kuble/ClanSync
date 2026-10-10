"use client";

import { useState, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { ClanStatsArchive } from "./clan-stats-archive";

export function ClanMatchHistory({ model, settings }: { model: ClanStatsPageModel; settings?: ReactNode }) {
  const [search, setSearch] = useState("");
  const [map, setMap] = useState("all");
  const maps = model.archive.maps ?? [...new Set(Object.values(model.archive.sampleByDate).flatMap((rows) => rows.flatMap((row) => row.mapLabel ? [row.mapLabel] : [])))].sort((a, b) => a.localeCompare(b, "ko"));
  return <div className="space-y-5">
    <Card size="sm"><CardContent><ClanStatsArchive clanId={model.clanId} archive={model.archive} canEdit={model.permissions.correctMatchRecords} canCreate={model.permissions.createMatchRecords} canUpdate={model.permissions.editMatchRecords} canDelete={model.permissions.deleteMatchRecords} mapFilter={map} participantSearch={search} filters={<div className="flex max-w-full flex-wrap items-center gap-2 sm:ml-auto">
      <label className="flex items-center gap-2 text-[11px] text-muted-foreground"><span>맵</span><select aria-label="기록 맵" value={map} onChange={(event) => setMap(event.target.value)} className="h-9 max-w-40 rounded-lg border bg-background px-2 text-xs text-foreground"><option value="all">전체 맵</option>{maps.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground"><span className="shrink-0">참가자</span><input aria-label="경기 참가자 검색" type="search" placeholder="참가자 이름 검색" value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 w-full min-w-0 rounded-lg border bg-background px-3 text-sm text-foreground sm:w-48" /></label>
      {settings}
    </div>} /></CardContent></Card>
  </div>;
}
