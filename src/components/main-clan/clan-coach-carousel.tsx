"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ArrowUpRight, ChevronLeft, ChevronRight, Medal } from "lucide-react";
import { ClanPlayerAvatar } from "@/components/profile/clan-namecards";
import { Badge } from "@/components/ui/badge";
import { OverwatchRoleIcon } from "@/components/ui/overwatch-icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { coachRoleLabel, coachTierLabel, type ClanCoach } from "@/lib/clan/coaching";

function subscribeMotion(notify: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
const motionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const rankIcons = new Set(["bronze", "silver", "gold", "plat", "emerald", "diamond", "master", "gm", "champion"]);
function TierIcon({ tier }: { tier: string }) {
  return rankIcons.has(tier) ? <Image unoptimized src={`/images/overwatch/icons/rank-${tier}.webp`} alt="" width={20} height={20} className="size-5 shrink-0 object-contain" /> : <Medal className="size-4" aria-hidden />;
}
function coachIconRole(role: string) {
  return role === "tank" ? "tank" : role === "dmg" ? "damage" : role === "sup" ? "support" : "flex";
}
function CoachTags({ coach }: { coach: ClanCoach }) {
  const role = coachIconRole(coach.role);
  const first = coach.tier[0], last = coach.tier[coach.tier.length - 1];
  const tagClass = "h-auto min-h-7 gap-1 rounded-md bg-muted/30 px-2 text-[10px] font-medium";
  return <span className="flex max-w-full flex-wrap items-center gap-1.5">
    <Badge variant="outline" className={tagClass} aria-label={`역할: ${coachRoleLabel(coach.role)}`}><OverwatchRoleIcon role={role} className="size-3.5" />{coachRoleLabel(coach.role)}</Badge>
    <Badge variant="outline" className={tagClass} aria-label={`티어: ${coachTierLabel(coach.tier)}`}>
      {!first ? <><Medal className="size-4" aria-hidden />전체</> : <><TierIcon tier={first} />{coachTierLabel([first])}{last !== first && <><span className="px-0.5 text-muted-foreground" aria-hidden>~</span><TierIcon tier={last} />{coachTierLabel([last])}</>}</>}
    </Badge>
  </span>;
}

export function ClanCoachDirectory({ coaches, userId, onRequest }: { coaches: ClanCoach[]; userId: string; onRequest: (id: string) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIndex = coaches.findIndex(coach => coach.userId === selectedId);
  const selected = coaches[selectedIndex];
  function navigateCoach(step: number) {
    const index = (selectedIndex + step + coaches.length) % coaches.length;
    setSelectedId(coaches[index].userId);
  }
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, motionSnapshot, () => false);
  const autoEnabled = !reducedMotion;

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let lastWheel = -Infinity;
    function wheel(event: WheelEvent) {
      if (!el || event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const direction = Math.sign(event.deltaY);
      const canMove = direction > 0 ? el.scrollLeft + el.clientWidth < el.scrollWidth - 2 : el.scrollLeft > 2;
      if (!canMove) return;
      event.preventDefault();
      if (event.timeStamp - lastWheel < 300) return;
      lastWheel = event.timeStamp;
      el.scrollBy({ left: direction * ((el.firstElementChild?.getBoundingClientRect().width ?? 280) + 12), behavior: reducedMotion ? "instant" : "smooth" });
    }
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [coaches, reducedMotion]);

  useEffect(() => {
    if (!autoEnabled || hovered || selected || coaches.length < 2) return;
    const timer = window.setInterval(() => {
      const el = track.current;
      if (!el || root.current?.contains(document.activeElement) || document.visibilityState !== "visible" || el.scrollWidth <= el.clientWidth + 2) return;
      const step = (el.firstElementChild?.getBoundingClientRect().width ?? 280) + 12;
      el.scrollTo({ left: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 ? 0 : el.scrollLeft + step, behavior: reducedMotion ? "instant" : "smooth" });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [autoEnabled, hovered, selected, coaches.length, reducedMotion]);

  return <section ref={root} className="min-w-0 space-y-1.5" aria-label="코칭 선생님" aria-roledescription="캐러셀"
    onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(true); }} onPointerLeave={() => setHovered(false)}
    onPointerDown={event => { if (event.pointerType !== "mouse") setHovered(true); }} onPointerUp={event => { if (event.pointerType !== "mouse") setHovered(false); }} onPointerCancel={() => setHovered(false)}>
    {!coaches.length ? <p className="py-5 text-center text-sm text-muted-foreground">아직 등록된 선생님이 없습니다.</p> : <>
      <div ref={track} tabIndex={0} aria-label="코칭 선생님 목록" className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-ring">
        {coaches.map(coach => <button key={coach.userId} type="button" onClick={() => setSelectedId(coach.userId)} aria-label={coach.name + " 선생님 소개 보기"}
          className="group flex w-[280px] max-w-[90%] shrink-0 snap-start flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring">
          <span className="flex w-full items-center gap-2.5"><ClanPlayerAvatar userId={coach.userId} label={coach.name} size={36} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{coach.name}</span><span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><span aria-hidden className={"size-1.5 rounded-full " + (coach.accepting ? "bg-primary" : "bg-muted-foreground")} />{coach.accepting ? "신청 가능" : "신청 잠시 중단"}</span></span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden /></span>
          <CoachTags coach={coach} />
        </button>)}
      </div>

    </>}
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelectedId(null); }}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        {selected && <>
          <div key={selected.userId} className="board-scroll min-h-0 overflow-y-auto">
            <DialogHeader className="relative isolate gap-5 overflow-hidden border-b bg-primary/10 px-6 pt-9 pb-6">
              <span aria-hidden className="pointer-events-none absolute -right-12 -bottom-10 -z-10 -rotate-12 text-primary/10">
                <OverwatchRoleIcon role={coachIconRole(selected.role)} className="size-48" />
              </span>
              <DialogDescription className="font-semibold text-foreground">코칭 선생님 소개</DialogDescription>
              <div className="flex items-center gap-4">
                <ClanPlayerAvatar userId={selected.userId} label={selected.name} size={64} />
                <div className="min-w-0 space-y-1">
                  <DialogTitle className="text-xl font-bold tracking-tight [overflow-wrap:anywhere]">{selected.name}</DialogTitle>
                  <p className="flex items-center gap-2 text-xs">
                    <span aria-hidden className={"size-2 rounded-full " + (selected.accepting ? "bg-primary" : "bg-muted-foreground")} />
                    {selected.accepting ? "신청 가능" : "신청 잠시 중단"}
                  </p>
                </div>
              </div>
              <CoachTags coach={selected} />
            </DialogHeader>
            <div className="space-y-7 p-6">
              <section className="space-y-2">
                <h3 className="text-base font-semibold">선생님 소개</h3>
                <p className="whitespace-pre-wrap text-sm leading-7 [overflow-wrap:anywhere]">{selected.bio || "등록된 소개가 없습니다."}</p>
              </section>
              <section className="space-y-2 rounded-lg bg-muted/40 p-4">
                <h3 className="text-base font-semibold">코칭 내용</h3>
                <p className="whitespace-pre-wrap text-sm leading-7 [overflow-wrap:anywhere]">{selected.expertise}</p>
              </section>
            </div>
          </div>
          <div className="shrink-0 space-y-2 border-t bg-card px-6 py-4">
            {selected.userId === userId && <p className="text-xs text-muted-foreground">내 코칭 프로필입니다.</p>}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="size-11" aria-label="이전 선생님"
                disabled={coaches.length < 2} onClick={() => navigateCoach(-1)}><ChevronLeft /></Button>
              <Button type="button" className="h-11 min-w-0 flex-1" disabled={selected.userId === userId || !selected.accepting}
              aria-label={selected.name + " 선생님께 신청"}
              onClick={() => { setSelectedId(null); onRequest(selected.userId); }}>
              피드백 신청 <ArrowUpRight aria-hidden className="size-4" />
              </Button>
              <Button type="button" variant="outline" className="size-11" aria-label="다음 선생님"
                disabled={coaches.length < 2} onClick={() => navigateCoach(1)}><ChevronRight /></Button>
            </div>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  </section>;
}
