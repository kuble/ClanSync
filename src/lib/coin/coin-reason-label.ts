/** coin_transactions.reason → 사용자 표시용 (D-STORE-01 키) */
export function coinReasonLabelKo(reason: string): string {
  const map: Record<string, string> = {
    purchase_store: "스토어 구매",
    match_enter: "내전 출전",
    match_win: "내전 승리",
    attendance_daily: "출석",
    balance_prediction_stake: "승부예측 참여",
    balance_prediction_refund: "승부예측 반환",
    balance_prediction_win: "승부예측 배당",
  };
  return map[reason] ?? reason;
}
