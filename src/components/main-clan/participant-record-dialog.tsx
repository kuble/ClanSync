"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Link2, Search, Unlink, UserRound } from "lucide-react";
import { approveClanJoinRequestAction } from "@/app/actions/game-clan-onboarding";
import { connectMemberRecords, disconnectMemberRecords, loadGuestRecords } from "@/app/actions/clan-participants";
import { participantRecommendation, participantSearchName, type GuestRecord } from "@/lib/clan/participant-records";
import { playerProfileDetails, type PlayerDemographics } from "@/lib/clan/player-profile";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  clanId: string;
  gameSlug: string;
  userId: string;
  nickname: string;
  gameTag: string | null;
  requestId?: string;
  profile?: PlayerDemographics;
  returningMember?: boolean;
  onClose: () => void;
};

export function ParticipantRecordDialog({ clanId, gameSlug, userId, nickname, gameTag, requestId, profile, returningMember = false, onClose }: Props) {
  const router = useRouter();
  const [records, setRecords] = useState<GuestRecord[]>([]);
  const [loading, setLoading] = useState(!returningMember);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [joinMode, setJoinMode] = useState<"link" | "new" | null>(null);
  const [unlink, setUnlink] = useState<GuestRecord | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (returningMember) return;
    let current = true;
    loadGuestRecords(clanId).then((result) => {
      if (!current) return;
      if (result.ok) setRecords(result.records); else setError(result.error);
      setLoading(false);
    }).catch(() => {
      if (current) { setError("기존 기록을 불러오지 못했습니다. 창을 다시 열어 주세요."); setLoading(false); }
    });
    return () => { current = false; };
  }, [clanId, returningMember]);

  const linked = records.filter((r) => r.userId === userId);
  const chosen = records.find((r) => r.id === selected);
  const displayName = gameTag?.split("#")[0] ?? nickname;
  const linkRecords = !returningMember && (!requestId || joinMode === "link");
  const hasRecommendation = records.some((r) => !r.userId && participantRecommendation(r.nickname, nickname, gameTag) > 0);
  const ready = unlink ? !loading : requestId ? returningMember || joinMode === "new" || (joinMode === "link" && !loading && Boolean(selected)) : !loading && Boolean(selected);
  const candidates = records.filter((r) => !r.userId && participantSearchName(r.nickname).includes(participantSearchName(query)))
    .sort((a, b) => participantRecommendation(b.nickname, nickname, gameTag) - participantRecommendation(a.nickname, nickname, gameTag) || (b.lastPlayed ?? "").localeCompare(a.lastPlayed ?? "") || a.id.localeCompare(b.id));

  function submit() {
    if (!ready || pending) return;
    start(async () => {
      setError("");
      try {
        const result = unlink
          ? await disconnectMemberRecords(gameSlug, clanId, unlink.id)
          : requestId
            ? await approveClanJoinRequestAction(gameSlug, clanId, requestId, joinMode === "link" ? selected : null)
            : selected ? await connectMemberRecords(gameSlug, clanId, userId, selected) : null;
        if (!result) return;
        if (!result.ok) { setError(result.error); return; }
        onClose(); router.refresh();
      } catch { setError("처리하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    });
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent showCloseButton={!pending} className="flex max-h-[90dvh] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
      <div className="shrink-0 space-y-4 border-b px-5 py-5 pr-12 sm:px-6 sm:pr-12">
      <DialogHeader>
        <DialogTitle>{unlink ? "이전 기록 연결을 해제할까요?" : requestId ? returningMember ? "클랜 재가입 승인" : "클랜 가입 승인" : "이전 내전 기록"}</DialogTitle>
        {(unlink || !requestId) && <DialogDescription>{unlink ? "선택한 과거 기록만 계정에서 분리됩니다." : "가입 전 기록을 연결하거나 잘못 연결한 기록을 해제하세요."}</DialogDescription>}
      </DialogHeader>
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound size={19} aria-hidden="true" /></span>
        <div className="min-w-0"><p className="break-words text-base font-semibold">{displayName}<span className="ml-1 text-sm font-normal text-muted-foreground">{gameTag?.includes("#") ? `#${gameTag.split("#")[1]}` : ""}</span></p><p className="text-xs text-muted-foreground">{playerProfileDetails(profile) || (requestId ? "가입 신청자" : "기록을 연결할 멤버")}</p></div>
      </div>
      </div>
      {unlink ? <div className="board-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4"><Unlink size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" /><div><p className="text-sm font-semibold">{unlink.nickname}</p><p className="mt-1 text-xs text-muted-foreground">이전 내전 {unlink.played}경기</p></div></div>
        <p className="text-sm leading-relaxed">이 기록은 다시 <strong>{unlink.nickname}</strong> 이름으로 남으며, 나중에 올바른 계정에 연결할 수 있습니다.</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{displayName}의 클랜 가입 상태와 가입 후 경기·코인은 그대로 유지됩니다.</p>
      </div> : <div tabIndex={0} aria-label="이전 기록 내용" className="board-scroll h-[min(32rem,55dvh)] min-h-0 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 focus-visible:outline-2 focus-visible:outline-ring sm:px-6">
        {requestId && returningMember && <div className="rounded-lg border border-primary/25 bg-primary/5 p-4"><p className="text-sm font-semibold">기존 계정으로 돌아오는 구성원입니다.</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">이전 내전 기록을 그대로 이어 쓰며 일반 멤버로 가입합니다.</p></div>}
        {requestId && !returningMember && joinMode !== "link" && <fieldset className="space-y-2" disabled={pending}>
          <legend className="mb-3 text-sm font-semibold">이전 내전 기록을 연결할까요?</legend>
          {([{ mode: "link", label: "이전 기록 연결", description: "가입 전에 참여한 내전 기록을 이 계정으로 모아요." }, { mode: "new", label: "연결 없이 가입", description: "이전 기록을 가져오지 않고 클랜에 가입해요." }] as const).map((option) => <label key={option.mode} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${joinMode === option.mode ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}>
            <span className="relative mt-0.5 flex size-5 shrink-0"><input type="radio" name="join-record-mode" aria-label={option.label} className="peer absolute inset-0 z-10 m-0 size-5 cursor-pointer opacity-0" checked={joinMode === option.mode} onChange={() => { setJoinMode(option.mode); setSelected(null); setQuery(""); setError(""); }} /><span className="flex size-5 items-center justify-center rounded-full border peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">{joinMode === option.mode && <Check size={13} aria-hidden="true" />}</span></span>
            <span className="min-w-0"><span className="flex flex-wrap items-center gap-2 text-sm font-semibold">{option.label}{option.mode === "link" && hasRecommendation && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">추천 기록 있음</span>}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{option.description}</span></span>
          </label>)}
        </fieldset>}
        {linkRecords && <>
        {linked.length > 0 && <section className="space-y-2" aria-label="연결된 이전 기록">
          <h4 className="text-xs font-semibold text-muted-foreground">연결된 기록 · {linked.length}</h4>
          {linked.map((record) => <div key={record.id} className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <span className="flex min-w-0 items-center gap-2 text-sm"><Link2 size={15} className="shrink-0 text-primary" aria-hidden="true" /><span className="break-words">{record.nickname} <span className="text-xs text-muted-foreground">{record.played}경기</span></span></span>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => { setError(""); setUnlink(record); }}>연결 해제</Button>
          </div>)}
        </section>}
        <label className="flex flex-col gap-2 text-xs font-semibold">{linked.length ? "다른 기록 찾기" : "연결할 이전 기록"}
          <span className="relative block"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" aria-hidden="true" /><input aria-label="기존 참가자 검색" autoFocus={Boolean(requestId && joinMode === "link")} placeholder="예전에 쓰던 닉네임으로 검색" value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} disabled={pending} className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm font-normal" /></span>
        </label>
        <div className="board-scroll h-64 space-y-2 overflow-y-auto" aria-label="기존 참가자 검색 결과" aria-busy={loading}>
          {loading ? <p className="p-4 text-sm text-muted-foreground" role="status">이전 기록을 불러오는 중…</p> : candidates.length ? candidates.map((record) => <div key={record.id} className={`rounded-lg border p-3 transition-colors ${selected === record.id ? "border-primary bg-primary/5" : "hover:border-primary/40"}`} data-participant-candidate={record.id}>
            <label className="flex cursor-pointer items-start gap-3">
              <span className="relative mt-0.5 flex size-5 shrink-0"><input type="radio" name="previous-record" className="peer absolute inset-0 z-10 m-0 size-5 cursor-pointer opacity-0" checked={selected === record.id} onChange={() => setSelected(record.id)} disabled={pending} aria-label={`${record.nickname} 기록 선택`} /><span className="flex size-5 items-center justify-center rounded-full border peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">{selected === record.id && <Check size={13} aria-hidden="true" />}</span></span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">{record.nickname}{participantRecommendation(record.nickname, nickname, gameTag) > 0 && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">추천</span>}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{record.played}경기 · {record.lastPlayed ? `최근 ${record.lastPlayed}` : "참가 기록 없음"}</span>
              </span>
            </label>
            {record.recentMatches.length > 0 && <details className="mt-2 pl-8 text-xs text-muted-foreground"><summary className="cursor-pointer hover:text-foreground">최근 경기 확인</summary><ul className="mt-2 space-y-1">{record.recentMatches.map((match) => <li key={match.id}>{match.day} · {match.map ?? "맵 미지정"}</li>)}</ul></details>}
          </div>) : <p className="p-4 text-center text-sm text-muted-foreground">{query ? "이 닉네임의 이전 기록이 없습니다." : "아직 연결할 이전 기록이 없습니다."}</p>}
        </div>
        </>}
      </div>}
      <p role={error ? "alert" : undefined} tabIndex={error ? 0 : undefined} className="h-12 shrink-0 overflow-y-auto px-5 pb-4 text-xs text-destructive sm:px-6">{error}</p>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-background px-5 py-4 sm:px-6">
        {!unlink && <p className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs leading-relaxed text-muted-foreground">{chosen && linkRecords ? <><span className="font-semibold text-foreground">{chosen.nickname} · {chosen.played}경기</span><ArrowRight size={14} aria-hidden="true" /><span>{displayName}에게 연결</span></> : requestId && returningMember ? "기존 기록을 이어서 재가입을 승인합니다." : requestId && joinMode === "new" ? "이전 기록을 연결하지 않고 클랜 가입을 승인합니다." : requestId && !joinMode ? "먼저 이전 기록을 연결할지 선택해 주세요." : "연결할 기록을 선택해 주세요."}</p>}
        <div className="ml-auto flex shrink-0 justify-end gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => {
          if (unlink) { setUnlink(null); return; }
          if (requestId && joinMode === "link") { setJoinMode(null); setSelected(null); setQuery(""); setError(""); return; }
          onClose();
        }}>{unlink ? "뒤로" : requestId && joinMode === "link" ? "이전" : "취소"}</Button>
        <Button size="sm" disabled={!ready || pending} onClick={submit}>
          {pending ? "처리 중…" : unlink ? "연결 해제" : requestId ? joinMode === "link" ? "연결 후 가입 승인" : "가입 승인" : "이 기록 연결"}
        </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}

export function MemberRecordButton(props: Omit<Props, "requestId" | "onClose"> & { linkedCount: number }) {
  const [open, setOpen] = useState(false);
  return <><Button size="icon-sm" variant="ghost" className={props.linkedCount ? "text-primary" : "text-muted-foreground"} aria-label={`${props.nickname} 이전 기록 관리`} title={props.linkedCount ? `연결된 기록 ${props.linkedCount}` : "이전 기록 연결"} onClick={() => setOpen(true)}><Link2 aria-hidden="true" /></Button>
    {open && <ParticipantRecordDialog {...props} onClose={() => setOpen(false)} />}</>;
}
