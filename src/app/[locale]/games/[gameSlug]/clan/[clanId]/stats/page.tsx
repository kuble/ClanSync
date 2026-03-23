import { ClanStatsView } from "@/components/features/clan/clan-stats-view";
import { buildClanStatsViewModel, parseClanStatsQuery } from "@/lib/clan/clan-stats-mock";
import { loadClanLayoutContext } from "@/lib/clan/load-clan-layout";
import { isOfficerRole } from "@/lib/clan/types";

interface StatsPageProps {
  params: Promise<{ locale: string; gameSlug: string; clanId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StatsPage({
  params,
  searchParams,
}: StatsPageProps) {
  const { locale, gameSlug, clanId } = await params;
  const sp = await searchParams;
  const { period, matchType } = parseClanStatsQuery(sp);
  const ctx = await loadClanLayoutContext(locale, gameSlug, clanId);
  const model = buildClanStatsViewModel(period, matchType);

  return (
    <ClanStatsView
      locale={locale}
      gameSlug={gameSlug}
      clanId={clanId}
      clanName={ctx.clan.name}
      model={model}
      isOfficer={isOfficerRole(ctx.membership.role)}
      subscriptionTier={ctx.subscriptionTier}
    />
  );
}
