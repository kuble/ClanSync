"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SquareImageCropper } from "@/components/ui/square-image-cropper";
import type { SquareCrop } from "@/lib/images/square-crop";

export function ProfilePhotoCropDialog({ src, pending, onClose, onSave }: { src: string; pending: boolean; onClose: () => void; onSave: (crop: SquareCrop) => void }) {
  return <Dialog open onOpenChange={value => { if (!value && !pending) onClose(); }}><DialogContent showCloseButton={!pending} className="w-[calc(100vw-2rem)] min-w-0 gap-0 overflow-x-hidden p-0 sm:max-w-3xl">
    <DialogHeader className="px-5 pb-4 pt-5 pr-12"><DialogTitle>프로필 사진 편집</DialogTitle><DialogDescription>드래그와 확대 조절로 보여줄 부분을 맞춰 주세요.</DialogDescription></DialogHeader>
    <SquareImageCropper key={src} src={src} pending={pending} zoomLabel="프로필 사진 확대">{({ crop, ready, controls, preview }) => <form className="grid min-w-0 md:grid-cols-[minmax(0,1.35fr)_minmax(220px,1fr)]" onSubmit={event => { event.preventDefault(); if (ready && !pending) onSave(crop); }}>
      {controls}
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5 border-t p-5 md:border-l md:border-t-0">
        <h3 className="text-xs font-medium">적용 모습</h3>
        <div className="grid grid-cols-2 gap-3">
          {[{ size: 64, label: "프로필" }, { size: 32, label: "댓글" }].map(({ size, label }) => <div key={size} className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-lg bg-muted/40"><span className="inline-flex overflow-hidden rounded-lg border border-primary/20">{preview(size)}</span><span className="text-[11px] text-muted-foreground">{label}</span></div>)}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">프로필과 댓글에 같은 사진이 표시됩니다.</p>
        <div className="mt-auto flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>취소</Button><Button type="submit" disabled={pending || !ready}>{pending ? "저장 중…" : "사진 저장"}</Button></div>
      </fieldset>
    </form>}</SquareImageCropper>
  </DialogContent></Dialog>;
}
