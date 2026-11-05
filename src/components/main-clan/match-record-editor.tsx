"use client";

import { useTranslator } from "#use-translator";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ClanArchiveMatch, ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { editClanMatchRecord, reloadClanMatchRecordArchive, type MatchRecordInput } from "@/app/actions/clan-match-records";
import { MatchRecordMapPicker } from "./match-record-map-picker";

type Role = MatchRecordInput["players"][number]["role"];
const roles: Role[] = ["tank", "dmg", "dmg", "sup", "sup"];
const kstTime = (iso: string) => new Date(Date.parse(iso) + 9 * 60 * 60 * 1000).toISOString().slice(0, 19);
const field = "h-9 w-full min-w-0 rounded-lg border bg-background px-2 text-sm text-foreground";

export function MatchRecordEditor({ gameSlug, clanId, match, day, members, mode, onClose, onReload, onSaved }: {
  gameSlug: string; clanId: string; match?: ClanArchiveMatch; day: string; members: { userId: string; nickname: string }[];
  mode: "create" | "update" | "delete"; onClose: () => void; onReload: () => void;
  onSaved: (archive: ClanStatsPageModel["archive"], day: string) => void;
}) {
  const tx = useTranslator();
  const [date, setDate] = useState(day);
  const [time, setTime] = useState(match ? kstTime(match.occurredAt) : `${day}T20:00:00`);
  const [map, setMap] = useState(match?.mapLabel ?? "");
  const [outcome, setOutcome] = useState<MatchRecordInput["outcome"]>(match?.outcome ?? "team1");
  const [slots, setSlots] = useState(() => ([1, 2] as const).flatMap((team) => {
    const players = match?.players.filter((p) => p.team === team) ?? [];
    return roles.map((role, i) => ({ team, role: players[i] ? players[i].role as Role : role, userId: players[i]?.userId ?? "" }));
  }));
  const [error, setError] = useState("");
  const [savedDay, setSavedDay] = useState<string>();
  const [creationId] = useState(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();
  const mapInputId = useId();
  const people = [...new Map([...members, ...(match?.players ?? [])].map((p) => [p.userId, { userId: p.userId, nickname: p.nickname }])).values()].sort((a, b) => a.nickname.localeCompare(b.nickname, "ko"));
  const title = mode === "create" ? "경기 기록 추가" : mode === "update" ? "경기 기록 수정" : "경기 기록 제거";
  const EditorRoot = mode === "delete" ? Dialog : Sheet;
  const EditorContent = mode === "delete" ? DialogContent : SheetContent;
  const EditorHeader = mode === "delete" ? DialogHeader : SheetHeader;
  const EditorTitle = mode === "delete" ? DialogTitle : SheetTitle;
  const EditorDescription = mode === "delete" ? DialogDescription : SheetDescription;
  return <EditorRoot open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <EditorContent className={mode === "delete" ? "flex max-h-[90dvh] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-lg" : "gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-[640px]"} showCloseButton={!pending}>
      <EditorHeader className="shrink-0 px-5 pb-5 pt-5 pr-12"><EditorTitle>{title}</EditorTitle><EditorDescription>{mode === "delete" ? tx("이 경기를 통계에서 제거합니다. 원본 경기와 코인 정산 내역은 보존됩니다.") : tx("날짜·맵·결과와 양 팀 출전자를 기록합니다. 저장하면 당일 전적과 클랜 통계가 함께 갱신됩니다.")}</EditorDescription></EditorHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => {
        event.preventDefault(); setError("");
        if (savedDay) {
          startTransition(async () => {
            try {
              const result = await reloadClanMatchRecordArchive({ clanId, day: savedDay });
              if (result.ok) onSaved(result.archive, savedDay); else setError(result.error);
            } catch { setError("기록은 저장되었습니다. 최신 목록을 불러오지 못했습니다. 조회를 다시 시도하십시오."); }
          });
          return;
        }
        const players = slots.filter((slot) => slot.userId);
        if (mode !== "delete" && (new Set(players.map((p) => p.userId)).size !== players.length || !players.some((p) => p.team === 1) || !players.some((p) => p.team === 2))) { setError("양 팀에 출전자를 한 명 이상 선택하십시오. 같은 출전자는 중복 선택할 수 없습니다."); return; }
        startTransition(async () => {
          const selectedDay = mode === "delete" ? day : date;
          try {
            const result = await editClanMatchRecord({ clanId, id: match?.id ?? creationId, operation: mode, revision: match?.revision, day: selectedDay,
              record: mode === "delete" ? undefined : { playedAt: match && date === day ? match.playedAt : `${date}T${match ? kstTime(match.playedAt).slice(11) : "00:00:00"}+09:00`, occurredAt: match && time === kstTime(match.occurredAt) ? match.occurredAt : `${time}+09:00`, mapLabel: map.trim(), outcome, players },
            });
            if (!result.ok) { if ("saved" in result && result.saved) setSavedDay(selectedDay); setError(result.error); return; }
            onSaved(result.archive, selectedDay);
          } catch { setError("저장 결과를 확인하지 못했습니다. 최신 기록을 확인한 뒤 다시 시도하십시오."); }
        });
      }}>
        <div className="board-scroll min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-5">
        {mode === "delete" ? <p className="rounded-lg border p-4 text-sm">{match?.mapLabel ?? tx("맵 미기록")} · {day}</p> : <fieldset disabled={pending || !!savedDay} className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs">{tx("내전 날짜")}<input className={field} type="date" min="2000-01-01" max="2100-12-31" required value={date} onChange={(e) => { const next = e.target.value; if (time.startsWith(date)) setTime(next + time.slice(10)); setDate(next); }} /></label>
            <label className="space-y-1 text-xs">{tx("경기 시간 (한국 시간)")}<input className={field} type="datetime-local" step="1" min="2000-01-01T00:00" max="2100-12-31T23:59:59" required value={time} onChange={(e) => setTime(e.target.value)} /></label>
            <div className="space-y-1 text-xs"><label htmlFor={mapInputId}>{tx("경기 맵")}</label>
              <div className="flex items-center gap-1.5"><input id={mapInputId} className={field} maxLength={64} value={map} onChange={(event) => setMap(event.target.value)} placeholder={tx("맵 이름")} />
                <MatchRecordMapPicker gameSlug={gameSlug} value={map} onChange={setMap} /></div>
            </div>
            <label className="space-y-1 text-xs">{tx("경기 결과")}<select aria-label={tx("경기 결과")} className={field} value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}><option value="team1">{tx("블루 팀 승리")}</option><option value="team2">{tx("레드 팀 승리")}</option><option value="draw">{tx("무승부")}</option><option value="void">{tx("무효 · 재경기")}</option><option value="unrecorded">{tx("결과 미기록")}</option></select></label>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{([1, 2] as const).map((team) => <fieldset key={team} className="space-y-2 rounded-xl border p-3">
            <legend className={`px-1 text-xs font-bold ${team === 1 ? "text-team-blue" : "text-team-red"}`}>{team === 1 ? tx("블루 팀") : tx("레드 팀")}</legend>
            {slots.map((slot, i) => slot.team === team && <div key={i} className="flex gap-1.5">
              <select className={`${field.replace("w-full", "w-20")} shrink-0`} aria-label={tx("{0}팀 {1}번 역할", team, i % 5 + 1)} value={slot.role ?? ""} onChange={(e) => setSlots((old) => old.map((s, index) => index === i ? { ...s, role: (e.target.value || null) as Role } : s))}><option value="">{tx("미기록")}</option><option value="tank">{tx("탱커")}</option><option value="dmg">{tx("딜러")}</option><option value="sup">{tx("힐러")}</option></select>
              <select className={field} aria-label={tx("{0}팀 {1}번 출전자", team, i % 5 + 1)} value={slot.userId} onChange={(e) => setSlots((old) => old.map((s, index) => index === i ? { ...s, userId: e.target.value } : s))}><option value="">{tx("출전자 없음")}</option>{people.map((p) => <option key={p.userId} value={p.userId} disabled={p.userId !== slot.userId && slots.some((s) => s.userId === p.userId)}>{p.nickname}</option>)}</select>
            </div>)}
          </fieldset>)}</div>
          <p className="text-xs text-muted-foreground">{tx("출전자를 확인할 수 없는 슬롯은 비워 둘 수 있습니다. 기록 정정은 승부예측 정산을 변경하지 않습니다.")}</p>
        </fieldset>}
        {error && <div className="space-y-2"><p role="alert" className="text-xs text-destructive">{tx(error)}</p>{!savedDay && <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onReload}>{tx("최신 기록 확인")}</Button>}</div>}
        </div><div className="flex shrink-0 justify-end gap-2 border-t px-5 py-4"><Button type="button" variant="outline" size="sm" disabled={pending} onClick={onClose}>{savedDay ? tx("닫기") : tx("취소")}</Button><Button type="submit" size="sm" variant={mode === "delete" && !savedDay ? "destructive" : "default"} disabled={pending}>{pending ? savedDay ? tx("불러오는 중…") : tx("저장 중…") : savedDay ? tx("기록 다시 불러오기") : mode === "delete" ? tx("기록 제거") : tx("기록 저장")}</Button></div>
      </form>
    </EditorContent>
  </EditorRoot>;
}
