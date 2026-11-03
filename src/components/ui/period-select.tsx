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
  const columns = options.length > 16 ? 5 : options.length > 6 ? 4 : options.length > 4 ? 2 : 1;
  const gridStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
  return <Select.Root value={value} onValueChange={(next) => { if (next !== null) onChange(next); }} disabled={disabled}
    items={options.map((option) => ({ value: option.id, label: option.label }))}>
    <Select.Trigger aria-label={label} className="flex h-8 shrink-0 items-center justify-between gap-1 rounded-lg border border-input bg-muted/20 px-2 text-[11px] font-semibold tabular-nums transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-popup-open:border-primary/50 data-popup-open:bg-primary/10 sm:h-10 sm:min-w-24 sm:gap-3 sm:px-3 sm:text-xs">
      <Select.Value />
      <Select.Icon><ChevronDown aria-hidden="true" className="size-3 text-muted-foreground sm:size-3.5" /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Positioner side="bottom" align="start" sideOffset={6} collisionPadding={8} alignItemWithTrigger={false} className="z-50">
        <Select.Popup style={{ width: columns === 1 ? "8rem" : `min(${columns * 4.25}rem, calc(100vw - 16px))` }} className="min-w-[var(--anchor-width)] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl outline-none">
          <Select.List aria-label={label} style={gridStyle} className="grid p-1">
            {options.map((option) => <Select.Item key={option.id} value={option.id} className="relative flex min-h-9 cursor-pointer items-center justify-center rounded-lg px-1 text-xs tabular-nums outline-none data-selected:bg-primary/10 data-selected:font-semibold data-selected:text-primary data-highlighted:bg-muted">
              <Select.ItemText>{option.label}</Select.ItemText>
              <Select.ItemIndicator className="absolute bottom-0.5 left-1/2 -translate-x-1/2"><Check aria-hidden="true" className="size-2.5" /></Select.ItemIndicator>
            </Select.Item>)}
          </Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  </Select.Root>;
}
