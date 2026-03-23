import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ClanTabNav } from "@/components/features/clan/clan-tab-nav";
import { loadClanLayoutContext } from "@/lib/clan/load-clan-layout";
import { isOfficerRole } from "@/lib/clan/types";
import { cn } from "@/lib/utils";

interface ClanLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string; gameSlug: string; clanId: string }>;
}

export default async function MainClanLayout({
  children,
  params,
}: ClanLayoutProps) {
  const { locale, gameSlug, clanId } = await params;
  const ctx = await loadClanLayoutContext(locale, gameSlug, clanId);
  const officer = isOfficerRole(ctx.membership.role);
  const gameCommunityHref = `/${locale}/games/${gameSlug}`;

  return (
    <div className="bg-background min-h-full">
      <div className="from-primary/25 via-background to-background border-b border-border bg-linear-to-b">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-muted-foreground mb-1 flex flex-wrap items-center gap-2 text-xs">
                <span>{ctx.game.displayName}</span>
                <span aria-hidden>·</span>
                <span>클랜 홈</span>
                {ctx.isMock ? (
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    Mock
                  </Badge>
                ) : null}
                <Badge variant="outline" className="text-[10px]">
                  {ctx.subscriptionTier === "pro" ? "PRO" : "Free"}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {ctx.clan.name}
              </h1>
              {ctx.clan.description ? (
                <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
                  {ctx.clan.description}
                </p>
              ) : null}
            </div>
            <Link
              href={gameCommunityHref}
              className={cn(
                "text-muted-foreground hover:text-foreground inline-flex text-sm font-medium underline-offset-4 hover:underline",
              )}
            >
              게임 커뮤니티로 이동 →
            </Link>
          </div>

          <div className="mt-6">
            <ClanTabNav
              locale={locale}
              gameSlug={gameSlug}
              clanId={clanId}
              isOfficer={officer}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
