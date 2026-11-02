"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { CalendarDays, ChevronRight, Clock3, Shield, Trophy } from "lucide-react";
import { toast } from "sonner";
import { replacePendingJoinRequestAction, submitClanJoinRequestAction } from "@/app/actions/game-clan-onboarding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import styles from "./clan-discovery.module.css";
import { CLAN_STYLES, recruitmentTierSummary, recruitmentYearLabel } from "@/lib/clan/recruitment";
import type { PromotionPost } from "@/lib/clan/promotion";
import { ClanPromotionDialogContent } from "./clan-promotion-dialog-content";

export type ClanListRow = {
  id: string; name: string; icon_url?: string | null; description: string | null; tags: string[]; max_members: number;
  active_members?: number | null; rules?: string | null; style?: string | null; tier_range?: string[]; recruitment_positions?: string[];
  created_at?: string; discord_url?: string | null; kakao_url?: string | null; subscription_tier?: string;
  birth_year_from?: number | null; min_birth_year?: number | null; gender_policy?: "all" | "male" | "female";
  promotion?: PromotionPost | null;
};
const STYLE_LABEL: Record<string, string> = Object.fromEntries(CLAN_STYLES.map(({value, label}) => [value, label]));

export function ClanJoinList({ gameSlug, clans, pendingClanId = null, blockingClanName = null, pinnedPendingClan = null, initialDetails = null, canApply = true }: {
  gameSlug: string; clans: ClanListRow[]; pendingClanId?: string | null; blockingClanName?: string | null; pinnedPendingClan?: ClanListRow | null; initialDetails?: ClanListRow | null; canApply?: boolean;
}) {
  const router = useRouter();
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [selected, setSelected] = useState<ClanListRow | null>(null);
  const [details, setDetails] = useState<ClanListRow | null>(initialDetails);
  const [message, setMessage] = useState("");
  const [blockName, setBlockName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const effectivePendingId = sentId ?? pendingClanId;
  const displayClans = clans.filter((clan) => clan.id !== pinnedPendingClan?.id);

  function closeDetails() {
    setDetails(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("promotion")) {
      url.searchParams.delete("promotion");
      window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
    }
  }
  function openApply(clan: ClanListRow) {
    if (!canApply) return;
    setSelected(clan); setMessage(""); setError(null);
    if (effectivePendingId && effectivePendingId !== clan.id) {
      setBlockName(blockingClanName ?? selected?.name ?? "다른 클랜");
      setReplaceOpen(true);
    } else setReplaceOpen(false);
  }
  async function runSubmit(replace: boolean) {
    if (!selected || busy || !canApply) return;
    setBusy(true); setError(null);
    try {
      const result = replace ? await replacePendingJoinRequestAction(gameSlug, selected.id, message) : await submitClanJoinRequestAction(gameSlug, selected.id, message);
      if (result.ok) {
        setSentId(selected.id); setSelected(null); setReplaceOpen(false);
        toast.success(replace ? "기존 신청을 취소하고 새로 신청했습니다." : "가입 신청을 보냈습니다.", { duration: 4800 });
        router.refresh();
      } else if (result.error.startsWith("PENDING_ELSEWHERE:")) {
        setBlockName(result.error.slice("PENDING_ELSEWHERE:".length)); setReplaceOpen(true);
      } else { setError(result.error); toast.error(result.error); }
    } catch {
      setError("가입 신청을 보내지 못했습니다. 잠시 후 다시 시도해 주십시오.");
    } finally { setBusy(false); }
  }

  function renderCard(clan: ClanListRow, pinned = false) {
    const isPending = effectivePendingId === clan.id;
    const otherPending = effectivePendingId != null && !isPending;
    const full = clan.active_members != null && clan.active_members >= clan.max_members;
    return <article className={styles.clanCard}>
      <button type="button" className={styles.overview} onClick={() => setDetails(clan)} aria-haspopup="dialog" aria-label={`${clan.name} 클랜 상세 보기`}>
        <span className={styles.miniEmblem} aria-hidden>
          {clan.icon_url ? <Image src={clan.icon_url} alt="" width={56} height={56} unoptimized /> : <Shield size={24} />}
        </span>
        <span className={styles.clanText}>
          <span className={styles.clanIdentity}>
            <strong>{clan.name}</strong>
            {clan.style && <span className={styles.clanSubtitle} data-style={clan.style}>{STYLE_LABEL[clan.style] ?? clan.style}</span>}
          </span>
          {clan.promotion?.title && <span className={styles.clanTitle}>{clan.promotion.title}</span>}
          <span className={styles.cardTags}>
            <span><CalendarDays size={12} aria-hidden />{recruitmentYearLabel({birth_year_from:clan.birth_year_from ?? null,min_birth_year:clan.min_birth_year ?? null})}</span>
            <span><Trophy size={12} aria-hidden />{recruitmentTierSummary(gameSlug, clan.tier_range ?? [])}</span>
          </span>
        </span>
        <ChevronRight size={16} aria-hidden className={styles.detailArrow} />
      </button>
      <div className={styles.clanFooter}>
        {!canApply ? <Badge variant="outline">홍보 미리보기</Badge> : isPending ? <Badge variant="outline" data-testid={pinned ? "clan-join-pinned-pending-badge" : `clan-join-pending-${clan.id}`}><Clock3 size={12} aria-hidden="true" />신청 대기 중</Badge> : <Button type="button" size="sm" variant={otherPending ? "secondary" : "default"} disabled={busy || full} data-testid={`clan-join-${otherPending ? "switch" : "open"}-${clan.id}`} aria-haspopup="dialog" onClick={() => openApply(clan)}>{full ? "정원 마감" : otherPending ? "이 클랜으로 신청 바꾸기" : "가입 신청"}</Button>}
      </div>
    </article>;
  }

  return <>
    {pinnedPendingClan ? <section aria-label="내가 신청한 클랜" className="mb-5" data-testid="clan-join-pinned-pending-section"><p className="text-primary mb-3 text-xs font-semibold">신청 진행 중인 클랜</p>{renderCard(pinnedPendingClan, true)}</section> : null}
    {displayClans.length ? <ul className={styles.clanList}>{displayClans.map((clan) => <li key={clan.id}>{renderCard(clan)}</li>)}</ul> : <p className={styles.empty}>{pinnedPendingClan ? "검색 결과에 다른 클랜이 없습니다. 검색어와 필터를 바꿔 보십시오." : "조건에 맞는 클랜이 없습니다. 검색어를 바꾸거나 새 클랜을 만들어 보십시오."}</p>}
    <Dialog open={selected != null} onOpenChange={open => { if (!open && !busy) setSelected(null); }}>
      {selected && <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{replaceOpen ? "진행 중인 신청이 있습니다" : selected.name + " 가입 신청"}</DialogTitle>
          <DialogDescription>{replaceOpen
            ? `현재 「${blockName}」에 가입 신청 중입니다. 취소하고 「${selected.name}」에 새로 신청하시겠습니까?`
            : "운영진에게 전달할 메시지를 함께 보낼 수 있습니다."}</DialogDescription>
        </DialogHeader>
        <label className="grid gap-2 text-xs">가입 메시지 (선택)
          <textarea className="border-border min-h-24 rounded-md border p-3 text-sm" placeholder="자기소개 (선택)" value={message} maxLength={2000} disabled={busy} onChange={event => setMessage(event.target.value)} />
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => setSelected(null)}>{replaceOpen ? "아니오" : "취소"}</Button>
          <Button type="button" disabled={busy} data-testid={`clan-join-send-${selected.id}`} onClick={() => void runSubmit(replaceOpen)}>{busy ? "보내는 중…" : replaceOpen ? "취소 후 새로 신청" : "보내기"}</Button>
        </DialogFooter>
      </DialogContent>}
    </Dialog>
    <Dialog open={details != null} onOpenChange={(open) => { if (!open) closeDetails(); }}>
      {details && <ClanPromotionDialogContent gameSlug={gameSlug} clan={details} onClose={closeDetails} action={canApply && <Button type="button" disabled={busy || effectivePendingId === details.id || (details.active_members != null && details.active_members >= details.max_members)} onClick={()=>{const clan=details; closeDetails(); openApply(clan);}}>{effectivePendingId === details.id ? "신청 대기 중" : details.active_members != null && details.active_members >= details.max_members ? "정원 마감" : "가입 신청"}</Button>} />}
    </Dialog>
  </>;
}
