import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Megaphone,
  Search,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  LfgRowOut,
  PromoRow,
  RankClanRow,
  ScrimRoomRowOut,
} from "@/lib/main-game/load-main-game-hub";
import type { MainGameCommunityTab } from "@/lib/main-game/main-game-community-tab";
import styles from "./community.module.css";

export function CommunityHome({
  gameSlug,
  promos,
  lfgs,
  ranks,
  scrims,
  onNavigate,
}: {
  gameSlug: string;
  promos: PromoRow[];
  lfgs: LfgRowOut[];
  ranks: RankClanRow[];
  scrims: ScrimRoomRowOut[];
  onNavigate: (tab: MainGameCommunityTab) => void;
}) {
  const openScrims = scrims.filter(
    (s) => s.status === "draft" || s.status === "matched",
  );
  return (
    <div className={styles.homeGrid}>
      <section
        className={`${styles.card} ${styles.full}`}
        aria-labelledby="community-promos"
      >
        <header className={styles.cardHead}>
          <h2 id="community-promos">
            <Megaphone />
            클랜 홍보
          </h2>
          <span>함께할 클랜을 찾아보세요</span>
        </header>
        {promos.length ? (
          <div className={styles.promoGrid}>
            {promos.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/games/${encodeURIComponent(gameSlug)}/board/${p.id}`}
                className={styles.promoCard}
              >
                <div className={styles.cardHead}>
                  <span className={styles.clanMark}>
                    <Shield />
                  </span>
                  <span>
                    <Users size={13} />
                    {p.active_members}/{p.max_members}명
                  </span>
                </div>
                <h3>{p.clan_name}</h3>
                <p>{p.title}</p>
                <span className={styles.promoCta}>
                  모집글 보기 <ArrowUpRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            text="아직 등록된 클랜 홍보가 없어요"
            sub="우리 클랜을 소개하고 새로운 클랜원을 만나보세요."
          />
        )}
        <Button
          variant="secondary"
          className={styles.more}
          onClick={() => onNavigate("promo")}
        >
          클랜 홍보 전체 보기 <ArrowUpRight />
        </Button>
      </section>
      <section
        className={`${styles.card} ${styles.full}`}
        aria-labelledby="community-scrims"
      >
        <header className={styles.cardHead}>
          <h2 id="community-scrims">
            <CalendarDays />
            스크림 모집 중
          </h2>
          <span>다른 클랜과 함께하는 한 경기</span>
        </header>
        {openScrims.length ? (
          <div className={styles.scrimGrid}>
            {openScrims.slice(0, 3).map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.scrimCard}
                onClick={() => onNavigate("scrim")}
              >
                <span className={styles.status}>
                  {s.status === "draft" ? "상대 모집 중" : "일정 조율 중"}
                </span>
                <strong>{s.title || `${s.clan_a_name}의 스크림`}</strong>
                <span>
                  {s.clan_a_name} <b>vs</b> {s.clan_b_name || "상대 클랜"}
                </span>
                <small>
                  {new Date(s.scheduled_at).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · KST
                </small>
              </button>
            ))}
          </div>
        ) : (
          <Empty
            text="모집 중인 스크림이 없어요"
            sub="상대 클랜을 찾고 함께 일정을 정해보세요."
          />
        )}
        <Button
          variant="secondary"
          className={styles.more}
          onClick={() => onNavigate("scrim")}
        >
          스크림 전체 보기 <ArrowUpRight />
        </Button>
      </section>
      <section className={styles.card} aria-labelledby="community-lfgs">
        <header className={styles.cardHead}>
          <h2 id="community-lfgs">
            <Search />
            같이 할 사람
          </h2>
        </header>
        <p className={styles.subtitle}>모집 마감이 가까운 파티</p>
        {lfgs.length ? (
          <ul className={styles.previewList}>
            {lfgs.slice(0, 4).map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => onNavigate("lfg")}>
                  <span className={styles.avatar}>
                    {l.creator_nickname.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{l.creator_nickname}</strong>
                    <small>
                      {l.mode} · {l.format}
                    </small>
                  </span>
                  <em>{l.slots}명 모집</em>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            text="같이할 팀원을 기다리고 있어요"
            sub="파티를 모집하고 함께 플레이하세요."
          />
        )}
        <Button
          variant="secondary"
          className={styles.more}
          onClick={() => onNavigate("lfg")}
        >
          같이 할 사람 전체 보기 <ArrowUpRight />
        </Button>
      </section>
      <section className={styles.card} aria-labelledby="community-ranks">
        <header className={styles.cardHead}>
          <h2 id="community-ranks">
            <Trophy />
            활동 중인 클랜
          </h2>
        </header>
        <p className={styles.subtitle}>최근 활동 순</p>
        {ranks.length ? (
          <ol className={styles.previewList}>
            {ranks.slice(0, 4).map((r, i) => (
              <li key={r.id}>
                <button type="button" onClick={() => onNavigate("rank")}>
                  <span className={styles.rank}>{i + 1}</span>
                  <span className={styles.avatar}>{r.name.slice(0, 1)}</span>
                  <strong>{r.name}</strong>
                  <em>{r.active_members}명</em>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <Empty
            text="활동 기록을 기다리고 있어요"
            sub="플레이가 쌓이면 클랜의 활동을 확인할 수 있어요."
          />
        )}
        <Button
          variant="secondary"
          className={styles.more}
          onClick={() => onNavigate("rank")}
        >
          클랜 활동 전체 보기 <ArrowUpRight />
        </Button>
      </section>
    </div>
  );
}

function Empty({ text, sub }: { text: string; sub: string }) {
  return (
    <div className={styles.empty}>
      <p>{text}</p>
      <span>{sub}</span>
    </div>
  );
}
