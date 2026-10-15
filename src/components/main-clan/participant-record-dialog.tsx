"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveClanJoinRequestAction } from "@/app/actions/game-clan-onboarding";
import { connectMemberRecords, disconnectMemberRecords, loadGuestRecords } from "@/app/actions/clan-participants";
import { participantRecommendation, participantSearchName, type GuestRecord } from "@/lib/clan/participant-records";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  clanId: string;
  gameSlug: string;
  userId: string;
  nickname: string;
  gameTag: string | null;
  requestId?: string;
  onClose: () => void;
};

export function ParticipantRecordDialog({ clanId, gameSlug, userId, nickname, gameTag, requestId, onClose }: Props) {
  const router = useRouter();
  const [records, setRecords] = useState<GuestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [unlink, setUnlink] = useState<GuestRecord | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    let current = true;
    loadGuestRecords(clanId).then((result) => {
      if (!current) return;
      if (result.ok) setRecords(result.records); else setError(result.error);
      setLoading(false);
    }).catch(() => {
      if (current) { setError("기존 기록을 불러오지 못했습니다. 창을 다시 열어 주세요."); setLoading(false); }
    });
    return () => { current = false; };
  }, [clanId]);

  const linked = records.filter((r) => r.userId === userId);
  const candidates = records.filter((r) => !r.userId && participantSearchName(r.nickname).includes(participantSearchName(query)))
    .sort((a, b) => participantRecommendation(b.nickname, nickname, gameTag) - participantRecommendation(a.nickname, nickname, gameTag) || (b.lastPlayed ?? "").localeCompare(a.lastPlayed ?? "") || a.id.localeCompare(b.id));

  function submit() {
    start(async () => {
      setError("");
      try {
        const result = unlink
          ? await disconnectMemberRecords(gameSlug, clanId, unlink.id)
          : requestId
            ? await approveClanJoinRequestAction(gameSlug, clanId, requestId, selected)
            : selected ? await connectMemberRecords(gameSlug, clanId, userId, selected) : null;
        if (!result) return;
        if (!result.ok) { setError(result.error); return; }
        onClose(); router.refresh();
      } catch { setError("처리하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    });
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{unlink ? "기록 연결 해제" : requestId ? "가입 승인" : "이전 내전 기록 연결"}</DialogTitle>
        <DialogDescription><span className="font-semibold text-foreground">{nickname}</span> · {gameTag ?? "배틀태그 미등록"}</DialogDescription>
      </DialogHeader>
      {unlink ? <p className="text-sm leading-relaxed"><strong>{unlink.nickname}</strong>의 미가입 시절 기록을 원래 참가자에게 돌립니다. 클랜 가입 상태와 가입 후 경기·코인은 유지됩니다.</p> : <div className="space-y-4">
        {linked.length > 0 && <section className="space-y-2" aria-label="연결된 이전 기록">
          <h4 className="text-xs font-semibold text-muted-foreground">연결된 이전 기록</h4>
          {linked.map((record) => <div key={record.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="text-sm">{record.nickname} <span className="text-xs text-muted-foreground">{record.played}경기</span></span>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => { setError(""); setUnlink(record); }}>연결 해제</Button>
          </div>)}
        </section>}
        <label className="block space-y-2 text-xs font-semibold">기존 참가자 찾기
          <input aria-label="기존 참가자 검색" placeholder="이전 닉네임으로 검색" value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} disabled={pending} className="h-9 w-full rounded-lg border bg-background px-3 text-sm" />
        </label>
        {requestId && <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm">
          <input type="radio" name="previous-record" checked={selected === null} onChange={() => setSelected(null)} disabled={pending} />
          기존 기록을 연결하지 않고 가입
        </label>}
        <div className="min-h-48 max-h-64 space-y-2 overflow-y-auto" aria-label="기존 참가자 검색 결과" aria-busy={loading}>
          {loading ? <p className="p-4 text-sm text-muted-foreground" role="status">기존 기록을 불러오는 중…</p> : candidates.length ? candidates.map((record) => <div key={record.id} className={`rounded-lg border p-3 ${selected === record.id ? "border-primary bg-primary/5" : ""}`} data-participant-candidate={record.id}>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="radio" name="previous-record" className="mt-1" checked={selected === record.id} onChange={() => setSelected(record.id)} disabled={pending} aria-label={`${record.nickname} 기록 선택`} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">{record.nickname}{participantRecommendation(record.nickname, nickname, gameTag) > 0 && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">추천</span>}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{record.played}경기 · {record.lastPlayed ? `최근 ${record.lastPlayed}` : "참가 기록 없음"}</span>
              </span>
            </label>
            {record.recentMatches.length > 0 && <details className="mt-2 pl-6 text-xs text-muted-foreground"><summary className="cursor-pointer">최근 내전 확인</summary><ul className="mt-2 space-y-1">{record.recentMatches.map((match) => <li key={match.id}>{match.day} · {match.map ?? "맵 미지정"}</li>)}</ul></details>}
          </div>) : <p className="p-4 text-sm text-muted-foreground">{query ? "일치하는 미가입 참가자가 없습니다." : "연결할 미가입 참가자가 없습니다."}</p>}
        </div>
      </div>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 border-t pt-3">
        {unlink && <Button size="sm" variant="ghost" disabled={pending} onClick={() => setUnlink(null)}>뒤로</Button>}
        <Button size="sm" disabled={loading || pending || (!unlink && !requestId && !selected)} onClick={submit}>
          {pending ? "처리 중…" : unlink ? "연결 해제" : requestId ? selected ? "기록 연결하고 승인" : "새 참가자로 승인" : "기록 연결"}
        </Button>
      </div>
    </DialogContent>
  </Dialog>;
}

export function MemberRecordButton(props: Omit<Props, "requestId" | "onClose"> & { linkedCount: number }) {
  const [open, setOpen] = useState(false);
  return <><Button size="sm" variant="outline" aria-label={`${props.nickname} 이전 기록 관리`} onClick={() => setOpen(true)}>{props.linkedCount ? `연결된 기록 ${props.linkedCount}` : "이전 기록 연결"}</Button>
    {open && <ParticipantRecordDialog {...props} onClose={() => setOpen(false)} />}</>;
}
