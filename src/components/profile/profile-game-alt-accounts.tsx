"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addUserAltAccountAction, deleteUserAltAccountAction } from "@/app/actions/profile-alt-accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import styles from "./profile.module.css";

export type AltAccountRow = { id: string; game_id: string; alt_nick: string; note: string | null };
type Props = { gameId: string; gameSlug: string; disclosureLines: string[]; initialRows: AltAccountRow[] };

export function ProfileGameAltAccounts({ gameId, gameSlug, disclosureLines, initialRows }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<AltAccountRow | null>(null);
  const [nick, setNick] = useState("");
  const [note, setNote] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function closeAdd() { setOpen(false); setNick(""); setNote(""); setAgreed(false); setError(null); }
  function onAddSubmit() {
    if (pending) return;
    setError(null);
    start(async () => {
      try {
        const result = await addUserAltAccountAction({ gameId, altNick: nick, note, acknowledgedDisclosure: agreed });
        if (!result.ok) { setError(result.error); return; }
        toast.success("부계정을 추가했습니다."); closeAdd(); router.refresh();
      } catch { setError("추가하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    });
  }
  function onDelete() {
    if (!deleting || pending) return;
    setError(null);
    start(async () => {
      try {
        const result = await deleteUserAltAccountAction({ id: deleting.id });
        if (!result.ok) { setError(result.error); return; }
        toast.success("삭제했습니다."); setDeleting(null); router.refresh();
      } catch { setError("삭제하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    });
  }
  return <section className={styles.altSection} data-alt-accounts-panel={gameSlug}>
    <div className={styles.sectionHeader}><h4>부계정 · 자기신고</h4><Button type="button" size="sm" variant="outline" onClick={() => { setError(null); setOpen(true); }}><Plus size={13} aria-hidden="true" />부계정 추가</Button></div>
    {disclosureLines.length ? <div className={styles.notice}>{disclosureLines.map((line) => <p key={line}>{line}</p>)}</div> : <p className={styles.sectionText}>이 게임의 활성 클랜에 소속되어 있지 않으면 본인만 조회할 수 있습니다.</p>}
    {initialRows.length ? <ul className={styles.altList}>{initialRows.map((row) => <li className={styles.altRow} key={row.id} data-alt-account-row={gameSlug}><div><strong>{row.alt_nick}</strong>{row.note ? <p>{row.note}</p> : null}</div><Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => { setError(null); setDeleting(row); }} aria-label={`${row.alt_nick} 부계정 삭제`}>삭제</Button></li>)}</ul> : <p className={styles.sectionText}>등록된 부계정이 없습니다.</p>}
    <Dialog open={open} onOpenChange={(value) => { if (!pending) { if (value) setOpen(true); else closeAdd(); } }}>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>부계정 추가</DialogTitle><DialogDescription>같은 게임에서 사용하는 추가 계정의 닉네임을 기록하세요.</DialogDescription></DialogHeader>
        <p className={styles.notice}>부계정은 자기신고 정보입니다. 클랜의 공개 범위 설정에 따라 같은 클랜의 운영진 또는 구성원에게 공개될 수 있습니다.</p>
        <label className="grid gap-2 text-xs">부계정 닉네임<Input value={nick} disabled={pending} maxLength={32} onChange={(event) => setNick(event.target.value)} placeholder="예: Player#1234" /></label>
        <label className="grid gap-2 text-xs">메모 (선택)<textarea value={note} disabled={pending} maxLength={500} rows={3} onChange={(event) => setNote(event.target.value)} className="border-input bg-background rounded-md border p-3 text-sm" /></label>
        <label className="flex items-start gap-2 text-xs leading-relaxed"><input type="checkbox" checked={agreed} disabled={pending} onChange={(event) => setAgreed(event.target.checked)} className="accent-primary mt-0.5 size-4 shrink-0" /><span>자기신고 정보임을 이해하며, 위 공개 범위에 동의합니다.</span></label>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={closeAdd}>취소</Button><Button type="button" disabled={pending || !nick.trim() || !agreed} onClick={onAddSubmit}>{pending ? "추가 중…" : "추가"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={deleting != null} onOpenChange={(value) => { if (!pending && !value) setDeleting(null); }}>
      <DialogContent><DialogHeader><DialogTitle>부계정 등록 삭제</DialogTitle><DialogDescription>「{deleting?.alt_nick}」을 부계정 목록에서 삭제할까요? 게임 계정 자체는 삭제되지 않습니다.</DialogDescription></DialogHeader>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => setDeleting(null)}>취소</Button><Button type="button" variant="destructive" disabled={pending} onClick={onDelete}>{pending ? "삭제 중…" : "삭제"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
