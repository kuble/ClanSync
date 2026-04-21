import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default async function MainClanStubPage({
  params,
}: {
  params: Promise<{ gameSlug: string; clanId: string }>;
}) {
  const { gameSlug, clanId } = await params;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        클랜 허브 (M4)
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        게임 <code className="text-xs">{gameSlug}</code> · 클랜{" "}
        <code className="text-xs">{clanId}</code>
      </p>
      <p className="text-muted-foreground mt-4 text-sm">
        MainClan 쉘·탭은 M4에서 연결합니다.
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
