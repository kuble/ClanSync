"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  MAP_TYPES,
  mapPoolForGameSlug,
  type MapType,
} from "@/lib/balance/map-pools";

export function MapTypeFilter({
  value,
  onChange,
  disabled = false,
}: {
  value: readonly MapType[];
  onChange: (types: MapType[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="text-sm font-semibold">맵 유형</legend>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={value.length === 0 ? "default" : "outline"}
          aria-pressed={value.length === 0}
          disabled={disabled}
          onClick={() => onChange([])}
        >
          전체
        </Button>
        {MAP_TYPES.map(({ id, label }) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={value.includes(id) ? "default" : "outline"}
            aria-pressed={value.includes(id)}
            disabled={disabled}
            onClick={() =>
              onChange(
                value.includes(id)
                  ? value.filter((type) => type !== id)
                  : [...value, id],
              )
            }
          >
            {label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

export function BalanceManualMapPicker({
  gameSlug,
  value,
  onChange,
  disabled = false,
  canManage = true,
}: {
  gameSlug: string;
  value: string | null;
  onChange: (label: string) => void;
  disabled?: boolean;
  canManage?: boolean;
}) {
  const id = useId();
  const pool = mapPoolForGameSlug(gameSlug);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold">
        경기 맵
      </label>
      <select
        id={id}
        value={value ?? ""}
        disabled={disabled || !canManage}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
      >
        <option value="" disabled>
          맵을 선택하세요
        </option>
        {value && !pool.includes(value) ? (
          <option value={value}>{value}</option>
        ) : null}
        {gameSlug === "overwatch"
          ? MAP_TYPES.map(({ id: type, label }) => (
              <optgroup key={type} label={label}>
                {mapPoolForGameSlug(gameSlug, [type]).map((map) => (
                  <option key={map} value={map}>
                    {map}
                  </option>
                ))}
              </optgroup>
            ))
          : pool.map((map) => (
              <option key={map} value={map}>
                {map}
              </option>
            ))}
      </select>
    </div>
  );
}
