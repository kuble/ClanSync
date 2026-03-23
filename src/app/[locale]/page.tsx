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
  await params;

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
          <CardTitle>Phase 3 — 정적 목업</CardTitle>
          <CardDescription>
            클랜 메인·서브 화면은 Next가 아니라 저장소{" "}
            <code className="text-xs">mockup/</code> 와{" "}
            <code className="text-xs">mockup/_hub.html</code> 에서만
            진행합니다. Next 앱의 클랜 라우트는 혼동 방지를 위해 제거했습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            허브에서 iframe으로 클랜 목업을 열려면{" "}
            <code className="text-xs">mockup/_hub.html</code> 파일을 브라우저로
            여세요.
          </p>
          <p>
            단일 파일 목업:{" "}
            <code className="text-xs">mockup/pages/main-clan.html</code>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
