"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gavel, Shuffle, Crown, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateFormationAction } from "@/app/actions/clan-balance-formation";
import {
  ROLE_LABEL,
  TEAM_LABEL,
  canFit,
  draftTurn,
  maxBid,
  rosterPlayers,
  type Role,
  type Team,
  type TeamMode,
  type FormationState,
  type FormationCommand,
} from "@/lib/balance/formation";
import type { BalanceRoster } from "@/lib/balance/roster-schema";

const rankings: Role[][] = [
  ["tank", "dmg", "sup"],
  ["tank", "sup", "dmg"],
  ["dmg", "tank", "sup"],
  ["dmg", "sup", "tank"],
  ["sup", "tank", "dmg"],
  ["sup", "dmg", "tank"],
];
const modes = [
  { value: "keep", label: "현재 팀 유지", text: "대기방 배치를 그대로 사용" },
  {
    value: "random",
    label: "역할별 추첨",
    text: "역할 정원을 맞춰 양 팀에 배정",
  },
  {
    value: "draft",
    label: "주장 지명",
    text: "같은 역할의 두 주장이 8명 선발",
  },
  { value: "auction", label: "팀원 경매", text: "각 팀 1,000P로 팀원 선발" },
] as const;
const inputClass =
  "min-h-10 w-full rounded-lg border bg-background px-3 text-xs";

export function ClanBalanceFormation({
  gameSlug,
  clanId,
  roundId,
  revision,
  state,
  roster,
  pool,
  userId,
  canManage,
  dirty,
  readOnly = false,
}: {
  gameSlug: string;
  clanId: string;
  roundId: string;
  revision: number;
  state: FormationState | null;
  roster: BalanceRoster;
  pool: readonly { user_id: string; nickname: string }[];
  userId: string;
  canManage: boolean;
  dirty: boolean;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [roleMode, setRoleMode] = useState<"manual" | "lottery">("manual");
  const [teamMode, setTeamMode] = useState<TeamMode>("keep");
  const [preferences, setPreferences] = useState<Record<string, Role[]>>({});
  const [captains, setCaptains] = useState<[string, string]>(["", ""]);
  const [bidInput, setBidInput] = useState(10);
  const [now, setNow] = useState(0);
  const [replay, setReplay] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const names = new Map(pool.map((p) => [p.user_id, p.nickname]));
  const name = (id: string) => names.get(id) ?? "탈퇴한 멤버";
  const players = rosterPlayers(roster);
  const manager = canManage && !readOnly;
  const canTeam = (team: Team) =>
    !readOnly &&
    (manager || state?.captains?.[team === "team1" ? 0 : 1] === userId);
  function run(command: FormationCommand) {
    start(async () => {
      const result = await updateFormationAction(
        gameSlug,
        clanId,
        roundId,
        revision,
        command,
      );
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }
  const turn = state?.stage === "draft" ? draftTurn(state) : null;
  const lot = state?.auction;
  const seconds = lot
    ? Math.max(
        0,
        Math.ceil(
          (lot.deadline - (state?.pausedAt ?? (now || lot.startedAt))) / 1000,
        ),
      )
    : 0;
  return (
    <section
      className="mt-6 rounded-2xl border bg-muted/15 p-4 sm:p-5"
      data-testid="balance-formation"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-bold">
          <Shuffle className="size-4 text-primary" aria-hidden="true" />팀 편성
        </h4>
        {state && manager ? (
          <div className="flex gap-1">
            {state.stage !== "complete" ? (
              <Button
                size="icon"
                variant="ghost"
                disabled={pending}
                title={state.pausedAt !== null ? "편성 재개" : "편성 일시정지"}
                aria-label={
                  state.pausedAt !== null ? "편성 재개" : "편성 일시정지"
                }
                onClick={() =>
                  run({ type: state.pausedAt !== null ? "resume" : "pause" })
                }
              >
                {state.pausedAt !== null ? (
                  <Play className="size-4" />
                ) : (
                  <Pause className="size-4" />
                )}
              </Button>
            ) : null}
            <Button
              size="icon"
              variant="ghost"
              disabled={pending}
              title="편성 초기화"
              aria-label="편성 초기화"
              onClick={() => run({ type: "reset" })}
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
      {!state ? (
        manager ? (
          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-semibold">
                1. 역할 배정
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  {
                    value: "manual",
                    label: "직접 배정",
                    text: "손든 순서대로 대기방에서 배치",
                  },
                  {
                    value: "lottery",
                    label: "공통 추첨순서",
                    text: "무작위 순서로 남은 역할 중 우선순위 적용",
                  },
                ].map((m) => (
                  <label
                    key={m.value}
                    className={`cursor-pointer rounded-xl border p-3 ${roleMode === m.value ? "border-primary bg-primary/5" : "bg-card"}`}
                  >
                    <input
                      type="radio"
                      name={`roles-${roundId}`}
                      checked={roleMode === m.value}
                      onChange={() => {
                        setRoleMode(m.value as "manual" | "lottery");
                        setCaptains(["", ""]);
                        if (m.value === "lottery" && teamMode === "keep")
                          setTeamMode("random");
                      }}
                      className="mr-2 accent-primary"
                    />
                    <strong className="text-xs">{m.label}</strong>
                    <span className="mt-2 block text-[11px] text-muted-foreground">
                      {m.text}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {roleMode === "lottery" ? (
              <details open className="rounded-xl border bg-card p-3">
                <summary className="cursor-pointer text-xs font-semibold">
                  이번 라운드 역할 우선순위
                </summary>
                <p className="my-3 text-[11px] text-muted-foreground">
                  운영진이 입력합니다. 기본값은 현재 자리의 역할이며, 저장된
                  프로필 선호도는 아닙니다.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {players.map((p) => (
                    <label
                      key={p.id}
                      className="flex min-w-0 items-center gap-2 text-xs"
                    >
                      <span className="w-24 shrink-0 truncate">
                        {name(p.id)}
                      </span>
                      <select
                        aria-label={`${name(p.id)} 역할 우선순위`}
                        className={inputClass}
                        value={(
                          preferences[p.id] ??
                          rankings.find((r) => r[0] === p.role)!
                        ).join(",")}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            [p.id]: e.target.value.split(",") as Role[],
                          })
                        }
                      >
                        {rankings.map((r) => (
                          <option key={r.join()} value={r.join()}>
                            {r.map((x) => ROLE_LABEL[x]).join(" → ")}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </details>
            ) : null}
            <fieldset>
              <legend className="mb-2 text-xs font-semibold">
                2. 팀원 선발
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {modes
                  .filter((m) => roleMode === "manual" || m.value !== "keep")
                  .map((m) => (
                    <label
                      key={m.value}
                      className={`cursor-pointer rounded-xl border p-3 ${teamMode === m.value ? "border-primary bg-primary/5" : "bg-card"}`}
                    >
                      <input
                        type="radio"
                        name={`teams-${roundId}`}
                        className="mr-2 accent-primary"
                        checked={teamMode === m.value}
                        onChange={() => setTeamMode(m.value)}
                      />
                      <strong className="text-xs">{m.label}</strong>
                      <span className="mt-2 block text-[11px] text-muted-foreground">
                        {m.text}
                      </span>
                    </label>
                  ))}
              </div>
            </fieldset>
            {teamMode === "draft" || teamMode === "auction" ? (
              <div className="rounded-xl border bg-card p-3">
                <p className="mb-3 text-xs font-semibold">
                  주장 · 기본 탱커 2명
                </p>
                {roleMode === "manual" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([0, 1] as const).map((i) => (
                      <select
                        key={i}
                        aria-label={`${i + 1}팀 주장`}
                        className={inputClass}
                        value={captains[i]}
                        onChange={(e) =>
                          setCaptains(
                            i === 0
                              ? [
                                  e.target.value,
                                  players.find(
                                    (p) =>
                                      p.id !== e.target.value &&
                                      p.role ===
                                        players.find(
                                          (p) => p.id === e.target.value,
                                        )?.role,
                                  )?.id ?? "",
                                ]
                              : [captains[0], e.target.value],
                          )
                        }
                      >
                        <option value="">{i + 1}팀 탱커 (기본)</option>
                        {players
                          .filter(
                            (p) =>
                              i === 0 ||
                              !captains[0] ||
                              (p.id !== captains[0] &&
                                p.role ===
                                  players.find((p) => p.id === captains[0])
                                    ?.role),
                          )
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {name(p.id)} · {ROLE_LABEL[p.role]}
                            </option>
                          ))}
                      </select>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    역할 추첨으로 정해진 탱커 2명이 각 팀 주장을 맡습니다.
                  </p>
                )}
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {teamMode === "draft"
                    ? "선공 추첨 후 A → B → B → A → A → B → B → A 순서로 지명합니다."
                    : "최소 10P · 입찰 20초 · 마지막 5초 입찰 시 연장(최대 50초). 무입찰은 1회 재경매 후 가능한 팀에 최소가로 추첨 배정합니다."}
                </p>
              </div>
            ) : null}
            <Button
              className="w-full"
              disabled={pending || dirty || players.length !== 10}
              onClick={() =>
                run({
                  type: "start",
                  setup: {
                    roles: roleMode,
                    teams:
                      roleMode === "lottery" && teamMode === "keep"
                        ? "random"
                        : teamMode,
                    preferences: Object.fromEntries(
                      players.map((p) => [
                        p.id,
                        preferences[p.id] ??
                          rankings.find((r) => r[0] === p.role)!,
                      ]),
                    ),
                    ...(roleMode === "manual" && (captains[0] || captains[1])
                      ? {
                          captains: [
                            captains[0] || roster.team1.tank!,
                            captains[1] || roster.team2.tank!,
                          ] as [string, string],
                        }
                      : {}),
                  },
                })
              }
            >
              {pending ? "편성 중…" : "편성 시작"}
            </Button>
            {dirty || players.length !== 10 ? (
              <p className="text-xs text-muted-foreground">
                출전자 10명을 저장한 뒤 편성할 수 있습니다.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            운영진이 출전 명단과 편성 방식을 준비 중입니다.
          </p>
        )
      ) : (
        <div className="space-y-4">
          {state.log.at(-1)?.player || state.stage === "complete" ? (
            <div
              key={`${revision}:${replay}`}
              className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-500"
            >
              <p className="text-xs text-muted-foreground">
                {state.log.at(-1)?.text}
              </p>
              <strong className="mt-2 block text-xl">
                {state.stage === "complete"
                  ? "팀 편성 완료"
                  : name(state.log.at(-1)!.player!)}
              </strong>
              <p className="mt-1 text-xs">
                {state.log.at(-1)?.team
                  ? TEAM_LABEL[state.log.at(-1)!.team!]
                  : ""}{" "}
                {state.log.at(-1)?.amount ? `${state.log.at(-1)!.amount}P` : ""}
              </p>
            </div>
          ) : null}
          {state.stage === "complete" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplay((value) => value + 1)}
            >
              결과 다시 보기
            </Button>
          ) : null}
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
            aria-live="polite"
          >
            <strong className="flex items-center gap-2 text-sm">
              {state.stage === "auction" ? (
                <Gavel className="size-4" />
              ) : (
                <Crown className="size-4" />
              )}
              {state.pausedAt !== null
                ? "편성 일시정지"
                : state.stage === "complete"
                  ? "팀 편성 완료"
                  : turn
                    ? `${TEAM_LABEL[turn]} 지명 차례 · ${state.picks + 1}/8`
                    : "팀원 경매"}
            </strong>
            {state.captains ? (
              <span className="text-xs text-muted-foreground">
                {name(state.captains[0])} vs {name(state.captains[1])}
              </span>
            ) : null}
          </div>
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-xs">역할 배정 결과</summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {state.order.map((id, i) => (
                <span
                  key={id}
                  className="rounded-md bg-muted px-2 py-1 text-xs"
                >
                  {i + 1}. {name(id)} ·{" "}
                  {ROLE_LABEL[state.players.find((p) => p.id === id)!.role]}
                </span>
              ))}
            </div>
          </details>
          {turn ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {state.remaining.map((id) => (
                <Button
                  variant="outline"
                  className="h-auto justify-between px-3 py-3"
                  key={id}
                  disabled={
                    pending ||
                    state.pausedAt !== null ||
                    !canTeam(turn) ||
                    !canFit(state, turn, id)
                  }
                  onClick={() => run({ type: "pick", player: id })}
                >
                  <span>{name(id)}</span>
                  <span className="text-xs text-muted-foreground">
                    {ROLE_LABEL[state.players.find((p) => p.id === id)!.role]}
                  </span>
                </Button>
              ))}
            </div>
          ) : null}
          {state.mode === "auction" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {(["team1", "team2"] as const).map((t) => (
                <div
                  className={`rounded-xl border p-4 ${t === "team1" ? "border-blue-500/25 bg-blue-500/5" : "border-rose-500/25 bg-rose-500/5"}`}
                  key={t}
                >
                  <span className="text-xs">{TEAM_LABEL[t]} 남은 크레딧</span>
                  <strong className="mt-1 block text-2xl tabular-nums">
                    {state.budgets[t].toLocaleString()}
                    <small className="ml-1 text-xs">P</small>
                  </strong>
                </div>
              ))}
            </div>
          ) : null}
          {state.stage === "auction" ? (
            <div className="rounded-xl border bg-card p-5 text-center">
              {lot ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    {lot.retry ? "재경매" : "현재 경매 선수"} ·{" "}
                    {
                      ROLE_LABEL[
                        state.players.find((p) => p.id === lot.player)!.role
                      ]
                    }
                  </p>
                  <h5 className="my-3 text-2xl font-bold">
                    {name(lot.player)}
                  </h5>
                  <p className="mb-4 text-sm">
                    <strong className="text-primary">{lot.bid}P</strong> ·{" "}
                    {lot.team ? TEAM_LABEL[lot.team] : "입찰 대기"} ·{" "}
                    <span className="tabular-nums">{seconds}초</span>
                  </p>
                  {!readOnly &&
                  (manager || state.captains?.includes(userId)) ? (
                    <div className="mx-auto max-w-md space-y-2">
                      <input
                        type="number"
                        aria-label="입찰 크레딧"
                        min={lot.bid + 10}
                        step={10}
                        value={Math.max(bidInput, lot.bid + 10)}
                        onChange={(e) => setBidInput(Number(e.target.value))}
                        className={inputClass}
                      />
                      <div className="flex gap-2">
                        {(["team1", "team2"] as const)
                          .filter(canTeam)
                          .map((team) => (
                            <Button
                              key={team}
                              className="flex-1"
                              disabled={
                                pending ||
                                state.pausedAt !== null ||
                                seconds === 0 ||
                                !canFit(state, team, lot.player) ||
                                maxBid(state, team) <
                                  Math.max(bidInput, lot.bid + 10)
                              }
                              onClick={() =>
                                run({
                                  type: "bid",
                                  team,
                                  amount: Math.max(bidInput, lot.bid + 10),
                                })
                              }
                            >
                              {TEAM_LABEL[team]} 입찰
                            </Button>
                          ))}
                      </div>
                    </div>
                  ) : null}
                  {manager ? (
                    <Button
                      variant="outline"
                      className="mt-3"
                      disabled={
                        pending || seconds > 0 || state.pausedAt !== null
                      }
                      onClick={() => run({ type: "settle" })}
                    >
                      경매 마감
                    </Button>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">
                    남은 선수 {state.remaining.length}명
                  </p>
                  {manager ? (
                    <Button
                      disabled={pending || state.pausedAt !== null}
                      onClick={() => run({ type: "lot" })}
                    >
                      다음 선수 공개
                    </Button>
                  ) : (
                    <p className="text-xs">다음 선수를 기다리고 있습니다.</p>
                  )}
                </>
              )}
            </div>
          ) : null}
          <ol
            className="max-h-44 space-y-2 overflow-y-auto border-t pt-3 text-xs text-muted-foreground"
            aria-label="편성 진행 기록"
          >
            {state.log.map((entry, i) => (
              <li key={i}>
                {entry.team ? `${TEAM_LABEL[entry.team]} · ` : ""}
                {entry.player ? `${name(entry.player)} · ` : ""}
                {entry.text}
                {entry.amount ? ` ${entry.amount}P` : ""}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
