"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Cake,
  ChevronRight,
  Crown,
  Flame,
  Megaphone,
  ScrollText,
  ShieldCheck,
  Swords,
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
import { StorePremiumPlanDialog } from "@/components/main-clan/store-premium-plan-dialog";
import { listUpcomingOccurrenceStarts } from "@/lib/clan/expand-clan-event-occurrences";
import type { ClanMemberRole } from "@/lib/clan/permission-defaults";
import type {
  ClanDashboardModel,
  DashboardMvp,
  DashboardNotice,
} from "@/lib/clan/load-clan-dashboard";
import { cn } from "@/lib/utils";
import shellStyles from "./main-clan-shell.module.css";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const card = cn(
  "min-w-0 rounded-[18px] border border-border bg-card p-5",
  shellStyles.paperCard,
);
const cardHeading =
  "text-xs font-semibold tracking-[0.035em] text-muted-foreground";
const smallLink =
  "inline-flex shrink-0 items-center gap-1 rounded-[5px] border border-border bg-background/40 px-2.5 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

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
      <span className="mb-3 flex size-10 items-center justify-center rounded-[10px] border border-border/70 bg-muted/50 text-muted-foreground">
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
  onRead,
  href,
}: {
  notice: DashboardNotice;
  onRead: () => void;
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
        <span className="block truncate text-[13px] font-semibold text-foreground">
          {notice.title}
        </span>
        <span className="mt-1 block text-[11px] text-muted-foreground">
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
  const className =
    "flex w-full items-start gap-3 rounded-[10px] border-l-[3px] border-primary bg-muted/55 px-3.5 py-3 text-left transition hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  return notice.kind === "poll" ? (
    <Link href={href} className={className}>
      {contents}
    </Link>
  ) : (
    <button type="button" onClick={onRead} className={className}>
      {contents}
    </button>
  );
}

function UpcomingEvents({
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
            maxOccurrences: 4,
            maxMonths: 12,
          }).map((at) => ({ event, at })),
        )
        .sort((a, b) => a.at - b.at)
        .slice(0, 4)
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
    <div>
      {upcoming.map(({ event, at }) => {
        const date = new Date(at);
        const today = date.toDateString() === now.toDateString();
        return (
          <Link
            key={`${event.id}:${at}`}
            href={`${base}/events`}
            className="group flex items-center gap-3 border-b border-border py-3 first:pt-1 last:border-0 last:pb-0"
          >
            <span className="flex w-11 shrink-0 flex-col items-center rounded-[10px] bg-muted/70 py-1.5">
              <span className="text-lg font-bold leading-tight text-foreground">
                {date.getDate()}
              </span>
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                {String(date.getMonth() + 1).padStart(2, "0")}월
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold group-hover:text-primary">
                {event.title}
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("ko-KR", {
                  weekday: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }).format(date)}
                {event.place ? ` · ${event.place}` : ""}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 rounded-[5px] px-2 py-1 text-[10px] font-semibold",
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

function ClanBadges({ model }: { model: ClanDashboardModel }) {
  const created = new Date(model.createdAt);
  const anniversary = new Date(created);
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
  const dateLabel = (date: Date) =>
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
    }).format(date);
  const badges = [
    {
      name: "창단",
      Icon: Flame,
      unlocked: true,
      detail: dateLabel(created),
      hint: "클랜을 창단했어요",
      color: "text-primary",
    },
    {
      name: "내전 100회",
      Icon: Swords,
      unlocked:
        model.completedIntraCount != null && model.completedIntraCount >= 100,
      detail:
        model.completedIntraCount == null
          ? "기록 확인 필요"
          : `${Math.min(model.completedIntraCount, 100)} / 100`,
      hint: "완료된 내전 100회 달성",
      color: "text-primary",
    },
    {
      name: "내전 500회",
      Icon: ShieldCheck,
      unlocked:
        model.completedIntraCount != null && model.completedIntraCount >= 500,
      detail:
        model.completedIntraCount == null
          ? "기록 확인 필요"
          : `${Math.min(model.completedIntraCount, 500)} / 500`,
      hint: "완료된 내전 500회 달성",
      color: "text-primary",
    },
    {
      name: "1주년",
      Icon: Cake,
      unlocked: anniversary.getTime() <= new Date(model.now).getTime(),
      detail: dateLabel(anniversary),
      hint: "창단 1주년을 함께해요",
      color: "text-primary",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {badges.map(({ name, Icon, unlocked, detail, hint, color }) => (
        <div
          key={name}
          title={hint}
          className={cn(
            "flex min-w-0 flex-col items-center rounded-[10px] border border-border bg-muted/35 px-2 py-3 text-center",
            !unlocked && "bg-muted/15",
          )}
        >
          <Icon
            className={cn(
              "mb-2 size-6",
              unlocked ? color : "text-muted-foreground/40",
            )}
            aria-hidden="true"
          />
          <span
            className={cn(
              "text-[11px] font-semibold",
              unlocked ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {name}
          </span>
          <span className="mt-1 text-[10px] text-muted-foreground">
            {detail}
          </span>
          <span className="mt-1 text-[9px] text-muted-foreground">
            {unlocked ? "달성" : "미달성"}
          </span>
        </div>
      ))}
    </div>
  );
}

function MvpCard({
  title,
  value,
  icon: Icon,
  tone,
  model,
  premiumLocked = false,
  onUpgrade,
}: {
  title: string;
  value: DashboardMvp | null;
  icon: typeof Trophy;
  tone: string;
  model: ClanDashboardModel;
  premiumLocked?: boolean;
  onUpgrade?: () => void;
}) {
  return (
    <section
      className={cn(card, "relative flex min-h-48 flex-col")}
      aria-label={title}
    >
      <h3 className={cardHeading}>{title}</h3>
      {premiumLocked ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
          <Crown className="size-7 text-primary" aria-hidden="true" />
          <p className="text-[13px] font-bold text-primary">
            Premium 전용
          </p>
          <p className="text-xs text-muted-foreground">
            우리 클랜의 예측왕을 만나보세요.
          </p>
          <button
            type="button"
            onClick={onUpgrade}
            className="mt-1 rounded-[5px] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-[#ead6a7]"
          >
            Premium 알아보기
          </button>
        </div>
      ) : value ? (
        <div className="mt-5 flex items-center gap-3.5">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white",
              tone,
            )}
          >
            {value.nickname.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold">
              {value.nickname}
              {value.tiedCount > 1 ? (
                <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                  외 {value.tiedCount - 1}명 공동
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {value.detail}
            </p>
            <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-[5px] border border-primary/20 bg-primary/8 px-2.5 py-1.5 text-[11px] font-semibold text-primary">
              <Icon className="size-3.5" aria-hidden="true" />
              {value.highlight}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-3.5 py-5">
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
      {!premiumLocked && (
        <p className="mt-auto border-t border-border/70 pt-2 text-[10px] text-muted-foreground">
          {model.previousMonth} · 내전 기록 기준
        </p>
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
}: {
  model: ClanDashboardModel;
  gameSlug: string;
  clanId: string;
  isPremium: boolean;
  actorRole: ClanMemberRole;
}) {
  const base = `/games/${gameSlug}/clan/${clanId}`;
  const [reading, setReading] = useState<{
    title: string;
    content: string;
    description: string;
  } | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const readRules = () =>
    setReading({
      title: "클랜 규칙",
      content: model.rules ?? "",
      description: "함께 즐기기 위한 우리 클랜의 약속",
    });
  return (
    <>
      <h2 className="sr-only">클랜 대시보드</h2>
      <div
        className="grid grid-cols-1 items-stretch gap-4 min-[900px]:grid-cols-3"
        data-testid="clan-dashboard-grid"
      >
        <section
          className={cn(card, "min-[900px]:col-span-2")}
          aria-labelledby="dashboard-notices-heading"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 id="dashboard-notices-heading" className={cardHeading}>
              클랜 공지사항
            </h3>
            {actorRole !== "member" && (
              <Link href={`${base}/manage?tab=overview#notices`} className={smallLink}>
                공지 관리
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            )}
          </div>
          {model.errors.notices ? (
            <EmptyCard
              icon={Megaphone}
              title="공지사항을 불러오지 못했어요"
              description="잠시 후 새로고침해 주세요."
            />
          ) : model.notices.length ? (
            <div className="max-h-72 space-y-2.5 overflow-y-auto">
              {model.notices.map((notice) => (
                <NoticeRow
                  key={`${notice.kind}:${notice.id}`}
                  notice={notice}
                  href={`${base}/events?tab=polls`}
                  onRead={() =>
                    setReading({
                      title: notice.title,
                      content: notice.content,
                      description: "클랜 공지사항",
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyCard
              icon={Megaphone}
              title="새로운 공지사항이 없어요"
              description="클랜의 중요한 소식과 함께 참여할 투표를 이곳에서 확인하세요."
            />
          )}
        </section>
        <section className={card} aria-labelledby="dashboard-rules-heading">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 id="dashboard-rules-heading" className={cardHeading}>
              클랜 규칙
            </h3>
            {actorRole !== "member" ? (
              <Link href={`${base}/manage?tab=overview#rules`} className={smallLink}>편집</Link>
            ) : model.rules ? (
              <button type="button" className={smallLink} onClick={readRules}>
                전체 보기
              </button>
            ) : null}
          </div>
          {model.rules ? (
            <button
              type="button"
              aria-label="클랜 규칙 전체 보기"
              onClick={readRules}
              className="max-h-56 w-full overflow-y-auto whitespace-pre-wrap break-words rounded-[10px] p-1 text-left text-[13px] leading-7 text-foreground/80 transition hover:bg-muted/50"
            >
              {model.rules}
            </button>
          ) : (
            <EmptyCard
              icon={ScrollText}
              title="등록된 규칙이 없어요"
              description="서로를 배려하는 즐거운 클랜을 함께 만들어가요."
            />
          )}
        </section>
        <section
          className={cn(card, "min-[900px]:col-span-2")}
          aria-labelledby="dashboard-events-heading"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 id="dashboard-events-heading" className={cardHeading}>
              다가오는 일정
            </h3>
            <Link href={`${base}/events`} className={smallLink}>
              이벤트
              <ChevronRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
          <UpcomingEvents model={model} base={base} />
        </section>
        <section className={card} aria-labelledby="dashboard-badges-heading">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 id="dashboard-badges-heading" className={cardHeading}>
              클랜 배지
            </h3>
            <Trophy
              className="size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <ClanBadges model={model} />
        </section>
        <MvpCard
          title="지난달 승률 MVP"
          icon={Target}
          tone="bg-[#65573a]"
          value={model.mvp.winRate}
          model={model}
        />
        <MvpCard
          title="지난달 참여율 MVP"
          icon={Users}
          tone="bg-[#65573a]"
          value={model.mvp.participation}
          model={model}
        />
        <MvpCard
          title="지난달 승부예측 MVP"
          icon={Trophy}
          tone="bg-[#65573a]"
          value={model.mvp.prediction}
          model={model}
          premiumLocked={!isPremium}
          onUpgrade={() => setPremiumOpen(true)}
        />
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
