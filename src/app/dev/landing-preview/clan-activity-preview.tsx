import { CalendarDays, MessagesSquare, Palette } from "lucide-react";
import { ClanDashboard } from "@/components/main-clan/clan-dashboard";
import { PreviewPagination } from "./preview-pagination";
import { ActivityExamples } from "./activity-examples";
import type { ClanDashboardModel } from "@/lib/clan/load-clan-dashboard";
import styles from "./preview.module.css";

// Fictional local examples. The inert dashboard cannot open or edit a clan.
const dashboard: ClanDashboardModel = {
  now: "2026-10-30T10:00:00+09:00", createdAt: "2026-07-01T00:00:00+09:00",
  completedIntraCount: 24, previousMonth: "2026년 9월",
  rules: "서로 존중하며, 승패보다 함께하는 시간을 즐겨요.",
  notices: [
    { id: "landing-notice", title: "새로 온 멤버들을 환영합니다", content: "", createdAt: "2026-10-29T12:00:00+09:00", kind: "notice", isPinned: true },
    { id: "landing-poll", title: "다음 모임, 언제가 좋을까요?", content: "", createdAt: "2026-10-28T12:00:00+09:00", kind: "poll", isPinned: false },
  ],
  events: [
    { id: "landing-intra", title: "금요일 정기 내전", kind: "intra", start_at: "2026-10-30T21:00:00+09:00", place: "Discord", source: "manual", repeat: "none", repeat_weekdays: null, repeat_time: null },
    { id: "landing-event", title: "주말 자유 게임 모임", kind: "event", start_at: "2026-11-01T20:00:00+09:00", place: "Discord", source: "manual", repeat: "none", repeat_weekdays: null, repeat_time: null },
  ],
  communityLinks: { discord: "", kakao: "", line: "", telegram: "", whatsapp: "", steam: "" },
  discordConnected: false,
  mvp: {
    winRate: ["여울", "루나", "모카"].map((nickname, i) => ({ rank: i + 1, userId: `landing-win-${i}`, nickname, percentage: [75, 66.7, 62.5][i], tiedCount: 1 })),
    participation: ["하루", "노을", "구름"].map((nickname, i) => ({ rank: i + 1, userId: `landing-attend-${i}`, nickname, percentage: [100, 87.5, 75][i], tiedCount: 1 })),
    prediction: [],
  },
  errors: { notices: false, rules: false, events: false, rankings: false },
};
export function ClanActivityPreview() {
  return (
    <section id="clan-activity" className={styles.activity} aria-labelledby="activity-title">
      <div className={styles.sectionIntro}>
        <h2 id="activity-title">내전이 없는 날에도,<br />우리 클랜이 함께하는 공간.</h2>
        <p>일정을 정하고 소식을 나누며,<br className={styles.desktopBreak} /> 함께한 순간을 남겨보세요.</p>
      </div>
      <div className={styles.activityLayout}>
        <PreviewPagination label="클랜 활동" slides={[
          { id: "home", label: "클랜 홈", content: <figure className={styles.clanWindow}>
          <div className={styles.clanWindowHeading}><div><span>오버워치 · 예시 클랜</span><h3>함께하는 우리 클랜</h3></div><span className={styles.status}>클랜 홈</span></div>
          <div className={styles.clanDashboard} inert>
            <ClanDashboard model={dashboard} gameSlug="overwatch" clanId="landing-example" isPremium={false} actorRole="member" />
          </div>
          <figcaption>실제 클랜 홈 UI · 예시 데이터 · 읽기 전용<br />공지·투표·일정과 지난달 승률·참여율 MVP.</figcaption>
        </figure> },
          ...ActivityExamples({ events: dashboard.events }),
        ]} />
        <div className={styles.activityFeatures}>
          <div><CalendarDays size={23} aria-hidden="true" /><h3>다음 만남을 준비하는 곳</h3><p>함께할 시간을 정하고, 멤버들에게 소식을 전해보세요.</p><span>일정 · 투표 · Discord 알림</span></div>
          <div><MessagesSquare size={23} aria-hidden="true" /><h3>소식과 추억을 나누는 곳</h3><p>중요한 소식부터 일상과 추억까지 함께 나눠보세요.</p><span>공지 · 게시판 · 추억 사진</span></div>
          <div><Palette size={23} aria-hidden="true" /><h3>우리 클랜답게 꾸미는 곳</h3><p>우리만의 분위기로 클랜 공간을 채워보세요.</p><span>클랜 배너 · 이모티콘 · 사진 꾸미기</span></div>
        </div>
      </div>
    </section>
  );
}
