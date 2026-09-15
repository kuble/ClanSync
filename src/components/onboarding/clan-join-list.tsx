"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clock3, ExternalLink, Users } from "lucide-react";
import { toast } from "sonner";
import { replacePendingJoinRequestAction, submitClanJoinRequestAction } from "@/app/actions/game-clan-onboarding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import styles from "./onboarding.module.css";

export type ClanListRow = {
  id: string; name: string; description: string | null; tags: string[]; max_members: number;
  active_members?: number | null; rules?: string | null; style?: string | null; tier_range?: string[];
  created_at?: string; discord_url?: string | null; kakao_url?: string | null; subscription_tier?: string;
};
const STYLE_LABEL: Record<string, string> = { social: "친목", casual: "즐겜", tryhard: "빡겜", pro: "프로" };
const TIER_LABEL: Record<string, string> = { bronze: "브론즈", silver: "실버", gold: "골드", plat: "플래티넘", diamond: "다이아몬드", master: "마스터", gm: "그랜드마스터", challenger: "챌린저" };

function safeExternalUrl(value?: string | null) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.href : null; } catch { return null; }
}

export function ClanJoinList({ gameSlug, clans, pendingClanId = null, blockingClanName = null, pinnedPendingClan = null }: {
  gameSlug: string; clans: ClanListRow[]; pendingClanId?: string | null; blockingClanName?: string | null; pinnedPendingClan?: ClanListRow | null;
}) {
  const router = useRouter();
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [selected, setSelected] = useState<ClanListRow | null>(null);
  const [details, setDetails] = useState<ClanListRow | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [blockName, setBlockName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const effectivePendingId = sentId ?? pendingClanId;
  const displayClans = clans.filter((clan) => clan.id !== pinnedPendingClan?.id);

  function openApply(clan: ClanListRow) {
    setSelected(clan); setMessage(""); setError(null);
    if (effectivePendingId && effectivePendingId !== clan.id) {
      setBlockName(blockingClanName ?? selected?.name ?? "다른 클랜");
      setReplaceOpen(true); setApplyingId(null);
    } else setApplyingId((id) => id === clan.id ? null : clan.id);
  }
  async function runSubmit(replace: boolean) {
    if (!selected || busy) return;
    setBusy(true); setError(null);
    try {
      const result = replace ? await replacePendingJoinRequestAction(gameSlug, selected.id, message) : await submitClanJoinRequestAction(gameSlug, selected.id, message);
      if (result.ok) {
        setSentId(selected.id); setApplyingId(null); setReplaceOpen(false);
        toast.success(replace ? "기존 신청을 취소하고 새로 신청했습니다." : "가입 신청을 보냈습니다.", { duration: 4800 });
        router.refresh();
      } else if (result.error.startsWith("PENDING_ELSEWHERE:")) {
        setBlockName(result.error.slice("PENDING_ELSEWHERE:".length)); setReplaceOpen(true);
      } else { setError(result.error); toast.error(result.error); }
    } catch {
      setError("가입 신청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setBusy(false); }
  }

  function renderCard(clan: ClanListRow, pinned = false) {
    const isPending = effectivePendingId === clan.id;
    const otherPending = effectivePendingId != null && !isPending;
    const full = clan.active_members != null && clan.active_members >= clan.max_members;
    return <article className={styles.clanCard}>
      <button type="button" className={styles.overview} onClick={() => setDetails(clan)} aria-label={`${clan.name} 클랜 상세 보기`}>
        <span className={styles.clanEmblem} aria-hidden="true">{clan.name.slice(0, 1)}</span>
        <span className={styles.clanText}>
          <span className={styles.clanTitle}>{clan.name}{clan.subscription_tier === "premium" ? <Badge variant="outline">Premium</Badge> : null}</span>
          <span className={styles.clanSubtitle}>{clan.style ? STYLE_LABEL[clan.style] ?? clan.style : "함께할 클랜원 모집"}{full ? " · 정원 마감" : ""}</span>
          <span className={`${styles.clanIntro} block line-clamp-2`}>{clan.description || "클랜 소개를 아직 작성하지 않았습니다."}</span>
        </span>
        <span className={`${styles.tagRow} ${styles.cardTags}`}>{clan.tags.slice(0, 4).map((tag) => <span className={styles.tag} key={tag}>{tag}</span>)}</span>
      </button>
      <div className={styles.clanFooter}>
        <span className={styles.memberCount}><Users size={14} aria-hidden="true" />{clan.active_members != null ? `${clan.active_members}/${clan.max_members}명` : `정원 ${clan.max_members}명`}</span>
        {isPending ? <Badge variant="outline" data-testid={pinned ? "clan-join-pinned-pending-badge" : `clan-join-pending-${clan.id}`}><Clock3 size={12} aria-hidden="true" />신청 대기 중</Badge> : <Button type="button" size="sm" variant={otherPending ? "secondary" : "default"} disabled={busy || full} data-testid={`clan-join-${otherPending ? "switch" : "open"}-${clan.id}`} aria-expanded={applyingId === clan.id} onClick={() => openApply(clan)}>{full ? "정원 마감" : otherPending ? "이 클랜으로 신청 바꾸기" : applyingId === clan.id ? "신청 폼 닫기" : "가입 신청"}</Button>}
      </div>
      {applyingId === clan.id && !isPending ? <div className={styles.applyPanel}>
        <p className="text-sm font-semibold">{clan.name}에 신청</p>
        <label htmlFor={`join-message-${clan.id}`}>운영진에게 전달할 메시지 (선택)</label>
        <textarea id={`join-message-${clan.id}`} name="message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="자기소개 (선택)" maxLength={2000} disabled={busy} />
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        <div className={styles.actions}><Button type="button" size="sm" disabled={busy} data-testid={`clan-join-send-${clan.id}`} onClick={() => void runSubmit(false)}>{busy ? "보내는 중…" : "보내기"}</Button><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setApplyingId(null)}>취소</Button></div>
      </div> : null}
    </article>;
  }

  return <>
    {pinnedPendingClan ? <section aria-label="내가 신청한 클랜" className="mb-5" data-testid="clan-join-pinned-pending-section"><p className="text-primary mb-3 text-xs font-semibold">신청 진행 중인 클랜</p>{renderCard(pinnedPendingClan, true)}</section> : null}
    {displayClans.length ? <ul className={styles.clanList}>{displayClans.map((clan) => <li key={clan.id}>{renderCard(clan)}</li>)}</ul> : <p className={styles.empty}>{pinnedPendingClan ? "검색 결과에 다른 클랜이 없습니다. 검색어와 필터를 바꿔 보세요." : "조건에 맞는 클랜이 없습니다. 검색어를 바꾸거나 새 클랜을 만들어 보세요."}</p>}
    <Dialog open={replaceOpen} onOpenChange={(open) => { if (!busy) setReplaceOpen(open); }}>
      <DialogContent><DialogHeader><DialogTitle>진행 중인 신청이 있습니다</DialogTitle><DialogDescription>현재 「{blockName}」에 가입 신청 중입니다. 취소하고 「{selected?.name}」에 새로 신청할까요?</DialogDescription></DialogHeader>
        <label className="grid gap-2 text-xs">가입 메시지 (선택)<textarea className="border-border min-h-24 rounded-md border p-3 text-sm" value={message} maxLength={2000} disabled={busy} onChange={(event) => setMessage(event.target.value)} /></label>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setReplaceOpen(false)}>아니오</Button><Button type="button" disabled={busy} onClick={() => void runSubmit(true)}>{busy ? "처리 중…" : "취소 후 새로 신청"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={details != null} onOpenChange={(open) => { if (!open) setDetails(null); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><div className={styles.detailHeading}><span className={styles.clanEmblem} aria-hidden="true">{details?.name.slice(0, 1)}</span><div><DialogTitle>{details?.name}</DialogTitle><DialogDescription className="mt-2">클랜 소개와 가입 정보를 확인하세요.</DialogDescription></div></div></DialogHeader>
        {details ? <div className={styles.detailBody}>
          <section><h3>클랜 소개</h3><p>{details.description || "등록된 소개가 없습니다."}</p></section>
          <section><h3>클랜 규칙</h3><p>{details.rules || "등록된 규칙이 없습니다."}</p></section>
          <section><h3>모집 정보</h3><div className={styles.tagRow}><span className={styles.tag}>{details.style ? STYLE_LABEL[details.style] ?? details.style : "지향 무관"}</span>{details.tier_range?.map((tier) => <span className={styles.tag} key={tier}>{TIER_LABEL[tier] ?? tier}</span>)}{details.tags.map((tag) => <span className={styles.tag} key={tag}>{tag}</span>)}</div><p className="mt-3">{details.active_members != null ? `${details.active_members} / ${details.max_members}명` : `정원 ${details.max_members}명`}{details.created_at ? ` · ${new Date(details.created_at).toLocaleDateString("ko-KR")} 창설` : ""}</p></section>
          {safeExternalUrl(details.discord_url) || safeExternalUrl(details.kakao_url) ? <section><h3>외부 링크</h3>{safeExternalUrl(details.discord_url) ? <a href={safeExternalUrl(details.discord_url)!} target="_blank" rel="noopener noreferrer">디스코드 <ExternalLink size={12} aria-hidden="true" /></a> : null}{safeExternalUrl(details.kakao_url) ? <a href={safeExternalUrl(details.kakao_url)!} target="_blank" rel="noopener noreferrer">카카오톡 <ExternalLink size={12} aria-hidden="true" /></a> : null}</section> : null}
        </div> : null}
        <DialogFooter><Button type="button" variant="outline" onClick={() => setDetails(null)}>닫기</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
