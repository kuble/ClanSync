"use client";
import { useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { squareEmojiCrop, type EmojiCrop } from "@/lib/clan/emoji-crop";
import { emojiNamePattern } from "@/lib/clan/cosmetics";

export function ClanEmojiCropDialog({ src, pending, onClose, onSave }: { src:string; pending:boolean; onClose:()=>void; onSave:(name:string,crop:EmojiCrop)=>void }) {
  const [dimensions,setDimensions]=useState({width:1,height:1}),[ready,setReady]=useState(false);
  const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),[name,setName]=useState("");
  const drag=useRef<{x:number;y:number;pan:{x:number;y:number}}|null>(null);
  const crop=squareEmojiCrop(dimensions.width,dimensions.height,zoom,pan);
  const imageStyle={width:`${dimensions.width/crop.size*100}%`,height:`${dimensions.height/crop.size*100}%`,maxWidth:"none",left:`${-crop.x/crop.size*100}%`,top:`${-crop.y/crop.size*100}%`};
  const preview=(size:number)=><span className="relative inline-block shrink-0 overflow-hidden rounded-none" style={{width:size,height:size}}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local file preview */}
      <img src={src} alt="" draggable={false} className="pointer-events-none absolute" style={imageStyle}/></span>;
  return <Dialog open onOpenChange={value=>{if(!value&&!pending)onClose();}}><DialogContent showCloseButton={!pending} className="w-[calc(100vw-2rem)] min-w-0 gap-0 overflow-x-hidden p-0 sm:max-w-4xl">
    <DialogHeader className="px-5 pb-4 pt-5 pr-12"><DialogTitle>공용 이모티콘 추가</DialogTitle><DialogDescription>보여줄 부분을 정사각형에 맞춰 주세요.</DialogDescription></DialogHeader>
    <form className="grid min-w-0 md:grid-cols-[minmax(0,1.35fr)_minmax(240px,1fr)]" onSubmit={event=>{event.preventDefault();if(ready&&emojiNamePattern.test(name.trim()))onSave(name.trim(),crop);}}>
      <fieldset disabled={pending} className="min-w-0 space-y-4 bg-muted/30 p-5">
        <div className="relative mx-auto aspect-square w-full max-w-80 touch-none overflow-hidden border-2 border-foreground/60 bg-[repeating-conic-gradient(var(--muted)_0%_25%,var(--background)_0%_50%)] bg-[length:20px_20px] outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary" tabIndex={0} role="group" aria-label="이미지 자르기 영역" onKeyDown={event=>{const direction=({ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]} as Record<string,number[]>)[event.key];if(direction){event.preventDefault();setPan(old=>({x:old.x+direction[0]*crop.size*.04,y:old.y+direction[1]*crop.size*.04}));}}}
          onPointerDown={event=>{if(pending)return;event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,pan:{x:crop.x-(dimensions.width-crop.size)/2,y:crop.y-(dimensions.height-crop.size)/2}};}}
          onPointerMove={event=>{if(!drag.current||pending)return;const scale=crop.size/event.currentTarget.clientWidth;setPan({x:drag.current.pan.x-(event.clientX-drag.current.x)*scale,y:drag.current.pan.y-(event.clientY-drag.current.y)*scale});}}
          onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local file preview */}
          <img src={src} alt="자르기 미리보기" draggable={false} className="pointer-events-none absolute select-none" style={imageStyle} onLoad={event=>{setDimensions({width:event.currentTarget.naturalWidth,height:event.currentTarget.naturalHeight});setReady(true);}} onError={()=>setReady(false)}/>
        </div>
        <p className="text-center text-xs text-muted-foreground">드래그 또는 방향키로 위치 조절</p>
        <div className="mx-auto flex max-w-80 items-center gap-3"><Minus className="size-4 shrink-0 text-muted-foreground" aria-hidden/><input aria-label="이모티콘 확대" type="range" min={1} max={4} step={.05} value={zoom} disabled={pending||!ready} onChange={event=>setZoom(Number(event.target.value))} className="min-w-0 flex-1 accent-[var(--primary)]"/><Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden/><Button type="button" variant="ghost" size="icon-sm" aria-label="자르기 초기화" onClick={()=>{setZoom(1);setPan({x:0,y:0});}}><RotateCcw className="size-4" aria-hidden/></Button></div>
      </fieldset>
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5 border-t p-5 md:border-l md:border-t-0">
        <div><h4 className="mb-3 text-xs font-medium">실제 표시 크기</h4><div className="grid grid-cols-2 gap-2"><div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg bg-muted/40"><span className="inline-flex h-8 min-w-12 items-center justify-center gap-1.5 rounded-full border bg-background/40 px-2 text-muted-foreground">{preview(20)}<span className="text-[11px] tabular-nums">6</span></span><span className="text-[10px] text-muted-foreground">반응</span></div><div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg bg-muted/40">{preview(48)}<span className="text-[10px] text-muted-foreground">본문·댓글</span></div></div></div>
        <label className="space-y-2 text-xs font-medium">이모티콘 이름<Input aria-label="이모티콘 이름" value={name} onChange={event=>setName(event.target.value)} maxLength={32} placeholder="예: 환호_01" autoComplete="off" pattern="[a-zA-Z0-9가-힣_]{2,32}" required minLength={2}/><span className="block text-[11px] font-normal text-muted-foreground">한글·영문·숫자·밑줄 2~32자</span></label>
        <p className="text-[11px] text-muted-foreground">128×128px로 저장 · 게시글·댓글·반응에 사용</p>
        <div className="mt-auto flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>취소</Button><Button type="submit" disabled={pending||!ready||!emojiNamePattern.test(name.trim())}>{pending?"등록 중…":"등록"}</Button></div>
      </fieldset>
    </form>
  </DialogContent></Dialog>;
}
