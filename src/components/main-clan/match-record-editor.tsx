"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ClanArchiveMatch, ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { editClanMatchRecord, type MatchRecordInput } from "@/app/actions/clan-match-records";
import { mapPoolForGameSlug } from "@/lib/balance/map-pools";

type Role = MatchRecordInput["players"][number]["role"];
const roles: Role[] = ["tank", "dmg", "dmg", "sup", "sup"];
const kstTime = (iso: string) => new Date(Date.parse(iso) + 9 * 60 * 60 * 1000).toISOString().slice(0, 19);
const field = "h-9 w-full min-w-0 rounded-lg border bg-background px-2 text-xs text-foreground";

export function MatchRecordEditor({ clanId, match, day, members, mode, onClose, onReload, onSaved }: {
  clanId: string; match?: ClanArchiveMatch; day: string; members: { userId: string; nickname: string }[];
  mode: "create" | "update" | "delete"; onClose: () => void; onReload: () => void;
  onSaved: (archive: ClanStatsPageModel["archive"], day: string) => void;
}) {
  const [date, setDate] = useState(day);
  const [time, setTime] = useState(match ? kstTime(match.occurredAt) : `${day}T20:00:00`);
  const [map, setMap] = useState(match?.mapLabel ?? "");
  const [outcome, setOutcome] = useState<MatchRecordInput["outcome"]>(match?.outcome ?? "team1");
  const [slots, setSlots] = useState(() => ([1, 2] as const).flatMap((team) => {
    const players = match?.players.filter((p) => p.team === team) ?? [];
    return roles.map((role, i) => ({ team, role: players[i] ? players[i].role as Role : role, userId: players[i]?.userId ?? "" }));
  }));
  const [error, setError] = useState("");
  const [creationId] = useState(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();
  const mapOptions = useId();
  const people = [...new Map([...members, ...(match?.players ?? [])].map((p) => [p.userId, { userId: p.userId, nickname: p.nickname }])).values()].sort((a, b) => a.nickname.localeCompare(b.nickname, "ko"));
  const title = mode === "create" ? "경기 기록 추가" : mode === "update" ? "경기 기록 수정" : "경기 기록 제거";
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent className="max-h-[88dvh] overflow-y-auto [scrollbar-color:var(--muted-foreground)_var(--background)] [scrollbar-width:thin] sm:max-w-2xl" showCloseButton={!pending}>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{mode === "delete" ? "이 경기를 통계에서 제거합니다. 원본 경기와 코인 정산 내역은 보존됩니다." : "날짜·맵·결과와 양 팀 출전자를 기록합니다. 저장하면 당일 전적과 클랜 통계가 함께 갱신됩니다."}</DialogDescription></DialogHeader>
      <form className="space-y-5" onSubmit={(event) => {
        event.preventDefault(); setError("");
        const players = slots.filter((slot) => slot.userId);
        if (mode !== "delete" && (new Set(players.map((p) => p.userId)).size !== players.length || !players.some((p) => p.team === 1) || !players.some((p) => p.team === 2))) { setError("양 팀에 출전자를 한 명 이상 선택하세요. 같은 출전자는 중복 선택할 수 없습니다."); return; }
        startTransition(async () => {
          const selectedDay = mode === "delete" ? day : date;
          try {
            const result = await editClanMatchRecord({ clanId, id: match?.id ?? creationId, operation: mode, revision: match?.revision, day: selectedDay,
              record: mode === "delete" ? undefined : { playedAt: match && date === day ? match.playedAt : `${date}T${match ? kstTime(match.playedAt).slice(11) : "00:00:00"}+09:00`, occurredAt: match && time === kstTime(match.occurredAt) ? match.occurredAt : `${time}+09:00`, mapLabel: map.trim(), outcome, players },
            });
            if (!result.ok) { setError(result.error); return; }
            onSaved(result.archive, selectedDay);
          } catch { setError("저장 결과를 확인하지 못했습니다. 최신 기록을 확인한 뒤 다시 시도하세요."); }
        });
      }}>
        {mode === "delete" ? <p className="rounded-lg border p-4 text-sm">{match?.mapLabel ?? "맵 미기록"} · {day}</p> : <fieldset disabled={pending} className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs">내전 날짜<input className={field} type="date" min="2000-01-01" max="2100-12-31" required value={date} onChange={(e) => { const next = e.target.value; if (time.startsWith(date)) setTime(next + time.slice(10)); setDate(next); }} /></label>
            <label className="space-y-1 text-xs">경기 시간 (한국 시간)<input className={field} type="datetime-local" step="1" min="2000-01-01T00:00" max="2100-12-31T23:59:59" required value={time} onChange={(e) => setTime(e.target.value)} /></label>
            <label className="space-y-1 text-xs">경기 맵<input className={field} list={mapOptions} maxLength={64} value={map} onChange={(e) => setMap(e.target.value)} placeholder="맵 이름" /><datalist id={mapOptions}>{mapPoolForGameSlug("overwatch").map((name) => <option key={name} value={name} />)}</datalist></label>
            <label className="space-y-1 text-xs">경기 결과<select aria-label="경기 결과" className={field} value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}><option value="team1">블루 팀 승리</option><option value="team2">레드 팀 승리</option><option value="draw">무승부</option><option value="void">무효 · 재경기</option><option value="unrecorded">결과 미기록</option></select></label>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{([1, 2] as const).map((team) => <fieldset key={team} className="space-y-2 rounded-xl border p-3">
            <legend className={`px-1 text-xs font-bold ${team === 1 ? "text-sky-500" : "text-rose-500"}`}>{team === 1 ? "블루 팀" : "레드 팀"}</legend>
            {slots.map((slot, i) => slot.team === team && <div key={i} className="flex gap-1.5">
              <select className={`${field.replace("w-full", "w-20")} shrink-0`} aria-label={`${team}팀 ${i % 5 + 1}번 역할`} value={slot.role ?? ""} onChange={(e) => setSlots((old) => old.map((s, index) => index === i ? { ...s, role: (e.target.value || null) as Role } : s))}><option value="">미기록</option><option value="tank">탱커</option><option value="dmg">딜러</option><option value="sup">힐러</option></select>
              <select className={field} aria-label={`${team}팀 ${i % 5 + 1}번 출전자`} value={slot.userId} onChange={(e) => setSlots((old) => old.map((s, index) => index === i ? { ...s, userId: e.target.value } : s))}><option value="">출전자 없음</option>{people.map((p) => <option key={p.userId} value={p.userId} disabled={p.userId !== slot.userId && slots.some((s) => s.userId === p.userId)}>{p.nickname}</option>)}</select>
            </div>)}
          </fieldset>)}</div>
          <p className="text-[11px] text-muted-foreground">출전자를 확인할 수 없는 슬롯은 비워 둘 수 있습니다. 기록 정정은 승부예측 정산을 변경하지 않습니다.</p>
        </fieldset>}
        {error && <div className="space-y-2"><p role="alert" className="text-xs text-destructive">{error}</p><Button type="button" size="sm" variant="outline" disabled={pending} onClick={onReload}>최신 기록 확인</Button></div>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" disabled={pending} onClick={onClose}>취소</Button><Button type="submit" size="sm" variant={mode === "delete" ? "destructive" : "default"} disabled={pending}>{pending ? "저장 중…" : mode === "delete" ? "기록 제거" : "기록 저장"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
