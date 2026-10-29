"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EmojiCrop } from "@/lib/clan/emoji-crop";
import { SquareImageCropper } from "@/components/ui/square-image-cropper";
import { emojiNamePattern } from "@/lib/clan/cosmetics";

export function ClanEmojiCropDialog({ src, pending, onClose, onSave }: { src:string; pending:boolean; onClose:()=>void; onSave:(name:string,crop:EmojiCrop)=>void }) {
  const [name,setName] = useState("");
  return <Dialog open onOpenChange={value=>{if(!value&&!pending)onClose();}}><DialogContent showCloseButton={!pending} className="w-[calc(100vw-2rem)] min-w-0 gap-0 overflow-x-hidden p-0 sm:max-w-4xl">
    <DialogHeader className="px-5 pb-4 pt-5 pr-12"><DialogTitle>공용 이모티콘 추가</DialogTitle><DialogDescription>보여줄 부분을 정사각형에 맞춰 주십시오.</DialogDescription></DialogHeader>
    <SquareImageCropper key={src} src={src} pending={pending} zoomLabel="이모티콘 확대">{({crop,ready,controls,preview}) => <form className="grid min-w-0 md:grid-cols-[minmax(0,1.35fr)_minmax(240px,1fr)]" onSubmit={event=>{event.preventDefault();if(ready&&!pending&&emojiNamePattern.test(name.trim()))onSave(name.trim(),crop);}}>
      {controls}
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5 border-t p-5 md:border-l md:border-t-0">
        <div><h4 className="mb-3 text-xs font-medium">실제 표시 크기</h4><div className="grid grid-cols-2 gap-2"><div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg bg-muted/40"><span className="inline-flex h-8 min-w-12 items-center justify-center gap-1.5 rounded-full border bg-background/40 px-2 text-muted-foreground">{preview(20)}<span className="text-[11px] tabular-nums">6</span></span><span className="text-[10px] text-muted-foreground">반응</span></div><div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg bg-muted/40">{preview(48)}<span className="text-[10px] text-muted-foreground">본문·댓글</span></div></div></div>
        <label className="space-y-2 text-xs font-medium">이모티콘 이름<Input aria-label="이모티콘 이름" value={name} onChange={event=>setName(event.target.value)} maxLength={32} placeholder="예: 환호_01" autoComplete="off" pattern="[a-zA-Z0-9가-힣_]{2,32}" required minLength={2}/><span className="block text-[11px] font-normal text-muted-foreground">한글·영문·숫자·밑줄 2~32자</span></label>
        <p className="text-[11px] text-muted-foreground">128×128px로 저장 · 게시글·댓글·반응에 사용</p>
        <div className="mt-auto flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>취소</Button><Button type="submit" disabled={pending||!ready||!emojiNamePattern.test(name.trim())}>{pending?"등록 중…":"등록"}</Button></div>
      </fieldset>
    </form>}</SquareImageCropper>
  </DialogContent></Dialog>;
}
