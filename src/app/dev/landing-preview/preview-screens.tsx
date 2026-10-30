import { ClanBalanceRosterEditor } from "@/components/main-clan/clan-balance-roster-editor";
import { ClanDashboard } from "@/components/main-clan/clan-dashboard";
import { ClanEventsView } from "@/components/main-clan/clan-events-view";
import { ClanBoardPosts } from "@/components/main-clan/clan-board-posts";
import { ClanStatsArchive } from "@/components/main-clan/clan-stats-archive";
import { StatsTrend } from "@/components/main-clan/clan-stats-charts";
import type { BoardListPost } from "@/lib/clan/board";
import type { ReactNode } from "react";
import { ProductPreview, type PreviewSlide } from "./product-preview";
import { dashboard, pool, records, roster, scores, trend } from "./preview-data";
import styles from "./preview.module.css";

const posts: BoardListPost[] = ["오늘 내전도 즐거웠어요", "이번 주말에 같이 게임하실 분?", "새로 가입한 여울입니다", "함께 연습하고 싶은 맵을 골라주세요", "어제 경기에서 가장 기억에 남는 순간"].map((title, i) => ({
  id: `landing-post-${i}`, title, content: "우리 클랜의 이야기를 나누는 예시 게시글입니다.", author: pool[i].nickname,
  created_at: "2026-10-30T09:00:00+09:00", details: {}, status: "published", image_path: null, commentCount: [8, 4, 12, 6, 3][i],
}));

export function getPreviewSlides(): (PreviewSlide & { content: ReactNode })[] {
  return [
    { id: "formation", label: "내전 편성", title: "우리 클랜의 금요일 내전", description: "참가자를 모으고, 팀을 나누고, 원하는 구성으로 조정합니다.", content:
      <ClanBalanceRosterEditor gameSlug="overwatch" clanId="landing-example" sessionId="landing-example" revision={0} initialRoster={roster} pool={pool} canEdit={false} scores={scores} showPlayerCardInfo={false} showPlayerSessionSummary={false} /> },
    { id: "home", label: "클랜 홈", title: "우리 클랜의 소식을 한눈에", description: "공지·투표·다가오는 일정과 지난달 MVP를 함께 봅니다.", content:
      <div inert><ClanDashboard model={dashboard} gameSlug="overwatch" clanId="landing-example" isPremium={false} actorRole="member" /></div> },
    { id: "events", label: "일정", title: "다음 만남을 준비하는 곳", description: "일정과 투표로 함께할 시간을 정하고 Discord 알림으로 소식을 전합니다.", content:
      <div inert><ClanEventsView gameSlug="overwatch" clanId="landing-example" serverNow={dashboard.now} events={dashboard.events} canManageEvents={false} planIsPremium={false} viewerUserId={null} myRsvpGoingKeys={[]} polls={[]} bracketTournaments={[]} /></div> },
    { id: "board", label: "게시판", title: "내전이 없는 날에도 함께", description: "게시판에서 이야기를 나누고, 추억 사진과 꾸미기로 우리만의 공간을 만듭니다.", content:
      <div inert><ClanBoardPosts base="/games/overwatch/clan/landing-example" gameSlug="overwatch" clanId="landing-example" kind="free" title="자유 게시판" posts={posts} total={posts.length} page={1} userId="landing-example" /></div> },
    { id: "stats", label: "통계", title: "함께한 시간이, 우리 클랜의 통계로", description: "참여 추이·개인 승률·명예의 전당으로 쌓인 기록을 돌아봅니다.", content:
      <div className={styles.statsScreen}><div className={styles.statsHeading}><h3>우리 클랜의 참여 추이</h3><span>2026년 7–10월 · 예시</span></div>
        <dl className={styles.statsTotals}><div><dt>개최 내전</dt><dd>24<span>회</span></dd></div><div><dt>완료 경기</dt><dd>120<span>경기</span></dd></div><div><dt>출전 멤버</dt><dd>18<span>명</span></dd></div></dl>
        <StatsTrend points={trend} label="완료 경기" unit="경기" /><p className={styles.graphHint}>마우스 또는 좌우 방향키로 월별 경기 수를 살펴보세요.</p>
      </div> },
    { id: "records", label: "경기 기록", title: "경기가 끝나도 기록은 이어집니다", description: "경기별 팀 구성과 결과, 멤버별 성적을 함께 살펴봅니다.", content:
      <ClanStatsArchive archive={{ datesKst: ["2026-10-30"], sampleByDate: { "2026-10-30": records } }} /> },
  ];
}

export function PreviewScreens() {
  return <ProductPreview slides={getPreviewSlides().map(({ id, label, title, description }) => ({ id, label, title, description }))} />;
}
