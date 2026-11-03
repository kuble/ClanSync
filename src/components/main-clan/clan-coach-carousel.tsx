"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import type { ClanCoach } from "@/lib/clan/coaching";

function subscribeMotion(notify: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
const motionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function ClanCoachDirectory({ coaches, userId, onRequest }: { coaches: ClanCoach[]; userId: string; onRequest: (id: string) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = coaches.find(coach => coach.userId === selectedId);
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
          <span className="flex w-full items-center gap-2.5"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><GraduationCap className="size-4" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{coach.name}</span><span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><span aria-hidden className={"size-1.5 rounded-full " + (coach.accepting ? "bg-primary" : "bg-muted-foreground")} />{coach.accepting ? "신청 가능" : "신청 잠시 중단"}</span></span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden /></span>
          <span className="block w-full truncate text-sm font-medium text-primary">{coach.expertise}</span>
          <span className="line-clamp-1 min-h-4 break-words text-xs text-muted-foreground">{coach.bio || "등록된 소개가 없습니다."}</span>
        </button>)}
      </div>

    </>}
    <Sheet open={!!selected} onOpenChange={open => { if (!open) setSelectedId(null); }}>
      <SheetContent className="gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]">
        <SheetHeader className="shrink-0 px-5 pb-5 pr-12"><SheetTitle>{selected?.name}</SheetTitle><SheetDescription>코칭 선생님 소개</SheetDescription></SheetHeader>
        {selected && <><div className="board-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pb-5"><section className="space-y-2"><h4 className="text-xs text-muted-foreground">전문 분야</h4><p className="whitespace-pre-wrap break-words text-sm font-medium leading-7 text-primary">{selected.expertise}</p></section><section className="space-y-2"><h4 className="text-xs text-muted-foreground">소개</h4><p className="whitespace-pre-wrap break-words text-sm leading-7">{selected.bio || "등록된 소개가 없습니다."}</p></section></div><div className="shrink-0 space-y-3 border-t px-5 py-4"><p className="text-xs text-muted-foreground">{selected.userId === userId ? "내 코칭 프로필입니다." : selected.accepting ? "이 선생님께 리플레이 피드백을 신청할 수 있습니다." : "현재 새 피드백 신청을 받지 않습니다."}</p><Button type="button" className="w-full" disabled={selected.userId === userId || !selected.accepting} aria-label={selected.name + " 선생님께 신청"} onClick={() => { setSelectedId(null); onRequest(selected.userId); }}>피드백 신청</Button></div></>}
      </SheetContent>
    </Sheet>
  </section>;
}
