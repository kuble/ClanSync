"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

export function PeriodSelect({ label, options, value, onChange, disabled = false }: {
  label: string;
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return <Select.Root value={value} onValueChange={(next) => { if (next !== null) onChange(next); }} disabled={disabled}
    items={options.map((option) => ({ value: option.id, label: option.label }))}>
    <Select.Trigger aria-label={label} className="flex h-10 min-w-24 shrink-0 items-center justify-between gap-3 rounded-lg border border-input bg-muted/20 px-3 text-xs font-semibold tabular-nums transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-popup-open:border-primary/50 data-popup-open:bg-primary/10">
      <Select.Value />
      <Select.Icon><ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Positioner side="bottom" align="start" sideOffset={6} collisionPadding={8} alignItemWithTrigger={false} className="z-50">
        <Select.Popup className="w-32 min-w-[var(--anchor-width)] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl outline-none">
          <Select.List aria-label={label} className="board-scroll max-h-[min(15rem,calc(var(--available-height)-2px))] overflow-y-auto overscroll-contain p-1">
            {options.map((option) => <Select.Item key={option.id} value={option.id} className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-xs tabular-nums outline-none data-selected:bg-primary/10 data-selected:font-semibold data-selected:text-primary data-highlighted:bg-muted">
              <Select.ItemText>{option.label}</Select.ItemText>
              <Select.ItemIndicator><Check aria-hidden="true" className="size-3.5" /></Select.ItemIndicator>
            </Select.Item>)}
          </Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  </Select.Root>;
}
