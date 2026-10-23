"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { loadPersonalEmblemsAction, savePersonalEmblemPicksAction } from "@/app/actions/personal-emblems";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { awardEmblems, resolveFeaturedKeys } from "@/lib/personal-emblems/catalog";
import type { HofEmblem } from "@/lib/clan/stats/hof-emblems";
import type { PersonalEmblem, PersonalEmblemCollection } from "@/lib/personal-emblems/types";
import { cn } from "@/lib/utils";
import { EmblemArtwork } from "./emblem-artwork";
import caseStyles from "../main-clan/clan-collection.module.css";
import styles from "./personal-emblem-case.module.css";

type Filter = "all" | "month" | "year" | "milestone";
type Snapshot = { target: string; collection?: PersonalEmblemCollection; error?: string; pending?: boolean };
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "전체" }, { id: "month", label: "월간" },
  { id: "year", label: "연간" }, { id: "milestone", label: "달성" },
];
const milestoneOrder = ["sessions", "matches", "wins", "streak", "prediction"];
const rankNames = ["", "금 · 1위", "은 · 2위", "동 · 3위"];

function periodLabel(emblem: PersonalEmblem) {
  if (!emblem.date) return emblem.earned ? "달성일 기록 없음" : "미획득";
  if (emblem.kind === "milestone") return emblem.date.slice(0, 10).replaceAll("-", ".");
  return emblem.period === "year" ? `${emblem.date}년 연간` : `${emblem.date.slice(0, 4)}년 ${Number(emblem.date.slice(5, 7))}월`;
}

function milestoneRepresentatives(emblems: PersonalEmblem[]) {
  return milestoneOrder.flatMap(family => {
    const stages = emblems.filter(emblem => emblem.kind === "milestone" && emblem.family === family)
      .sort((a, b) => (a.stage ?? 0) - (b.stage ?? 0));
    const earned = stages.filter(emblem => emblem.earned);
    return earned.length ? [earned[earned.length - 1]] : stages.slice(0, 1);
  });
}

export function PersonalEmblemCaseLauncher({ clanId, userId, nickname, variant = "compact", initialAwards }: {
  clanId: string; userId: string; nickname: string; variant?: "compact" | "profile"; initialAwards?: HofEmblem[];
}) {
  const target = `${clanId}:${userId}`;
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [attempt, setAttempt] = useState(0);
  const [openState, setOpenState] = useState({ target, open: false });
  const [filter, setFilter] = useState<Filter>("all");
  const [yearState, setYearState] = useState({ target, year: "all" });
  const [selection, setSelection] = useState<{ target: string; key: string }>();
  const [savingState, setSavingState] = useState<{ target: string; pending: boolean }>();
  const requests = useRef(0);
  const saves = useRef(0);
  const saving = useRef(false);
  const detailsId = useId();
  const current = snapshot?.target === target ? snapshot : undefined;
  const collection = current?.collection;
  const emblems = collection?.emblems ?? (!current?.error && initialAwards ? awardEmblems(initialAwards) : []);
  const featuredKeys = resolveFeaturedKeys(emblems, collection?.featuredKeys ?? null);
  const featured = featuredKeys.flatMap(key => emblems.filter(emblem => emblem.key === key && emblem.earned));
  const open = openState.target === target && openState.open;
  const pending = current ? !!current.pending : true;
  const savePending = savingState?.target === target && savingState.pending;
  const years = [...new Set(emblems.filter(emblem => emblem.kind === "award" && emblem.date).map(emblem => emblem.date!.slice(0, 4)))].sort().reverse();
  const selectedYear = yearState.target === target && (yearState.year === "all" || years.includes(yearState.year)) ? yearState.year : "all";
  const awards = emblems.filter(emblem => emblem.kind === "award" && (filter === "all" || emblem.period === filter)
    && (selectedYear === "all" || emblem.date?.startsWith(selectedYear)));
  const awardGroups = [...new Set(awards.map(emblem => `${emblem.date}|${emblem.period}`))].sort().reverse();
  const milestones = filter === "all" || filter === "milestone" ? milestoneRepresentatives(emblems) : [];
  const displayed = [...awards, ...milestones];
  const selected = (selection?.target === target ? emblems.find(emblem => emblem.key === selection.key) : undefined) ?? displayed[0];
  const stages = selected?.kind === "milestone" ? emblems.filter(emblem => emblem.kind === "milestone" && emblem.family === selected.family)
    .sort((a, b) => (a.stage ?? 0) - (b.stage ?? 0)) : [];

  useEffect(() => {
    const request = ++requests.current;
    let active = true;
    function deny(error: string) {
      saves.current++;
      saving.current = false;
      setSavingState({ target, pending: false });
      setSnapshot({ target, error });
    }
    loadPersonalEmblemsAction(clanId, userId).then(result => {
      if (!active || requests.current !== request) return;
      if (!result.ok) deny(result.error);
      else if (result.collection.clanId === clanId && result.collection.userId === userId) setSnapshot({ target, collection: result.collection });
      else deny("엠블럼 대상이 변경되었습니다. 다시 불러와 주세요.");
    }).catch(() => {
      if (active && requests.current === request) setSnapshot(previous => ({ target, collection: previous?.target === target ? previous.collection : undefined, error: "엠블럼을 불러오지 못했습니다." }));
    });
    return () => { active = false; };
  }, [clanId, userId, target, attempt]);

  useEffect(() => () => { saves.current++; saving.current = false; }, [target]);

  function refresh() {
    requests.current++;
    setSnapshot(previous => ({ target, collection: previous?.target === target ? previous.collection : undefined,
      error: previous?.target === target ? previous.error : undefined, pending: true }));
    setAttempt(value => value + 1);
  }

  function onOpenChange(next: boolean) {
    setOpenState({ target, open: next });
    if (next) refresh();
  }

  function inspect(emblem: PersonalEmblem) { setSelection({ target, key: emblem.key }); }

  async function feature(emblem: PersonalEmblem) {
    if (!collection?.canFeature || !emblem.earned || saving.current) return;
    if (emblem.kind === "milestone" && !milestoneRepresentatives(emblems).some(entry => entry.key === emblem.key)) return;
    const next = featuredKeys.includes(emblem.key) ? featuredKeys.filter(key => key !== emblem.key) : [...featuredKeys, emblem.key];
    if (next.length > 3) { toast.error("대표 엠블럼은 최대 3개예요. 다른 엠블럼을 먼저 해제해 주세요."); return; }
    const save = ++saves.current;
    saving.current = true;
    setSavingState({ target, pending: true });
    try {
      const result = await savePersonalEmblemPicksAction(clanId, next);
      if (saves.current !== save) return;
      if (!result.ok) {
        requests.current++;
        setSnapshot({ target, error: result.error });
        toast.error(result.error);
        return;
      }
      if (result.collection.clanId !== clanId || result.collection.userId !== userId) return;
      requests.current++;
      setSnapshot({ target, collection: result.collection });
      toast.success("대표 엠블럼을 저장했습니다.");
    } catch {
      if (saves.current === save) toast.error("대표 엠블럼을 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      if (saves.current === save) { saving.current = false; setSavingState({ target, pending: false }); }
    }
  }

  function pin(emblem: PersonalEmblem, label = true) {
    return <div key={emblem.key} className={styles.pinCell}>
      <EmblemPin emblem={emblem} selected={selected?.key === emblem.key} onClick={() => inspect(emblem)} controls={detailsId} />
      {label && <span className={styles.pinLabel}>{emblem.name}
        <span className={styles.pinMeta}>{emblem.kind === "milestone" ? `${emblem.stage}단계 · ${emblem.earned ? "획득" : "미획득"}` : rankNames[emblem.rank ?? 0]}</span>
      </span>}
    </div>;
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <div className={cn(styles.launcher, variant === "profile" ? styles.profile : styles.compact)} data-personal-emblem-launcher>
      <div className={cn(caseStyles.case, styles.tray)}>
        <div className={cn(caseStyles.caseGrid, styles.featuredGrid)} role="group" aria-label="대표 엠블럼 3칸">
          {[0, 1, 2].map(index => <DialogTrigger key={index} render={<button type="button"
            className={cn(caseStyles.pin, caseStyles.artworkSocket, styles.pin)}
            style={featured[index] ? socketStyle(featured[index]) : undefined}
            aria-label={`${nickname} 엠블럼 케이스 열기${index ? ` · ${index + 1}번째 칸` : ""}`}
            title={featured[index] ? `${featured[index].name} · ${periodLabel(featured[index])}` : "빈 대표 엠블럼 칸"}
            onClick={() => { if (featured[index]) inspect(featured[index]); }}>
            <Socket />
            {featured[index] && <EmblemArtwork emblem={featured[index]} eager className={styles.pinArtwork} />}
          </button>} />)}
        </div>
      </div>
      {variant === "profile" && <DialogTrigger render={<Button type="button" size="sm" variant="outline" className={styles.openButton} />}>
        엠블럼 케이스 보기
      </DialogTrigger>}
    </div>
    <DialogContent className="sm:max-w-3xl" data-personal-emblem-case>
      <div className={styles.dialogHeader}>
        <DialogTitle>엠블럼 케이스</DialogTitle>
        <DialogDescription className="mt-2 text-xs">{nickname}님의 수상과 성장 기록</DialogDescription>
      </div>
      <div className={styles.controls}>
        <RubberSegment label="엠블럼 분류" labelPosition="hidden" options={filters} value={filter}
          onChange={next => { setFilter(next); setSelection(undefined); }} />
        <label className={styles.yearControl}>연도
          <select aria-label="엠블럼 연도" className={styles.yearSelect} value={selectedYear} disabled={filter === "milestone" || !years.length}
            onChange={event => { setYearState({ target, year: event.target.value }); setSelection(undefined); }}>
            <option value="all">전체 연도</option>{years.map(year => <option key={year} value={year}>{year}년</option>)}
          </select>
        </label>
      </div>
      <div className={styles.feedback} role={current?.error ? "alert" : "status"} aria-live="polite">
        {pending ? "엠블럼을 불러오는 중…" : current?.error ?? `${emblems.filter(emblem => emblem.earned).length}개의 획득 기록`}
        {current?.error && <Button type="button" variant="ghost" size="xs" onClick={refresh}>다시 불러오기</Button>}
      </div>
      <div className={cn(caseStyles.case, styles.collectionFrame)} aria-busy={pending}>
        <div className={styles.groups}>
          {awardGroups.map(group => {
            const entries = awards.filter(emblem => `${emblem.date}|${emblem.period}` === group);
            return <section key={group} aria-label={periodLabel(entries[0]) + " 수상"}>
              <h3 className={styles.groupHeading}>{periodLabel(entries[0])}</h3>
              <div className={cn(caseStyles.caseGrid, styles.grid)}>{entries.map(emblem => pin(emblem))}</div>
            </section>;
          })}
          {milestones.length > 0 && <section aria-label="누적 달성 엠블럼">
            <h3 className={styles.groupHeading}>개인의 성장</h3>
            <div className={cn(caseStyles.caseGrid, styles.grid)}>{milestones.map(emblem => pin(emblem))}</div>
          </section>}
          {!displayed.length && <p className={styles.empty}>{pending ? "획득 기록을 확인하고 있습니다." : current?.error ? "다시 불러오면 엠블럼을 확인할 수 있습니다." : "아직 이 기간에 획득한 엠블럼이 없습니다."}</p>}
        </div>
      </div>
      <section id={detailsId} className={styles.details} aria-label="엠블럼 상세" aria-live="polite">
        {selected ? <>
          <div className={styles.detailGrid}>
            <EmblemArtwork emblem={selected} eager className={cn(styles.detailArtwork, !selected.earned && styles.unearned)} />
            <div className={styles.detailText}>
              <h3 className={styles.detailName}>{selected.name}{selected.kind === "milestone" && ` · ${selected.stage}단계`}</h3>
              <p className={styles.detailDescription}>{selected.description}</p>
              <span className={cn(styles.status, selected.earned && styles.earned)}>{selected.earned ? "획득" : "미획득 · 미리보기"}</span>
              <dl className={styles.facts}>
                <div><dt>{selected.kind === "award" ? "수상 기간" : "달성일"}</dt><dd>{periodLabel(selected)}</dd></div>
                {selected.kind === "award" ? <div><dt>순위</dt><dd>{rankNames[selected.rank ?? 0]}</dd></div>
                  : <div><dt>현재 진행</dt><dd>{(selected.progress ?? 0).toLocaleString("ko-KR")} / {(selected.target ?? 0).toLocaleString("ko-KR")} {selected.unit}</dd></div>}
              </dl>
              {selected.kind === "milestone" && <progress className={styles.progress} aria-label={`${selected.name} 달성 진행도`}
                max={selected.target ?? 1} value={Math.min(selected.progress ?? 0, selected.target ?? 1)} />}
              {collection?.canFeature && selected.earned && (selected.kind === "award" || milestoneRepresentatives(emblems).some(emblem => emblem.key === selected.key)) && <Button type="button" variant="outline" size="sm" disabled={savePending || pending} onClick={() => void feature(selected)}>
                <Star className={cn("size-4", featuredKeys.includes(selected.key) && "fill-primary text-primary")} />
                {savePending ? "저장 중…" : featuredKeys.includes(selected.key) ? "대표 엠블럼 해제" : "대표 엠블럼 지정"}
              </Button>}
              {collection?.canFeature && selected.earned && selected.kind === "milestone" && !milestoneRepresentatives(emblems).some(emblem => emblem.key === selected.key) &&
                <p className={styles.detailDescription}>최고 획득 단계만 대표로 지정할 수 있습니다.</p>}
            </div>
          </div>
          {stages.length > 0 && <div className={styles.stages}>
            <h4 className={styles.stagesHeading}>성장의 기록</h4>
            <div className={caseStyles.case}><div className={cn(caseStyles.caseGrid, styles.stageGrid)} role="group" aria-label={`${selected.name} 단계별 엠블럼`}>
              {stages.map(emblem => pin(emblem))}
            </div></div>
          </div>}
        </> : <p className={styles.detailEmpty}>엠블럼을 선택하면 획득 조건과 기록을 확인할 수 있습니다.</p>}
      </section>
    </DialogContent>
  </Dialog>;
}

function socketStyle(emblem: PersonalEmblem): CSSProperties {
  return { "--badge-mask": `url("/_next/image?url=${encodeURIComponent(emblem.artwork)}&w=256&q=75")` } as CSSProperties;
}

function Socket() {
  return <span className={caseStyles.socketShadow} aria-hidden="true">
    <span className={caseStyles.socketRim}><span className={caseStyles.socketWell} /></span>
  </span>;
}

function EmblemPin({ emblem, selected, onClick, controls }: {
  emblem: PersonalEmblem; selected: boolean; onClick: () => void; controls: string;
}) {
  return <button type="button" data-emblem-key={emblem.key} className={cn(caseStyles.pin, caseStyles.artworkSocket, styles.pin)}
    style={socketStyle(emblem)} aria-label={`${emblem.name}${emblem.stage ? ` ${emblem.stage}단계` : ""} ${emblem.earned ? "획득" : "미획득"}`}
    aria-pressed={selected} aria-controls={controls} onClick={onClick}>
    <Socket />{emblem.earned && <EmblemArtwork emblem={emblem} className={styles.pinArtwork} />}
  </button>;
}
