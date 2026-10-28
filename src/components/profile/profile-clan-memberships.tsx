"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, LogOut } from "lucide-react";
import { leaveClanAction } from "@/app/actions/clan-manage-members";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import styles from "./profile.module.css";

type Membership = { clanId: string; clanName: string; gameSlug: string; gameName: string; role: string };
export function ProfileClanMemberships({ rows, userId }: { rows: Membership[]; userId: string }) {
  const [leaving, setLeaving] = useState<Membership | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!rows.length) return null;
  return <section className={styles.accountClans} aria-label="내 클랜">
    <h2 className={styles.accountSubheading}>내 클랜</h2>
    <ul className={styles.accountClanList}>{rows.map((row) => <li key={row.clanId} className={styles.accountClanRow}>
      <div className={styles.accountClanName}><Link className="text-sm font-semibold hover:text-primary" href={`/games/${row.gameSlug}/clan/${row.clanId}`}>{row.clanName}</Link><span className={styles.accountClanRole}>{row.role === "leader" ? "클랜장" : row.role === "officer" ? "운영진" : "멤버"}</span></div>
      <div className={styles.accountClanActions}><Link className={styles.accountRecordLink} href={`/games/${row.gameSlug}/clan/${row.clanId}/stats?player=${encodeURIComponent(userId)}`}>개인 기록 보기<ArrowUpRight size={14} aria-hidden="true" /></Link><Button variant="destructive" size="sm" title="클랜 탈퇴" onClick={() => { setError(""); setLeaving(row); }} aria-label={`${row.clanName} 클랜 탈퇴`}><LogOut className="size-3.5" aria-hidden="true" />클랜 탈퇴</Button></div>
    </li>)}</ul>
    <Dialog open={!!leaving} onOpenChange={(open) => { if (!open && !pending) setLeaving(null); }}>
      <DialogContent showCloseButton={!pending} className="sm:max-w-lg"><DialogHeader><DialogTitle>클랜을 탈퇴할까요?</DialogTitle><DialogDescription>{leaving?.clanName}에서 탈퇴하며 멤버 권한이 종료됩니다.</DialogDescription></DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">계정과 보유 코인·아이템·엠블럼, 작성한 글·댓글, 내전 기록과 통계는 남습니다.</p>
        {leaving?.role === "leader" && <p className="text-sm text-muted-foreground">클랜장은 클랜장 권한을 위임한 뒤 탈퇴할 수 있습니다.</p>}
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 border-t pt-4"><Button size="sm" variant="outline" disabled={pending} onClick={() => setLeaving(null)}>취소</Button><Button size="sm" variant="destructive" disabled={pending || leaving?.role === "leader"} onClick={() => {
          if (!leaving) return;
          start(async () => {
            const result = await leaveClanAction(leaving.gameSlug, leaving.clanId);
            if (!result.ok) { setError(result.error); return; }
            setLeaving(null); toast.success("클랜에서 탈퇴했습니다. 이전 기록은 유지됩니다."); router.refresh();
          });
        }}>{pending ? "처리 중…" : "클랜 탈퇴"}</Button></div>
      </DialogContent>
    </Dialog>
  </section>;
}
