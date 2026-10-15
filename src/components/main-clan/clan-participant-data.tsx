import { loadGuestRecords } from "@/app/actions/clan-participants";
import { ClanParticipantManagement } from "./clan-participant-management";

/** Mounted only inside the officer-authorized management page. */
export async function ClanParticipantData({ clanId, gameSlug }: { clanId: string; gameSlug: string }) {
  const result = await loadGuestRecords(clanId);
  if (!result.ok) throw new Error(result.error);
  return <ClanParticipantManagement clanId={clanId} gameSlug={gameSlug} records={result.records.filter((p) => !p.userId)} />;
}
