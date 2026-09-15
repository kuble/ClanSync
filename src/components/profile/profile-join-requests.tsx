import { cancelJoinRequestByIdFormAction } from "@/app/actions/game-clan-onboarding";
import { Button } from "@/components/ui/button";
import styles from "./profile.module.css";

type JoinRow = {
  id: string; status: "pending" | "approved" | "rejected" | "canceled"; applied_at: string; resolved_at: string | null;
  reject_reason: string | null; message: string; clans: { name: string } | null; games: { slug: string; name_ko: string } | null;
};
const STATUS = { pending: "검토 중", approved: "승인됨", rejected: "거절됨", canceled: "취소됨" };
function dateLabel(value: string) { return new Date(value).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" }); }

export function ProfileJoinRequests({ rows, loadFailed = false }: { rows: JoinRow[]; loadFailed?: boolean }) {
  return <section className={styles.requestSection} aria-labelledby="join-requests-heading">
    <h2 id="join-requests-heading" className={styles.sectionHeading}>가입 신청{rows.length ? ` · ${rows.length}건` : ""}</h2>
    <p className={styles.sectionText}>현재 대기 중인 신청과 최근 7일 이내의 처리 결과입니다.</p>
    {loadFailed ? <p className={styles.error} role="alert">가입 신청 정보를 불러오지 못했습니다. 잠시 후 새로 고침해 주세요.</p> : rows.length ? <ul className={styles.requestList}>
      {rows.map((request) => <li key={request.id} className={styles.requestRow}>
        <div><strong>{request.clans?.name ?? "클랜"}</strong><span className={styles.requestStatus} data-status={request.status}>{STATUS[request.status]}</span>
          <p>{request.games?.name_ko ?? "게임"} · {dateLabel(request.applied_at)} 신청{request.resolved_at ? ` · ${dateLabel(request.resolved_at)} 처리` : ""}</p>
          {request.message ? <p className="whitespace-pre-wrap">{request.message}</p> : null}
          {request.status === "rejected" && request.reject_reason ? <p className="text-destructive!">사유: {request.reject_reason}</p> : null}
        </div>
        {request.status === "pending" ? <form action={cancelJoinRequestByIdFormAction}><input type="hidden" name="requestId" value={request.id} /><Button type="submit" variant="outline" size="sm">신청 취소</Button></form> : null}
      </li>)}
    </ul> : <p className="text-muted-foreground mt-5 text-xs">진행 중인 가입 신청이 없습니다.</p>}
  </section>;
}
