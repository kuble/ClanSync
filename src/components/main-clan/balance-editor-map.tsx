"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Map } from "lucide-react";
import { toast } from "sonner";
import { selectBalanceMapAction } from "@/app/actions/clan-balance-session";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BalanceMapImage } from "./clan-balance-map-image";
import { BalanceManualMapPicker } from "./clan-balance-map-options";

export function BalanceEditorMap({ gameSlug, clanId, sessionId, selectedMap, canManage, beforeSelect }: {
  gameSlug: string;
  clanId: string;
  sessionId: string;
  selectedMap: string | null;
  canManage: boolean;
  beforeSelect?: () => Promise<{ ok: boolean }>;
}) {
  const router = useRouter();
  const [map, setMap] = useOptimistic(selectedMap);
  const [open, setOpen] = useState(canManage && !selectedMap);
  const [pending, start] = useTransition();

  function selectMap(label: string) {
    setOpen(false);
    start(async () => {
      setMap(label);
      try {
        if (beforeSelect && !(await beforeSelect()).ok) {
          toast.error("명단을 저장한 뒤 맵을 다시 선택하세요.");
          setOpen(true);
          return;
        }
        const result = await selectBalanceMapAction(gameSlug, clanId, sessionId, label);
        if (!result.ok) {
          toast.error(result.error);
          setOpen(true);
        }
        router.refresh();
      } catch {
        toast.error("맵을 저장하지 못했습니다. 다시 선택하세요.");
        setOpen(true);
      }
    });
  }

  return <>
    <button type="button" data-testid="balance-editor-map" data-balance-guide="map-picker"
      aria-label={map ? `경기 맵 변경 · ${map}` : "경기 맵 선택"}
      disabled={!canManage || pending} onClick={() => setOpen(true)}
      className="relative flex h-11 w-full shrink-0 items-center overflow-hidden rounded-xl border bg-muted text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default">
      {map ? <BalanceMapImage label={map} sizes="(max-width: 640px) 100vw, 30vw" loading="eager" /> : null}
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/20" />
      <span className="relative flex min-w-0 items-center gap-2 px-3 text-xs font-semibold text-white">
        <Map className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{map ? `경기 맵 · ${map}` : canManage ? "경기 맵 선택" : "맵 선택 대기"}</span>
      </span>
    </button>
    <Dialog open={open && canManage} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>경기 맵 선택</DialogTitle>
          <DialogDescription>맵을 선택하면 창이 닫히고 배너에 표시됩니다.</DialogDescription>
        </DialogHeader>
        <BalanceManualMapPicker gameSlug={gameSlug} value={map} onChange={selectMap} disabled={pending} canManage={canManage} />
      </DialogContent>
    </Dialog>
  </>;
}
