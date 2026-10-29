export const NORMAL_SYMBOLS = [
  { id: "orbit", name: "오비트" },
  { id: "shift", name: "시프트" },
  { id: "node", name: "노드" },
  { id: "beacon", name: "비콘" },
  { id: "spark", name: "스파크" },
] as const;

export function namecardSymbol(code?: string | null) {
  const symbol = NORMAL_SYMBOLS.find(item => code === `symbol-normal-${item.id}`) ?? NORMAL_SYMBOLS[0];
  return { ...symbol, src: `/symbols/normal-v1/${symbol.id}.webp` };
}
