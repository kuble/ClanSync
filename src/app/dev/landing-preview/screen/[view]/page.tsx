import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Home, Scale, BarChart3, MessagesSquare, Calendar, Settings, Store, Globe2, UserRound, Bell } from "lucide-react";
import { ClanHero } from "@/components/main-clan/main-clan-shell";
import { HeaderBreadcrumbs } from "@/components/ui/header-breadcrumbs";
import type { MainClanContext } from "@/lib/clan/load-main-clan-context";
import shell from "@/components/main-clan/main-clan-shell.module.css";
import { getPreviewSlides } from "../../preview-screens";
import styles from "../../preview.module.css";

export const metadata: Metadata = { title: "클랜 전체 화면 예시 · ClanSync", robots: { index: false, follow: false } };
const ctx: MainClanContext = {
  clanId: "landing-example", clanName: "함께하는 우리 클랜", gameSlug: "overwatch", gameName: "오버워치",
  role: "leader", plan: "free", bannerUrl: null, iconUrl: null, memberCount: 18, pendingJoinRequestCount: 0,
  styleLabel: "친목", tags: ["함께 즐기는 게임"], canStartBalance: false, sidebarDots: { balance: false, events: false, manage: false },
};
const menu = [{ id: "home", label: "대시보드", icon: Home }, { id: "formation", label: "내전 로비", icon: Scale }, { id: "stats", label: "클랜 통계", icon: BarChart3 }, { id: "board", label: "게시판", icon: MessagesSquare }, { id: "events", label: "이벤트", icon: Calendar }, { id: "manage", label: "클랜 관리", icon: Settings }];

export default async function PreviewScreenPage({ params }: { params: Promise<{ view: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { view } = await params;
  const slide = getPreviewSlides().find((item) => item.id === view);
  if (!slide) notFound();
  const base = "/games/overwatch/clan/landing-example";
  // Reuse the product shell styling without mounting its live notifications or navigation.
  return <div className={`${shell.shell} ${styles.fullScreenExample}`}>
    <p className="sr-only">{slide.label}의 전체 페이지 예시입니다. {slide.description} 모든 이름과 수치는 가상의 예시이며 조작할 수 없습니다.</p>
    <div inert>
      <header className={shell.header}><HeaderBreadcrumbs items={[{ label: "오버워치", href: "/games/overwatch" }, { label: ctx.clanName, href: base }, { label: slide.label }]} /><span className={styles.exampleAccount}><span>예시 화면</span><Bell size={18} aria-hidden="true" /><span className={styles.exampleAvatar}>여</span></span></header>
      <aside className={shell.rail} aria-label="클랜 탐색"><div className={shell.nav}>{menu.map(({ id, label, icon: Icon }) => <span key={id} className={shell.navLink} aria-current={view === id || (view === "records" && id === "stats") ? "page" : undefined}><Icon aria-hidden="true" /><span className={shell.navText}>{label}</span></span>)}</div><div className={shell.bottom}>{[{ label: "클랜 스토어", icon: Store }, { label: "커뮤니티", icon: Globe2 }, { label: "프로필", icon: UserRound }].map(({ label, icon: Icon }) => <span key={label} className={shell.navLink}><Icon aria-hidden="true" /><span className={shell.navText}>{label}</span></span>)}</div></aside>
      <main className={`${shell.content} ${styles.exampleContent}`}><div className={shell.inner}><ClanHero ctx={ctx} basePath={base} showLobbyAction={false} /><div className={styles.examplePageHeading}><h2>{slide.title}</h2><span>{slide.label}</span></div><div className={styles.examplePageContent}>{slide.content}</div></div></main>
    </div>
  </div>;
}
