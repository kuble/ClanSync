import type { HousingCatalogItem, HousingInventoryItem, HousingPlacement, HousingSurface } from "./types";

export const HOUSING_GRID_SIZE = 6;
export const HOUSING_WALL_HEIGHT = 4;
export const HOUSING_SURFACES: readonly HousingSurface[] = ["floor", "wall-left", "wall-right"];
export const HOUSING_WALLPAPERS = ["cream", "sage", "rose", "midnight"] as const;
export const HOUSING_FLOORS = ["oak", "walnut", "ivory"] as const;

export function getHousingFootprint(item: Pick<HousingCatalogItem, "width" | "depth">, rotation: number) {
  return rotation % 2 === 0
    ? { width: item.width, depth: item.depth }
    : { width: item.depth, depth: item.width };
}

/** Preview validation only; the database independently validates the complete save. */
export function canPlaceHousingItem(
  candidate: HousingPlacement,
  placements: HousingPlacement[],
  inventory: HousingInventoryItem[],
  catalog: HousingCatalogItem[],
): boolean {
  if (![candidate.x, candidate.y, candidate.rotation].every(Number.isInteger)
    || candidate.rotation < 0 || candidate.rotation > 3 || candidate.x < 0 || candidate.y < 0) return false;
  const owned = inventory.find((entry) => entry.id === candidate.inventoryId);
  const item = catalog.find((entry) => entry.id === owned?.catalogId);
  if (!item) return false;
  const surface = candidate.surface === undefined ? "floor" : candidate.surface;
  if (!HOUSING_SURFACES.includes(surface)
    || (item.mount === "wall" ? surface === "floor" || candidate.rotation !== 0 : surface !== "floor")) return false;
  const size = getHousingFootprint(item, candidate.rotation);
  if (candidate.x + size.width > HOUSING_GRID_SIZE
    || candidate.y + size.depth > (surface === "floor" ? HOUSING_GRID_SIZE : HOUSING_WALL_HEIGHT)) return false;
  return placements.every((other) => {
    if (other.inventoryId === candidate.inventoryId) return true;
    if ((other.surface ?? "floor") !== surface) return true;
    const otherOwned = inventory.find((entry) => entry.id === other.inventoryId);
    const otherItem = catalog.find((entry) => entry.id === otherOwned?.catalogId);
    if (!otherItem) return false;
    if (surface !== "floor" && ((item.wallLayer === "window" && otherItem.wallLayer === "curtain")
      || (item.wallLayer === "curtain" && otherItem.wallLayer === "window"))) return true;
    const otherSize = getHousingFootprint(otherItem, other.rotation);
    return candidate.x + size.width <= other.x || other.x + otherSize.width <= candidate.x
      || candidate.y + size.depth <= other.y || other.y + otherSize.depth <= candidate.y;
  });
}
