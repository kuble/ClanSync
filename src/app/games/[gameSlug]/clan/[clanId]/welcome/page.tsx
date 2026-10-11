import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { DiscordBenefitsGallery } from "@/components/main-clan/discord-benefits-gallery";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function ClanWelcomePage({ params }: { params: Promise<{ gameSlug: string; clanId: string }> }) {
  const { gameSlug, clanId } = await params;
  const context = await getRequestMainClanContext(gameSlug, clanId);
  if (!context) notFound();
  const base = `/games/${gameSlug}/clan/${clanId}`;
  if (context.role !== "leader") redirect(base);
  return <section className="mx-auto max-w-5xl space-y-6" aria-label="클랜 생성 완료">
    <header><h2 className="text-xl font-bold">클랜을 만들었어요</h2><p className="mt-2 text-sm text-muted-foreground">Discord에서도 클랜의 소식을 이어가세요. 알림 연동은 나중에 설정해도 됩니다.</p></header>
    <div className="flex flex-wrap gap-3"><Link href={`${base}/manage?tab=notifications`} className={buttonVariants()}>Discord 알림 설정</Link><Link href={base} className={buttonVariants({ variant: "ghost" })}>나중에</Link></div>
    <DiscordBenefitsGallery />
    <p className="text-xs text-muted-foreground">자동 알림은 Premium 기능입니다. 설정에서 연결 상태와 플랜을 확인할 수 있습니다.</p>
  </section>;
}
