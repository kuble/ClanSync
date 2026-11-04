"use client";

import { useState } from "react";
import { ChevronDown, Map } from "lucide-react";
import { useTranslator } from "#use-translator";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BalanceManualMapPicker } from "./clan-balance-map-options";

export function MatchRecordMapPicker({ gameSlug, value, onChange, availableMaps }: {
  gameSlug: string;
  value: string;
  onChange: (value: string) => void;
  /** A filter offers recorded maps and a reset. Editors use the full game catalog. */
  availableMaps?: readonly string[];
}) {
  const tx = useTranslator();
  const [open, setOpen] = useState(false);
  const isFilter = availableMaps !== undefined;
  function select(value: string) {
    onChange(value);
    setOpen(false);
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<Button type="button" variant="outline" size={isFilter ? "sm" : "icon-sm"} />}
      aria-label={isFilter ? tx("기록 맵") : tx("경기 맵 선택")}
      aria-description={isFilter ? tx(value || "전체 맵") : undefined}
      className={isFilter ? "h-9 w-full min-w-0 justify-between @min-[44rem]/archive:w-auto @min-[44rem]/archive:max-w-40" : "size-9 shrink-0"}>
      <Map className="size-4 shrink-0" aria-hidden />
      {isFilter && <><span className="truncate">{tx(value || "전체 맵")}</span><ChevronDown className="size-3 shrink-0" aria-hidden /></>}
    </DialogTrigger>
    <DialogContent className="max-h-[85dvh] sm:max-w-4xl">
      <DialogTitle>{tx(isFilter ? "기록 맵 선택" : "경기 맵 선택")}</DialogTitle>
      {isFilter && <Button type="button" variant={value ? "outline" : "secondary"} size="sm"
        className="justify-self-start" aria-pressed={!value} onClick={() => select("")}>{tx("전체 맵")}</Button>}
      {availableMaps?.length === 0 ? <p className="text-sm text-muted-foreground">기록된 맵이 없습니다.</p> :
        <BalanceManualMapPicker gameSlug={gameSlug} availableMaps={availableMaps} value={value || null} onChange={select} />}
    </DialogContent>
  </Dialog>;
}
