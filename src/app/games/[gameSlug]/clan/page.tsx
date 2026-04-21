import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default async function ClanOnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameSlug: string }>;
  searchParams: Promise<{ pending?: string }>;
}) {
  const { gameSlug } = await params;
  const { pending } = await searchParams;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        클랜 가입 · 생성 (M3)
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        게임: <code className="text-xs">{gameSlug}</code>
        {pending ? " · 가입 신청 대기 뷰 자동 노출 예정" : null}
      </p>
      <Link
        href="/games"
        className={cn(buttonVariants({ variant: "outline" }), "mt-8 inline-flex")}
      >
        ← 게임 선택
      </Link>
    </main>
  );
}
