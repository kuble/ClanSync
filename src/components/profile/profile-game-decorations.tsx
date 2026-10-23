"use client";

import Link from "next/link";
import { BadgeCheck, Shield, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  saveNameplateSelectionAction,
  type NameplateCategory,
} from "@/app/actions/profile-decorations";
import {
  CLANSYNC_NAMEPLATE_CHANGED,
  PROFILE_DECOR_TAB_STORAGE_KEY,
} from "@/lib/profile-decoration-sync";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AltAccountRow } from "@/components/profile/profile-game-alt-accounts";
import { ProfileGameAltAccounts } from "@/components/profile/profile-game-alt-accounts";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
};

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
    window.addEventListener(CLANSYNC_NAMEPLATE_CHANGED, onDecorationSync);
    return () => {
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

  const selectionMap = useMemo(() => {
    const m = new Map<string, Partial<Record<NameplateCategory, string>>>();
    for (const s of selections) {
      const key = s.game_id;
      if (!m.has(key)) m.set(key, {});
      m.get(key)![s.category] = s.option_id;
    }
    return m;
  }, [selections]);


  if (games.length === 0) return <section className={styles.empty}><h2 className={styles.sectionHeading}>아직 등록된 게임이 없습니다</h2><p className={styles.sectionText}>게임 계정을 연결하면 게임 프로필과 네임카드를 관리할 수 있어요.</p><Link href="/games" className="text-primary mt-4 inline-block text-sm underline">게임 선택</Link></section>;
  return <section aria-labelledby="deco-heading">
    <h2 id="deco-heading" className={styles.sectionHeading}>게임별 프로필</h2><p className={styles.sectionText}>게임 계정과 네임카드를 한곳에서 관리하세요.</p>
    <Tabs value={effectiveSlug} onValueChange={handleTabChange} className={styles.gameTabs}>
      <TabsList className={styles.gameChips} aria-label="프로필 게임 선택">{games.map((game) => <TabsTrigger key={game.slug} value={game.slug}>{game.nameKo}</TabsTrigger>)}</TabsList>
      {games.map((game) => <TabsContent key={game.slug} value={game.slug}>
        <div className={styles.gameBundle}>
          <div className={styles.bundleHeader}><h3>{game.nameKo}</h3><span className={cn(styles.pill, verified.has(game.gameId) && styles.connected)}>{verified.has(game.gameId) ? <><BadgeCheck size={12} aria-hidden="true" />계정 연동됨</> : "계정 연동 필요"}</span></div>
          <GameDecorationPanel key={game.slug} nickname={nickname} game={game} nameplateOptions={nameplateOptions} owned={owned} selectionForGame={selectionMap.get(game.gameId) ?? {}} />
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
}: {
  nickname: string;
  game: DecorationGame;
  nameplateOptions: NameplateOptionRow[];
  owned: Set<string>;
  selectionForGame: Partial<Record<NameplateCategory, string>>;
}) {
  const [pending, start] = useTransition();
  const [nameplateOpen, setNameplateOpen] = useState(false);

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

  return <>
    <div className={styles.sectionHeader}><h4>네임카드 · 밸런스 슬롯 미리보기</h4><Button type="button" size="sm" variant="outline" onClick={() => setNameplateOpen(true)}><Sparkles size={13} aria-hidden="true" />꾸미기</Button></div>
    <div className={styles.nameplate} data-game={game.slug} data-nameplate-preview={game.slug} data-nameplate-self="">
      <div className={styles.nameplateEmblem}><Shield size={27} strokeWidth={1.5} aria-hidden="true" /></div>
      <div className={styles.nameplateMain}><strong className={styles.nameplateNick}>{nickname}</strong><span className={styles.nameplateSubtitle}>{previewLabels.join(" · ") || "기본 네임카드"}</span></div>
    </div>
    <Sheet open={nameplateOpen} onOpenChange={setNameplateOpen}>
      <SheetContent showCloseButton={!pending} className="gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]"><SheetHeader className="shrink-0 px-5 pb-5 pr-12"><SheetTitle>네임카드 꾸미기</SheetTitle><SheetDescription>보유한 꾸미기를 선택하면 바로 저장됩니다.</SheetDescription></SheetHeader>
        <div className="board-scroll min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-5"><div className={styles.caseFields}>{NP_ORDER.map((category) => {
          const options = optionsForCategory(category);
          const value = selectionForGame[category] ?? defaultOptionId(nameplateOptions, game.gameId, category) ?? "";
          return <label key={category}>{NP_LABEL[category]}<select value={value} disabled={options.length === 0 || pending} onChange={(event) => onNameplateChange(category, event.target.value)}>
            {options.length === 0 ? <option value="">사용 가능한 옵션 없음</option> : null}
            {options.map((option) => <option key={option.id} value={option.id}>{option.name_ko}{option.unlock_source !== "default" ? " (보유)" : ""}</option>)}
          </select></label>;
        })}</div>
        </div><SheetFooter className="mt-0 shrink-0 flex-row justify-end border-t px-5 py-4"><Button type="button" variant="outline" onClick={() => setNameplateOpen(false)}>닫기</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  </>;
}
