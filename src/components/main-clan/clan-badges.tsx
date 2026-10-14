"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Flame, ShieldCheck, Sparkles, Swords, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { setFeaturedBadgesAction, acknowledgeBadgesAction } from "@/app/actions/clan-badges";
import { CLAN_BADGE_ARTWORK, getClanBadgeRepresentatives, type ClanBadge, type ClanBadgeCollection, type ClanBadgeKey } from "@/lib/clan/badges";
import { cn } from "@/lib/utils";
import styles from "./clan-collection.module.css";

const icons = { flame: Flame, swords: Swords, shield: ShieldCheck, sparkles: Sparkles };
const badgeDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul" });

function acquisitionMethod(badge: ClanBadge) {
  if (badge.key === "founding") return "클랜 창단";
  if ("years" in badge) return "클랜 창단 " + badge.years + "주년";
  if (badge.group === "멤버") return "활성 클랜원 " + badge.target + "명";
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
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [seriesKey, setSeriesKey] = useState<ClanBadgeKey | null>(null);
  const detailsId = useId();
  const seriesDetailsId = useId();
  const displayBadges = getClanBadgeRepresentatives(collection.badges);
  const storedFeatured = collection.featured ?? displayBadges.filter(b => b.earned).slice(0, 3).map(b => b.key);
  const featured = [...new Set(storedFeatured.map(key => {
    const badge = collection.badges.find(b => b.key === key);
    return badge && "series" in badge ? displayBadges.find(b => "series" in b && b.series === badge.series)?.key ?? key : key;
  }))];
  const badges = compact
    ? featured.flatMap(key => displayBadges.filter(b => b.key === key && b.earned))
    : displayBadges.filter(b => group === "전체" || b.group === group);
  const selected = badges.find(b => b.key === selectedKey) ?? badges[0] ?? null;
  const seriesSelected = collection.badges.find(b => b.key === seriesKey);
  const series = seriesSelected && "series" in seriesSelected ? collection.badges.filter(b => "series" in b && b.series === seriesSelected.series) : [];
  const seriesRepresentative = seriesSelected && "series" in seriesSelected ? displayBadges.find(b => "series" in b && b.series === seriesSelected.series) : null;
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

  return <Dialog open={seriesOpen} onOpenChange={setSeriesOpen}><div className={cn("space-y-4", className)}>
    {!compact && <>
      <div className="flex flex-wrap gap-2" aria-label="배지 컬렉션">
        {["전체", "기념", "멤버", "정규 내전", "깜짝 내전"].map(value =>
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
      <div ref={caseRef} className={cn(styles.caseGrid, compact && styles.compactGrid)} role="group" aria-label="배지 진열">
        {badges.map(b => {
          const hasSeries = "series" in b;
          const pin = renderPin(b, compact, selected?.key === b.key, () => {
            setSelectedKey(b.key);
            if (hasSeries) setSeriesKey(b.key);
          }, hasSeries ? undefined : detailsId, true);
          return hasSeries ? <DialogTrigger key={b.key} render={pin} /> : pin;
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
      : <p className="text-xs leading-6 text-muted-foreground">내전 배지는 종료된 회차, 멤버 배지는 현재 활성 인원을 기준으로 합니다. 조건에 미달하면 다시 미획득으로 표시됩니다.</p>}
    {seriesSelected && seriesRepresentative && <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:max-w-3xl sm:p-7">
      <div className={styles.seriesHeader}>
        <div className={cn(styles.pin, styles.seriesArtwork, styles[seriesSelected.icon], !seriesSelected.earned && styles.unearnedPreview)}>
          {CLAN_BADGE_ARTWORK[seriesSelected.key]
            ? <Image key={seriesSelected.key} src={CLAN_BADGE_ARTWORK[seriesSelected.key]!}
                alt={seriesSelected.name + " 배지"} width={320} height={320} loading="eager"
                sizes="(max-width: 640px) 180px, 260px" className={styles.badgeImage} />
            : <BadgeEmblem badge={seriesSelected} compact={false} />}
        </div>
        <section id={seriesDetailsId} className={styles.seriesDescription} aria-label="배지 계열 설명" aria-live="polite">
          <p className="text-xs text-muted-foreground">{seriesSelected.group}{seriesSelected.group === "기념" ? " · 자라는 역사" : seriesSelected.group === "멤버" ? " · 우리의 성채" : ""}</p>
          <DialogTitle className="text-2xl font-semibold">{seriesSelected.name}</DialogTitle>
          <DialogDescription className="leading-7">{seriesSelected.story}</DialogDescription>
          <span className={cn(styles.seriesStatus, seriesSelected.earned && styles.earnedStatus)}>
            {seriesSelected.earned ? "획득" : "미획득 · 미리보기"}
          </span>
          <dl className={styles.seriesFacts}>
            <div><dt>획득 방식</dt><dd>{acquisitionMethod(seriesSelected)}</dd></div>
            <div><dt>{seriesSelected.earned ? "획득일" : "years" in seriesSelected ? "획득 예정일" : "현재 진행"}</dt>
              <dd>{seriesSelected.earned
                ? seriesSelected.earnedAt ? badgeDate.format(new Date(seriesSelected.earnedAt)) : "확인 필요"
                : seriesSelected.progress}</dd></div>
          </dl>
          {!compact && canManage && seriesSelected.earned && seriesSelected.key === seriesRepresentative.key &&
            <Button size="sm" variant="outline" disabled={pending} onClick={() => feature(seriesRepresentative.key)}>
              <Star className={cn("size-4", featured.includes(seriesRepresentative.key) && "fill-primary text-primary")} />
              {featured.includes(seriesRepresentative.key) ? "대표 배지 해제" : "대표 배지 지정"}
            </Button>}
        </section>
      </div>
      <section className="mt-2 space-y-3" aria-label="계열의 기록">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold">성장의 기록</h3><p className="text-right text-xs text-muted-foreground">{series.map(b => "years" in b ? b.years + "주년" : b.target + (b.group === "멤버" ? "명" : "회")).join(" · ")}</p>
        </div>
        <div className={styles.case}>
          <div className={styles.caseGrid} role="group" aria-label="연관 단계 배지">
            {series.map(b => renderPin(b, false, b.key === seriesSelected.key, () => setSeriesKey(b.key), seriesDetailsId))}
          </div>
        </div>
      </section>
    </DialogContent>}
  </div></Dialog>;
}

function renderPin(badge: ClanBadge, compact: boolean, selected: boolean, onClick: () => void, controls?: string, eager = false) {
  const artwork = CLAN_BADGE_ARTWORK[badge.key];
  const mask = badge.group === "멤버" ? CLAN_BADGE_ARTWORK["members-10"] : "years" in badge ? CLAN_BADGE_ARTWORK.anniversary : artwork;
  return <button key={badge.key} data-badge={badge.key} type="button" title={badge.name}
    aria-label={badge.name + " " + (badge.earned ? "획득" : "미획득")}
    aria-pressed={selected} aria-controls={controls}
    className={cn(styles.pin, artwork ? styles.artworkSocket : styles[badge.icon])}
    style={mask ? { "--badge-mask": `url("/_next/image?url=${encodeURIComponent(mask)}&w=256&q=75")` } as CSSProperties : undefined}
    onClick={onClick}>
    <span className={styles.socketShadow} aria-hidden="true">
      <span className={styles.socketRim}><span className={styles.socketWell} /></span>
    </span>
    {badge.earned && <BadgeEmblem badge={badge} compact={compact} eager={eager} />}
  </button>;
}

function BadgeEmblem({ badge, compact, eager = false }: { badge: ClanBadge; compact: boolean; eager?: boolean }) {
  const Icon = icons[badge.icon], artwork = CLAN_BADGE_ARTWORK[badge.key];
  return <span data-emblem className={cn(styles.emblem, artwork && styles.artwork)}>
    {artwork
      ? <Image src={artwork} alt="" width={256} height={256} loading={eager || compact || badge.key === "founding" ? "eager" : "lazy"}
          sizes={compact ? "(max-width: 640px) 28vw, 220px" : "(max-width: 640px) 44vw, 240px"} className={styles.badgeImage} />
      : <><span className={styles.enamel} /><Icon className={styles.badgeIcon} aria-hidden="true" /></>}
  </span>;
}
