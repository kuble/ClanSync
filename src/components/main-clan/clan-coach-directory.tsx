"use client";
import {useState,useTransition} from "react";
import {toast} from "sonner";
import {GraduationCap} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {saveCoachProfileAction} from "@/app/actions/clan-board";
import type {ClanCoach} from "@/lib/clan/coaching";

export function ClanCoachDirectory({coaches,userId,gameSlug,clanId,onRequest}:{coaches:ClanCoach[];userId:string;gameSlug:string;clanId:string;onRequest:(id:string)=>void}){
  const [open,setOpen]=useState(false),mine=coaches.find(c=>c.userId===userId);
  return <section className="space-y-4 rounded-xl border border-border bg-card p-5" aria-label="코칭 선생님">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="flex items-center gap-2 text-sm font-semibold"><GraduationCap className="size-5 text-primary"/>코칭 선생님</h4><p className="mt-2 text-xs text-muted-foreground">선생님을 골라 리플레이 피드백을 요청하세요. 클랜원 누구나 선생님으로 등록할 수 있어요.</p></div><Button size="sm" variant="outline" onClick={()=>setOpen(true)}>{mine?"내 코칭 프로필":"코칭 선생님 등록"}</Button></div>
    {!coaches.length?<p className="py-6 text-center text-sm text-muted-foreground">아직 등록된 선생님이 없어요.</p>:<div className="grid gap-3 sm:grid-cols-2">{coaches.map(c=><article key={c.userId} className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-background/30 p-4"><div className="flex items-center gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><GraduationCap className="size-4" aria-hidden/></div><div className="min-w-0"><h5 className="truncate text-sm font-semibold">{c.name}</h5><p className="mt-1 text-[11px] text-muted-foreground">{c.accepting?"신청 가능":"신청 잠시 중단"}</p></div></div><p className="break-words text-sm font-medium leading-6 text-primary">{c.expertise}</p>{c.bio&&<p className="line-clamp-2 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{c.bio}</p>}{c.userId!==userId&&<Button size="sm" variant="outline" className="mt-auto" disabled={!c.accepting} onClick={()=>onRequest(c.userId)}>{c.name} 선생님께 신청</Button>}</article>)}</div>}
    {open&&<CoachEditor mine={mine} gameSlug={gameSlug} clanId={clanId} onClose={()=>setOpen(false)}/>}
  </section>;
}
function CoachEditor({mine,gameSlug,clanId,onClose}:{mine?:ClanCoach;gameSlug:string;clanId:string;onClose:()=>void}){
  const [pending,start]=useTransition();
  const [expertise,setExpertise]=useState(mine?.expertise??""),[bio,setBio]=useState(mine?.bio??""),[accepting,setAccepting]=useState(mine?.accepting??true);
  return <Dialog open onOpenChange={v=>{if(!v&&!pending)onClose();}}><DialogContent><DialogHeader><DialogTitle>{mine?"내 코칭 프로필":"코칭 선생님 등록"}</DialogTitle><DialogDescription>전문 분야와 소개는 클랜 내부에 공개됩니다. 신청을 잠시 중단해도 기존 요청은 남습니다.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={e=>{e.preventDefault();start(async()=>{try{const r=await saveCoachProfileAction(gameSlug,clanId,{expertise,bio,accepting});if(!r.ok){toast.error(r.error);return;}toast.success("코칭 프로필을 저장했습니다.");onClose();}catch{toast.error("저장하지 못했습니다. 입력 내용은 유지됩니다.");}});}}><div className="space-y-2"><Label htmlFor="coach-expertise">코칭 분야·역할·영웅</Label><Input id="coach-expertise" value={expertise} onChange={e=>setExpertise(e.target.value)} required maxLength={100} disabled={pending} placeholder="지원 · 아나 · 위치 선정"/></div><div className="space-y-2"><Label htmlFor="coach-bio">선생님 소개</Label><textarea id="coach-bio" value={bio} onChange={e=>setBio(e.target.value)} maxLength={1000} rows={4} disabled={pending} className="board-scroll max-h-64 w-full resize-y rounded-lg border border-input bg-background p-4 text-base leading-7 sm:text-sm"/></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={accepting} onChange={e=>setAccepting(e.target.checked)} disabled={pending} className="accent-primary"/>피드백 신청 받기</label><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>취소</Button><Button type="submit" disabled={pending}>{pending?"저장 중…":"프로필 저장"}</Button></div></form></DialogContent></Dialog>;
}
