import type { ClanEmoji } from "./cosmetics";

export const emojiToken = (id: string) => `[e:${id}]`;
const pattern = () => /\[e:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi;
export function splitEmojiText(text: string, emojis: ClanEmoji[]) {
  const known = new Map(emojis.map(emoji => [emoji.id, emoji]));
  const parts: { text?: string; emoji?: ClanEmoji; missing?: boolean; token?:string }[] = [];
  let end = 0;
  for (const match of text.matchAll(pattern())) {
    if (match.index > end) parts.push({ text: text.slice(end, match.index) });
    const emoji = known.get(match[1].toLowerCase());
    parts.push(emoji ? { emoji } : { text: ":사용할 수 없는 이모티콘:", missing: true, token:match[0] });
    end = match.index + match[0].length;
  }
  if (end < text.length) parts.push({ text: text.slice(end) });
  return parts;
}
export type EmojiReactionTarget = { kind: "post" | "board_comment" | "hof_comment" | "notice"; id: string };
