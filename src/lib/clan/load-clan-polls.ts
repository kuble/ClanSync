import { createServiceRoleClient } from "@/lib/supabase/service";

export type SerializedClanPollOption = {
  id: string;
  label: string;
  sort_order: number;
  vote_count: number;
};

export type SerializedClanPoll = {
  id: string;
  title: string;
  anonymous: boolean;
  multiple_choice: boolean;
  deadline_at: string;
  closed_at: string | null;
  created_at: string;
  options: SerializedClanPollOption[];
  my_option_ids: string[];
};

/**
 * 클랜 이벤트 페이지용 투표 목록 + 선택지별 득표수 + 내 선택
 */
export async function loadSerializedClanPolls(
  clanId: string,
  viewerUserId: string | null,
): Promise<SerializedClanPoll[]> {
  const svc = createServiceRoleClient();
  const { data: polls, error: pErr } = await svc
    .from("clan_polls")
    .select(
      "id, title, anonymous, multiple_choice, deadline_at, closed_at, created_at",
    )
    .eq("clan_id", clanId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (pErr || !polls?.length) return [];

  const pollIds = polls.map((p) => p.id as string);

  const { data: options } = await svc
    .from("poll_options")
    .select("id, poll_id, label, sort_order")
    .in("poll_id", pollIds)
    .order("sort_order", { ascending: true });

  const { data: voteRows } = await svc
    .from("poll_votes")
    .select("poll_id, option_id, user_id")
    .in("poll_id", pollIds);

  const countByOption = new Map<string, number>();
  const myByPoll = new Map<string, Set<string>>();

  for (const row of voteRows ?? []) {
    const oid = row.option_id as string;
    countByOption.set(oid, (countByOption.get(oid) ?? 0) + 1);
    if (viewerUserId && row.user_id === viewerUserId) {
      const pid = row.poll_id as string;
      if (!myByPoll.has(pid)) myByPoll.set(pid, new Set());
      myByPoll.get(pid)!.add(oid);
    }
  }

  const optionsByPoll = new Map<string, typeof options>();
  for (const o of options ?? []) {
    const pid = o.poll_id as string;
    const list = optionsByPoll.get(pid) ?? [];
    list.push(o);
    optionsByPoll.set(pid, list);
  }

  return polls.map((p) => {
    const pid = p.id as string;
    const opts = optionsByPoll.get(pid) ?? [];
    return {
      id: pid,
      title: p.title as string,
      anonymous: Boolean(p.anonymous),
      multiple_choice: Boolean(p.multiple_choice),
      deadline_at: p.deadline_at as string,
      closed_at: (p.closed_at as string | null) ?? null,
      created_at: p.created_at as string,
      options: opts.map((o) => ({
        id: o.id as string,
        label: o.label as string,
        sort_order: o.sort_order as number,
        vote_count: countByOption.get(o.id as string) ?? 0,
      })),
      my_option_ids: [...(myByPoll.get(pid) ?? [])],
    };
  });
}
