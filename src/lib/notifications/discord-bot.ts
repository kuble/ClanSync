const API = "https://discord.com/api/v10";
export const isDiscordId = (value: string) => /^\d{17,20}$/.test(value);
export const DISCORD_SEND_PERMISSIONS = BigInt(3072);

export function discordBotConfigured() {
  return !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CLIENT_SECRET &&
    isDiscordId(process.env.DISCORD_CLIENT_ID ?? "") && process.env.DISCORD_REDIRECT_URI);
}

async function request<T>(path: string, authorization: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, cache: "no-store", redirect: "error",
    signal: AbortSignal.timeout(8_000), headers: { ...init.headers, Authorization: authorization } });
  if (!response.ok) throw new Error(`Discord HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function botAuthorization() {
  if (!process.env.DISCORD_BOT_TOKEN) throw new Error("Discord bot is not configured");
  return `Bot ${process.env.DISCORD_BOT_TOKEN}`;
}

type Role = { id: string; permissions: string };
type Overwrite = { id: string; type: number; allow: string; deny: string };
export type DiscordChannel = { id: string; name: string; type: number; guild_id?: string; permission_overwrites?: Overwrite[] };

/** Discord's everyone → combined role overwrites → member overwrite hierarchy. */
export function canBotSend(guildId: string, botId: string, memberRoles: string[], roles: Role[], channel: DiscordChannel) {
  if (![0, 5].includes(channel.type)) return false;
  const ownRoles = new Set([guildId, ...memberRoles]);
  let permissions = roles.filter((role) => ownRoles.has(role.id)).reduce((bits, role) => bits | BigInt(role.permissions), BigInt(0));
  if (permissions & BigInt(8)) return true;
  const overwrites = channel.permission_overwrites ?? [];
  const everyone = overwrites.find((entry) => entry.type === 0 && entry.id === guildId);
  if (everyone) permissions = permissions & ~BigInt(everyone.deny) | BigInt(everyone.allow);
  const applicable = overwrites.filter((entry) => entry.type === 0 && memberRoles.includes(entry.id));
  const deny = applicable.reduce((bits, entry) => bits | BigInt(entry.deny), BigInt(0));
  const allow = applicable.reduce((bits, entry) => bits | BigInt(entry.allow), BigInt(0));
  permissions = permissions & ~deny | allow;
  const member = overwrites.find((entry) => entry.type === 1 && entry.id === botId);
  if (member) permissions = permissions & ~BigInt(member.deny) | BigInt(member.allow);
  return (permissions & DISCORD_SEND_PERMISSIONS) === DISCORD_SEND_PERMISSIONS;
}

export async function listDiscordBotChannels(guildId: string) {
  if (!isDiscordId(guildId)) throw new Error("Invalid Discord guild");
  const auth = botAuthorization();
  const bot = await request<{ id: string }>("/users/@me", auth);
  const [guild, member, channels] = await Promise.all([
    request<{ name: string; roles: Role[] }>(`/guilds/${guildId}`, auth),
    request<{ roles: string[] }>(`/guilds/${guildId}/members/${bot.id}`, auth),
    request<DiscordChannel[]>(`/guilds/${guildId}/channels`, auth),
  ]);
  return { guildName: guild.name, channels: channels.filter((channel) => canBotSend(guildId, bot.id, member.roles, guild.roles, channel))
    .map(({ id, name }) => ({ id, name })) };
}

export async function exchangeDiscordBotCode(code: string) {
  if (!discordBotConfigured()) throw new Error("Discord bot is not configured");
  return request<{ access_token: string; guild?: { id: string }; scope: string }>("/oauth2/token", `Basic ${Buffer.from(`${process.env.DISCORD_CLIENT_ID}:${process.env.DISCORD_CLIENT_SECRET}`).toString("base64")}`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: process.env.DISCORD_REDIRECT_URI! }),
  });
}

export async function verifyDiscordGuildManager(accessToken: string, guildId: string) {
  if (!isDiscordId(guildId)) return false;
  let after = "";
  // The guilds endpoint is paginated; do not authorize from the callback's guild hint alone.
  for (let page = 0; page < 10; page++) {
    const guilds = await request<{ id: string; owner: boolean; permissions: string }[]>(`/users/@me/guilds?limit=200${after ? `&after=${after}` : ""}`, `Bearer ${accessToken}`);
    const guild = guilds.find((entry) => entry.id === guildId);
    if (guild) return guild.owner || (BigInt(guild.permissions) & (BigInt(8) | BigInt(32))) !== BigInt(0);
    if (guilds.length < 200) return false;
    after = guilds.at(-1)!.id;
  }
  return false;
}

export async function postDiscordBotMessage(channelId: string, content: string, nonce?: string) {
  if (!isDiscordId(channelId)) throw new Error("Invalid Discord channel");
  return request<{ id: string }>(`/channels/${channelId}/messages`, botAuthorization(), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.slice(0, 2000), allowed_mentions: { parse: [] },
      ...(nonce ? { nonce: nonce.slice(0, 25), enforce_nonce: true } : {}) }),
  });
}
