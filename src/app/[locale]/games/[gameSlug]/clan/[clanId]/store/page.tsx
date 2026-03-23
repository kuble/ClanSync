import { StoreGridMock } from "@/components/features/clan/mocks/store-grid-mock";
import { loadClanLayoutContext } from "@/lib/clan/load-clan-layout";

interface StorePageProps {
  params: Promise<{ locale: string; gameSlug: string; clanId: string }>;
}

export default async function StorePage({ params }: StorePageProps) {
  const { locale, gameSlug, clanId } = await params;
  await loadClanLayoutContext(locale, gameSlug, clanId);

  return <StoreGridMock />;
}
