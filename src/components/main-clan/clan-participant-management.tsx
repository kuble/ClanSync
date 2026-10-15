"use client";

import { useState } from "react";
import Link from "next/link";
import type { GuestRecord } from "@/lib/clan/participant-records";
import { ClanParticipantEditor } from "./clan-participant-editor";
import { MemberRecordButton } from "./participant-record-dialog";

export function ClanParticipantManagement({ clanId, gameSlug, records }: { clanId: string; gameSlug: string; records: (GuestRecord & { accountName: string | null })[] }) {
  const [query, setQuery] = useState("");
  const filtered = records.filter((p) => `${p.nickname} ${p.accountName ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <section aria-label="내전 참가자 명부" className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-sm font-semibold">미가입 참가자 기록</h4><ClanParticipantEditor clanId={clanId} /></div>
    <input aria-label="참가자 명부 검색" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="닉네임 검색" className="h-9 w-full rounded-lg border bg-background px-3 text-sm" />
    <div className="min-h-24 max-h-96 divide-y overflow-y-auto rounded-lg border">
      {filtered.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3" data-guest-record={p.id}>
        <div className="min-w-0">
          <Link href={`/games/${gameSlug}/clan/${clanId}/stats?player=${p.userId ?? p.id}`} prefetch={false} className="break-words text-sm font-semibold hover:text-primary">{p.nickname}</Link>
          <p className="mt-1 text-xs text-muted-foreground">{p.played}경기 · {p.lastPlayed ? `최근 ${p.lastPlayed}` : "참가 기록 없음"}{p.userId ? ` · ${p.accountName ?? "탈퇴한 계정"}에게 연결됨` : ""}</p>
        </div>
        {p.userId ? <MemberRecordButton clanId={clanId} gameSlug={gameSlug} userId={p.userId} nickname={p.accountName ?? p.nickname} gameTag={null} linkedCount={1} /> : <ClanParticipantEditor clanId={clanId} participant={p} />}
      </div>)}
      {!filtered.length && <p className="p-4 text-xs text-muted-foreground">{query ? "조건에 맞는 참가자가 없습니다." : "미가입 참가자를 추가하면 가입 전에도 내전 기록을 쌓을 수 있습니다."}</p>}
    </div>
  </section>;
}
