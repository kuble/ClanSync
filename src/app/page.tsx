import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RootPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-20">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-4xl font-semibold tracking-tight">ClanSync</h1>
        <p className="text-muted-foreground text-lg">
          멀티 게임 클랜 관리 · 내전/스크림 기록
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/sign-up"
          className={cn(
            buttonVariants({ size: "lg" }),
            "inline-flex w-full min-w-[200px] justify-center sm:w-auto",
          )}
        >
          시작하기
        </Link>
        <Link
          href="/sign-in"
          className={cn(
            buttonVariants({ size: "lg", variant: "outline" }),
            "inline-flex w-full min-w-[200px] justify-center sm:w-auto",
          )}
        >
          로그인
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phase 2 — M2 인증 쉘</CardTitle>
          <CardDescription>
            회원가입·로그인 후 게임 선택 화면으로 이동합니다. 목업은{" "}
            <code className="text-xs">mockup/_hub.html</code>, 설계는{" "}
            <code className="text-xs">docs/TODO_Phase2.md</code> 를 참고하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            로그인된 상태에서 이 페이지를 열면{" "}
            <Link href="/games" className="text-primary underline-offset-4 hover:underline">
              /games
            </Link>
            로 이동합니다 (<span className="whitespace-nowrap">D-LANDING-04</span>
            , 단 <code className="text-xs">?from=logo</code> 예외).
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
