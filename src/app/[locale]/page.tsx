import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface LocaleHomeProps {
  params: Promise<{ locale: string }>;
}

export default async function LocaleHome({ params }: LocaleHomeProps) {
  const { locale } = await params;
  const demoClan = `/${locale}/games/overwatch/clan/demo`;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">ClanSync</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          멀티 게임 클랜 관리 · 내전/스크림 기록
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>MainClan 쉘 (개발용)</CardTitle>
          <CardDescription>
            현재 클랜 영역은 목업 데이터만 사용합니다. Supabase는 목업 이후에
            연동합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link
            href={demoClan}
            className={cn(buttonVariants({ variant: "default" }))}
          >
            데모 클랜 열기
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
