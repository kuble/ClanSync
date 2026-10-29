import { redirect } from "next/navigation";
import { AccountShell } from "@/components/onboarding/account-shell";
import { createClient } from "@/lib/supabase/server";
import { ClanParticipantClaim } from "@/components/main-clan/clan-participant-claim";

export const metadata = { title: "참가자 기록 연결 | ClanSync", robots: { index: false, follow: false } };
export default async function ParticipantLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return <AccountShell><main className="mx-auto w-full max-w-lg space-y-4 break-words px-5 py-10"><h1 className="text-lg font-bold">참가자 기록 연결</h1><p className="text-sm text-muted-foreground">사용할 수 없는 연결 링크입니다.</p></main></AccountShell>;
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/participant-link/${token}`)}`);
  const { data, error } = await client.rpc("read_clan_participant_invite", { p_token: token });
  if (error) throw new Error("연결 링크를 확인하지 못했습니다.");
  const info = data as { clanName: string; nickname: string; alias: string; requestStatus: string | null } | null;
  return <AccountShell><main className="mx-auto w-full max-w-lg space-y-5 break-words px-5 py-10">
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <h1 className="text-lg font-bold">참가자 기록 연결</h1>
      {info ? <><p className="text-xs text-muted-foreground">{info.clanName}</p><p className="text-base font-semibold">{info.nickname} · {info.alias}</p><p className="text-xs text-muted-foreground">현재 계정: {user.email} · <span className="font-mono">{user.id.slice(0, 8)}</span></p><ClanParticipantClaim token={token} requested={info.requestStatus === "pending"} /></> : <p className="text-sm text-muted-foreground">만료되거나 이미 처리된 연결 링크입니다. 운영진에게 새 링크를 요청하십시오.</p>}
    </section>
  </main></AccountShell>;
}
