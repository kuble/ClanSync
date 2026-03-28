# ClanSync 문서 맵

**목적**: 세션마다 필요한 파일만 `@`로 붙여 **토큰을 최소화**하고, 구현은 **작은 기술 단위(슬라이스)** 로 나눈다.

---

## 읽는 순서 (처음 1회)

| 순서 | 파일 | 내용 |
|:----:|------|------|
| 1 | [01-plan/PRD.md](./01-plan/PRD.md) | 제품 한 줄, 티어(Free/Premium), 동결 범위 |
| 2 | [01-plan/FEATURE_INDEX.md](./01-plan/FEATURE_INDEX.md) | **슬라이스 목록** — 작업 시 여기서 ID만 고른다 |
| 3 | [IMPLEMENTATION_PROGRESS.md](./IMPLEMENTATION_PROGRESS.md) | **전체 진행도·세션 TODO** — 구현 완료 시 체크 갱신 |
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
6. 작업이 끝나면 [IMPLEMENTATION_PROGRESS.md](./IMPLEMENTATION_PROGRESS.md)의 체크박스·세션 로그·요약표를 갱신한다.

---

## 폴더 역할

| 경로 | 역할 |
|------|------|
| `docs/01-plan/PRD.md` | 동결된 기획 **요약** (짧게 유지) |
| `docs/01-plan/FEATURE_INDEX.md` | 슬라이스 인덱스 (진입점) |
| `docs/01-plan/slices/*.md` | 기능별 **실행 가능한** 명세 (한 파일 = 한 덩어리) |
| `docs/01-plan/BACKLOG.md` | 미결 사항·에셋 교체·나중 반영 |
| `docs/01-plan/*.md` (기타) | 도메인 심층 메모 (밸런스 UI 노트 등) — 슬라이스에서 `@`로 참조 |
| `docs/IMPLEMENTATION_PROGRESS.md` | 진행도·세션별 TODO·요약표 |
| `docs/02-design/` | 목업·디자인 시스템 |

---

## 용어 (고정)

- 구독: **Free** / **Premium** (제품·문서·UI 카피 통일)
- CSS 변수명 `pro-*`, 클래스 `badge-pro` 등은 **코드 식별자**로 유지 가능 (표시 문구는 Premium)
