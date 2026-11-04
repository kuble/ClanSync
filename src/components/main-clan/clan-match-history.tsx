"use client";

import { useTranslator } from "#use-translator";
import { useState, type ReactNode } from "react";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { ClanStatsArchive } from "./clan-stats-archive";

export function ClanMatchHistory({ model, settings, pending = false }: { model: ClanStatsPageModel; settings?: ReactNode; pending?: boolean }) {
  const tx = useTranslator();
  const [search, setSearch] = useState("");
  const [map, setMap] = useState("all");
  const maps = model.archive.maps ?? [...new Set(Object.values(model.archive.sampleByDate).flatMap((rows) => rows.flatMap((row) => row.mapLabel ? [row.mapLabel] : [])))].sort((a, b) => a.localeCompare(b, "ko"));
  const fieldClass = "grid grid-cols-subgrid col-span-2 items-center text-[11px] text-muted-foreground @min-[44rem]/archive:flex @min-[44rem]/archive:gap-2";
  return <ClanStatsArchive loading={pending} clanId={model.clanId} archive={model.archive} canEdit={model.permissions.correctMatchRecords} canCreate={model.permissions.createMatchRecords} canUpdate={model.permissions.editMatchRecords} canDelete={model.permissions.deleteMatchRecords} mapFilter={map} participantSearch={search} settings={settings} filters={<div className="col-span-full grid grid-cols-[auto_minmax(0,1fr)] gap-2 @min-[44rem]/archive:ml-auto @min-[44rem]/archive:flex">
      <label className={fieldClass}><span>{tx("맵")}</span><select aria-label={tx("기록 맵")} value={map} onChange={(event) => setMap(event.target.value)} className="h-9 w-full min-w-0 rounded-lg border bg-background px-3 text-xs text-foreground @min-[44rem]/archive:w-auto @min-[44rem]/archive:max-w-40"><option value="all">{tx("전체 맵")}</option>{maps.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label className={fieldClass}><span className="shrink-0">{tx("참가자")}</span><input aria-label={tx("경기 참가자 검색")} type="search" placeholder={tx("참가자 이름 검색")} value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 w-full min-w-0 rounded-lg border bg-background px-3 text-sm text-foreground @min-[44rem]/archive:w-48" /></label>
    </div>} />;
}
