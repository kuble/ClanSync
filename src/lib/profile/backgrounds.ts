export const NORMAL_NAMECARD_BACKGROUNDS = [
  { id: "rail", name: "레일" },
  { id: "wave", name: "웨이브" },
  { id: "fold", name: "폴드" },
  { id: "step", name: "스텝" },
  { id: "tile", name: "타일" },
] as const;

export function namecardBackground(code?: string | null) {
  const background = NORMAL_NAMECARD_BACKGROUNDS.find(item => code === `background-normal-${item.id}`);
  return background ? { ...background, src: `/namecard-backgrounds/normal-v1/${background.id}.webp` } : null;
}
