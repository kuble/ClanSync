export type HousingCategory = "seating" | "table" | "storage" | "decor" | "lighting";

export type HousingCatalogItem = {
  id: string;
  name: string;
  description: string;
  category: HousingCategory;
  price: number;
  width: number;
  depth: number;
  visualKey: string;
  isStarter: boolean;
};

export type HousingInventoryItem = {
  id: string;
  catalogId: string;
  x: number | null;
  y: number | null;
  rotation: number;
};

export type HousingPlacement = {
  inventoryId: string;
  x: number;
  y: number;
  rotation: number;
};

export type HousingState = {
  catalog: HousingCatalogItem[];
  inventory: HousingInventoryItem[];
  room: { revision: number; wallpaper: string; floor: string };
  coinBalance: number;
};

export type SaveHousingRoomInput = {
  revision: number;
  wallpaper: string;
  floor: string;
  placements: HousingPlacement[];
};

export type HousingResult = { ok: true; state: HousingState } | { ok: false; error: string };
