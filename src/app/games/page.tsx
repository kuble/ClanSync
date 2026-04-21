import { redirect } from "next/navigation";
import { GameCardGrid } from "@/components/games/game-card-grid";
import type { ClanStatus, GameCardState } from "@/lib/routing/game-card-router";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const EMOJI: Record<string, string> = {
  overwatch: "🎮",
  valorant: "🎯",
  lol: "⚔️",
  pubg: "🪖",
};

export default async function GamesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/games");

  const { data: games, error: gErr } = await supabase
    .from("games")
    .select("id, slug, name_ko, is_active")
    .order("slug");

  if (gErr || !games?.length) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-16">
        <p className="text-muted-foreground text-sm">
          게임 목록을 불러오지 못했습니다. Supabase 연결과 `0002` 마이그레이션을
          확인해 주세요.
        </p>
      </main>
    );
  }

  const { data: ugRows } = await supabase
    .from("user_game_profiles")
    .select("game_id, is_verified")
    .eq("user_id", user.id);

  const verified = new Map(
    (ugRows ?? []).map((r) => [r.game_id as string, r.is_verified === true]),
  );

  const { data: memberships } = await supabase
    .from("clan_members")
    .select("clan_id, status")
    .eq("user_id", user.id);

  const clanIds = [...new Set((memberships ?? []).map((m) => m.clan_id))];
  const { data: clanRows } =
    clanIds.length > 0
      ? await supabase
          .from("clans")
          .select("id, name, game_id")
          .in("id", clanIds)
      : { data: [] as { id: string; name: string; game_id: string }[] };

  const clanById = new Map(
    (clanRows ?? []).map((c) => [c.id, c] as const),
  );

  const byGame = new Map<
    string,
    { status: string; clanId: string; clanName: string }
  >();

  for (const m of memberships ?? []) {
    if (m.status !== "active" && m.status !== "pending") continue;
    const c = clanById.get(m.clan_id as string);
    if (!c?.game_id) continue;
    if (!byGame.has(c.game_id)) {
      byGame.set(c.game_id, {
        status: m.status as string,
        clanId: c.id,
        clanName: c.name,
      });
    }
  }

  const cards: (GameCardState & { title: string; emoji: string })[] = games.map(
    (game) => {
      const auth = verified.get(game.id) ?? false;
      const cm = byGame.get(game.id);
      let clanStatus: ClanStatus = "none";
      let clanId: string | null = null;
      let clanName: string | null = null;

      if (cm) {
        if (cm.status === "pending") {
          clanStatus = "pending";
          clanId = cm.clanId;
          clanName = cm.clanName;
        } else if (cm.status === "active") {
          clanStatus = "member";
          clanId = cm.clanId;
          clanName = cm.clanName;
        }
      }

      return {
        slug: game.slug,
        title: game.name_ko,
        emoji: EMOJI[game.slug] ?? "🎮",
        auth,
        clanStatus,
        clanId,
        clanName,
        disabled: game.is_active === false,
      };
    },
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">게임 선택</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            플레이할 게임을 선택하세요.
          </p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      </header>

      <GameCardGrid cards={cards} />
    </main>
  );
}
