import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

function genderLabel(g: string): string {
  if (g === "male") return "남성";
  if (g === "female") return "여성";
  return "비공개";
}

/** M5 전 단계: 계정 요약(읽기 전용). 네임플레이트·뱃지는 후속. */
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/profile");

  const { data: row } = await supabase
    .from("users")
    .select(
      "nickname, email, birth_year, gender, language, coin_balance, auto_login, created_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <header className="mb-8">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          프로필
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">내 계정</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          표시 정보는 <code className="text-xs">public.users</code> 기준입니다.
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
