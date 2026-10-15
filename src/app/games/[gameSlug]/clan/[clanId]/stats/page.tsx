import { redirect } from "next/navigation";
import { ClanStatsExperience } from "@/components/main-clan/clan-stats-experience";
import { loadClanStatsPage } from "@/lib/clan/stats/load-clan-stats";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";

export default async function ClanStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameSlug: string; clanId: string }>;
  searchParams: Promise<{ player?: string | string[] }>;
}) {
  const [{ gameSlug, clanId }, query] = await Promise.all([params, searchParams]);
  const supabase = await getRequestClient();
  const user = await getRequestUser();

  if (!user) {
    redirect(`/sign-in?next=/games/${gameSlug}/clan/${clanId}/stats`);
  }

  const model = await loadClanStatsPage(supabase, user.id, clanId, { deferDetails: true });
  if (!model) {
    redirect(`/games/${gameSlug}/clan`);
  }

  return <ClanStatsExperience gameSlug={gameSlug} clanId={clanId} model={model} initialPlayer={typeof query.player === "string" ? query.player : undefined} />;
}
