export const COSMETIC_COLOR_PRESETS = [
  { id: "graphite", name: "그래파이트", background: "#20242c", pattern: "#526070", swatch: "#8796a8" },
  { id: "blue", name: "블루", background: "#15243b", pattern: "#3f6088", swatch: "#6a9cdb" },
  { id: "green", name: "그린", background: "#173c32", pattern: "#4b806c", swatch: "#70b99a" },
  { id: "purple", name: "퍼플", background: "#322747", pattern: "#76608e", swatch: "#aa85d2" },
  { id: "rose", name: "로즈", background: "#442932", pattern: "#965f7a", swatch: "#d48bad" },
  { id: "amber", name: "앰버", background: "#3d3224", pattern: "#896d44", swatch: "#cfa96a" },
] as const;

export type CosmeticColorPresetId = typeof COSMETIC_COLOR_PRESETS[number]["id"];
