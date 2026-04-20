# S06 — 이벤트·관리·스토어

## 스코프

- **이벤트**: 월간 캘린더 + 일정 그리드, 반복 규칙, 스크림 확정 시 자동 반영(문서상)
- **관리**: 가입 승인, 구성원 테이블, 개인 상세 통계·메달
- **스토어**: 클랜/개인 꾸미기, 코인 소비 — **서비스 프리셋만** (업로드 없음)

## Premium

- 이벤트: 대진표 생성기 등 ([PRD](../PRD.md) 표 참고)
- 스토어: Premium 잠금 아이템 목업 가능

## 수용 기준

- [x] 스토어 카드에 Free/Premium 잠금이 시각적으로 구분 (`pro` 카드·disabled `Premium` 버튼)
- [x] 이벤트 **대진표 생성기**가 PRD Premium 전용임을 탭·Free 플랜 안내로 구분

## 목업

- `mockup/pages/main-clan.html` — `view-events` · `view-manage` · `view-store`
- 정적 목업 IA·권한: [non-page/clan-main-static-mockup-plan.md](../non-page/clan-main-static-mockup-plan.md) §4.4–4.6

## 스키마

- `clan_events`, `coin_transactions` 등 — [../schema.md](../schema.md)
