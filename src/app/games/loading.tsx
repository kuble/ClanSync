import { Skeleton } from "@/components/ui/skeleton";
import styles from "@/components/entry/entry.module.css";

export default function GamesLoading() {
  return (
    <div className={styles.gamesPage}>
      <div className={styles.navbar} aria-hidden="true"><div className={styles.navbarInner}><Skeleton className="h-7 w-32" /><Skeleton className="h-10 w-16" /></div></div>
      <main className={styles.gamesContent} role="status" aria-label="게임 목록을 불러오는 중입니다.">
        <div className={styles.gameHeader} aria-hidden="true">
          <div><Skeleton className="h-11 w-36" /><Skeleton className="mt-2 h-6 w-64 max-w-full" /></div>
          <div className={styles.search}><Skeleton className="h-[46px] w-full rounded-[10px]" /></div>
        </div>
        <div className={styles.gameGroups} aria-hidden="true">
          <div>
            <Skeleton className="mb-4 h-4 w-24" />
            <div className={styles.gameGrid}>{[1, 2].map((i) => <div key={i} className={styles.gameCard}>
              <Skeleton className={styles.gameLogo} />
              <div className={styles.gameBody}><Skeleton className="h-7 w-28" /><Skeleton className="mt-2 h-4 w-40 max-w-full" /></div>
              <div className={styles.gameAction}><Skeleton className="h-5 w-24" /></div>
            </div>)}</div>
          </div>
          <div className={styles.upcomingGames}>
            <Skeleton className="mb-4 h-4 w-16" />
            <div className={styles.upcomingList}>{[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-[10px]" />)}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
