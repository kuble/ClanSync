"use client";

import { useTranslator } from "#use-translator";
import { useState, type ReactNode } from "react";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { ClanStatsArchive } from "./clan-stats-archive";
import { MatchRecordMapPicker } from "./match-record-map-picker";

export function ClanMatchHistory({ gameSlug, model, settings, pending = false }: { gameSlug: string; model: ClanStatsPageModel; settings?: ReactNode; pending?: boolean }) {
  const tx = useTranslator();
  const [search, setSearch] = useState("");
  const [map, setMap] = useState("");
  const maps = model.archive.maps ?? [...new Set(Object.values(model.archive.sampleByDate).flatMap((rows) => rows.flatMap((row) => row.mapLabel ? [row.mapLabel] : [])))].sort((a, b) => a.localeCompare(b, "ko"));
  return <ClanStatsArchive gameSlug={gameSlug} loading={pending} clanId={model.clanId} archive={model.archive} canEdit={model.permissions.correctMatchRecords} canCreate={model.permissions.createMatchRecords} canUpdate={model.permissions.editMatchRecords} canDelete={model.permissions.deleteMatchRecords} mapFilter={map || "all"} participantSearch={search} settings={settings} filters={<div className="col-span-full grid grid-cols-1 gap-2 @min-[44rem]/archive:ml-auto @min-[44rem]/archive:flex">
      <MatchRecordMapPicker gameSlug={gameSlug} value={map} availableMaps={maps} onChange={setMap} />
      <input aria-label={tx("경기 참가자 검색")} type="search" placeholder={tx("참가자 이름 검색")} value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 w-full min-w-0 rounded-lg border bg-background px-3 text-sm text-foreground @min-[44rem]/archive:w-48" />
    </div>} />;
}
