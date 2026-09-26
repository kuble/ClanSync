"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  MAP_TYPES,
  mapDetailsForLabel,
  mapPoolForGameSlug,
  type MapType,
} from "@/lib/balance/map-pools";
import { OverwatchMapIcon } from "@/components/ui/overwatch-icons";
import { cn } from "@/lib/utils";
import { BalanceMapImage } from "./clan-balance-map-image";

const TYPE_ART: Record<MapType, string> = {
  control: "일리오스",
  push: "콜로세오",
  escort: "서킷 로얄",
  hybrid: "왕의 길",
  flashpoint: "수라바사",
};

function MapTypeCard({ id, label, selected, disabled, onClick }: {
  id: MapType | "all";
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={selected} disabled={disabled} onClick={onClick}
      className={cn("group relative min-h-24 overflow-hidden rounded-xl border text-left text-white transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-default sm:min-h-32", selected ? "border-primary ring-2 ring-primary/50" : "border-white/10 hover:border-primary/70")}>
      {id === "all" ? (
        <span className="absolute inset-0 grid grid-cols-2" aria-hidden="true">
          {MAP_TYPES.slice(0, 4).map((type) => <span key={type.id} className="relative"><BalanceMapImage label={TYPE_ART[type.id]} sizes="120px" /></span>)}
        </span>
      ) : <BalanceMapImage label={TYPE_ART[id]} className="transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" sizes="(max-width: 640px) 50vw, 240px" />}
      <span className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-black/10" aria-hidden="true" />
      {selected ? <span className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground"><Check className="size-3.5" aria-hidden="true" /></span> : null}
      <span className="absolute bottom-3 left-3 font-bold sm:text-base">{id === "all" ? label : <OverwatchMapIcon type={id} className="size-7 drop-shadow" />}</span>
    </button>
  );
}

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
    <fieldset disabled={disabled} className="space-y-3" data-balance-guide="map-types">
      <legend className="text-sm font-semibold">맵 유형</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <MapTypeCard id="all" label="전체" selected={value.length === 0} disabled={disabled} onClick={() => onChange([])} />
        {MAP_TYPES.map(({ id, label }) => (
          <MapTypeCard
            key={id}
            id={id}
            label={label}
            selected={value.includes(id)}
            disabled={disabled}
            onClick={() =>
              onChange(
                value.includes(id)
                  ? value.filter((type) => type !== id)
                  : [...value, id],
              )
            }
          />
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
  const [type, setType] = useState<MapType | null>(() => mapDetailsForLabel(value ?? "")?.type ?? null);
  const [preview, setPreview] = useState<string | null>(null);
  const [savedValue, setSavedValue] = useState(value);
  if (savedValue !== value) {
    setSavedValue(value);
    setType(mapDetailsForLabel(value ?? "")?.type ?? null);
    setPreview(null);
  }
  const pool = gameSlug === "overwatch" && !type ? [] : mapPoolForGameSlug(gameSlug, type ? [type] : []);
  const active = preview && pool.includes(preview) ? preview : value && pool.includes(value) ? value : pool[0];
  const locked = disabled || !canManage;
  return (
    <section className="space-y-4" aria-label="경기 맵" data-balance-guide="map-picker">
      {gameSlug === "overwatch" ? (
        <fieldset className="space-y-3" data-balance-guide="map-types">
          <legend className="text-sm font-semibold">맵 유형</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {MAP_TYPES.map(({ id, label }) => (
              <MapTypeCard key={id} id={id} label={label} selected={type === id} disabled={disabled}
                onClick={() => { setType(id); setPreview(null); }} />
            ))}
          </div>
        </fieldset>
      ) : null}
      {pool.length > 0 ? <>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{MAP_TYPES.find((entry) => entry.id === type)?.label} · {pool.length}개 맵</span>
        <span role="status" className="font-semibold text-primary">{value ? `${value} 선택됨` : "맵을 선택하세요"}</span>
      </div>
      <div className="flex flex-col gap-2 sm:h-80 sm:flex-row lg:h-96" onMouseLeave={() => setPreview(null)}>
        {pool.map((label) => {
          const expanded = active === label;
          const selected = value === label;
          return (
            <button key={label} type="button" aria-label={`${label} 선택`} aria-pressed={selected} disabled={locked}
              onMouseEnter={() => setPreview(label)} onFocus={() => setPreview(label)}
              onBlur={() => setPreview(null)} onClick={() => onChange(label)}
              data-map-card={label} data-expanded={expanded}
              className={cn("group relative min-w-0 overflow-hidden rounded-xl border text-left text-white transition-[flex-grow,height,border-color] duration-500 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-default motion-reduce:transition-none sm:h-full sm:basis-0", expanded ? "h-52 sm:grow-[4]" : "h-16 sm:grow", selected ? "border-primary ring-2 ring-primary/50" : "border-white/10 hover:border-white/50")}>
              <BalanceMapImage label={label} className={cn("transition-transform duration-700 motion-reduce:transition-none", expanded ? "scale-100" : "scale-110")} />
              <span className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-black/10" aria-hidden="true" />
              {selected ? <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground"><Check className="size-3.5" aria-hidden="true" /><span className={expanded ? "" : "sm:hidden"}>선택됨</span></span> : null}
              <span className={cn("absolute bottom-4 left-4 whitespace-nowrap font-bold drop-shadow", expanded ? "text-lg sm:text-xl" : "text-sm sm:[writing-mode:vertical-rl]")}>{label}</span>
            </button>
          );
        })}
      </div>
      </> : null}
    </section>
  );
}
