"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHistoricalMscoreAction } from "@/app/actions/clan-stats-score";
import { MA_SCORE_MAX, MA_SCORE_MIN } from "@/lib/balance/ma-snapshot";
import type { PersonalMatch } from "@/lib/clan/stats/clan-stats-analytics";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const matchLabel = (match: PersonalMatch) => `${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(new Date(match.occurredAt))} · ${match.map ?? "맵 미기록"}`;

export function StatsScoreEditor({ gameSlug, clanId, playerId, matches }: {
  gameSlug: string; clanId: string; playerId: string; matches: PersonalMatch[];
}) {
  const editable = matches.filter((match) => match.source === "balance");
  const [open, setOpen] = useState(false);
  const [roundId, setRoundId] = useState(editable[0]?.id ?? "");
  const selected = editable.find((match) => match.id === roundId) ?? editable[0];
  const [score, setScore] = useState(String(selected?.evaluation ?? 0));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!editable.length) return null;
  const save = () => {
    const value = Number(score);
    if (!score.trim() || !Number.isFinite(value) || value < MA_SCORE_MIN || value > MA_SCORE_MAX) {
      setError(`평가 점수는 ${MA_SCORE_MIN}부터 ${MA_SCORE_MAX}까지 입력해 주세요.`);
      return;
    }
    startTransition(async () => {
      const result = await updateHistoricalMscoreAction(gameSlug, clanId, selected.id, playerId, value);
      if (!result.ok) { setError(result.error); return; }
      setError("");
      setOpen(false);
      router.refresh();
    });
  };
  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); setError(""); if (next) setScore(String(selected?.evaluation ?? 0)); }}>
    <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>평가 점수 수정</DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>평가 점수 수정</DialogTitle><DialogDescription>선택한 내전의 평가 점수만 변경합니다.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <label className="block space-y-1.5 text-sm"><span>수정할 경기</span><select aria-label="수정할 경기" value={selected.id} onChange={(event) => { const next = editable.find((match) => match.id === event.target.value); setRoundId(event.target.value); setScore(String(next?.evaluation ?? 0)); setError(""); }} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
          {editable.map((match) => <option key={match.id} value={match.id}>{matchLabel(match)}</option>)}
        </select></label>
        <label className="block space-y-1.5 text-sm"><span>평가 점수</span><Input aria-label="평가 점수 입력" type="number" min={MA_SCORE_MIN} max={MA_SCORE_MAX} step="0.1" value={score} onChange={(event) => { setScore(event.target.value); setError(""); }} /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="button" onClick={save} disabled={pending}>{pending ? "저장 중…" : "점수 저장"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
