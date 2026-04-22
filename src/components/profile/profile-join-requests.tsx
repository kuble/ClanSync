import { cancelJoinRequestByIdFormAction } from "@/app/actions/game-clan-onboarding";
import { Button } from "@/components/ui/button";

type JoinRow = {
  id: string;
  status: "pending" | "approved" | "rejected" | "canceled";
  applied_at: string;
  resolved_at: string | null;
  reject_reason: string | null;
  message: string;
  clans: { name: string } | null;
  games: { slug: string; name_ko: string } | null;
};

function statusLabel(s: JoinRow["status"]): string {
  if (s === "pending") return "검토 중";
  if (s === "approved") return "승인됨";
  if (s === "rejected") return "거절됨";
  return "취소됨";
}

export function ProfileJoinRequests({ rows }: { rows: JoinRow[] }) {
  if (rows.length === 0) {
    return (
      <section className="mt-10" aria-labelledby="join-requests-heading">
        <h2
          id="join-requests-heading"
          className="text-lg font-semibold tracking-tight"
        >
          가입 신청
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          최근 7일 이내 처리된 신청이 없고, 대기 중인 신청도 없습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10" aria-labelledby="join-requests-heading">
      <h2
        id="join-requests-heading"
        className="text-lg font-semibold tracking-tight"
      >
        가입 신청 · 대기 목록
      </h2>
      <p className="text-muted-foreground mt-1 text-xs">
        D-PROFILE-02: 대기는 항상 표시, 승인·거절은 처리일 기준 7일간만 표시됩니다.
      </p>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => {
          const clanName = r.clans?.name ?? "클랜";
          const gameLabel = r.games?.name_ko ?? "게임";
          return (
            <li
              key={r.id}
              className="bg-card rounded-xl border p-4 text-sm shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {clanName}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {gameLabel}
                    </span>
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    상태: {statusLabel(r.status)} · 신청{" "}
                    {new Date(r.applied_at).toLocaleString("ko-KR")}
                    {r.resolved_at
                      ? ` · 처리 ${new Date(r.resolved_at).toLocaleString("ko-KR")}`
                      : null}
                  </p>
                  {r.message ? (
                    <p className="mt-2 text-xs whitespace-pre-wrap">{r.message}</p>
                  ) : null}
                  {r.status === "rejected" && r.reject_reason ? (
                    <p className="text-destructive mt-1 text-xs whitespace-pre-wrap">
                      사유: {r.reject_reason}
                    </p>
                  ) : null}
                </div>
                {r.status === "pending" ? (
                  <form action={cancelJoinRequestByIdFormAction}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <Button type="submit" variant="outline" size="sm">
                      신청 취소
                    </Button>
                  </form>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
