import { coinReasonLabelKo } from "@/lib/coin/coin-reason-label";
import { getRequestClient } from "@/lib/supabase/request";

export async function ClanStoreCoinHistory({ clanId, showClanPool }: { clanId: string; showClanPool: boolean }) {
  if (!showClanPool) return null;
  const supabase = await getRequestClient();
  const { data: rows, error } = await supabase.from("coin_transactions")
    .select("id,amount,reason,balance_after,created_at").eq("clan_id", clanId).eq("pool_type", "clan")
    .order("created_at", { ascending: false }).limit(12);
  return <details className="rounded-2xl border bg-card p-5 text-xs text-muted-foreground">
    <summary className="cursor-pointer font-semibold text-foreground">클랜 코인 최근 내역</summary>
    {error ? <p role="alert" className="mt-3">거래 내역을 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.</p> : !rows?.length ? <p className="mt-3">아직 클랜 코인 거래가 없습니다.</p>
      : <ul className="mt-3 divide-y divide-border">{rows.map(row => <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
        <span>{coinReasonLabelKo(row.reason)}</span><span className="tabular-nums"><span className={row.amount < 0 ? "font-medium text-destructive" : "text-emerald-700 dark:text-emerald-400"}>{row.amount > 0 ? "+" : ""}{row.amount.toLocaleString("ko-KR")}</span><span className="ml-2">잔액 {row.balance_after.toLocaleString("ko-KR")}</span></span>
        <time className="w-full text-[11px]" dateTime={row.created_at}>{new Date(row.created_at).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}</time>
      </li>)}</ul>}
  </details>;
}
