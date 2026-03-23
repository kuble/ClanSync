import { StatsDashboardMock } from "@/components/features/clan/mocks/stats-dashboard-mock";
import { loadClanLayoutContext } from "@/lib/clan/load-clan-layout";
import { isOfficerRole } from "@/lib/clan/types";

interface StatsPageProps {
  params: Promise<{ locale: string; gameSlug: string; clanId: string }>;
}

export default async function StatsPage({ params }: StatsPageProps) {
  const { locale, gameSlug, clanId } = await params;
  const ctx = await loadClanLayoutContext(locale, gameSlug, clanId);
  const officer = isOfficerRole(ctx.membership.role);

  return <StatsDashboardMock officer={officer} />;
}
