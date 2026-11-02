"use server";

import { createClient } from "@/lib/supabase/server";

export async function setClanFavorite(clanId: string, favorite: boolean) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return false;
  const favorites = client.from("clan_favorites");
  const { error } = favorite
    ? await favorites.insert({ user_id: user.id, clan_id: clanId })
    : await favorites.delete().eq("user_id", user.id).eq("clan_id", clanId);
  return !error || (favorite && error.code === "23505");
}
