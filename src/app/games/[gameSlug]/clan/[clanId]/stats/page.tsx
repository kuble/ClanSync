import { redirect } from "next/navigation";
import { ClanStatsView } from "@/components/main-clan/clan-stats-view";
import { loadClanStatsPage } from "@/lib/clan/stats/load-clan-stats";
import { createClient } from "@/lib/supabase/server";

export default async function ClanStatsPage({
  params,
}: {
  params: Promise<{ gameSlug: string; clanId: string }>;
}) {
  const { gameSlug, clanId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=/games/${gameSlug}/clan/${clanId}/stats`);
  }

  const model = await loadClanStatsPage(supabase, user.id, clanId);
  if (!model) {
    redirect(`/games/${gameSlug}/clan`);
  }

  return (
    <ClanStatsView gameSlug={gameSlug} clanId={clanId} model={model} />
  );
}
