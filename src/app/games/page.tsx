import { redirect } from "next/navigation";
import { GameCardGrid } from "@/components/games/game-card-grid";
import type { ClanStatus, GameCardState } from "@/lib/routing/game-card-router";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

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

  if (gErr) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-16">
        <p className="text-destructive text-sm font-medium">
          게임 목록을 불러오지 못했습니다.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          배포 환경(Vercel 등)의{" "}
          <code className="text-foreground text-xs">NEXT_PUBLIC_SUPABASE_URL</code>·
          <code className="text-foreground text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          가 이 프로젝트와 일치하는지 확인해 주세요. 로컬과 다른 Supabase 프로젝트를
          가리키면 API 오류가 납니다.
        </p>
        <p className="text-muted-foreground mt-2 font-mono text-xs break-all">
          {gErr.message}
        </p>
      </main>
    );
  }

  if (!games?.length) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-16">
        <p className="text-muted-foreground text-sm">
          등록된 게임이 없습니다. DB에{" "}
          <code className="text-foreground text-xs">0002_auth_login_and_seed_games.sql</code>{" "}
          시드가 적용됐는지 확인해 주세요.
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
    .eq("user_id", user.id)
    .eq("status", "active");

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

  const memberByGame = new Map<
    string,
    { clanId: string; clanName: string }
  >();

  for (const m of memberships ?? []) {
    const c = clanById.get(m.clan_id as string);
    if (!c?.game_id) continue;
    if (!memberByGame.has(c.game_id)) {
      memberByGame.set(c.game_id, {
        clanId: c.id,
        clanName: c.name,
      });
    }
  }

  const { data: pendingRows } = await supabase
    .from("clan_join_requests")
    .select("game_id, clan_id, clans!inner(name)")
    .eq("user_id", user.id)
    .eq("status", "pending");

  const pendingByGame = new Map<string, { clanId: string; clanName: string }>();
  for (const row of pendingRows ?? []) {
    const gid = row.game_id as string;
    if (pendingByGame.has(gid)) continue;
    const cn = row.clans as unknown as { name: string };
    pendingByGame.set(gid, {
      clanId: row.clan_id as string,
      clanName: cn?.name ?? "",
    });
  }

  const cards: (GameCardState & { title: string; emoji: string })[] = games.map(
    (game) => {
      const auth = verified.get(game.id) ?? false;
      const mem = memberByGame.get(game.id);
      const pend = pendingByGame.get(game.id);

      let clanStatus: ClanStatus = "none";
      let clanId: string | null = null;
      let clanName: string | null = null;

      if (mem) {
        clanStatus = "member";
        clanId = mem.clanId;
        clanName = mem.clanName;
      } else if (pend) {
        clanStatus = "pending";
        clanId = pend.clanId;
        clanName = pend.clanName;
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
