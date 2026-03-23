import { ClanStatsPlaceholder } from "@/components/features/clan/mocks/clan-stats-placeholder";

interface StatsPageProps {
  params: Promise<{ locale: string; gameSlug: string; clanId: string }>;
}

export default async function StatsPage({ params }: StatsPageProps) {
  await params;
  return <ClanStatsPlaceholder />;
}
