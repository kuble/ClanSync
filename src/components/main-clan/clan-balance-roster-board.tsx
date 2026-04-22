import type { BalanceRoster } from "@/lib/balance/roster-schema";

function label(
  id: string | null,
  nickById: Record<string, string>,
): string {
  if (!id) return "—";
  return nickById[id] ?? "알 수 없음";
}

function TeamCol({
  title,
  team,
  nickById,
}: {
  title: string;
  team: BalanceRoster["team1"];
  nickById: Record<string, string>;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-muted-foreground mb-2 text-xs font-medium">{title}</p>
      <ul className="space-y-1.5 text-sm">
        <li>
          <span className="text-muted-foreground">탱커</span>{" "}
          <span className="font-medium">
            {label(team.tank, nickById)}
          </span>
        </li>
        <li>
          <span className="text-muted-foreground">딜러</span>{" "}
          <span className="font-medium">
            {label(team.dmg[0], nickById)} · {label(team.dmg[1], nickById)}
          </span>
        </li>
        <li>
          <span className="text-muted-foreground">힐러</span>{" "}
          <span className="font-medium">
            {label(team.sup[0], nickById)} · {label(team.sup[1], nickById)}
          </span>
        </li>
      </ul>
    </div>
  );
}

export function ClanBalanceRosterBoard({
  roster,
  pool,
}: {
  roster: BalanceRoster;
  pool: readonly { user_id: string; nickname: string }[];
}) {
  const nickById = Object.fromEntries(
    pool.map((p) => [p.user_id, p.nickname] as const),
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TeamCol title="블루(팀 1)" team={roster.team1} nickById={nickById} />
      <TeamCol title="레드(팀 2)" team={roster.team2} nickById={nickById} />
    </div>
  );
}
