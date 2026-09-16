import { MAP_TYPES, type MapType } from "./map-pools";

export type BanSettings = {
  mapBanSeconds: number;
  heroBanSeconds: number;
  heroBansPerTeam: 1 | 2;
  mapTypes: MapType[];
};

export const DEFAULT_BAN_SETTINGS: BanSettings = {
  mapBanSeconds: 15,
  heroBanSeconds: 20,
  heroBansPerTeam: 2,
  mapTypes: [],
};

export function parseBanSettings(
  row?: {
    map_ban_seconds?: number;
    hero_ban_seconds?: number;
    hero_bans_per_team?: number;
    map_types?: string[];
  } | null,
): BanSettings {
  return {
    mapBanSeconds: row?.map_ban_seconds ?? 15,
    heroBanSeconds: row?.hero_ban_seconds ?? 20,
    heroBansPerTeam: row?.hero_bans_per_team === 1 ? 1 : 2,
    mapTypes: MAP_TYPES.filter((type) => row?.map_types?.includes(type.id)).map(
      (type) => type.id,
    ),
  };
}

export function validateBanSettings(value: BanSettings): string | null {
  if (
    !value ||
    ![1, 2].includes(value.heroBansPerTeam) ||
    !Number.isInteger(value.mapBanSeconds) ||
    value.mapBanSeconds < 5 ||
    value.mapBanSeconds > 300 ||
    !Number.isInteger(value.heroBanSeconds) ||
    value.heroBanSeconds < 5 ||
    value.heroBanSeconds > 300
  )
    return "밴 투표 시간은 5~300초 사이의 정수로 입력하세요.";
  if (
    !Array.isArray(value.mapTypes) ||
    value.mapTypes.some((id) => !MAP_TYPES.some((type) => type.id === id)) ||
    new Set(value.mapTypes).size !== value.mapTypes.length
  )
    return "맵 타입을 다시 선택하세요.";
  return null;
}

export function sameBanSettings(a: BanSettings, b: BanSettings): boolean {
  return (
    a.mapBanSeconds === b.mapBanSeconds &&
    a.heroBanSeconds === b.heroBanSeconds &&
    a.heroBansPerTeam === b.heroBansPerTeam &&
    [...a.mapTypes].sort().join(",") === [...b.mapTypes].sort().join(",")
  );
}
