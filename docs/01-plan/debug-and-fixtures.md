# 개발·QA용 디버그 · 픽스처 설계

> **목적**: 인증·클랜·권한·멀티 클랜(채팅·스크림 등) 시나리오를 **반복 가능하게** 재현하고, 운영에서는 **우회 불가**하게 유지한다.
>
> **단일 출처 정책**: 권한·플랜의 진실은 **Supabase 세션 + RLS + 서버 조회** ([decisions.md §D-SHELL-02](./decisions.md#d-shell-02--권한디버그-쿼리-우회-차단-정책)). URL 쿼리로 “받은 척” 하는 패턴은 **운영·Preview 기본 빌드에서 금지**이며, 허용되는 우회는 아래 **환경 계층**과 **관리자 게이트** 안에서만 정의한다.

---

## 1. 환경 계층 (무엇을 어디서 허용할지)

| 계층 | 예시 | 디버그·시드 | 비고 |
|------|------|-------------|------|
| **로컬** | `next dev`, 로컬 Supabase | 시드 스크립트·선택적 개발 전용 ENV | 개발자 PC 한정. `.env.local`은 커밋 금지. |
| **Preview** | Vercel PR 배포 | **운영과 동일한 인증 경로** 권장. DB는 staging 프로젝트 권장 | 같은 Supabase를 쓰면 QA 데이터가 운영 DB에 섞일 수 있음 → 가능하면 staging. |
| **Production** | `main` 배포 | **시드·우회 없음**. `?role=` 등 쿼리 정화 유지 | D-SHELL-02 전면 적용. |

**원칙**: “인증 없이 받은 척”은 **Production 빌드에서 절대 허용하지 않는다.** 로컬에서만 제한적으로 쓸 수 있는 패턴은 §4에서 정의하고, 기본 구현 순서는 **실제 로그인 + 픽스처 계정**을 먼저 깐다.

---

## 2. 픽스처 데이터 (확장 가능한 최소 세트)

DB 마이그레이션(`*.sql`)과 **분리된** 시드 레이어에 둔다. 마이그레이션은 스키마만; **가입자·클랜·멤버십**은 시드로 반복 삽입 가능하게 한다.

### 2.1 게임 카탈로그

- 최소 1행: `slug = 'overwatch'` (또는 PRD 기준 1차 타겟). Phase 2+ 에서 `valorant` 등 추가 시 같은 시드 파일에 행만 추가.

### 2.2 사용자(계정) — 이메일·역할 매트릭스

**Supabase Auth `auth.users` + public `users` 동기화**가 필요하므로, 시드는 다음 중 하나로 통일한다 (구현 시 하나만 선택해 문서·스크립트에 고정).

| 방식 | 장점 | 비고 |
|------|------|------|
| **A. Admin API 시드 스크립트** (권장) | `auth.users` 생성 + `public.users` upsert 한 트랜잭션에 가깝게 처리 | Node 스크립트 `scripts/seed-fixtures.mjs` 등, `SUPABASE_SERVICE_ROLE_KEY` 필요 |
| **B. SQL만** | 단순 | `auth.users` 직접 INSERT는 Supabase 버전별 제약 → 보통 A가 안전 |

**권장 계정 네이밍** (이메일 로컬파트 — 예시, 실제 도메인은 `@example.com` 또는 프로젝트 전용 QA 도메인):

| 이메일 (예시) | 용도 | 클랜 A | 클랜 B | 비고 |
|---------------|------|--------|--------|------|
| `fixture-leader-a@…` | 클랜장 | leader | — | A 길드 소유·운영 |
| `fixture-officer-a@…` | 운영진 | officer | — | 권한 토글·가입 처리 시연 |
| `fixture-member-a@…` | 일반 멤버 | member | — | 멤버 전용 가드 |
| `fixture-leader-b@…` | 클랜장 | — | leader | B 길드 — **양 클랜 스크림·채팅** 시연 |
| `fixture-officer-b@…` | 운영진 | — | officer | |
| `fixture-member-b@…` | 일반 멤버 | — | member | |
| `fixture-solo@…` | 무소속 | — | — | 온보딩·게임만 인증 등 |
| `fixture-admin@…` | 플랫폼 운영자 | — | — | `users.is_admin = true` (또는 별도 `platform_admins` 테이블). D-SHELL-02 디버그 쿼리 해석용 |

비밀번호는 **로컬·staging 공통**으로 `.env`의 `QA_SEED_PASSWORD` 한 가지를 쓰고, Production 시드는 실행하지 않는다.

### 2.3 클랜 — 최소 2개 (A / B)

| 필드 | 클랜 A (Alpha) | 클랜 B (Beta) |
|------|----------------|---------------|
| `name` | `픽스처 알파` | `픽스처 베타` |
| `slug`/식별 | `fixture-clan-alpha` (표시용 메모) / `id`는 UUID | 동일 |
| `game_id` | 위 OW 행과 FK | 동일 |
| 멤버 | leader-a, officer-a, member-a | leader-b, officer-b, member-b |

**양 클랜 시연** (스크림·채팅·알림): leader-a 와 leader-b 가 각각 “우리 클랜” 컨텍스트로 로그인해 동시에 확인. 멤버 계정으로 교차 접근 시 RLS 차단이 나와야 정상.

### 2.4 게임 인증·가입 상태 (D-AUTH-01)

시드 시 다음 조합을 **명시적으로** 만들어 두면 6칸 매트릭스 디버깅이 빨라진다.

- `fixture-solo`: 특정 `game_id`에 대해 `user_game_profiles` 없음, `clan_members` 없음  
- `fixture-member-a`: `user_game_profiles.is_verified = true`, `clan_members` active  
- (선택) `fixture-pending-a`: 가입 `pending` 상태 — `clan_join_requests`는 후속 마이그레이션 후 시드

---

## 3. 시드 실행·파일 배치 (구조)

| 산출물 | 경로 (제안) | 설명 |
|--------|-------------|------|
| 시드 스크립트 | `scripts/seed-fixtures.ts` 또는 `.mjs` | Service Role로 Auth 생성 + public 테이블 insert |
| 시드 데이터 정의 | `scripts/fixtures/manifest.json` 또는 스크립트 내 상수 | 클랜명·이메일·역할을 한곳에서 수정 |
| npm script | `package.json` — `db:seed` | `tsx scripts/seed-fixtures.ts` 등 |
| 문서 | 본 파일 | 계정 목록·비밀번호 정책·실행 순서 |

**실행 순서**: `supabase db reset` 또는 `db push` 후 `npm run db:seed` (로컬). CI에서는 staging 전용 job에서만.

---

## 4. “인증 없이 받은 척” — 허용 범위 (엄격)

| 패턴 | Production | Preview | 로컬 |
|------|------------|---------|------|
| `?role=`·`?plan=` 로 권한 위조 | 금지 (정화) | 금지 (정화) | 금지 권장 — 목업은 `mockup/` 별도 서버 |
| `NEXT_PUBLIC_DEBUG_QUERY=1` + admin + D-SHELL-02 디버그 키 | 선택(기본 off) | 보통 off | 로컬만 on 가능 |
| **환경변수 `AUTH_DEV_BYPASS`** (가칭) — 고정 UUID로 세션 주입 | **빌드에서 제거 또는 무시** | 사용 안 함 | 선택: `next dev` 전용, 코드 분기 `process.env.NODE_ENV === 'development'` |

**권장**: 첫 구현에서는 **AUTH_DEV_BYPASS를 도입하지 않고**, `fixture-*` 계정으로 실제 `signInWithPassword` 까지 자동화(Playwright)하거나 수동 로그인으로 검증한다. 우회가 필요해지면 **별도 DECIDED** 로 감사·플래그·허용 IP를 붙인다.

---

## 5. E2E · QA

- `.env.example` 의 `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` / `QA_SEED_PASSWORD` 는 **시드 manifest와 동기화**한다 (한 계정을 문서·ENV·시드가 가리키게).
- GitHub Actions: staging URL + staging anon/service role secret로 `db:seed` 후 테스트 (Production 금지).

---

## 6. 감사·보안

- D-SHELL-02 의 `audit_debug_queries` 에 맞춰, 디버그 쿼리·(향후) impersonation 사용 시 기록.
- 시드 계정 이메일은 **실제 사용자가 쓰지 않는** 도메인 사용 (`@example.com`, `@clansync-qa.local` 등).

---

## 7. 구현 마일스톤 매핑

| 마일스톤 | 할 일 |
|----------|--------|
| **M2** | 로그인 가능 + `db:seed` 최소 사용자 1~2명 + 게임 1개 (수동 검증) |
| **M3** | 클랜 A 생성·가입 플로우 + 멤버 시드 |
| **M4~** | 클랜 B·교차 권한·양 클랜 시연 시나리오 + (스크림 시) B 클랜 leader 시드 |
| **Phase 2+** | `clan_join_requests` pending 시드 · 채팅방 픽스처 |

---

## 8. 연관 문서

- [decisions.md §D-SHELL-02](./decisions.md#d-shell-02--권한디버그-쿼리-우회-차단-정책) — 쿼리 정화·admin 디버그
- [decisions.md §D-DEV-01](./decisions.md#d-dev-01--로컬staging-픽스처--디버그-계층) — 본 설계의 결정 요약
- [pages.md](./pages.md) — 가드 체인·목업 전용 쿼리 (`?role=` 등)
- [schema.md](./schema.md) — `users`·`clans`·`clan_members` 등
