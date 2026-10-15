/** BattleTag is a display identity; game_uid remains the stable provider ID. */
export function parseBattleTag(value: string): string | null {
  const tag = value.trim().normalize("NFKC");
  return /^[\p{L}\p{M}\p{N}]{2,20}#[0-9]{4,10}$/u.test(tag) ? tag : null;
}

export function profileBattleTag(profile: { battle_tag?: string | null; game_uid: string } | undefined): string | null {
  return profile?.battle_tag ?? (profile?.game_uid.includes("#") ? profile.game_uid : null);
}
