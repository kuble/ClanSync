"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { issueClanParticipantInvite, reviewClanParticipantLink } from "@/app/actions/clan-participants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClanParticipantEditor } from "./clan-participant-editor";

export type ParticipantManagementRow = { id: string; nickname: string; alias: string | null; isGuest: boolean; userId: string | null; accountName: string | null };
export type ParticipantLinkRow = { id: string; participantId: string; requester: string; requesterId: string; status: "pending" | "approved" | "rejected" | "revoked"; requestedAt: string; reviewedAt: string | null; reviewer: string | null; reviewNote: string | null; revokedAt: string | null; revoker: string | null; revokeNote: string | null };

const status = { pending: "확인 대기", approved: "연결 완료", rejected: "거절", revoked: "연결 취소" };
const date = (value: string) => new Date(Date.parse(value) + 9 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ");
export function ClanParticipantManagement({ clanId, gameSlug, participants, requests }: { clanId: string; gameSlug: string; participants: ParticipantManagementRow[]; requests: ParticipantLinkRow[] }) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [invite, setInvite] = useState("");
  const [review, setReview] = useState<{ request: ParticipantLinkRow; action: "approve" | "reject" | "revoke" } | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const filtered = participants.filter((p) => `${p.nickname} ${p.alias ?? ""} ${p.accountName ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const base = `/games/${gameSlug}/clan/${clanId}`;
  const names = new Map(participants.map((p) => [p.id, `${p.nickname}${p.alias ? ` · ${p.alias}` : ""}`]));
  return <section aria-label="내전 참가자 명부" className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-sm font-semibold">내전 참가자 명부</h4><ClanParticipantEditor clanId={clanId} /></div>
    <input aria-label="참가자 명부 검색" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="닉네임·별칭 검색" className="h-9 w-full rounded-lg border bg-background px-3 text-sm" />
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <div className="max-h-96 overflow-y-auto divide-y rounded-lg border">
      {filtered.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
        <div className="min-w-0"><Link href={`${base}/stats?player=${p.userId ?? p.id}`} prefetch={false} className="break-words text-sm font-semibold hover:text-primary">{names.get(p.id)}</Link><p className="mt-1 text-xs text-muted-foreground">{p.isGuest ? p.userId ? `연결 계정 · ${p.accountName ?? "탈퇴한 계정"} · ${p.userId.slice(0, 8)}` : "미가입 참가자" : "가입 회원"}</p></div>
        <div className="flex flex-wrap gap-2"><ClanParticipantEditor key={`${p.id}:${p.alias}:${p.nickname}`} clanId={clanId} participant={p} />{p.isGuest && !p.userId && <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => {
          setError(""); const result = await issueClanParticipantInvite(clanId, p.id);
          if (!result.ok) { setError(result.error); return; }
          setInvite(`${window.location.origin}/participant-link/${result.token}`);
        })}>연결 링크</Button>}</div>
      </div>)}
      {!filtered.length && <p className="p-4 text-xs text-muted-foreground">조건에 맞는 참가자가 없습니다.</p>}
    </div>
    {requests.length > 0 && <div className="space-y-3 border-t pt-4"><h4 className="text-sm font-semibold">계정 연결 요청·이력</h4><div className="max-h-96 divide-y overflow-y-auto">
      {requests.map((r) => <div key={r.id} className="space-y-2 py-3 text-xs" data-link-request={r.id}>
        <div className="flex flex-wrap items-center justify-between gap-2"><p><strong>{names.get(r.participantId) ?? "참가자"}</strong> → {r.requester} <span className="font-mono text-[10px] text-muted-foreground">{r.requesterId.slice(0, 8)}</span><span className="ml-2 text-muted-foreground">{status[r.status]}</span></p>
          <div className="flex gap-2">{(r.status === "pending" ? ["approve", "reject"] as const : r.status === "approved" ? ["revoke"] as const : []).map((action) => <Button key={action} size="sm" variant="outline" disabled={pending} onClick={() => { setError(""); setNote(""); setReview({ request: r, action }); }}>{action === "approve" ? "연결 승인" : action === "reject" ? "요청 거절" : "연결 취소"}</Button>)}</div>
        </div>
        <p className="text-muted-foreground">신청 {date(r.requestedAt)} KST</p>
        {r.reviewedAt && <p className="break-words text-muted-foreground">{r.reviewer ?? "운영진"} · {date(r.reviewedAt)} KST · {r.reviewNote}</p>}
        {r.revokedAt && <p className="break-words text-muted-foreground">취소: {r.revoker ?? "운영진"} · {date(r.revokedAt)} KST · {r.revokeNote}</p>}
      </div>)}
    </div></div>}
    <Dialog open={!!invite} onOpenChange={(open) => { if (!open) setInvite(""); }}><DialogContent><DialogHeader><DialogTitle>참가자 연결 링크</DialogTitle><DialogDescription>본인에게 전달하세요. 30일 동안 유효하며 새 링크를 발급하면 이전 링크는 만료됩니다.</DialogDescription></DialogHeader>
      <input aria-label="참가자 연결 주소" readOnly value={invite} onFocus={(e) => e.target.select()} className="h-10 w-full rounded-lg border bg-background px-3 text-xs" />
      <Button onClick={async () => { try { await navigator.clipboard.writeText(invite); } catch { /* The selectable address remains available when clipboard access is denied. */ } }}>주소 복사</Button>
    </DialogContent></Dialog>
    <Dialog open={!!review} onOpenChange={(open) => { if (!open && !pending) setReview(null); }}><DialogContent><DialogHeader><DialogTitle>{review?.action === "revoke" ? "계정 연결 취소" : review?.action === "reject" ? "연결 요청 거절" : "계정 연결 승인"}</DialogTitle><DialogDescription>{review?.action === "revoke" ? "미가입 시절 기록을 원래 참가자에게 돌립니다. 가입 후 계정으로 남긴 경기와 코인은 유지됩니다." : "닉네임만으로 판단하지 말고 참가자 본인인지 확인하세요. 연결해도 클랜 역할은 바뀌지 않습니다."}</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!review) return; start(async () => {
        setError(""); const result = await reviewClanParticipantLink(review.request.id, review.action, note);
        if (!result.ok) { setError(result.error); return; } setReview(null); router.refresh();
      }); }}>
        <label className="block space-y-2 text-xs font-semibold">확인·취소 사유<textarea aria-label="연결 처리 사유" required maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} disabled={pending} className="min-h-20 w-full rounded-lg border bg-background p-3 text-sm" /></label>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="sm" disabled={pending}>{pending ? "처리 중" : "처리 확인"}</Button>
      </form>
    </DialogContent></Dialog>
  </section>;
}
