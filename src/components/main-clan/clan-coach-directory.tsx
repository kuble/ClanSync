"use client";
import { Switch } from "@/components/ui/switch";
import {useState,useTransition} from "react";
import { Slider } from "@base-ui/react/slider";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { OverwatchRoleIcon } from "@/components/ui/overwatch-icons";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Sheet,SheetContent,SheetHeader,SheetTitle} from "@/components/ui/sheet";
import {saveCoachProfileAction} from "@/app/actions/clan-board";
import {COACH_ROLES,coachTiers,coachTierLabel,type ClanCoach} from "@/lib/clan/coaching";

export { ClanCoachDirectory } from "./clan-coach-carousel";

export function CoachEditor({mine,gameSlug,clanId,onClose}:{mine?:ClanCoach;gameSlug:string;clanId:string;onClose:()=>void}){
  const [pending,start]=useTransition();
  const [role,setRole]=useState(mine?.role??"all");
  const tiers=coachTiers(gameSlug);
  const [tierRange,setTierRange]=useState<number[]>(()=>{
    const indices=tiers.flatMap(([tier],index)=>mine?.tier.includes(tier)?[index]:[]);
    return indices.length?[Math.min(...indices),Math.max(...indices)]:[0,tiers.length-1];
  });
  const tier=tierRange[0]===0&&tierRange[1]===tiers.length-1?[]:tiers.slice(tierRange[0],tierRange[1]+1).map(([value])=>value);
  const roleIcons={all:<OverwatchRoleIcon role="flex"/>,tank:<OverwatchRoleIcon role="tank"/>,dmg:<OverwatchRoleIcon role="damage"/>,sup:<OverwatchRoleIcon role="support"/>};
  const [expertise,setExpertise]=useState(mine?.expertise??""),[bio,setBio]=useState(mine?.bio??""),[accepting,setAccepting]=useState(mine?.accepting??true);
  return <Sheet open onOpenChange={v=>{if(!v&&!pending)onClose();}}>
    <SheetContent aria-describedby={undefined} showCloseButton={!pending} className="gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]">
      <SheetHeader className="shrink-0 px-5 pb-5 pr-12"><SheetTitle>{mine?"내 코칭 프로필":"코칭 선생님 등록"}</SheetTitle></SheetHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={e=>{e.preventDefault();start(async()=>{try{const r=await saveCoachProfileAction(gameSlug,clanId,{role,tier,expertise,bio,accepting});if(!r.ok){toast.error(r.error);return;}toast.success("코칭 프로필을 저장했습니다.");onClose();}catch{toast.error("저장하지 못했습니다. 입력 내용은 유지됩니다.");}});}}>
        <fieldset disabled={pending} className="board-scroll min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-5">
          <div className="space-y-2"><span className="text-sm font-medium">역할</span><RubberSegment label="역할" labelPosition="hidden" value={role} onChange={setRole} options={COACH_ROLES.map(option=>({id:option.value,label:option.label,icon:roleIcons[option.value]}))}/></div>
          {tiers.length>1&&<Slider.Root value={tierRange} onValueChange={setTierRange} min={0} max={tiers.length-1} step={1} largeStep={1} thumbCollisionBehavior="none" disabled={pending}>
            <div className="flex items-center justify-between gap-3"><Slider.Label className="text-sm font-medium">티어대</Slider.Label><output className="text-xs font-medium text-primary">{coachTierLabel(tier)}</output></div>
            <div className="mx-2.5"><Slider.Control className="relative flex min-h-11 w-full touch-none items-center"><Slider.Track data-tier-track className="relative h-1.5 w-full rounded-full bg-muted"><Slider.Indicator className="absolute h-full rounded-full bg-primary"/>{tiers.map(([value],index)=><span key={value} aria-hidden className="pointer-events-none absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/30" style={{left:`${index/(tiers.length-1)*100}%`}}/>)}{[0,1].map(index=><Slider.Thumb key={index} index={index} aria-label={index===0?"최소 코칭 티어":"최대 코칭 티어"} getAriaValueText={(_,value)=>tiers[value][1]} className="block size-5 rounded-full border-2 border-primary bg-background shadow-sm outline-none focus-within:ring-4 focus-within:ring-ring/30"/>)}</Slider.Track></Slider.Control></div>
            <div className="flex justify-between text-[11px] text-muted-foreground" aria-hidden><span>{tiers[0][1]}</span><span>{tiers[tiers.length-1][1]}</span></div>
          </Slider.Root>}
          <div className="space-y-2"><Label htmlFor="coach-expertise">코칭 내용</Label><Input id="coach-expertise" value={expertise} onChange={e=>setExpertise(e.target.value)} required maxLength={100} disabled={pending} placeholder="아나 위치 선정과 스킬 활용"/></div>
          <div className="space-y-2"><Label htmlFor="coach-bio">선생님 소개</Label><textarea id="coach-bio" value={bio} onChange={e=>setBio(e.target.value)} maxLength={1000} rows={4} disabled={pending} className="board-scroll max-h-64 w-full resize-y rounded-lg border border-input bg-background p-4 text-base leading-7 sm:text-sm"/></div>
          <label className="flex items-center justify-between gap-3 text-sm">피드백 신청 받기<Switch checked={accepting} onChange={e=>setAccepting(e.target.checked)} disabled={pending}/></label>
        </fieldset>
        <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-4"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>취소</Button><Button type="submit" disabled={pending}>{pending?"저장 중…":"프로필 저장"}</Button></div>
      </form>
    </SheetContent>
  </Sheet>;
}
