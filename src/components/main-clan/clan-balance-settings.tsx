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
import { BalanceFormationPreview, type PreviewSettingFocus, type PreviewSettingField } from "./balance-formation-preview";
import { BalanceDisplaySettings, BalanceBanSettings } from "./balance-settings-options";
import styles from "./clan-balance-settings.module.css";

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
  const [previewFocus, setPreviewFocus] = useState<PreviewSettingFocus | null>(null);
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
  function focusPreview(field: PreviewSettingField, value = draft[field]) {
    setPreviewFocus({ field, previousValue: initialRules.settings[field], value });
  }
  function changePreviewSetting(field: PreviewSettingField, value: number) {
    setDraft({ ...draft, [field]: value });
    focusPreview(field, value);
  }
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
        className={`overflow-hidden sm:max-w-lg ${styles.sheet}`}
        showCloseButton={!pending && !savedRules}
      >
        <div className={styles.panel} data-testid="balance-settings-panel">
        <SheetHeader>
          <SheetTitle>경기 설정</SheetTitle>
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
                  "수동 배정",
                ],
                [
                  "lottery",
                  "자동 배정",
                ],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex items-start gap-3 rounded-xl border p-4 text-sm"
              >
                <input
                  type="radio"
                  name="setting-roles"
                  className="mt-1 accent-primary"
                  checked={draft.roles === value}
                  onChange={() => {
                    setPreviewFocus(null);
                    setDraft({
                      ...draft,
                      roles: value,
                      teams:
                        value === "lottery" && draft.teams === "keep"
                          ? "random"
                          : draft.teams,
                      captains: undefined,
                    });
                  }}
                />
                <span>
                  <strong>{label}</strong>
                </span>
              </label>
            ))}
          </fieldset>
          <div>
          <fieldset disabled={locked || !formationEditable}>
            <legend className="font-semibold text-sm">팀원 선발</legend>
            <select
              aria-label="팀원 선발 방식"
              className={field}
              value={draft.teams}
              onChange={(e) => {
                setPreviewFocus(null);
                setDraft({
                  ...draft,
                  teams: e.target.value as FormationSettings["teams"],
                  captains: undefined,
                });
              }}
            >
              {Object.entries(TEAM_MODE_LABELS)
                .filter(([key]) => draft.roles === "manual" || key !== "keep")
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
          </fieldset>
            <div className={styles.preview}>
              <BalanceFormationPreview key={`${draft.roles}:${draft.teams}:${draft.auctionItemsEnabled}`} settings={draft} focus={previewFocus} />
            </div>
          <fieldset disabled={locked || !formationEditable}>
            {["draft", "auction"].includes(draft.teams) ? (
              <div className="mt-4 space-y-3">
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
                ) : null}
              </div>
            ) : null}
            {draft.teams === "auction" ? (
              <div className="mt-5 grid grid-cols-2 gap-3">
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
                    { key: "bidExtensionSeconds", label: "입찰 연장 시간(초)", min: 0, max: 30, step: 1 },
                    { key: "auctionPreparationSeconds", label: "낙찰 후 준비 시간(초)", min: 0, max: 60, step: 1 },
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
                      onFocus={() => focusPreview(f.key)}
                      onChange={(e) =>
                        changePreviewSetting(f.key, Number(e.target.value))
                      }
                    />
                  </label>
                ))}
              </div>
            ) : null}
            {draft.teams === "auction" ? <div className="mt-4 space-y-3 rounded-lg border bg-background/50 p-3">
              <label className="flex items-center justify-between gap-3 text-sm font-medium">전략 아이템 사용<input type="checkbox" className="size-4 accent-primary" checked={draft.auctionItemsEnabled} onChange={(event) => { setPreviewFocus(null); setDraft({ ...draft, auctionItemsEnabled: event.target.checked }); }} /></label>
              {draft.auctionItemsEnabled ? <label className="block text-xs">전략 준비 시간(초)<input type="number" aria-label="전략 준비 시간(초)" min={10} max={120} step={1} className={field} value={draft.strategySeconds} onFocus={() => focusPreview("strategySeconds")} onChange={(event) => changePreviewSetting("strategySeconds", Number(event.target.value))} /></label> : null}
              <Link href={`/games/${gameSlug}/clan/${clanId}/manage?tab=balance#auction-items`} className="inline-block text-xs font-semibold text-primary underline underline-offset-4">클랜 전략 아이템 관리</Link>
              <p className="text-[11px] text-muted-foreground">활성 아이템을 3개 이상 등록해 주세요. 효과는 운영진이 경기 규칙에 직접 적용합니다.</p>
            </div> : null}
          </fieldset>
          </div>
            </TabsContent>
            <TabsContent value="display">
              <BalanceDisplaySettings settings={draft} onChange={setDraft} locked={locked} premium={planPremium} regularRoom={regularRoom} />
            </TabsContent>
            <TabsContent value="bans">
              <BalanceBanSettings gameSlug={gameSlug} map={map} hero={hero} onMapChange={setMap} onHeroChange={setHero}
                settings={banDraft} onChange={setBanDraft} formation={draft} onFormationChange={setDraft}
                locked={locked} premium={planPremium} regularRoom={regularRoom} />
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
