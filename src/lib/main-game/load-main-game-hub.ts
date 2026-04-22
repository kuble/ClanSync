import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type PromoSort = "newest" | "space";

export type PromoRow = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  clan_id: string;
  clan_name: string;
  max_members: number;
  active_members: number;
  space_remaining: number;
};

function normalizeClanRow(
  raw: unknown,
): { name: string; max_members: number } | null {
  const c = raw as
    | { name: string; max_members: number }
    | { name: string; max_members: number }[]
    | null;
  const one = Array.isArray(c) ? c[0] : c;
  if (!one) return null;
  return { name: one.name, max_members: one.max_members };
}

async function memberCountMap(
  supabase: SupabaseClient<Database>,
  clanIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!clanIds.length) return out;
  const { data, error } = await supabase.rpc("clan_active_member_counts", {
    p_clan_ids: clanIds,
  });
  if (error) return out;
  for (const row of data ?? []) {
    out.set(row.clan_id, Number(row.n));
  }
  return out;
}

export async function loadPromotionFeed(
  supabase: SupabaseClient<Database>,
  gameId: string,
  sort: PromoSort,
): Promise<PromoRow[]> {
  const { data: posts, error } = await supabase
    .from("board_posts")
    .select(
      "id, title, content, created_at, clan_id, clans ( id, name, max_members )",
    )
    .eq("game_id", gameId)
    .eq("post_type", "promotion")
    .order("created_at", { ascending: false })
    .limit(48);

  if (error || !posts?.length) return [];

  const clanIds = [...new Set(posts.map((p) => p.clan_id))];
  const counts = await memberCountMap(supabase, clanIds);

  const rows: PromoRow[] = posts.map((p) => {
    const c = normalizeClanRow(p.clans);
    const name = c?.name ?? "클랜";
    const max = c?.max_members ?? 200;
    const act = counts.get(p.clan_id) ?? 0;
    return {
      id: p.id,
      title: p.title,
      content: p.content,
      created_at: p.created_at,
      clan_id: p.clan_id,
      clan_name: name,
      max_members: max,
      active_members: act,
      space_remaining: Math.max(0, max - act),
    };
  });

  if (sort === "newest") return rows;
  return [...rows].sort((a, b) => b.space_remaining - a.space_remaining);
}

export type LfgRowOut = {
  id: string;
  mode: string;
  format: string;
  slots: number;
  description: string | null;
  expires_at: string;
  start_time_hour: number;
  mic_required: boolean;
  status: string;
  created_at: string;
  creator_user_id: string;
  creator_nickname: string;
  applied_count: number;
  my_status: string | null;
  my_application_id: string | null;
};

export type LfgApplicantRow = {
  id: string;
  post_id: string;
  message: string | null;
  applicant_nickname: string;
  created_at: string;
};

export async function loadOpenLfgPosts(
  supabase: SupabaseClient<Database>,
  gameId: string,
  userId: string | null,
): Promise<{ posts: LfgRowOut[]; applicantsByPost: Record<string, LfgApplicantRow[]> }> {
  const now = new Date().toISOString();
  const { data: posts, error } = await supabase
    .from("lfg_posts")
    .select(
      "id, mode, format, slots, description, expires_at, start_time_hour, mic_required, status, created_at, creator_user_id, users ( nickname )",
    )
    .eq("game_id", gameId)
    .eq("status", "open")
    .gt("expires_at", now)
    .order("expires_at", { ascending: true })
    .limit(40);

  if (error || !posts?.length) {
    return { posts: [], applicantsByPost: {} };
  }

  const postIds = posts.map((p) => p.id);

  const { data: apps } = await supabase
    .from("lfg_applications")
    .select("id, post_id, status, message, applicant_user_id, created_at")
    .in("post_id", postIds);

  const appliedCount = new Map<string, number>();
  const myStatus = new Map<string, string>();
  const myAppId = new Map<string, string>();
  for (const a of apps ?? []) {
    if (a.status === "applied") {
      appliedCount.set(a.post_id, (appliedCount.get(a.post_id) ?? 0) + 1);
    }
    if (userId && a.applicant_user_id === userId) {
      myStatus.set(a.post_id, a.status);
      if (a.status === "applied") {
        myAppId.set(a.post_id, a.id);
      }
    }
  }

  const creatorPostIds = posts
    .filter((p) => userId && p.creator_user_id === userId)
    .map((p) => p.id);

  const applicantsByPost: Record<string, LfgApplicantRow[]> = {};

  if (creatorPostIds.length > 0) {
    const { data: pending } = await supabase
      .from("lfg_applications")
      .select(
        "id, post_id, message, created_at, users!lfg_applications_applicant_user_id_fkey ( nickname )",
      )
      .in("post_id", creatorPostIds)
      .eq("status", "applied")
      .order("created_at", { ascending: true });

    for (const row of pending ?? []) {
      const u = row.users as { nickname: string } | null;
      const list = applicantsByPost[row.post_id] ?? [];
      list.push({
        id: row.id,
        post_id: row.post_id,
        message: row.message,
        applicant_nickname: u?.nickname ?? "—",
        created_at: row.created_at,
      });
      applicantsByPost[row.post_id] = list;
    }
  }

  const outPosts: LfgRowOut[] = posts.map((p) => {
    const u = p.users as { nickname: string } | { nickname: string }[] | null;
    const uone = Array.isArray(u) ? u[0] : u;
    return {
      id: p.id,
      mode: p.mode,
      format: p.format,
      slots: p.slots,
      description: p.description,
      expires_at: p.expires_at,
      start_time_hour: p.start_time_hour,
      mic_required: p.mic_required,
      status: p.status,
      created_at: p.created_at,
      creator_user_id: p.creator_user_id,
      creator_nickname: uone?.nickname ?? "—",
      applied_count: appliedCount.get(p.id) ?? 0,
      my_status: myStatus.get(p.id) ?? null,
      my_application_id: myAppId.get(p.id) ?? null,
    };
  });

  return { posts: outPosts, applicantsByPost };
}

export type RankClanRow = {
  id: string;
  name: string;
  max_members: number;
  active_members: number;
  last_activity_at: string | null;
};

export async function loadClanRankPreview(
  supabase: SupabaseClient<Database>,
  gameId: string,
  limit = 30,
): Promise<RankClanRow[]> {
  const { data: clans, error } = await supabase
    .from("clans")
    .select("id, name, max_members, last_activity_at")
    .eq("game_id", gameId)
    .eq("lifecycle_status", "active")
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !clans?.length) return [];

  const ids = clans.map((c) => c.id);
  const counts = await memberCountMap(supabase, ids);

  return clans.map((c) => ({
    id: c.id,
    name: c.name,
    max_members: c.max_members,
    active_members: counts.get(c.id) ?? 0,
    last_activity_at: c.last_activity_at,
  }));
}
