"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  beforeSave,
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
  beforeSave: () => Promise<{ ok: true; revision: number } | { ok: false }>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(settings);
  const [map, setMap] = useState(mapBan);
  const [hero, setHero] = useState(heroBan);
  const [pending, start] = useTransition();
  const [initialRules] = useState({ settings, mapBan, heroBan });
  const [savedRules, setSavedRules] = useState<
    (typeof initialRules & { submittedRevision: number }) | null
  >(null);
  useEffect(() => {
    if (!savedRules || revision <= savedRules.submittedRevision) return;
    if (
      !sameFormationSettings(settings, savedRules.settings) ||
      mapBan !== savedRules.mapBan ||
      heroBan !== savedRules.heroBan
    ) {
      toast.error(
        "다른 운영진이 규칙을 다시 변경했습니다. 최신 설정을 확인하세요.",
      );
    }
    onOpenChange(false);
  }, [savedRules, revision, settings, mapBan, heroBan, onOpenChange]);
  const baseRules = JSON.stringify([
    initialRules.settings,
    initialRules.mapBan,
    initialRules.heroBan,
  ]);
  const rulesChanged =
    !savedRules && baseRules !== JSON.stringify([settings, mapBan, heroBan]);
  const players = rosterPlayers(roster);
  const names = new Map(pool.map((p) => [p.user_id, p.nickname]));
  const locked = !editable || pending || Boolean(savedRules) || rulesChanged;
  function save() {
    if (locked) return;
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
              ? "다음 라운드에도 같은 규칙을 사용합니다."
              : "진행 중인 라운드의 규칙입니다. 명단 수정 후 변경할 수 있습니다."}
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
          <fieldset disabled={locked} className="space-y-3">
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
          <fieldset disabled={locked}>
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
                배정합니다.
              </p>
            ) : null}
          </fieldset>
          <fieldset disabled={locked} className="space-y-4 border-t pt-5">
            <legend className="font-semibold text-sm">밴픽</legend>
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
          </fieldset>
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
