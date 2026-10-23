import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { finalizeClanPersonalEmblemAwards } from "@/lib/clan/stats/load-clan-stats";
import { readStatsSummary } from "@/lib/clan/stats/stats-read-model";
import type { HofEmblem } from "@/lib/clan/stats/hof-emblems";
import { awardEmblems, awardFamilies, milestoneEmblems, resolveFeaturedKeys, resolveAccountFeaturedKeys } from "./catalog";
import type { PersonalEmblemCollection } from "./types";

async function allRows<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const result = await read(from, from + 999);
    if (result.error) throw new Error("획득 기록을 불러오지 못했습니다.", { cause: result.error });
    rows.push(...result.data ?? []);
    if ((result.data?.length ?? 0) < 1000) return rows;
  }
}

/** The actor comes from verified auth, never a supplied player ID. Only their ledger leaves this function. */
export async function loadOwnedPersonalEmblemCase(supabase: SupabaseClient<Database>, contextClanId?: string): Promise<PersonalEmblemCollection | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service: SupabaseClient<Database> = createServiceRoleClient();
  const membership = await service.from("clan_members").select("clan_id,status").eq("user_id", user.id);
  if (membership.error) throw new Error("소속 기록을 불러오지 못했습니다.");
  const active = new Set(membership.data.filter(row => row.status === "active").map(row => row.clan_id));
  await Promise.all([...active].map(clanId => finalizeClanPersonalEmblemAwards(clanId)));
  const [awards, milestones, picks, accountPicks] = await Promise.all([
    allRows((from, to) => service.from("clan_personal_emblem_awards").select("clan_id,emblem_key,family,rank,period_type,period_key")
      .eq("user_id", user.id).order("clan_id").order("emblem_key").range(from, to)),
    allRows((from, to) => service.from("clan_personal_emblem_milestones").select("clan_id,emblem_key,earned_at,target,family")
      .eq("user_id", user.id).order("clan_id").order("emblem_key").range(from, to)),
    service.from("clan_personal_emblem_picks").select("clan_id,emblem_keys").eq("user_id", user.id).order("updated_at", { ascending: false }).order("clan_id"),
    service.from("account_personal_emblem_picks").select("emblem_keys").eq("user_id", user.id).maybeSingle(),
  ]);
  if (picks.error || accountPicks.error) throw new Error("대표 엠블럼을 불러오지 못했습니다.");
  const clanIds = [...new Set([...membership.data.map(row => row.clan_id), ...awards.map(row => row.clan_id), ...milestones.map(row => row.clan_id)])];
  if (contextClanId && !clanIds.includes(contextClanId)) return null;
  const metadata = clanIds.length ? await service.from("clans").select("id,name,games(slug,name_ko)").in("id", clanIds) : { data: [], error: null };
  if (metadata.error) throw new Error("엠블럼 출처를 불러오지 못했습니다.");
  const sources = await Promise.all(metadata.data.map(async clan => {
    const game = Array.isArray(clan.games) ? clan.games[0] : clan.games;
    if (!game) throw new Error("게임 정보를 불러오지 못했습니다.");
    const earned = milestones.filter(row => row.clan_id === clan.id);
    const summary = active.has(clan.id) ? await readStatsSummary(clan.id, ["all"]) : null;
    const player = summary?.periods.all?.players.find(row => row.userId === user.id);
    const prediction = summary?.periods.all?.predictions.find(row => row.userId === user.id);
    const historical = (family: string) => Math.max(0, ...earned.filter(row => row.family === family).map(row => row.target));
    const emblemAwards = awards.filter(row => row.clan_id === clan.id).flatMap(row => {
      const category = (Object.keys(awardFamilies) as HofEmblem["category"][]).find(key => awardFamilies[key] === row.family);
      return category && (row.period_type === "month" || row.period_type === "year")
        ? [{ key: row.emblem_key, category, rank: row.rank, period: row.period_type, date: row.period_key } as HofEmblem] : [];
    });
    const emblems = [...awardEmblems(emblemAwards), ...milestoneEmblems({
      sessions: player?.sessions ?? historical("sessions"), matches: player?.played ?? historical("matches"), wins: player?.wins ?? historical("wins"),
      streak: player?.longest ?? historical("streak"), prediction: prediction?.correct ?? historical("prediction"),
    }, new Map(earned.map(row => [row.emblem_key, row.earned_at]))).filter(emblem => active.has(clan.id) || emblem.earned)];
    const saved = picks.data.find(row => row.clan_id === clan.id);
    return { clanId: clan.id, clanName: clan.name, gameSlug: game.slug, gameName: game.name_ko, active: active.has(clan.id),
      userId: user.id, viewerId: user.id, nickname: "나", canFeature: true, emblems,
      featuredKeys: saved ? resolveFeaturedKeys(emblems, saved.emblem_keys) : null } satisfies PersonalEmblemCollection;
  }));
  sources.sort((a, b) => Number(b.active) - Number(a.active) || a.gameSlug.localeCompare(b.gameSlug) || a.clanId.localeCompare(b.clanId));
  const context = sources.find(source => source.clanId === contextClanId) ?? sources[0];
  const saved = accountPicks.data?.emblem_keys ?? (picks.data.length ? picks.data.flatMap(row => row.emblem_keys.map(key => row.clan_id + ":" + key)) : null);
  return { ...(context ?? { clanId: "", clanName: "", gameSlug: "", userId: user.id, viewerId: user.id, nickname: "나", canFeature: true, emblems: [], featuredKeys: [] }),
    sources, accountFeaturedKeys: resolveAccountFeaturedKeys(sources, saved) };
}
