"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CLAN_STYLES, recruitmentLabels, recruitmentPositionLabel, recruitmentTierLabel } from "@/lib/clan/recruitment";
import { promotionBlocks, promotionImageUrl } from "@/lib/clan/promotion";
import type { ClanListRow } from "./clan-join-list";
import styles from "./clan-discovery.module.css";

export type PromotionDisplayBlock = { type: "text"; text: string } | { type: "image"; src: string; alt: string };

function safeExternalUrl(value?: string | null) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.href : null; } catch { return null; }
}

export function ClanPromotionDialogContent({ gameSlug, clan, title, blocks, onClose, action }: {
  gameSlug: string; clan: ClanListRow; title?: string; blocks?: PromotionDisplayBlock[]; onClose: () => void; action?: ReactNode;
}) {
  const content = blocks ?? (clan.promotion
    ? promotionBlocks(clan.promotion).map(block => block.type === "text" ? block : { type: "image" as const, src: promotionImageUrl(gameSlug, clan.id, block.path), alt: block.alt })
    : [{ type: "text" as const, text: clan.description || "등록된 소개가 없습니다." }]);
  return <DialogContent className={`sm:max-w-3xl ${styles.dialog}`}>
    <DialogHeader><div className={styles.detailHeading}><span className={styles.clanEmblem} aria-hidden="true">{clan.name.slice(0, 1)}</span><div className="min-w-0">
      <DialogTitle className="break-words">{title ?? clan.promotion?.title ?? clan.name}</DialogTitle>
      <DialogDescription className="mt-2">{clan.name}</DialogDescription>
    </div></div></DialogHeader>
    <div className={styles.detailBody}>
      <section className={styles.promotionBody} aria-label="클랜 홍보 내용">{content.map((block, index) => block.type === "text"
        ? <span key={index}>{block.text}</span>
        : <Image key={index} src={block.src} alt={block.alt || "클랜 홍보 사진"} title={block.alt || undefined} width={1200} height={800} unoptimized />)}</section>
      <div className={styles.detailInfo}>
        <section><h3>가입 조건</h3><div className={styles.tagRow}>{recruitmentLabels(gameSlug, {
          birth_year_from: clan.birth_year_from ?? null, min_birth_year: clan.min_birth_year ?? null, gender_policy: clan.gender_policy ?? "all", tier_range: [],
        }).slice(0, 2).map(label => <span className={styles.tag} key={label}>{label}</span>)}</div>
          <p className="mt-3">{clan.active_members != null ? `${clan.active_members} / ${clan.max_members}명` : `정원 ${clan.max_members}명`}</p></section>
        <section><h3>모집 정보</h3><div className={styles.tagRow}>
          <span className={styles.tag}>{clan.style ? CLAN_STYLES.find(style => style.value === clan.style)?.label ?? clan.style : "지향 무관"}</span>
          {gameSlug === "overwatch" && <span className={styles.tag}>{recruitmentPositionLabel(clan.recruitment_positions ?? [])}</span>}
          {clan.tier_range?.map(tier => <span className={styles.tag} key={tier}>{recruitmentTierLabel(gameSlug, tier)}</span>)}
          {clan.tags.map(tag => <span className={styles.tag} key={tag}>{tag}</span>)}
        </div><p className="mt-3">모집 정보는 가입 신청을 제한하지 않습니다.</p></section>
      </div>
      {clan.rules && <details className={styles.rules}><summary>클랜 규칙</summary><p>{clan.rules}</p></details>}
      {safeExternalUrl(clan.discord_url) || safeExternalUrl(clan.kakao_url) ? <section><h3>외부 링크</h3>
        {safeExternalUrl(clan.discord_url) ? <a href={safeExternalUrl(clan.discord_url)!} target="_blank" rel="noopener noreferrer">디스코드 <ExternalLink size={12} aria-hidden="true" /></a> : null}
        {safeExternalUrl(clan.kakao_url) ? <a href={safeExternalUrl(clan.kakao_url)!} target="_blank" rel="noopener noreferrer">카카오톡 <ExternalLink size={12} aria-hidden="true" /></a> : null}
      </section> : null}
    </div>
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>닫기</Button>{action}</DialogFooter>
  </DialogContent>;
}
