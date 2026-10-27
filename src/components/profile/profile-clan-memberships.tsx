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
      <DialogContent showCloseButton={!pending} className="sm:max-w-lg"><DialogHeader><DialogTitle>클랜을 탈퇴할까요?</DialogTitle><DialogDescription>{leaving?.clanName}의 소속만 해제합니다. 클랜싱크 계정은 삭제되지 않습니다.</DialogDescription></DialogHeader>
        <section aria-label="클랜 탈퇴 시 종료되는 항목" className="rounded-lg border p-3"><h3 className="text-sm font-semibold text-destructive">종료되는 소속·권한</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground"><li>이 클랜의 현재 멤버 자격과 직위</li><li>클랜 전용 화면 열람과 내전·게시판 등 멤버 전용 기능 이용</li></ul></section>
        <section aria-label="클랜 탈퇴 시 유지되는 항목" className="rounded-lg border p-3"><h3 className="text-sm font-semibold">삭제되지 않고 유지되는 정보</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground"><li>클랜싱크 계정, 연동 게임·부계정, 다른 클랜의 소속</li><li>이 클랜에서 쌓은 내전 기록과 통계, 작성한 글·댓글</li><li>보유 코인·꾸미기 아이템과 획득한 개인 엠블럼</li></ul></section>
        {leaving?.role === "leader" ? <p className="text-sm text-muted-foreground">클랜장은 클랜장 권한을 위임한 뒤 탈퇴할 수 있습니다.</p> : <p className="text-sm text-muted-foreground">같은 계정으로 재가입을 신청하고 운영진이 승인하면 일반 멤버로 돌아오며, 기존 내전 기록을 이어서 사용합니다.</p>}
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
