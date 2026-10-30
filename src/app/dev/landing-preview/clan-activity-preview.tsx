import { ClanEventsView } from "@/components/main-clan/clan-events-view";
import { MemoryPhoto } from "@/components/main-clan/memory-photo";
import type { SerializedClanEvent } from "@/lib/clan/expand-clan-event-occurrences";
import { PreviewPagination } from "./preview-pagination";
import { ShowcaseFrame } from "./showcase-frame";
import { NotificationExample } from "./notification-example";
import styles from "./preview.module.css";
import showcase from "./showcase.module.css";

const events: SerializedClanEvent[] = [
  { id: "landing-intra", title: "금요일 정기 내전", kind: "intra", start_at: "2026-10-30T21:00:00+09:00", place: "Discord", source: "manual", repeat: "none", repeat_weekdays: null, repeat_time: null },
  { id: "landing-event", title: "주말 자유 게임 모임", kind: "event", start_at: "2026-11-01T20:00:00+09:00", place: "Discord", source: "manual", repeat: "none", repeat_weekdays: null, repeat_time: null },
];

export function ClanActivityPreview() {
  return <section id="clan-activity" className={styles.activity} aria-labelledby="activity-title">
    <div className={styles.sectionIntro}>
      <h2 id="activity-title">내전이 없는 날에도,<br />함께할 이야기는 계속되니까.</h2>
      <p>사진과 일정, 놓치면 아쉬운 소식까지 한곳에서 나눠요.</p>
    </div>
    <PreviewPagination label="클랜 활동" slides={[
      { id: "photos", label: "사진", content: <ShowcaseFrame title="함께한 순간을 우리 클랜의 앨범에." description="사진을 올리고 꾸미며, 다시 꺼내볼 추억을 모아두세요."><div className={showcase.photos}>
        <MemoryPhoto src="/images/overwatch/maps/busan.webp" caption="금요일 내전 · 부산" />
        <MemoryPhoto src="/images/overwatch/maps/kings-row.webp" caption="다음엔 왕의 길에서" />
      </div></ShowcaseFrame> },
      { id: "events", label: "일정", content: <ShowcaseFrame title="다음에 만날 시간을 정해요." description="정기 내전부터 자유 모임까지, 클랜 일정을 달력으로 확인하세요."><div className={showcase.events} inert>
        <ClanEventsView gameSlug="overwatch" clanId="landing-example" serverNow="2026-10-30T10:00:00+09:00" events={events} canManageEvents={false} planIsPremium={false} viewerUserId={null} myRsvpGoingKeys={[]} polls={[]} bracketTournaments={[]} />
      </div></ShowcaseFrame> },
      { id: "notifications", label: "알림", content: <ShowcaseFrame title="중요한 소식은 놓치지 않도록." description="다가오는 일정과 투표 마감, 새로운 댓글을 알림으로 받아보세요."><div className={showcase.notifications}><NotificationExample /></div></ShowcaseFrame> },
    ]} />
    <p className={styles.previewNote}>실제 서비스 UI 일부 · 가상 데이터 · 사진은 맵 이미지 예시</p>
  </section>;
}
