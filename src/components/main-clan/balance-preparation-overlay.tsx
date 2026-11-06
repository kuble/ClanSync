"use client";

import { useTranslator } from "#use-translator";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function BalancePreparationOverlay({ error, onRetry, savingResult = false }: {
  error?: string | null;
  onRetry?: () => void;
  savingResult?: boolean;
}) {
  const tx = useTranslator();
  return <Dialog open disablePointerDismissal onOpenChange={(_, details) => details.cancel()}>
    <DialogPortal>
      <DialogOverlay
        className="bg-background/10 supports-backdrop-filter:backdrop-blur-[2px]"
        // Keep backdrop presses from moving keyboard focus to the page.
        onPointerDown={(event) => event.preventDefault()}
      />
      <DialogPrimitive.Popup
        data-testid={savingResult ? "balance-result-saving-overlay" : "balance-preparation-overlay"}
        finalFocus={false}
        className={cn("fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 justify-items-center gap-4 p-4 text-center outline-none sm:max-w-sm",
          savingResult && "rounded-2xl border border-amber-500/40 bg-card/95 shadow-xl")}
      >
        <DialogTitle className={cn("flex items-center gap-2", savingResult && "flex-col gap-3 text-amber-700 dark:text-amber-400")} role="status">
          {savingResult ? <span className="relative flex size-12 items-center justify-center" aria-hidden="true">
            <LoaderCircle className="absolute inset-0 size-12 animate-spin text-amber-500/60 motion-reduce:animate-none" />
            <TriangleAlert className="size-5 animate-pulse motion-reduce:animate-none" />
          </span> : !error ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {tx(savingResult ? "결과 저장 중…" : "경기 준비 중…")}
        </DialogTitle>
        <DialogDescription className={error || savingResult ? "text-foreground" : "sr-only"}>
          {error ?? tx(savingResult ? "저장이 완료되면 다음 경기로 이동합니다." : "준비가 끝나면 자동으로 이어집니다.")}
        </DialogDescription>
        {error && onRetry ? <Button variant="outline" onClick={onRetry}>{tx("다시 시도")}</Button> : null}
      </DialogPrimitive.Popup>
    </DialogPortal>
  </Dialog>;
}
