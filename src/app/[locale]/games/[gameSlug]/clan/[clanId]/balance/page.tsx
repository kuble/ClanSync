import { BalanceBoardMock } from "@/components/features/clan/mocks/balance-board-mock";
import { OfficerGate } from "@/components/features/clan/officer-gate";
import { loadClanLayoutContext } from "@/lib/clan/load-clan-layout";

interface BalancePageProps {
  params: Promise<{ locale: string; gameSlug: string; clanId: string }>;
}

export default async function BalancePage({ params }: BalancePageProps) {
  const { locale, gameSlug, clanId } = await params;
  const ctx = await loadClanLayoutContext(locale, gameSlug, clanId);

  return (
    <OfficerGate ctx={ctx}>
      <BalanceBoardMock />
    </OfficerGate>
  );
}
