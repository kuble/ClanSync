import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getClanStatsDashboardSummary } from "@/lib/clan/clan-stats-mock";
import { loadClanLayoutContext } from "@/lib/clan/load-clan-layout";
import { clanBasePath } from "@/lib/clan/paths";
import { isOfficerRole } from "@/lib/clan/types";

interface ClanDashboardPageProps {
  params: Promise<{ locale: string; gameSlug: string; clanId: string }>;
}

export default async function ClanDashboardPage({
  params,
}: ClanDashboardPageProps) {
  const { locale, gameSlug, clanId } = await params;
  const ctx = await loadClanLayoutContext(locale, gameSlug, clanId);
  const base = clanBasePath(locale, gameSlug, clanId);
  const officer = isOfficerRole(ctx.membership.role);
  const statSum = getClanStatsDashboardSummary();
  const statDesc =
    statSum.winRatePct === null
      ? "최근 30일 경기 없음"
      : `최근 30일 ${statSum.games}경기 · ${statSum.record} · 승률 ${statSum.winRatePct}%`;

  const cards = [
    {
      href: `${base}/stats`,
      title: "클랜 통계",
      desc: `${statDesc} — 아카이브·순위·맵별 승률`,
      show: true,
    },
    {
      href: `${base}/events`,
      title: "다가오는 일정",
      desc: "내전·스크림 일정 (구현 예정)",
      show: true,
    },
    {
      href: `${base}/balance`,
      title: "밸런스메이커",
      desc: "경기 구성·결과 입력",
      show: officer,
    },
    {
      href: `${base}/manage`,
      title: "클랜 관리",
      desc: "가입 승인·멤버 목록",
      show: officer,
    },
  ].filter((c) => c.show);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold">대시보드</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          통계 탭은 클랜 단위 목업 집계를 표시합니다. 나머지 섹션은 연동 전
          플레이스홀더입니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="group block">
              <Card className="h-full transition-colors group-hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="text-base">{c.title}</CardTitle>
                  <CardDescription>{c.desc}</CardDescription>
                </CardHeader>
                <CardContent className="text-primary text-sm font-medium">
                  이동 →
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
