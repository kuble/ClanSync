export type ShowcaseProduct = { id: string; name: string; kind: "goods" | "edge" | "light" | "label"; sprite: number; image_path?: string | null; width: number; starter: boolean; available: boolean };
export type ShowcaseItem = { id: string; catalogId: string; shelf: number; x: number; layer: number; text?: string };
export type ShowcaseCabinet = { id: string; name: string; template: "classic" | "focus"; background: "forest" | "cream" | "midnight"; items: ShowcaseItem[] };
export type ShowcaseDocument = { representative: string; cabinets: ShowcaseCabinet[] };
export type ShowcaseState = { revision: number; document: ShowcaseDocument; catalog: ShowcaseProduct[]; owned: Record<string, number> };
export type ShowcaseResult = { ok: true; state: ShowcaseState } | { ok: false; error: string };
export const TEMPLATES = [{ id: "classic", name: "기본 3단형" }, { id: "focus", name: "중앙 강조형" }] as const;
export const BACKGROUNDS = [{ id: "forest", name: "숲빛" }, { id: "cream", name: "크림" }, { id: "midnight", name: "밤하늘" }] as const;
export const QA_CABINET_LIMIT = 12;
export function defaultShowcase(): ShowcaseDocument {
  return { representative: "first", cabinets: [{ id: "first", name: "나의 취향", template: "focus", background: "forest", items: [
    { id: "first-frame", catalogId: "mountain-frame", shelf: 0, x: 50, layer: 0 },
    { id: "first-keyboard", catalogId: "sage-keyboard", shelf: 1, x: 35, layer: 0 },
    { id: "first-fox", catalogId: "fox-figure", shelf: 1, x: 69, layer: 1 },
  ] }] };
}
// The template defines shelf geometry; goods keep shelf-relative positions on switches.
export function shelfGeometry(template: ShowcaseCabinet["template"], shelf: number) {
  return template === "classic"
    ? { left: 7, width: 86, top: [30, 58, 86][shelf] }
    : [{ left: 29, width: 42, top: 40 }, { left: 18, width: 64, top: 70 }, { left: 30, width: 40, top: 89 }][shelf];
}
export function itemPosition(cabinet: ShowcaseCabinet, item: ShowcaseItem, product: ShowcaseProduct) {
  const shelf = shelfGeometry(cabinet.template, item.shelf);
  const width = Math.min(product.width, shelf.width);
  return { width, left: shelf.left + width / 2 + (shelf.width - width) * item.x / 100,
    top: product.kind === "light" ? 6 : shelf.top + (product.kind === "edge" ? 0 : product.kind === "label" ? 3 : -1 + item.layer * .4) };
}

export function usedQuantity(document: ShowcaseDocument, catalogId: string) {
  return document.cabinets.reduce((total, cabinet) => total + cabinet.items.filter(item => item.catalogId === catalogId).length, 0);
}
