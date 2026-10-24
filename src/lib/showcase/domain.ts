import { showcaseDisplayWidth } from "./art";

export type ShowcaseProduct = { id: string; name: string; kind: "goods" | "edge" | "light" | "label" | "template"; sprite: number; image_path?: string | null; width: number; starter: boolean; available: boolean };
export type ShowcaseItem = { id: string; catalogId: string; shelf: number; x: number; layer: number; text?: string };
export type ShowcaseCabinet = { id: string; name: string; template: "classic" | "focus" | "offset" | "steps"; background: "forest" | "cream" | "midnight"; items: ShowcaseItem[] };
export type ShowcaseDocument = { representative: string; cabinets: ShowcaseCabinet[] };
export type ShowcaseState = { revision: number; document: ShowcaseDocument; catalog: ShowcaseProduct[]; owned: Record<string, number> };
export type ShowcaseResult = { ok: true; state: ShowcaseState } | { ok: false; error: string };
export const TEMPLATES = [{ id: "classic", name: "기본 3단형", productId: null }, { id: "focus", name: "중앙 강조형", productId: null }, { id: "offset", name: "엇갈림형", productId: "shelf-offset" }, { id: "steps", name: "계단형", productId: "shelf-steps" }] as const;
export const BACKGROUNDS = [{ id: "forest", name: "숲빛" }, { id: "cream", name: "크림" }, { id: "midnight", name: "밤하늘" }] as const;
export const QA_CABINET_LIMIT = 12;
export function defaultShowcase(): ShowcaseDocument {
  return { representative: "first", cabinets: [{ id: "first", name: "나의 취향", template: "focus", background: "forest", items: [
    { id: "first-frame", catalogId: "mountain-frame", shelf: 0, x: 50, layer: 0 },
    { id: "first-keyboard", catalogId: "sage-keyboard", shelf: 1, x: 12, layer: 0 },
    { id: "first-fox", catalogId: "fox-figure", shelf: 1, x: 86, layer: 1 },
  ] }] };
}
// The template defines shelf geometry; goods keep shelf-relative positions on switches.
export function shelfGeometry(template: ShowcaseCabinet["template"], shelf: number) {
  if (template === "classic") return { left: 7, width: 86, top: [35, 62, 88][shelf] };
  if (template === "offset") return [{ left: 8, width: 54, top: 35 }, { left: 39, width: 54, top: 62 }, { left: 13, width: 74, top: 88 }][shelf];
  if (template === "steps") return [{ left: 8, width: 42, top: 42 }, { left: 29, width: 42, top: 65 }, { left: 50, width: 42, top: 88 }][shelf];
  return [{ left: 29, width: 42, top: 45 }, { left: 18, width: 64, top: 72 }, { left: 30, width: 40, top: 89 }][shelf];
}
export function placementRail(template: ShowcaseCabinet["template"], shelf: number, kind: ShowcaseProduct["kind"]) {
  if (kind !== "light") return shelfGeometry(template, shelf);
  if (shelf === 0) return template === "focus" ? { left: 10, width: 80, top: 10 } : { left: 7, width: 86, top: 4 };
  const above = shelfGeometry(template, shelf - 1);
  return { ...above, top: above.top + (template === "focus" && shelf === 2 ? 3.7 : 3) };
}
export function itemPosition(cabinet: ShowcaseCabinet, item: ShowcaseItem, product: ShowcaseProduct) {
  const shelf = placementRail(cabinet.template, item.shelf, product.kind);
  const width = Math.min(showcaseDisplayWidth(product), shelf.width);
  const left = shelf.left + width / 2 + (shelf.width - width) * item.x / 100;
  // The upper rail follows the focus cabinet's arch, keeping the fixture attached.
  const arch = cabinet.template === "focus" && item.shelf === 0 ? 35 * ((left - 50) / 44) ** 2 : 0;
  return { width, left, top: shelf.top + (product.kind === "light" ? arch : product.kind === "edge" ? 0 : product.kind === "label" ? 3 : .4 + item.layer * .18) };
}

export function usedQuantity(document: ShowcaseDocument, catalogId: string) {
  return document.cabinets.reduce((total, cabinet) => total + cabinet.items.filter(item => item.catalogId === catalogId).length, 0);
}
