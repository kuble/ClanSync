import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import { NotificationExample } from "./notification-example";
import { ClanBoardPosts } from "@/components/main-clan/clan-board-posts";
import { ClanEventsView } from "@/components/main-clan/clan-events-view";
import { MemoryPhoto } from "@/components/main-clan/memory-photo";
import type { SerializedClanEvent } from "@/lib/clan/expand-clan-event-occurrences";
import styles from "./preview.module.css";

function Window({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return <figure className={styles.clanWindow}>
    <div className={styles.clanWindowHeading}><div><span>오버워치 · 예시 클랜</span><h3>{title}</h3></div></div>
    <div className={styles.activityExampleBody}>{children}</div>
    <figcaption>{caption}</figcaption>
  </figure>;
}

export function ActivityExamples({ events }: { events: SerializedClanEvent[] }) {
  return [
    { id: "board", label: "게시판", content: <Window title="클랜원과 나누는 이야기" caption="실제 게시판 UI · 예시 글 · 읽기 전용">
      <div inert><ClanBoardPosts base="/dev/landing-preview" gameSlug="overwatch" clanId="landing-example" kind="free" title="자유 게시판" userId="landing-example" page={1} total={4} posts={[
        "금요일 내전, 오늘의 하이라이트", "주말에 같이 게임할 분 있나요?", "처음 오신 분들, 반가워요", "우리 클랜에서 가장 기억에 남는 경기",
      ].map((title, i) => ({ id: `example-post-${i}`, title, content: "", details: {}, status: "open", image_path: null, created_at: `2026-10-${30 - i}T10:00:00+09:00`, author: ["여울", "하루", "노을", "모카"][i], commentCount: [8, 5, 12, 3][i] }))} /></div>
    </Window> },
    { id: "photos", label: "사진", content: <Window title="함께한 순간을 모아두는 앨범" caption="실제 사진 카드 UI · 맵 이미지로 구성한 예시 앨범">
      <div className={styles.photoExamples}>
        <MemoryPhoto src="/images/overwatch/maps/busan.webp" caption="금요일 내전 · 부산" />
        <MemoryPhoto src="/images/overwatch/maps/kings-row.webp" caption="다음엔 왕의 길에서" />
      </div>
    </Window> },
    { id: "notifications", label: "알림", content: <Window title="놓치지 않고 함께하는 소식" caption="실제 알림 목록 UI · 예시 데이터 · 읽기 전용">
      <div className={styles.exampleHeading}><strong>클랜 알림</strong><Bell size={19} aria-hidden /></div>
      <NotificationExample />
    </Window> },
    { id: "events", label: "이벤트", content: <Window title="다음 만남을 정하는 달력" caption="실제 일정 UI · 정기 내전과 주말 모임 예시 · 읽기 전용">
      <div inert><ClanEventsView gameSlug="overwatch" clanId="landing-example" serverNow="2026-10-30T10:00:00+09:00" events={events} canManageEvents={false} planIsPremium={false} viewerUserId={null} myRsvpGoingKeys={[]} polls={[]} bracketTournaments={[]} /></div>
    </Window> },
  ];
}
