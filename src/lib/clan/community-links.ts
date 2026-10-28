export const CHAT_SERVICES = [
  { id: "discord", label: "Discord", icon: "discord", example: "https://discord.gg/초대코드" },
  { id: "kakao", label: "카카오톡 오픈채팅", icon: "kakaotalk", example: "https://open.kakao.com/o/초대코드" },
  { id: "line", label: "LINE", icon: "line", example: "https://line.me/ti/g2/초대코드" },
  { id: "telegram", label: "Telegram", icon: "telegram", example: "https://t.me/+초대코드" },
  { id: "whatsapp", label: "WhatsApp", icon: "whatsapp", example: "https://chat.whatsapp.com/초대코드" },
  { id: "steam", label: "Steam 채팅", icon: "steam", example: "https://steamcommunity.com/chat/invite/초대코드" },
] as const;

export type ChatServiceId = (typeof CHAT_SERVICES)[number]["id"];
export type ClanCommunityLinks = Record<ChatServiceId, string>;

/** Validate copied invite formats without contacting or joining any external room. */
export function normalizeChatInviteUrl(service: ChatServiceId, input: string): string | null {
  const value = input.trim();
  if (!value) return "";
  if (value.length > 2000 || /[\s\\\p{Cc}]/u.test(value)) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const { hostname: host, pathname: path } = url;
  const valid = {
    discord: (host === "discord.gg" && /^\/[\w-]+\/?$/.test(path)) || (["discord.com", "www.discord.com", "discordapp.com"].includes(host) && /^\/invite\/[\w-]+\/?$/.test(path)),
    kakao: host === "open.kakao.com" && /^\/o\/[a-z0-9]+\/?$/i.test(path),
    line: host === "line.me" && /^\/(?:R\/)?ti\/g2?\/[\w-]+\/?$/.test(path),
    telegram: ["t.me", "telegram.me"].includes(host) && /^\/(?:joinchat\/|\+)?[\w-]+\/?$/.test(path),
    whatsapp: host === "chat.whatsapp.com" && /^\/[a-z0-9]+\/?$/i.test(path),
    steam: host === "steamcommunity.com" && /^\/chat\/invite\/[\w-]+\/?$/.test(path),
  }[service];
  return valid ? url.href : null;
}

export function parseClanCommunityLinks(input: unknown): { ok: true; links: ClanCommunityLinks } | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "채팅방 링크를 확인해 주세요." };
  const source = input as Record<string, unknown>;
  if (Object.keys(source).some(key => !CHAT_SERVICES.some(service => service.id === key))) return { ok: false, error: "지원하지 않는 채팅 서비스입니다." };
  const links = {} as ClanCommunityLinks;
  for (const service of CHAT_SERVICES) {
    const value = source[service.id] ?? "";
    const normalized = typeof value === "string" ? normalizeChatInviteUrl(service.id, value) : null;
    if (normalized === null) return { ok: false, error: `${service.label}의 올바른 https 초대 링크를 입력해 주세요.` };
    links[service.id] = normalized;
  }
  return { ok: true, links };
}

/** Explicit blanks override legacy onboarding fields; invalid stored URLs never become links. */
export function readClanCommunityLinks(input: unknown, legacy?: { discord_url: string | null; kakao_url: string | null }): ClanCommunityLinks {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  return Object.fromEntries(CHAT_SERVICES.map(({ id }) => {
    const value = Object.hasOwn(source, id) ? source[id] : id === "discord" ? legacy?.discord_url : id === "kakao" ? legacy?.kakao_url : "";
    return [id, typeof value === "string" ? normalizeChatInviteUrl(id, value) ?? "" : ""];
  })) as ClanCommunityLinks;
}
