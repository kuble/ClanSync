# Phase 2 — 앱 · API (`src/` · Supabase)

> **허브**: [IMPLEMENTATION_PROGRESS.md](./IMPLEMENTATION_PROGRESS.md) · **세션 로그**: [IMPLEMENTATION_PROGRESS_SESSION_LOG.md](./IMPLEMENTATION_PROGRESS_SESSION_LOG.md)  
> **전제**: [Phase 1](./IMPLEMENTATION_PROGRESS_Phase1.md) 정적 목업·슬라이스 문서 동결 완료. 구현 시 목업·`pages.md`·슬라이스를 단일 진실 공급원으로 삼는다.

| 항목 | 값 |
|------|-----|
| **단계** | Phase 2 — Next.js 15 App Router · Supabase · RLS |
| **마지막 갱신** | 2026-03-28 |
| **상태** | 착수 — 아래 체크·표를 세션마다 갱신 |

---

## 참조 (필수 맥락)

| 문서 | 용도 |
|------|------|
| [pages.md](./01-plan/pages.md) | 라우팅 맵·미들웨어 흐름·Phase 1 목업 대응표 |
| [schema.md](./01-plan/schema.md) | 테이블·관계 — 마이그레이션·RLS 설계 시 |
| [FEATURE_INDEX.md](./01-plan/FEATURE_INDEX.md) | 슬라이스 S00~S08 — 구현 우선순위·범위 |
| [PRD.md](./01-plan/PRD.md) | 동결된 제품 범위(상단 요약) |

---

## Phase 2 종료 조건 (요약)

- [ ] `pages.md`의 **모든 제품 경로**에 대응하는 App Router 항목이 있거나, 의도적으로 **후순위(BACKLOG)** 로 표기됨.
- [ ] Supabase **스키마 + RLS**가 `schema.md`와 모순 없이 적용(최소 MVP 테이블부터).
- [ ] `pages.md` §인증/권한 미들웨어 흐름이 코드(미들웨어·가드)로 반영되거나, 단계적 롤아웃 계획이 문서화됨.

---

## 체크리스트 (인프라 → 라우트 → 도메인)

### A. 프로젝트·연동

- [ ] Supabase 프로젝트·환경 변수 (`lib/` 클라이언트 패턴, Server/Client 분리)
- [ ] `src/app/[locale]/` 레이아웃·i18n (next-intl 등 — PRD 다국어)
- [ ] shadcn/ui·토큰: 목업과 시각적 정합(다크 기본)

### B. 데이터

- [ ] `schema.md` 기준 마이그레이션 적용 순서 합의 (users/games/clans/… MVP 우선)
- [ ] **모든 테이블 RLS** 초안·검증 (프로젝트 규칙 필수)

### C. 인증 · 권한

- [ ] Supabase Auth: 회원가입·로그인·세션
- [ ] `pages.md` **미들웨어 흐름** (비로그인 → `/`, 게임 미인증 → `…/auth`, 클랜 미가입 → `…/clan`, 권한 부족 → 403)
- [ ] 클랜 역할(leader / officer / member) 반영 지점 정의 (라우트 가드·API)

### D. 라우트 (제품 경로)

- [ ] 아래 **라우트 대응표**를 채우며 `page.tsx`(또는 스텁) 존재 여부 추적
- [ ] MainClan 하위 `/balance`·`/stats`·`/events`·`/manage`·`/store` — `pages.md`와 동일 세그먼트 유지
- [ ] `/games/[gameSlug]/board/[postId]` — 목업 없음; Phase 2에서 스텁·BACKLOG 명시

### E. 슬라이스 매핑 (구현 백로그와 동기화)

| 슬라이스 | Phase 2에서의 초점 (요약) |
|----------|---------------------------|
| S01 | 랜딩·sign-in/up·games·글로벌 프로필 진입 |
| S02 | game auth · clan auth · 온보딩 리다이렉트 |
| S03 | MainClan 쉘·탭·플랜/권한 UI |
| S04 | 밸런스메이커 뷰·Premium 게이트 |
| S05 | 통계 탭·권한별 데이터 |
| S06 | 이벤트·관리·스토어 |
| S07 | MainGame 커뮤니티 |
| S08 | 프로필·꾸미기·슬롯 정책 |

세부 수용 기준은 각 `docs/01-plan/slices/slice-NN-*.md`를 따른다.

---

## `pages.md` 경로 ↔ App Router 대응 (갱신용)

> **채우기**: `App Router (예정)` 열에 실제 경로·파일·스텁 여부·비고를 적는다.  
> 다국어는 **`[locale]`** 세그먼트 하위에 두는 것을 기본으로 한다 (`src/app/[locale]/layout.tsx` 존재).

| `pages.md` 경로(개념) | App Router (예정 · `[locale]` 접두) | 비고 |
|----------------------|--------------------------------------|------|
| `/` | `…/[locale]/` 또는 `(marketing)/page` | 랜딩 |
| `/sign-in` | `…/sign-in` | |
| `/sign-up` | `…/sign-up` | |
| `/profile` | `…/profile` | 게임·클랜 밖 |
| `/games` | `…/games` | 게임 선택 |
| `/games/[gameSlug]/auth` | `…/games/[gameSlug]/auth` | GameAuth |
| `/games/[gameSlug]/clan` | `…/games/[gameSlug]/clan` | ClanAuth |
| `/games/[gameSlug]/clan/[clanId]` | `…/games/[gameSlug]/clan/[clanId]` | MainClan 홈 |
| `…/clan/[clanId]/balance` | 동일 하위 `/balance` | 밸런스메이커 |
| `…/clan/[clanId]/stats` | 동일 하위 `/stats` | 통계 |
| `…/clan/[clanId]/events` | 동일 하위 `/events` | 이벤트 |
| `…/clan/[clanId]/manage` | 동일 하위 `/manage` | 관리 |
| `…/clan/[clanId]/store` | 동일 하위 `/store` | 스토어 |
| `/games/[gameSlug]` | `…/games/[gameSlug]` | MainGame |
| `/games/[gameSlug]/board/[postId]` | `…/games/[gameSlug]/board/[postId]` | 목업 없음 · BACKLOG 가능 |

**MainClan 탭**: 목업은 해시·JS 전환(`clan-main-static-mockup-plan.md`). 앱에서는 **서브경로**로 나누는 방식이 `pages.md`와 일치하는지 구현 시 확정한다.

---

## 메모

- **목업**: `mockup/`은 Phase 1 완료 상태를 유지. 카피·플로우 변경은 슬라이스·`pages.md`와 함께 갱신.
- **Supabase**: 프로젝트 ID 등은 `.cursor/rules/project-context.mdc` / Vercel 팀 설정과 맞출 것.
