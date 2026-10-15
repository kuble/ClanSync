import "server-only";
import { getRequestClanAccess } from "./request-clan-access";
import { getRequestUser } from "@/lib/supabase/request";
import { createServiceRoleClient } from "@/lib/supabase/service";

export type SerializedClanPollOption = {
  id: string;
  label: string;
  sort_order: number;
  vote_count: number;
  voters: string[];
};

export type SerializedClanPoll = {
  id: string;
  title: string;
  anonymous: boolean;
  multiple_choice: boolean;
  starts_at: string;
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
  const [user, access] = await Promise.all([getRequestUser(), getRequestClanAccess(clanId)]);
  if (!user || user.id !== viewerUserId || access.membership?.status !== "active") return [];
  const svc = createServiceRoleClient();
  const { data: polls, error: pErr } = await svc
    .from("clan_polls")
    .select(
      "id, title, anonymous, multiple_choice, starts_at, deadline_at, closed_at, created_at",
    )
    .eq("clan_id", clanId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (pErr) throw new Error("투표 목록을 불러오지 못했습니다.");
  if (!polls?.length) return [];

  const pollIds = polls.map((p) => p.id as string);

  const [{ data: options, error: optionError }, voteRows] = await Promise.all([
    svc
      .from("poll_options")
      .select("id, poll_id, label, sort_order")
      .in("poll_id", pollIds)
      .order("sort_order", { ascending: true }),
    (async () => {
      const rows: { poll_id: string; option_id: string; user_id: string }[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await svc.from("poll_votes").select("poll_id,option_id,user_id").in("poll_id", pollIds).order("poll_id").order("option_id").order("user_id").range(offset, offset + 999);
        if (error) throw new Error("투표 결과를 불러오지 못했습니다.");
        rows.push(...data);
        if (data.length < 1000) return rows;
      }
    })(),
  ]);

  if (optionError) throw new Error("투표 선택지를 불러오지 못했습니다.");
  const publicPollIds = new Set(polls.filter((poll) => !poll.anonymous).map((poll) => poll.id));
  const publicUserIds = [...new Set(voteRows.filter((row) => publicPollIds.has(row.poll_id)).map((row) => row.user_id))];
  const names = new Map<string, string>();
  for (let offset = 0; offset < publicUserIds.length; offset += 500) {
    const { data, error } = await svc.from("users").select("id,nickname").in("id", publicUserIds.slice(offset, offset + 500));
    if (error) throw new Error("투표 참여자를 불러오지 못했습니다.");
    for (const user of data ?? []) names.set(user.id, user.nickname);
  }
  const votersByOption = new Map<string, string[]>();
  const countByOption = new Map<string, number>();
  const myByPoll = new Map<string, Set<string>>();

  for (const row of voteRows ?? []) {
    const oid = row.option_id as string;
    // Anonymous identities are never included in serialized client props.
    if (publicPollIds.has(row.poll_id)) {
      const voters = votersByOption.get(oid) ?? [];
      voters.push(names.get(row.user_id) ?? "탈퇴한 멤버");
      votersByOption.set(oid, voters);
    }
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
      starts_at: p.starts_at,
      deadline_at: p.deadline_at as string,
      closed_at: (p.closed_at as string | null) ?? null,
      created_at: p.created_at as string,
      options: opts.map((o) => ({
        id: o.id as string,
        label: o.label as string,
        sort_order: o.sort_order as number,
        vote_count: countByOption.get(o.id as string) ?? 0,
        voters: p.anonymous ? [] : votersByOption.get(o.id) ?? [],
      })),
      my_option_ids: [...(myByPoll.get(pid) ?? [])],
    };
  });
}
