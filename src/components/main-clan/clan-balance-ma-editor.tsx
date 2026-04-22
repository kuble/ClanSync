"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateBalanceMaSnapshotAction } from "@/app/actions/clan-balance-session";
import { Button } from "@/components/ui/button";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
import {
  MA_SCORE_MAX,
  MA_SCORE_MIN,
  type MaSnapshot,
} from "@/lib/balance/ma-snapshot";

type PoolRow = { user_id: string; nickname: string };

function rosterSlots(
  r: BalanceRoster,
): { label: string; userId: string | null }[] {
  return [
    { label: "블루 · 탱커", userId: r.team1.tank },
    { label: "블루 · 딜러 1", userId: r.team1.dmg[0] },
    { label: "블루 · 딜러 2", userId: r.team1.dmg[1] },
    { label: "블루 · 힐러 1", userId: r.team1.sup[0] },
    { label: "블루 · 힐러 2", userId: r.team1.sup[1] },
    { label: "레드 · 탱커", userId: r.team2.tank },
    { label: "레드 · 딜러 1", userId: r.team2.dmg[0] },
    { label: "레드 · 딜러 2", userId: r.team2.dmg[1] },
    { label: "레드 · 힐러 1", userId: r.team2.sup[0] },
    { label: "레드 · 힐러 2", userId: r.team2.sup[1] },
  ];
}

export function ClanBalanceMaEditor({
  gameSlug,
  clanId,
  sessionId,
  roster,
  initialSnapshot,
  pool,
  canEdit,
  planPremium,
  syncKey,
}: {
  gameSlug: string;
  clanId: string;
  sessionId: string;
  roster: BalanceRoster;
  initialSnapshot: MaSnapshot;
  pool: PoolRow[];
  canEdit: boolean;
  planPremium: boolean;
  syncKey: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [snap, setSnap] = useState<MaSnapshot>(initialSnapshot);

  useEffect(() => {
    setSnap(initialSnapshot);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- initialSnapshot 참조는 렌더마다 바뀜; 서버와 맞출 때는 syncKey만 사용
  }, [syncKey]);

  const nick = Object.fromEntries(
    pool.map((p) => [p.user_id, p.nickname] as const),
  );
  const slots = rosterSlots(roster);

  function setEntry(
    userId: string,
    patch: Partial<{ m: number; a: number | null }>,
  ) {
    setSnap((prev) => {
      const cur = prev[userId] ?? { m: 0, a: null };
      return {
        ...prev,
        [userId]: {
          m: patch.m !== undefined ? patch.m : cur.m,
          a: patch.a !== undefined ? patch.a : cur.a,
        },
      };
    });
  }

  function save() {
    start(async () => {
      const r = await updateBalanceMaSnapshotAction(
        gameSlug,
        clanId,
        sessionId,
        JSON.stringify(snap),
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("M/A 스냅샷을 저장했습니다.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        M은 수동 점수(운영진, D-PERM-01 <code className="text-[0.7rem]">edit_mscore</code>
        ). A는 Premium 클랜에서만 편집·표시(09-BalanceMaker).
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="bg-muted/40 border-b text-left">
              <th className="px-3 py-2 font-medium">슬롯</th>
              <th className="px-3 py-2 font-medium">닉네임</th>
              <th className="px-3 py-2 font-medium tabular-nums">M</th>
              {planPremium ? (
                <th className="px-3 py-2 font-medium tabular-nums">A</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.label} className="border-b last:border-0">
                <td className="text-muted-foreground px-3 py-2">{s.label}</td>
                <td className="px-3 py-2 font-medium">
                  {s.userId ? nick[s.userId] ?? "—" : "—"}
                </td>
                <td className="px-3 py-2">
                  {s.userId ? (
                    canEdit ? (
                      <input
                        type="number"
                        min={MA_SCORE_MIN}
                        max={MA_SCORE_MAX}
                        step={1}
                        disabled={pending}
                        className="border-input bg-background w-20 rounded-md border px-2 py-1 tabular-nums"
                        value={snap[s.userId]?.m ?? 0}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isFinite(n)) return;
                          setEntry(s.userId!, { m: n });
                        }}
                      />
                    ) : (
                      <span className="tabular-nums">
                        {snap[s.userId]?.m ?? 0}
                      </span>
                    )
                  ) : (
                    "—"
                  )}
                </td>
                {planPremium ? (
                  <td className="px-3 py-2">
                    {s.userId ? (
                      canEdit ? (
                        <input
                          type="number"
                          min={MA_SCORE_MIN}
                          max={MA_SCORE_MAX}
                          step={1}
                          disabled={pending}
                          className="border-input bg-background w-20 rounded-md border px-2 py-1 tabular-nums"
                          value={
                            snap[s.userId]?.a === null ||
                            snap[s.userId]?.a === undefined
                              ? ""
                              : String(snap[s.userId]!.a)
                          }
                          placeholder="—"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") {
                              setEntry(s.userId!, { a: null });
                              return;
                            }
                            const n = Number(v);
                            if (!Number.isFinite(n)) return;
                            setEntry(s.userId!, { a: n });
                          }}
                        />
                      ) : (
                        <span className="tabular-nums">
                          {snap[s.userId]?.a === null ||
                          snap[s.userId]?.a === undefined
                            ? "—"
                            : snap[s.userId]!.a}
                        </span>
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit ? (
        <Button type="button" disabled={pending} onClick={save}>
          M/A 저장
        </Button>
      ) : (
        <p className="text-muted-foreground text-xs">
          점수 편집은 M점수 편집 권한이 있는 운영진만 할 수 있습니다.
        </p>
      )}
    </div>
  );
}
