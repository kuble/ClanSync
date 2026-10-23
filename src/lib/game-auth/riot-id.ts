/** Display ID only; the provider PUUID stays in game_uid. */
export function parseRiotId(value: string): string | null {
  const normalized = value.trim().normalize("NFKC");
  const parts = normalized.split("#");
  return parts.length === 2 && parts[0].length >= 3 && parts[0].length <= 16 && !/[\p{Cc}]/u.test(normalized) && /^[\p{L}\p{N}]{3,5}$/u.test(parts[1]) ? normalized : null;
}
