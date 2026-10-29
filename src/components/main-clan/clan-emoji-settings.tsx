"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SmilePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EMOJI_LIMIT, CLAN_EMOJI_PACK_SIZE, clanEmojiUrl, type ClanEmoji } from "@/lib/clan/cosmetics";
import { CLAN_EMOJI_GIF_ENABLED, type EmojiCrop } from "@/lib/clan/emoji-crop";
import { ClanEmojiCropDialog } from "./clan-emoji-crop-dialog";
export function ClanEmojiSettings({ gameSlug, clanId, emojis, slots, canEdit }: { gameSlug:string;clanId:string;emojis:ClanEmoji[];slots:number;canEdit:boolean }) {
  const router=useRouter(),input=useRef<HTMLInputElement>(null);
  const [selected,setSelected]=useState<{file:File;src:string}|null>(null),[pending,start]=useTransition();
  useEffect(()=>()=>{if(selected)URL.revokeObjectURL(selected.src);},[selected]);
  const endpoint=`/api/games/${gameSlug}/clans/${clanId}/emojis`;
  const activeCount=emojis.filter(emoji=>(emoji.slot_index??1)<=slots).length;
  const bySlot=new Map(emojis.map((emoji,index)=>[emoji.slot_index??index+1,emoji]));
  const canAdd=canEdit&&slots>activeCount&&!pending;
  async function send(method:"POST"|"DELETE",body:FormData|string) {
    try {
      const response=await fetch(endpoint,{method,body,headers:typeof body==="string"?{"Content-Type":"application/json"}:undefined});
      const result=await response.json();
      if(!response.ok||!result.ok){toast.error(result.error||"저장하지 못했습니다.");return;}
      if(method==="POST")setSelected(null);
      toast.success(method==="POST"?"공용 이모티콘을 추가했습니다.":"이모티콘을 삭제했습니다.");router.refresh();
    } catch {toast.error("요청 결과를 확인하지 못했습니다. 새로고침 후 확인해 주세요.");}
  }
  return <section id="clan-emojis" aria-labelledby="clan-emojis-heading" className="scroll-mt-4 space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="clan-emojis-heading" className="flex items-center gap-2 text-sm font-semibold"><SmilePlus className="size-4 text-primary" aria-hidden/>공용 이모티콘</h3><span className="text-xs font-normal tabular-nums text-muted-foreground">{activeCount} / {slots}슬롯</span><Button type="button" size="sm" disabled={!canAdd} onClick={()=>input.current?.click()}><Plus className="size-3.5" aria-hidden/>이모티콘 추가</Button></div>
    {!slots&&<p className="text-xs text-muted-foreground">이모티콘 슬롯을 열어 주세요. <Link className="text-primary hover:underline" href={`/games/${gameSlug}/clan/${clanId}/store`}>클랜 상점</Link></p>}
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="이모티콘 슬롯">{Array.from({length:Math.max(slots,...bySlot.keys(),CLAN_EMOJI_PACK_SIZE)},(_,index)=>{
      const emoji=bySlot.get(index+1),unlocked=index<slots;
      return <div key={emoji?.id??index} className="relative flex aspect-square min-w-0 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background/30 p-2">
        {emoji&&unlocked?<Image src={clanEmojiUrl(clanId,emoji.id)} alt={emoji.name} width={56} height={56} unoptimized className="size-14 object-contain"/>:<button type="button" aria-label={unlocked?"빈 이모티콘 슬롯":"잠긴 이모티콘 슬롯"} disabled={!canAdd||!unlocked} className="grid size-14 place-items-center rounded-lg text-muted-foreground/40 enabled:hover:bg-primary/10 enabled:hover:text-primary" onClick={()=>input.current?.click()}><Plus className="size-5" aria-hidden/></button>}
        <span className="max-w-full truncate text-[11px] text-muted-foreground">{!unlocked?"잠김":emoji?.name??"빈 슬롯"}</span>
        {emoji&&canEdit&&<Button type="button" size="icon-sm" variant="ghost" className="absolute right-0 top-0" disabled={pending} aria-label={`${emoji.name} 삭제`} onClick={()=>start(()=>send("DELETE",JSON.stringify({id:emoji.id})))}><Trash2 className="size-3" aria-hidden/></Button>}
      </div>;
    })}</div>
    <p className="text-[11px] text-muted-foreground">정사각형 128×128px · PNG·WebP·JPG · 최대 256KB</p>
    <input ref={input} type="file" aria-label="이모티콘 이미지" hidden disabled={!canAdd} accept={`image/png,image/webp,image/jpeg${CLAN_EMOJI_GIF_ENABLED?",image/gif":""}`} onChange={event=>{
      const file=event.target.files?.[0];event.target.value="";
      if(!file)return;
      if(!file.size||file.size>EMOJI_LIMIT||!["image/png","image/webp","image/jpeg",...(CLAN_EMOJI_GIF_ENABLED?["image/gif"]:[])].includes(file.type)){toast.error("정적 PNG·WebP·JPG 이미지를 256KB 이내로 선택해 주세요.");return;}
      setSelected({file,src:URL.createObjectURL(file)});
    }}/>
    {selected&&<ClanEmojiCropDialog src={selected.src} pending={pending} onClose={()=>setSelected(null)} onSave={(name:string,crop:EmojiCrop)=>{const body=new FormData();body.set("name",name);body.set("image",selected.file);body.set("crop",JSON.stringify(crop));start(()=>send("POST",body));}}/>}
  </section>;
}
