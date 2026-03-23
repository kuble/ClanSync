import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** 클랜 통계 재기획 전까지 빈 화면. 플랜: docs/01-plan/clan-stats-plan.md */
export function ClanStatsPlaceholder() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">클랜 통계</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          클랜 단위 경기·아카이브·순위 중심으로 화면을 다시 짜는 중입니다. 정보
          구조와 블록 정의는{" "}
          <span className="text-foreground font-medium">
            docs/01-plan/clan-stats-plan.md
          </span>
          를 기준으로 합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">준비 중</CardTitle>
          <CardDescription>
            구현 시 우선순위대로 아래 블록을 채웁니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <ul className="list-disc space-y-1 pl-5">
            <li>클랜 요약 — 총 경기 수, 내전/스크림 비율, 기간별 승패·승률</li>
            <li>경기 아카이브 — 클랜 소속 경기 목록·필터·보관 정책</li>
            <li>
              순위표 — 참여율·승률 등, 클랜 경기 데이터 기준 내부 순위(정의·최소
              샘플 수 별도)
            </li>
            <li>추세·분해 — 맵/모드별 클랜 승률, 기간 트렌드</li>
            <li>운영진 전용 — 시너지·히트맵 등 민감 지표(노출 정책 별도)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
