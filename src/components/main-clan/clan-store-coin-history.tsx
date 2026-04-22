import { coinReasonLabelKo } from "@/lib/coin/coin-reason-label";
import { createClient } from "@/lib/supabase/server";

function formatSigned(amount: number): string {
  const n = amount.toLocaleString("ko-KR");
  return amount > 0 ? `+${n}` : n;
}

export async function ClanStoreCoinHistory({
  clanId,
  showClanPool,
}: {
  clanId: string;
  showClanPool: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: personalRows } = await supabase
    .from("coin_transactions")
    .select("id, amount, reason, balance_after, created_at")
    .eq("user_id", user.id)
    .eq("pool_type", "personal")
    .order("created_at", { ascending: false })
    .limit(12);

  let clanRows: typeof personalRows = null;
  if (showClanPool) {
    const { data } = await supabase
      .from("coin_transactions")
      .select("id, amount, reason, balance_after, created_at")
      .eq("clan_id", clanId)
      .eq("pool_type", "clan")
      .order("created_at", { ascending: false })
      .limit(12);
    clanRows = data;
  }

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-sm font-medium tracking-tight">내 코인 최근 내역</h3>
        {!personalRows?.length ? (
          <p className="text-muted-foreground mt-2 rounded-lg border border-dashed p-4 text-center text-sm">
            아직 거래 내역이 없습니다.
          </p>
        ) : (
          <ul className="mt-2 divide-y rounded-lg border text-sm">
            {personalRows.map((r) => (
              <li
                key={r.id as string}
                className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2"
              >
                <span className="text-muted-foreground">
                  {coinReasonLabelKo(r.reason as string)}
                </span>
                <span className="tabular-nums">
                  <span
                    className={
                      (r.amount as number) < 0
                        ? "text-destructive font-medium"
                        : "text-emerald-700 dark:text-emerald-400"
                    }
                  >
                    {formatSigned(r.amount as number)}
                  </span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    잔액 {(r.balance_after as number).toLocaleString("ko-KR")}
                  </span>
                </span>
                <span className="text-muted-foreground w-full text-xs">
                  {new Date(r.created_at as string).toLocaleString("ko-KR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showClanPool ? (
        <div>
          <h3 className="text-sm font-medium tracking-tight">
            클랜 풀 최근 내역
          </h3>
          {!clanRows?.length ? (
            <p className="text-muted-foreground mt-2 rounded-lg border border-dashed p-4 text-center text-sm">
              아직 클랜 풀 거래가 없습니다.
            </p>
          ) : (
            <ul className="mt-2 divide-y rounded-lg border text-sm">
              {clanRows.map((r) => (
                <li
                  key={r.id as string}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2"
                >
                  <span className="text-muted-foreground">
                    {coinReasonLabelKo(r.reason as string)}
                  </span>
                  <span className="tabular-nums">
                    <span
                      className={
                        (r.amount as number) < 0
                          ? "text-destructive font-medium"
                          : "text-emerald-700 dark:text-emerald-400"
                      }
                    >
                      {formatSigned(r.amount as number)}
                    </span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      잔액 {(r.balance_after as number).toLocaleString("ko-KR")}
                    </span>
                  </span>
                  <span className="text-muted-foreground w-full text-xs">
                    {new Date(r.created_at as string).toLocaleString("ko-KR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          클랜 풀 거래 내역은 운영진 이상만 볼 수 있습니다.
        </p>
      )}
    </section>
  );
}
