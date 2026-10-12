import { Cake, Flame, ShieldCheck, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

export function ClanBadges({ createdAt, completedIntraCount, now, className }: {
  createdAt: string; completedIntraCount: number | null; now: string; className?: string;
}) {
  const created = new Date(createdAt);
  const anniversary = new Date(created);
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
  const dateLabel = (date: Date) => new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit",
  }).format(date);
  const badges = [
    { name: "창단", Icon: Flame, unlocked: true, detail: dateLabel(created), hint: "클랜을 창단했어요", color: "text-orange-500" },
    ...[{ count: 100, Icon: Swords, color: "text-primary" }, { count: 500, Icon: ShieldCheck, color: "text-violet-500" }].map(({ count, Icon, color }) => ({
      name: `내전 ${count}회`, Icon, color,
      unlocked: completedIntraCount != null && completedIntraCount >= count,
      detail: completedIntraCount == null ? "기록 확인 필요" : `${Math.min(completedIntraCount, count)} / ${count}`,
      hint: `종료된 정규 내전 ${count}회 달성`,
    })),
    { name: "1주년", Icon: Cake, unlocked: anniversary.getTime() <= new Date(now).getTime(), detail: dateLabel(anniversary), hint: "창단 1주년을 함께해요", color: "text-rose-500" },
  ];
  return <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
    {badges.map(({ name, Icon, unlocked, detail, hint, color }) => <div key={name} title={hint}
      className={cn("flex min-w-0 flex-col items-center rounded-lg border border-border bg-muted/35 px-2 py-4 text-center", !unlocked && "bg-muted/15")}>
      <Icon className={cn("mb-2 size-6", unlocked ? color : "text-muted-foreground/40")} aria-hidden />
      <span className={cn("text-xs font-semibold", unlocked ? "text-foreground" : "text-muted-foreground")}>{name}</span>
      <span className="mt-1 text-[11px] tabular-nums text-muted-foreground">{detail}</span>
      <span className="mt-1 text-[10px] text-muted-foreground">{unlocked ? "달성" : "미달성"}</span>
    </div>)}
  </div>;
}
