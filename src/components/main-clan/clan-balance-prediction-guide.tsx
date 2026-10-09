export function ClanBalancePredictionGuide({ predictionMinutes, pooled }: {
  predictionMinutes: number;
  pooled: boolean;
}) {
  return <section aria-label="승부예측 가이드" className="space-y-5">
    <h3 className="text-base font-semibold">승부예측 가이드</h3>
    <section className="space-y-2">
      <h4 className="text-sm font-semibold">참여와 마감</h4>
      <p className="text-sm leading-relaxed text-muted-foreground">관전 중인 멤버가 블루 승·레드 승·무승부 중 하나를 선택합니다. 이번 경기 출전자는 참여할 수 없습니다.</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{pooled ? `밸런스 편집부터 참여할 수 있으며 경기 현황으로 전환된 시점부터 ${predictionMinutes}분 후 마감됩니다.` : "경기 시작 후 표시된 마감 시간까지 참여할 수 있습니다."} 마감 전까지 선택을 변경하거나 취소할 수 있습니다.</p>
    </section>
    {pooled ? <>
      <section className="space-y-2">
        <h4 className="text-sm font-semibold">코인과 배당</h4>
        <p className="text-sm leading-relaxed text-muted-foreground">사용 가능한 개인 코인 중 원하는 만큼 정수로 입력합니다. 참여 코인은 잔액에서 차감되며 마감 전에 취소하면 돌려받습니다.</p>
        <p className="text-sm leading-relaxed text-muted-foreground">전체 풀을 적중자들의 참여 코인 비율로 나눕니다. 표시된 배수는 마감까지 변하며 수령액에는 원금이 포함됩니다.</p>
        <p className="rounded-lg border bg-muted/25 p-3 text-xs leading-relaxed text-muted-foreground">예: 전체 풀 60코인, 적중 쪽에 30코인이 걸렸다면 2배입니다. 10코인으로 적중하면 20코인을 받아 순이익은 10코인입니다.</p>
        <p className="text-sm leading-relaxed text-muted-foreground">무효·재경기이거나 적중자가 없으면 참여 코인을 전액 반환합니다.</p>
      </section>
      <section className="space-y-2">
        <h4 className="text-sm font-semibold">내전 개설자</h4>
        <p className="text-sm leading-relaxed text-muted-foreground">개설자는 관전 중 코인 없이 예측만 참여합니다. 적중률은 기록하지만 코인 풀과 배당에는 포함되지 않습니다.</p>
      </section>
      <section className="space-y-2">
        <h4 className="text-sm font-semibold">내전 예측 순위</h4>
        <p className="text-sm leading-relaxed text-muted-foreground">현재 내전의 닉네임·적중률·누적 순이익을 클랜 멤버에게 공개합니다. 순이익은 받은 배당에서 참여 코인을 뺀 값이며 반환된 코인은 순이익에 포함하지 않습니다.</p>
      </section>
    </> : <section className="space-y-2">
      <h4 className="text-sm font-semibold">적중 보상</h4>
      <p className="text-sm leading-relaxed text-muted-foreground">이전 방식으로 시작한 경기는 결과 확정 후 적중자에게 클랜 코인 풀에서 5코인을 지급합니다. 무효·재경기는 보상이 없습니다.</p>
    </section>}
  </section>;
}
