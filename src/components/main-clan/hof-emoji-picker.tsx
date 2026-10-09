"use client";

import { useState, type RefObject } from "react";
import { Popover } from "@base-ui/react/popover";
import { SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HofEmojiPicker({ label, title, options, disabled, onSelect, finalFocus }: {
  label: string; title: "공감 선택" | "이모티콘 선택";
  options: readonly { value: string; emoji: string; label: string }[];
  disabled: boolean; onSelect: (value: string) => void; finalFocus?: RefObject<HTMLElement | null>;
}) {
  const [open, setOpen] = useState(false);
  return <Popover.Root open={open} onOpenChange={setOpen}>
    <Popover.Trigger render={<Button type="button" size="icon-sm" variant="ghost" disabled={disabled} />} aria-label={label} title={label}>
      <SmilePlus className="size-4" aria-hidden="true" />
    </Popover.Trigger>
    <Popover.Portal><Popover.Positioner side="top" align="start" sideOffset={8} className="z-50">
      <Popover.Popup finalFocus={finalFocus} className="w-64 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg outline-none">
        <Popover.Title className="mb-2 text-xs font-semibold">{title}</Popover.Title>
        <div className="grid grid-cols-6 gap-1">{options.map((option) => <button key={option.value} type="button" disabled={disabled}
          aria-label={`${option.label} ${title === "공감 선택" ? "공감" : "이모티콘"}`} title={option.label}
          className="flex size-9 items-center justify-center rounded-lg text-xl hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
          onClick={() => { setOpen(false); onSelect(option.value); }}><span aria-hidden="true">{option.emoji}</span></button>)}</div>
      </Popover.Popup>
    </Popover.Positioner></Popover.Portal>
  </Popover.Root>;
}
