"use client";
import { Switch } from "@/components/ui/switch";
import { HelpText } from "./help-text";
import { StatTooltip } from "./stat-help";
import {useLayoutEffect,useRef,useState,useTransition} from "react";
import {toast} from "sonner";
import {ArrowUpRight,ChevronLeft,ChevronRight,GraduationCap} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from "@/components/ui/sheet";
import {saveCoachProfileAction} from "@/app/actions/clan-board";
import type {ClanCoach} from "@/lib/clan/coaching";

export function ClanCoachDirectory({coaches,userId,onRequest}:{coaches:ClanCoach[];userId:string;onRequest:(id:string)=>void}){
  const track=useRef<HTMLDivElement>(null);
  const [edges,setEdges]=useState({start:true,end:true});
  useLayoutEffect(()=>{
    const el=track.current;if(!el)return;
    const update=()=>setEdges({start:el.scrollLeft<2,end:el.scrollLeft+el.clientWidth>=el.scrollWidth-2});
    update();el.addEventListener("scroll",update,{passive:true});
    const observer=new ResizeObserver(update);observer.observe(el);
    return()=>{el.removeEventListener("scroll",update);observer.disconnect();};
  },[coaches]);
  const move=(direction:number)=>{const el=track.current;if(el)el.scrollBy({left:direction*((el.firstElementChild?.getBoundingClientRect().width??280)+12),behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});};
  return <section className="min-w-0 space-y-2 rounded-xl border border-border bg-card p-3" aria-label="코칭 선생님" aria-roledescription="캐러셀">
    <div className="flex items-center justify-between gap-3"><h4 className="flex items-center gap-2 text-sm font-semibold"><GraduationCap className="size-4 text-primary" aria-hidden/><HelpText label="코칭 선생님" help="선생님을 골라 리플레이 피드백을 요청하십시오. 클랜원 누구나 선생님으로 등록할 수 있습니다." /></h4><div className="flex items-center gap-1"><span className="mr-2 text-xs tabular-nums text-muted-foreground">{coaches.length}명</span><Button type="button" variant="ghost" size="icon" className="size-8 rounded-full" aria-label="이전 선생님" disabled={edges.start} onClick={()=>move(-1)}><ChevronLeft className="size-4" aria-hidden/></Button><Button type="button" variant="ghost" size="icon" className="size-8 rounded-full" aria-label="다음 선생님" disabled={edges.end} onClick={()=>move(1)}><ChevronRight className="size-4" aria-hidden/></Button></div></div>
    {!coaches.length?<p className="py-5 text-center text-sm text-muted-foreground">아직 등록된 선생님이 없습니다.</p>:<div ref={track} tabIndex={0} aria-label="코칭 선생님 목록" className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-ring">{coaches.map(c=><article key={c.userId} className="flex w-[280px] max-w-[90%] shrink-0 snap-start flex-col gap-2 rounded-xl border border-border bg-background/30 p-3 transition-colors hover:bg-muted/40"><div className="flex items-center gap-2.5"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><GraduationCap className="size-4" aria-hidden/></div><div className="min-w-0 flex-1"><h5 className="truncate text-sm font-semibold">{c.name}</h5><p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><span aria-hidden className={"size-1.5 rounded-full "+(c.accepting?"bg-primary":"bg-muted-foreground")}/>{c.accepting?"신청 가능":"신청 잠시 중단"}</p></div>{c.userId!==userId&&<StatTooltip label={c.name+" 선생님께 신청"} description="이 선생님께 피드백을 신청합니다." render={<Button type="button" size="icon" variant="ghost" className="size-8 shrink-0 rounded-full" disabled={!c.accepting} onClick={()=>onRequest(c.userId)} aria-label={c.name+" 선생님께 신청"}/>}><ArrowUpRight className="size-4" aria-hidden/></StatTooltip>}</div><p className="truncate text-sm font-medium text-primary">{c.expertise}</p><p className="line-clamp-1 min-h-4 break-words text-xs text-muted-foreground">{c.bio||"등록된 소개가 없습니다."}</p></article>)}</div>}
  </section>;
}
export function CoachEditor({mine,gameSlug,clanId,onClose}:{mine?:ClanCoach;gameSlug:string;clanId:string;onClose:()=>void}){
  const [pending,start]=useTransition();
  const [expertise,setExpertise]=useState(mine?.expertise??""),[bio,setBio]=useState(mine?.bio??""),[accepting,setAccepting]=useState(mine?.accepting??true);
  return <Sheet open onOpenChange={v=>{if(!v&&!pending)onClose();}}><SheetContent showCloseButton={!pending} className="gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]"><SheetHeader className="shrink-0 px-5 pb-5 pr-12"><SheetTitle>{mine?"내 코칭 프로필":"코칭 선생님 등록"}</SheetTitle><SheetDescription>전문 분야와 소개는 클랜 내부에 공개됩니다. 신청을 잠시 중단해도 기존 요청은 남습니다.</SheetDescription></SheetHeader><form className="flex min-h-0 flex-1 flex-col" onSubmit={e=>{e.preventDefault();start(async()=>{try{const r=await saveCoachProfileAction(gameSlug,clanId,{expertise,bio,accepting});if(!r.ok){toast.error(r.error);return;}toast.success("코칭 프로필을 저장했습니다.");onClose();}catch{toast.error("저장하지 못했습니다. 입력 내용은 유지됩니다.");}});}}><fieldset disabled={pending} className="board-scroll min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-5"><div className="space-y-2"><Label htmlFor="coach-expertise">코칭 분야·역할·영웅</Label><Input id="coach-expertise" value={expertise} onChange={e=>setExpertise(e.target.value)} required maxLength={100} disabled={pending} placeholder="지원 · 아나 · 위치 선정"/></div><div className="space-y-2"><Label htmlFor="coach-bio">선생님 소개</Label><textarea id="coach-bio" value={bio} onChange={e=>setBio(e.target.value)} maxLength={1000} rows={4} disabled={pending} className="board-scroll max-h-64 w-full resize-y rounded-lg border border-input bg-background p-4 text-base leading-7 sm:text-sm"/></div><label className="flex items-center justify-between gap-3 text-sm">피드백 신청 받기<Switch checked={accepting} onChange={e=>setAccepting(e.target.checked)} disabled={pending}/></label></fieldset><div className="flex shrink-0 justify-end gap-2 border-t px-5 py-4"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>취소</Button><Button type="submit" disabled={pending}>{pending?"저장 중…":"프로필 저장"}</Button></div></form></SheetContent></Sheet>;
}
