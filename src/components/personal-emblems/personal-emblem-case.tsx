"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { savePersonalEmblemPicksAction } from "@/app/actions/personal-emblems";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { awardEmblems, getAwardHistory, getAwardRepresentatives, resolveFeaturedKeys } from "@/lib/personal-emblems/catalog";
import type { HofEmblem } from "@/lib/clan/stats/hof-emblems";
import type { PersonalEmblem, PersonalEmblemCollection } from "@/lib/personal-emblems/types";
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
const rankNames = ["", "금 · 1위", "은 · 2위", "동 · 3위"];
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

function milestoneRepresentatives(emblems: PersonalEmblem[]) {
  return milestoneOrder.flatMap(family => {
    const stages = emblems.filter(emblem => emblem.kind === "milestone" && emblem.family === family)
      .sort((a, b) => (a.stage ?? 0) - (b.stage ?? 0));
    const earned = stages.filter(emblem => emblem.earned);
    return earned.length ? [earned[earned.length - 1]] : stages.slice(0, 1);
  });
}

function useEmblemCollection(clanId: string, userId: string, initial?: PersonalEmblemCollection) {
  const target = clanId + ":" + userId + ":" + (initial?.viewerId ?? "");
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
    fetch(`/api/clans/${clanId}/personal-emblems?player=${encodeURIComponent(userId)}`, { cache: "no-store", signal: controller.signal })
      .then(response => response.json()).then((result: { ok: true; collection: PersonalEmblemCollection } | { ok: false; error: string }) => {
      if (!active || requests.current !== request) return;
      if (!result.ok) deny(result.error);
      else if (result.collection.clanId === clanId && result.collection.userId === userId
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
  }, [clanId, userId, target, initial, attempt, deny]);

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
    if (!collection?.canFeature || saving.current) return;
    const save = ++saves.current;
    saving.current = true;
    setSavingState({ target, initial, pending: true });
    try {
      const result = await savePersonalEmblemPicksAction(clanId, keys);
      if (saves.current !== save) return;
      if (!result.ok) { deny(result.error); toast.error(result.error); return; }
      if (result.collection.clanId !== clanId || result.collection.userId !== userId
        || (initial && result.collection.viewerId !== initial.viewerId)) {
        deny("엠블럼 대상이 변경되었습니다. 다시 불러와 주세요.");
        return;
      }
      requests.current++;
      setSnapshot({ target, initial, collection: result.collection });
      toast.success("대표 엠블럼을 저장했습니다.");
    } catch {
      if (saves.current === save) toast.error("대표 엠블럼을 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      if (saves.current === save) { saving.current = false; setSavingState({ target, initial, pending: false }); }
    }
  }

  return { target, collection, error: current?.error, pending, refresh, save,
    savePending: savingState?.target === target && savingState.initial === initial && savingState.pending };
}

export function PersonalEmblemCaseLauncher({ clanId, userId, nickname, gameSlug, variant = "compact", initialAwards }: {
  clanId: string; userId: string; nickname: string; gameSlug?: string; variant?: "compact" | "profile"; initialAwards?: HofEmblem[];
}) {
  const params = useParams();
  const { collection, error, pending, refresh } = useEmblemCollection(clanId, userId);
  const emblems = collection?.emblems ?? (!error && initialAwards ? awardEmblems(initialAwards) : []);
  const featuredKeys = resolveFeaturedKeys(emblems, collection?.featuredKeys ?? null);
  const featured = featuredKeys.flatMap(key => emblems.filter(emblem => emblem.key === key && emblem.earned));
  const slug = gameSlug ?? (typeof params.gameSlug === "string" ? params.gameSlug : collection?.gameSlug);
  const href = slug ? "/games/" + encodeURIComponent(slug) + "/clan/" + clanId + "/emblems?player=" + encodeURIComponent(userId) : undefined;
  return <div className={cn(styles.launcher, variant === "profile" ? styles.profile : styles.compact)} data-personal-emblem-launcher>
    <div className={cn(caseStyles.case, styles.tray)}>
      <div className={cn(caseStyles.caseGrid, styles.featuredGrid)} role="group" aria-label="대표 엠블럼 3칸">
        {[0, 1, 2].map(index => {
          const emblem = featured[index];
          const className = cn(caseStyles.pin, emblem && caseStyles.artworkSocket, styles.pin);
          const title = emblem ? emblem.description + " · " + periodLabel(emblem) : "빈 대표 엠블럼 칸";
          const contents = <><Socket />{emblem && <EmblemArtwork emblem={emblem} eager className={styles.pinArtwork} />}</>;
          return href ? <Link key={index} href={href} className={className} style={emblem ? socketStyle(emblem) : undefined}
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
  const emblems = collection?.emblems ?? [];
  const [filter, setFilter] = useState<Filter>("all");
  const [rankFilter, setRankFilter] = useState<RankFilter>("all");
  const [selection, setSelection] = useState<{ target: string; key: string }>();
  const [detailOpen, setDetailOpen] = useState(false);
  const detailsId = useId();
  const featuredKeys = resolveFeaturedKeys(emblems, collection?.featuredKeys ?? null);
  const featured = featuredKeys.flatMap(key => emblems.filter(emblem => emblem.key === key && emblem.earned));
  const representatives = milestoneRepresentatives(emblems);
  const awards = filter === "milestone" ? [] : getAwardRepresentatives(emblems);
  const milestones = filter === "all" || filter === "milestone" ? representatives : [];
  const selected = selection?.target === target ? emblems.find(emblem => emblem.key === selection.key) : undefined;
  const awardHistory = selected?.kind === "award" ? getAwardHistory(emblems).filter(emblem => emblem.family === selected.family) : [];
  const filteredAwardHistory = awardHistory.filter(emblem => rankFilter === "all" || emblem.rank === Number(rankFilter));
  const stages = selected?.kind === "milestone" ? emblems.filter(emblem => emblem.kind === "milestone" && emblem.family === selected.family)
    .sort((a, b) => (a.stage ?? 0) - (b.stage ?? 0)) : [];
  const canPickSelected = selected?.earned && (selected.kind === "award" || representatives.some(emblem => emblem.key === selected.key));
  const inspect = (emblem: PersonalEmblem) => setSelection({ target, key: emblem.key });

  function feature(emblem: PersonalEmblem) {
    if (!collection?.canFeature || !emblem.earned || (emblem.kind === "milestone" && !representatives.some(entry => entry.key === emblem.key))) return;
    const next = featuredKeys.includes(emblem.key) ? featuredKeys.filter(key => key !== emblem.key) : [...featuredKeys, emblem.key];
    if (next.length > 3) { toast.error("대표 엠블럼은 최대 3개예요. 다른 엠블럼을 먼저 해제해 주세요."); return; }
    void save(next);
  }

  return <Dialog open={detailOpen && !!selected} onOpenChange={next => { setDetailOpen(next); if (next) { setRankFilter("all"); refresh(); } }}>
    <div data-personal-emblem-case className={styles.pageLayout}>
      <section className={styles.featuredSection} aria-label="대표 엠블럼 진열">
        <h3 className="text-sm font-semibold">대표 엠블럼</h3>
        <div className={cn(caseStyles.case, styles.pageCase)} aria-busy={pending}>
          <div className={cn(caseStyles.caseGrid, styles.pageGrid, styles.featuredPageGrid)} role="group" aria-label="선택한 대표 엠블럼 3칸">
            {[0, 1, 2].map(index => {
              const emblem = featured[index];
              const className = cn(caseStyles.pin, emblem && caseStyles.artworkSocket, styles.pin);
              return emblem ? <DialogTrigger key={index} render={<button type="button" className={className} style={socketStyle(emblem)}
                data-featured-emblem-key={emblem.key} aria-label={emblem.description + " · 대표 엠블럼 상세 열기"}
                title={emblem.description + " · " + periodLabel(emblem)} onClick={() => inspect(emblem)}>
                <Socket /><EmblemArtwork emblem={emblem} eager className={styles.pinArtwork} />
              </button>} /> : <span key={index} className={className} role="img" aria-label="빈 대표 엠블럼 칸"><Socket /></span>;
            })}
          </div>
        </div>
      </section>
      <div className={styles.toolbar}>
        <RubberSegment label="엠블럼 분류" labelPosition="hidden" options={filters} value={filter} onChange={setFilter} />
        <div className={styles.feedback} role={error ? "alert" : "status"} aria-live="polite">
          {pending ? "엠블럼을 불러오는 중…" : error ?? emblems.filter(emblem => emblem.earned).length + "개의 획득 기록"}
          {error && <Button type="button" variant="ghost" size="xs" onClick={() => { setDetailOpen(false); setSelection(undefined); refresh(); }}>다시 불러오기</Button>}
        </div>
      </div>
      <div className={cn(caseStyles.case, styles.pageCase, styles.collectionFrame)} aria-busy={pending}>
        <div className={caseStyles.casePlate}>{initialCollection.clanName} · {initialCollection.nickname}</div>
        <div className={styles.groups}>
          {awards.length > 0 && <section aria-label="종류별 수상 엠블럼">
            <h3 className={styles.groupHeading}>수상</h3>
            <div className={cn(caseStyles.caseGrid, styles.pageGrid)}>{awards.map(emblem => <DialogTrigger key={emblem.key}
              render={renderPin(emblem, false, () => inspect(emblem))} />)}</div>
          </section>}
          {milestones.length > 0 && <section aria-label="누적 달성 엠블럼">
            <h3 className={styles.groupHeading}>개인의 성장</h3>
            <div className={cn(caseStyles.caseGrid, styles.pageGrid)}>{milestones.map(emblem => <DialogTrigger key={emblem.key}
              render={renderPin(emblem, false, () => inspect(emblem))} />)}</div>
          </section>}
          {!awards.length && !milestones.length && <p className={styles.empty}>{pending ? "획득 기록을 확인하고 있습니다." : error ? "다시 불러오면 엠블럼을 확인할 수 있습니다." : "아직 획득한 엠블럼이 없습니다."}</p>}
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
            <div><dt>{selected.kind === "award" ? "수상 기간" : "달성일"}</dt><dd>{periodLabel(selected)}</dd></div>
            {selected.kind === "award" ? <div><dt>순위</dt><dd>{rankNames[selected.rank ?? 0]}</dd></div>
              : <div><dt>현재 진행</dt><dd>{(selected.progress ?? 0).toLocaleString("ko-KR")} / {(selected.target ?? 0).toLocaleString("ko-KR")} {selected.unit}</dd></div>}
          </dl>
          {selected.kind === "milestone" && <progress className={styles.progress} aria-label={selected.description + " 진행도"}
            max={selected.target ?? 1} value={Math.min(selected.progress ?? 0, selected.target ?? 1)} />}
          {collection?.canFeature && canPickSelected && <Button type="button" variant="outline" size="sm" disabled={savePending || pending} onClick={() => feature(selected)}>
            <Star className={cn("size-4", featuredKeys.includes(selected.key) && "fill-primary text-primary")} />
            {savePending ? "저장 중…" : featuredKeys.includes(selected.key) ? "대표 엠블럼 해제" : "대표 엠블럼 지정"}
          </Button>}
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
            {renderPin(emblem, emblem.key === selected.key, () => inspect(emblem), detailsId)}
            <p className={styles.historyCaption}>{periodLabel(emblem)}{"\n"}{rankNames[emblem.rank ?? 0]}</p>
          </div>)}
          {!filteredAwardHistory.length && <p className={styles.historyEmpty} role="status">이 등급의 수상 이력이 없습니다.</p>}
        </div></div>
      </section>}
      {stages.length > 0 && <section className="mt-2 space-y-3" aria-label="성장의 기록">
        <h3 className="text-sm font-semibold">성장의 기록</h3>
        <div className={caseStyles.case}><div className={caseStyles.caseGrid} role="group" aria-label="단계별 엠블럼">
          {stages.map(emblem => renderPin(emblem, emblem.key === selected.key, () => inspect(emblem), detailsId))}
        </div></div>
      </section>}
    </DialogContent>}
  </Dialog>;
}

function socketStyle(emblem: PersonalEmblem): CSSProperties {
  return { "--badge-mask": 'url("/_next/image?url=' + encodeURIComponent(emblem.artwork) + '&w=256&q=75")' } as CSSProperties;
}

function Socket() {
  return <span className={caseStyles.socketShadow} aria-hidden="true">
    <span className={caseStyles.socketRim}><span className={caseStyles.socketWell} /></span>
  </span>;
}

function renderPin(emblem: PersonalEmblem, selected: boolean, onClick: () => void, controls?: string) {
  return <button key={emblem.key} type="button" data-emblem-key={emblem.key} className={cn(caseStyles.pin, caseStyles.artworkSocket, styles.pin)}
    style={socketStyle(emblem)} title={emblem.description + (emblem.kind === "award" ? " · " + periodLabel(emblem) : "")}
    aria-label={emblem.description + (emblem.stage ? " " + emblem.stage + "단계" : "") + " " + (emblem.earned ? "획득" : "미획득")
      + (controls && emblem.kind === "award" ? " · " + periodLabel(emblem) : "")}
    aria-pressed={selected} aria-controls={controls} onClick={onClick}>
    <Socket />{emblem.earned && <EmblemArtwork emblem={emblem} eager={!controls} className={styles.pinArtwork} />}
  </button>;
}
