"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { updateFormationSettingsAction } from "@/app/actions/clan-balance-formation";
import {
  ROLE_LABEL,
  rosterPlayers,
  sameFormationSettings,
  type FormationSettings,
} from "@/lib/balance/formation";
import {
  sameBanSettings,
  validateBanSettings,
  type BanSettings,
} from "@/lib/balance/prematch";
import type { BalanceRoster } from "@/lib/balance/roster-schema";

export const TEAM_MODE_LABELS = {
  keep: "현재 팀 유지",
  random: "역할별 추첨",
  draft: "주장 지명",
  auction: "팀원 경매",
};
const field =
  "mt-2 min-h-11 w-full rounded-lg border bg-background px-3 text-sm";

export function ClanBalanceSettings({
  open,
  onOpenChange,
  gameSlug,
  clanId,
  roundId,
  revision,
  settings,
  mapBan,
  heroBan,
  roster,
  pool,
  editable,
  formationEditable,
  banSettings,
  activeVote,
  beforeSave,
  planPremium,
  regularRoom,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameSlug: string;
  clanId: string;
  roundId: string;
  revision: number;
  settings: FormationSettings;
  mapBan: boolean;
  heroBan: boolean;
  roster: BalanceRoster;
  pool: readonly { user_id: string; nickname: string }[];
  editable: boolean;
  formationEditable: boolean;
  banSettings: BanSettings;
  activeVote: boolean;
  beforeSave: () => Promise<{ ok: true; revision: number } | { ok: false }>;
  planPremium: boolean;
  regularRoom: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(settings);
  const [map, setMap] = useState(mapBan);
  const [hero, setHero] = useState(heroBan);
  const [banDraft, setBanDraft] = useState(banSettings);
  const [pending, start] = useTransition();
  const [initialRules] = useState({ settings, mapBan, heroBan, banSettings });
  const [savedRules, setSavedRules] = useState<
    (typeof initialRules & { submittedRevision: number }) | null
  >(null);
  useEffect(() => {
    if (!savedRules || revision <= savedRules.submittedRevision) return;
    if (
      !sameFormationSettings(settings, savedRules.settings) ||
      mapBan !== savedRules.mapBan ||
      heroBan !== savedRules.heroBan ||
      !sameBanSettings(banSettings, savedRules.banSettings)
    ) {
      toast.error(
        "다른 운영진이 규칙을 다시 변경했습니다. 최신 설정을 확인하세요.",
      );
    }
    onOpenChange(false);
  }, [
    savedRules,
    revision,
    settings,
    mapBan,
    heroBan,
    banSettings,
    onOpenChange,
  ]);
  const baseRules = JSON.stringify([
    initialRules.settings,
    initialRules.mapBan,
    initialRules.heroBan,
    initialRules.banSettings,
  ]);
  const rulesChanged =
    !savedRules &&
    baseRules !== JSON.stringify([settings, mapBan, heroBan, banSettings]);
  const players = rosterPlayers(roster);
  const names = new Map(pool.map((p) => [p.user_id, p.nickname]));
  const locked = !editable || pending || Boolean(savedRules) || rulesChanged;
  function save() {
    if (locked) return;
    const error = validateBanSettings(banDraft);
    if (error) {
      toast.error(error);
      return;
    }
    start(async () => {
      try {
        const flushed = await beforeSave();
        if (!flushed.ok) return;
        const result = await updateFormationSettingsAction(
          gameSlug,
          clanId,
          roundId,
          Math.max(revision, flushed.revision),
          draft,
          map,
          hero,
          initialRules,
          banDraft,
        );
        if (!result.ok) {
          toast.error(result.error);
          router.refresh();
          return;
        }
        // Keep the start control covered until its props contain the saved rules.
        // A successful action can resolve before the refreshed RSC tree commits.
        setSavedRules({
          settings: draft,
          mapBan: map,
          heroBan: hero,
          banSettings: banDraft,
          submittedRevision: Math.max(revision, flushed.revision),
        });
        router.refresh();
      } catch {
        toast.error(
          "설정을 저장하지 못했습니다. 연결을 확인하고 다시 시도하세요.",
        );
      }
    });
  }
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next || (!pending && !savedRules)) onOpenChange(next);
      }}
    >
      <SheetContent
        className="overflow-y-auto sm:max-w-lg"
        showCloseButton={!pending && !savedRules}
      >
        <SheetHeader>
          <SheetTitle>라운드 설정</SheetTitle>
          <SheetDescription>
            {editable
              ? "편성, 화면 표시와 밴픽 설정을 관리합니다."
              : "경기가 시작되어 설정이 잠겼습니다."}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-7 px-5 pb-6">
          {rulesChanged ? (
            <p
              role="alert"
              className="rounded-lg border border-amber-500/40 p-3 text-sm"
            >
              다른 운영진이 규칙을 변경했습니다. 닫은 뒤 다시 열어 최신 설정을
              확인하세요.
            </p>
          ) : null}
          <Tabs defaultValue="formation" className="gap-5">
            <TabsList className="grid h-10 w-full grid-cols-3">
              <TabsTrigger value="formation">편성</TabsTrigger>
              <TabsTrigger value="display">화면 표시</TabsTrigger>
              <TabsTrigger value="bans">밴픽</TabsTrigger>
            </TabsList>
            <TabsContent value="formation" className="space-y-6 rounded-xl border bg-muted/10 p-4">
          <fieldset
            disabled={locked || !formationEditable}
            className="space-y-3"
          >
            <legend className="mb-3 font-semibold text-sm">역할 배정</legend>
            {(
              [
                [
                  "manual",
                  "직접 배정",
                  "손든 순서 등으로 배치한 역할을 사용합니다.",
                ],
                [
                  "lottery",
                  "공통 추첨순서",
                  "같은 추첨 순서에 따라 본인의 선호와 남은 역할을 적용합니다.",
                ],
              ] as const
            ).map(([value, label, text]) => (
              <label
                key={value}
                className="flex items-start gap-3 rounded-xl border p-4 text-sm"
              >
                <input
                  type="radio"
                  name="setting-roles"
                  className="mt-1 accent-primary"
                  checked={draft.roles === value}
                  onChange={() =>
                    setDraft({
                      ...draft,
                      roles: value,
                      teams:
                        value === "lottery" && draft.teams === "keep"
                          ? "random"
                          : draft.teams,
                      captains: undefined,
                    })
                  }
                />
                <span>
                  <strong>{label}</strong>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {text}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset disabled={locked || !formationEditable}>
            <legend className="font-semibold text-sm">팀원 선발</legend>
            <select
              aria-label="팀원 선발 방식"
              className={field}
              value={draft.teams}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  teams: e.target.value as FormationSettings["teams"],
                  captains: undefined,
                })
              }
            >
              {Object.entries(TEAM_MODE_LABELS)
                .filter(([key]) => draft.roles === "manual" || key !== "keep")
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
            {["draft", "auction"].includes(draft.teams) ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  같은 역할의 두 명이 주장을 맡습니다. 기본은 양 팀 탱커입니다.
                </p>
                {draft.roles === "manual" ? (
                  ([0, 1] as const).map((i) => (
                    <label key={i} className="block text-xs">
                      {i + 1}팀 주장
                      <select
                        className={field}
                        aria-label={`${i + 1}팀 주장`}
                        value={draft.captains?.[i] ?? ""}
                        onChange={(e) => {
                          if (!e.target.value) {
                            setDraft({ ...draft, captains: undefined });
                            return;
                          }
                          const other = players.find(
                            (p) =>
                              p.id !== e.target.value &&
                              p.role ===
                                players.find((p) => p.id === e.target.value)
                                  ?.role,
                          )?.id;
                          if (other)
                            setDraft({
                              ...draft,
                              captains:
                                i === 0
                                  ? [e.target.value, other]
                                  : [
                                      draft.captains?.[0] ?? other,
                                      e.target.value,
                                    ],
                            });
                        }}
                      >
                        <option value="">탱커 (기본)</option>
                        {players
                          .filter(
                            (p) =>
                              i === 0 ||
                              !draft.captains ||
                              (p.id !== draft.captains[0] &&
                                p.role ===
                                  players.find(
                                    (p) => p.id === draft.captains![0],
                                  )?.role),
                          )
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {names.get(p.id)} · {ROLE_LABEL[p.role]}
                            </option>
                          ))}
                      </select>
                    </label>
                  ))
                ) : (
                  <p className="text-xs">
                    역할 추첨으로 정해진 탱커 2명이 주장이 됩니다.
                  </p>
                )}
                {draft.teams === "draft" ? (
                  <p className="text-xs text-muted-foreground">
                    선픽 팀 추첨 후 A → B → B → A → A → B → B → A 순서로
                    지명합니다.
                  </p>
                ) : null}
              </div>
            ) : null}
            {draft.teams === "auction" ? (
              <div className="mt-5 grid grid-cols-3 gap-3">
                {(
                  [
                    {
                      key: "auctionBudget",
                      label: "팀 크레딧",
                      min: 40,
                      max: 100000,
                      step: 10,
                    },
                    {
                      key: "minBid",
                      label: "최소·증액 단위",
                      min: 10,
                      max: 1000,
                      step: 10,
                    },
                    {
                      key: "durationSeconds",
                      label: "입찰 시간(초)",
                      min: 10,
                      max: 60,
                      step: 1,
                    },
                  ] as const
                ).map((f) => (
                  <label key={f.key} className="text-xs">
                    {f.label}
                    <input
                      type="number"
                      aria-label={f.label}
                      className={field}
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={draft[f.key]}
                      onChange={(e) =>
                        setDraft({ ...draft, [f.key]: Number(e.target.value) })
                      }
                    />
                  </label>
                ))}
              </div>
            ) : null}
            {draft.teams === "auction" ? (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                마지막 5초 입찰 시 남은 시간을 5초로 연장합니다(최대 기본 시간 +
                30초). 무입찰은 한 번 재경매 후 가능한 팀에 최소가로 추첨
                배정합니다. 시간이 끝나면 낙찰과 다음 선수 공개가 자동으로 이어집니다.
              </p>
            ) : null}
            {draft.teams === "auction" ? <div className="mt-4 space-y-3 rounded-lg border bg-background/50 p-3">
              <label className="flex items-center justify-between gap-3 text-sm font-medium">전략 아이템 사용<input type="checkbox" className="size-4 accent-primary" checked={draft.auctionItemsEnabled} onChange={(event) => setDraft({ ...draft, auctionItemsEnabled: event.target.checked })} /></label>
              <p className="text-xs leading-relaxed text-muted-foreground">아이템 3개 공개 → 전략 준비 → 팀원 경매 → 남은 포인트로 아이템 선택 순서로 진행합니다.</p>
              {draft.auctionItemsEnabled ? <label className="block text-xs">전략 준비 시간(초)<input type="number" aria-label="전략 준비 시간(초)" min={10} max={120} step={1} className={field} value={draft.strategySeconds} onChange={(event) => setDraft({ ...draft, strategySeconds: Number(event.target.value) })} /></label> : null}
              <Link href={`/games/${gameSlug}/clan/${clanId}/manage?tab=balance#auction-items`} className="inline-block text-xs font-semibold text-primary underline underline-offset-4">클랜 전략 아이템 관리</Link>
              <p className="text-[11px] text-muted-foreground">활성 아이템을 3개 이상 등록해 주세요. 효과는 운영진이 경기 규칙에 직접 적용합니다.</p>
            </div> : null}
          </fieldset>
            </TabsContent>
            <TabsContent value="display" className="rounded-xl border bg-muted/10 p-4">
          <fieldset disabled={locked} className="space-y-3">
            <legend className="font-semibold text-sm">선수 카드 표시</legend>
            <p className="text-xs text-muted-foreground">편성 화면에 적용됩니다. 경기 현황에서는 참가자 이름만 표시합니다.</p>
            <label className="flex items-center justify-between gap-4 rounded-lg border bg-background/60 p-3 text-sm">
              <span>
                점수 표시
                <span className="mt-1 block text-xs text-muted-foreground">선택한 평가·분석 점수를 카드에 표시합니다.</span>
              </span>
              <input
                type="checkbox"
                aria-label="선수 카드 점수 표시"
                className="size-4 shrink-0 accent-primary"
                checked={draft.showPlayerCardScore}
                onChange={(event) => setDraft({ ...draft, showPlayerCardScore: event.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-lg border bg-background/60 p-3 text-sm">
              <span>
                보조 정보 표시
                <span className="mt-1 block text-xs text-muted-foreground">닉네임 아래에 세션 기록을 표시합니다.</span>
              </span>
              <input
                type="checkbox"
                aria-label="선수 카드 보조 정보 표시"
                className="size-4 shrink-0 accent-primary"
                checked={draft.showPlayerCardInfo}
                onChange={(event) => setDraft({ ...draft, showPlayerCardInfo: event.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-lg border bg-background/60 p-3 text-sm">
              <span>
                팀 비교 요약
                <span className="mt-1 block text-xs text-muted-foreground">팀 합계에 마우스를 올렸을 때 비교 팝업을 표시합니다.</span>
              </span>
              <input
                type="checkbox"
                aria-label="팀 비교 요약 표시"
                className="size-4 shrink-0 accent-primary"
                checked={draft.showTeamComparisonSummary}
                onChange={(event) => setDraft({ ...draft, showTeamComparisonSummary: event.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-lg border bg-background/60 p-3 text-sm">
              <span>
                플레이어 세션 정보
                <span className="mt-1 block text-xs text-muted-foreground">플레이어에 마우스를 올렸을 때 상세 팝업을 표시합니다.</span>
              </span>
              <input
                type="checkbox"
                aria-label="플레이어 세션 정보 요약 표시"
                className="size-4 shrink-0 accent-primary"
                checked={draft.showPlayerSessionSummary}
                onChange={(event) => setDraft({ ...draft, showPlayerSessionSummary: event.target.checked })}
              />
            </label>
            <label className="block text-xs">
              보조 정보 내용
              <select
                aria-label="선수 카드 보조 정보"
                className={field}
                disabled={!draft.showPlayerCardInfo}
                value={draft.playerCardInfo}
                onChange={(event) => setDraft({ ...draft, playerCardInfo: event.target.value as FormationSettings["playerCardInfo"] })}
              >
                <option value="record">세션 전적</option>
                <option value="streak">현재 연승·연패</option>
              </select>
            </label>
          </fieldset>
            </TabsContent>
            <TabsContent value="bans" className="rounded-xl border bg-muted/10 p-4">
          <fieldset disabled={locked} className="space-y-4">
            <legend className="font-semibold text-sm">밴픽</legend>
            <div className="space-y-2 rounded-lg border bg-background/60 p-3">
              <label className="flex items-center justify-between gap-3 text-sm font-medium">
                승부예측 사용
                <input type="checkbox" className="size-4 accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                  checked={planPremium && regularRoom && draft.predictionEnabled}
                  disabled={!planPremium || !regularRoom}
                  onChange={(event) => setDraft({ ...draft, predictionEnabled: event.target.checked })} />
              </label>
              <p className="text-xs text-muted-foreground">{!planPremium ? "Premium 클랜에서 사용할 수 있습니다." : !regularRoom ? "정규 내전에서만 사용할 수 있습니다." : "관전 멤버가 승리할 팀을 예측합니다. 경기 현황에서 따로 열 수 있습니다."}</p>
            </div>
            <label className="flex items-center justify-between text-sm">
              맵 밴 사용
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={map}
                onChange={(e) => setMap(e.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              영웅 밴 사용
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={hero}
                onChange={(e) => setHero(e.target.checked)}
              />
            </label>
            <label className="block space-y-2 text-xs">
              <span>팀별 영웅 밴 개수</span>
              <select aria-label="팀별 영웅 밴 개수" className={field} disabled={!hero}
                value={banDraft.heroBansPerTeam}
                onChange={(event) => setBanDraft({ ...banDraft, heroBansPerTeam: Number(event.target.value) as 1 | 2 })}>
                <option value={1}>팀당 1영웅</option>
                <option value={2}>팀당 2영웅</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  {
                    key: "mapBanSeconds",
                    label: "맵 밴 시간(초)",
                    enabled: map,
                  },
                  {
                    key: "heroBanSeconds",
                    label: "영웅 밴 시간(초)",
                    enabled: hero,
                  },
                ] as const
              ).map(({ key, label, enabled }) => (
                <label key={key} className="text-xs">
                  {label}
                  <input
                    type="number"
                    aria-label={label}
                    className={field}
                    min={5}
                    max={300}
                    step={1}
                    disabled={!enabled}
                    value={banDraft[key]}
                    onChange={(e) =>
                      setBanDraft({
                        ...banDraft,
                        [key]: Number(e.target.value),
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </fieldset>
            </TabsContent>
          </Tabs>
          {editable && activeVote ? (
            <p className="text-xs text-muted-foreground">
              밴 설정을 변경하면 해당 투표를 초기화합니다.
            </p>
          ) : null}
          {editable ? (
            <Button className="w-full" disabled={locked} onClick={save}>
              {pending || savedRules ? "적용 중…" : "설정 적용"}
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
