import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/onboarding/account-shell";
import { ClanInviteJoin } from "@/components/onboarding/clan-invite-join";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { uuidPattern } from "@/lib/clan/board";
import { buttonVariants } from "@/components/ui/button-variants";

export async function generateMetadata() {
  const tx = await getTranslator();
  return { title: tx("클랜 초대 · ClanSync"), robots: { index: false, follow: false }, referrer: "no-referrer" as const };
}

export default async function ClanInvitePage({ params }: { params: Promise<{ gameSlug: string; token: string }> }) {
  const tx = await getTranslator();
  const { gameSlug, token } = await params;
  const client = await getRequestClient();
  const user = await getRequestUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/games/${gameSlug}/invite/${token}`)}`);
  const result = uuidPattern.test(token) ? await client.rpc("read_clan_join_invite", { p_token: token }) : null;
  if (result?.error) throw new Error("초대 링크를 확인하지 못했습니다. 다시 시도해 주십시오.");
  const invite = result?.data?.[0];
  const valid = invite?.game_slug === gameSlug ? invite : null;
  const membership = valid ? await client.rpc("select_my_clan_membership", { p_clan_id: valid.clan_id }) : null;
  if (membership?.error) throw new Error("클랜 소속 상태를 확인하지 못했습니다.");
  const member = membership?.data?.[0]?.status === "active";
  return <AccountShell><main className="mx-auto w-full max-w-md px-5 py-12">
    <section className="space-y-5 rounded-2xl border bg-card p-6" aria-labelledby="invite-heading">
      <p className="text-xs font-medium text-primary">{tx("클랜 초대")}</p>
      <h1 id="invite-heading" className="text-xl font-semibold">{valid ? valid.clan_name : tx("초대 링크가 만료되었습니다")}</h1>
      {valid ? <>
        <p className="text-sm leading-relaxed text-muted-foreground">{member ? tx("이미 이 클랜의 구성원입니다.") : tx("가입 버튼을 누르면 일반 멤버로 바로 가입합니다. 출생연도·성별 조건과 정원을 확인합니다.")}</p>
        <p className="text-xs text-muted-foreground">{tx("이 초대는")} {new Date(valid.expires_at).toLocaleTimeString(tx.locale, { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false })}{tx("까지 유효합니다. (한국 시간)")}</p>
        {member ? <Link className={buttonVariants({ className: "w-full" })} href={`/games/${gameSlug}/clan/${valid.clan_id}/balance`}>{tx("내전 로비로 이동")}</Link> : <ClanInviteJoin token={token} />}
      </> : <p className="text-sm text-muted-foreground">{tx("초대 링크는 발급 후 30분 동안 유효합니다. 운영진에게 새 링크나 QR코드를 요청해 주십시오.")}</p>}
    </section>
  </main></AccountShell>;
}
