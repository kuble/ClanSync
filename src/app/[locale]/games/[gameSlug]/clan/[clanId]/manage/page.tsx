import { ManageBoardMock } from "@/components/features/clan/mocks/manage-board-mock";
import { OfficerGate } from "@/components/features/clan/officer-gate";
import { loadClanLayoutContext } from "@/lib/clan/load-clan-layout";
import { loadClanMembersForManage } from "@/lib/clan/load-clan-manage";

interface ManagePageProps {
  params: Promise<{ locale: string; gameSlug: string; clanId: string }>;
}

export default async function ManagePage({ params }: ManagePageProps) {
  const { locale, gameSlug, clanId } = await params;
  const ctx = await loadClanLayoutContext(locale, gameSlug, clanId);
  const { pending, active } = await loadClanMembersForManage(clanId);

  return (
    <OfficerGate ctx={ctx}>
      <ManageBoardMock pending={pending} active={active} />
    </OfficerGate>
  );
}
