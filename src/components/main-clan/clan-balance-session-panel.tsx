"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  closeBalanceSessionAction,
  openBalanceSessionAction,
  skipHeroBanPhaseAction,
  skipMapBanToMatchLiveAction,
  startMapBanPhaseAction,
  type BalanceSessionActionResult,
} from "@/app/actions/clan-balance-session";
import { ClanBalanceMapBanClient } from "@/components/main-clan/clan-balance-map-ban-client";
import { Button } from "@/components/ui/button";
import { tallyMapVotes } from "@/lib/balance/weighted-map-pick";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type BalanceSession = Database["public"]["Tables"]["balance_sessions"]["Row"];
type MapVote = Database["public"]["Tables"]["balance_session_map_votes"]["Row"];

const PHASE_LABEL: Record<
  Database["public"]["Enums"]["balance_session_phase"],
  string
> = {
  editing: "① 편집 중",
  map_ban: "② 맵 밴픽",
  hero_ban: "③ 영웅 밴(준비 중)",
  match_live: "④ 경기 진행",
};

export function ClanBalanceSessionPanel({
  gameSlug,
  clanId,
  userId,
  canManage,
  hostNickname,
  session,
  votes,
}: {
  gameSlug: string;
  clanId: string;
  userId: string;
  canManage: boolean;
  hostNickname: string | null;
  session: BalanceSession | null;
  votes: MapVote[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const storeHref = `/games/${gameSlug}/clan/${clanId}/store`;

  function onOpenSession(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await openBalanceSessionAction(gameSlug, clanId, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("밸런스 세션이 열렸습니다.");
      router.refresh();
    });
  }

  function runAction(
    label: string,
    fn: () => Promise<BalanceSessionActionResult>,
  ) {
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(label);
      router.refresh();
    });
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <section className="rounded-lg border border-dashed p-6">
          <p className="text-muted-foreground text-sm">
            진행 중인 밸런스 세션이 없습니다. 운영진이 세션을 열면 맵 밴·경기
            단계로 이어집니다.
          </p>
          {canManage ? (
            <form className="mt-4 space-y-4" onSubmit={onOpenSession}>
              <fieldset className="space-y-2 text-sm">
                <legend className="text-foreground mb-2 font-medium">
                  새 세션 옵션
                </legend>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    name="mapBan"
                    defaultChecked
                    className="size-4 rounded border-input"
                  />
                  맵 밴 사용 (3후보 투표 → 가중 확정)
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    name="heroBan"
                    className="size-4 rounded border-input"
                  />
                  영웅 밴 포함 (맵 확정 후 준비 중 단계로 이동)
                </label>
              </fieldset>
              <Button type="submit" disabled={pending}>
                세션 열기
              </Button>
            </form>
          ) : (
            <p className="text-muted-foreground mt-3 text-xs">
              세션을 열려면 클랜 운영진 권한이 필요합니다.
            </p>
          )}
        </section>
        <p className="text-muted-foreground text-sm">
          코인 내역은{" "}
          <Link
            href={storeHref}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            스토어
          </Link>
          에서 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  const tallies = tallyMapVotes(votes);
  const myVote = votes.find((v) => v.user_id === userId);
  const candidates = session.map_candidates;
  const triple =
    candidates && candidates.length === 3
      ? ([candidates[0]!, candidates[1]!, candidates[2]!] as [
          string,
          string,
          string,
        ])
      : null;

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
        )}
      >
        <span className="font-medium">{PHASE_LABEL[session.phase]}</span>
        <span className="text-muted-foreground text-xs">
          호스트{hostNickname ? `: ${hostNickname}` : ""}
        </span>
      </div>

      {session.phase === "editing" ? (
        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-medium tracking-tight">① 편집 중</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            팀 배치 편집 UI는 후속 작업입니다. 여기서는 맵 밴·경기 단계만
            진행합니다.
          </p>
          {canManage ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {session.map_ban_enabled ? (
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    runAction("맵 밴을 시작했습니다.", () =>
                      startMapBanPhaseAction(gameSlug, clanId, session.id),
                    )
                  }
                >
                  맵 밴 시작 (후보 3곳)
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    runAction("경기 화면으로 이동했습니다.", () =>
                      skipMapBanToMatchLiveAction(gameSlug, clanId, session.id),
                    )
                  }
                >
                  맵 밴 없이 경기 화면으로
                </Button>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground mt-3 text-xs">
              다음 단계 진행은 운영진만 할 수 있습니다.
            </p>
          )}
        </section>
      ) : null}

      {session.phase === "map_ban" && triple && session.map_ban_deadline_at ? (
        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-medium tracking-tight">② 맵 밴픽</h3>
          <div className="mt-3">
            <ClanBalanceMapBanClient
              gameSlug={gameSlug}
              clanId={clanId}
              sessionId={session.id}
              candidates={triple}
              deadlineIso={session.map_ban_deadline_at}
              myChoiceIdx={myVote?.choice_idx ?? null}
              tallies={tallies}
              canResolve={canManage}
            />
          </div>
        </section>
      ) : null}

      {session.phase === "hero_ban" ? (
        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-medium tracking-tight">영웅 밴</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            영웅 밴 투표 UI는 곧 연결됩니다. 지금은 운영진이 건너뛰고 경기 화면으로
            이동할 수 있습니다.
          </p>
          {canManage ? (
            <Button
              type="button"
              className="mt-4"
              disabled={pending}
              onClick={() =>
                runAction("경기 화면으로 이동했습니다.", () =>
                  skipHeroBanPhaseAction(gameSlug, clanId, session.id),
                )
              }
            >
              영웅 밴 건너뛰기
            </Button>
          ) : null}
        </section>
      ) : null}

      {session.phase === "match_live" ? (
        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-medium tracking-tight">경기 진행</h3>
          <p className="mt-2 text-sm">
            {session.resolved_map_label ? (
              <>
                확정 맵:{" "}
                <strong className="font-semibold">
                  {session.resolved_map_label}
                </strong>
              </>
            ) : (
              <span className="text-muted-foreground">
                맵 밴 없이 진입했습니다. 라인업·결과 입력은 후속(M6c)입니다.
              </span>
            )}
          </p>
          {canManage ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              disabled={pending}
              onClick={() =>
                runAction("세션을 종료했습니다.", () =>
                  closeBalanceSessionAction(gameSlug, clanId, session.id),
                )
              }
            >
              세션 종료
            </Button>
          ) : null}
        </section>
      ) : null}

      <p className="text-muted-foreground text-sm">
        코인:{" "}
        <Link
          href={storeHref}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          스토어
        </Link>
      </p>
    </div>
  );
}
