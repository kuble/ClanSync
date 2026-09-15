# S04 — 밸런스메이커

## 결정 참조

- 네임플레이트·경기 슬롯 동기화 **[D-PROFILE-01](../decisions.md#d-profile-01--네임플레이트-동기화-규약)** · Premium 잠금 동선 **[D-STORE-02](../decisions.md#d-store-02--premium-잠금-카드의-업그레이드-안내-동선)** · 스크림 확정 후 이벤트 자동 생성 **[D-EVENTS-01](../decisions.md#d-events-01--스크림-확정--클랜-이벤트-자동-생성동기화)**.
- 운영 권한·세션 내 액션은 전역 매트릭스 **[D-PERM-01](../decisions.md#d-perm-01--클랜-권한-매트릭스-모델-도입)** 와 정합. 세부 카피·플로우는 [pages/09-BalanceMaker.md](../pages/09-BalanceMaker.md) 단일 출처.

## 스코프

- 기본 명단 입력은 최근 참여순 클랜원 목록에서 운영진이 직접 선택(2026-09-16 사용자 확정·기존 정렬 설계 확인). 출전자 10명 유지·라운드 사이 교체라는 기존 운영 방식에 맞춰 [D-UX-01 논의](../product-design-evolution.md#ux-01)에서 수동 UI를 구체화한다.
- 대기방 화면 연결은 프로젝트 적용 방향 확정(2026-09-16). OCR 명단 후보와 수동 선택의 합류를 구현 대상으로 포함한다. 게임사 문의는 후속이며 실제 구현·검증은 미완료다. 플랜 범위·세부 UX는 미결이다.
- 집계일(KST 06:00 기준), 밸런스장 단독 배치 편집, 배치 완료 → 밴픽 → 경기 시작
- 수동(M)·자동(A) 점수 표기: **Premium**에서만 A 관련 UI (Free는 M 고정 등)
- 승부예측 마감 타이밍, Premium: 자동 밸런스·OCR·디스코드 알림(선택)
- 경기 슬롯 네임플레이트(프리셋만)

## 수용 기준

- [x] `pages/09-BalanceMaker.md` 의 세션 순서와 모순 없음
- [x] `pages/09-BalanceMaker.md` 의 M/A·슬롯 규칙 반영

## 심층 문서 (여기만 열 것)

- [../pages/09-BalanceMaker.md](../pages/09-BalanceMaker.md)

## 목업

- `mockup/pages/main-clan.html` (밸런스 서브뷰)
- `mockup/scripts/clan-mock.js` (`mockBalance*` 등)

## 스키마

- `matches`, `match_players`, `match_results` 등 — [../schema.md](../schema.md)
