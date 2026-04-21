import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RootPage() {
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
          <CardTitle>Phase 2 — 구현 준비 중</CardTitle>
          <CardDescription>
            Phase 1 정적 목업은 <code className="text-xs">mockup/_hub.html</code>
            에서 확인할 수 있습니다. Phase 2는{" "}
            <code className="text-xs">docs/TODO_Phase2.md</code> 로드맵(M0~M8)에
            따라 <code className="text-xs">src/</code> 라우트를 채워 나갑니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            단일 출처:{" "}
            <code className="text-xs">docs/01-plan/pages.md</code>(라우팅) ·{" "}
            <code className="text-xs">schema.md</code>(DB) ·{" "}
            <code className="text-xs">decisions.md</code>(결정).
          </p>
          <p>
            Phase 1 목업 허브:{" "}
            <code className="text-xs">mockup/_hub.html</code> (브라우저로 직접
            열기).
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
