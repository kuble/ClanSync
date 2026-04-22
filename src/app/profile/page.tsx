import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import {
  ProfileGameDecorations,
  type BadgeRow,
  type DecorationGame,
  type NameplateOptionRow,
} from "@/components/profile/profile-game-decorations";
import { ProfileJoinRequests } from "@/components/profile/profile-join-requests";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type NameplateCategory = Database["public"]["Enums"]["nameplate_category"];

function genderLabel(g: string): string {
  if (g === "male") return "남성";
  if (g === "female") return "여성";
  return "비공개";
}

type JoinRow = {
  id: string;
  status: "pending" | "approved" | "rejected" | "canceled";
  applied_at: string;
  resolved_at: string | null;
  reject_reason: string | null;
  message: string;
  clans: { name: string } | null;
  games: { slug: string; name_ko: string } | null;
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/profile");

  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const [
    { data: row },
    { data: rawJoin },
    { data: ugpRows },
    { data: inv },
    { data: sel },
    { data: unl },
    { data: picks },
  ] = await Promise.all([
    supabase
      .from("users")
      .select(
        "nickname, email, birth_year, gender, language, coin_balance, auto_login, created_at",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("clan_join_requests")
      .select(
        `id, status, applied_at, resolved_at, reject_reason, message,
         clans ( name ),
         games ( slug, name_ko )`,
      )
      .eq("user_id", user.id)
      .order("applied_at", { ascending: false }),
    supabase
      .from("user_game_profiles")
      .select("game_id, games ( id, slug, name_ko )")
      .eq("user_id", user.id),
    supabase.from("user_nameplate_inventory").select("option_id").eq("user_id", user.id),
    supabase
      .from("user_nameplate_selections")
      .select("game_id, category, option_id")
      .eq("user_id", user.id),
    supabase.from("user_badge_unlocks").select("badge_id").eq("user_id", user.id),
    supabase
      .from("user_badge_picks")
      .select("game_id, badge_id, slot_index")
      .eq("user_id", user.id)
      .order("slot_index", { ascending: true }),
  ]);

  function normalizeJoin(
    r: NonNullable<typeof rawJoin>[number],
  ): JoinRow {
    const cRaw = r.clans as { name: string } | { name: string }[] | null;
    const gRaw = r.games as
      | { slug: string; name_ko: string }
      | { slug: string; name_ko: string }[]
      | null;
    const clanOne = Array.isArray(cRaw) ? cRaw[0] : cRaw;
    const gameOne = Array.isArray(gRaw) ? gRaw[0] : gRaw;
    return {
      id: r.id,
      status: r.status as JoinRow["status"],
      applied_at: r.applied_at,
      resolved_at: r.resolved_at,
      reject_reason: r.reject_reason,
      message: r.message,
      clans: clanOne ?? null,
      games: gameOne ?? null,
    };
  }

  const joinRequests: JoinRow[] = (rawJoin ?? [])
    .map(normalizeJoin)
    .filter((r) => {
      if (r.status === "pending") return true;
      if (r.status !== "approved" && r.status !== "rejected") return false;
      if (!r.resolved_at) return false;
      return new Date(r.resolved_at) >= weekAgo;
    });

  const linkedGames: DecorationGame[] = (ugpRows ?? [])
    .map((r) => {
      const gRaw = r.games as
        | { id: string; slug: string; name_ko: string }
        | { id: string; slug: string; name_ko: string }[]
        | null;
      const g = Array.isArray(gRaw) ? gRaw[0] : gRaw;
      if (!g) return null;
      return { gameId: g.id, slug: g.slug, nameKo: g.name_ko };
    })
    .filter((x): x is DecorationGame => x !== null);

  const gameIds = linkedGames.map((g) => g.gameId);

  const [{ data: npOpts }, { data: badgeRows }] = await Promise.all([
    gameIds.length
      ? supabase
          .from("nameplate_options")
          .select("id, game_id, category, name_ko, unlock_source")
          .in("game_id", gameIds)
          .eq("is_active", true)
      : Promise.resolve({
          data: [] as NameplateOptionRow[],
          error: null as null,
        }),
    gameIds.length
      ? supabase
          .from("badges")
          .select("id, game_id, name_ko, icon, unlock_source, unlock_condition")
          .in("game_id", gameIds)
          .eq("is_active", true)
      : Promise.resolve({ data: [] as BadgeRow[], error: null as null }),
  ]);

  const nameplateOptions: NameplateOptionRow[] = (npOpts ?? []).map((o) => ({
    id: o.id,
    game_id: o.game_id,
    category: o.category as NameplateCategory,
    name_ko: o.name_ko,
    unlock_source: o.unlock_source,
  }));

  const badges: BadgeRow[] = (badgeRows ?? []).map((b) => ({
    id: b.id,
    game_id: b.game_id,
    name_ko: b.name_ko,
    icon: b.icon,
    unlock_source: b.unlock_source,
    unlock_condition: b.unlock_condition,
  }));

  const ownedOptionIds = (inv ?? []).map((i) => i.option_id);
  const selections =
    (sel ?? []) as Array<{
      game_id: string;
      category: NameplateCategory;
      option_id: string;
    }>;
  const unlockedBadgeIds = (unl ?? []).map((u) => u.badge_id);
  const pickRows = (picks ?? []) as Array<{
    game_id: string;
    badge_id: string;
    slot_index: number;
  }>;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          프로필
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">내 계정</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          계정 정보와 꾸미기·가입 신청 상태를 한곳에서 확인합니다.
        </p>
      </header>

      {row ? (
        <dl className="bg-card space-y-3 rounded-xl border p-4 text-sm shadow-sm">
          <div>
            <dt className="text-muted-foreground text-xs">닉네임</dt>
            <dd className="font-medium">{row.nickname}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">이메일</dt>
            <dd className="break-all">{row.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">출생연도</dt>
            <dd>{row.birth_year}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">성별</dt>
            <dd>{genderLabel(row.gender as string)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">언어</dt>
            <dd>{row.language}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">코인</dt>
            <dd className="tabular-nums">
              {(row.coin_balance ?? 0).toLocaleString("ko-KR")}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">자동 로그인</dt>
            <dd>{row.auto_login ? "켬" : "끔"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">가입일</dt>
            <dd className="text-muted-foreground text-xs">
              {row.created_at
                ? new Date(row.created_at as string).toLocaleString("ko-KR")
                : "—"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-destructive text-sm">
          프로필 행을 불러오지 못했습니다. 관리자에게 문의해 주세요.
        </p>
      )}

      <ProfileGameDecorations
        games={linkedGames}
        nameplateOptions={nameplateOptions}
        ownedOptionIds={ownedOptionIds}
        selections={selections}
        badges={badges}
        unlockedBadgeIds={unlockedBadgeIds}
        picks={pickRows}
      />

      <ProfileJoinRequests rows={joinRequests} />

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/games"
          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
        >
          게임 선택
        </Link>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      </div>
    </main>
  );
}
