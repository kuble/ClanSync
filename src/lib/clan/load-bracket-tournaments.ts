import { createServiceRoleClient } from "@/lib/supabase/service";

export type SerializedBracketTournament = {
  id: string;
  title: string;
  format: "single_elim" | "double_elim" | "round_robin";
  team_count: number;
  status: "draft" | "in_progress" | "finished" | "cancelled";
  snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export async function loadSerializedBracketTournaments(
  clanId: string,
): Promise<SerializedBracketTournament[]> {
  const svc = createServiceRoleClient();
  const { data: rows, error } = await svc
    .from("bracket_tournaments")
    .select(
      "id, title, format, team_count, status, snapshot, created_at, updated_at",
    )
    .eq("host_clan_id", clanId)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error || !rows?.length) return [];

  return rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    format: r.format as SerializedBracketTournament["format"],
    team_count: r.team_count as number,
    status: r.status as SerializedBracketTournament["status"],
    snapshot:
      typeof r.snapshot === "object" &&
      r.snapshot !== null &&
      !Array.isArray(r.snapshot)
        ? (r.snapshot as Record<string, unknown>)
        : {},
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
}
