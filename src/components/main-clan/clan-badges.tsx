"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useRef, useState, useSyncExternalStore, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Flame, ShieldCheck, Sparkles, Swords, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { setFeaturedBadgesAction, acknowledgeBadgesAction } from "@/app/actions/clan-badges";
import { CLAN_BADGES, CLAN_BADGE_ARTWORK, CLAN_BADGE_SERIES_NAMES, getClanBadgeRepresentatives, getFeaturedClanBadgeKeys, type ClanBadge, type ClanBadgeCollection, type ClanBadgeKey } from "@/lib/clan/badges";
import { cn } from "@/lib/utils";
import styles from "./clan-collection.module.css";

const icons = { flame: Flame, swords: Swords, shield: ShieldCheck, sparkles: Sparkles };
const badgeDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul" });
const categories = [
  { id: "전체", groups: [] },
  { id: "기념", groups: ["기념"] },
  { id: "동료", groups: ["멤버", "동료"] },
  { id: "내전", groups: ["정규 내전", "깜짝 내전"] },
  { id: "활동", groups: ["코칭", "게시판"] },
];
const checkedCache = new Map<string, string>();
function subscribeChecked(callback: () => void) {
  const storageChanged = (event: StorageEvent) => {
    if (event.key) checkedCache.delete(event.key);
    else checkedCache.clear();
    callback();
  };
  window.addEventListener("storage", storageChanged);
  window.addEventListener("clansync:badge-checked", callback);
  return () => {
    window.removeEventListener("storage", storageChanged);
    window.removeEventListener("clansync:badge-checked", callback);
  };
}
function checkedSnapshot(key: string) {
  try { return checkedCache.get(key) ?? localStorage.getItem(key) ?? "{}"; }
  catch { return checkedCache.get(key) ?? "{}"; }
}
function parseChecked(snapshot: string): Record<string, string> {
  try {
    const value = JSON.parse(snapshot);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

function acquisitionMethod(badge: ClanBadge) {
  if (badge.key === "founding") return "클랜 창단";
  if (badge.group === "동료" && "years" in badge) return badge.years + "년 이상 연속 소속된 활성 동료 10명";
  if (badge.metric === "anniversary") return "클랜 창단 " + badge.years + "주년";
  if (badge.group === "멤버") return "활성 클랜원 " + badge.target + "명";
  if (badge.group === "코칭") return "완료된 피드백 신청 " + badge.target.toLocaleString("ko-KR") + "건";
  if (badge.group === "게시판") return "자유 게시판 글 " + badge.target.toLocaleString("ko-KR") + "개";
  return "승·무·패를 기록한 " + badge.group + " " + badge.target.toLocaleString("ko-KR") + "회차";
}

export function ClanBadges({
  collection, gameSlug, clanId, compact = false, canManage = false, previewOnly = false, className,
}: {
  collection: ClanBadgeCollection; gameSlug: string; clanId: string;
  compact?: boolean; canManage?: boolean; previewOnly?: boolean; className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [group, setGroup] = useState("전체");
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [seriesKey, setSeriesKey] = useState<ClanBadgeKey | null>(null);
  const seriesDetailsId = useId();
  const checkedKey = `clansync:badge-checked:v1:${collection.userId}:${clanId}`;
  const checked = parseChecked(useSyncExternalStore(subscribeChecked, () => checkedSnapshot(checkedKey), () => "{}"));
  const displayBadges = getClanBadgeRepresentatives(collection.badges);
  const featured = getFeaturedClanBadgeKeys(collection);
  const badges = compact
    ? featured.flatMap(key => displayBadges.filter(b => b.key === key && b.earned))
    : displayBadges.filter(b => group === "전체" || categories.find(c => c.id === group)?.groups.includes(b.group));
  const seriesSelected = collection.badges.find(b => b.key === seriesKey);
  const series = seriesSelected && "series" in seriesSelected ? collection.badges.filter(b => "series" in b && b.series === seriesSelected.series) : [];
  const seriesRepresentative = seriesSelected && "series" in seriesSelected ? displayBadges.find(b => "series" in b && b.series === seriesSelected.series) : seriesSelected;
  const fresh = collection.badges.filter(b => b.earned && b.isNew && b.awardedAt);
  const unread = fresh.filter(b => checked[b.key] !== b.awardedAt);
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

  function inspect(badge: ClanBadge) {
    setSeriesKey(badge.key);
    const viewed = unread.filter(b => b.key === badge.key || ("series" in badge && "series" in b && b.series === badge.series));
    const next = { ...parseChecked(checkedSnapshot(checkedKey)) };
    if (viewed.length) {
      for (const b of viewed) next[b.key] = b.awardedAt!;
      const snapshot = JSON.stringify(next);
      checkedCache.set(checkedKey, snapshot);
      // shortcut: Partial reads are browser-local; use server per-badge reads if cross-device partial sync is needed.
      try { localStorage.setItem(checkedKey, snapshot); checkedCache.delete(checkedKey); }
      catch { /* Keep the in-memory snapshot when storage is unavailable. */ }
      window.dispatchEvent(new Event("clansync:badge-checked"));
    }
    if (fresh.length && fresh.every(b => next[b.key] === b.awardedAt)) {
      const latest = fresh.reduce((a, b) => Date.parse(a.awardedAt!) >= Date.parse(b.awardedAt!) ? a : b).awardedAt!;
      start(async () => {
        try {
          const result = await acknowledgeBadgesAction(gameSlug, clanId, latest);
          if (!result.ok) toast.error(result.error);
          else router.refresh();
        } catch { toast.error("확인 상태를 저장하지 못했습니다."); }
      });
    }
  }

  return <Dialog open={seriesOpen} onOpenChange={setSeriesOpen}><div inert={previewOnly} aria-hidden={previewOnly || undefined} className={cn("space-y-4", className)}>
    {!compact && <RubberSegment label="배지 컬렉션" labelPosition="hidden" value={group} onChange={setGroup}
      options={categories.map(category => {
        const hasNew = unread.some(b => category.id === "전체" || category.groups.includes(b.group));
        return { id: category.id, label: category.id, description: hasNew ? "새로 획득한 배지가 있습니다." : undefined, badge: hasNew ?
          <span data-new-badges aria-label="새 배지" className="inline-flex size-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold leading-none text-white">N</span> : undefined };
      })} />}
    <div data-badge-case className={cn(styles.case, compact && styles.compactCase)}>
      <div className={styles.casePlate}>{collection.clanName}</div>
      <div ref={caseRef} className={cn(styles.caseGrid, compact && styles.compactGrid)} role="group" aria-label="배지 진열">
        {badges.map(b => <DialogTrigger key={b.key} render={renderPin(b, compact, seriesOpen && seriesKey === b.key, () => inspect(b), undefined, true)} />)}
        {badges.length === 0 && <p className={styles.caseEmpty}>대표 배지를 지정해 주세요.</p>}
      </div>
    </div>
    {compact && !previewOnly && <Link href={"/games/" + gameSlug + "/clan/" + clanId + "/badges"} className="inline-flex text-xs font-medium text-primary">배지 케이스 보기 →</Link>}
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
          <p className="text-xs text-muted-foreground">{seriesSelected.group}{"series" in seriesSelected && " · "+CLAN_BADGE_SERIES_NAMES[seriesSelected.series]}</p>
          <DialogTitle className="text-2xl font-semibold">{seriesSelected.name}</DialogTitle>
          <DialogDescription className="leading-7">{seriesSelected.story}</DialogDescription>
          <span className={cn(styles.seriesStatus, seriesSelected.earned && styles.earnedStatus)}>
            {seriesSelected.earned ? "획득" : "미획득 · 미리보기"}
          </span>
          <dl className={styles.seriesFacts}>
            <div><dt>획득 방식</dt><dd>{acquisitionMethod(seriesSelected)}</dd></div>
            <div><dt>{seriesSelected.earned ? "획득일" : seriesSelected.metric === "anniversary" ? "획득 예정일" : "현재 진행"}</dt>
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
      {series.length > 0 && <section className="mt-2 space-y-3" aria-label="계열의 기록">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold">성장의 기록</h3><p className="text-right text-xs text-muted-foreground">{series.map(b => "years" in b ? b.years + (b.group === "동료" ? "년" : "주년") : b.target.toLocaleString("ko-KR") + (b.group === "멤버" ? "명" : b.group === "게시판" ? "개" : "회")).join(" · ")}</p>
        </div>
        <div className={styles.case}>
          <div className={styles.caseGrid} role="group" aria-label="연관 단계 배지">
            {series.map(b => renderPin(b, false, b.key === seriesSelected.key, () => setSeriesKey(b.key), seriesDetailsId))}
          </div>
        </div>
      </section>}
    </DialogContent>}
  </div></Dialog>;
}

function renderPin(badge: ClanBadge, compact: boolean, selected: boolean, onClick: () => void, controls?: string, eager = false) {
  const artwork = CLAN_BADGE_ARTWORK[badge.key];
  const first = "series" in badge ? CLAN_BADGES.find(b => "series" in b && b.series === badge.series) : badge;
  const mask = first ? CLAN_BADGE_ARTWORK[first.key] : artwork;
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

export function ClanHeroBadges({ collection, href }: { collection: ClanBadgeCollection | null; href: string }) {
  const representatives = collection ? getClanBadgeRepresentatives(collection.badges) : [];
  const selected = collection ? getFeaturedClanBadgeKeys(collection) : [];
  const badges = selected.flatMap(key => representatives.filter(badge => badge.key === key && badge.earned)).slice(0, 3);
  return <section aria-label="클랜 배지" className={styles.heroBadges}>
    <Link href={href} aria-label="클랜 배지" className={styles.heroBadgesLink}>
      <span className={styles.heroBadgesLabel}>클랜 배지 <ChevronRight size={12} aria-hidden="true" /></span>
      <span className={styles.heroBadgePins}>
        {badges.map(badge => <span key={badge.key} className={styles.heroPin} data-badge={badge.key} title={badge.name}>
          <span className="sr-only">{badge.name}</span><BadgeEmblem badge={badge} compact />
        </span>)}
        {!badges.length && <span className="text-xs">{collection ? "대표 배지 없음" : "배지를 불러오지 못했어요"}</span>}
      </span>
    </Link>
  </section>;
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
