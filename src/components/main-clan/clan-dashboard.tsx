"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import {
  CalendarDays,
  ChevronRight,
  Crown,
  Megaphone,
  Target,
  Trophy,
  Users,
  Vote,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClanRulesTicker } from "@/components/main-clan/clan-rules-ticker";
import { formatPercent } from "@/lib/format-percent";
import { StorePremiumPlanDialog } from "@/components/main-clan/store-premium-plan-dialog";
import { listUpcomingOccurrenceStarts } from "@/lib/clan/expand-clan-event-occurrences";
import type { ClanMemberRole } from "@/lib/clan/permission-defaults";
import type {
  ClanDashboardModel,
  DashboardMvp,
  DashboardNotice,
} from "@/lib/clan/load-clan-dashboard";
import { cn } from "@/lib/utils";
import styles from "./clan-dashboard.module.css";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const card =
  "relative min-w-0 rounded-xl border border-border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)]";
const cardHeading =
  "text-[15px] font-bold leading-6 tracking-tight text-foreground";
const headingLink = "flex min-h-6 w-full items-center gap-1.5 rounded-sm transition-colors hover:text-primary after:absolute after:inset-0 after:z-10 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary";

function DashboardHeading({ id, href, title }: { id: string; href: string; title: string }) {
  return <h3 id={id} className={cn(cardHeading, "mb-3")}><Link href={href} className={headingLink}>{title}<ChevronRight className="size-4 shrink-0" aria-hidden="true" /></Link></h3>;
}

function EmptyCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Megaphone;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center px-2 py-5 text-center">
      <span className="mb-3 flex size-10 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 max-w-64 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function NoticeRow({
  notice,
  href,
}: {
  notice: DashboardNotice;
  href: string;
}) {
  const contents = (
    <>
      <span className="mt-0.5 text-primary">
        {notice.kind === "poll" ? (
          <Vote className="size-4" aria-hidden="true" />
        ) : (
          <Megaphone className="size-4" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-semibold leading-6 text-foreground">
          {notice.title}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {notice.kind === "poll" ? "참여 중인 투표" : "클랜 공지"}
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          {new Intl.DateTimeFormat("ko-KR", {
            timeZone: "Asia/Seoul",
            month: "long",
            day: "numeric",
          }).format(new Date(notice.createdAt))}
        </span>
      </span>
      <ChevronRight
        className="mt-1 size-3.5 text-muted-foreground"
        aria-hidden="true"
      />
    </>
  );
  const className = cn(
    "relative z-20 flex w-full items-start gap-3 rounded-lg border border-transparent bg-muted/45 px-3 py-2.5 min-h-16 text-left transition hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    notice.isPinned && "border-primary/25 bg-primary/5",
  );
  return (
    <Link href={href} className={className}>
      {contents}
    </Link>
  );
}

function UpcomingEvents(props: { model: ClanDashboardModel; base: string }) {
  return <div role="region" className="min-h-52 min-w-0 flex-1" aria-label="다가오는 일정 목록"><UpcomingEventsContent {...props} /></div>;
}

function UpcomingEventsContent({
  model,
  base,
}: {
  model: ClanDashboardModel;
  base: string;
}) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const now = new Date(model.now);
  // Repeating events use the member's local timezone, as in the calendar.
  const upcoming = ready
    ? model.events
        .flatMap((event) =>
          listUpcomingOccurrenceStarts(event, now, {
            maxOccurrences: 3,
            maxMonths: 12,
          }).map((at) => ({ event, at })),
        )
        .sort((a, b) => a.at - b.at)
        .slice(0, 3)
    : [];
  if (model.errors.events)
    return (
      <EmptyCard
        icon={CalendarDays}
        title="일정을 불러오지 못했어요"
        description="잠시 후 새로고침해 주세요."
      />
    );
  if (!ready)
    return (
      <div
        className="flex min-h-44 items-center justify-center text-xs text-muted-foreground"
        role="status"
      >
        일정을 불러오는 중이에요.
      </div>
    );
  if (upcoming.length === 0)
    return (
      <EmptyCard
        icon={CalendarDays}
        title="다가오는 일정이 없어요"
        description="함께할 내전과 모임이 등록되면 여기에 표시돼요."
      />
    );
  return (
    <div className="grid gap-2">
      {upcoming.map(({ event, at }) => {
        const date = new Date(at);
        const today = date.toDateString() === now.toDateString();
        return (
          <Link
            key={`${event.id}:${at}`}
            href={`${base}/events`}
            className="group relative z-20 flex min-h-16 items-center gap-3 rounded-lg border border-transparent bg-muted/45 px-3 py-2.5 transition hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className={cn("flex w-10 shrink-0 flex-col items-center rounded-lg py-1", today ? "bg-primary/10" : "bg-muted/70")}>
              <span className="text-[10px] leading-3 text-muted-foreground">
                {String(date.getMonth() + 1).padStart(2, "0")}월
              </span>
              <span className="mt-0.5 text-lg font-bold leading-5 text-foreground">
                {date.getDate()}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span data-event-title className="block break-words text-sm font-semibold leading-6 group-hover:text-primary">
                {event.title}
              </span>
              <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <time dateTime={date.toISOString()} className="shrink-0 whitespace-nowrap font-medium text-foreground/80">{new Intl.DateTimeFormat("ko-KR", {
                  weekday: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }).format(date)}</time>
                {event.place && <span className="break-words">{event.place}</span>}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-xs font-semibold",
                today
                  ? "bg-primary/12 text-primary"
                  : event.kind === "scrim"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {today
                ? "오늘"
                : event.source === "scrim_auto"
                  ? "확정"
                  : event.kind === "intra"
                    ? "내전"
                    : event.kind === "scrim"
                      ? "스크림"
                      : "이벤트"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function MvpPlace({ value, position }: { value: DashboardMvp | undefined; position: number }) {
  const rank = value?.rank ?? position;
  const displayName = value?.nickname;
  const percentage = formatPercent(value?.percentage);
  return (
    <li className={cn(styles.mvpPlace, !value && styles.mvpMissing)} data-rank={rank} aria-label={value ? `${value.tiedCount > 1 ? "공동 " : ""}${rank}위 ${displayName}` : `${position}위 기록 없음`}>
      <span className={styles.mvpRank} data-mvp-rank aria-hidden="true">{rank}</span>
      <p className={styles.mvpName} data-mvp-name>{displayName ?? "—"}</p>
      <p className={styles.mvpValue} data-mvp-value>
        {percentage.endsWith("%") ? <>{percentage.slice(0, -1)}<span>%</span></> : percentage}
      </p>
      {value && rank === 1 && <Trophy className={styles.mvpTrophy} aria-hidden="true" />}
    </li>
  );
}

function MvpCard({
  title,
  values,
  icon: Icon,
  model,
  premiumLocked = false,
  onUpgrade,
  href,
}: {
  title: string;
  values: DashboardMvp[];
  icon: typeof Trophy;
  model: ClanDashboardModel;
  premiumLocked?: boolean;
  onUpgrade?: () => void;
  href: string;
}) {
  return (
    <section
      className={cn(card, styles.mvpCard)}
      aria-label={title}
    >
      <h4><Link href={href} className={cn(headingLink, styles.mvpHeading)}><Icon className={styles.mvpCategoryIcon} aria-hidden="true" />{title}<ChevronRight className={styles.mvpArrow} aria-hidden="true" /></Link></h4>
      {premiumLocked ? (
        <div className={cn(styles.mvpStatus, "flex flex-wrap content-center items-center gap-x-2 gap-y-1.5")}>
          <Crown className="size-5 shrink-0 text-amber-500" aria-hidden="true" />
          <p className="text-[13px] font-bold text-amber-700 dark:text-amber-300">
            Premium 전용
          </p>
          <p className="order-last w-full text-xs text-muted-foreground">
            우리 클랜의 예측왕을 만나보세요.
          </p>
          <button
            type="button"
            onClick={onUpgrade}
            className={styles.mvpPremiumButton}
          >
            Premium 알아보기
          </button>
        </div>
      ) : values.length ? (
        <ol className={styles.mvpPlaces} aria-label={`${title} 순위`}>{[0, 1, 2].map(index => <MvpPlace key={index} value={values[index]} position={index + 1} />)}</ol>
      ) : (
        <div className={cn(styles.mvpStatus, "flex items-center gap-3.5")}>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground/50">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[13px] font-semibold">
              {model.errors.rankings
                ? "순위를 불러오지 못했어요"
                : "아직 선정된 MVP가 없어요"}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {model.errors.rankings
                ? "잠시 후 다시 확인해 주세요."
                : `${model.previousMonth}의 기록에서 선정 기준을 충족한 멤버가 없어요.`}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export function ClanDashboard({
  model,
  gameSlug,
  clanId,
  isPremium,
  actorRole,
  initialNotice,
}: {
  model: ClanDashboardModel;
  gameSlug: string;
  clanId: string;
  isPremium: boolean;
  actorRole: ClanMemberRole;
  initialNotice?: { title: string; content: string };
}) {
  const base = `/games/${gameSlug}/clan/${clanId}`;
  const [reading, setReading] = useState<{
    title: string;
    content: string;
    description: string;
  } | null>(initialNotice ? { ...initialNotice, description: "클랜 공지사항" } : null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  return (
    <>
      <h2 className="sr-only">클랜 대시보드</h2>
      <ClanRulesTicker rules={model.rules} failed={model.errors.rules} href={`${base}/board/notices#rules`} />
      <div className={styles.bento} data-testid="clan-dashboard-grid">
        <section
          className={cn(card, styles.notices)}
          aria-labelledby="dashboard-notices-heading"
        >
          <DashboardHeading id="dashboard-notices-heading" href={`${base}/board/notices`} title="클랜 공지사항" />
          {model.errors.notices ? (
            <EmptyCard
              icon={Megaphone}
              title="공지사항을 불러오지 못했어요"
              description="잠시 후 새로고침해 주세요."
            />
          ) : model.notices.length ? (
            <ul aria-label="최근 클랜 공지" className="space-y-2">
              {model.notices.map((notice) => (
                <li key={`${notice.kind}:${notice.id}`}>
                <NoticeRow
                  notice={notice}
                  href={notice.kind === "poll" ? `${base}/events?tab=polls` : `${base}/board/notices/${notice.id}`}
                />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyCard
              icon={Megaphone}
              title="새로운 공지사항이 없어요"
              description="클랜의 중요한 소식과 함께 참여할 투표를 이곳에서 확인하세요."
            />
          )}
        </section>
        <section
          className={cn(card, styles.events, "flex flex-col")}
          aria-labelledby="dashboard-events-heading"
        >
          <DashboardHeading id="dashboard-events-heading" href={`${base}/events`} title="다가오는 일정" />
          <UpcomingEvents model={model} base={base} />
        </section>
        <section className={styles.mvps} aria-label="지난달 MVP">
          <div className={styles.mvpGrid}>
            <MvpCard
              href={`${base}/stats`}
              title="지난달 승률 MVP"
              icon={Target}
              values={model.mvp.winRate}
              model={model}
            />
            <MvpCard
              href={`${base}/stats`}
              title="지난달 참여율 MVP"
              icon={Users}
              values={model.mvp.participation}
              model={model}
            />
            <MvpCard
              href={`${base}/stats`}
              title="지난달 승부예측 MVP"
              icon={Trophy}
              values={model.mvp.prediction}
              model={model}
              premiumLocked={!isPremium}
              onUpgrade={() => setPremiumOpen(true)}
            />
          </div>
        </section>
      </div>
      <Dialog
        open={reading !== null}
        onOpenChange={(open) => {
          if (!open) setReading(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="pr-6 leading-relaxed">
              {reading?.title}
            </DialogTitle>
            <DialogDescription>{reading?.description}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7">
            {reading?.content}
          </div>
        </DialogContent>
      </Dialog>
      <StorePremiumPlanDialog
        open={premiumOpen}
        onOpenChange={setPremiumOpen}
        actorRole={actorRole}
        gameSlug={gameSlug}
        clanId={clanId}
      />
    </>
  );
}
