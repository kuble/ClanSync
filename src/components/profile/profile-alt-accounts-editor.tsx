"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { loadOwnAltAccountsAction, type OwnAltAccountsResult } from "@/app/actions/profile-alt-accounts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProfileGameAltAccounts } from "./profile-game-alt-accounts";
import styles from "./profile.module.css";

export function ProfileAltAccountsEditor({ gameSlug, onChanged }: { gameSlug: string; onChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Extract<OwnAltAccountsResult, { ok: true }>>();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const requests = useRef(0);
  function refresh() {
    const request = ++requests.current;
    setError("");
    start(async () => {
      try {
        const result = await loadOwnAltAccountsAction(gameSlug);
        if (requests.current !== request) return;
        if (result.ok) setData(result);
        else { setData(undefined); setError(result.error); }
      } catch { if (requests.current === request) { setData(undefined); setError("부계정을 불러오지 못했습니다."); } }
    });
  }
  return <Dialog open={open} onOpenChange={next => { setOpen(next); if (next) refresh(); else { requests.current++; setData(undefined); setError(""); } }}>
    <DialogTrigger render={<Button type="button" variant="ghost" size="icon" className={styles.altEditButton} aria-label="부계정 편집" title="부계정 편집" />}><Pencil size={15} aria-hidden="true" /></DialogTrigger>
    <DialogContent className="sm:max-w-xl">
      <DialogHeader><DialogTitle>부계정 편집</DialogTitle><DialogDescription>{data ? `${data.gameName}의 본인 부계정을 추가하거나 수정할 수 있습니다.` : "본인의 게임 계정과 공개 범위를 확인합니다."}</DialogDescription></DialogHeader>
      <div className="board-scroll h-[min(28rem,60dvh)] overflow-y-auto overscroll-contain" aria-busy={pending}>
        {data && <ProfileGameAltAccounts gameId={data.gameId} gameSlug={gameSlug} initialRows={data.rows} disclosureLines={data.disclosureLines} onChanged={() => { refresh(); onChanged?.(); }} />}
        {pending && <p role="status" className="py-3 text-sm text-muted-foreground">부계정을 불러오는 중…</p>}
        {error && <div role="alert" className="space-y-3 py-3 text-sm text-destructive"><p>{error}</p><Button type="button" variant="outline" onClick={refresh}>다시 불러오기</Button></div>}
      </div>
    </DialogContent>
  </Dialog>;
}
