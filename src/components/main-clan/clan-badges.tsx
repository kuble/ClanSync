"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Flame, ShieldCheck, Sparkles, Swords, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setFeaturedBadgesAction, acknowledgeBadgesAction } from "@/app/actions/clan-badges";
import { CLAN_BADGE_ARTWORK, type ClanBadge, type ClanBadgeCollection, type ClanBadgeKey } from "@/lib/clan/badges";
import { cn } from "@/lib/utils";
import styles from "./clan-collection.module.css";

const icons = { flame: Flame, swords: Swords, shield: ShieldCheck, sparkles: Sparkles };
const badgeDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul" });

function acquisitionMethod(badge: ClanBadge) {
  if (badge.key === "founding") return "클랜 창단";
  if ("years" in badge) return "클랜 창단 " + badge.years + "주년";
  return badge.group + " " + badge.target + "회 종료";
}

export function ClanBadges({
  collection, gameSlug, clanId, compact = false, canManage = false, className,
}: {
  collection: ClanBadgeCollection; gameSlug: string; clanId: string;
  compact?: boolean; canManage?: boolean; className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selectedKey, setSelectedKey] = useState<ClanBadgeKey | null>(null);
  const [group, setGroup] = useState("전체");
  const detailsId = useId();
  const featured = collection.featured ?? collection.badges.filter(b => b.earned).slice(0, 3).map(b => b.key);
  const badges = compact
    ? featured.flatMap(key => collection.badges.filter(b => b.key === key))
    : collection.badges.filter(b => group === "전체" || b.group === group);
  const selected = badges.find(b => b.key === selectedKey) ?? badges[0] ?? null;
  const fresh = collection.badges.filter(b => b.isNew);
  const caseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (compact) return;
    const animations: Animation[] = [];
    for (const badge of collection.badges.filter(b => b.isNew)) {
      const emblem = caseRef.current?.querySelector<HTMLElement>(`[data-badge="${badge.key}"] [data-emblem]`);
      if (!emblem) continue;
      const key = `clansync:badge-motion:${collection.userId}:${clanId}:${badge.key}:${badge.awardedAt}`;
      try {
        if (localStorage.getItem(key)) continue;
        localStorage.setItem(key, "seen");
      } catch { continue; }
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        animations.push(emblem.animate(
          [{ transform: "translateY(-12px) scale(1.08)", opacity: .4 }, { transform: "translateY(0) scale(1)", opacity: 1 }],
          { duration: 550, easing: "ease" },
        ));
      }
    }
    return () => animations.forEach(animation => animation.cancel());
  }, [collection, clanId, compact, group]);

  function feature(key: ClanBadgeKey) {
    const next = featured.includes(key) ? featured.filter(k => k !== key) : [...featured, key];
    if (next.length > 3) {
      toast.error("대표 배지는 최대 3개예요. 다른 배지를 먼저 해제해 주세요.");
      return;
    }
    start(async () => {
      try {
        const result = await setFeaturedBadgesAction(gameSlug, clanId, next);
        if (!result.ok) { toast.error(result.error); return; }
        toast.success("대표 배지를 저장했습니다.");
        router.refresh();
      } catch { toast.error("대표 배지를 저장하지 못했습니다."); }
    });
  }

  const details = <section id={detailsId} className={cn(styles.badgeDetails, !compact && styles.stickyDetails)}
    aria-label="선택한 배지 정보" aria-live="polite" aria-atomic="true">
    {selected && <dl className={styles.detailGrid}>
      <div><dt>이름</dt><dd className={styles.detailName}>{selected.name}</dd></div>
      <div><dt>획득 방식</dt><dd>{acquisitionMethod(selected)}
        {selected.target > 0 && !selected.earned && <span className={styles.detailProgress}>{selected.progress}</span>}
      </dd></div>
      <div><dt>획득일</dt><dd>{selected.earned
        ? selected.earnedAt ? badgeDate.format(new Date(selected.earnedAt)) : "확인 필요"
        : "미획득"}</dd></div>
    </dl>}
  </section>;

  return <div className={cn("space-y-4", className)}>
    {!compact && <>
      <div className="flex flex-wrap gap-2" aria-label="배지 컬렉션">
        {["전체", "기념", "정규 내전", "깜짝 내전"].map(value =>
          <Button key={value} size="sm" variant={group === value ? "default" : "outline"}
            aria-pressed={group === value} onClick={() => setGroup(value)}>{value}</Button>)}
      </div>
      {fresh.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary/10 p-3 text-sm">
        <span role="status">새로 획득한 배지 {fresh.length}개</span>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => {
          try {
            const result = await acknowledgeBadgesAction(gameSlug, clanId);
            if (!result.ok) toast.error(result.error);
            else router.refresh();
          } catch { toast.error("확인 상태를 저장하지 못했습니다."); }
        })}>획득 확인</Button>
      </div>}
    </>}
    {!compact && details}
    <div className={styles.case}>
      <div className={styles.casePlate}>{collection.clanName}</div>
      <div ref={caseRef} className={cn(styles.caseGrid, compact && styles.compactGrid)} aria-label="배지 진열">
        {badges.map(b => {
          const artwork = CLAN_BADGE_ARTWORK[b.key];
          const mask = "years" in b ? CLAN_BADGE_ARTWORK.anniversary : artwork;
          return <button key={b.key} data-badge={b.key} type="button" title={b.name}
          aria-label={b.name + " " + (b.earned ? "획득" : "미획득")}
          aria-pressed={selected?.key === b.key} aria-controls={detailsId}
          className={cn(styles.pin, artwork ? styles.artworkSocket : styles[b.icon])}
          style={mask ? { "--badge-mask": `url("/_next/image?url=${encodeURIComponent(mask)}&w=256&q=75")` } as CSSProperties : undefined}
          onClick={() => setSelectedKey(b.key)}>
          <span className={styles.socketShadow} aria-hidden="true">
            <span className={styles.socketRim}><span className={styles.socketWell} /></span>
          </span>
          {b.earned && <BadgeEmblem badge={b} compact={compact} />}
        </button>;
        })}
        {badges.length === 0 && <p className={styles.caseEmpty}>대표 배지를 지정해 주세요.</p>}
      </div>
    </div>
    {compact && details}
    {!compact && canManage && selected?.earned && <div className="flex justify-end">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => feature(selected.key)}>
        <Star className={cn("size-4", featured.includes(selected.key) && "fill-primary text-primary")} />
        {featured.includes(selected.key) ? "대표 배지 해제" : "대표 배지 지정"}
      </Button>
    </div>}
    {compact
      ? <Link href={"/games/" + gameSlug + "/clan/" + clanId + "/badges"} className="inline-flex text-xs font-medium text-primary">배지 케이스 보기 →</Link>
      : <p className="text-xs leading-6 text-muted-foreground">내전 배지는 종료된 회차를 기준으로 합니다. 기록 정정으로 조건에 미달하면 다시 미획득으로 표시됩니다.</p>}
  </div>;
}

function BadgeEmblem({ badge, compact }: { badge: ClanBadge; compact: boolean }) {
  const Icon = icons[badge.icon], artwork = CLAN_BADGE_ARTWORK[badge.key];
  return <span data-emblem className={cn(styles.emblem, artwork && styles.artwork)}>
    {artwork
      ? <Image src={artwork} alt="" width={256} height={256} loading={compact || badge.key === "founding" ? "eager" : "lazy"}
          sizes={compact ? "(max-width: 640px) 28vw, 220px" : "(max-width: 640px) 44vw, 240px"} className={styles.badgeImage} />
      : <><span className={styles.enamel} /><Icon className={styles.badgeIcon} aria-hidden="true" /></>}
  </span>;
}
