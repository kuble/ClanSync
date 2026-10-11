import { Suspense } from "react";
import { forbidden } from "next/navigation";
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
  if (!ctx || ctx.role === "member") forbidden();
  const selected = resolveManageTab(query.tab);
  const section = MANAGE_SECTIONS.find((item) => item.key === selected)!;
  const basePath = `/games/${gameSlug}/clan/${clanId}/manage`;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">{ctx.clanName}의 운영과 설정</p>
        <span className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">{ctx.role === "leader" ? "클랜장" : "운영진"} · {ctx.plan === "premium" ? "Premium" : "Free"}</span>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
        <ClanManageNavigation selected={selected} pendingCount={ctx.pendingJoinRequestCount} basePath={basePath} />
        <section className="min-w-0 space-y-4" aria-labelledby="manage-section-heading">
          <header className="border-b border-border pb-4"><h3 id="manage-section-heading" className="text-base font-bold">{section.label}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{section.description}</p></header>
          <Suspense key={selected} fallback={<div role="status" className="space-y-3"><span className="sr-only">{section.label} 불러오는 중</span><div className="h-28 animate-pulse rounded-xl bg-muted/50" /><div className="h-44 animate-pulse rounded-xl bg-muted/50" /></div>}>
            <ClanManageContent ctx={ctx} selected={selected} connectionResult={query.discord} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
