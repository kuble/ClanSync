"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateBalanceRosterAction } from "@/app/actions/clan-balance-session";
import { Button } from "@/components/ui/button";
import {
  type BalanceRoster,
  type TeamRoster,
  rosterAssignedUserIds,
} from "@/lib/balance/roster-schema";

type PoolRow = { user_id: string; nickname: string };

function SelectMember({
  value,
  onChange,
  options,
  disabled,
  id,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  options: PoolRow[];
  disabled?: boolean;
  id: string;
}) {
  return (
    <select
      id={id}
      disabled={disabled}
      className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-sm"
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? null : v);
      }}
    >
      <option value="">비움</option>
      {options.map((p) => (
        <option key={p.user_id} value={p.user_id}>
          {p.nickname}
        </option>
      ))}
    </select>
  );
}

function optionsExcluding(
  pool: PoolRow[],
  roster: BalanceRoster,
  current: string | null,
): PoolRow[] {
  const used = new Set(rosterAssignedUserIds(roster));
  if (current) used.delete(current);
  return pool.filter((p) => !used.has(p.user_id));
}

function TeamEditor({
  title,
  team,
  setTeam,
  pool,
  roster,
  disabled,
  prefix,
}: {
  title: string;
  team: TeamRoster;
  setTeam: (t: TeamRoster) => void;
  pool: PoolRow[];
  roster: BalanceRoster;
  disabled: boolean;
  prefix: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-muted-foreground mb-3 text-xs font-medium">{title}</p>
      <div className="space-y-2">
        <label className="block text-xs">
          <span className="text-muted-foreground">탱커</span>
          <SelectMember
            id={`${prefix}-tank`}
            disabled={disabled}
            value={team.tank}
            onChange={(v) => setTeam({ ...team, tank: v })}
            options={optionsExcluding(pool, roster, team.tank)}
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">딜러 1</span>
          <SelectMember
            id={`${prefix}-d0`}
            disabled={disabled}
            value={team.dmg[0]}
            onChange={(v) =>
              setTeam({ ...team, dmg: [v, team.dmg[1]] })
            }
            options={optionsExcluding(pool, roster, team.dmg[0])}
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">딜러 2</span>
          <SelectMember
            id={`${prefix}-d1`}
            disabled={disabled}
            value={team.dmg[1]}
            onChange={(v) =>
              setTeam({ ...team, dmg: [team.dmg[0], v] })
            }
            options={optionsExcluding(pool, roster, team.dmg[1])}
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">힐러 1</span>
          <SelectMember
            id={`${prefix}-s0`}
            disabled={disabled}
            onChange={(v) =>
              setTeam({ ...team, sup: [v, team.sup[1]] })
            }
            value={team.sup[0]}
            options={optionsExcluding(pool, roster, team.sup[0])}
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">힐러 2</span>
          <SelectMember
            id={`${prefix}-s1`}
            disabled={disabled}
            value={team.sup[1]}
            onChange={(v) =>
              setTeam({ ...team, sup: [team.sup[0], v] })
            }
            options={optionsExcluding(pool, roster, team.sup[1])}
          />
        </label>
      </div>
    </div>
  );
}

export function ClanBalanceRosterEditor({
  gameSlug,
  clanId,
  sessionId,
  initialRoster,
  pool,
  canEdit,
}: {
  gameSlug: string;
  clanId: string;
  sessionId: string;
  initialRoster: BalanceRoster;
  pool: PoolRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [roster, setRoster] = useState<BalanceRoster>(initialRoster);

  const filled = useMemo(() => rosterAssignedUserIds(roster).length, [roster]);

  function save() {
    start(async () => {
      const r = await updateBalanceRosterAction(
        gameSlug,
        clanId,
        sessionId,
        JSON.stringify(roster),
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("배치를 저장했습니다.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        출전 슬롯 채움:{" "}
        <span className="text-foreground font-medium tabular-nums">
          {filled}/10
        </span>
        {filled < 10 ? " · 10명 채우는 것을 권장합니다." : null}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <TeamEditor
          title="블루(팀 1)"
          prefix="t1"
          disabled={!canEdit || pending}
          team={roster.team1}
          setTeam={(t1) => setRoster((r) => ({ ...r, team1: t1 }))}
          pool={pool}
          roster={roster}
        />
        <TeamEditor
          title="레드(팀 2)"
          prefix="t2"
          disabled={!canEdit || pending}
          team={roster.team2}
          setTeam={(t2) => setRoster((r) => ({ ...r, team2: t2 }))}
          pool={pool}
          roster={roster}
        />
      </div>
      {canEdit ? (
        <Button type="button" disabled={pending} onClick={save}>
          배치 저장
        </Button>
      ) : null}
    </div>
  );
}
