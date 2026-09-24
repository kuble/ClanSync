# ClanSync 문서 안내

시작할 때는 **[TODO](TODO.md) → 아래 기능별 진입점 → 필요한 명세**만 읽습니다. 기획 전체·완료 이력은 해당 결정의 근거가 필요할 때만 찾습니다. 제안·확정 요구·구현·검증 완료 상태를 구분합니다.

## 기능별 코드·테스트 진입점

검증 범위는 [변경 위험도 기준](../.cursor/rules/agent-auto-tasks.mdc), 실행 명령은 [E2E 안내](../e2e/README.md)를 따릅니다. 아래는 관련 파일을 찾는 지도이며 매번 전부 읽거나 실행하는 목록이 아닙니다.

| 기능 | 코드 시작점 | 관련 테스트 |
|---|---|---|
| 내전 로비·예약·참석 응답 | [로비](../src/components/main-clan/clan-balance-lobby.tsx) · [방 액션](../src/app/actions/clan-balance-rooms.ts) · [방 권한](../src/lib/balance/room-access.ts) | [로비 통합](../e2e/balance-lobby.spec.ts) · [방 DB](../scripts/balance-rooms-db.test.mjs) |
| 명단 입력·자동 저장 | [명단 편집](../src/components/main-clan/clan-balance-roster-editor.tsx) · [자동 저장](../src/lib/balance/roster-autosave.ts) | [roster-autosave](../e2e/roster-autosave.spec.ts) · [내전 통합](../e2e/balance-session-live.spec.ts) |
| 참가자 점수·세션 전적 | [정보창](../src/components/main-clan/balance-player-details.tsx) · [세션 집계](../src/lib/balance/player-session-stats.ts) · [점수 표시](../src/lib/balance/score-display.ts) | [점수·호버 통합](../e2e/balance-insights.spec.ts) · [세션 집계](../e2e/player-session-stats.spec.ts) · [합계](../e2e/balance-score-display.spec.ts) |
| 역할 추첨·팀 편성·공유 연출 | [편성 UI](../src/components/main-clan/clan-balance-formation.tsx) · [경매 연출](../src/components/main-clan/balance-auction-stage.tsx) · [보드 연출](../src/components/main-clan/clan-balance-reveal-board.tsx) · [규칙](../src/lib/balance/formation.ts) | [formation-rules](../e2e/formation-rules.spec.ts) · [경매 흐름](../e2e/balance-auction-flow.spec.ts) · [내전 통합](../e2e/balance-session-live.spec.ts) · [편성 DB](../scripts/formation-db.test.mjs) |
| 클랜 전략 아이템 | [관리 UI](../src/components/main-clan/clan-auction-item-settings.tsx) · [관리 액션](../src/app/actions/clan-auction-items.ts) | [아이템 관리](../e2e/auction-catalog.spec.ts) · [권한 DB](../scripts/clan-auction-items-db.test.mjs) |
| 역할 선호·라운드 설정 | [선호 액션](../src/app/actions/role-preferences.ts) · [설정 UI](../src/components/main-clan/clan-balance-settings.tsx) | [프로필 선호](../e2e/profile-role-preference.spec.ts) · [멤버 선호](../e2e/balance-member-preference.spec.ts) · [선호 DB](../scripts/role-preferences-db.test.mjs) |
| 경기 전 밴픽·수동 맵 | [경기 준비](../src/components/main-clan/clan-balance-prematch-controls.tsx) · [밴 설정](../src/lib/balance/prematch.ts) · [맵 목록](../src/lib/balance/map-pools.ts) | [밴픽 통합](../e2e/balance-prematch.spec.ts) · [밴픽 DB](../scripts/prematch-db.test.mjs) |
| 세션·라운드·기록·자동 종료 | [세션 액션](../src/app/actions/clan-balance-session.ts) · [자동 종료 설정](../src/app/actions/clan-balance-settings.ts) · [기록 규칙](../src/lib/balance/history.ts) | [자동 종료 DB](../scripts/balance-auto-close-db.test.mjs) · [기록 규칙](../e2e/balance-history-rules.spec.ts) · [내전 통합](../e2e/balance-session-live.spec.ts) · [세션 DB](../scripts/session-round-db.test.mjs) |
| 로그인·권한·계정 격리 | [인증 액션](../src/app/actions/auth.ts) · [클랜 접근](../src/lib/clan/request-clan-access.ts) | [auth-performance](../e2e/auth-performance.spec.ts) · [쿠키](../e2e/session-cookies.spec.ts) · [계정 격리](../e2e/clan-request-isolation.spec.ts) · [RLS/권한 DB](../scripts/review-db.test.mjs) |
| 클랜 운영·공지 | [관리 탭](../src/components/main-clan/clan-manage-tabs.tsx) · [내전 관리 설정](../src/components/main-clan/clan-balance-auto-close-settings.tsx) · [공지 액션](../src/app/actions/clan-notices.ts) | [관리](../e2e/clan-management.spec.ts) · [대시보드](../e2e/clan-dashboard.spec.ts) · [공지 DB](../scripts/clan-notices-db.test.mjs) |
| 일정·시간대 | [일정 액션](../src/app/actions/clan-events.ts) · [시간 파싱](../src/lib/clan/parse-event-start.ts) | [event-timezone](../e2e/event-timezone.spec.ts) · [review-rules](../e2e/review-rules.spec.ts) |
| 공통 화면·페이지 이동 | [클랜 셸](../src/components/main-clan/main-clan-shell.tsx) · [클랜 레이아웃](../src/app/games/[gameSlug]/clan/[clanId]/layout.tsx) | [navigation-feedback](../e2e/navigation-feedback.spec.ts) · [frontend-rebuild](../e2e/frontend-rebuild.spec.ts) · [ui-regression](../e2e/ui-regression.spec.ts) |

## 무엇을 볼 때 어디로 가는가

| 목적 | 기준 문서 |
|------|-----------|
| 프로젝트 소개·실행 | [프로젝트 README](../README.md) |
| 현재 작업·다음 우선순위 | [TODO.md](TODO.md) |
| 내전 세션·라운드·날짜·참여 용어 | [용어 사전](01-plan/glossary.md#내전-운영-용어) — D-SESSION-01 확정 기준 |
| 정규·깜짝 방·예약·임시 진행자 | [내전 로비 명세](02-design/session-lobby.md) |
| 기획·디자인 고도화 논의 | [고도화 논의 문서](01-plan/product-design-evolution.md) — 제안 7개·결정 질문·화면 방향 |
| 편성 방식·팀원용 공유 연출 | [편성 명세](02-design/formation-modes.md) — 확정 규칙·적용 범위·후속 구분 |
| 클랜 통계·역할별 함께한 기록/상대 전적 | [통계 명세](01-plan/pages/10-Clan-Stats.md) — 명예의 전당·내전 통계·개인 기록, 사이트 이용은 관리로 이전. 항목별 표현·배치 우선순위·인터랙션 포함. 기획 확정·구현 대기 |
| Phase 2 구현 현황·완료 검증 | [TODO_Phase2.md](TODO_Phase2.md) |
| 코드 리뷰·수정 필요 사안 | [2026-09-15 리뷰](03-analysis/code-review-2026-09-15.md) |
| 제품 범위·구독 티어 | [PRD](01-plan/PRD.md) |
| 기능별 작업 단위 | [FEATURE_INDEX](01-plan/FEATURE_INDEX.md) → 해당 `slices/` 파일 |
| 라우트·화면 요구 | [pages.md](01-plan/pages.md) → 해당 `pages/` 파일 |
| 확정한 정책의 근거 | [decisions.md](01-plan/decisions.md) |
| 권한·플랜 요구 | [gating-matrix.md](01-plan/gating-matrix.md) |
| DB 설계 의도 | [schema.md](01-plan/schema.md) — 실제 구조는 [마이그레이션](../supabase/migrations/)·생성 타입과 대조 |
| 미결·후속 아이디어 | [BACKLOG.md](01-plan/BACKLOG.md) |
| 수동 시연·재현 | [QA_시나리오.md](QA_시나리오.md) |
| 테스트 실행·픽스처 | [E2E 안내](../e2e/README.md) · [debug-and-fixtures.md](01-plan/debug-and-fixtures.md) |
| 배포 연동 복구 | [VERCEL_PRODUCTION_SYNC.md](VERCEL_PRODUCTION_SYNC.md) |
| 디자인·용어 확인 | [mockup-spec.md](02-design/mockup-spec.md) · [theme-modes.md](02-design/theme-modes.md) · [glossary.md](01-plan/glossary.md) |

## 중복을 늘리지 않는 갱신 규칙

1. 한 작업은 슬라이스 하나 또는 한 수정 사안으로 제한합니다.
2. 현재 초점·제약·다음 우선순위는 짧은 `TODO.md` 하나에 유지합니다. 상세 구현·검증 근거는 `TODO_Phase2.md`에 두고 시작 문서·README·로그에 결과표를 복제하지 않습니다.
3. 동작이 바뀌면 해당 상세 명세와 필요한 QA 절차를 갱신합니다. 코드 리뷰만 한 경우 QA 완료로 표시하지 않습니다.
4. 요구사항 체크와 실행 검증을 구분합니다. 화면이 존재하거나 빌드가 통과했다는 이유로 RLS·동시성·접근성 검증을 완료 처리하지 않습니다.
5. 의미 있는 동작·결정·진행 상태 변경만 `TODO_LOG.md`에 날짜·결과·검증 범위/미검증 사항 1~3줄로 추가합니다. 작은 문구·스타일 수정마다 로그를 늘리지 않으며 파일별 변경 이력은 Git을 사용합니다.
6. 커밋·검증·푸시 조건은 [AGENTS.md](../AGENTS.md)를 따릅니다.
7. 고도화 논의는 해당 문서에 이어 쓰고, 확정 시 `decisions.md`와 영향받는 기존 명세를 갱신합니다. 논의 문서를 구현 상태표로 사용하지 않습니다.

## 필요할 때만 보는 과거 기록

아래 문서는 과거 결정과 목업 유지보수에 필요하므로 보존합니다. 현재 기능 상태의 기준으로 사용하지 않습니다.

- [TODO_Phase1.md](TODO_Phase1.md): 종료된 정적 목업 체크리스트.
- [AUDIT-Phase1-2026-04-21.md](AUDIT-Phase1-2026-04-21.md): 당시 감사와 후속 정리 기록.
- [TODO_LOG.md](TODO_LOG.md): 개발 작업 이력.
- [정적 목업 플랜](01-plan/non-page/clan-main-static-mockup-plan.md): 목업의 화면·권한 표현 의도.

`PHASE2_EXPERIENCE.md`의 중복 상태표·옛 데모는 제거하고 진행도·QA 문서로 연결했습니다. 페이지 명세·정책 결정·법무 검토는 고유한 요구사항을 담으므로 유지합니다.

구독 표시 용어는 **Free / Premium**으로 통일합니다. 기존 `pro-*` 코드 식별자는 별도입니다.
