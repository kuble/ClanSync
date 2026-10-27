import { Suspense } from "react";
import { forbidden, redirect } from "next/navigation";
import { ClanManageNavigation } from "@/components/main-clan/clan-manage-tabs";
import { ClanManageContent } from "@/components/main-clan/clan-manage-content";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { MANAGE_SECTIONS, resolveManageTab } from "@/lib/clan/manage-sections";

/** Every section uses fresh request-scoped membership; members receive 403. */
export default async function ManagePage({ params, searchParams }: {
  params: Promise<{ gameSlug: string; clanId: string }>;
  searchParams: Promise<{ tab?: string | string[]; discord?: string }>;
}) {
  const [{ gameSlug, clanId }, query] = await Promise.all([params, searchParams]);
  const ctx = await getRequestMainClanContext(gameSlug, clanId);
  if (ctx && query.tab === "notices") redirect("/games/"+gameSlug+"/clan/"+clanId+"/board/notices");
  if (!ctx || ctx.role === "member") forbidden();
  const selected = resolveManageTab(query.tab);
  const section = MANAGE_SECTIONS.find((item) => item.key === selected)!;
  const basePath = `/games/${gameSlug}/clan/${clanId}/manage`;

  return (
    <div className="grid min-w-0 gap-5">
      <ClanManageNavigation selected={selected} pendingCount={ctx.pendingJoinRequestCount} basePath={basePath} />
      <section tabIndex={0} className="board-scroll h-[calc(100dvh-16rem)] min-h-80 min-w-0 space-y-4 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-ring" aria-label={section.label}>
        <Suspense key={selected} fallback={<div role="status" className="space-y-3"><span className="sr-only">{section.label} 불러오는 중</span><div className="h-28 animate-pulse rounded-xl bg-muted/50" /><div className="h-44 animate-pulse rounded-xl bg-muted/50" /></div>}>
          <ClanManageContent ctx={ctx} selected={selected} connectionResult={query.discord} />
        </Suspense>
      </section>
    </div>
  );
}
