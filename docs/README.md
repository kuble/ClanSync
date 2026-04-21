# ClanSync 문서 맵

**목적**: 세션마다 필요한 파일만 `@`로 붙여 **토큰을 최소화**하고, 구현은 **작은 기술 단위(슬라이스)** 로 나눈다.

---

## 읽는 순서 (처음 1회)

| 순서 | 파일 | 내용 |
|:----:|------|------|
| 1 | [01-plan/PRD.md](./01-plan/PRD.md) | 제품 한 줄, 티어(Free/Premium), 동결 범위 |
| 2 | [01-plan/FEATURE_INDEX.md](./01-plan/FEATURE_INDEX.md) | **슬라이스 목록** — 작업 시 여기서 ID만 고른다 |
| 3 | [TODO.md](./TODO.md) | **허브** — 상태·다음 프롬프트 (짧게 유지) |
| 3b | [TODO_Phase1.md](./TODO_Phase1.md) | Phase 1 정적 목업 체크·요약표 |
| 3c | [TODO_Phase2.md](./TODO_Phase2.md) | Phase 2 `src/`·Supabase·라우트 표 |
| — | [TODO_LOG.md](./TODO_LOG.md) | 세션 히스토리만 (일상 `@` 생략) |
| 4 | [01-plan/pages.md](./01-plan/pages.md) | 라우트 ↔ 화면 |
| 5 | [01-plan/schema.md](./01-plan/schema.md) | DB·엔티티 (구현 단계에서 해당 테이블만) |

디자인 토큰·목업 파일 구조: [02-design/mockup-spec.md](./02-design/mockup-spec.md)

---

## 세션 절차 (권장)

1. **한 세션 = 한 슬라이스(또는 그 하위 체크리스트 한 덩어리)** 만 구현·목업·문서 수정한다.
2. 작업 시작 시 `@docs/01-plan/FEATURE_INDEX.md` + **해당 슬라이스 파일 하나**만 추가로 연다.
3. PRD 전체를 다시 읽지 않는다. 요약·동결 내용은 `PRD.md` 상단만.
4. 미결·후속 아이디어는 [01-plan/BACKLOG.md](./01-plan/BACKLOG.md)에만 적고, 슬라이스 본문에는 **스코프 밖**으로 표시한다.
5. 목업 수정 시: 슬라이스의「목업」절에 적힌 경로만 연다.
6. 작업이 끝나면 [TODO_LOG.md](./TODO_LOG.md) 맨 위에 **세션 로그** 블록을 추가하고, [허브](./TODO.md)의 **마지막 갱신** 날짜를 고친 뒤, 해당 **페이즈** 문서([Phase2](./TODO_Phase2.md) 또는 목업 유지보수 시 [Phase1](./TODO_Phase1.md))의 체크·표를 갱신한다.
7. 진행도만 동기화하고 다음 프롬프트를 받으려면 Cursor에서 **`/todo`** 커맨드 실행 → [.cursor/commands/todo.md](../.cursor/commands/todo.md) 절차.

---

## 폴더 역할

| 경로 | 역할 |
|------|------|
| `docs/01-plan/PRD.md` | 동결된 기획 **요약** (짧게 유지) |
| `docs/01-plan/FEATURE_INDEX.md` | 슬라이스 인덱스 (진입점) |
| `docs/01-plan/slices/*.md` | 기능별 **실행 가능한** 명세 (한 파일 = 한 덩어리) |
| `docs/01-plan/BACKLOG.md` | 미결 사항·에셋 교체·나중 반영 |
| `docs/01-plan/debug-and-fixtures.md` | 로컬/staging **시드·픽스처·디버그 계층** (양 클랜·복수 계정). 결정: [decisions.md §D-DEV-01](./01-plan/decisions.md#d-dev-01--로컬staging-픽스처--디버그-계층) |
| `docs/01-plan/*.md` (기타) | 도메인 심층 메모 (밸런스 UI 노트 등) — 슬라이스에서 `@`로 참조 |
| `docs/TODO.md` | 허브 — 상태·다음 프롬프트 |
| `docs/TODO_LOG.md` | 세션 로그 (히스토리; 토큰 절약용 분리) |
| `docs/TODO_Phase1.md` | Phase 1 슬라이스 체크·요약표 |
| `docs/TODO_Phase2.md` | Phase 2 체크·라우트 표 |
| `docs/QA_시나리오.md` | **시연·직접 재현 절차** (마일스톤마다 누적). 규칙: `.cursor/rules/qa-demo-handoff.mdc` |
| `docs/02-design/` | 목업·디자인 시스템 |

---

## 용어 (고정)

- 구독: **Free** / **Premium** (제품·문서·UI 카피 통일)
- CSS 변수명 `pro-*`, 클래스 `badge-pro` 등은 **코드 식별자**로 유지 가능 (표시 문구는 Premium)
