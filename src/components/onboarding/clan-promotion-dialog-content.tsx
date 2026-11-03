"use client";

import { useTranslator } from "#use-translator";
import { Shield } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { CalendarDays, Compass, Layers, Trophy, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CLAN_STYLES, recruitmentLabels, recruitmentPositionLabel } from "@/lib/clan/recruitment";
import { promotionBlocks, promotionImageUrl } from "@/lib/clan/promotion";
import type { ClanListRow } from "./clan-join-list";
import styles from "./clan-discovery.module.css";

export type PromotionDisplayBlock = { type: "text"; text: string } | { type: "image"; src: string; alt: string };

export function ClanPromotionDialogContent({ gameSlug, clan, title, blocks, onClose, action, favorite }: {
  gameSlug: string; clan: ClanListRow; title?: string; blocks?: PromotionDisplayBlock[]; onClose: () => void; action?: ReactNode; favorite?: ReactNode;
}) {
  const tx = useTranslator();
  const content = blocks ?? (clan.promotion
    ? promotionBlocks(clan.promotion).map(block => block.type === "text" ? block : { type: "image" as const, src: promotionImageUrl(gameSlug, clan.id, block.path), alt: block.alt })
    : [{ type: "text" as const, text: clan.description || "등록된 소개가 없습니다." }]);
  const [birthYear, gender, ...tiers] = recruitmentLabels(gameSlug, {
    birth_year_from: clan.birth_year_from ?? null, min_birth_year: clan.min_birth_year ?? null,
    gender_policy: clan.gender_policy ?? "all", tier_range: clan.tier_range ?? [],
  });
  const tags = [
    { icon: CalendarDays, label: birthYear },
    { icon: UsersRound, label: gender },
    { icon: Compass, label: CLAN_STYLES.find(style => style.value === clan.style)?.label ?? (clan.style || "지향 무관") },
    ...(gameSlug === "overwatch" ? [{ icon: Layers, label: recruitmentPositionLabel(clan.recruitment_positions ?? []) }] : []),
    ...tiers.map(label => ({ icon: Trophy, label })),
  ];
  return <DialogContent className={`sm:max-w-3xl ${styles.dialog}`}>
    <DialogHeader><div className={styles.detailHeading}><span className={styles.clanEmblem} aria-hidden="true">{clan.icon_url ? <Image src={clan.icon_url} alt="" width={44} height={44} unoptimized className="size-full rounded-[inherit] object-cover" /> : <Shield size={22} />}</span><div className="min-w-0">
      <DialogTitle className="break-words">{title ?? clan.promotion?.title ?? clan.name}</DialogTitle>
      <DialogDescription className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1"><span>{clan.name}</span>{clan.active_members != null && <span className="inline-flex items-center gap-1"><UsersRound size={13} aria-hidden />{tx("클랜원")} {clan.active_members.toLocaleString(tx.locale)}{tx("명")}</span>}</DialogDescription>
    </div>{favorite && <div className="ml-auto shrink-0 self-start">{favorite}</div>}</div></DialogHeader>
    <div className={styles.detailBody}>
      <ul aria-label={tx("홍보 태그")} className={styles.detailTags}>
        {tags.map(({ icon: Icon, label }, index) => (
          <li key={index}><Icon size={13} aria-hidden="true" />{tx(label)}</li>
        ))}
      </ul>
      <section className={styles.promotionBody} aria-label={tx("클랜 홍보 내용")}>{content.map((block, index) => block.type === "text"
        ? <span key={index}>{block.text}</span>
        : <Image key={index} src={block.src} alt={block.alt || tx("클랜 홍보 사진")} title={block.alt || undefined} width={1200} height={800} unoptimized />)}</section>
      {clan.rules && <details className={styles.rules}><summary>{tx("클랜 규칙")}</summary><p>{clan.rules}</p></details>}
    </div>
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{tx("닫기")}</Button>{action}</DialogFooter>
  </DialogContent>;
}
