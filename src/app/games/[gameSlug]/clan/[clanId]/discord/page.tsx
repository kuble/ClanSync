import Link from "next/link";
import { forbidden, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getRequestClient } from "@/lib/supabase/request";
import { resolveClanDiscordEntry } from "@/lib/clan/resolve-clan-discord-entry";
import { buttonVariants } from "@/components/ui/button-variants";
import { ChatServiceIcon } from "@/components/main-clan/chat-service-icon";

export default async function ClanDiscordEntryPage({ params }: { params: Promise<{ gameSlug: string; clanId: string }> }) {
  const { gameSlug, clanId } = await params;
  const result = await resolveClanDiscordEntry(await getRequestClient(), gameSlug, clanId);
  if (result.ok) redirect(result.href);
  if (result.reason === "forbidden") forbidden();
  const base = `/games/${gameSlug}/clan/${clanId}`;
  return <section className="mx-auto max-w-lg rounded-xl border border-border bg-card p-6 sm:p-8" aria-labelledby="discord-entry-heading">
    <ChatServiceIcon service="discord" className="size-8 text-muted-foreground" />
    <h1 id="discord-entry-heading" className="mt-4 text-lg font-semibold">Discord에 연결할 수 없습니다</h1>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.reason === "no-link" ? "등록된 Discord 링크가 없습니다. 클랜장에게 채팅방 연결을 요청해 주십시오." : "잠시 후 다시 시도해 주십시오. 계속 연결되지 않으면 클랜장에게 봇 연결과 초대 생성 권한을 확인해 달라고 요청해 주십시오."}</p>
    <div className="mt-6 flex flex-wrap gap-2">
      <a href={`${base}/discord`} className={buttonVariants({ size: "sm" })}><ExternalLink className="size-4" aria-hidden />다시 시도</a>
      <Link href={base} className={buttonVariants({ size: "sm", variant: "outline" })}>대시보드로</Link>
    </div>
  </section>;
}
