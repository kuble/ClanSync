"use client";

import { LoaderCircle } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";

export function BalancePreparationOverlay({ error, onRetry }: {
  error?: string | null;
  onRetry?: () => void;
}) {
  return <Dialog open disablePointerDismissal onOpenChange={(_, details) => details.cancel()}>
    <DialogPortal>
      <DialogOverlay
        className="bg-background/10 supports-backdrop-filter:backdrop-blur-[2px]"
        // Keep backdrop presses from moving keyboard focus to the page.
        onPointerDown={(event) => event.preventDefault()}
      />
      <DialogPrimitive.Popup
        data-testid="balance-preparation-overlay"
        finalFocus={false}
        className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 justify-items-center gap-4 p-4 text-center outline-none sm:max-w-sm"
      >
        <DialogTitle className="flex items-center gap-2" role="status">
          {!error ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          경기 준비 중…
        </DialogTitle>
        <DialogDescription className={error ? "text-foreground" : "sr-only"}>
          {error ?? "준비가 끝나면 자동으로 이어집니다."}
        </DialogDescription>
        {error && onRetry ? <Button variant="outline" onClick={onRetry}>다시 시도</Button> : null}
      </DialogPrimitive.Popup>
    </DialogPortal>
  </Dialog>;
}
