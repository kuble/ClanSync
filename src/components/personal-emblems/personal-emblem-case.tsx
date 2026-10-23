"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { LayoutGrid, Star } from "lucide-react";
import { toast } from "sonner";
import { savePersonalEmblemPicksAction } from "@/app/actions/personal-emblems";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { GameLogo } from "@/components/ui/game-logo";
import { awardEmblems, awardFamilies, caseEmblems, getAwardHistory, getAwardRepresentatives, resolveFeaturedKeys, resolveAccountFeaturedKeys, type CaseEmblem } from "@/lib/personal-emblems/catalog";
import type { HofEmblem } from "@/lib/clan/stats/hof-emblems";
import type { AwardFamily, PersonalEmblem, PersonalEmblemCollection } from "@/lib/personal-emblems/types";
import { cn } from "@/lib/utils";
import { EmblemArtwork } from "./emblem-artwork";
import caseStyles from "../main-clan/clan-collection.module.css";
import styles from "./personal-emblem-case.module.css";

type Filter = "all" | "award" | "milestone";
type RankFilter = "all" | "1" | "2" | "3";
type Snapshot = { target: string; initial?: PersonalEmblemCollection; collection?: PersonalEmblemCollection; error?: string; pending?: boolean };
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "전체" }, { id: "award", label: "수상" }, { id: "milestone", label: "달성" },
];
const rankFilters: { id: RankFilter; label: string }[] = [
  { id: "all", label: "전체" }, { id: "1", label: "금" }, { id: "2", label: "은" }, { id: "3", label: "동" },
];
const milestoneOrder = ["sessions", "matches", "wins", "streak", "prediction"];
const awardCriteria: Record<AwardFamily, string> = {
  victory: "승률", participation: "내전 참여율", appearances: "내전 출전 경기 수", streak: "최장 연승 기록", prediction: "승부예측 적중 횟수",
};
const achievementDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });

function periodLabel(emblem: PersonalEmblem) {
  if (!emblem.date) return emblem.earned ? "달성일 기록 없음" : "미획득";
  if (emblem.kind === "milestone") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(emblem.date)) return emblem.date;
    const date = new Date(emblem.date);
    return Number.isNaN(date.getTime()) ? "달성일 기록 없음" : achievementDate.format(date);
  }
  return emblem.period === "year" ? emblem.date + "년 연간" : emblem.date.slice(0, 4) + "년 " + Number(emblem.date.slice(5, 7)) + "월";
}

function milestoneRepresentatives<T extends PersonalEmblem>(emblems: T[]) {
  return milestoneOrder.flatMap(family => {
    const stages = emblems.filter(emblem => emblem.kind === "milestone" && emblem.family === family)
      .sort((a, b) => (a.stage ?? 0) - (b.stage ?? 0));
    const earned = stages.filter(emblem => emblem.earned);
    return earned.length ? [earned[earned.length - 1]] : stages.slice(0, 1);
  });
}

function useEmblemCollection(clanId: string, userId: string, initial?: PersonalEmblemCollection, accountDisplay = false) {
  const target = (accountDisplay ? "account:" : "") + clanId + ":" + userId + ":" + (initial?.viewerId ?? "");
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [attempt, setAttempt] = useState(0);
  const [savingState, setSavingState] = useState<{ target: string; initial?: PersonalEmblemCollection; pending: boolean }>();
  const requests = useRef(0), saves = useRef(0), saving = useRef(false);
  const current = snapshot?.target === target && snapshot.initial === initial ? snapshot : undefined;
  const collection = current?.collection ?? (!current?.error ? initial : undefined);
  const pending = current ? !!current.pending : true;
  const deny = useCallback((error: string) => {
    requests.current++;
    saves.current++;
    saving.current = false;
    setSavingState({ target, initial, pending: false });
    setSnapshot({ target, initial, error });
  }, [target, initial]);

  useEffect(() => {
    const request = ++requests.current;
    const controller = new AbortController();
    let active = true;
    const url = accountDisplay || (initial?.sources && !initial.canFeature) ? `/api/personal-emblems/featured?player=${encodeURIComponent(userId)}`
      : initial?.sources ? `/api/personal-emblems${clanId ? "?clan=" + encodeURIComponent(clanId) : ""}`
      : `/api/clans/${clanId}/personal-emblems?player=${encodeURIComponent(userId)}`;
    fetch(url, { cache: "no-store", signal: controller.signal })
      .then(response => response.json()).then((result: { ok: true; collection: PersonalEmblemCollection } | { ok: false; error: string }) => {
      if (!active || requests.current !== request) return;
      if (!result.ok) deny(result.error);
      else if ((result.collection.clanId === clanId || accountDisplay || (!clanId && initial?.sources)) && result.collection.userId === userId
        && (!initial || result.collection.viewerId === initial.viewerId)) setSnapshot({ target, initial, collection: result.collection });
      else deny("엠블럼 대상이 변경되었습니다. 다시 불러와 주세요.");
    }).catch(() => {
      if (active && requests.current === request) setSnapshot(previous => {
        const previousCurrent = previous?.target === target && previous.initial === initial ? previous : undefined;
        return { target, initial, collection: previousCurrent?.collection ?? (!previousCurrent?.error ? initial : undefined),
          error: "엠블럼을 불러오지 못했습니다." };
      });
    });
    return () => { active = false; controller.abort(); };
  }, [clanId, userId, target, initial, attempt, deny, accountDisplay]);

  useEffect(() => () => { saves.current++; saving.current = false; }, [target, initial]);

  function refresh() {
    requests.current++;
    setSnapshot(previous => {
      const previousCurrent = previous?.target === target && previous.initial === initial ? previous : undefined;
      return { target, initial, collection: previousCurrent?.collection ?? (!previousCurrent?.error ? initial : undefined),
        error: previousCurrent?.error, pending: true };
    });
    setAttempt(value => value + 1);
  }

  async function save(keys: string[]) {
    if (!collection?.canFeature || saving.current) return false;
    const save = ++saves.current;
    saving.current = true;
    setSavingState({ target, initial, pending: true });
    try {
      const result = await savePersonalEmblemPicksAction(keys, clanId || undefined);
      if (saves.current !== save) return false;
      if (!result.ok) { deny(result.error); toast.error(result.error); return false; }
      if ((clanId && result.collection.clanId !== clanId) || result.collection.userId !== userId
        || (initial && result.collection.viewerId !== initial.viewerId)) {
        deny("엠블럼 대상이 변경되었습니다. 다시 불러와 주세요.");
        return false;
      }
      requests.current++;
      const next = initial?.sources ? { ...collection, ...(result.collection.sources?.find(source => source.clanId === clanId) ?? {}), sources: result.collection.sources,
        accountFeaturedKeys: result.collection.accountFeaturedKeys }
        : result.collection;
      setSnapshot({ target, initial, collection: next });
      toast.success("대표 엠블럼을 저장했습니다.");
      return true;
    } catch {
      if (saves.current === save) toast.error("대표 엠블럼을 저장하지 못했습니다. 다시 시도해 주세요.");
      return false;
    } finally {
      if (saves.current === save) { saving.current = false; setSavingState({ target, initial, pending: false }); }
    }
  }

  return { target, collection, error: current?.error, pending, refresh, save,
    savePending: savingState?.target === target && savingState.initial === initial && savingState.pending };
}

export function PersonalEmblemCaseLauncher({ clanId = "", userId, nickname, variant = "compact", initialAwards }: {
  clanId?: string; userId: string; nickname: string; gameSlug?: string; variant?: "compact" | "profile"; initialAwards?: HofEmblem[];
}) {
  const { collection, error, pending, refresh } = useEmblemCollection(clanId, userId, undefined, variant === "profile");
  const emblems = collection?.emblems ?? (!error && initialAwards ? awardEmblems(initialAwards) : []);
  const featuredKeys = resolveFeaturedKeys(emblems, collection?.featuredKeys ?? null);
  const entries = caseEmblems(collection?.sources ?? (collection ? [collection] : []));
  const featured = collection?.accountFeaturedKeys ? collection.accountFeaturedKeys.flatMap(key => entries.filter(emblem => emblem.key === key && emblem.earned))
    : featuredKeys.flatMap(key => emblems.filter(emblem => emblem.key === key && emblem.earned));
  const href = `/profile/${encodeURIComponent(userId)}/emblems${variant === "profile" ? "" : "?clan=" + encodeURIComponent(clanId)}`;
  return <div className={cn(styles.launcher, variant === "profile" ? styles.profile : styles.compact)} data-personal-emblem-launcher>
    <div className={cn(caseStyles.case, styles.tray)}>
      <div className={cn(caseStyles.caseGrid, styles.featuredGrid)} role="group" aria-label="대표 엠블럼 3칸">
        {[0, 1, 2].map(index => {
          const emblem = featured[index];
          const className = cn(caseStyles.pin, emblem && caseStyles.artworkSocket, styles.pin);
          const title = emblem ? emblem.description + " · " + periodLabel(emblem)
            + ("source" in emblem ? " · " + (emblem.source as PersonalEmblemCollection).gameName + " · " + (emblem.source as PersonalEmblemCollection).clanName : "") : "빈 대표 엠블럼 칸";
          const contents = <><Socket />{emblem && <EmblemArtwork emblem={emblem} eager className={styles.pinArtwork} />}</>;
          return href ? <Link key={index} href={href} className={className} style={emblem ? socketStyle(emblem) : undefined}
            data-featured-emblem-reference={emblem && "localKey" in emblem ? emblem.key : undefined}
            aria-label={nickname + " 엠블럼 케이스 열기" + (index ? " · " + (index + 1) + "번째 칸" : "")} title={title}>
            {contents}
          </Link> : <span key={index} className={className} style={emblem ? socketStyle(emblem) : undefined} title={title}>{contents}</span>;
        })}
      </div>
    </div>
    {href && <Link href={href} className={styles.caseLink}>엠블럼 케이스 보기 →</Link>}
    {variant === "profile" && <div className="mt-2 min-h-5 text-xs text-muted-foreground" role={error ? "alert" : "status"}>
      {pending ? "대표 엠블럼을 불러오는 중…" : error ? <><span>{error}</span><Button size="sm" variant="ghost" aria-label="대표 엠블럼 다시 불러오기" onClick={refresh}>다시 불러오기</Button></> : !featured.length ? "획득한 엠블럼을 이곳에 전시할 수 있습니다." : null}
    </div>}
  </div>;
}

export function PersonalEmblemCase({ initialCollection }: { initialCollection: PersonalEmblemCollection }) {
  const { clanId, userId } = initialCollection;
  const { target, collection, error, pending, refresh, save, savePending } = useEmblemCollection(clanId, userId, initialCollection);
  const sources = collection?.sources ?? (collection ? [collection] : []);
  const emblems = caseEmblems(sources);
  const [filter, setFilter] = useState<Filter>("all");
  const [rankFilter, setRankFilter] = useState<RankFilter>("all");
  const [gameFilter, setGameFilter] = useState("all");
  const [selection, setSelection] = useState<{ target: string; key: string; preview?: CaseEmblem }>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [replacement, setReplacement] = useState<{ target: string; key: string }>();
  const featureButton = useRef<HTMLButtonElement>(null);
  const detailsId = useId();
  const visibleEmblems = emblems.filter(emblem => gameFilter === "all" || emblem.source.gameSlug === gameFilter);
  const featuredKeys = collection?.accountFeaturedKeys ?? resolveAccountFeaturedKeys(sources,
    sources.flatMap(source => resolveFeaturedKeys(source.emblems, source.featuredKeys).map(key => source.clanId + ":" + key)));
  const featured = featuredKeys.flatMap(key => emblems.filter(emblem => emblem.key === key && emblem.earned));
  const representatives = sources.flatMap(source => milestoneRepresentatives(emblems.filter(emblem => emblem.source.clanId === source.clanId)));
  const awards = filter === "milestone" ? [] : getAwardRepresentatives(visibleEmblems);
  const milestones = filter === "all" || filter === "milestone" ? milestoneRepresentatives(visibleEmblems) : [];
  const selected = selection?.target === target ? emblems.find(emblem => emblem.key === selection.key)
    ?? (sources.some(source => source.clanId === selection.preview?.source.clanId) ? selection.preview : undefined) : undefined;
  const awardHistory = selected?.kind === "award" ? getAwardHistory(visibleEmblems).filter(emblem => emblem.family === selected.family && emblem.period === selected.period) : [];
  const filteredAwardHistory = awardHistory.filter(emblem => rankFilter === "all" || emblem.rank === Number(rankFilter));
  const stages = selected?.kind === "milestone" ? visibleEmblems.filter(emblem => emblem.kind === "milestone" && emblem.family === selected.family)
    .sort((a, b) => a.source.clanId.localeCompare(b.source.clanId) || (a.stage ?? 0) - (b.stage ?? 0)) : [];
  const canPick = (emblem: CaseEmblem) => emblem.source.canFeature && emblem.earned && (emblem.kind === "award" || representatives.some(entry => entry.key === emblem.key));
  const canPickSelected = selected && canPick(selected);
  const replacementEmblem = replacement?.target === target ? emblems.find(emblem => emblem.key === replacement.key) : undefined;
  const replacing = !!(collection?.canFeature && replacementEmblem && canPick(replacementEmblem)
    && !featuredKeys.includes(replacementEmblem.key) && featuredKeys.length === 3);
  const inspect = (emblem: CaseEmblem) => { setReplacement(undefined); setSelection({ target, key: emblem.key, preview: !emblem.earned && emblem.kind === "award" ? emblem : undefined }); };

  const isFeatured = (emblem: CaseEmblem) => featuredKeys.includes(emblem.key);
  function changeGame(value: string) {
    setGameFilter(value);
    const next = emblems.find(emblem => (value === "all" || emblem.source.gameSlug === value) && emblem.kind === selected?.kind
      && emblem.family === selected?.family && (rankFilter === "all" || emblem.kind === "milestone" || emblem.rank === Number(rankFilter)));
    if (selected && next && value !== "all" && selected.source.gameSlug !== value) inspect(next);
  }
  function gameSegment() {
    const games = [...new Map(sources.map(source => [source.gameSlug, source.gameName ?? source.gameSlug])).entries()];
    return <RubberSegment label="엠블럼 게임" labelPosition="hidden" value={gameFilter} onChange={changeGame} options={[
      { id: "all", label: "전체 게임", icon: <LayoutGrid size={17} /> },
      ...games.map(([slug, name]) => ({ id: slug, label: name, icon: <GameLogo slug={slug} name={name} className="size-[18px]" /> })),
    ]} />;
  }

  function feature(emblem: CaseEmblem, button: HTMLButtonElement) {
    if (pending || savePending || !collection?.canFeature || !canPick(emblem)) return;
    featureButton.current = button;
    const next = featuredKeys.includes(emblem.key) ? featuredKeys.filter(key => key !== emblem.key) : [...featuredKeys, emblem.key];
    if (next.length > 3) { setReplacement({ target, key: emblem.key }); return; }
    void save(next);
  }

  async function replace(key: string) {
    if (!replacing || !replacementEmblem || pending || savePending || !featuredKeys.includes(key)) return;
    if (await save(featuredKeys.map(current => current === key ? replacementEmblem.key : current))) setReplacement(undefined);
  }

  function catalogPin(emblem: CaseEmblem, inDetail = false) {
    const picked = isFeatured(emblem);
    const label = emblem.description + " · " + periodLabel(emblem) + " · " + (emblem.source.gameName ?? emblem.source.gameSlug) + " · " + emblem.source.clanName + " · 대표 엠블럼 " + (picked ? "해제" : "지정");
    const pin = renderPin(emblem, inDetail && selected?.key === emblem.key, () => inspect(emblem), inDetail ? detailsId : undefined);
    return <div key={emblem.key} className={styles.catalogEntry} data-emblem-entry={emblem.localKey} data-emblem-clan={emblem.source.clanId}>
      {inDetail ? pin : <DialogTrigger render={pin} />}
      {collection?.canFeature && canPick(emblem) && <Button type="button" variant="outline" size="icon" className={cn(styles.featureStar, styles.quickStar)}
        data-emblem-feature-key={emblem.localKey}
        aria-label={label} title={label} aria-pressed={picked} disabled={savePending || pending} focusableWhenDisabled
        aria-haspopup={featuredKeys.length === 3 && !picked ? "dialog" : undefined}
        onClick={event => feature(emblem, event.currentTarget)}>
        <Star aria-hidden="true" className={cn("size-4", picked && "fill-primary text-primary")} />
      </Button>}
    </div>;
  }

  const replacementDialog = <Dialog open={replacing} onOpenChange={open => { if (!open) setReplacement(undefined); }}>
    <DialogContent className="sm:max-w-md" finalFocus={featureButton}>
      <DialogTitle>대표 엠블럼 교체</DialogTitle>
      <DialogDescription>세 칸이 모두 찼습니다. 교체할 엠블럼을 선택해 주세요.</DialogDescription>
      {replacementEmblem && <div className={styles.replacementPreview}>
        <EmblemArtwork emblem={replacementEmblem} eager className={styles.replacementArtwork} />
        <div><p className="font-semibold">{replacementEmblem.description}</p><p className="text-xs text-muted-foreground">{periodLabel(replacementEmblem)} · 새로 진열</p></div>
      </div>}
      <div className={styles.replacementGrid} role="group" aria-label="교체할 대표 엠블럼">
        {featured.map(emblem => <button key={emblem.key} type="button" className={styles.replacementOption}
          data-replace-emblem-key={emblem.localKey} data-replace-emblem-reference={emblem.key} disabled={savePending || pending}
          aria-label={periodLabel(emblem) + " " + emblem.description + " · " + emblem.source.clanName + " 대신 진열"} onClick={() => void replace(emblem.key)}>
          <EmblemArtwork emblem={emblem} eager className={styles.replacementArtwork} />
          <span>{emblem.description}</span><span className="text-muted-foreground">{periodLabel(emblem)}</span>
          <span className="text-muted-foreground">{emblem.source.gameName ?? emblem.source.gameSlug}<br />{emblem.source.clanName}</span>
        </button>)}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground" role="status">{savePending ? "교체 중…" : "선택한 한 칸만 교체됩니다."}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setReplacement(undefined)}>취소</Button>
      </div>
    </DialogContent>
  </Dialog>;

  return <><Dialog open={detailOpen && !!selected} onOpenChange={next => { setDetailOpen(next); setReplacement(undefined); if (next) { setRankFilter("all"); refresh(); } }}>
    <div data-personal-emblem-case className={styles.pageLayout}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeading}>
          <h2 className="text-xl font-semibold">개인 엠블럼 케이스</h2>
          <p className="mt-1 text-sm text-muted-foreground">{initialCollection.sources ? "게임과 클랜에서 쌓은 수상과 성장 기록" : initialCollection.nickname + "님의 수상과 성장 기록"}</p>
        </div>
      <section className={styles.featuredSection} aria-label="대표 엠블럼 진열">
        <h3 className={styles.featuredLabel}>대표 엠블럼</h3>
        <div className={cn(caseStyles.case, styles.headerTray)} aria-busy={pending}>
          <div className={cn(caseStyles.caseGrid, styles.headerGrid)} role="group" aria-label="선택한 대표 엠블럼 3칸">
            {[0, 1, 2].map(index => {
              const emblem = featured[index];
              const className = cn(caseStyles.pin, emblem && caseStyles.artworkSocket, styles.pin);
              return emblem ? <DialogTrigger key={index} render={<button type="button" className={className} style={socketStyle(emblem)}
                data-featured-emblem-key={emblem.localKey} data-featured-emblem-reference={emblem.key} aria-label={emblem.description + " · " + emblem.source.clanName + " · 대표 엠블럼 상세 열기"}
                title={emblem.description + " · " + periodLabel(emblem) + " · " + (emblem.source.gameName ?? emblem.source.gameSlug) + " · " + emblem.source.clanName}
                onClick={() => { if (gameFilter !== "all" && gameFilter !== emblem.source.gameSlug) setGameFilter(emblem.source.gameSlug); inspect(emblem); }}>
                <Socket /><EmblemArtwork emblem={emblem} eager className={styles.pinArtwork} />
              </button>} /> : <span key={index} className={className} role="img" aria-label="빈 대표 엠블럼 칸"><Socket /></span>;
            })}
          </div>
        </div>
      </section>
      </header>
      <div className={styles.toolbar}>
        <div className={styles.toolbarFilters}>
          <RubberSegment label="엠블럼 분류" labelPosition="hidden" options={filters} value={filter} onChange={setFilter} />
          {gameSegment()}
        </div>
        <div className={styles.feedback} role={error ? "alert" : "status"} aria-live="polite">
          {pending ? "엠블럼을 불러오는 중…" : error ?? emblems.filter(emblem => emblem.earned).length + "개의 획득 기록"}
          {error && <Button type="button" variant="ghost" size="xs" onClick={() => { setDetailOpen(false); setSelection(undefined); refresh(); }}>다시 불러오기</Button>}
        </div>
      </div>
      <div className={cn(caseStyles.case, styles.pageCase, styles.collectionFrame)} aria-busy={pending}>
        <div className={styles.groups}>
          {filter !== "milestone" && visibleEmblems.length > 0 && <section aria-label="종류별 수상 엠블럼">
            <div className={styles.groups}>{(["month", "year"] as const).map(period => {
              const entries = awards.filter(emblem => emblem.period === period);
              return <section key={period} aria-label={period === "month" ? "월간 수상 엠블럼" : "연간 수상 엠블럼"}>
                <div className={cn(caseStyles.caseGrid, styles.pageGrid)}>{Object.entries(awardFamilies).map(([category, family]) => {
                  const emblem = entries.find(entry => entry.family === family);
                  const label = `${period === "month" ? "월간" : "연간"} ${category} 미획득`;
                  const key = `preview-${period}-${family}`;
                  const preview: CaseEmblem = { key, localKey: key, kind: "award", family, period, earned: false, date: null,
                    description: `${period === "month" ? "월간" : "연간"} ${category}`, artwork: `/personal-emblems/v1/awards/${period}/${family}-gold.png`, source: visibleEmblems[0].source };
                  return emblem ? catalogPin(emblem) : <DialogTrigger key={family} render={<button type="button" className={cn(caseStyles.pin, caseStyles.artworkSocket, styles.pin)}
                    aria-label={label} title={label} data-unearned-award={period + ":" + family}
                    style={socketStyle(preview)} onClick={() => inspect(preview)}><Socket /></button>} />;
                })}</div>
              </section>;
            })}</div>
          </section>}
          {milestones.length > 0 && <section aria-label="누적 달성 엠블럼">
            <div className={cn(caseStyles.caseGrid, styles.pageGrid)}>{milestones.map(emblem => catalogPin(emblem))}</div>
          </section>}
          {!visibleEmblems.length && (pending || error) && <p className={styles.empty}>{pending ? "획득 기록을 확인하고 있습니다." : "다시 불러오면 엠블럼을 확인할 수 있습니다."}</p>}
        </div>
      </div>
    </div>
    {selected && <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:max-w-3xl sm:p-7" data-personal-emblem-detail>
      <div className={caseStyles.seriesHeader}>
        <EmblemArtwork emblem={selected} eager className={cn(caseStyles.pin, caseStyles.seriesArtwork, !selected.earned && caseStyles.unearnedPreview)} />
        <section id={detailsId} className={caseStyles.seriesDescription} aria-label="엠블럼 상세" aria-live="polite">
          <DialogTitle className="text-2xl font-semibold">{selected.description}</DialogTitle>
          <DialogDescription className="sr-only">획득 조건과 수상·달성 기록</DialogDescription>
          <span className={cn(caseStyles.seriesStatus, selected.earned && caseStyles.earnedStatus)}>{selected.earned ? "획득" : "미획득 · 미리보기"}</span>
          <dl className={caseStyles.seriesFacts}>
            {selected.kind === "award" && !selected.earned ? <>
              <div><dt>수상 구분</dt><dd>{selected.period === "month" ? "월간" : "연간"}</dd></div>
              <div><dt>등급</dt><dd>금 · 1위 / 은 · 2위 / 동 · 3위</dd></div>
            </> : <>
            <div><dt>게임</dt><dd>{selected.source.gameName ?? selected.source.gameSlug}</dd></div>
            <div><dt>클랜</dt><dd>{selected.source.clanName}</dd></div>
            <div><dt>{selected.kind === "award" ? "수상 기간" : "달성일"}</dt><dd>{periodLabel(selected)}</dd></div>
            </>}
            <div><dt>획득 조건</dt><dd>{selected.kind === "award"
              ? `${selected.period === "month" ? "월간" : "연간"} 명예의 전당에서 ${awardCriteria[selected.family as AwardFamily]} 상위 3위 안에 들면 획득합니다.`
              : `${selected.description} 시 획득합니다.`}</dd></div>
            {selected.kind === "milestone" && selected.source.active !== false && <div><dt>현재 진행</dt><dd>{(selected.progress ?? 0).toLocaleString("ko-KR")} / {(selected.target ?? 0).toLocaleString("ko-KR")} {selected.unit}</dd></div>}
          </dl>
          {selected.kind === "award" && !selected.earned && <p className="text-xs leading-relaxed text-muted-foreground">클랜의 집계·참여 기준을 충족해야 하며, 기간 마감 후 순위에 따라 금·은·동 엠블럼을 획득합니다.</p>}
          {selected.kind === "milestone" && selected.source.active !== false && <progress className={styles.progress} aria-label={selected.description + " 진행도"}
            max={selected.target ?? 1} value={Math.min(selected.progress ?? 0, selected.target ?? 1)} />}
          {collection?.canFeature && selected.earned && !canPickSelected && <p className="text-xs text-muted-foreground">최고 획득 단계만 대표로 지정할 수 있습니다.</p>}
        </section>
      </div>
      {awardHistory.length > 0 && <section className="mt-2 space-y-3" aria-label="수상 이력">
        <div className={styles.controls}>
          <h3 className="text-sm font-semibold">수상 이력</h3>
          <RubberSegment label="수상 등급" labelPosition="hidden" options={rankFilters} value={rankFilter} onChange={value => {
            setRankFilter(value);
            const next = awardHistory.find(emblem => value === "all" || emblem.rank === Number(value));
            if (next && value !== "all" && selected.rank !== Number(value)) inspect(next);
          }} />
        </div>
        <div className={caseStyles.case}><div className={caseStyles.caseGrid} role="group" aria-label="같은 종류의 수상 이력">
          {filteredAwardHistory.map(emblem => <div key={emblem.key} className={styles.historyEntry}>
            {catalogPin(emblem, true)}
            <p className={styles.historyCaption}>{periodLabel(emblem)}</p>
          </div>)}
          {!filteredAwardHistory.length && <p className={styles.historyEmpty} role="status">이 등급의 수상 이력이 없습니다.</p>}
        </div></div>
      </section>}
      {stages.length > 0 && <section className="mt-2 space-y-3" aria-label="성장의 기록">
        <div className={styles.controls}><h3 className="text-sm font-semibold">성장의 기록</h3></div>
        <div className={caseStyles.case}><div className={caseStyles.caseGrid} role="group" aria-label="단계별 엠블럼">
          {stages.map(emblem => <div key={emblem.key} className={styles.historyEntry}>{catalogPin(emblem, true)}
            {emblem.earned && <p className={styles.historyCaption}>{periodLabel(emblem)}</p>}
          </div>)}
        </div></div>
      </section>}
      {replacementDialog}
    </DialogContent>}
  </Dialog>{!detailOpen && replacementDialog}</>;
}

function socketStyle(emblem: Pick<PersonalEmblem, "artwork">): CSSProperties {
  return { "--badge-mask": 'url("/_next/image?url=' + encodeURIComponent(emblem.artwork) + '&w=256&q=75")' } as CSSProperties;
}

function Socket() {
  return <span className={caseStyles.socketShadow} aria-hidden="true">
    <span className={caseStyles.socketRim}><span className={caseStyles.socketWell} /></span>
  </span>;
}

function renderPin(emblem: CaseEmblem, selected: boolean, onClick: () => void, controls?: string) {
  return <button key={emblem.key} type="button" data-emblem-key={emblem.localKey} className={cn(caseStyles.pin, caseStyles.artworkSocket, styles.pin)}
    style={socketStyle(emblem)} title={emblem.description + (emblem.kind === "award" ? " · " + periodLabel(emblem) : "")}
    aria-label={emblem.description + (emblem.stage ? " " + emblem.stage + "단계" : "") + " " + (emblem.earned ? "획득" : "미획득")
      + (controls && emblem.kind === "award" ? " · " + periodLabel(emblem) : "")}
    aria-pressed={selected} aria-controls={controls} onClick={onClick}>
    <Socket />{emblem.earned && <EmblemArtwork emblem={emblem} eager={!controls} className={styles.pinArtwork} />}
  </button>;
}
