import { createServiceRoleClient } from "@/lib/supabase/service";
import { loadGuestRecords } from "@/app/actions/clan-participants";
import { profileBattleTag } from "@/lib/game-auth/battle-tag";
import { ClanParticipantManagement } from "./clan-participant-management";

/** Mounted only inside the officer-authorized management page. */
export async function ClanParticipantData({ clanId, gameSlug }: { clanId: string; gameSlug: string }) {
  const result = await loadGuestRecords(clanId);
  if (!result.ok) throw new Error(result.error);
  const ids = [...new Set(result.records.flatMap((p) => p.userId ? [p.userId] : []))];
  const names = new Map<string, string>();
  const tags = new Map<string, string | null>();
  const svc = createServiceRoleClient();
  for (let offset = 0; offset < ids.length; offset += 200) {
    const batch = ids.slice(offset, offset + 200);
    const [users, profiles] = await Promise.all([
      svc.from("users").select("id,nickname").in("id", batch),
      svc.from("user_game_profiles").select("user_id,battle_tag,game_uid,games!inner(slug)").in("user_id", batch).eq("games.slug", gameSlug),
    ]);
    if (users.error || profiles.error) throw new Error("연결 계정 정보를 불러오지 못했습니다.");
    users.data.forEach((u) => names.set(u.id, u.nickname));
    profiles.data.forEach((p) => tags.set(p.user_id, profileBattleTag(p)));
  }
  return <ClanParticipantManagement clanId={clanId} gameSlug={gameSlug} records={result.records.map((p) => ({ ...p, accountName: p.userId ? names.get(p.userId) ?? null : null, gameTag: p.userId ? tags.get(p.userId) ?? null : null }))} />;
}
