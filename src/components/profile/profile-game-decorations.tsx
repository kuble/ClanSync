"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  saveBadgePicksAction,
  saveNameplateSelectionAction,
  type NameplateCategory,
} from "@/app/actions/profile-decorations";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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
  games: DecorationGame[];
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
  games,
  nameplateOptions,
  ownedOptionIds,
  selections,
  badges,
  unlockedBadgeIds,
  picks,
}: Props) {
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

  if (games.length === 0) {
    return (
      <section className="mt-10" aria-labelledby="deco-heading">
        <h2 id="deco-heading" className="text-lg font-semibold tracking-tight">
          네임플레이트 · 뱃지
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          게임 계정을 연동하면 게임별 꾸미기를 설정할 수 있습니다.{" "}
          <a href="/games" className="text-primary underline underline-offset-4">
            게임 선택
          </a>
        </p>
      </section>
    );
  }

  const defaultTab = games[0]!.slug;

  return (
    <section className="mt-10" aria-labelledby="deco-heading">
      <h2 id="deco-heading" className="text-lg font-semibold tracking-tight">
        네임플레이트 · 뱃지 스트립
      </h2>
      <p className="text-muted-foreground mt-1 text-xs">
        D-PROFILE-01~04 · 연동된 게임별로 저장됩니다.
      </p>

      <Tabs defaultValue={defaultTab} className="mt-4 w-full max-w-xl">
        <TabsList
          variant="line"
          className="w-full flex-wrap justify-start gap-1"
        >
          {games.map((g) => (
            <TabsTrigger key={g.slug} value={g.slug}>
              {g.nameKo}
            </TabsTrigger>
          ))}
        </TabsList>
        {games.map((g) => (
          <TabsContent key={g.slug} value={g.slug} className="mt-4">
            <GameDecorationPanel
              game={g}
              nameplateOptions={nameplateOptions}
              owned={owned}
              selectionForGame={selectionMap.get(g.gameId) ?? {}}
              badges={badges.filter((b) => b.game_id === g.gameId)}
              unlocked={unlocked}
              initialPicks={picksByGame.get(g.gameId) ?? []}
            />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function GameDecorationPanel({
  game,
  nameplateOptions,
  owned,
  selectionForGame,
  badges,
  unlocked,
  initialPicks,
}: {
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

  const pickSyncKey = initialPicks.join("|");
  useEffect(() => {
    setPickState(initialPicks);
  }, [pickSyncKey, initialPicks]);

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
          new CustomEvent("clansync:nameplate:changed", {
            detail: { game: game.slug },
          }),
        );
      }
    });
  }

  function togglePick(badgeId: string) {
    setPickState((prev) => {
      if (prev.includes(badgeId)) {
        return prev.filter((x) => x !== badgeId);
      }
      if (prev.length >= 5) {
        toast.message("스트립은 최대 5개까지입니다.");
        return prev;
      }
      return [...prev, badgeId];
    });
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("clansync:badge:picks:changed", {
            detail: { game: game.slug },
          }),
        );
      }
    });
  }

  const equippableBadges = badges.filter((b) => equippable(b, unlocked));

  return (
    <div className="space-y-6">
      <div
        className="bg-muted/40 rounded-xl border p-4"
        data-nameplate-preview={game.slug}
        data-nameplate-self=""
      >
        <p className="text-muted-foreground text-xs font-medium">
          미리보기 (D-PROFILE-01)
        </p>
        <p className="mt-2 text-sm font-medium">{previewLabels.join(" · ") || "—"}</p>
      </div>

      <div className="space-y-3">
        {NP_ORDER.map((cat) => {
          const opts = optionsForCategory(cat);
          const value =
            selectionForGame[cat] ??
            defaultOptionId(nameplateOptions, game.gameId, cat) ??
            "";
          return (
            <div key={cat}>
              <label className="text-muted-foreground text-xs">{NP_LABEL[cat]}</label>
              <select
                className={cn(
                  "border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm",
                  "focus-visible:ring-ring outline-none focus-visible:ring-2",
                )}
                value={value}
                disabled={opts.length === 0 || pending}
                onChange={(e) => onNameplateChange(cat, e.target.value)}
              >
                {opts.length === 0 ? (
                  <option value="">사용 가능한 옵션 없음</option>
                ) : null}
                {opts.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name_ko}
                    {o.unlock_source !== "default" ? " (보유)" : ""}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div>
        <p className="text-sm font-medium">뱃지 스트립 (최대 5)</p>
        <div
          className="bg-muted/30 mt-2 flex min-h-12 flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
          data-badge-strip={game.slug}
          data-badge-strip-self=""
        >
          {pickState.length === 0 ? (
            <span className="text-muted-foreground text-xs">비어 있음</span>
          ) : (
            pickState.map((bid, i) => {
              const b = badges.find((x) => x.id === bid);
              return (
                <span
                  key={`${bid}-${i}`}
                  data-badge-strip-slot={i}
                  className="bg-background inline-flex h-9 min-w-9 items-center justify-center rounded-md border text-sm"
                  title={b?.name_ko}
                >
                  {b?.icon ?? "?"}
                </span>
              );
            })
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {equippableBadges.map((b) => {
            const on = pickState.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                disabled={pending}
                onClick={() => togglePick(b.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  on
                    ? "border-primary bg-primary/10"
                    : "bg-background hover:bg-muted/50",
                )}
              >
                <span className="mr-1">{b.icon}</span>
                {b.name_ko}
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={savePicks}
          >
            스트립 저장
          </Button>
        </div>

        {badges.some((b) => !equippable(b, unlocked)) ? (
          <p className="text-muted-foreground mt-3 text-xs">
            잠긴 뱃지는 업적·이벤트·스토어에서 해금됩니다 (D-PROFILE-04).
          </p>
        ) : null}
      </div>
    </div>
  );
}
