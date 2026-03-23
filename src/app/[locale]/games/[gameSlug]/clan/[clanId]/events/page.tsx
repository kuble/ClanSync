import { EventsCalendarMock } from "@/components/features/clan/mocks/events-calendar-mock";
import { loadClanLayoutContext } from "@/lib/clan/load-clan-layout";
import { isOfficerRole } from "@/lib/clan/types";

interface EventsPageProps {
  params: Promise<{ locale: string; gameSlug: string; clanId: string }>;
}

export default async function EventsPage({ params }: EventsPageProps) {
  const { locale, gameSlug, clanId } = await params;
  const ctx = await loadClanLayoutContext(locale, gameSlug, clanId);
  const officer = isOfficerRole(ctx.membership.role);

  return <EventsCalendarMock officer={officer} />;
}
