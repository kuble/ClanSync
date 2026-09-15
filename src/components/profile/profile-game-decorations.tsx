"use client";

import Link from "next/link";
import { BadgeCheck, LockKeyhole, Shield, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  saveBadgePicksAction,
  saveNameplateSelectionAction,
  type NameplateCategory,
} from "@/app/actions/profile-decorations";
import {
  CLANSYNC_BADGE_PICKS_CHANGED,
  CLANSYNC_NAMEPLATE_CHANGED,
  PROFILE_DECOR_TAB_STORAGE_KEY,
} from "@/lib/profile-decoration-sync";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AltAccountRow } from "@/components/profile/profile-game-alt-accounts";
import { ProfileGameAltAccounts } from "@/components/profile/profile-game-alt-accounts";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import styles from "./profile.module.css";

const NP_LABEL: Record<NameplateCategory, string> = {
  emblem: "엠블럼",
  namebar: "이름표",
  sub: "서브",
  frame: "프레임",
};

const NP_ORDER: NameplateCategory[] = [
  "emblem",
  "namebar",
  "sub",
  "frame",
];

export type DecorationGame = {
  gameId: string;
  slug: string;
  nameKo: string;
  accountId?: string;
};

export type NameplateOptionRow = {
  id: string;
  game_id: string;
  category: NameplateCategory;
  name_ko: string;
  unlock_source: string;
};

export type BadgeRow = {
  id: string;
  game_id: string;
  name_ko: string;
  icon: string;
  unlock_source: string;
  unlock_condition: unknown;
};

type Props = {
  nickname: string;
  games: DecorationGame[];
  /** 해당 게임 user_game_profiles.is_verified 일 때 부계 패널 허용 */
  verifiedGameIds: string[];
  altAccountsByGame: Record<
    string,
    { rows: AltAccountRow[]; disclosureLines: string[] }
  >;
  nameplateOptions: NameplateOptionRow[];
  ownedOptionIds: string[];
  selections: Array<{
    game_id: string;
    category: NameplateCategory;
    option_id: string;
  }>;
  badges: BadgeRow[];
  unlockedBadgeIds: string[];
  picks: Array<{ game_id: string; badge_id: string; slot_index: number }>;
};

function equippable(b: BadgeRow, unlocked: Set<string>): boolean {
  if (unlocked.has(b.id)) return true;
  if (b.unlock_source === "achievement") {
    const c = b.unlock_condition as { always?: boolean } | undefined;
    if (c?.always === true) return true;
  }
  return false;
}

function defaultOptionId(
  options: NameplateOptionRow[],
  gameId: string,
  cat: NameplateCategory,
): string | null {
  const row = options.find(
    (o) =>
      o.game_id === gameId &&
      o.category === cat &&
      o.unlock_source === "default",
  );
  return row?.id ?? null;
}

export function ProfileGameDecorations({
  nickname,
  games,
  verifiedGameIds,
  altAccountsByGame,
  nameplateOptions,
  ownedOptionIds,
  selections,
  badges,
  unlockedBadgeIds,
  picks,
}: Props) {
  const verified = useMemo(() => new Set(verifiedGameIds), [verifiedGameIds]);
  const router = useRouter();
  const defaultSlug = games[0]?.slug ?? "";
  const [tabSlug, setTabSlug] = useState(defaultSlug);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(PROFILE_DECOR_TAB_STORAGE_KEY);
      if (saved && games.some((g) => g.slug === saved)) {
        setTabSlug(saved);
      }
    } catch {
      /* 세션 접근 불가 시 무시 */
    }
    // 초기 렌더의 games만 사용(마운트 1회 세션 탭 복원)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onDecorationSync() {
      router.refresh();
    }
    window.addEventListener(CLANSYNC_BADGE_PICKS_CHANGED, onDecorationSync);
    window.addEventListener(CLANSYNC_NAMEPLATE_CHANGED, onDecorationSync);
    return () => {
      window.removeEventListener(CLANSYNC_BADGE_PICKS_CHANGED, onDecorationSync);
      window.removeEventListener(CLANSYNC_NAMEPLATE_CHANGED, onDecorationSync);
    };
  }, [router]);

  function handleTabChange(next: string | number | null) {
    const slug = typeof next === "string" ? next : String(next ?? "");
    if (!slug) return;
    setTabSlug(slug);
    try {
      sessionStorage.setItem(PROFILE_DECOR_TAB_STORAGE_KEY, slug);
    } catch {
      /* noop */
    }
  }

  const effectiveSlug =
    games.some((g) => g.slug === tabSlug) ? tabSlug : defaultSlug;

  const owned = useMemo(() => new Set(ownedOptionIds), [ownedOptionIds]);
  const unlocked = useMemo(
    () => new Set(unlockedBadgeIds),
    [unlockedBadgeIds],
  );

  const selectionMap = useMemo(() => {
    const m = new Map<string, Partial<Record<NameplateCategory, string>>>();
    for (const s of selections) {
      const key = s.game_id;
      if (!m.has(key)) m.set(key, {});
      m.get(key)![s.category] = s.option_id;
    }
    return m;
  }, [selections]);

  const picksByGame = useMemo(() => {
    const m = new Map<string, string[]>();
    const rows = [...picks].sort((a, b) => a.slot_index - b.slot_index);
    for (const p of rows) {
      if (!m.has(p.game_id)) m.set(p.game_id, []);
      m.get(p.game_id)!.push(p.badge_id);
    }
    return m;
  }, [picks]);

  if (games.length === 0) return <section className={styles.empty}><h2 className={styles.sectionHeading}>아직 등록된 게임이 없습니다</h2><p className={styles.sectionText}>게임 계정을 연결하면 네임카드와 대표 뱃지를 설정할 수 있어요.</p><Link href="/games" className="text-primary mt-4 inline-block text-sm underline">게임 선택</Link></section>;
  return <section aria-labelledby="deco-heading">
    <h2 id="deco-heading" className={styles.sectionHeading}>게임별 프로필</h2><p className={styles.sectionText}>네임카드와 대표 뱃지는 게임별로 저장됩니다.</p>
    <Tabs value={effectiveSlug} onValueChange={handleTabChange} className={styles.gameTabs}>
      <TabsList className={styles.gameChips} aria-label="프로필 게임 선택">{games.map((game) => <TabsTrigger key={game.slug} value={game.slug}>{game.nameKo}</TabsTrigger>)}</TabsList>
      {games.map((game) => <TabsContent key={game.slug} value={game.slug}>
        <div className={styles.gameBundle}>
          <div className={styles.bundleHeader}><h3>{game.nameKo}</h3><span className={cn(styles.pill, verified.has(game.gameId) && styles.connected)}>{verified.has(game.gameId) ? <><BadgeCheck size={12} aria-hidden="true" />계정 연동됨</> : "계정 연동 필요"}</span></div>
          <GameDecorationPanel key={`${game.slug}:${(picksByGame.get(game.gameId) ?? []).join("|")}`} nickname={nickname} game={game} nameplateOptions={nameplateOptions} owned={owned} selectionForGame={selectionMap.get(game.gameId) ?? {}} badges={badges.filter((badge) => badge.game_id === game.gameId)} unlocked={unlocked} initialPicks={picksByGame.get(game.gameId) ?? []} />
          <section className="mt-6 border-t pt-5"><h4 className={styles.label}>본계정</h4><p className="text-sm">{game.accountId || "계정 정보 없음"}</p>{!verified.has(game.gameId) ? <Link href={`/games/${game.slug}/auth?next=/profile`} className="text-primary mt-3 inline-block text-xs underline">계정 연동하기</Link> : null}</section>
          {verified.has(game.gameId) ? <ProfileGameAltAccounts gameId={game.gameId} gameSlug={game.slug} disclosureLines={altAccountsByGame[game.gameId]?.disclosureLines ?? []} initialRows={altAccountsByGame[game.gameId]?.rows ?? []} /> : null}
        </div>
      </TabsContent>)}
    </Tabs>
  </section>;
}

function GameDecorationPanel({
  nickname,
  game,
  nameplateOptions,
  owned,
  selectionForGame,
  badges,
  unlocked,
  initialPicks,
}: {
  nickname: string;
  game: DecorationGame;
  nameplateOptions: NameplateOptionRow[];
  owned: Set<string>;
  selectionForGame: Partial<Record<NameplateCategory, string>>;
  badges: BadgeRow[];
  unlocked: Set<string>;
  initialPicks: string[];
}) {
  const [pending, start] = useTransition();
  const [pickState, setPickState] = useState<string[]>(initialPicks);
  const [nameplateOpen, setNameplateOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);

  const previewSelection = useMemo(() => {
    const out: Partial<Record<NameplateCategory, string>> = {
      ...selectionForGame,
    };
    for (const cat of NP_ORDER) {
      if (!out[cat]) {
        const d = defaultOptionId(nameplateOptions, game.gameId, cat);
        if (d) out[cat] = d;
      }
    }
    return out;
  }, [selectionForGame, nameplateOptions, game.gameId]);

  const previewLabels = useMemo(() => {
    const labels: string[] = [];
    for (const cat of NP_ORDER) {
      const id = previewSelection[cat];
      if (!id) continue;
      const o = nameplateOptions.find((x) => x.id === id);
      if (o) labels.push(o.name_ko);
    }
    return labels;
  }, [previewSelection, nameplateOptions]);

  function optionsForCategory(cat: NameplateCategory) {
    return nameplateOptions.filter(
      (o) =>
        o.game_id === game.gameId &&
        o.category === cat &&
        (o.unlock_source === "default" || owned.has(o.id)),
    );
  }

  function onNameplateChange(cat: NameplateCategory, optionId: string) {
    start(async () => {
      const r = await saveNameplateSelectionAction({
        gameId: game.gameId,
        category: cat,
        optionId,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("네임플레이트가 저장되었습니다.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(CLANSYNC_NAMEPLATE_CHANGED, {
            detail: { game: game.slug },
          }),
        );
      }
    });
  }

  function togglePick(badgeId: string) {
    if (pickState.includes(badgeId)) { setPickState((previous) => previous.filter((id) => id !== badgeId)); return; }
    if (pickState.length >= 5) { toast.message("대표 뱃지는 최대 5개까지입니다."); return; }
    setPickState((previous) => [...previous, badgeId]);
  }

  function savePicks() {
    start(async () => {
      const r = await saveBadgePicksAction({
        gameId: game.gameId,
        orderedBadgeIds: pickState,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("뱃지 스트립을 저장했습니다.");
      setBadgesOpen(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(CLANSYNC_BADGE_PICKS_CHANGED, {
            detail: { game: game.slug },
          }),
        );
      }
    });
  }

  return <>
    <div className={styles.sectionHeader}><h4>네임카드 · 밸런스 슬롯 미리보기</h4><Button type="button" size="sm" variant="outline" onClick={() => setNameplateOpen(true)}><Sparkles size={13} aria-hidden="true" />꾸미기</Button></div>
    <div className={styles.nameplate} data-game={game.slug} data-nameplate-preview={game.slug} data-nameplate-self="">
      <div className={styles.nameplateEmblem}><Shield size={27} strokeWidth={1.5} aria-hidden="true" /></div>
      <div className={styles.nameplateMain}><strong className={styles.nameplateNick}>{nickname}</strong><span className={styles.nameplateSubtitle}>{previewLabels.join(" · ") || "기본 네임카드"}</span></div>
    </div>
    <section className={styles.badgeSection}>
      <div className={styles.sectionHeader}><h4>대표 뱃지 (최대 5개)</h4><Button type="button" size="sm" variant="outline" onClick={() => setBadgesOpen(true)}>뱃지 케이스</Button></div>
      <div className={styles.badgeStrip} data-badge-strip={game.slug} data-badge-strip-self="" aria-label="대표 뱃지 미리보기">
        {Array.from({ length: 5 }, (_, index) => { const badge = badges.find((item) => item.id === pickState[index]); return <span key={index} data-badge-strip-slot={index} className={cn(styles.badgeSlot, !badge && styles.emptySlot)} title={badge?.name_ko ?? "빈 슬롯"}>{badge?.icon ?? "—"}</span>; })}
      </div>
      <p className={styles.nameplateNote}>앞쪽에 선택한 뱃지부터 네임카드에 표시됩니다.</p>
    </section>
    <Dialog open={nameplateOpen} onOpenChange={setNameplateOpen}>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>네임카드 꾸미기</DialogTitle><DialogDescription>보유한 꾸미기를 선택하면 바로 저장됩니다.</DialogDescription></DialogHeader>
        <div className={styles.caseFields}>{NP_ORDER.map((category) => {
          const options = optionsForCategory(category);
          const value = selectionForGame[category] ?? defaultOptionId(nameplateOptions, game.gameId, category) ?? "";
          return <label key={category}>{NP_LABEL[category]}<select value={value} disabled={options.length === 0 || pending} onChange={(event) => onNameplateChange(category, event.target.value)}>
            {options.length === 0 ? <option value="">사용 가능한 옵션 없음</option> : null}
            {options.map((option) => <option key={option.id} value={option.id}>{option.name_ko}{option.unlock_source !== "default" ? " (보유)" : ""}</option>)}
          </select></label>;
        })}</div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setNameplateOpen(false)}>닫기</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={badgesOpen} onOpenChange={(open) => { if (pending) return; setBadgesOpen(open); if (!open) setPickState(initialPicks); }}>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>뱃지 케이스</DialogTitle><DialogDescription>대표 뱃지를 최대 5개까지 선택하세요. 선택한 순서대로 표시됩니다.</DialogDescription></DialogHeader>
        <div className={styles.caseHeader}><span className="text-muted-foreground text-xs">선택 {pickState.length} / 5</span><Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setPickState([])}>선택 초기화</Button></div>
        {badges.length ? <div className={styles.caseGrid}>{badges.map((badge) => {
          const available = equippable(badge, unlocked);
          const order = pickState.indexOf(badge.id);
          return <button type="button" key={badge.id} disabled={pending || !available} aria-pressed={order >= 0} className={styles.badgeOption} onClick={() => togglePick(badge.id)}>
            <span aria-hidden="true">{badge.icon}</span><strong>{badge.name_ko}</strong><small>{!available ? <span className="inline-flex items-center gap-1"><LockKeyhole size={10} aria-hidden="true" />미해금</span> : order >= 0 ? `${order + 1}번째 표시` : "보유"}</small>
          </button>;
        })}</div> : <p className={styles.empty}>아직 등록된 뱃지가 없습니다.</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => { setPickState(initialPicks); setBadgesOpen(false); }}>취소</Button><Button type="button" disabled={pending} onClick={savePicks}>{pending ? "저장 중…" : "스트립 저장"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
