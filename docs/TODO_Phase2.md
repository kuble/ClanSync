# Phase 2 — Next.js `src/` · Supabase · RLS

> **허브**: [TODO.md](./TODO.md) · **Phase 1(종료)**: [TODO_Phase1.md](./TODO_Phase1.md) · **세션 로그**: [TODO_LOG.md](./TODO_LOG.md)  
> **기획 기준**: [pages.md](./01-plan/pages.md) (라우트 요구) · [schema.md](./01-plan/schema.md) (DB 설계) · [FEATURE_INDEX.md](./01-plan/FEATURE_INDEX.md) (슬라이스)
> **실제 구현**: `src/` · `supabase/migrations/`와 대조한다. 아래 `live`는 구현 표기이며 원격 배포·품질 게이트 통과를 보증하지 않는다. 시연은 [QA_시나리오.md](./QA_시나리오.md) 참조.

| 항목 | 값 |
|------|-----|
| **단계** | Phase 2 — 기능 구현 후 품질 점검, M8 미완료 |
| **마지막 갱신** | 2026-09-15 — 코드 리뷰·문서 정합성 정리 |

## 2026-09-15 리뷰와 미완료 검증

[코드 리뷰 보고서](./03-analysis/code-review-2026-09-15.md)에 근거·재현 조건·수정 방향을 기록했다. 이번 작업은 코드·SQL 검토와 문서 정리이며 M8 완료 감사가 아니다.

| 검증 | 결과 |
|------|------|
| `npm run build` | 통과 — 컴파일·타입 검사·라우트 생성 |
| 앱·미들웨어·E2E ESLint | 오류 3건·경고 1건 |
| 전체 `npm run lint` | 오류 20건·경고 100건 — 로컬 아이콘 원본·정적 목업도 검사 |
| 공개 화면 Playwright | 시드 비활성화, 랜딩·로그인 스모크 1건 통과 |
| DB RLS·RPC 권한 | 마이그레이션 정적 검토. 실제 DB 역할별 실행 검증 미실시 |
| 전체 E2E·동시성·반응형·키보드 | 이번 리뷰에서 실행 검증하지 않음 |

- [ ] R01~R05: 서비스 RPC·사용자 쓰기 범위·게임 인증·RLS 재귀·LFG 권한 수정 및 허용/거부 검증.
- [ ] R06~R09: 알림 재예약·시간대·클랜/LFG 동시 승인 회귀 검증.
- [ ] 앱 린트 오류 해소와 CI 검증 범위 정리.
- [ ] 위 수정 후 기술·UI 게이트를 실제 실행 결과로 확인하고 M8 완료 여부 재평가.

## 전제 (Q&A 확정)

- **Q1 (로케일)**: `src/app/[locale]/`는 제거. `pages.md` 라우팅 맵을 1:1로 따른다. 다국어 재도입은 Phase 2+에서 `next-intl` 등으로 별건 처리.
- **Q2 (범위)**: Phase 2 구현 범위는 아래 마일스톤별 체크리스트 기준. 게시판 단일 글 상세·스크림 매칭 MVP·승부예측 기본 코인 처리는 구현되어 있다. 스크림 채팅·게시판 댓글/반응·파리뮤추엘 배당 고도화·서비스워커 푸시·다국어는 Phase 2+다. 실제 게임 OAuth와 구독 결제도 후속 범위다.

## 마일스톤 로드맵

| 마일스톤 | 슬라이스 | 핵심 산출물 | 선행 | 상태 |
|----------|----------|-------------|------|------|
| **M0** 기반 정비 | — | `[locale]` 제거 · 랜딩 스텁 · 본 로드맵 문서화 | — | 완료 |
| **M1** 인프라 | — | Supabase 헬퍼 · `supabase/migrations/0001_init` · `middleware.ts` 골격 · ENV · `db:*` scripts | M0 | 완료 (Vercel preview 제외) |
| **M2** 인증 쉘 | **S01** | `/` · `/sign-in` · `/sign-up` · `/games` + D-AUTH-01 매트릭스 + D-AUTH-03/06/07 | M1 | 완료 |
| **M3** 온보딩 | **S02** | `/games/[g]/auth` (OAuth D-AUTH-02/05) · `/games/[g]/clan` (D-CLAN-01/02/04) + RLS 1차 | M2 | 완료 |
| **M4** MainClan 쉘 | **S03** | `/games/[g]/clan/[id]` 레이아웃·사이드바(D-SHELL-01/02/03)·`hasPermission()`(D-PERM-01)·플랜 토글 | M3 | 완료 |
| **M5** 프로필 | **S08** | `/profile` 네임플레이트·뱃지 케이스 (D-PROFILE-01~04) | M2 (병렬 가능) | 완료(기능 구현) · 품질 검증 별도 |
| **M6a** 통계 | **S05** | MainClan `/stats` 탭 · HoF (D-STATS-03/04) | M4 | 완료 |
| **M6b** 이벤트·관리·스토어 | **S06** | `/events`(D-EVENTS-03) · `/manage`(D-CLAN-02 소비자·D-MANAGE-01~04) · `/store`(D-STORE-01/02·D-ECON-03) | M4 | **완료(Phase 2 약정)** — 카카오 `event_notify` 옵트인·대진 초안에 팀 슬롯 라벨; 잔여 코인 호스트결제·실 카카오 파이프·스크림 채팅·대진 진행 UI는 Phase 2+ |
| **M6c** 밸런스 | **S04** | `/balance` 세션·맵밴 MVP·영웅 밴(OW)·M/A·예측 5분·결과 확정·클랜코인 적중 지급 | M4 | **완료(Phase 2 약정)** — Realtime 동기화·Playwright 스모크; **Phase 2+**: 파리뮤추엘식 배당 고도화·타 게임 히어로 풀·내전 통계 연동 등 |
| **M7** 커뮤니티 경량 | **S07** | `/games/[g]` 홈·홍보(D-RANK-01)·LFG(D-LFG-01)·순위·**스크림 탭**(MVP) · 게시판 **단일 글** `/board/[postId]`(읽기 MVP) | M3 | 완료 |
| **M8** 종료 감사 | — | `AUDIT-Phase2-YYYY-MM-DD.md` · Phase 2+ 이관 목록 · 허브 갱신 | M5·M6a~c·M7 | 대기 |

```mermaid
flowchart TD
  M0[M0 기반 정비] --> M1[M1 인프라]
  M1 --> M2[M2 S01 인증 쉘]
  M2 --> M3[M3 S02 온보딩]
  M3 --> M4[M4 S03 MainClan 쉘]
  M2 -.병렬.-> M5[M5 S08 프로필]
  M4 --> M6a[M6a S05 통계]
  M4 --> M6b[M6b S06 이벤트·관리·스토어]
  M4 --> M6c[M6c S04 밸런스]
  M3 --> M7[M7 S07 경량]
  M5 --> M8[M8 감사]
  M6a --> M8
  M6b --> M8
  M6c --> M8
  M7 --> M8
```

## 마일스톤 공통 완료 기준 (Gate)

매 마일스톤마다 아래 **기술 게이트 5 + UI/UX 게이트 3**을 전부 만족해야 다음으로 넘어간다.

### 기술 게이트 (5)

1. 해당 슬라이스의 **수용 기준 체크박스 전부 ✓**([FEATURE_INDEX.md](./01-plan/FEATURE_INDEX.md) 링크 참조).
2. [pages.md §페이지별 가드 체인 표](./01-plan/pages.md)의 대응 경로가 `middleware.ts`·Server Component 가드에서 **전부 통과**.
3. RLS 정책이 **leader / officer / member / guest** 4역할에서 최소 1 케이스씩 테스트 통과 (`supabase test db` 또는 직접 DB 접근의 허용·거부를 검증하는 테스트).
4. 본 문서의 **체크리스트·라우트 대응표 갱신**.
5. Nano-commit([.cursor/rules/git-nano-commit.mdc](../.cursor/rules/git-nano-commit.mdc)) 준수 + 세션 로그([TODO_LOG.md](./TODO_LOG.md)) 블록 추가.

### UI/UX 게이트 (3)

마일스톤에 UI 변경이 전혀 없는 경우(예: M1 인프라만)만 면제. 그 외 전부 필수.

6. **키보드 온리** — 마우스 없이 해당 마일스톤의 핵심 플로우 완주 가능(탭·엔터·스페이스).
7. **반응형 3폭** — 375 / 768 / 1280 px에서 레이아웃 깨짐·가로 스크롤 없음.
8. **로딩·에러·빈 상태** — 각 신규 화면에 세 상태 디자인이 전부 존재(빈 리스트 안내·실패 메시지·스켈레톤 또는 스피너).

> 시연·직접 재현 절차는 [QA_시나리오.md](./QA_시나리오.md)에만 유지한다.

## 체크리스트 (마일스톤별 상세)

### M0 — 기반 정비

- [x] `src/app/[locale]/` 제거 + 랜딩 스텁 (`src/app/page.tsx`)
- [x] `docs/TODO_Phase2.md`에 M0~M8 마스터 플랜 반영
- [x] `docs/TODO.md` 권장 프롬프트·마지막 갱신, `docs/TODO_LOG.md` 세션 로그 (M2 착지 시 갱신)

### M1 — 인프라 베이스라인

- [x] `@supabase/ssr` + `@supabase/supabase-js` 도입
- [x] `src/lib/supabase/{server,client,middleware}.ts` 헬퍼
- [x] `supabase/migrations/0001_init.sql` — `users`·`user_game_profiles`·`games`·`clans`·`clan_members` + 기본 RLS
- [x] `middleware.ts` 골격 (세션 refresh + **D-SHELL-02** 쿼리 정화: `?role=`·`?plan=`·`?game=` 프로덕션 드롭)
- [x] `.env.local` / `.env.example` 템플릿 (`next.config.ts` 서버 전용 ENV 분리는 M2 이후 서버 액션 도입 시 `env` 블록 or `serverRuntimeConfig` 로 확장)
- [x] `package.json` scripts: `db:reset` · `db:push` · `types:gen`
- [x] **Vercel preview URL 자동 발급** — `vercel link` + GitHub 연동 + Preview/Production 환경 변수 분리.

### M2 — S01 라우팅·쉘 (수직 슬라이스 첫 완주)

- [x] **픽스처·디버그** — [debug-and-fixtures.md](./01-plan/debug-and-fixtures.md) · **D-DEV-01**: `scripts/seed-fixtures.mjs` + `scripts/fixtures/qa-fixtures.mjs` + `npm run db:seed` — `QA_Member_01`·`QA_Leader_01`·`QA_Admin_01` + `QA_01_Clan`(리더 연결). 게임 카탈로그는 `0002` 시드.
- [x] `/` 랜딩 — **D-LANDING-04** 로그인 시 미들웨어에서 `/games` 리다이렉트(`?from=logo` 예외)
- [x] `/sign-in` — 이메일/비번 + **D-AUTH-06** 잠금(5회 연속/15분, [decisions.md §D-AUTH-06](./01-plan/decisions.md)) + **D-AUTH-07** 자동 로그인 토글(세션 쿠키 maxAge 24h/30d + `users.auto_login` 반영)
- [x] `/sign-up` — **D-AUTH-03** strong 비밀번호(8~72자)·출생연도(만 10세+)·약관
- [x] `/games` — Supabase 조회 기반 카드 + `routeFromGameCard` TypeScript · D-AUTH-01 라우팅(스텁: `/games/[g]/auth`·`/clan`·`/clan/[id]`)
- [x] 게이트: 익명 → `/sign-in?next=` · 로그인 후 `/games` · 카드 클릭 스텁까지 완주

### M3 — S02 게임·클랜 온보딩

- [x] `/games/[gameSlug]/auth` — **D-AUTH-02** 화면·CTA·비활성 게임 처리 · **D-AUTH-05** 안내 카피 · `?reauth=1` 분기 · 실 OAuth 전 **`DEV_GAME_LINK_SIMULATOR` / `NODE_ENV=development`** 시뮬레이터
- [x] `/games/[gameSlug]/clan` — 가입 탭(**D-CLAN-01** 검색·페이지 5 · **D-CLAN-02** 신청·취소·타 클랜 재신청 모달) + 생성 탭(**D-CLAN-04** payload + 서비스 롤 리더 멤버십)
- [x] RLS 1차: `0003` `clan_join_requests` 본인·운영진 SELECT, 본인 INSERT, 본인 pending→canceled UPDATE + `clans.game_id` 정합 `WITH CHECK`
- [x] 게이트: D-AUTH-01 미들웨어(`loadGameOnboarding`) — `/games/[g]`·`/auth`·`/clan`·`/clan/[id]` 분기

### M4 — S03 MainClan 쉘

- [x] `/games/[g]/clan/[clanId]` 레이아웃 + 사이드바 (**D-SHELL-01** 레일 hover·모바일 Sheet / **D-SHELL-03** manage 점 = pending 가입 신청)
- [x] 서버 헬퍼 `hasClanPermission` (**D-PERM-01** default + jsonb + 잠긴 키)
- [x] 플랜 게이트 — `clans.subscription_tier` + 클랜장 전용 dev 토글(`DEV_CLAN_PLAN_TOGGLE` / development)
- [x] 탭 스텁 5개 라우트 (`/balance`·`/stats`·`/events`·`/manage`·`/store`) · `/manage` 멤버 `forbidden()`
- [x] **D-SHELL-02** — 기존 미들웨어 정화 유지

### M5 — S08 프로필·꾸미기 (M2 이후 병렬 가능)

- [x] `/profile` — 네임플레이트·뱃지 스트립 (**D-PROFILE-01~03**, 5슬롯 dense-from-front) · 가입 신청 목록 (**D-PROFILE-02**)
- [x] 스키마: `nameplate_options` · `user_nameplate_inventory` · `user_nameplate_selections` · `badges` · `user_badge_unlocks` · `user_badge_picks` (`0010_profile_decorations_m5.sql`)
- [x] **부계동 D-MANAGE-03** · `user_alt_accounts` · `effective_view_alt_account_roles` (**`0043_user_alt_accounts.sql`**) · 인증된 게임 탭 내 UI·동의·서버 액션 (`14-Profile-Customization.md`)
- [x] `clansync:badge:picks:changed` · `clansync:nameplate:changed` 탭 동기화 — 리스너에서 `router.refresh()` · 활성 탭 `sessionStorage` 유지 (`profile-decoration-sync.ts`)

### M6 — MainClan 탭 묶음 (M4 이후, 권장 순서 a→b→c)

- [x] **M6a S05 클랜 통계** — 요약 KPI · HoF(설정 모달·등재 규칙·전체/월/연) · **D-STATS-03** 활동일 표·내전 막대 · **D-STATS-04** CSV 안내만 · 경기 기록 일자 목록(캘린더·정정은 M6b 후속)
- [x] **M6b S06 이벤트·관리·스토어** — **Phase 2 약정 범위 종료**(DB·`/events` MVP·`/manage`·`/store`·알림·스크림→일정 **`0041`** 등 기존 항목). **타 채널**: 카카오는 `clan_settings.event_notify.kakao_notifications_opt_in`(수신 의사) 저장·카피 명시까지. **대진표**: 초안 `snapshot` 팀 슬롯 라벨 생성·편집. **후속 Phase 2+**(본 체크 밖): 카카오 실 발송 번호 검증 파이프, 대진 진행·코인 입장연동, 스크림 채팅 등.
- [x] **M6c S04 밸런스메이커** — **Phase 2 약정 종료**( `0016`~`0026` 흐름: 세션·맵 후보 가중 무작위·영웅 밴 tally·예측 5분·`set_balance_match_outcome` 코인 처리·종료)·Realtime·운영 플로 UI. 픽스처 시드가 **`balance_sessions`(미종료) 삭제**. E2E: 편집→맵 건너뛰기→세션 종료 smoke. **Phase 2+**: 파리뮤추엘·Valorant 등 영웅 풀 확장·HoF/통계 깊은 연동.

### M7 — S07 MainGame 커뮤니티 (경량판)

- [x] `/games/[g]` — 홍보 `board_posts`(**D-RANK-01** newest/space) · LFG `lfg_posts`/`lfg_applications`(**D-LFG-01** MVP) · 클랜 순위 미리보기(`clan_active_member_counts` RPC)
- [x] 스크림 탭 — 월별 미니 캘린더·날짜 필터·날짜 헤더 목록(MainGame)·**상태·티어(SR 구간)·취소 숨김 필터 바**(`scrim-filter-bar`)
- [x] `/games/[g]/board/[postId]` — **단일 글 조회**(제목·본문·클랜 링크·복귀 `?tab=promo`) · `loadBoardPostDetail` · Phase 2+ 후보: 댓글·드로어 수준 고도화
- [x] LFG 만료 cron·알림(D-EVENTS-03 in-app) — `0039`·**`0042`**(`notification_log.lfg_post_id`·예약)·`expire_open_lfg_posts_batch`(plpgsql)·`/api/cron/dispatch-notifications`(만료 우선)·벨 **`clan_id` null 포함**·`?tab=lfg`

### M8 — Phase 2 종료 감사

- [ ] `docs/AUDIT-Phase2-YYYY-MM-DD.md` 생성 (Phase 1 감사 포맷 복제)
- [ ] Phase 2+ 이관 목록 확정 (스크림 채팅·2-phase·게시판 댓글·반응·승부예측 배당 고도화·서비스워커 푸시·다국어 등)
- [ ] [TODO.md](./TODO.md) 현재 단계 = "Phase 2 완료 · Phase 2+ 진입"

## 라우트 대응표 ([pages.md](./01-plan/pages.md) 기준)

| # | 제품 경로 | 목업 | 마일스톤 | 구현 상태 |
|---|-----------|-----|---------|----------|
| 01 | `/` | `index.html` | M0 스텁 → M2 | live (D-LANDING-04) |
| 02 | `/sign-in` | `sign-in.html` | M2 | live |
| 03 | `/sign-up` | `sign-up.html` | M2 | live |
| 04 | `/games` | `games.html` | M2 | live |
| 05 | `/games/[gameSlug]/auth` | `game-auth.html` | M3 | live |
| 06 | `/games/[gameSlug]/clan` | `clan-auth.html` | M3 | live |
| 07 | `/games/[gameSlug]/clan/[clanId]` | `main-clan.html#dashboard` | M4 | live (쉘+대시보드 스텁) |
| 09 | `/games/[gameSlug]/clan/[clanId]/balance` | `main-clan.html#balance` | M4→M6c | live (세션 편집→맵/영웅 밴 MVP·Realtime·예측 5분·M/A Premium A·코인 적중)·Phase 2+ 고도화 |
| 10 | `/games/[gameSlug]/clan/[clanId]/stats` | `main-clan.html#stats` | M4→M6a | live (M6a 본문) |
| 11 | `/games/[gameSlug]/clan/[clanId]/events` | `main-clan.html#events` | M4→M6b | live (캘린더·클랜 투표·대진 초안 팀 라벨·반복·스크림 RSVP · Discord 웹훅 MVP · 카카오 옵트인 플래그) |
| 12 | `/games/[gameSlug]/clan/[clanId]/manage` | `main-clan.html#manage` | M4→M6b | live (멤버 강퇴·역할·가입·플랜 패널) |
| 13 | `/games/[gameSlug]/clan/[clanId]/store` | `main-clan.html#store` | M4→M6b | live (MVP 구매·원장·거래 내역) |
| 08 | `/games/[gameSlug]` | `main-game.html` (홈·홍보·LFG·순위·스크림 MVP) | M7 | live |
| — | `/games/[gameSlug]` 스크림 탭 | `main-game.html#scrim` | M7 | live (MVP: 취소·호스트 일정 수정·게임 전체 클랜 상대 선택) |
| — | `/games/[gameSlug]/board/[postId]` | _(목업 없음)_ | M7 | live (단일 글 렌더; 댓글 등은 Phase 2+) |
| 14 | `/profile` | `profile.html` | M5 | live (M5 본문) |
| — | `middleware.ts` (전역) | _(해당 없음)_ | M1→M4 | 세션 refresh + D-SHELL-02 + **비로그인 `/games` 차단** · D-LANDING-04 · **D-AUTH-01** 게임 하위 경로 |

Phase 1 정적 목업(`mockup/`)은 참조용으로 유지; 운영 빌드에서는 제외 정책(**D-SHELL-02**)을 따른다.


## 구현 파일 찾기

- 앱·도메인 구조: [프로젝트 README](../README.md).
- DB 변경 이력: [`supabase/migrations/`](../supabase/migrations/). 설계 설명은 [schema.md](./01-plan/schema.md).
- 기능 요구·관련 파일: [FEATURE_INDEX.md](./01-plan/FEATURE_INDEX.md)에서 해당 슬라이스 하나를 선택.
- 과거 산출물 설명: [TODO_LOG.md](./TODO_LOG.md)와 Git 이력.

마이그레이션별 산출물 표를 별도로 복제하지 않는다.
