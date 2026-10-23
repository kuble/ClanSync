import { forbidden } from "next/navigation";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { loadClanPersonalEmblemCollection } from "@/lib/clan/stats/load-clan-stats";
import { PersonalEmblemCase } from "@/components/personal-emblems/personal-emblem-case";
import { uuidPattern } from "@/lib/clan/board";
import { loadOwnedPersonalEmblemCase } from "@/lib/personal-emblems/load-owned-case";

export default async function EmblemPage({ params, searchParams }: {
  params: Promise<{ gameSlug: string; clanId: string }>;
  searchParams: Promise<{ player?: string | string[] }>;
}) {
  const [{ gameSlug, clanId }, query] = await Promise.all([params, searchParams]);
  const [ctx, client, user] = await Promise.all([
    getRequestMainClanContext(gameSlug, clanId), getRequestClient(), getRequestUser(),
  ]);
  if (!ctx || !user) forbidden();
  const personId = query.player ?? user.id;
  if (typeof personId !== "string" || !uuidPattern.test(personId)) forbidden();
  const collection = personId === user.id ? await loadOwnedPersonalEmblemCase(client, clanId)
    : await loadClanPersonalEmblemCollection(client, user.id, clanId, personId);
  if (!collection) forbidden();
  return <section className="space-y-5" aria-label="개인 엠블럼">
    <PersonalEmblemCase key={clanId + personId + user.id} initialCollection={collection} />
  </section>;
}
