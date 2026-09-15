# ClanSync 문서 안내

현재 작업은 **TODO**에서 확인합니다. 기획 논의는 **고도화 논의 문서 → 해당 결정 코드**, 구현은 **해당 슬라이스 → 필요한 상세 명세** 순서로 접근합니다. 제안·확정 요구·구현·검증 완료 상태를 구분합니다.

## 무엇을 볼 때 어디로 가는가

| 목적 | 기준 문서 |
|------|-----------|
| 프로젝트 소개·실행 | [프로젝트 README](../README.md) |
| 현재 작업·다음 우선순위 | [TODO.md](TODO.md) |
| 기획·디자인 고도화 논의 | [고도화 논의 문서](01-plan/product-design-evolution.md) — 제안 7개·결정 질문·화면 방향 |
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
2. 구현 상태·검증 결과는 `TODO_Phase2.md`에, 다음 우선순위는 `TODO.md`에 적습니다. 별도 현황표를 복제하지 않습니다.
3. 동작이 바뀌면 해당 상세 명세와 필요한 QA 절차를 갱신합니다. 코드 리뷰만 한 경우 QA 완료로 표시하지 않습니다.
4. 요구사항 체크와 실행 검증을 구분합니다. 화면이 존재하거나 빌드가 통과했다는 이유로 RLS·동시성·접근성 검증을 완료 처리하지 않습니다.
5. 세션 결과는 `TODO_LOG.md`에 짧게 추가합니다. 파일별 변경 이력은 Git을 사용합니다.
6. 커밋·검증·푸시 조건은 [AGENTS.md](../AGENTS.md)를 따릅니다.
7. 고도화 논의는 해당 문서에 이어 쓰고, 확정 시 `decisions.md`와 영향받는 기존 명세를 갱신합니다. 논의 문서를 구현 상태표로 사용하지 않습니다.

## 필요할 때만 보는 과거 기록

아래 문서는 과거 결정과 목업 유지보수에 필요하므로 보존합니다. 현재 기능 상태의 기준으로 사용하지 않습니다.

- [TODO_Phase1.md](TODO_Phase1.md): 종료된 정적 목업 체크리스트.
- [AUDIT-Phase1-2026-04-21.md](AUDIT-Phase1-2026-04-21.md): 당시 감사와 후속 정리 기록.
- [TODO_LOG.md](TODO_LOG.md): 세션 이력.
- [정적 목업 플랜](01-plan/non-page/clan-main-static-mockup-plan.md): 목업의 화면·권한 표현 의도.

`PHASE2_EXPERIENCE.md`의 중복 상태표·옛 데모는 제거하고 진행도·QA 문서로 연결했습니다. 페이지 명세·정책 결정·법무 검토는 고유한 요구사항을 담으므로 유지합니다.

구독 표시 용어는 **Free / Premium**으로 통일합니다. 기존 `pro-*` 코드 식별자는 별도입니다.
