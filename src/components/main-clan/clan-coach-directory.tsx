"use client";
import { Switch } from "@/components/ui/switch";
import {useState,useTransition} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Sheet,SheetContent,SheetHeader,SheetTitle} from "@/components/ui/sheet";
import {saveCoachProfileAction} from "@/app/actions/clan-board";
import {COACH_ROLES,coachTiers,type ClanCoach} from "@/lib/clan/coaching";

export { ClanCoachDirectory } from "./clan-coach-carousel";

export function CoachEditor({mine,gameSlug,clanId,onClose}:{mine?:ClanCoach;gameSlug:string;clanId:string;onClose:()=>void}){
  const [pending,start]=useTransition();
  const [role,setRole]=useState(mine?.role??"all"),[tier,setTier]=useState(mine?.tier??"all");
  const [expertise,setExpertise]=useState(mine?.expertise??""),[bio,setBio]=useState(mine?.bio??""),[accepting,setAccepting]=useState(mine?.accepting??true);
  return <Sheet open onOpenChange={v=>{if(!v&&!pending)onClose();}}>
    <SheetContent aria-describedby={undefined} showCloseButton={!pending} className="gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]">
      <SheetHeader className="shrink-0 px-5 pb-5 pr-12"><SheetTitle>{mine?"내 코칭 프로필":"코칭 선생님 등록"}</SheetTitle></SheetHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={e=>{e.preventDefault();start(async()=>{try{const r=await saveCoachProfileAction(gameSlug,clanId,{role,tier,expertise,bio,accepting});if(!r.ok){toast.error(r.error);return;}toast.success("코칭 프로필을 저장했습니다.");onClose();}catch{toast.error("저장하지 못했습니다. 입력 내용은 유지됩니다.");}});}}>
        <fieldset disabled={pending} className="board-scroll min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="coach-role">역할</Label><select id="coach-role" value={role} onChange={e=>setRole(e.target.value)} className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">{COACH_ROLES.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="coach-tier">티어대</Label><select id="coach-tier" value={tier} onChange={e=>setTier(e.target.value)} className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">{coachTiers(gameSlug).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
          </div>
          <div className="space-y-2"><Label htmlFor="coach-expertise">코칭 내용</Label><Input id="coach-expertise" value={expertise} onChange={e=>setExpertise(e.target.value)} required maxLength={100} disabled={pending} placeholder="아나 위치 선정과 스킬 활용"/></div>
          <div className="space-y-2"><Label htmlFor="coach-bio">선생님 소개</Label><textarea id="coach-bio" value={bio} onChange={e=>setBio(e.target.value)} maxLength={1000} rows={4} disabled={pending} className="board-scroll max-h-64 w-full resize-y rounded-lg border border-input bg-background p-4 text-base leading-7 sm:text-sm"/></div>
          <label className="flex items-center justify-between gap-3 text-sm">피드백 신청 받기<Switch checked={accepting} onChange={e=>setAccepting(e.target.checked)} disabled={pending}/></label>
        </fieldset>
        <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-4"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>취소</Button><Button type="submit" disabled={pending}>{pending?"저장 중…":"프로필 저장"}</Button></div>
      </form>
    </SheetContent>
  </Sheet>;
}
