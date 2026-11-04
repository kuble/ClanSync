"use client";

import { useTranslator } from "#use-translator";
import { useState } from "react";
import { Check, Ellipsis, LayoutGrid } from "lucide-react";
import {
  MAP_TYPES,
  mapDetailsForLabel,
  mapPoolForGameSlug,
  type MapType,
} from "@/lib/balance/map-pools";
import { OverwatchMapIcon } from "@/components/ui/overwatch-icons";
import { cn } from "@/lib/utils";
import { BalanceMapImage } from "./clan-balance-map-image";

const mapTypeGroupClass = "grid grid-flow-col auto-cols-fr gap-1 rounded-xl border border-border bg-muted/20 p-1 @min-[36rem]/map-types:gap-2 @min-[36rem]/map-types:border-0 @min-[36rem]/map-types:bg-transparent @min-[36rem]/map-types:p-0";

function MapTypeCard({ id, label, selected, disabled, onClick }: {
  id: MapType | "all" | "other";
  label: string;
  selected?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const tx = useTranslator();
  const GroupIcon = id === "other" ? Ellipsis : LayoutGrid;
  return (
    <button type="button" aria-label={tx(label)} title={tx(label)} aria-pressed={selected} disabled={disabled} onClick={onClick}
      className={cn("flex min-h-10 min-w-0 flex-col items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default @min-[36rem]/map-types:min-h-20 @min-[36rem]/map-types:gap-2 @min-[36rem]/map-types:rounded-xl @min-[36rem]/map-types:border @min-[36rem]/map-types:p-2", selected ? "bg-primary text-primary-foreground @min-[36rem]/map-types:border-primary @min-[36rem]/map-types:bg-primary/15 @min-[36rem]/map-types:text-primary" : "text-muted-foreground hover:text-foreground @min-[36rem]/map-types:border-border @min-[36rem]/map-types:bg-muted/20")}>
      {id === "all" || id === "other" ? <GroupIcon className="size-5 @min-[36rem]/map-types:size-6" aria-hidden="true" /> : <OverwatchMapIcon type={id} className="size-5 @min-[36rem]/map-types:size-7" />}
      <span className="hidden @min-[36rem]/map-types:block">{tx(label)}</span>
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
  const tx = useTranslator();
  return (
    <fieldset disabled={disabled} className="@container/map-types min-w-0 space-y-3" data-balance-guide="map-types">
      <legend className="text-sm font-semibold">{tx("맵 유형")} <span aria-hidden="true" className="ml-1 text-xs font-normal text-muted-foreground @min-[36rem]/map-types:hidden">{value.length ? MAP_TYPES.filter(({ id }) => value.includes(id)).map(({ label }) => tx(label)).join(" · ") : tx("전체")}</span></legend>
      <div className={mapTypeGroupClass}>
        <MapTypeCard id="all" label={tx("전체")} selected={value.length === 0} disabled={disabled} onClick={() => onChange([])} />
        {MAP_TYPES.map(({ id, label }) => (
          <MapTypeCard
            key={id}
            id={id}
            label={tx(label)}
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
  availableMaps,
}: {
  gameSlug: string;
  value: string | null;
  onChange: (label: string) => void;
  disabled?: boolean;
  canManage?: boolean;
  availableMaps?: readonly string[];
}) {
  const tx = useTranslator();
  const maps = availableMaps ?? mapPoolForGameSlug(gameSlug);
  const isRecordFilter = availableMaps !== undefined;
  const types = gameSlug === "overwatch"
    ? MAP_TYPES.filter(({ id }) => maps.some((label) => mapDetailsForLabel(label)?.type === id))
    : [];
  const hasOther = gameSlug === "overwatch" && maps.some((label) => !mapDetailsForLabel(label));
  const initialType = value && maps.includes(value) ? mapDetailsForLabel(value)?.type ?? null : types[0]?.id ?? null;
  const [type, setType] = useState<MapType | null>(initialType);
  const [preview, setPreview] = useState<string | null>(null);
  const [savedValue, setSavedValue] = useState(value);
  if (savedValue !== value) {
    setSavedValue(value);
    setType(initialType);
    setPreview(null);
  }
  const pool = gameSlug === "overwatch" ? maps.filter((label) => (mapDetailsForLabel(label)?.type ?? null) === type) : maps;
  const active = preview && pool.includes(preview) ? preview : value && pool.includes(value) ? value : pool[0];
  const locked = disabled || !canManage;
  return (
    <section className="space-y-4" aria-label={tx("경기 맵")} data-balance-guide="map-picker">
      {isRecordFilter || (gameSlug === "overwatch" && maps.length > 0) ? (
        <fieldset aria-label={isRecordFilter ? tx("맵 유형") : undefined} className="@container/map-types min-w-0 space-y-3" data-balance-guide="map-types">
          {!isRecordFilter && <legend className="text-sm font-semibold">{tx("맵 유형")} <span aria-hidden="true" className="ml-1 text-xs font-normal text-muted-foreground @min-[36rem]/map-types:hidden">{tx(types.find(({ id }) => id === type)?.label ?? "기타")}</span></legend>}
          <div className={cn(mapTypeGroupClass, !types.length && !hasOther && "w-24")}>
            {isRecordFilter && <MapTypeCard id="all" label="전체 맵" disabled={locked} onClick={() => onChange("")} />}
            {types.map(({ id, label }) => (
              <MapTypeCard key={id} id={id} label={tx(label)} selected={type === id} disabled={disabled}
                onClick={() => { setType(id); setPreview(null); }} />
            ))}
            {hasOther && <MapTypeCard id="other" label="기타" selected={type === null} disabled={disabled}
              onClick={() => { setType(null); setPreview(null); }} />}
          </div>
        </fieldset>
      ) : null}
      {isRecordFilter && <hr className="border-border" />}
      {isRecordFilter && !maps.length && <p className="text-sm text-muted-foreground">기록된 맵이 없습니다.</p>}
      {pool.length > 0 ? <>
      {!isRecordFilter && <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{pool.length}{tx("개 맵")}</span>
        <span role="status" className="font-semibold text-primary">{value ? tx("{0} 선택됨", value) : tx("맵을 선택하십시오")}</span>
      </div>}
      <div className="flex flex-col gap-2 sm:h-80 sm:flex-row lg:h-96" onMouseLeave={() => setPreview(null)}>
        {pool.map((label) => {
          const expanded = active === label;
          const selected = value === label;
          return (
            <button key={label} type="button" aria-label={tx("{0} 선택", label)} aria-pressed={selected} disabled={locked}
              onMouseEnter={() => setPreview(label)} onFocus={() => setPreview(label)}
              onBlur={() => setPreview(null)} onClick={() => onChange(label)}
              data-map-card={label} data-expanded={expanded}
              className={cn("group relative min-w-0 overflow-hidden rounded-xl border text-left text-white transition-[flex-grow,height,border-color] duration-500 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-default motion-reduce:transition-none sm:h-full sm:basis-0", expanded ? "h-52 sm:grow-[4]" : "h-16 sm:grow", selected ? "border-primary ring-2 ring-primary/50" : "border-white/10 hover:border-white/50")}>
              <BalanceMapImage label={label} className={cn("transition-transform duration-700 motion-reduce:transition-none", expanded ? "scale-100" : "scale-110")} />
              <span className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-black/10" aria-hidden="true" />
              {selected ? <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground"><Check className="size-3.5" aria-hidden="true" /><span className={expanded ? "" : "sm:hidden"}>{tx("선택됨")}</span></span> : null}
              <span className={cn("absolute bottom-4 left-4 whitespace-nowrap font-bold drop-shadow", expanded ? "text-lg sm:text-xl" : "text-sm sm:[writing-mode:vertical-rl]")}>{tx(label)}</span>
            </button>
          );
        })}
      </div>
      </> : null}
    </section>
  );
}
