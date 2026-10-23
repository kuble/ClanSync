import { PersonalEmblemCaseLauncher } from "@/components/personal-emblems/personal-emblem-case";

type Membership = { clanId: string; clanName: string; gameName: string };
export function ProfileEmblemCollections({ userId, nickname, memberships }: { userId: string; nickname: string; memberships: Membership[] }) {
  return <section className="mt-6 rounded-xl border bg-card p-5" aria-label="내 엠블럼">
    <h2 className="text-sm font-semibold">엠블럼 케이스</h2>
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">클랜에서 쌓은 수상과 달성 기록입니다. 대표 엠블럼은 개인 기록에도 함께 표시됩니다.</p>
    {memberships.length ? <div className="mt-4 grid gap-4 md:grid-cols-2">{memberships.map((membership) => <article key={membership.clanId} className="min-w-0 rounded-xl border p-4">
      <h3 className="text-sm font-semibold">{membership.clanName}</h3><p className="mt-1 text-xs text-muted-foreground">{membership.gameName}</p>
      <div className="mt-3"><PersonalEmblemCaseLauncher variant="profile" clanId={membership.clanId} userId={userId} nickname={nickname} /></div>
    </article>)}</div> : <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">클랜에 가입하면 함께 쌓은 엠블럼을 확인할 수 있습니다.</p>}
  </section>;
}
