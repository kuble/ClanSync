# 구현 진행도 — 세션 로그

> **허브**: [TODO.md](./TODO.md) — 상태·페이즈 링크·다음 프롬프트는 허브만 보면 된다.  
> **이 파일**: 히스토리만 쌓이므로 **일상 참조 시 `@TODO.md`만** 쓰고, 세션 종료·감사 시에만 이 파일을 연다.

<!-- 새 세션을 위에 추가 (최신이 위) -->

### 2026-04-22 — Phase 2 M6c 경기 단계 플레이스홀더 (승부예측·결과)

- [x] **UX** — `match_live`에 `ClanBalancePredictionPlaceholder`·`ClanBalanceMatchResultPlaceholder`(운영진) · 출전자 예측 제외 카피 · Free Premium 안내 · 단계 라벨 ①~③ 정합.
- [x] **검증** — `next build`.
- **다음**: 승부예측·정산 DB 연동(Phase 2+) · 영웅 밴 투표 · M6b.

### 2026-04-22 — Phase 2 M6c M/A 스냅샷 · Realtime

- [x] **DB** — `0020_balance_ma_snapshot_realtime.sql` (`ma_snapshot` jsonb · publication 조건부).
- [x] **앱** — `updateBalanceMaSnapshotAction` · `ma-snapshot.ts` · `ClanBalanceMaEditor` · `ClanBalanceSessionRealtime` · `match_live` + `edit_mscore` · Premium만 A.
- [x] **타입** — `database.types.ts`.
- [x] **검증** — `next build`.
- **다음**: 승부예측·정산 연동 · 영웅 밴 · M6b.

### 2026-04-22 — Phase 2 M6c 5v5 roster 편집

- [x] **DB** — `0019_balance_session_roster.sql` (`roster` jsonb · `list_balance_roster_pool`).
- [x] **UX** — 편집 단계 에디터·저장 액션·맵밴/경기 단계 라인업 보드.
- [x] **타입** — `database.types.ts`.
- [x] **검증** — `next build`.
- **다음**: 실시간 동기 · M/A.

### 2026-04-22 — Fix: balance RLS 재귀 (함수 내부 RLS 잔존)

- [x] **DB** — `0018_balance_rls_bypass_in_helpers.sql` (`SET row_security = off` · `is_member_of_balance_session`).
- [x] **타입** — `database.types.ts` RPC.

### 2026-04-22 — Fix: balance_sessions RLS vs clan_members 재귀

- [x] **DB** — `0017_balance_sessions_rls_no_recursion.sql` (`is_active_clan_member`·`is_clan_officer_plus`).
- [x] **타입** — `database.types.ts` RPC.

### 2026-04-22 — Phase 2 M6c 밸런스 세션·맵 밴 MVP

- [x] **DB** — `0016_balance_sessions_mvp.sql` (편집→맵 밴→영웅 밴(플레이스홀더)→경기·종료, 맵 투표 테이블, RLS).
- [x] **앱** — `clan-balance-session.ts` · `map-pools` · `weighted-map-pick` · `/balance` 패널·맵 밴 클라이언트.
- [x] **타입** — `database.types.ts` (`balance_session_phase` 등).
- [x] **문서** — `TODO_Phase2`·`TODO_LOG`.
- [x] **검증** — `next build` (로컬 `db:push`는 배포 시 적용).
- **다음**: M6c 배치 편집·M/A · M6b 잔여.

### 2026-04-22 — Phase 2 스토어 코인 내역 · M6c 밸런스 쉘

- [x] **스토어** — `ClanStoreCoinHistory` (개인 최근 12건 · 리더/오피서 클랜 풀 12건) · `coin-reason-label.ts`.
- [x] **밸런스** — `/balance` 세션 카드·비활성 `세션 열기` · 로그인 시 스토어 링크 안내.
- [x] **문서** — `TODO_Phase2`·`TODO_LOG`.
- [x] **검증** — `next build`.
- **다음**: M6c 본문(세션 상태·밴픽) · M6b 잔여(무효화·카피).

### 2026-04-22 — Phase 2 M6b 프로필 입장 효과 → 네임플레이트

- [x] **DB** — `0015_store_profile_entrance_nameplate.sql` (`nameplate_options` 스토어 frame 시드·`apply_store_purchase` 에 `user_nameplate_inventory` UPSERT).
- [x] **UX** — 스토어 안내·구매 토스트(`/profile` 프레임 선택 안내).
- [x] **타입** — `database.types.ts` (gen).
- [x] **검증** — `db:push` · `next build`.
- **다음**: M6c · 거래 내역 UI.

### 2026-04-22 — Phase 2 M6b 스토어 배너 실연동

- [x] **검증** — `clan_banner_slot` 구매 시에만 `clans.banner_url` 갱신 (`manage_clan_pool`).
- [x] **액션** — `clan-banner-settings.ts` · `store-purchase-queries.ts`.
- [x] **UI** — 관리 `ClanBannerSettingsForm` · 대시보드 배너 `<img>` · 스토어 안내 문구.
- [x] **검증** — `next build`.
- **다음**: 프로필 입장 효과(M5)·M6c.

### 2026-04-22 — Phase 2 M6b D-STORE-02 Premium 플랜 모달

- [x] **UI** — `store-premium-plan-dialog.tsx` (Free/Premium 표·역할별 카피·운영진+ 구독 탭 이동).
- [x] **스토어** — Premium 잠금 카드에 `플랜 비교 보기` → 모달; `clan-store-panels`에 `actorRole`·`planIsPremium` 전달.
- [x] **관리** — `manage#subscription` 앵커 (`id="subscription"` + `scroll-mt`).
- [x] **검증** — `next build`.
- **다음**: 구매 에셋 반영 · M6c.

### 2026-04-22 — Phase 2 M6b 스토어 원장 + Discord 일정 알림

- [x] **DB** — `0014_store_coin_mvp.sql` (`coin_transactions`·`store_items`·`purchases`·RLS·`apply_store_purchase`·시드 슬러그 2종).
- [x] **스토어** — `clan-store-purchase.ts` · `clan-store-panels.tsx` · `store/page.tsx` (`manage_clan_pool`·잔액·중복 구매 UI).
- [x] **이벤트** — `createClanEventAction` 후 Discord 웹훅 POST (`NEXT_PUBLIC_SITE_URL` 링크, 실패 무시).
- [x] **타입** — `database.types.ts` (gen).
- [x] **문서** — `TODO_Phase2`·`TODO_LOG`.
- [x] **검증** — `next build`.
- **다음**: D-STORE-02 모달 · 구매 에셋 실적용 · M6c.

### 2026-04-22 — Phase 2 M6b S06 일부 (관리·이벤트 알림 스텁)

- [x] **DB** — `0013_clan_settings_event_notify.sql` (`clan_settings.event_notify` jsonb).
- [x] **액션** — `clan-manage-members.ts` (강퇴 `banned` · 클랜장 역할 승격/강등) · `clan-event-notify.ts` (웹훅 URL 저장, 클랜장만).
- [x] **UI** — `manage/page.tsx` + `manage-members-table.tsx` · `clan-manage-subscription-panel.tsx` · `clan-event-notify-form.tsx` · `events/page.tsx`.
- [x] **유틸** — `lib/clan/event-notify-settings.ts`.
- [x] **기타** — `database.types` `event_notify` · `toggleClanPlanDevFormAction` revalidate `manage`·`store`.
- [x] **문서** — `TODO_Phase2`·`TODO_LOG`.
- [x] **검증** — `next build`.
- **다음**: M6b 잔여(`coin_transactions`·구매 차감) · Discord 실 POST · M7 cron.

### 2026-04-22 — Phase 2 M7 S07 MainGame 커뮤니티 (경량)

- [x] **DB** — `0011_main_game_community_m7.sql` (`board_posts`, `lfg_posts`, `lfg_applications` + RLS) · `0012_clan_active_member_count_rpc.sql`.
- [x] **로더** — `src/lib/main-game/load-main-game-hub.ts` (D-RANK-01 정렬, LFG·신청자 묶음, 순위).
- [x] **액션** — `main-game-community.ts` (홍보/LFG CRUD·수락·정원 마감).
- [x] **UI** — `main-game-community-tabs.tsx` · `games/[gameSlug]/page.tsx` (`?promoSort=`).
- [x] **타입** — `database.types.ts` (gen).
- [x] **문서** — `TODO_Phase2`·`TODO_LOG`.
- [x] **검증** — `next build`.
- **다음**: M7 잔여(cron·알림) · M6b 본문 · M5 Realtime.

### 2026-04-22 — Phase 2 M5 S08 프로필 꾸미기 (일부)

- [x] **DB** — `0010_profile_decorations_m5.sql`: 카탈로그·선택·뱃지 픽·RLS·트리거·OW/VAL 시드.
- [x] **액션** — `profile-decorations.ts` · `cancelJoinRequestByIdAction` + form (`game-clan-onboarding.ts`).
- [x] **UI** — `profile/page.tsx` · `profile-game-decorations.tsx` · `profile-join-requests.tsx` (D-PROFILE-01~03 이벤트 디스패치).
- [x] **타입** — `database.types.ts` 신규 테이블·enum.
- [x] **문서** — `TODO_Phase2`·`TODO_LOG`.
- [x] **검증** — `next build`.
- **다음**: M5 잔여(Realtime/탭 동기 고도화) · M6b · M7.

### 2026-04-22 — Phase 2 M6a S05 클랜 통계

- [x] **DB** — `0005_clan_stats_m6a.sql`: `clan_daily_member_activity` + RLS · `record_clan_activity` · `clan_peer_nicknames` · `clan_settings.expose_hof`/`hof_config` · `matches`·`match_players`·`match_results`(최소).
- [x] **로더** — `src/lib/clan/stats/*` KST·HoF 설정·`loadClanStatsPage`.
- [x] **액션** — `clan-stats-hof.ts` (`set_hof_rules`·클랜장 `expose_hof`).
- [x] **UI** — `clan-stats-view.tsx` · `stats/page.tsx` (요약·HoF·앱 이용·경기 일자).
- [x] **활동 기록** — MainClan `layout.tsx` 에서 `record_clan_activity` RPC.
- [x] **타입** — `database.types.ts` 갱신.
- [x] **문서** — `TODO_Phase2`·`TODO`·`TODO_LOG`·`project-context`.
- [x] **검증** — `next build`.
- **다음**: M6b(S06) 또는 M5 `/profile`.

### 2026-04-22 — Phase 2 M4 S03 MainClan 쉘

- [x] **DB** — `0004_main_clan_shell.sql`: `clans.subscription_tier` · `clan_settings`(permissions jsonb) · RLS · `clans` INSERT 시 settings 행.
- [x] **권한** — `permission-defaults.ts` · `has-clan-permission.ts`(D-PERM-01).
- [x] **컨텍스트** — `load-main-clan-context.ts`(D-SHELL-03 manage 점).
- [x] **UI** — `main-clan-shell.tsx`(레일+Sheet) · `clan/[clanId]/layout.tsx` · 대시보드 + 5탭 스텁 · `manage` 멤버 `forbidden()`.
- [x] **액션** — `main-clan-shell.ts` 플랜 전환(dev).
- [x] **타입** — `database.types.ts` 갱신.
- [x] **문서** — `TODO_Phase2`·`TODO`·`TODO_LOG`·`project-context`·`.env.example`(`DEV_CLAN_PLAN_TOGGLE`).
- [x] **검증** — `eslint` · `next build`.
- **다음**: M6a~c 탭 본문 또는 M5 `/profile`.

### 2026-04-22 — Phase 2 M3 S02 게임·클랜 온보딩

- [x] **DB** — `supabase/migrations/0003_clan_join_requests.sql`: D-CLAN-02 테이블·부분 유니크·RLS(본인·운영진·INSERT 정합·취소 UPDATE).
- [x] **타입** — `src/lib/supabase/database.types.ts` `clan_join_requests` + enum.
- [x] **온보딩 로더** — `src/lib/onboarding/load-game-onboarding.ts` (D-AUTH-01 상태).
- [x] **미들웨어** — `src/lib/supabase/middleware.ts` 세션 후 D-SHELL-02 정화 + `supabase` 반환 · `middleware.ts` D-AUTH-01 분기.
- [x] **액션** — `src/app/actions/game-clan-onboarding.ts` (dev 게임 연동 시뮬 · 클랜 생성 서비스 롤 · 가입 신청·취소·교체).
- [x] **UI** — `auth/page.tsx` · `clan/page.tsx` · `games/[gameSlug]/page.tsx`(MainGame 스텁) · 컴포넌트 `game-auth-connect` · `clan-join-list` · `clan-create-form`.
- [x] **게임 선택** — `games/page.tsx` 가입 대기 = `clan_join_requests`.
- [x] **ENV** — `.env.example` `DEV_GAME_LINK_SIMULATOR` 주석.
- [x] **검증** — `npx tsc --noEmit` · `eslint` · `next build` 통과.
- [x] **문서** — `TODO_Phase2.md` M3·라우트 표 · `TODO.md` · `TODO_LOG.md` · `project-context.mdc`.
- **다음**: **M4** — MainClan 레이아웃·사이드바·탭 스텁.

### 2026-04-21 — Phase 2 M2 S01 인증 쉘 (`/` · `/sign-in` · `/sign-up` · `/games`)

- [x] **DB** — `supabase/migrations/0002_auth_login_and_seed_games.sql`: `auth_failed_logins`·`auth_login_lockouts`(D-AUTH-06)·`handle_new_user` 트리거(`auth.users`→`public.users`)·게임 4종(`overwatch`·`valorant`·`lol`·`pubg`) 시드.
- [x] **서버** — `src/lib/supabase/service.ts`(서비스 롤) · `src/lib/auth/lockout.ts` · `src/app/actions/auth.ts` + `auth-action-client.ts`(D-AUTH-07 쿠키 maxAge 24h/30d) · `password-policy.ts`.
- [x] **미들웨어** — `updateSession()` 이 `{ response, user }` 반환. D-LANDING-04(`/→/games`, `?from=logo` 예외) · `/games/**` 비로그인→`/sign-in?next=` · 로그인 상태의 `/sign-in`·`/sign-up`→`/games`. 리다이렉트 시 `mergeCookies`로 세션 쿠키 유지.
- [x] **UI** — `src/app/page.tsx` 랜딩 CTA · `sign-in/`·`sign-up/`(`useFormState`) · `games/page.tsx` + `GameCardGrid` · `games/[gameSlug]/{auth,clan,clan/[clanId]}` 스텁.
- [x] **라우팅** — `src/lib/routing/game-card-router.ts`(`buildGameCardHref`).
- [x] **기타** — `button-variants.ts` 분리(서버에서 `buttonVariants` 호출 가능) · `scripts/seed-fixtures.mjs` + `package.json` `db:seed` · `.env.example` 시드용 `QA_SEED_PASSWORD`.
- [x] **검증** — `npm run build` 통과 · `npx eslint src` 통과.
- [x] **문서** — [TODO_Phase2.md](./TODO_Phase2.md) M2·라우트 표·산출물 지도 · [TODO.md](./TODO.md) · [PHASE2_EXPERIENCE.md](./PHASE2_EXPERIENCE.md) 라이브 4행 🟩.
- **다음**: **M3** — OAuth 게임 인증 · 클랜 온보딩 · RLS(가입 요청). 스텁 페이지 교체.

### 2026-04-21 — Phase 2 M1 인프라 베이스라인 착지

- [x] **Supabase 클라이언트 3종** (`src/lib/supabase/`) — `@supabase/ssr` 기반.
  - `client.ts` — 브라우저용 `createBrowserClient` 래퍼. 세션 쿠키는 SSR 쿠키와 공유.
  - `server.ts` — `cookies()` 기반 `createServerClient`. Server Component 의 쓰기 실패는 `try/catch` 로 흡수(갱신 책임은 미들웨어에 위임).
  - `middleware.ts` — `updateSession(request)` 유틸. 세션 refresh + D-SHELL-02 디버그 쿼리 정화(`?role=`·`?plan=`·`?game=`) 를 프로덕션 빌드에서 원천 차단(`NODE_ENV==='production'` 에서만 리다이렉트).
- [x] **루트 미들웨어 `middleware.ts`** — 최소 골격. `matcher` 는 `_next/static`·`_next/image`·`favicon.ico`·정적 이미지/폰트 확장자 제외. 비로그인 리다이렉트·게임 인증/클랜 소속 매트릭스는 M2/M3 에서 덧붙인다.
- [x] **`supabase/migrations/0001_init.sql`** — 5 테이블 초기 세트:
  - `users` (D-AUTH-03/07, D-STORE-01 `coin_balance` 캐시 포함) — `auth.users` FK + RLS 본인 SELECT/UPDATE. 닉네임·이메일·`discord_user_id` UNIQUE.
  - `games` — 공개 SELECT.
  - `user_game_profiles` — `UNIQUE(user_id, game_id)`, 본인 전권 RLS. 같은 클랜 운영진+ SELECT 확장은 M3 로 이관.
  - `clans` — D-CLAN-04/06 (name 24자, max_members 2~200 CHECK), `lifecycle_status`/`moderation_status` enum, `coin_balance`·`ownership_transferred_at` 포함. 공개 SELECT + 필터는 서버 쿼리 책임.
  - `clan_members` — `UNIQUE(clan_id, user_id)` + `last_activity_at` 인덱스(D-CLAN-07). 본인 SELECT + 같은 클랜 active 멤버 SELECT.
  - 공용 `set_updated_at()` 트리거 4개.
  - INSERT/UPDATE/DELETE 가 민감한 경로(`clans`·`clan_members`·`user_game_profiles` 의 교차 편집)는 전부 Service Role + 서버 액션에서 수행하도록 RLS 를 보수적으로 시작.
- [x] **ENV 정리** — `.env.example` 신설(강제 add). 로컬·Vercel Preview/Production 공통 키: `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY`·`NEXT_PUBLIC_SITE_URL`·`SUPABASE_SERVICE_ROLE_KEY`·`QA_SEED_PASSWORD` 등. (후속: E2E 전용 키는 템플릿에서 제거, 시드·QA만 유지.)
- [x] **`package.json` scripts** — `db:reset` / `db:push` / `types:gen` (로컬 `supabase` CLI 전제). `types:gen` 은 `src/lib/supabase/database.types.ts` 로 출력.
- [x] **검증** — `.next/` 정리 후 `npx tsc --noEmit` · `npx eslint src middleware.ts` 모두 통과.
- [x] **문서 갱신** — [TODO_Phase2.md](./TODO_Phase2.md) M1 체크리스트 7개 중 6개 체크(Vercel preview 는 수동 단계로 보류), 라우트 대응표 말미에 **「M1 인프라 산출물 지도」** 표 신설(7개 파일·역할 명시), `middleware.ts` 전역 행 추가. [TODO.md](./TODO.md) 마지막 갱신·라이브 배너·다음 세션 권장 프롬프트(M2 S01 인증 쉘로 교체).
- **Nano-commit 5개 (본 세션)**: `chore(deps): add @supabase/ssr + supabase-js and db:* scripts` / `feat(lib/supabase): server/client/middleware helpers (@supabase/ssr)` / `feat(middleware): session refresh + D-SHELL-02 debug query drop` / `feat(db): 0001_init migration — users/games/clans/clan_members + RLS` / `chore(env): add .env.example template for local + Vercel` + (문서) `docs: TODO_Phase2 M1 baseline landed + hub + session log`.
- **다음 세션 목표**: **M2 S01 수직 슬라이스** — 비로그인 → 회원가입 → 로그인 → `/games` 카드 클릭스루(D-AUTH-01 6칸) 완주. 미들웨어에 `/sign-in` 리다이렉트 체인 + 이미 로그인 시 `/games` 역방향 체인 추가. `users`·`user_game_profiles`·`clan_members` seed 픽스처 포함.

### 2026-04-21 — Phase 2 체감 로드맵 분리 + 운영 게이트 확장

- [x] **문제 제기**: "마일스톤대로 진행했을 때 내가 명확히 무엇이 바뀌고 있는지 체감이 어렵다. 초반 백엔드 구간에 UI/UX 감이 안 잡힌다." — 체감 장치 필요.
- [x] **설계 원칙**: 사람용 체감 콘텐츠(별명·데모 시나리오·라이브 상태 표·집중 폴리시)를 **별도 파일로 분리**해 에이전트 토큰 부담 억제. 운영 문서([TODO_Phase2.md](./TODO_Phase2.md))에는 링크 1줄 + **운영성 있는 항목만** 추가.
- [x] **신규 `docs/PHASE2_EXPERIENCE.md`** — 사람용 보조 트랙. 별명 표(11행: M0 "지도 펴는 날" ~ M8 "한 바퀴 돈 날") · 마일스톤별 30초 데모 시나리오(M1~M8, 두 계정 시나리오 포함) · 라우트 라이브 상태 표 16행(🟥/🟧/🟩/🟦) · 집중 폴리시 구간 메모(M5, M8) · 미리보기 URL 운영 가이드. 에이전트는 시연·리뷰·릴리즈 시점에만 열면 됨을 상단 명시.
- [x] **`TODO_Phase2.md` 운영성 추가 3개**:
  - 상단 머릿말에 **체감 로드맵 링크 1줄** + "에이전트는 시연 시점에만" 주석.
  - **공통 게이트 이원화**: 기존 5개를 "기술 게이트 5"로 유지하고, **UI/UX 게이트 3** 신설(키보드 온리 플로우 / 375·768·1280px 반응형 / 로딩·에러·빈 상태 3종). 인프라만 있는 마일스톤(M1)은 면제.
  - **M1 체크리스트에 Vercel preview URL 발급** 항목 추가 (`vercel link` + GitHub 연동 + Preview/Production 환경 변수 분리). 이후 마일스톤부터는 PR당 preview URL을 데모 시나리오 공유에 사용.
- [x] **`TODO.md` 허브 배너 한 줄** — "지금 라이브 / 다음 라이브"를 상단에. 현재 값: "(아직 없음 — Phase 1 목업만) / M2 완료 시 `/` · `/sign-in` · `/sign-up` · `/games`".
- [x] **현재 순서 유지 · M5 앞당기지 않음** (사용자 선택).
- **Nano-commit 3개**: `docs: add Phase 2 experience track` / `docs(phase2): UX gate 3 + M1 vercel preview + experience link` / `docs: hub live banner and session log`.
- 참조 플랜: `.cursor/plans/phase_2_master_plan_*.plan.md`.

### 2026-04-21 — Phase 2 마스터 플랜 착지 (M0 기반 정비)

- [x] **전제 확정 Q&A** (plan 모드 2 질문):
  - **Q1 (로케일)** → `src/app/[locale]/` 세그먼트 **제거**. `pages.md` 라우팅 맵(`/sign-in`·`/games/[gameSlug]/...`)을 1:1로 따른다. 다국어는 Phase 2+ 별건(`next-intl` 등) 검토.
  - **Q2 (범위)** → 종료선 = **S00~S06, S08 전체 + S07 경량 4탭**(홈·클랜 홍보·LFG·클랜 순위). 스크림 채팅(D-SCRIM-01/02)·게시판 상세(`/games/[g]/board/[postId]`)·승부예측 정산·서비스워커 푸시·다국어는 Phase 2+ 이관.
- [x] **코드 변경** — `src/app/[locale]/{layout,page}.tsx` 삭제 + `src/app/page.tsx`의 `redirect("/ko")` 제거 후 Phase 2 로드맵 안내 스텁으로 교체. `html lang="ko"`는 유지(단일 로케일). `npx eslint src`로 회귀 없음 확인.
- [x] **`docs/TODO_Phase2.md`** 본문에 마스터 플랜 착지:
  - **마일스톤 표** M0~M8 — 슬라이스 매핑(S00~S08)·핵심 산출물·선행 관계·상태. Mermaid flowchart로 의존 시각화.
  - **공통 게이트 5개** — 수용 기준 체크 / pages.md 가드 체인 통과 / RLS 4역할 테스트 / 라우트 대응표 갱신 / nano-commit + 세션 로그.
  - **마일스톤별 체크리스트** — M0(기반), M1(인프라 Supabase 헬퍼·0001_init·middleware 골격·env·db scripts), M2(S01 4라우트·D-AUTH-03/06/07·D-AUTH-01 6칸), M3(S02 OAuth·D-CLAN-01/02/04·RLS 1차), M4(S03 사이드바·hasPermission·플랜 토글·탭 스텁), M5(S08 프로필 D-PROFILE-01~04 병렬), M6a/b/c(통계·이벤트·관리·스토어·밸런스), M7(S07 경량 4탭, 스크림 안내만), M8(Phase 2 감사 + Phase 2+ 이관).
  - **라우트 대응표 15행** — `/` · `/sign-in` · `/sign-up` · `/games` · `/games/[g]/auth` · `/games/[g]/clan` · `/games/[g]/clan/[id]` · 5개 탭 · `/games/[g]` · 스크림 탭/`board` 상세(Phase 2+ 보류 명시) · `/profile`. 각 행에 목업 파일·담당 마일스톤·상태 표기.
- [x] **허브 갱신** — [TODO.md](./TODO.md) 현재 단계 문구(`마스터 플랜 M0~M8`)·마지막 갱신 + 권장 프롬프트 2종 갱신(**지금 = M1 인프라**, **M2 이후 슬라이스 착수**). [TODO_Phase2.md](./TODO_Phase2.md) M0 첫 2개 체크(`[locale]` 제거·로드맵 문서화) 완료로 표기.
- [x] **Nano-commit 3개** — `chore(src): drop [locale] segment, land Phase 2 stub` / `docs: TODO_Phase2 master plan (M0-M8 roadmap)` / `docs: hub prompts and TODO last-updated` ([.cursor/rules/git-nano-commit.mdc](../.cursor/rules/git-nano-commit.mdc)).
- **다음 세션 목표**: **M1 인프라** — `@supabase/ssr` 도입 · `src/lib/supabase/{server,client,middleware}.ts` · `supabase/migrations/0001_init.sql` · `middleware.ts` 골격 · `.env.local`/`.env.example` · `db:reset/push/gen` scripts. 완료 후 M2 S01 수직 슬라이스(회원가입→로그인→`/games` 클릭스루) 진입.
- 참조 플랜 파일: `.cursor/plans/phase_2_master_plan_*.plan.md`.

### 2026-04-21 — D-PRIV-01 종결 (개인 단위 프라이버시 오버라이드 프리셋 α · 범위 R3)

- [x] **결정 컨펌 절차 준수** (`.cursor/rules/decision-confirm.mdc`):
  - **4 설계 축 × 프리셋 제시**: 방향(닫기만/양방향)·대상 키(통계 5/6)·역할별 세분(단일/2단)·저장 범위(클랜별/전역) → 조합 α/β/γ/δ 비교표 + β·γ·δ 탈락 근거(β officer 숨김 시 운영 마비·γ 클랜마다 분위기 달라 해상도 손실·δ 프라이버시 감수성 미충족).
  - **범위 R1~R4**: R1 프로필 전면 구현 / R2 결정·스키마만 / R3 결정·스키마 + D-PERM-01 카드 예고 카피 1줄 / R4 프로필 예고 섹션 — 추천 R3.
  - 사용자 선택 = **α + R3**.
- [x] **D-PRIV-01 — 개인 단위 프라이버시 오버라이드 (프리셋 α)** (DECIDED 2026-04-21, 사용자 컨펌)
  - **프리셋 α**: restrict-only · 통계 5개 키(`view_monthly_stats`·`view_yearly_stats`·`view_synergy_winrate`·`view_map_winrate`·`view_mscore`) · 단일 스위치(켜면 같은 클랜 member 대상 숨김, leader·officer는 항상 열람 — 운영 책임) · 클랜별 독립 저장.
  - **부계정(`view_alt_accounts`) 제외 근거**: ① 한 사람이 여러 계정으로 시너지·로스터 왜곡하는 부정행위 은폐 경로 ② D-PERM-01 default ✓/✓/✓로 같은 클랜원끼리의 커뮤니티 신뢰 기반 ③ 법적 이슈 아님(공개 식별자).
  - **열기 불가(restrict-only) 근거**: ① 개인이 밀어붙여 공개 시 다른 멤버에게 암묵적 압력 ② 단방향이면 UI 체크박스 1개로 끝 ③ 필요 시 `hidden boolean` → `visibility_override enum` 비파괴 확장 가능.
  - **스키마**: `user_privacy_overrides(user_id, clan_id, key, hidden, created_at, updated_at)` 신설. PK `(user_id, clan_id, key)`. CHECK 제약으로 key 5종 화이트리스트. ON DELETE CASCADE 양쪽 FK. 부분 인덱스 `idx_user_privacy_overrides_lookup (user_id, clan_id) WHERE hidden=true`.
  - **RLS 3정책**: (1) `priv_self_all` — 본인 FOR ALL (2) `priv_clan_officer_read` — 같은 클랜 leader·officer FOR SELECT (🔒 아이콘 표시용) (3) member는 타인 행 직접 조회 경로 없음 (`has_user_stat_access()` 함수로만 게이팅).
  - **유효 정책 계산 함수** `has_user_stat_access(viewer_id, target_id, clan_id, key)` — 5단계: 본인 체크 → viewer 역할 → leader·officer 통과(D-PERM-01만 위임) → member는 target 오버라이드 우선 확인 → 오버라이드 없으면 `has_clan_permission()` 위임.
  - **적용 5개 화면**: `#view-stats` 월간/연간 탭·BalanceMaker 시너지 표시·맵별 승률 카드·팀 슬롯 M점수 뱃지·개인 프로필 M점수. 숨김 시 "비공개" 뱃지(회색 `--` + 툴팁). leader·officer 화면에는 정상 수치 + 🔒 아이콘(member에게 숨김 표시).
  - **범위 R3**: Phase 1 목업 = D-PERM-01 안내 박스 내부 예고 카피 1줄(`.mock-privacy-override-hint`). 실제 오버라이드 UI·함수·화면 적용은 Phase 2+ 이관.
  - **Phase 2+ 전환 규약 7단계**: (1) 테이블·RLS 배포 → (2) 함수 배포 + 단위 테스트 8조합 → (3) 통계·프로필 쿼리에 `has_user_stat_access()` 필터 적용 → (4) 프로필 "프라이버시 설정" 섹션(클랜별 탭 + 5키 토글) → (5) leader·officer 🔒 아이콘 표시 → (6) 클랜 탈퇴 CASCADE 검증 → (7) `10-Clan-Stats.md`·`08-Profile.md` 문서 갱신.
- [x] `docs/01-plan/decisions.md`
  - 헤더 표에 **"프라이버시 (PRIV)" 신규 섹션 신설** — "권한 (PERM)" 다음. D-PRIV-01 DECIDED 행 추가.
  - §D-PERM-01 카테고리 6 "개인 정보" 블록쿼트: "Phase 2+ 후속 결정 D-PRIV-01 후보로 보류" → "D-PRIV-01 DECIDED 2026-04-21" 로 갱신.
  - §D-PERM-01 Phase 2+ 백로그 5번 취소선 + DECIDED 링크 추가.
  - 본문 말미에 **§D-PRIV-01 상세 블록 신설** — 4 설계 축 × α/β/γ/δ 비교표, β/γ/δ 탈락 근거, restrict-only 근거 3건, 부계정 제외 근거 3건, 스토리지 형태 SQL, `has_user_stat_access()` 5단계 함수, 적용 5개 화면 표, RLS 3정책, D-PERM-01 관계, Phase 1 목업 영향(R3), Phase 2+ 전환 규약 7단계, 후속 결정 후보 D-PRIV-01b(양방향)·D-PRIV-02(부계정)·D-PRIV-03(비클랜 맥락).
- [x] `docs/01-plan/schema.md`
  - **`user_privacy_overrides` 테이블 신설** (§web_push_subscriptions 직후, §store_items 앞) — 컬럼 6종·PK·CHECK·부분 인덱스·RLS 3정책·`has_user_stat_access()` 함수 5단계·UPSERT/DELETE 패턴.
- [x] `docs/01-plan/pages/07-MainClan.md`
  - §결정 필요: D-PRIV-01 라인을 "후속 후보 OPEN" → "DECIDED 2026-04-21 (프리셋 α, 범위 R3)" 로 갱신.
  - 신규 후속 후보 3건 등재: **D-PRIV-01b**(양방향 재검토, 조건부)·**D-PRIV-02**(부계정 오버라이드 재검토)·**D-PRIV-03**(비클랜 맥락, Phase 2+).
  - §구현 참고: D-PRIV-01 예고 카피 위치·클래스·교체 지점 라인 추가 (`.mock-privacy-override-hint`).
- [x] `mockup/pages/main-clan.html`
  - **CSS 신설**: `.mock-privacy-override-hint`(상단 점선 보더로 D-PERM-01 안내 박스와 분리, margin-top 8px, 기존 박스 스타일 상속), `.mock-privacy-override-hint__tag`(보라 칩).
  - **D-PERM-01 안내 박스 확장**: `#mock-manage-clan-settings-card` 카드의 D-PERM-01 흡수 안내 박스 내부 하단에 D-PRIV-01 예고 카피 1줄 — `aria-hidden="true"`로 보조 디바이스 읽기 제외. 본문 = "Phase 2+ 매트릭스 UI와 함께 개인 단위 프라이버시 오버라이드도 프로필 페이지에 제공됩니다 — 본인이 통계 5개 키를 같은 클랜 member에게만 숨길 수 있는 토글. leader·officer는 항상 열람(운영 책임). 부계정은 대상 제외(부정행위 은폐 차단)."
- [x] `mockup/scripts/clan-mock.js`
  - `CLAN_PERMISSION_CATALOG` "개인 정보" 카테고리에 **D-PRIV-01 주석 블록 신설** — 6 포인트(클랜 단위 기본값·오버라이드 대상 5키·방향 restrict-only·저장 테이블·Phase 1 목업 위치·Phase 2+ 이관 항목) 명시.
  - `note` 문구 갱신: "D-PRIV-01(후속) 보류" → "D-PRIV-01 DECIDED 2026-04-21 (α · restrict-only · 통계 5키 · 단일 스위치 · 클랜별 독립 · Phase 2+ UI)".
  - JS 로직 무변경(예고 카피는 inert) — 기존 `mockClanHasPermission`, `CLAN_PERMISSION_BY_KEY` 그대로.
- [x] **신규 후속 후보 식별**:
  - **D-PRIV-01b** (OPEN, 조건부) — 양방향 오버라이드 재검토. 운영 6개월 후 "개인이 열고 싶어 한다"는 수요 확인 시 `hidden boolean` → `visibility_override enum('inherit','hide','show')` 확장.
  - **D-PRIV-02** (OPEN) — 부계정(`view_alt_accounts`) 오버라이드 재검토. 부정행위 은폐 리스크 vs 개인 의사 수용 균형점 재평가.
  - **D-PRIV-03** (OPEN, Phase 2+) — 비클랜 맥락(클랜 탈퇴 후·외부 프로필 열람)의 프라이버시 정책. D-ECON-03 외부 노출 차단과 구분.
- [x] **Phase 1 결정 사이클 실질 마감**:
  - 남은 OPEN 후보는 전부 **Phase 2+ 이관**(D-NOTIF-02b 공급자·D-EMAIL-01 거래 메일·D-PRIV-03 비클랜 맥락) 또는 **조건부 재오픈**(D-NOTIF-02c Free 하이브리드·D-NOTIF-03b 다이제스트·D-PRIV-01b 양방향·D-PRIV-02 부계정) 성격 — Phase 1 목업 범위에서는 더 추가 결정할 항목 없음.
- [x] **결과**: D-PERM-01 "개인 정보" 카테고리의 **개인 레이어가 닫힘**. 클랜 단위 기본값(21 권한 키 중 6) + 개인 오버라이드(통계 5키 restrict-only)로 **2단 프라이버시 모델 완성**. 운영 책임(leader·officer 항상 열람) + 부정행위 차단(부계정 제외) + 클랜별 독립성(문화 차이 수용) 3축 균형. 목업 침습 = CSS 1 블록 + HTML 1 블록(안내 박스 내부 4줄) + JS 주석 6줄 + `note` 1줄 갱신 — **최소 침습 달성**.
- [x] **분할 커밋**: `docs(plan): decide D-PRIV-01 — personal privacy override preset α (restrict-only, stat keys)` → `docs(plan): schema — user_privacy_overrides table + has_user_stat_access function` → `feat(mockup): D-PRIV-01 R3 preview copy in D-PERM-01 settings card` → `docs(todo): log D-PRIV-01 close session + mark Phase 1 decisions cycle complete`.

---

### 2026-04-21 — D-NOTIF-03 종결 (이메일 다이제스트 DROPPED)

- [x] **결정 컨펌 절차 준수** (`.cursor/rules/decision-confirm.mdc`):
  - **프리셋 묶음 컨펌**: α Premium 전용 주간 다이제스트 / β 전원 주간 / γ 하이브리드(Free 필수 공지 + Premium 주간) / **δ 도입 보류(DROPPED)**. 범위 R1~R4 병렬 제시.
  - 사용자 1차 응답: "이게뭘 하는건지 모르겠는데?" → 어시스턴트가 **이메일 다이제스트 개념 재설명** (LinkedIn·Notion·GitHub 주간 요약 메일 예시, ClanSync 시뮬레이션 메일 샘플, in-app·브라우저 푸시와 차별점 3열 비교표 제공).
  - 사용자 최종 선택 = **"필요 없어보여"** → **δ = DROPPED**.
- [x] **D-NOTIF-03 — 이메일 다이제스트** (DROPPED 2026-04-21, 사용자 컨펌)
  - **결론**: 도입하지 않음. 스키마·목업·워커·발송 공급자 계약 모두 **추진 중단**.
  - **유지되는 것**: 거래 메일(비밀번호 재설정·가입 이메일 인증·필수 공지·약관 변경 고지)은 **별개 트랙으로 유지**. 사용자 옵트아웃 불가(필수 거래성).
  - **DROPPED 근거**: (1) 재참여·이탈 방지는 D-NOTIF-01(in-app) + D-NOTIF-02(web push)로 충분. (2) 게임 커뮤니티 특성상 주간 메일 = 스팸 인식 리스크, 거래 메일 배달률 동반 저하 우려. (3) 정보통신망법 옵트인 관리·야간 광고 금지(21~08 KST)·1-Click Unsubscribe(RFC 8058)·Bounce/Complaint 파이프라인 등 법·운영 오버헤드. (4) 멤버 수 × 주간 발송 발송비 불확실, ROI 검증 전. (5) 운영 6~12개월 데이터 누적 후 재검토 여지 보존.
  - **번복 조건** (D-NOTIF-03b 재오픈 트리거): 비활성·휴면 복귀율 측정값이 낮고(<5%) 경쟁사 다이제스트 복귀율 2배 이상 확보 사례 발견 / 클랜장 3개 이상 독립 소스에서 요구 제기 / 카카오·Discord·web_push 만으로 Premium 차별화 부족 수치 확인.
  - **불변량 선언**: (a) `users` 테이블에 다이제스트 구독 컬럼 미리 추가하지 않음. (b) `notification_log.channel` enum에 `email_digest` 값 추가하지 않음. (c) 프로필·설정 페이지에 "이메일 알림 설정" 자리를 비워두지 않음 (재오픈 시점에 신설).
- [x] `docs/01-plan/decisions.md`
  - 헤더 표 "통신 · 알림 (NOTIF)" 섹션에 **D-NOTIF-03 DROPPED 행 추가** (2026-04-21).
  - §D-NOTIF-01 Phase 2+ 백로그 6번 "후속 결정 후보 D-NOTIF-03" 라인을 취소선 + **"DROPPED 2026-04-21"** 로 갱신, §D-NOTIF-03 앵커 링크 첨부.
  - 본문 말미에 **§D-NOTIF-03 — 이메일 다이제스트 (DROPPED) 블록 신설** — DROPPED 근거 5건 표, 번복 조건 3건, 유지되는 것(거래 메일·공급자는 D-EMAIL-01로 분리), 영향 정리(스키마·목업·페이지 모두 변경 없음), 후속 결정 후보 D-EMAIL-01(거래 메일 공급자)·D-NOTIF-03b(조건부 재오픈), 연관 링크.
- [x] `docs/01-plan/pages/07-MainClan.md`
  - §결정 현황: D-NOTIF-03 라인을 "후속 후보 OPEN" → **"DROPPED 2026-04-21"** 로 갱신.
  - 신규 후속 후보 **D-EMAIL-01**(거래 메일 공급자, Phase 2+ OPEN)·**D-NOTIF-03b**(다이제스트 재검토, 조건부 OPEN) 등재.
- [x] **변경 없음** (의도된 불변량 준수):
  - `docs/01-plan/schema.md` — 변경 없음 (`email_digest` enum 값·구독 테이블 미추가).
  - `mockup/pages/main-clan.html` · `mockup/scripts/clan-mock.js` — 변경 없음 (R3 예고 배너 신설 안 함).
  - 기타 페이지 문서 — 변경 없음.
- [x] **신규 후속 후보 식별**:
  - **D-EMAIL-01** (OPEN, Phase 2+) — 거래 메일 공급자 선택 (Resend · AWS SES · SendGrid 등) 및 템플릿 정책. 다이제스트와 분리, Phase 2+ 거래 메일 구현 시점에 결정.
  - **D-NOTIF-03b** (OPEN, 조건부) — 다이제스트 도입 재검토. 위 "번복 조건" 3건 중 최소 1건 충족 시에만 재오픈.
- [x] **남은 후속 후보 요약**:
  - D-NOTIF-02b(공급자 선택)·D-NOTIF-02c(Free 하이브리드 재검토)·D-PRIV-01(개인 프라이버시 오버라이드)·신규 D-EMAIL-01·D-NOTIF-03b.
- [x] **결과**: **알림 3부작(D-NOTIF-01·02·03) 완주**. in-app 피드 도입 + 웹 푸시(Premium 전용) 도입 + 이메일 다이제스트 미도입으로 알림 채널 정책 **전체 정합 완료**. 유료 채널 정합성 유지(카카오·Discord·web_push = Premium). 이메일 트랙은 거래 메일 전용으로 축소되어 운영 복잡도 최소화 — **스키마 일체 변경 없이 결정만 기록**하여 Phase 2+ 재오픈 여지 보존.
- [x] **분할 커밋**: `docs(plan): drop D-NOTIF-03 — email digest deemed unnecessary` → `docs(plan): cross-ref D-NOTIF-03 DROPPED in 07-MainClan + D-EMAIL-01/D-NOTIF-03b` → `docs(todo): log D-NOTIF-03 DROPPED session`.

---

### 2026-04-21 — D-NOTIF-02 종결 (브라우저 ServiceWorker 푸시 프리셋 α · 범위 R3)

- [x] **결정 컨펌 절차 준수** (`.cursor/rules/decision-confirm.mdc`):
  - **프리셋 묶음 컨펌**: α 보수적(Premium 전용·카테고리 독립 토글·맥락형 권한 프롬프트·서버 quiet hours) / β 공격적(Free 포함 전체) / γ Free 중요 알림만 하이브리드 / δ 도입 보류. **범위 R1(전면 목업 스텁) / R2(결정·스키마만) / R3(스키마 + 벨 드로워 상단 inert 예고 배너 1줄)** 2축으로 제시 → 사용자 선택 = **α + R3**.
  - β 탈락 근거: D-EVENTS-03 외부 채널 과금 경계(카카오·Discord = Premium) 파괴. γ 탈락 근거: kind×plan 22조합 테스트 부담, 6개월 데이터 누적 후 D-NOTIF-02c로 재검토. δ 탈락 근거: 모바일·탭 닫은 사용자 재참여 경로 0.
- [x] **D-NOTIF-02 — 브라우저 서비스워커 웹 푸시 도입 정책 (프리셋 α)** (DECIDED 2026-04-21, 사용자 컨펌)
  - **프리셋 α**: Premium 전용. 4 카테고리 독립 토글(운영·개인·일정·채팅). 권한 요청은 벨 드로워 최초 열 때 맥락형 배너 → [알림 켜기] 클릭 시에만 `Notification.requestPermission()` 호출. 서버 quiet hours 00~07 KST 준수(07시 일괄). 본인이 직접 트리거한 이벤트(본인 정정 요청 결과 등)는 조용 시간에도 즉시 발송.
  - **스키마**: `web_push_subscriptions(user_id, endpoint, p256dh, auth, user_agent, created_at, revoked_at)` 신설. soft delete(`revoked_at`), N 디바이스 허용, `UNIQUE (user_id, endpoint) WHERE revoked_at IS NULL`. `notification_log.channel` enum에 `web_push` 추가. 재시도 정책은 D-EVENTS-03 지수 백오프 5회 동일, 410 Gone 응답 시 즉시 `revoked_at = now()` 업데이트 + DLQ 생략.
  - **권한 키 신설 없음**: 개인 구독은 본인 선택이라 D-PERM-01 매트릭스와 독립. RLS는 본인 행만 SELECT/INSERT/UPDATE, DELETE는 cron 전용.
  - **범위 R3**: Phase 1 목업 = 벨 드로워 최상단에 inert 예고 배너 1줄(`"🔔 브라우저 알림은 Premium 전용 · Phase 2+ 예정 (D-NOTIF-02)"`). CSS 클래스 `.mock-notifications-push-hint` — Phase 2+ 실제 권한 배너 교체 지점 검색 키.
  - **Phase 2+ 전환 규약**: (1) Free → Premium 업셀 배너 + 플랜 비교 모달. (2) Premium + 미구독 → 맥락형 권한 배너. (3) Premium + 구독 완료 → 배너 숨김. (4) 거절 시 7일간 배너 재표시 금지(`localStorage.web_push_dismiss_until`).
- [x] `docs/01-plan/decisions.md`
  - 헤더 표 "통신 · 알림 (NOTIF)" 섹션에 **D-NOTIF-02 행 추가** (DECIDED 2026-04-21).
  - §D-NOTIF-01 Phase 2+ 백로그 5번을 "후속 결정 후보" → "DECIDED 2026-04-21 (프리셋 α, Phase 2+ 실구현)"로 갱신.
  - 본문 말미에 **§D-NOTIF-02 상세 블록 신설** — 프리셋 α/β/γ/δ 비교표, β/γ/δ 탈락 근거, 범위 R1/R2/R3 비교 + R3 선택 근거, 스키마(테이블 정의·채널 카탈로그 확장·재시도 정책), 발송 플로우 의사코드, 권한 프롬프트 타이밍 UX, 카테고리 구독 토글 기본값, Quiet Hours 정책, Phase 1 목업 영향(R3), Phase 2+ 백로그 11단계 + 후속 결정 후보 D-NOTIF-02b(공급자 선택)·D-NOTIF-02c(Free 하이브리드 재검토).
- [x] `docs/01-plan/schema.md`
  - `notification_log.channel` enum 확장: `enum('inapp','discord','kakao','web_push')`. "D-NOTIF-02 연동" 비고 행 추가.
  - **`web_push_subscriptions` 테이블 신설** (§notifications 직후, §store_items 앞): 컬럼 8종·UNIQUE 부분 인덱스·RLS 4정책·발송 플로우 의사코드·`revoke_web_push_subscription` 함수 예시.
  - §notification_log "D-NOTIF-01 연동" 블록에 "D-NOTIF-02 연동" 문단 추가 — `web_push` 채널 행은 Premium 게이팅 + quiet hours 보정 + 410 Gone 처리 요약.
- [x] `docs/01-plan/pages/07-MainClan.md`
  - 상단 결정 요약에 **D-NOTIF-02 DECIDED 블록쿼트 한 줄 추가** (D-NOTIF-01 바로 아래).
  - §네비게이션바 상단 알림 벨 ASCII 다이어그램에 **예고 배너 영역 추가** (제목 바로 아래, 첫 알림 위).
  - **§브라우저 푸시 예고 배너 (D-NOTIF-02 · R3) 서브섹션 신설** — 카피·클래스·스타일 지침·Phase 2+ 전환 규약 4단계.
  - §결정 현황: D-NOTIF-02 라인을 "후속 후보 OPEN" → "DECIDED 2026-04-21"로 갱신. 신규 후속 후보 **D-NOTIF-02b**(공급자 선택)·**D-NOTIF-02c**(Free 하이브리드 재검토) 등재.
  - §구현 참고(개발자용)에 `.mock-notifications-push-hint` 라인 추가 — Phase 2+ 교체 지점 검색 키.
- [x] `mockup/pages/main-clan.html`
  - **CSS 신설**: `.mock-notifications-push-hint`(보라 틴트 배경 `rgba(76,29,149,0.25)`, 상하 테두리 `rgba(139,92,246,0.3)`), `.mock-notifications-push-hint__icon`(14px 아이콘), `.mock-notifications-push-hint__copy`, `.mock-notifications-push-hint__tag`(D-NOTIF-02 칩 — 보라 `#e9d5ff` 텍스트).
  - **드로워 마크업 확장**: `<div class="mock-notifications-drawer__head">` 직후 `#mock-notifications-push-hint` DOM 삽입 — `aria-hidden="true"`·클릭 핸들러 없음·보조 디바이스 읽기 대상 제외. 배너 본문 = `🔔 브라우저 알림은 Premium 전용 · Phase 2+ 예정` + `<span class="mock-notifications-push-hint__tag">D-NOTIF-02</span>`.
- [x] `mockup/scripts/clan-mock.js`
  - D-NOTIF-01 구역 헤더 주석에 **"D-NOTIF-02 · R3 연계" 블록 신설** — 예고 배너는 순수 HTML/CSS(JS 상호작용 없음)임을 명시. Phase 2+ 교체 지점 지침(클래스 `.mock-notifications-push-hint`로 검색, `web_push_subscriptions` 구독 저장소 참조).
  - JS 로직 무변경(배너는 inert) — sessionStorage·이벤트 리스너·렌더 함수 그대로.
- [x] **후속 결정 후보 식별**:
  - **D-NOTIF-02b** (OPEN) — web_push 공급자·SDK 선택 (web-push npm 패키지 · Firebase Cloud Messaging · OneSignal 등). Phase 2+ VAPID 설정 전 결정.
  - **D-NOTIF-02c** (OPEN) — γ 하이브리드(Free 중요 알림 허용) 재검토. 운영 6개월 데이터 누적 후.
  - **D-NOTIF-03** (OPEN) — 이메일 다이제스트 (일간/주간 요약).
  - **D-PRIV-01** (OPEN) — 개인 단위 프라이버시 오버라이드.
- [x] **결과**: D-NOTIF-01 직후 **외부 알림 채널 정책의 절반**이 닫힘. 유료 채널 3종(카카오·Discord·web_push) 모두 Premium 전용으로 정합. Phase 2+ 구현 순서(VAPID → 구독 테이블 → SW → 드로워 배너 교체 → 서버 워커 → 410 Gone 처리 → 카테고리 토글 UI) 백로그화. 목업 변경은 inert 배너 1줄 + CSS 1 블록 + 주석 1줄 — **최소 침습 달성**.
- [x] **분할 커밋**: `docs(plan): decide D-NOTIF-02 — web push preset α (Premium-only, R3 scope)` → `docs(plan): schema — web_push_subscriptions + notification_log channel=web_push` → `docs(plan): wire 07-MainClan banner preview + follow-up candidates (D-NOTIF-02b/02c)` → `feat(mockup): D-NOTIF-02 R3 inert push-hint banner in drawer` → `docs(todo): log D-NOTIF-02 close session`.

---

### 2026-04-21 — D-NOTIF-01 종결 (in-app 알림 센터 통합, 디스코드식 벨+드로워)

- [x] **결정 컨펌 절차 준수** (`.cursor/rules/decision-confirm.mdc`):
  - **1차 묶음 컨펌**: 프리셋 4종(α 디스코드식 통합 / β 관리 메뉴 확장 / γ no-op / δ α+푸시) + 범위 미세조정(운영만/운영+개인/일정까지 통합) + 사이드바 점 병존 여부 + 읽음 GC 주기 → 사용자 선택 = **α + 전체 통합 + 병존 + 7일 GC**.
  - **2차 구조 컨펌**: `notification_log`(기존, D-EVENTS-03/04) ↔ 신설 `notifications`의 연결 모델 M1/M2/M3 3옵션 + 개인 결과 알림 동기화(트리거/RPC/하이브리드) 2옵션 제시 → 사용자 선택 = **M1 분리+FK** / **DB 트리거 자동 INSERT**.
  - **중간 용어 정의 질문 응대**: 사용자가 "개인 결과 알림이 뭔지 정확히 설명해줘" 요청 → 수신자 관점 3분류(운영/개인 결과/일정) 매트릭스로 전량 예시 제시 후 질문 재제기.
- [x] **D-NOTIF-01 — in-app 알림 센터 통합 도입** (DECIDED 2026-04-21, 사용자 컨펌)
  - **프리셋 α**: 네비게이션바 상단 벨 아이콘 + 우측 슬라이드 드로워. 디스코드·Slack 스타일 통합 피드.
  - **범위**: 운영 알림(가입·정정 요청·스크림 확정·LFG 신청·휴면) + 개인 결과 알림(내 요청의 수락/거절/만료) + D-EVENTS-03 일정 in-app 알림 **전체**.
  - **저장 = M1 분리 + FK**: `notification_log`(기존 발송 레이어 그대로 유지 — D-EVENTS-03/04 비파괴) + `notifications`(신설 피드 레이어). 일정은 `notification_log.channel='inapp' AND status='sent'` AFTER UPDATE 트리거로 `notifications` 자동 생성, 운영·개인은 소스 테이블 AFTER INSERT/UPDATE 트리거로 자동 생성.
  - **M2/M3 탈락 근거**: M2(log 확장 흡수)는 기술 레이어와 UI 레이어 혼재 + 기존 UNIQUE 제약 운영 알림에 부적합. M3(log deprecate)는 D-EVENTS-03/04 DECIDED를 뒤집어 번복 비용 과다.
  - **읽음 2상태 + 7일 GC**: 드로워 열면 표시 항목 일괄 read, "원본 열기" 클릭 시 read + 딥링크. 읽은 후 7일 경과분 cron 삭제. 미읽음(`read_at IS NULL`)은 영구 보존.
  - **권한 키 신설 없음**: 수신자 계산은 소스 트리거에서 권한 체크 이후에 이뤄지므로 `notifications`는 RLS `recipient_user_id = auth.uid()`만 두면 충분.
  - **사이드바 병존**: D-SHELL-03 메뉴별 점(`#sidebar-notify-balance/events/manage`)은 **집계 척도가 달라** 그대로 유지. 벨 = "내 피드에 새 소식", 메뉴 점 = "이 화면에 해야 할 일".
  - **payload 스냅샷**: 생성 시점의 요청자 닉네임·경기 라벨 등을 `jsonb`에 보존해 원본 삭제 시에도 피드 문구 유지.
- [x] `docs/01-plan/decisions.md`
  - 헤더 표에 **"통신 · 알림 (NOTIF)" 섹션 신설** + D-NOTIF-01 행(DECIDED 2026-04-21) 추가.
  - 본문 말미에 §D-NOTIF-01 상세 블록 신설 — 수신자 관점 3분류 표, 프리셋 4종 비교 표(α 선택 기록), M1/M2/M3 저장 모델 트레이드오프, 트리거 매핑(11개 소스 테이블 × kind), 읽음·GC·payload 설계, 권한 키 미신설 근거, Phase 2+ 백로그(후속 결정 D-NOTIF-02/03 식별).
  - §D-STATS-02 본문의 "D-NOTIF-01 후속 결정" 표현을 "D-NOTIF-01 통합 센터, DECIDED 2026-04-21"로 갱신 (2곳).
- [x] `docs/01-plan/schema.md`
  - **`notifications` 테이블 신설**: `recipient_user_id`·`clan_id NULL`·`kind`·`source_table`·`source_id`·`payload jsonb`·`read_at`·`created_at`. soft FK(물리 FK 없음, RLS 재확인 전략). 인덱스 3개(unread 부분 인덱스, 전체 피드, source 역조회).
  - **슬롯 키 카탈로그 11종** 매트릭스 — join_request·match_correction·scrim·lfg·member_dormant·event_reminder + 수신자 결정 규칙 + 소스 결정 코드.
  - **트리거 라우팅 예시 SQL 2종**: 정정 요청 상태 전환 → 요청자 알림 / in-app log sent → 피드 sync.
  - **RLS·GC RPC**: `mark_notifications_read(before_ts)` / 7일 GC cron.
  - `notification_log` 섹션에 "D-NOTIF-01 연동" 주석 한 줄 추가(기존 UNIQUE·재시도 정책 비파괴).
  - `match_record_correction_requests`의 "알림 슬롯" 캡션을 "D-EVENTS-03 재사용 + D-NOTIF-01 후속" → "D-NOTIF-01 통합 센터 DECIDED 2026-04-21"로 확정.
- [x] `docs/01-plan/pages/07-MainClan.md`
  - 상단 결정 요약에 D-NOTIF-01 DECIDED 블록쿼트 한 줄 추가.
  - **§네비게이션바 상단 알림 벨 (D-NOTIF-01)** 섹션 신설 — ASCII 레이아웃 다이어그램, 벨 배지 산식, 드로워 동작 표(열람 시 일괄 read·원본 열기·모두 읽음·Esc/외부 클릭·무한 스크롤 후속), 카테고리 뱃지 4종 매핑(운영/개인/일정/채팅).
  - §구현 참고(개발자용)에 `#mock-navbar-notify-bell`·`#mock-notifications-drawer`·`mockNotificationsStore` 등 식별자 추가.
  - §결정 필요에 D-NOTIF-01 DECIDED + 후속 후보 D-NOTIF-02(ServiceWorker 푸시)·D-NOTIF-03(이메일 다이제스트) OPEN 등재.
- [x] `docs/01-plan/pages/10-Clan-Stats.md`
  - 정정 요청 제출·처리 플로우 문구를 트리거 용어로 정돈(`AFTER INSERT/UPDATE 트리거 → notifications kind=...` 피드 생성).
  - §결정 현황 D-NOTIF-01 라인을 "OPEN 후속" → "DECIDED 2026-04-21, decisions.md 링크"로 갱신.
- [x] `mockup/pages/main-clan.html`
  - **CSS 신설**(`<style>` 말미): `.navbar-end`·`.mock-navbar-notify-bell`·`.mock-navbar-notify-badge`(빨간 #ef4444 원형, 99+ 지원)·`.mock-notifications-drawer`·오버레이·아이템(unread 보라 틴트, 카테고리 dot 4색 orange/green/blue/gray)·접근성 키프레임.
  - **네비게이션바 우측 `.navbar-end` 신설**: 벨 버튼(`#mock-navbar-notify-bell` + `#mock-navbar-notify-badge`), SVG 벨 아이콘, `aria-expanded`·`aria-controls`.
  - **드로워 마크업**(`#mock-notifications-drawer` + overlay): 제목·D-NOTIF-01 뱃지·모두 읽음/닫기 버튼·빈 상태 문구.
- [x] `mockup/scripts/clan-mock.js`
  - **D-NOTIF-01 구역 신설**(정정 요청 헬퍼와 클랜 설정 사이): `MOCK_NOTIFICATIONS_KEY = 'clansync-mock-notifications-v1'` + 시드 5건(운영 2·개인 1·일정 1·채팅 1, 읽음 상태 섞음).
  - 스토어: `window.mockNotificationsStore = { list, unreadCount, markRead, markAllRead }`.
  - UI 헬퍼: `mockNotificationsRefreshBadge()`(미열람 수 → 벨 배지 0/99+ 처리), `mockNotificationsRenderBody()`(아이템 재생성, 카테고리 dot + 텍스트 + 메타 + "원본 열기").
  - 공개 API: `mockNotificationsOpenDrawer()`(애니메이션 열기 + 600ms 후 표시 항목 일괄 read), `mockNotificationsCloseDrawer()`(220ms 애니메이션 후 hidden), `mockNotificationsMarkAllRead()`, `mockNotificationsOpenSource(id)`(read + Phase 1 플레이스홀더 alert).
  - **DOMContentLoaded 시 배지 동기화** + **Esc 키 전역 핸들러**로 드로워 닫기.
- [x] **후속 결정 후보 식별**:
  - **D-NOTIF-02** (OPEN) — 브라우저 ServiceWorker 푸시 도입 여부·QoS·구독 UI.
  - **D-NOTIF-03** (OPEN) — 이메일 다이제스트(일간/주간 요약) 여부·파이프라인.
  - **D-PRIV-01** (OPEN) — 개인 단위 프라이버시 오버라이드(클랜 단위 개인 정보 정책 위에 본인이 더 닫는 옵션). D-NOTIF-01과 별개로 진행 가능.
- [x] **결과**: 운영·개인 결과·일정 in-app 알림이 단일 피드로 통합됨. D-STATS-02·D-SCRIM-01/02·D-LFG-01·D-CLAN-02/07·D-EVENTS-03의 알림 슬롯이 전부 `notifications` 테이블로 수렴. Phase 2+ 구현 순서: 테이블·RLS → 11개 소스 트리거 순차 설치 → 네비 벨 컴포넌트 → notification_log→feed 트리거 → GC cron.
- [x] **분할 커밋**: `docs(plan): decide D-NOTIF-01 — unified in-app notifications center (preset α, trigger-driven M1)` → `docs(plan): add notifications table + trigger routing to schema` → `docs(plan): wire 07-MainClan bell/drawer + cross-ref 10-Clan-Stats` → `feat(mockup): D-NOTIF-01 navbar bell + notifications drawer placeholder` → `docs(todo): log D-NOTIF-01 close session`.

### 2026-04-21 — D-STATS-03 종결 ("앱 이용 횟수" = 활동일/person-day)

- [x] **결정 컨펌 절차 준수** (`.cursor/rules/decision-confirm.mdc`): 4개 옵션(A 활동일 / B 의미 있는 액션 / C 페이지뷰 / D 세션) + 권장안 A + 미세 후속질문 3건(트리거·컨텍스트·열람 권한)을 사용자에게 동시 제시 → 컨펌 후 진행.
- [x] **D-STATS-03 — "앱 이용 횟수" = 활동일(person-day)** (DECIDED 2026-04-21, 사용자 컨펌)
  - 컨펌 결과: 단위 = **A 활동일(DAU 합산)** / 트리거 = **첫 페이지뷰**(가벼움 우선) / 컨텍스트 = **자기 클랜 페이지 진입 시에만** / 열람 = **멤버 전체**.
  - 정의: 멤버가 자기 클랜 라우트(`/clan/[clan_id]/...`)에 첫 페이지뷰를 기록한 날 = 1. DAY UNIQUE로 새벽 새로고침·매크로·prefetch 자동 차단. 클랜 `timezone`(없으면 `Asia/Seoul`) 자정 경계.
  - 근거: ① 영역 1(누적 활동일=도달) ↔ 영역 2(distinct 멤버=참여) ↔ 영역 3(내전 경기=결과) 3축 보완 ② D-ECON-03 부합(외부 가공 어려운 내부 척도) ③ 페이지뷰·세션 옵션의 노이즈/임의성 회피 ④ 의미 있는 액션 옵션의 가중치 정의 부담 회피.
  - 노이즈 가드: HTTP `Sec-Fetch-Dest=prefetch` / `Purpose=prefetch` 헤더 + 봇 User-Agent + 비인증 요청은 RPC 호출 자체를 스킵.
- [x] `docs/01-plan/decisions.md`
  - 헤더 표 D-STATS-03 OPEN → DECIDED + 요약 갱신.
  - 본문에 D-STATS-03 결정 블록 신설 — 핵심 정의 표, 옵션 비교 사유, 트리거 선택 근거, 스토리지·RLS·집계 MV(`clan_monthly_activity`·`clan_yearly_activity`), 카운트 컨텍스트 라우트 정의, Phase 2+ 백로그.
- [x] `docs/01-plan/schema.md`
  - `clan_daily_member_activity (clan_id, user_id, activity_date)` PK 신설 — INSERT-only, 멱등 RPC `record_clan_activity()`, RLS(SELECT=같은 클랜 멤버, INSERT=RPC 경유만, UPDATE/DELETE 차단), `(clan_id, activity_date DESC)` 인덱스. MV 2개(월간/연간) 명세.
  - 영역 1·2 동시 산출 = 같은 MV 한 줄(`person_days` + `active_members`) → 일관성 강화. 연간 distinct는 합산 불가라 별도 MV 필수임을 명시.
- [x] `docs/01-plan/pages/10-Clan-Stats.md`
  - §탭 4 §영역 1을 D-STATS-03 정의로 재작성 — 활동일 의미·라우트 정의·노이즈 가드·외부 노출 차단.
  - §탭 4 §결정 현황 + §앱 이용 출처 + 페이지 하단 §결정 현황 + §연관 문서 모두 D-STATS-03 DECIDED로 갱신, schema 신설 테이블 링크 추가.
- [x] `mockup/pages/main-clan.html`
  - "클랜 단위 · 연도별·월별 앱 이용 횟수" 카드(`#view-stats > rankmap`) 카피 갱신 — `D-STATS-03` 배지 + "활동일(person-day)" 정의 + 라우트 컨텍스트 + 외부 노출 차단 안내. 정적 표 자체는 그대로(Phase 2+에 실제 집계 연결).
- [x] **결과**: STATS 4건 모두 DECIDED. 남은 "앱 이용" 관련 OPEN 없음. 다음 후보 = D-NOTIF-01(운영 알림 센터), D-PRIV-01(개인 단위 프라이버시 오버라이드).
- [x] **참고**: D-ECON-03 외부 노출 표의 "내전 경기 수" 행 메모("D-STATS-03 측정 단위 결정 후 재검토")는 영역 1이 아닌 영역 3 노출 정책 영역이라 본 결정과 직접 관련 없음 — 컨펌 외 영역 손대지 않음.
- [x] **분할 커밋**: `docs(plan): close D-STATS-03 — app usage = person-day (DAU)` → `feat(mockup): D-STATS-03 person-day copy on app-usage card` → `docs(todo): log D-STATS-03 close session`.

---

### 2026-04-21 — STATS·PERM 묶음 (D-PERM-01 매트릭스 신설 + D-STATS-01/02/04 흡수)

- [x] **메타 결정 — 결정 컨펌 룰 도입**: 사용자 요청 "결정이 필요한 사항은 항상 나에게 컨펌 받도록 기억해줘" → `.cursor/rules/decision-confirm.mdc`(`alwaysApply: true`) 신설. "옵션 2~4개 제시 → 권장안 명시 → 컨펌 대기 → 반영" 절차 + 예외(타이포·사용자 명시 일임 등) 정리.
- [x] **D-PERM-01 — 클랜 권한 매트릭스 모델 도입** (DECIDED 2026-04-21, 사용자 컨펌)
  - 사용자 제안: "디스코드처럼 굵직한 권한을 클랜장/운영진/구성원 기준으로 클랜이 직접 정하도록" → 결정마다 토글 1개씩 추가하던 패턴을 권한 매트릭스로 일반화.
  - 6 카테고리 × 21 권한 키: ① 재무·계정(2, 둘 다 잠김) ② 멤버 관리(4, 2 잠김) ③ 평판·통계(5) ④ 경기 운영(2, 1 잠김) ⑤ 홍보·자원(2) ⑥ **개인 정보(6, 사용자 추가 요청)**.
  - 잠긴 권한 5개 (leader 고정, 토글 불가): `manage_subscription` · `delegate_leader` · `kick_officer` · `bulk_kick_dormant` · `confirm_scrim`(D-SCRIM-02 트리거가 양측 운영진 가정).
  - 사용자 추가 요청 반영: ⓐ "개인 정보" 카테고리 신설 + 부계정/월간/연간/시너지/맵별/M점수 공개 6개 키. ⓑ `correct_match_records`·`export_csv`는 member 옵션 → **officer 옵션**으로 변경. ⓒ 평판·통계에 `view_match_records` 추가. ⓓ `view_alt_accounts` 기본값을 운영진+에서 **`["leader","officer","member"]`로 확장** (D-MANAGE-03 default 변경).
  - 저장: `clan_settings.permissions jsonb DEFAULT '{}'` 단일 컬럼. 부재 키 = 코드 상수 default 적용 → 카탈로그 추가 시 마이그레이션 불필요. 잠긴 키는 SQL `has_clan_permission()` + 코드 상수 이중 가드.
  - **흡수 매핑**: D-MANAGE-01 → `manage_subscription`, D-MANAGE-02 → 6키, D-MANAGE-03 → `view_alt_accounts`(default 확장), D-EVENTS-01 → `manage_clan_events`, D-SCRIM-02 → `confirm_scrim`, D-STATS-01 → `set_hof_rules`, D-STATS-02 → `correct_match_records`+`view_match_records`, D-STATS-04 → `export_csv`.
  - 기존 결정 본문은 비파괴 — 헤더 표 메모에만 "→ D-PERM-01 흡수" 1줄.
- [x] **D-STATS-01 — HoF 설정 권한** (D-PERM-01 흡수): 권한 키 `set_hof_rules`. 기본 leader만, 클랜이 토글로 officer 허용 가능. 외부 공개 토글(`expose_hof`)은 leader 전용 별도.
- [x] **D-STATS-02 — 경기 사후 정정 요청 모달 + 이력 보존** (DECIDED 2026-04-21)
  - 권한 분리: `view_match_records`(열람·요청) vs `correct_match_records`(직접 정정). 요청자는 모달로 결과/맵/로스터/사유 제출, **운영진이 수동 검토·적용** — 자동 적용 X.
  - `match_record_correction_requests` 테이블 신설: 5상태(`pending`/`accepted`/`rejected`/`expired`), 부분 UNIQUE `(match_id) WHERE status='pending'` — 같은 경기 active 1건 가드, 7일 미처리 자동 expire(Phase 2+ cron).
  - `match_record_history` 테이블 신설 (INSERT-only): 모든 정정의 before/after 영구 보존, `source ∈ {direct, request}`. HoF·통계 재집계 시 reverse-replay로 시점 통계 재현 가능.
  - 알림 슬롯 4종(D-EVENTS-03 채널 정책 재사용): `match_correction_{requested, accepted, rejected, expired}`.
- [x] **D-STATS-04 — CSV 내보내기** (D-PERM-01 흡수): 권한 키 `export_csv`(기본 leader, officer 토글). 실제 CSV 생성·기간 필터 UI는 Phase 2+ 보류 — Phase 1은 권한 카탈로그 등록만.
- [x] `docs/01-plan/decisions.md`
  - 헤더 표 갱신: 신설 `## 권한 (PERM)` 섹션 + D-PERM-01 행. D-MANAGE-01/02/03·D-EVENTS-01·D-SCRIM-02·D-STATS-01/02/04 메모에 "→ D-PERM-01 흡수" 추가.
  - 본문에 D-PERM-01 결정 블록 신설(권한 키 카탈로그 표·잠금 사유 표·jsonb 형태·RLS 가드 함수·Phase 1 목업 매핑·흡수 매핑·Phase 2+ 백로그). D-STATS-01/02/04 결정 블록 추가.
- [x] `docs/01-plan/schema.md`
  - `clan_settings`에 `permissions jsonb NOT NULL DEFAULT '{}'::jsonb` 추가. 기존 `allow_officer_edit_mscore`·`alt_accounts_visibility`는 DEPRECATED 표기(Phase 2+에 jsonb로 마이그레이션 후 컬럼 DROP 예정, 호환 유지). `view_alt_accounts` default를 멤버까지 확장한 마이그레이션 매핑 명시.
  - `match_record_correction_requests`·`match_record_history` 테이블 신설(컬럼·제약·RLS·인덱스·알림 슬롯).
- [x] `docs/01-plan/pages/10-Clan-Stats.md`
  - HoF "설정" 모달에 D-STATS-01/D-PERM-01 권한 키(`set_hof_rules`) 명시.
  - 탭 3 "경기 기록"을 `view_match_records`/`correct_match_records` 권한으로 재기술 + 정정 요청 모달 흐름(요청자/운영진) 신설 + 직접 정정 흐름 + `match_record_history` INSERT 트리거 설명.
  - 탭 4 CSV 각주에 `export_csv` 권한 키 + Phase 2+ UI 보류 안내.
  - 권한 표를 D-PERM-01 권한 키 컬럼 추가 형태로 재작성. "결정 필요" → "결정 현황"으로 갱신.
- [x] `mockup/scripts/clan-mock.js`
  - **CLAN_PERMISSION_CATALOG** 상수(6 카테고리 × 21 키, default·locked·toggleHint·source 메타) + `CLAN_PERMISSION_BY_KEY` 평탄화 lookup + `mockClanHasPermission(role, permKey)` 시뮬레이션 함수 신설. 잠긴 키는 default 강제, 일반 키는 기존 `MOCK_CLAN_SETTINGS_KEY` 토글 우선 참조(edit_mscore·view_alt_accounts).
  - **정정 요청 sessionStorage 헬퍼**: `mockMatchCorrectionList/HasActive/Submit/Resolve` + 모달 핸들러 `mockMatchCorrectionOpenModal/CloseModal/SubmitFromModal`. 같은 경기 active 1건 가드 + 사유 필수·500자 제한.
  - 기존 D-MANAGE-02/03 토글 시스템은 호환 유지 + DEPRECATED 주석으로 D-PERM-01 흡수 사실 명시.
- [x] `mockup/pages/main-clan.html`
  - 개요 탭 "운영 권한 설정" 카드(`#mock-manage-clan-settings-card`)에 D-PERM-01 안내 카피(파란선 박스, "전체 권한 매트릭스 일반화 + Phase 2+ 매트릭스 UI 확장 예정") 추가.
  - HoF 설정 모달 다음에 `#mock-match-correction-request-modal` 신설 — 결과/맵 셀렉트 + 로스터 자유 텍스트 + 사유 필수(500자 카운터) + 가드 안내 박스.
- [x] **추가 결정 후보 식별** (사용자 컨펌 필요, 다음 묶음): **D-NOTIF-01** 운영 알림 센터(가입 신청·정정 요청·스크림 변동·LFG 신청 통합 in-app 드로워), **D-PRIV-01** 개인 단위 프라이버시 오버라이드(클랜 단위 개인 정보 정책 위에 본인이 더 닫는 옵션).
- [x] **결과**: PERM 1건 + STATS 3건(01/02/04) DECIDED. 남은 OPEN = D-STATS-03("앱 이용" 측정 단위), D-NOTIF-01(신규), D-PRIV-01(신규).
- [x] **분할 커밋**: `docs(plan): introduce D-PERM-01 permission matrix + close D-STATS-01·02·04` → `feat(mockup): D-PERM-01 catalog const + match correction request modal` → `docs(todo): log STATS·PERM bundle session`.

---

### 2026-04-21 — MAINGAME 4건 종결 (D-SCRIM-01·02 + D-LFG-01 + D-RANK-01)

- [x] **현황 파악**: `08-MainGame.md`, `decisions.md` MAINGAME 표(4건 OPEN), `schema.md` §scrim_rooms, `mockup/pages/main-game.html` LFG/promo/scrim 영역(`submitLfgApply`, `setPromoSort`, `scrimChatSessionExpiresAt`, `scrimJoinState`, `submitScrimApply`).
- [x] **정책 확정** — `docs/01-plan/decisions.md` 4개 신규 섹션 추가, 표 4행 모두 DECIDED 갱신.
  - **D-SCRIM-01 — 스크림 채팅방 자동 종료**: 상태별 종료 시점 매트릭스 — `draft`=별도 종료 없음(모집 만료), `matched`/`confirmed`=`scheduled_at + 6h`, `cancelled`=`cancelled_at + 1h`, `finished`=`finished_at + 24h`. 종료 = `scrim_messages` INSERT 차단(RLS) + 클라이언트 읽기 전용. 운영진 수동 종료(`closed_by`) 가능, 24h 내 양측 합의 시 reopen(Phase 2+). 알림: `closed_at - 1h` in-app 1회 + 종료 시 in-app 1회. 클라이언트 가드 + 서버 cron(5분) 2중 방어.
  - **D-SCRIM-02 — 양측 확정 2-phase commit**: `scrim_room_confirmations(scrim_room_id, side)` UNIQUE — 양쪽 행 존재 시 트리거 `scrim_rooms_promote_to_confirmed()`가 `status='confirmed'` UPDATE. 일정 변경(`scheduled_at`/`mode`/`tier_*`/`place`) 시 트리거 `scrim_rooms_invalidate_confirmations()`가 confirmation 전부 DELETE + `status='matched'` + `confirmed_at=NULL`. 한쪽 확정 후 `scheduled_at - 1h` 타임아웃 시 cron이 `cancelled` 자동 전이. 알림 슬롯 5종(one_side_confirmed/both_confirmed/invalidated/timeout/cancelled). 동시 확정·취소는 PG 행 잠금으로 직렬화.
  - **D-LFG-01 — 신청 상태 UI**: `lfg_applications.status enum('applied','accepted','rejected','canceled','expired')`. 부분 UNIQUE `(post_id, applicant_user_id) WHERE status='applied'` — 동일 사용자 동시 active 신청 차단(거절·취소·만료 후 재신청은 새 행). 신청자: 카드 "신청됨/수락됨/거절됨" 배지 + 드로어 상태 카피 + 헤더 "내 신청 N건" pill. 모집자: 카드 "신청자 N명" 카운트 + 드로어 신청자 목록(닉/티어/포지션/마이크 + 수락/거절). `accepted` 카운트 ≥ `lfg_posts.slots` 도달 시 트리거 `lfg_posts_auto_fill()`이 `status='filled'` + 잔여 `applied`를 `expired`로. 알림 in-app 전용(Phase 1 범위).
  - **D-RANK-01 — "인기" 정렬 폐기**: `setPromoSort` 옵션 `newest`/`space` 2종만. 사유: ① `views` 필드 부재 → 도입 시 외부 경쟁 유인 (D-ECON-03 모순), ② 가입 신청 자체가 인기 측정, ③ 현행 코드 `b.views - a.views` NaN 버그. Phase 2+ 후보: **활성도** (`clans.activity_pct_30d` desc — D-CLAN-07 의존), **여유 있음** (`(max-now)` desc).
- [x] `docs/01-plan/schema.md`
  - `scrim_rooms` 확장 — `closed_by uuid FK→users NULL`·`closed_reason enum('auto_timeout','manual','cancelled','finished') NULL` 추가. CHECK `(closed_at IS NULL) = (closed_reason IS NULL)`. 인덱스 2개 추가(cron 후보 가속). 트리거 `scrim_rooms_invalidate_confirmations` 명시. 상태 전이도 "matched ← confirmed (일정 변경 자동 무효화)" 화살표 추가.
  - `scrim_room_confirmations` 신설 — `(scrim_room_id, side enum('host','guest'))` UNIQUE + `confirmed_by`/`confirmed_at`. 트리거 `scrim_rooms_promote_to_confirmed`(AFTER INSERT) + DELETE 정책(invalidate/cancelled 트리거 전용, 운영자 수동 차단) + RLS(본인 클랜 운영진+만 INSERT).
  - `lfg_posts` 신설 — `game_id`/`creator_user_id`/`mode`/`format`/`slots`/`tiers[]`/`positions[]`/`mic_required`/`start_time_hour`/`expires_at`/`description`/`status enum('open','filled','expired','canceled')`. 트리거 `lfg_posts_auto_fill()`로 자동 마감 처리. 인덱스 2개(활성 모집·내 모집).
  - `lfg_applications` 신설 — `post_id`/`applicant_user_id`/`status`/`tier`/`role`/`mic_available`/`message(≤200)`/`created_at`/`resolved_at`/`resolved_by`. 부분 UNIQUE 인덱스 `lfg_app_one_active_per_user`. 인덱스 2개(모집자 목록·본인 신청 목록). RLS 분기(신청자 본인·모집자만 SELECT).
- [x] `docs/01-plan/pages/08-MainGame.md`
  - **정렬** 섹션을 D-RANK-01 DECIDED로 재작성 — 옵션 2종 + Phase 2+ 후보 2종 + decisions.md 링크.
  - **LFG 신청 상태 UI** 섹션 신설 — 5상태 × 신청자 카드/드로어/모집자 카드 매트릭스 + 부분 UNIQUE 근거 + decisions.md/schema.md 링크.
  - **채팅방 자동 종료 매트릭스** (D-SCRIM-01) 섹션 신설 — 5상태별 종료 시점·카피 + 운영자 수동 종료/재개 + 알림.
  - **양측 확정 2-phase commit** (D-SCRIM-02) 섹션 신설 — 트리거 흐름 + 일정 변경 자동 무효화 + 타임아웃 + 동시성 보장(행 잠금).
  - "결정 필요" → "결정 현황"으로 변경, 4건 모두 DECIDED 표기.
  - "목업과 실제 구현의 차이" 섹션도 4건 DECIDED 결정에 맞춰 재작성.
- [x] `mockup/pages/main-game.html`
  - **D-RANK-01**: `setPromoSort`에서 `'popular'` 분기 한 줄 삭제(`if (promoSort === 'popular') ...`).
  - **D-LFG-01**: sessionStorage `clansync-mock-lfg-apps-v1` (`postId → {status, at}`) 시뮬레이션 도입. 헬퍼 `lfgAppsRead/Write/Get/Set/Delete/Count`, `LFG_STATUS_BADGE`(applied 파랑/accepted 초록/rejected 회색) 신설. `lfgCard()`에 본인 상태 배지 자동 노출. `openLfgDrawer` 푸터를 상태별 4분기로 재작성: applied → 상태 카피 + "신청 취소", accepted/rejected → 결과 카피, none → 기존 "참여 신청하기 →". `openLfgApplyModal(name, postId)` 시그니처 확장 + 중복 신청 차단 가드. `submitLfgApply` → `lfgAppSet(postId, 'applied')` + 카드 재렌더. `cancelLfgApply(postId)` 신설(confirm 후 sessionStorage 제거).
  - **D-SCRIM-01**: 채팅 모달 부제 카피에 종료 매트릭스 한 줄("경기 시작 +6시간 / 취소 +1시간 / 종료 +24시간") 추가.
  - **D-SCRIM-02**: `scrimInvalidateConfirmations(s)` 헬퍼 신설 — 해당 스크림에 매달린 모든 `scrimJoinState` 키 리셋 + `status='모집 완료'`였으면 `'모집 중'` 복귀 + `vsOpponent=null` + 채팅 UI 재렌더. `submitScrimApply` 편집 분기에서 `prevSig`/`nextSig` 비교(dayOffset/hour/minute/mode/tierMin/tierMax) → 변경 시 invalidate + 안내 alert("일정·모드·티어 중 하나가 변경되어 양측 확정이 자동 무효화되었습니다 ...").
- [x] **결과**: MAINGAME 4건 모두 DECIDED. 남은 OPEN = STATS 4건(D-STATS-01~04).
- [x] **분할 커밋**: `docs(plan): close D-SCRIM-01·02 + D-LFG-01 + D-RANK-01` → `feat(mockup): MAINGAME 4건 목업 동기화 (D-LFG/RANK/SCRIM)` → `docs(todo): log MAINGAME 4건 종결 세션`.

---

### 2026-04-21 — D-EVENTS-01 Supplemental (모달 유형 제한 + 스크림 전용 RSVP 단일 토글 + 운영진+ 전용 참가 명단·버튼)

- [x] **문제 인식** (사용자 피드백): ① 일정 등록 모달 `유형` select에 "스크림"이 남아 있어 D-EVENTS-01(스크림=자동 등록·읽기 전용)과 모순. ② 드로워 RSVP 3버튼(`going/maybe/not_going`)이 내전·이벤트에도 표시돼 "참석 응답"이 맥락 없이 보임. ③ 참석자 명단·편집·삭제·"스크림 상세 열기" 버튼이 일반 구성원에게도 노출되어 권한 경계가 불명확.
- [x] **정책 확정** — `docs/01-plan/decisions.md` §D-EVENTS-01 Supplemental 신설
  - 수동 등록 유형: **내전 · 이벤트 2종만** (스크림 제외).
  - RSVP 범위: **`kind='scrim'` 전용**, 값 `enum('none','going')` 2상태, **단일 "참가" 토글 + `confirm()` 팝업**. `maybe`·`not_going`은 후방호환 enum으로만 남기고 UI에서 미사용.
  - 권한 매트릭스: 참가 명단(인게임 닉네임)·"스크림 상세 열기"·편집·삭제 → **운영진+ 전용** (`.mock-officer-only`). "스크림 자동 등록" 배지·읽기 전용 안내 문구·참가 토글 버튼 자체는 전원 노출.
  - 요약 표 D-EVENTS-01 행 상태를 `DECIDED (2026-04-20) · Supplemented (2026-04-21)`로 갱신.
- [x] `mockup/pages/main-clan.html`
  - 모달 `#mev-type`에서 `<option>스크림</option>` 제거, D-EVENTS-01 근거 주석 추가.
  - 드로워 `#mock-event-drawer-source` 내부 "스크림 상세 열기" 버튼에 `.mock-officer-only` 적용. 배지는 전원 노출 유지.
  - 기존 RSVP 3버튼 그룹 → `<section id="mock-event-drawer-rsvp" hidden>` 교체. 내부 단일 `#mock-event-drawer-rsvp-btn`(+ 상태 배지 `#mock-event-drawer-rsvp-state`) + 힌트 카피 + **참석자 명단 `#mock-event-drawer-attendees`** 섹션(`.mock-officer-only`): 헤더(라벨 + 인원수 배지) + 리스트 + 빈 상태 문구.
  - 편집·삭제 영역 `#mock-event-drawer-manual-actions`에 `.mock-officer-only` 추가. 읽기 전용 안내 카피를 "수정은 스크림 상세에서만 가능합니다"로 명확화.
  - 신규 CSS — `.mock-event-drawer-rsvp-head` flex 헤더, `#mock-event-drawer-rsvp-btn[data-state="going"]` 녹색 처리(✓ 프리픽스), `.mock-event-drawer-attendees` 섹션(상단 dashed 구분선, max-height 220 스크롤 리스트), `.att-nick / .att-game / .att-me` 스타일.
- [x] `mockup/scripts/clan-mock.js`
  - `MOCK_EVENTS` 스크림 엔트리에 `attendees: [{nickname, game}…]` 5명 더미 추가, `rsvp` 기본값 `'none'`으로 정리. 내전·이벤트 rsvp도 `'none'` 고정(주석으로 근거 명시). `MOCK_CURRENT_NICKNAME` 상수로 현재 사용자 닉네임 목업.
  - `mockEventDrawerOpen`에서 `ev.kind==='scrim'` 분기 추가 — 스크림이면 RSVP 섹션 `hidden` 해제 + `__mockEventDrawerRenderRsvp(ev)` + `__mockEventDrawerRenderAttendees(ev)`, 아니면 섹션 전체 `hidden`.
  - `__mockEventDrawerRenderRsvp`: `rsvp==='going'`이면 버튼 라벨 "참가 취소" + `data-state="going"`(녹색) + 배지 "참가 중"(success), 아니면 "참가" + "미참가"(muted).
  - `__mockEventDrawerRenderAttendees`: 운영진+ 전용 섹션이지만 데이터는 항상 준비(CSS로만 숨김). `rsvp==='going'`이면 현재 사용자 닉네임을 목록 상단에 `me:true`로 삽입(이미 있으면 태깅만). 인원수 카운트 배지 실시간 갱신.
  - `mockEventDrawerRsvp(value)` 3버튼 API 제거 → 신규 `mockEventDrawerRsvpToggle()`로 교체. 토글 시 `confirm()` — 참가 시 "참가 명단에 인게임 닉네임이 노출됩니다" 경고 포함, 취소 시 확인 질의. `ev.rsvp` 토글 후 RSVP/참석자/슬롯 리스트 즉시 재렌더. 구 API `mockEventDrawerRsvp(value)` 시그니처는 새 토글로 포워딩(임시 호환).
  - `__mockEventsRenderDaySlots`의 RSVP 배지 — `kind==='scrim' && rsvp==='going'`에서만 "참가 중"(success) 표시. 그 외 배지 없음.
- [x] `docs/01-plan/pages/11-Clan-Events.md`
  - 상단 D-EVENTS-01 각주 요지를 Supplemental 반영(유형 제한·RSVP 범위·권한 분기)으로 재작성 + 양쪽 링크.
  - "일정 상세 드로어" 섹션 재작성: 헤더 "스크림 상세 열기" 버튼 운영진+ 조건부, 참가 섹션 상세 설명(확인 메시지·참가 명단 운영진+ 전용), 푸터 편집·삭제 운영진+ 전용 명시.
  - "일정 등록 모달" 표의 `유형` 행 → "내전·이벤트 2종만", `안내` 행 카피 업데이트.
  - 슬롯 카드 설명 — RSVP 배지를 "스크림에서 참가 중일 때만" 노출로 정정.
  - "권한" 섹션을 표 형식으로 확장(5개 UI 요소별 Role 노출 정책).
  - `clan_events.kind` 행에 수동 등록 제한, `event_rsvps` 행에 스크림 전용·`going` 1종 실사용 명시.
- [x] 검증 — `main-clan.html` · `clan-mock.js` · `decisions.md` · `11-Clan-Events.md` 모두 **No linter errors**. 기존 참조 없는 `mockEventDrawerRsvp('going')` 등 과거 핸들러 호출은 마크업에서 제거됨.
- [x] 목업 확인 — 구성원 롤 `mock-role-member`로 전환 시 스크림 드로워에서 편집/삭제/스크림 상세 열기/참가 명단 모두 숨김, 참가 토글만 활성. 운영진(`mock-role-officer`)·클랜장(`mock-role-leader`)에서는 전부 노출. 내전·이벤트 드로워는 RSVP 섹션 자체가 렌더되지 않음.

### 2026-04-21 — 일정 모달 UX 정리 (시각 단일화 + 날짜/시각 분리 + 동적 힌트)

- [x] **문제 인식**: D-EVENTS-02 Revised 직후 모달을 점검하니 **시각 입력이 2곳**(`#mev-when`의 텍스트 `HH:mm` + 반복 fieldset 내부 `#mev-weekly-time`/`#mev-monthly-time`)에 존재해 논리 충돌. 또한 단일 `#mev-when` 텍스트 입력은 `YYYY-MM-DD HH:mm` 자유 입력이라 오타 위험. 반복=none일 때는 요일 영역이 숨지만 시각 필드가 반복 fieldset 안에 들어 있어 "반복 켜면 일시가 의미 불명해지는" 문제도 있었음.
- [x] `mockup/pages/main-clan.html` 모달 재편
  - `#mev-when` 텍스트 1개 → **`#mev-date`(`<input type="date">`) + `#mev-time`(`<input type="time">`)** 2열 그리드(`.mev-datetime-row`). 반응형 520px↓에서는 1열.
  - 상시 힌트 `#mev-time-hint` 신설: "반복 일정에서도 모든 인스턴스는 이 시각에 시작합니다."
  - 반복 select 옵션 카피를 **행동 서술형**으로 교체 — "없음 (일회성 · 위 날짜·시각에 한 번만)" / "매주 · 선택한 요일마다 위 시각에 반복" / "매월 · 시작 날짜의 일자에 위 시각으로 반복".
  - `#mev-weekly-fields`에서 `#mev-weekly-time` **제거**. 요일 체크박스 그룹만 남기고 경고 힌트 `#mev-weekly-mismatch-hint`(hidden, JS 제어) 추가.
  - `#mev-monthly-fields`에서 `#mev-monthly-time` **제거**. 동적 문구 컨테이너 `#mev-monthly-hint`로 대체("매월 **N일 HH:mm**에 반복됩니다").
  - 신규 CSS `.mev-datetime-row` — grid 1.2fr / 1fr, `min-width:0` + `@media (max-width:520px)` 1열 전환.
- [x] `mockup/scripts/clan-mock.js`
  - 헬퍼 신설 — `__mockEventIsoWeekday(yyyyMmDd)`(JS `getDay` → ISO 월=1..일=7 변환), `__mockEventDayOfMonth`, `__mockEventRepeatMode`, `__MEV_WD_NAME`.
  - 동적 힌트 — `__mockEventMonthlyHintRefresh()` "매월 **N일 HH:mm**에 반복됩니다" 갱신, `__mockEventWeeklyMismatchRefresh()` 시작 날짜 요일이 선택 요일에 없으면 경고 문구 채움/숨김.
  - 이벤트 바인딩 — `mockEventRepeatChange`가 fieldset 토글 + 선택 모드별 힌트 재계산, `mockEventDateTimeChange`가 `#mev-time` onchange + 문서 전역 `change` 리스너(`#mev-date`)에서 힌트 재계산, `mockEventWeeklyDaysChange`가 요일 체크박스 onchange에서 경고 재계산.
  - 검증 — `mockEventSaveMock`이 `#mev-date`/`#mev-time` 비어있으면 에러, `weekly`일 때 체크된 요일 ≥1 필수. 구 `#mev-weekly-time`/`#mev-monthly-time` 검증 로직은 삭제.
  - 성공 메시지도 분기 — 반복=none은 "일정이 등록되었습니다", 반복≠none은 "반복 일정이 등록되었습니다. (편집·삭제 전까지 계속 · D-EVENTS-02 Revised)".
  - `mockEventOpenModal` 개선 — 모달 열릴 때 `#mev-date`에 오늘 날짜, `#mev-time`에 기본값 `21:00` 세팅(비어있을 때만), 현재 반복 모드에 맞는 fieldset 토글·힌트 한 번 실행, 제목 input으로 자동 포커스.
- [x] `docs/01-plan/pages/11-Clan-Events.md`
  - 일정 등록 모달 필드 표 — "일시(text)" 행을 **"시작 날짜"** + **"시각(24시간제)"** 2행으로 분할. 반복 카피도 행동 서술형으로 갱신.
  - "반복 상세 필드" 표 — **시각 컬럼 제거**, "안내" 컬럼 추가(weekly 경고 문구·monthly 동적 문구 명시). 시각은 상단 필드 하나만 사용함을 강조.
- [ ] 다음 행선지 유지: **MAINGAME 4건 (D-LFG-01·D-RANK-01·D-SCRIM-01·02)** + **STATS 4건**.

### 2026-04-21 — D-EVENTS-02 Revised · 반복 종료 조건·52회 hard stop 폐지 + 주간 반복 UI 교체

- [x] **정책 변경 요지**: 2026-04-20에 closed한 D-EVENTS-02(종료 3모드 `never`/`count`/`until` + 52회 인스턴스 hard stop)를 **사용자 지시로 전면 폐기**. 새 정책은 "반복 = `none` / `weekly` / `monthly` 3종만, 편집·삭제 전까지 **무기한**". 주간 반복 UX도 "시작일 요일 자동 상속"에서 **월~일 다중 체크박스 + `<input type="time">`**으로 교체. `daily`·`biweekly`는 함께 제거(사용자 응답 q2 = "매주/매월만 유지").
- [x] `mockup/pages/main-clan.html` — 일정 모달 교체
  - 반복 select 옵션을 `없음(일회) / 매주 · 요일·시각 지정 / 매월 · 시작일의 일자 · 시각 지정` 3개로 축소.
  - 기존 `<fieldset id="mev-repeat-end-fields">` (never/count/until 라디오 + 52회 경고) **통째로 제거**.
  - 신설 `<fieldset id="mev-weekly-fields">` — 월~일 체크박스 7개(`name="mev-weekly-day"`, ISO `value="1..7"`) + `<input id="mev-weekly-time" type="time">` + "편집·삭제 전까지 계속 반복" 안내.
  - 신설 `<fieldset id="mev-monthly-fields">` — 시각 `<input>`만. "시작 일시의 일자 기준, 해당 일자 없는 달은 skip" 안내.
  - 반복 섹션 CSS — `.mev-weekly-days` 그리드(7열), 체크된 label은 보라 하이라이트(`:has(input:checked)`).
- [x] `mockup/scripts/clan-mock.js`
  - `window.mockEventRepeatChange` — 새 `weekly/monthly` fieldset 토글 로직으로 교체.
  - 기존 `mockEventRepeatEndChange`/`mockEventRepeatEndValidate`/동적 input 리스너 **제거**.
  - `window.mockEventSaveMock` — 52회 검증 삭제. 대신 weekly일 때 요일 ≥1 + 시각 검증, monthly일 때 시각 검증.
  - `MOCK_EVENTS` 첫 항목 repeat 구조 갱신: `{ mode:'weekly', weekdays:[5], time:'21:00' }` (금요일 21:00). `endKind`·`endCount`·`index` 필드 전부 제거.
  - `__mockEventsFormatRepeat` 재작성 — 포맷 예: "매주 월·수·금 21:00 · 편집·삭제 전까지 계속", "매월 15일 21:00 · 편집·삭제 전까지 계속".
  - 슬롯 meta "반복 · 매주/매월" 표시에 monthly 분기 추가.
- [x] `docs/01-plan/decisions.md`
  - 요약 표 D-EVENTS-02 행 상태 `DECIDED (2026-04-20)` → **`REVISED (2026-04-21)`**, 설명·링크 앵커 모두 Revised로 교체.
  - 본문에 새 섹션 `### D-EVENTS-02 Revised — 일정 반복: 요일·시각 기반 무기한 · 2026-04-21` 추가 — 변경 요약 표, 새 데이터 모델, DROPPED 컬럼 목록, 인스턴스 생성 전략(윈도우 기반 lazy), 편집·삭제 UX 유지 표, UI 규칙.
  - 기존 섹션은 `### D-EVENTS-02 Original … (SUPERSEDED 2026-04-21)`으로 라벨링하고 원문 그대로 **보존** (이력 추적).
- [x] `docs/01-plan/schema.md`
  - `clan_events` 반복 컬럼 재설계: `repeat` enum에서 `daily`·`biweekly` 제거, `repeat_weekdays smallint[]` · `repeat_time time` 신설.
  - `repeat_end_kind` · `repeat_end_count` · `repeat_end_at` + 관련 CHECK 제약 → **DROPPED** 명시 블록으로 기록.
  - 새 CHECK 제약 — 모드별 필수/NULL 조건, `repeat_weekdays <@ ARRAY[1..7]`. `source/scrim_id` CHECK는 유지(D-EVENTS-01).
  - `clan_event_exceptions` 헤더 주석도 Revised로 갱신(52회 상한 언급 제거).
- [x] `docs/01-plan/pages/11-Clan-Events.md`
  - 상단 D-EVENTS-02 한 줄 요약 → Revised로 재작성.
  - 드로어 본문 `<dl>` 반복 예시 — "`매주 · 12회 중 3회차`" → "`매주 월·수·금 21:00 · 편집·삭제 전까지 계속`".
  - 일정 모달 §반복 행·§종료 조건 섹션 → §반복 상세 필드 + §종료 조건 (POLICY REMOVED 2026-04-21)로 재구성.
  - 데이터·연동 `clan_events` 필드 표 `repeat/repeat_end_*` → `repeat/repeat_weekdays/repeat_time`.
  - 결정 필요 섹션 D-EVENTS-02 취소선 뒤에 Revised 링크 부기.
- [x] `docs/TODO.md` 마지막 갱신 → `2026-04-21` + "D-EVENTS-02 Revised" 표기.
- [ ] 다음 행선지: 여전히 **MAINGAME 4건(D-LFG-01·D-RANK-01·D-SCRIM-01·02)** + **STATS 4건** 미결. D-SCRIM-01·02가 드로어 "스크림 상세 열기" 라우팅 대상이라 자연 연결.

### 2026-04-21 — 캘린더 UX 재설계 (날짜 클릭 → 슬롯 패널 → 일정 드로어)

- [x] **정책 요지**: 캘린더 아래의 "이번 달 일정" 카드 그리드가 캘린더 점과 **정보 중복**이고 선택 개념이 없어, (a) 카드 그리드 삭제, (b) 월간 캘린더의 각 날짜 셀을 클릭 가능한 `role="gridcell"`로 바꾸고 `data-date="YYYY-MM-DD"` 부여, (c) 선택된 날짜 아래에 시간순 **슬롯 패널**을 렌더, (d) 슬롯 클릭 시 우측 **드로어**에서 상세 열람·RSVP·(manual일 때만) 편집/삭제를 제공하는 구조로 재설계. D-EVENTS-01 "스크림 자동 등록 = 읽기 전용" 규칙은 드로어 푸터에 분기되어 편집/삭제 버튼을 숨기고 "스크림 상세 열기"만 노출.
- [x] `mockup/pages/main-clan.html`
  - `.mock-events-cal-grid` 전 셀에 `data-date`·`role="gridcell"`·`tabindex="-1"` 부여, 기존 하드코딩 점(3/27·3/30·4/5)은 제거하고 JS가 `MOCK_EVENTS`에서 동적으로 점을 찍도록 위임. `aria-label`로 그리드 사용법 안내.
  - `.mock-events-section-title "이번 달 일정"` + 3장짜리 `.mock-events-grid` **전체 삭제** → `<section class="mock-events-day-panel">`(제목 · 건수 칩 · `aria-live="polite"` 슬롯 리스트)로 교체. 빈 상태 안내 포함.
  - 범례 문구 확장 — "날짜를 클릭하면 아래에 해당 날짜의 일정 슬롯이 표시되고, 슬롯을 클릭하면 우측 드로어에서 상세를 확인할 수 있습니다."
  - **드로어 마크업 신설** `#mock-event-drawer-overlay` + `<aside id="mock-event-drawer" role="dialog">`: 헤더(유형 배지·×·제목·부제·(scrim_auto) 읽기 전용 배지+"스크림 상세 열기"), 본문(`<dl>` 시작·장소·반복·알림 + RSVP 3버튼 `aria-pressed` 토글), 푸터(manual = 편집/삭제, scrim_auto = 안내 문구).
  - CSS 블록 신규 — `.mock-events-cal-cell[role="gridcell"]:hover/focus-visible`, `.mock-events-cal-cell--selected`, `.mock-events-day-panel/title/count/slots/empty`, `.mock-events-slot/time/body/title/meta/right`, `.mock-event-drawer-overlay/-drawer` (우측 슬라이드 인 `transform: translateX(100% → 0)`, z-index 180/181), 드로어 헤더·본문·RSVP·푸터 스타일.
- [x] `mockup/scripts/clan-mock.js`
  - 파일 말미(IIFE 내부)에 **이벤트 캘린더 섹션** 신설. 상수 `MOCK_EVENTS` 3건(정기 내전 반복·스크림 자동 등록·시즌 이벤트).
  - 헬퍼 — `__mockEventsByDate` / `__mockEventsFormatDateKo` / `__mockEventsFormatWhen` / `__mockEventsFormatRepeat` / `__mockEventsFormatNotify`.
  - 렌더 — `__mockEventsRenderDots`(셀 점 동기화), `__mockEventsRenderDaySlots(date)`(슬롯 리스트), `__mockEventsSelectDate(date, cell)`(셀 선택 상태 토글 + `aria-selected`/`tabindex`).
  - 전역 — `window.mockEventDrawerOpen(id)` / `mockEventDrawerClose()` / `mockEventDrawerRsvp(value)` / `mockEventDrawerOpenScrim()` / `mockEventDrawerEdit()` / `mockEventDrawerDelete()`. scrim_auto 분기로 편집/삭제 숨김 + 읽기 전용 안내 표시.
  - 초기화 — `__mockEventsInitCalendar`가 모든 셀에 click/keydown(Enter/Space) 바인딩, 최초 일정이 있는 날짜를 기본 선택. `DOMContentLoaded` 또는 즉시 실행. Esc 키로 드로어 닫기.
- [x] `docs/01-plan/pages/11-Clan-Events.md`
  - 사용자 흐름 ASCII — 캘린더 분기에 "날짜 클릭 → 슬롯 패널 → 드로어" 설명 3줄 추가, D-EVENTS-01 읽기 전용 링크 명시.
  - 탭 1 §영역 — "셀 = 상호작용 가능한 gridcell" 항목 명시, 기존 "이번 달 일정" 항목 제거.
  - §선택된 날짜 슬롯 패널 신설 — 레이아웃·정렬·빈 상태·기본 선택 규칙.
  - §일정 상세 드로어 신설 — 크기·z-index·닫기 트리거·헤더·본문 dl·RSVP·푸터 분기(manual vs scrim_auto).
- [x] `docs/TODO.md` 마지막 갱신 → `2026-04-21`.
- [ ] 다음 행선지: 여전히 **MAINGAME 4건(D-LFG-01·D-RANK-01·D-SCRIM-01·02)** + **STATS 4건** 미결. D-SCRIM-01·02는 오늘 목업에 반영된 드로어 "스크림 상세 열기" 라우팅 대상이라 즉시 이어붙이기 적합.

---

### 2026-04-20 — D-EVENTS-01~05 결정 닫기 (이벤트·반복·알림·투표·대진표)
- [x] **정책 확정 (5건)**
  - **D-EVENTS-01 스크림 → 클랜 이벤트 자동 생성·동기화**: `scrim_rooms.status='matched' → 'confirmed'` 전환 시 양쪽 클랜 `clan_events`에 **각각 1행 자동 INSERT** (`source='scrim_auto'`, `kind='scrim'`). 멱등 키 UNIQUE `(clan_id, scrim_id) WHERE scrim_id IS NOT NULL`. `source='scrim_auto'` 행은 **읽기 전용** — 시간·장소·제목 수정은 스크림 본체에서만, 양쪽 이벤트로 동기화. 취소 시 양쪽 `cancelled_at` 세팅(행 삭제 금지), 재확정 시 `cancelled_at=NULL` 복원. 구현 이중화: Server Action (주 경로) + PG 트리거 `clan_events_sync_from_scrim()` (안전망). 일정 카드에 "스크림에서 자동 등록" 배지 + 스크림 상세 링크.
  - **D-EVENTS-02 반복 일정 종료 조건**: 3모드 `repeat_end_kind enum('never','count','until')`. `never` = 서버 12개월 hard stop(52번째 인스턴스 도달 시 자동 `count=52` 전환 + in-app 알림). `count` = 1~52 CHECK 제약. `until` = `repeat_end_at` 날짜. 인스턴스 상한 모드 무관 **52개**. 저장 전략 = **템플릿 1행 + 지연 인스턴스 + `clan_event_exceptions`**(개별 인스턴스 override·취소). 편집 UX: `이 일정만` / `이번과 이후 모두` / `전체`. 과거 인스턴스는 30d 이후 뷰에서 hidden, 영구 삭제 금지.
  - **D-EVENTS-03 알림 채널·발송 정책**: 채널 3종 — Discord(연동 시 기본 ON), **카카오 알림톡(기본 OFF 옵트인·번호 인증 필수)**, in-app(항상 ON). Free는 in-app만, Premium에서 Discord·카카오. 슬롯 **T-24h · T-1h · T-10min · T+0** (일정 성격·옵션으로 스킵). 실패 = **지수 백오프 5회**(1m→5m→30m→2h→6h) 후 DLQ. Discord 429는 `Retry-After` 준수. 카카오 실패 시 in-app 폴백 1회. **Quiet hours 00~07 KST**는 카카오 연기(T-10min 제외). 중복 방지 UNIQUE `(event_id, slot_kind, scheduled_at, channel, recipient_user_id)`. 공급자 측 dedup_key 포함.
  - **D-EVENTS-04 투표 알림×마감일 일관성 검증**: 반복 모드별 **마감 하한** — `매일 ≥ +48h`, `매주 ≥ +14d`, `마감 전까지 매일 ≥ +24h`. 상한 공통 **60d**(초과 경고 모달). 프론트 1차 인라인 + Server Action 최종 게이트. 생성 통과 시 전체 발송 스케줄을 `notification_log`에 `status='scheduled'`로 일괄 예약 INSERT. 마감 도달·수동 조기 종료 시 트리거가 잔여 `scheduled` 행을 `cancelled`로 UPDATE. 투표 수정 시 전체 예약 cancel → 재계산.
  - **D-EVENTS-05 대진표 통계·코인 반영**: 대진표 = **클랜 내 이벤트 전용**(클랜 간 토너먼트는 기획 범위 밖, `host_clan_id = winner_clan_id` 불변식). 통계는 **별도 "대진표" 탭**으로 정기 내전(`match_type='intra'`)과 완전 분리 — 외부 순위표·HoF·MVP 자동 태그(D-ECON-04 13종)에 **미반영**. 참여율·매너 점수는 내전과 동일 가중치 가산. **코인은 D-ECON-01 확정값만**: 개최 -500 / 참가 +200 / 우승 +1,000 (전부 **클랜 풀**). 개인 풀 보상·MVP 자동 산정 **없음**. 팀 단위 보상은 운영진이 스토어 구매·명예 뱃지로 수동 변환.
- [x] `docs/01-plan/decisions.md`
  - 표 5행(D-EVENTS-01~05) OPEN → DECIDED + 요약 풍부화.
  - 하단 상세 블록 5개 신규 — 트리거 매트릭스·상태 전이·검증 매트릭스·채널·플랜 매트릭스·슬롯·재시도·quiet hours·결과 활용·코인 트리거·통계 분리 기준 포함.
- [x] `docs/01-plan/schema.md`
  - **`clan_events` 전면 재작성**: `event_type → kind` 재명명, `place`·`source`·`scrim_id`·`cancelled_at`·`finished_at` 신설. 반복 필드 `repeat`·`repeat_end_kind`·`repeat_end_count`·`repeat_end_at` + CHECK 제약. 멱등 UNIQUE + `scrim_auto` UPDATE 제한 + 트리거 명세.
  - **`scrim_rooms` 확장**: status enum을 `draft|matched|confirmed|cancelled|finished`로 확장. `confirmed_at`·`cancelled_at`·`finished_at`·`scheduled_at`·`mode`·`tier_min/max`·`memo`·`place`·`title`·`created_by` 추가. 상태 전이 다이어그램.
  - **신설 테이블 12개**: `clan_event_exceptions`·`event_rsvps`·`clan_polls`·`poll_options`·`poll_votes`·`bracket_tournaments`·`bracket_teams`·`bracket_team_members`·`bracket_matches`·`bracket_results`·`notification_preferences`·`notification_log`. 각 RLS·제약·멱등 키 명시.
- [x] `docs/01-plan/pages/11-Clan-Events.md`
  - 상단 D-EVENTS-01~05 DECIDED 블록쿼트 5개 추가.
  - 일정 모달에 반복 종료 3모드 표 + 알림 옵션 토글 표 추가.
  - 대진표 섹션: 클랜 내 이벤트 명시, 통계 반영 매트릭스, 코인 표(D-ECON-01 확정값 + 개인 보상·MVP 자동 산정 없음 명시).
  - 투표 검증: 반복×마감 하한 매트릭스 + 60d 상한 경고 + notification_log 예약/취소 흐름.
  - 데이터·연동: 반복 필드·source/scrim_id·cancelled_at/finished_at 명시, 스크림 연동 이중화(Server Action+트리거), 대진표 5테이블 스키마 연동.
  - §결정 필요 5건 전부 삭선 + §decisions 앵커 링크.
- [x] `docs/01-plan/pages/08-MainGame.md`
  - 스크림 탭: 상태 머신 다이어그램 + `confirmed` 전환 시 양쪽 클랜 `clan_events` 자동 INSERT 규칙, 읽기 전용, 2중 방어 구현 명시.
- [x] `docs/01-plan/gating-matrix.md`
  - §6 이벤트: D-EVENTS-01~05 DECIDED 각주 + manual/scrim_auto 편집 권한 분리 + 대진표 개최·결과 입력 Premium+운영진+ + 카카오 옵트인 설정 행 추가.
- [x] `docs/TODO.md` 마지막 갱신에 D-EVENTS-01~05 추가.
- [x] **목업 UI 셸 동기화** (`mockup/pages/main-clan.html` · `mockup/scripts/clan-mock.js`):
  - 캘린더 범례 D-EVENTS-03 채널·슬롯·quiet hours 카피 보강.
  - 일정 등록 모달에 D-EVENTS-02 반복 종료 3모드 라디오(never/count 1~52/until) + 인스턴스 52 초과 경고 + 저장 전 검증 게이트.
  - 투표 모달 D-EVENTS-04 반복×마감 하한 고정 안내 + 실시간 인라인 경고(매일 48h · 매주 14d · 마감 전까지 매일 24h · 상한 60d) + 게시 전 게이트.
  - 일정 모달 하단 카피에 D-EVENTS-01 스크림 자동 등록 = 읽기 전용 명시.
- **남은 OPEN 8건**: LFG/RANK/SCRIM 4 (D-LFG-01 · D-RANK-01 · D-SCRIM-01 · D-SCRIM-02) · STATS 4 (D-STATS-01~04). → 다음 세션 권장: MAINGAME 묶음(SCRIM은 D-EVENTS-01 상태 머신과 연계), 그 다음 STATS.

---

### 2026-04-20 — D-SHELL-01 · D-SHELL-02 결정 닫기 (셸 반응형·쿼리 우회)
- [x] **정책 확정**
  - D-SHELL-01: 중단점 **768px** 고정. 데스크톱 ≥769px = hover 확장 사이드바(기본 64px → 220px, 본문 `margin-left` 64px 고정으로 hover가 본문을 밀지 않음). 모바일 ≤768px = 햄버거 → 좌측 드로어(`min(248px, 76vw)` · `max-width 248px` · 높이 `calc(100vh-60px)` · 오버레이 `rgba(0,0,0,0.55)`). **닫기 트리거 4종**(오버레이 클릭·Esc·내부 `a`/`.sidebar-item`/`button` 클릭·리사이즈 769px+). `#mobileMenuBtn[aria-expanded]`·`[aria-label]` 동기화 + 오픈 시 `body.overflow:hidden` 스크롤락. 알림 점은 sidebar-item 아이콘 우상단 기준으로 데스크톱·모바일 동일 위치, 햄버거 자체 총합 dot 없음(중복 방지). Phase 2+ focus trap·최초 포커스·Esc 후 트리거 복귀 이관.
  - D-SHELL-02: 운영 단일 출처 = **서버 세션 + DB RLS**. **6종 쿼리 정화 대상** — `role`·`plan`·`hubDebug`·`simulate`·`sidebarNotifyDebug`·`balanceSession`. 권한 계열(role/plan/simulate)은 **조건 없이 항상 제거 + 302**. 디버그 계열(hubDebug/sidebarNotifyDebug/balanceSession)은 `NEXT_PUBLIC_DEBUG_QUERY=1` **AND** `session.user.is_admin` 동시 충족에만 해석, 그 외 제거. 미들웨어가 정화된 URL로 redirect한 뒤 권한·플랜을 **서버 헤더**(`x-clansync-role`·`x-clansync-plan`)로 주입하면 서버 컴포넌트가 이 헤더만 신뢰. RLS는 2중 방어(UI 우회해도 API/Action 403). 디버그 쿼리 사용 시 `audit_debug_queries` 테이블(`user_id`·`path`·`query_json`·`ip_hash`·`user_agent`·`created_at`) 감사 기록(Phase 2+ 신설). 클라이언트에서도 6종 키 직접 읽기 금지(ESLint·리뷰 체크리스트). `mockup/` 디렉터리는 Phase 2 빌드에서 `app/`·`public/` 제외, staging 공개 시에도 `noindex`.
- [x] `docs/01-plan/decisions.md`
  - 표 2행(D-SHELL-01 / D-SHELL-02) OPEN → DECIDED + 요약 풍부화.
  - 하단 상세 블록 2개 신규(§D-SHELL-01 중단점 표·데스크톱/모바일 사양·닫기 트리거 4종·접근성·알림 점 배치·Phase 1 매핑 · §D-SHELL-02 쿼리 6종 매트릭스·미들웨어 처리 순서·허용 조건·클라이언트 2중 방어·RLS 2중 방어·`/mockup/*` 처리·`audit_debug_queries` 스키마).
  - §D-SHELL-03 하단 "모바일 드로어 알림 점 배치" 항목을 D-SHELL-01에서 확정된 내용으로 재작성(참조 루프 제거).
- [x] `docs/01-plan/pages/07-MainClan.md`
  - 상단에 D-SHELL-01·D-SHELL-02 DECIDED 블록쿼트 2개 추가.
  - §결정 필요에서 D-SHELL-01·D-SHELL-02 삭선 + decisions.md 링크 연결.
- [x] `docs/01-plan/gating-matrix.md`
  - 부록 B 하단 각주를 "D-SHELL-02 DECIDED — 6종 쿼리 정화·디버그 조건·감사 기록" 본문으로 재작성.
- **남은 OPEN** (셸 영역 Phase 1 범위에서 완료):
  - 셸 영역: 없음(D-SHELL-01/02/03 전부 DECIDED).
  - 전체 남은 OPEN 13건: EVENTS 5 · LFG/RANK/SCRIM 4 · STATS 4.

---

### 2026-04-20 — D-LANDING-01~04 결정 닫기 (랜딩 4건)
- [x] **정책 확정**
  - D-LANDING-01: **잠정 채택**. 현재 헤드라인(`Archive Your History, Stay in Sync` + "추억을 기록하고 클랜을 체계적으로 관리하세요.") 유지. Phase 2+ 구현 완료·사용자 피드백 확보 후 재검토(5-Second / First-Impression Test). Phase 1 동안 랜딩 카피 변경 금지.
  - D-LANDING-02: Phase 1/2 **KR 전용**. EN/JP 버튼은 시각적 active 토글 + 클릭 시 **"준비 중" 토스트(3s)**. HTML `lang="ko"` 고정. `users.language` enum은 스키마 유지(DEFAULT `'ko'`). Phase 3+에 EN → JP 순서로 실제 활성화. Phase 3 도입 체크리스트 4종(카피/로케일/브랜드 용어/문의 폼 라벨) 문서화.
  - D-LANDING-03: 약관 3종(`/terms`·`/privacy`·`/api-tos`)은 **정적 MDX**. **`/contact`만 내부 폼** → `contact_requests` 테이블 INSERT (Server Action + Turnstile/reCAPTCHA v3 + 이메일당 24h 5회/IP당 24h 20회 rate limit + honeypot). 운영자 관리자 콘솔(Phase 2+)에서 열람·답변. 약관 버전 관리(`terms_versions`·`user_terms_agreements`)는 Phase 2+ 메모.
  - D-LANDING-04 (신설): 로그인 사용자의 `/` 진입은 **`/games` 자동 리다이렉트**. 서버 컴포넌트 `cookies()` 확인 후 `redirect()` — 미들웨어·클라이언트 JS 아닌 **SSR 리다이렉트**로 깜빡임 회피. 예외: `?from=logo` 쿼리 또는 `#features`/`#games`/`#pricing` 앵커 포함 진입은 "의도적 재방문"으로 건너뜀. 로고 링크는 shell 헤더에서 로그인 여부에 따라 `/games` vs `/`로 분기(D-SHELL 영역).
- [x] `docs/01-plan/decisions.md`
  - 표 3행(D-LANDING-01/02/03) OPEN → DECIDED + **D-LANDING-04 신규 행 추가** + 요약 풍부화(L-01은 "잠정" 표기).
  - 하단 상세 블록 4개 신규 작성(§D-LANDING-01 잠정 채택·재검토 트리거 · §D-LANDING-02 Phase 단계 매트릭스·Phase 3 체크리스트 · §D-LANDING-03 라우트 매트릭스·`/contact` 폼 스펙·스팸 방지·약관 버전 관리 메모 · §D-LANDING-04 리다이렉트 판정 플로우·SSR 구현 원칙·UX 안전장치·목업 시뮬레이션).
- [x] `docs/01-plan/schema.md`
  - `contact_requests` 테이블 신설(`category` enum·`status` enum·`ip_hash`·`user_agent`·`assigned_to`·`resolved_at`) + CHECK 제약(title ≤ 120·body 1~4000) + 인덱스(status/created_at, email/created_at) + RLS(INSERT 서비스 롤만·SELECT 본인+운영자·UPDATE 운영자만·DELETE 차단 soft delete).
  - `contact_rate_limits` 테이블 메모 추가(Phase 2+, Redis 우선 · fallback 용).
- [x] `docs/01-plan/pages/01-Landing-Page.md`
  - 상단에 D-LANDING-01~04 DECIDED 블록쿼트 4개 추가.
  - "누가 / 언제 본다" · "화면 진입 조건" 재작성(로그인 사용자는 `/games` 자동 리다이렉트, 쿼리/앵커 예외).
  - 버튼·링크 표의 언어 버튼·푸터 링크 행을 결정 내용 반영 카피로 갱신.
  - §데이터·연동 재작성(세션 가드·다국어·푸터 라우팅·스팸 방지).
  - §목업과 실제 구현의 차이에 `?simulate=logged_in` 시뮬레이션 명시.
  - §결정 필요 4개 항목 전부 삭선.
- [x] `mockup/pages/index.html`
  - 언어 버튼(`landing-lang`)에 `data-lang` · `onclick="landingSetLangMock(this)"` · EN/JP에 `title` 툴팁 추가.
  - 푸터 링크 4개에 `data-footer-link`(실제 라우트) · `title` 툴팁(Phase 2+ 구현 메모) 추가.
  - 상단 스크립트에 D-LANDING-04 시뮬레이션 IIFE 추가(`?simulate=logged_in` + `?from=logo`·앵커 예외). `landingSetLangMock` 함수 추가(EN/JP 클릭 시 3초 토스트).
- 남은 OPEN: 없음(랜딩 영역 Phase 1 범위 완료). 연관 OPEN — D-SHELL(로고 라우팅)·Phase 2+ `/contact` 실제 구현·Phase 2+ 약관 버전 관리 테이블.

---

### 2026-04-20 — D-STORE-02 · D-STORE-03 · D-ECON-03 · D-ECON-04 결정 닫기 (STORE/ECON 보조 4건)
- [x] **정책 확정**
  - D-STORE-02: Free 클랜의 Premium 카드 클릭은 **플랜 비교 모달**만 띄운다. 역할별 CTA — leader/officer는 `#subscription` 탭 이동 보조 CTA, member는 정보 표시만(요청·알림 플로우 없음). Premium 가격·혜택 테이블은 모달 내부.
  - D-STORE-03: 환불 **없음 원칙** + 시스템 오류 자동 롤백 + **운영자 재량 정정**만 예외. 자기 계정 정정 금지(`voided_by ≠ user_id` CHECK). `purchases.voided_at`·`voided_by`·`void_reason` 필드로 무효화 표시(행 삭제 금지). 모든 정정은 `coin_transactions` 반대 부호 INSERT + `correction_of` 연결. 월 정정 리포트(Phase 2+). 구매 확인 다이얼로그 고지 의무.
  - D-ECON-03: **외부 공개 순위표에서 경쟁 지표(승률·K/D·MVP) 전면 제외**. 공개 지표는 활동성·규모·매너·이벤트 참여만. 경쟁 지표는 운영진+ 내부 화면(클랜 관리·HoF·내전 히스토리)에만. `clans.moderation_status IN ('warned','hidden','deleted')` 또는 `lifecycle_status='dormant'` 클랜은 순위표 제외. HoF 외부 공개는 `clan_settings.expose_hof` 토글(기본 false).
  - D-ECON-04: 특이사항 태그는 **자동 산정 전용**(수동 태깅 금지). Phase 1 카탈로그 **13종**(`streak_lose_3/4/5`·`streak_win_3/5`·`slump`·`hot_streak`·`map_expert`·`map_rookie`·`mvp_hot`·`no_show`·`no_show_repeat`·`new_clan_week`). 본 클랜 내전만 집계. 경기 종료·밸런스 세션 생성·일일 배치 3 시점에 재계산. `match_tags` 스냅샷 테이블에 현재 유효 태그만 저장(이력 없음).
- [x] `docs/01-plan/decisions.md`
  - 표 4행(D-STORE-02 / D-STORE-03 / D-ECON-03 / D-ECON-04) OPEN → DECIDED + 요약 풍부화.
  - 하단에 상세 블록 4개 신규 작성(§D-STORE-02 역할별 CTA 매트릭스 · §D-STORE-03 예외 정책·운영 원칙·스키마 영향 · §D-ECON-03 지표 노출 매트릭스·정렬 기준 · §D-ECON-04 카탈로그·상호 배타 규칙·노출·갱신·스냅샷 스키마).
- [x] `docs/01-plan/schema.md`
  - `purchases` 3 컬럼 신설(`voided_at`·`voided_by`·`void_reason`) + all-or-nothing CHECK + 자기 정정 차단 CHECK + UPDATE RLS "정상→무효 1회 전이만" 명문화.
  - `match_tags` 테이블 신설 — PK `(user_id, clan_id, code, COALESCE(map_id, …))`, `expires_at` 인덱스, 서비스 롤 전용 RLS. D-ECON-04 스냅샷.
  - 「클랜 순위·통계 지표」 섹션 헤드에 D-ECON-03 DECIDED 블록쿼트 + **노출 정책 매트릭스**(외부 순위표 / 클랜 상세 / 클랜 관리 3열) 추가.
- [x] `docs/01-plan/pages/13-Clan-Store.md`
  - 상단에 D-STORE-02/03 DECIDED 블록쿼트 추가.
  - §Free / Premium 분기 재작성: 역할별 CTA 매트릭스.
  - §환불·되돌리기 정책 신설: 원칙·예외 1/2·UI 고지·월 리포트.
  - 결정 필요 목록에서 D-STORE-02/03 삭선.
- [x] `docs/01-plan/pages/09-BalanceMaker.md`
  - §특이사항 태그 재작성: 카탈로그 13종 표 + 노출 규칙(최대 3개·톤 우선순위) + `match_tags` 스키마 참조 + 갱신 시점 3개(경기 종료·세션 생성·일일 배치).
- [x] `docs/01-plan/pages/10-Clan-Stats.md`
  - 상단에 D-ECON-03 블록쿼트(내부 통계 화면은 경쟁 지표 허용, 외부 공개만 토글 대상).
  - HoF 설정 모달에 **외부 공개 여부** 행 추가(`clan_settings.expose_hof` 기본 false · leader 전용 Phase 2+).
- [x] `mockup/scripts/clan-mock.js`
  - `mockStorePurchaseMock` 앞단에 D-STORE-03 환불 고지 `confirm()` 추가. 미승인 시 구매 취소.
  - `mockStorePremiumInfoMock` 신설 — 역할별(body.mock-role-leader/officer/…) 분기 카피로 `alert()` 출력. D-STORE-02 플랜 비교 요약 포함.
- [x] `mockup/pages/main-clan.html` `#view-store`
  - Premium 카드(클랜 태그 글로우 / 승부예측 코인 보너스) 버튼 2개를 `disabled`에서 `mockStorePremiumInfoMock(this)` 호출로 교체, 라벨 "Premium 안내", `title` 툴팁 추가.
  - 정책 박스 하단에 D-STORE-03 환불 정책 점선 카드 신규 추가.
- **남은 OPEN** (STORE/ECON 영역 최종 정리 — 이 주제 블록은 Phase 1 범위에서 완료):
  - 경제 영역: 없음.
  - 관련: D-RANK-01(클랜 "인기" 정렬 기준)·D-STATS-01~04(HoF 권한·사후 정정·앱 이용 측정·CSV) 등은 별도 세션.

---

### 2026-04-20 — D-STORE-01 · D-ECON-01 · D-ECON-02 결정 닫기 (코인 체계 코어)
- [x] **정책 확정**
  - D-STORE-01: 개인 풀·클랜 풀 분리, **이전 API 부재**. 적립 트리거 매트릭스(내전/출석/이벤트/승부예측 → 개인 · 스크림/대진표/신규가입/Premium → 클랜) + 차감 매트릭스(개인 꾸미기·store 뱃지 → 개인 · 클랜 꾸미기·홍보 고정·대진표 개최 → 클랜). 모든 거래는 `coin_transactions` INSERT-only + `(reference_type, reference_id, sub_key)` 멱등성 키.
  - D-ECON-01: Phase 1 수치 베이스라인. 내전 출전 +10 / 승리 +20 / MVP +30, 출석 +5, 7일 연속 +30, 스크림 완료 +100, 대진표 우승 +1,000, 신규 가입자 +50/명(월 500). **일일 적립 상한** 개인 200 / 클랜 2,000(24h 롤링). 가격 목록 전량 확정(네임카드 400, 뱃지 테두리 600, store 뱃지 500/1,200, 클랜 배너 팩 1,200, 상단 고정 800, 태그 글로우 2,000, 대진표 개최 500 등). 수치는 Phase 2+에 `game_config`로 외부화.
  - D-ECON-02: 세탁 방지 4단 방어 — ① 풀 이전 API 부재 ② `coin_transactions` INSERT-only (RLS로 UPDATE/DELETE 전면 차단) ③ 1회 500 이상 클랜 풀 지출 **2-man rule**(Phase 2+) ④ 클랜장 교체 후 **72h 지출 동결**(에스크로) ⑤ 의심 패턴 자동 flag(Phase 2+) ⑥ `purchases.pool_source`·`approved_by`·`coin_transactions.correction_of`·`created_by` 감사 필드.
- [x] `docs/01-plan/decisions.md`
  - 표 3행(D-STORE-01 / D-ECON-01 / D-ECON-02) OPEN→DECIDED, 요약 풍부화.
  - 하단에 상세 블록 3개 신규 작성(§D-STORE-01·§D-ECON-01·§D-ECON-02). 각 블록에 트리거/가격/불변식/RLS/연관 문서 링크.
  - D-PROFILE-04 말미 cross-ref에 붙어 있던 "(예정)" 표기 제거하고 실링크 교체.
- [x] `docs/01-plan/schema.md`
  - `users.coin_balance`(개인 풀 캐시, `CHECK >= 0`) + 상단 결정 참조 주석 추가.
  - `clans.coin_balance`(클랜 풀 캐시) + `clans.ownership_transferred_at`(72h 에스크로용) 추가.
  - `coin_transactions` 전면 확장: `reference_type` / `reference_id` / `sub_key` / `balance_after` / `correction_of` / `created_by` + UNIQUE 멱등성 키 + `pool_type`별 NOT NULL CHECK + RLS(SELECT 본인·운영진, INSERT 서비스 롤, UPDATE/DELETE `USING(false)`).
  - `store_items` 확장: `pool_source`(`clan_deco⇒clan`, `profile_deco⇒personal` CHECK) · `is_premium_only` · `is_active` · `released_at`.
  - `purchases` 확장: `pool_source` · `price_coins`(스냅샷) · `coin_transaction_id UNIQUE` · `approved_by` + 2-man rule CHECK 메모.
  - `user_attendance` 테이블 신설: `(user_id, date)` PK + `streak` + `streak_reward_claimed`. 출석/연속 보너스의 멱등성 근거.
- [x] `docs/01-plan/pages/13-Clan-Store.md`
  - 상단에 D-STORE-01·D-ECON-01·D-ECON-02 DECIDED 블록쿼트 + 한 줄 요약에 "풀 이전 불가" 명시.
  - 데이터·연동 절 재작성: 잔액 캐시↔원장 관계, 적립 트리거 매트릭스 표(D-ECON-01 금액 포함), 차감 트리거, 세탁 방지 요약.
  - 카드 가격표를 D-ECON-01 확정 값으로 갱신(네임카드 400, 뱃지 테두리 600, 서브 라인 500, store 뱃지 일반 500·레어 1,200, 승부예측 1,500, 클랜 배너 팩 1,200, 상단 고정 800, 태그 글로우 2,000, 대진표 개최 500).
  - "결정 필요" 절에서 D-STORE-01 항목 삭선 + 구성원 클랜 풀 구매 가능 여부 결론 추가("운영진+ 전용").
- [x] `mockup/pages/main-clan.html` `#view-store`: 정책 안내 박스에 **"코인 풀 정책(D-STORE-01 · D-ECON-02)"** 점선 카드 추가(풀 이전 불가·운영진+ 전용·2-man rule·72h 에스크로). 잔액 pill에 `title` 툴팁으로 각 풀의 적립·소비 범위 설명.
- 남은 OPEN: D-STORE-02(Premium 업그레이드 동선) · D-STORE-03(환불·되돌리기) · D-ECON-03(클랜 순위표 민감 지표) · D-ECON-04(특이사항 태그 기준).

### 2026-04-20 — D-PROFILE-03 정정 (sparse → compact, dense-from-front)
- [x] **재결정**: 같은 날 sparse로 확정했던 뱃지 스트립을 **compact(dense-from-front)**으로 정정. 사용자 피드백 "해제되면 아래 뱃지들이 윗 순번부터 자리를 채우고 아래를 비우는 형식". 빈 슬롯은 항상 뒤쪽에 몰리며, 해제 시 뒤 항목이 한 칸씩 앞으로 shift.
- [x] `mockup/scripts/app.js`
  - `mockBadgeEnsureSparseArray` → `mockBadgeEnsureCompactArray`로 이름·의미 변경. 중간 null·중복·초과 길이를 자동으로 앞쪽 연속 + 뒤쪽 null로 정규화.
  - `mockBadgeCaseTogglePick` 재작성: 이미 픽된 id는 좌측 shift + 마지막 슬롯 null, 없으면 첫 null 위치(=현재 채워진 개수)에 append, 5개 꽉 차면 alert 차단.
  - `mockBadgeCaseGetPicks`·`mockBadgeCaseInitDefaultPicks` 내부 호출도 ensureCompactArray로 갱신.
- [x] `docs/01-plan/decisions.md` D-PROFILE-03: 표 요약을 "compact 픽(dense-from-front · 해제 시 뒤 항목 앞으로 shift)"으로 교체. 상세 블록에 정정 사유 블록쿼트 추가, 상태 구조·불변식·Compact 규칙(추가/해제/표시/운영 매핑) 표 재작성. 운영 시 slot_index 재할당 트랜잭션 + 빈 슬롯 DELETE 정책 명시.
- [x] `docs/01-plan/schema.md` `user_badge_picks`: `badge_id NOT NULL`로 조임(빈 슬롯은 행을 만들지 않음), `slot_index 0..n-1 연속` 제약 설명, 해제 시 slot_index 재할당 트랜잭션 예시 추가.
- [x] `docs/01-plan/pages/14-Profile-Customization.md`: 모달 스트립 동기화 절 · 데이터·연동 뱃지 픽 블록 · 동기화 셀렉터 표 · 결정 필요 D-PROFILE-03 삭선 문구를 전부 compact 표현으로 교체.
- 영향 범위: 이미 저장된 localStorage 상태(sparse로 저장되었을 수 있음)는 다음 로드 시 `mockBadgeEnsureCompactArray`가 자동 정규화해 그대로 호환. 운영 데이터베이스는 아직 없으므로 영향 없음.

### 2026-04-20 — D-PROFILE-01~04 결정 닫기 (네임플레이트/뱃지 동기화·가입 신청 대기·해금 출처)
- [x] **정책 확정**
  - D-PROFILE-01: 네임플레이트 동기화 — 상태 키 `clansync-mock-nameplate-state-v1` / 이벤트 `clansync:nameplate:changed` / 셀렉터 `[data-nameplate-preview="{game}"]` + 본인 구독용 `[data-nameplate-self]`. **같은 탭 내부만** 실시간 반영(다른 탭은 새 진입·새로고침 시 localStorage에서 재로드).
  - D-PROFILE-02: 가입 신청 대기 목록 — `clan_join_requests`(D-CLAN-02) 단일 소스. pending 항시 노출, approved/rejected는 7일 후 자동 숨김, canceled/expired는 목록 비노출. **취소는 pending에서만**(resolved_by='self').
  - D-PROFILE-03: 뱃지 스트립 동기화 — **sparse 5슬롯**(null 허용, 해제 시 뒷 항목 shift 없음). 상태 키 `clansync-mock-badge-picks-v1` / 이벤트 `clansync:badge:picks:changed` / 셀렉터 `[data-badge-strip="{game}"]` + `[data-badge-strip-slot="{0..4}"]` + 본인 `[data-badge-strip-self]`.
  - D-PROFILE-04: 뱃지 해금 출처 — `unlock_source enum('achievement','event','store')` + `unlock_condition jsonb` + `linked_id`. **store는 개인 코인만**(클랜 코인 불가). 카테고리 × 출처는 독립 축.
- [x] `docs/01-plan/decisions.md`: D-PROFILE-01~04 표 4행 OPEN→DECIDED 갱신, 하단에 상세 블록 4개 추가(셀렉터·이벤트·스키마 영향·store 제약 등). 각 블록에 스키마·페이지 문서 링크 연결.
- [x] `docs/01-plan/schema.md`
  - 관계도에 `User ──< UserNameplateSelection >── NameplateOption`, `User ──< UserNameplateInventory`, `User ──< UserBadgePick >── Badge`, `User ──< UserBadgeUnlock >── Badge` 4줄 추가.
  - 신규: `nameplate_options`(카탈로그·4카테고리·unlock_source), `user_nameplate_inventory`(PK `(user_id, option_id)`), `user_nameplate_selections`(PK `(user_id, game_id, category)` · 서버 재검증 메모).
  - 신규: `badges`(unlock_source·unlock_condition jsonb·`CHECK (store ⇒ coin_type='personal')`), `user_badge_unlocks`(PK `(user_id, badge_id)`), `user_badge_picks`(PK `(user_id, game_id, slot_index)` · slot 0~4 · null 허용).
- [x] `docs/01-plan/pages/14-Profile-Customization.md`
  - 스트립 동기화 섹션에 sparse + localStorage 키 + 이벤트명 + 셀렉터 표 명시, 네임플레이트 적용 범위도 동일 포맷으로 재작성.
  - 가입 신청 대기 목록을 D-PROFILE-02 확정본으로 재작성(데이터 출처·상태 뱃지·취소 액션·게임당 pending 1건 제약).
  - "데이터·연동" 섹션을 뱃지 픽 / 카탈로그·해금 / 네임플레이트 / 동기화 셀렉터 4블록으로 재편, 셀렉터 표 추가.
  - "목업과 실제 구현의 차이"에 같은 탭 내부만 실시간·다른 탭 미전파·`unlock_source`별 툴팁 카피 차이 명시.
  - "결정 필요" D-PROFILE-01~04 4항목 삭선 + 결정 링크.
  - "구현 참고"에 새 함수(`mockBadgeRestoreFromStorage`·`mockBadgeSaveToStorage`·`mockBadgeDispatchChange`·`mockBadgeApplyToStrips`·네임플레이트 3종·`mockBindExternalProfileSync`)·localStorage 키·이벤트명·셀렉터 총정리 추가.
- [x] `mockup/scripts/app.js`
  - 상수 추가: `MOCK_BADGE_PICKS_STORAGE_KEY`·`MOCK_NAMEPLATE_STATE_STORAGE_KEY`·`MOCK_BADGE_CHANGE_EVENT`·`MOCK_NAMEPLATE_CHANGE_EVENT`·`MOCK_BADGE_META`(외부 스트립 lookup용, 17개 뱃지 메타).
  - 뱃지 픽을 **sparse 배열(고정 길이 5)**로 전환: `mockBadgeEnsureSparseArray`·`mockBadgeCaseGetPicks` localStorage hydration·`mockBadgeCaseInitDefaultPicks` hydrated 가드·`mockBadgeCaseTogglePick` null 할당(뒷 항목 shift 없음).
  - 저장·전파·외부 스트립: `mockBadgeRestoreFromStorage`·`mockBadgeSaveToStorage`·`mockBadgeDispatchChange`·`mockBadgeApplyToStrips`(컨테이너 `[data-badge-strip]` 내부 슬롯 `[data-badge-strip-slot]`에 메타 렌더·빈 슬롯 `mock-badge-strip-slot--empty` 클래스).
  - 네임플레이트: `mockNameplateRestoreFromStorage`·`mockNameplateSaveToStorage`·`mockNameplateDispatchChange`·`mockNameplateGetState` defaults merge hydration. `mockNameplateCaseSelect` 말미에 save + dispatch.
  - DOMContentLoaded: `mockNameplateGetState()`·`mockBadgeCaseGetPicks()`로 hydrate, 양쪽 프리뷰·스트립 초기 적용, `mockBindExternalProfileSync()` 이벤트 구독 바인딩.
  - window export에 새 함수(`mockBadgeApplyToStrips`·`mockBadgeCaseGetPicks`·`mockNameplateGetState`·`mockBindExternalProfileSync`) 추가.
- [x] `mockup/pages/profile.html`
  - OW/VAL 네임플레이트 프리뷰에 `data-nameplate-self` 속성 부여.
  - OW/VAL 뱃지 스트립 컨테이너에 `data-badge-strip="{game}" data-badge-strip-self`, 각 5슬롯에 `data-badge-strip-slot="0..4"` 부여.
  - 가입 신청 대기 목록(OW): Thunder Squad·Running** 2행을 `data-mock-join-request` 식별자 + `.mock-profile-pending-badge` 뱃지 + 취소 버튼 구조로 재작성. VAL 탭은 빈 목록 + "대기 중인 신청이 없습니다." 빈 상태로 재작성.
  - 하단 `<style>` 블록 신설: `.mock-profile-pending-badge`(pending/approved/rejected 색), `.mock-profile-pending-cancel`(hover 붉은 강조), `.mock-badge-strip-slot--empty`.
  - 하단 `<script>` 블록 신설: `mockProfileCancelJoinRequest(id, clanName)`·`mockProfileReadCanceled`·`mockProfileWriteCanceled`·`mockProfileUpdateEmptyState`. sessionStorage `clansync-mock-profile-canceled-v1`에 취소 ID 저장. 재진입 시 저장된 ID의 `<li>` 제거 + 빈 상태 토글.
- [ ] **Phase 2+ 이관**: MainClan·main-game·BalanceMaker 본인 슬롯에 `data-nameplate-self`·`data-badge-strip` 부여 — 현행 데모가 모든 플레이어 프리뷰를 공유하는 구조라 "본인만 분기"가 의미를 갖지 않음. 서버 연동 시 함께 적용.
- 연관 결정: D-CLAN-02(가입 신청 상태 머신), D-STORE-01(스토어 구성 — store 뱃지 구매 진입점), D-ECON-01(코인 체계 — 개인 코인 차감).

### 2026-04-20 — D-AUTH-03~07 결정 닫기 (비번 정책·재설정·Discord scope·잠금·자동로그인)
- [x] **정책 확정**
  - D-AUTH-03: 비번 **strong 강제**(영+숫+특, 8~72자). 출생연도 `currentYear-10` 상한 **유지**(만 10세 미만 차단). 만 14세 미만 보호자 동의 UI는 **Phase 2+ 이관**, Phase 1은 안내 카피만.
  - D-AUTH-04: Supabase 재설정 메일 + 토큰 **1시간** 유효 + 1회용. rate limit 60초·24h 5회. 이메일 존재 여부 비노출 중립 카피. 성공 시 전 세션 revoke.
  - D-AUTH-05: scope **`identify email`** 만. 길드·메시지 권한 요청 안 함. 클랜↔Discord 알림 연동은 별도 Bot OAuth로 분리(D-EVENTS-03).
  - D-AUTH-06: **IP+email 5회 연속 실패 → 15분 잠금**. 잠금 중 시도는 카운트 증가 없음, 카피는 자격 불일치와 통합. 성공 시 리셋. `auth_failed_logins` 신설.
  - D-AUTH-07: refresh token **OFF 24h / ON 30d**(슬라이딩 연장). `users.auto_login`은 사용자 기본 체크박스 값 저장. 비번 변경·로그아웃·정지 시 즉시 전 세션 revoke.
- [x] `docs/01-plan/decisions.md`: D-AUTH-03~07 표 5행 OPEN→DECIDED 갱신, 하단에 상세 블록 5개 추가(비번 정규식·연령 UI Phase 2+·재설정 플로우·scope 표·잠금 쿼리 개념·세션 TTL 표). 각 블록에 영향 문서·스키마 섹션 연결.
- [x] `docs/01-plan/schema.md`
  - `users` 테이블 재정의: `email` citext로 변경, `birth_year int NOT NULL`·`gender enum`·`password_updated_at`·`minor_guardian_consent_at`·`discord_user_id UNIQUE`·`discord_linked_at` 컬럼 추가. 상단에 D-AUTH-03·07 결정 요지 블록쿼트.
  - 신규: `auth_failed_logins` 테이블(이메일·IP·UA·reason enum·인덱스 2종·90일 TTL·RLS 메모·잠금 판정 쿼리 예시).
  - 신규: `password_resets` 테이블(토큰 해시·expires·used_at·IP·UA·UNIQUE·rate limit·서버 경유 RLS).
  - 관계도에 `User ──< AuthFailedLogin`·`User ──< PasswordReset` 두 줄 추가.
- [x] `docs/01-plan/pages/02-Sign-In.md`
  - "사용자 흐름" 부가 동선 3줄에 각 결정 요지 한 줄씩 추가.
  - "버튼·입력·링크" 표의 자동 로그인·비밀번호 찾기·Discord 행을 결정 요지 포함으로 재작성.
  - "상태별 화면" 표의 자격 불일치·반복 실패 잠금 행을 통합 카피·타이밍 공격 방지 메모 포함으로 갱신.
  - "데이터·연동" 섹션을 refresh token TTL·감사 테이블·password_resets·Discord scope 기준으로 재작성.
  - "목업과 실제 구현의 차이"에 alert 시뮬레이션 함수 3종 설명 추가.
  - "결정 필요" D-AUTH-04~07 4항목 삭선 + 결정 링크.
  - "구현 참고"에 `showForgotAlert`·`showDiscordScopeAlert`·`#signin-error-slot`·`#autoLogin` tooltip 추가.
- [x] `docs/01-plan/pages/03-Sign-Up.md`
  - "화면 구성" 블록 다이어그램에 출생연도·비번·만 14세 미만 안내 캡션 D-AUTH-03 주석 추가.
  - "버튼·입력·링크" 표의 출생 연도·비밀번호 행을 strong 정규식·Phase 2+ 동의 UI 메모 포함으로 재작성 + "만 14세 미만 안내" 행 신설.
  - "데이터·연동" 섹션에 `users` 컬럼 4종·`minor_guardian_consent_at` 공란 정책 명시.
  - "목업과 실제 구현의 차이"에 `handleSignUp` 정규식 검증·`#signup-minor-notice` 동적 토글 설명 추가.
  - "결정 필요" D-AUTH-03·01 삭선 + 결정 링크.
  - "구현 참고"에 `validatePasswordStrong`·`updateMinorNotice`·`#signup-minor-notice` 추가.
- [x] `mockup/pages/sign-in.html`
  - 좌측 후기 서명 오타 수정(`Pheonix` → `Phoenix`).
  - `.error-msg` 슬롯(`#signin-error-slot`·`#signin-error-text`)을 마크업에 실제로 붙이고 `.error-msg[hidden]` 규칙 추가.
  - 자동 로그인 토글 래퍼에 D-AUTH-07 tooltip(title) + `showAutoLoginInfo()` 1회 alert 바인딩.
  - "비밀번호 찾기" → `showForgotAlert()`(D-AUTH-04 요지 7줄 alert).
  - Discord 버튼 → `showDiscordScopeAlert()`(scope 4줄 alert).
  - `handleSignIn`에 D-AUTH-06 잠금 시뮬레이션: `SIGNIN_MOCK_FAIL_EMAIL_PREFIX='lock@'`로 시작하는 이메일만 실패 취급, sessionStorage `clansync-mock-signin-fails-v1`에 `(email→{count,lockedUntil})` 저장, 5회 누적 시 15분 잠금. 그 외 이메일은 기존 데모 클릭스루 유지(games.html).
- [x] `mockup/pages/sign-up.html`
  - `.error-msg`·`.info-msg` CSS 블록 신설(error는 sign-in과 동일, info는 주황 톤).
  - 폼 상단에 통합 에러 슬롯(`#signup-error-slot`) 추가, 에러 카피 중앙집중.
  - 출생 연도 select `onchange="updateMinorNotice(this.value)"` 바인딩 + 만 14세 미만 안내 캡션(`#signup-minor-notice`) 신설.
  - 비밀번호 input placeholder "영문+숫자+특수문자 8자 이상" → "영문+숫자+특수문자, 8~72자"로 교체, 하단 `.input-hint`에 D-AUTH-03 안내 문구 추가.
  - `handleSignUp`을 **실제 검증 함수**로 재작성: email·nickname 2자·admin·birthYear·gender·`validatePasswordStrong`·terms 순서로 inline 검증, 실패 시 `signupShowError()`로 상단 슬롯 노출.
  - `SIGNUP_PWD_STRONG_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])[\S]{8,72}$/`·`validatePasswordStrong(v)`·`updateMinorNotice(yearStr)` 신설. 만 14세 미만 판정은 `y > currentYear - 14`.
- 연관 결정: D-AUTH-01(게임 선택 라우팅 — 가입 직후 동작 고정 확정), D-EVENTS-03(Discord Bot OAuth 분리 지점), D-CLAN-03(계정 라이프사이클 — 정지 시 세션 revoke 트리거).

### 2026-04-20 — D-MANAGE-01~04 결정 닫기 (구독권한·M점수 토글·부계정 공개 범위·업로드 제약)
- [x] **정책 확정**
  - D-MANAGE-01: officer도 금액·일시 열람 가능, 영수증 상세·결제 수단·환불·플랜 변경은 leader 전용.
  - D-MANAGE-02: 역할 변경·officer 강퇴·leader 위임·휴면 일괄 강퇴는 leader 전용. **M점수 편집은 `clan_settings.allow_officer_edit_mscore` 토글 기반**(기본 false = leader만, true = officer도 허용). member 강퇴·가입 승인·거절은 officer 허용.
  - D-MANAGE-03: 부계정은 자기신고 유지. **조회 범위는 `clan_settings.alt_accounts_visibility` 토글**(기본 `officers` / 옵션 `clan_members`). 프로필 추가 시 공개 범위 고지·동의 필수. 증빙 API는 Phase 2+ 재검토.
  - D-MANAGE-04: 배너 3MB / 아이콘 2MB. MIME `image/jpeg·png·webp`만. 애니메이션 거부. 서버가 썸네일·변환본 자동 생성. 업로드 권한 officer+.
- [x] `docs/01-plan/decisions.md`: D-MANAGE-01~04 표 4행 OPEN→DECIDED 갱신, 하단에 상세 블록 4개 추가(권한 매트릭스·UI 규칙·토글 설정 UI·감사 로그·업로드 검증 순서 등). 각 블록에 스키마 영향 섹션으로 `clan_settings` / `clan_media` / `user_alt_accounts` 테이블 연결.
- [x] `docs/01-plan/schema.md`
  - 신규: `user_alt_accounts` 테이블(자기신고 부계정, 공개 범위 RLS 연동), `clan_settings` 테이블(클랜별 운영 권한 토글 `allow_officer_edit_mscore` · `alt_accounts_visibility`), `clan_media` 테이블(배너·아이콘 자산 메타·원본 private/변환 public 분리).
  - 수정: `clans` 테이블에 `banner_url`·`icon_url` 컬럼 명시(D-MANAGE-04 최신 변환본 포인터).
- [x] `docs/01-plan/gating-matrix.md` §7 "클랜 관리" 표 전면 재작성(운영 권한 설정 카드 열람/변경 분리, member/officer 강퇴 구분, 휴면 일괄 강퇴 leader 전용, M점수 토글 행, 부계정 조회 토글 행, 구독결제 leader 전용 세부 액션 행). 부록 A의 `.mock-leader-only` 클래스를 "예약" → "실사용"으로 승격, 사용 위치 나열.
- [x] `docs/01-plan/pages/12-Clan-Manage.md`
  - 개요 탭: "운영 권한 설정" 카드 신설 섹션(토글 1·라디오 1, leader 전용 편집, officer 읽기 전용 규칙).
  - 배너·아이콘 카드: D-MANAGE-04 제약 안내 추가. 업로드 모달 behaviour 섹션에 MIME·용량·거부 규칙 명시.
  - 가입 요청·구성원 탭: D-MANAGE-02 권한 매트릭스 확정 표로 교체(`.mock-leader-only` 대상 액션 명시).
  - 구독결제 탭: D-MANAGE-01 권한 매트릭스 + officer 비활성 버튼·툴팁 규칙 추가.
  - "권한·구독에 따른 차이" 표에 신규 액션 10여 개 추가. "결정 필요"에서 D-MANAGE-01~04 삭선 + 결정 링크.
  - 구현 참고에 `window.mockClanSettingsGet/Set`, `window.mockClanImageValidate`, `.mock-leader-only` 클래스, 저장 키 `clansync-mock-clan-settings-v1` 추가.
- [x] `docs/01-plan/pages/14-Profile-Customization.md`: "게임별 탭 — 부계정 (D-MANAGE-03)" 섹션 신설. 자기신고 방식·추가 모달 고지 문구·공개 범위 매트릭스(officers / clan_members)·삭제 정책·신고 경로(D-CLAN-03 흡수) 정리. "결정 필요"에 D-MANAGE-03 삭선 추가.
- [x] `mockup/pages/main-clan.html`
  - CSS: `.mock-leader-only`(officer/member 세션에서 숨김), `.mock-leader-only-disabled`(숨김 아닌 비활성·툴팁 — 구독결제 탭용), `.mock-leader-only-note` 추가.
  - 개요 탭에 "운영 권한 설정" 카드 HTML 신설 — M점수 토글 체크박스 + 부계정 공개 범위 라디오 2개 + leader 전용 안내 캡션.
  - 배너·아이콘 카드: D-MANAGE-04 제약 안내 `<p>` 추가. 업로드 모달에 form error 영역(`#mock-clan-image-modal-error`)·spec hint(`#mock-clan-image-modal-spec`)·MIME 제한 accept 속성 추가.
  - 구독결제 탭 "목업 결제 1건 추가", "Premium", "Free" 버튼에 `.mock-leader-only-disabled` + "클랜장만 변경할 수 있습니다" title 부착. 하단에 D-MANAGE-01 고지 `<p>` 추가.
  - 휴면 섹션 일괄 강퇴 버튼에 `.mock-leader-only` + 옆에 "클랜장만" 안내 캡션.
  - 개인 상세 모달의 부계정 그룹에 공개 범위 라벨(`#mock-mmgr-detail-sub-visibility-label`)과 운영 권한 설정 탐색 안내 추가.
- [x] `mockup/scripts/clan-mock.js`
  - 신규: `MOCK_CLAN_MEDIA_MIME_ALLOWED`, `MOCK_CLAN_MEDIA_LIMITS`(배너 3MB 4:1 · 아이콘 2MB 1:1), `window.mockClanImageValidate(file, kind)` — MIME·용량 실제 검증.
  - `window.mockClanImageModalOpen` / `mockClanImageFileChange`: open 시 kind별 spec hint 동적 업데이트, file change 시 validate → 실패면 error 영역 노출·input 초기화·preview 해제, 성공만 pending dataUrl에 대입.
  - 신규: 클랜 운영 권한 설정 유틸 4개 — `window.mockClanSettingsGet`, `window.mockClanSettingsSet(partial)`, `window.mockClanSettingsSyncUi()`, `window.mockClanSettingsOnToggleMscore`, `window.mockClanSettingsOnAltVisibility`. 저장 키 `clansync-mock-clan-settings-v1`, 기본값 `{allowOfficerEditMscore:false, altAccountsVisibility:'officers'}`. 변경은 leader만, officer/member가 조작 시 값 원복 + alert. "클랜 전체 공개" 선택 시 confirm 모달로 한 단계 더 게이팅.
  - 신규: `window.mockMmgrSyncMscoreGate()` — 개인 상세 모달이 열려 있을 때 역할·운영권한 설정 조합으로 역할 select / M점수 input 3개의 `disabled` + `title` 동적 제어.
  - `applyRoleBodyClass()` / `mockManageSetTab('overview')` / `mockManageMemberDetailOpen(id)` 종료 시 `mockClanSettingsSyncUi()` 자동 호출 — 역할·탭·모달 진입 모든 경로에서 UI 동기화.
  - `mockMmgrOnClanRoleChange` / `mockMmgrOnMScoreChange`에 서버 권한 검증 시뮬레이션 추가 — 조건 미충족 시 alert + `mockMmgrSyncMscoreGate()` 원복.
- [x] `mockup/pages/profile.html` · `mockup/partials/player-profile-modal.html`: 부계정 추가 버튼 4건의 `alert()` 문구에 D-MANAGE-03 공개 범위 고지(자기신고 · 클랜 설정에 따른 공개 범위 · 운영 권한 설정 위치) 추가.
- 연관 결정: D-CLAN-07(휴면 일괄 강퇴 권한 귀속처), D-CLAN-02(가입 요청 권한 재확인), D-PROFILE-02(부계정 섹션이 해당 탭의 자매 섹션).

### 2026-04-20 — "매치 결과 카드" 개념 영구 폐기 + 경기 종료 결과 팝업 스펙 명시
- [x] `decisions.md` §D-SHELL-03 제외·이월 항목 수정: "매치 결과 카드 재검토 여지" → **영구 도입 안 함** 확정. 결과 열람은 결과 입력 완료 시점의 **1회 팝업**(승자·내 적중 여부·배당 코인)으로만 처리하고 그 외 "미확인" 상태를 만들지 않음 명시. 09-BalanceMaker.md 해당 섹션으로 교차 링크.
- [x] `pages/09-BalanceMaker.md`: 사이드바 알림 점 블록의 "매치 결과 카드 미확인 제외(재검토)" 문구 → "매치 결과 기반 알림 구조적 부재"로 강화. **경기 종료 · 결과 팝업** 섹션 신설(대상자 매트릭스 3행: 비출전 예측 참여자 / 출전자 / 관전 구성원, 승부예측 활성·비활성 분기, 세션별 1회·무효 시 원복·사후 정정은 내전 히스토리 위임 규칙). 플로우 번호 7("경기 종료")에 결과 팝업 참조 한 줄 추가.
- [x] `decisions.md`: D-SHELL-03 OPEN→DECIDED 표 행 갱신 + 하단 상세 블록 신설. 원칙("정보성은 진입 시 자동 clear, 행동성은 처리로만 clear"), 대상·트리거·clear 매트릭스(6뷰), 운영↔Phase 1 매핑 표, UI 규격, 제외·이월 항목(매치 결과 카드·dash·모바일 드로어) 명시. `#dash`는 허브 뷰 중복 방지로 알림 점 없음 확정. `#balance` 트리거에서 "매치 결과 미확인" 제거(매치 결과 카드 미설계 이유).
- [x] `pages/07-MainClan.md`: "사이드바 항목" 표의 알림 점 열을 D-SHELL-03 트리거 문구로 확장(6행 전체 갱신), `#manage` 행에 행동성·자동 집계 명시. "알림 점 성격 구분" 블록쿼트(정보성/행동성) 신설. 상태별 화면 표의 "알림 점" 행 운영 트리거 링크로 교체. "결정 필요"에서 D-SHELL-03 삭선 + 결정 링크. 구현 참고에 `#sidebar-notify-manage` 추가.
- [x] `pages/09-BalanceMaker.md`: "사이드바 알림 점" 섹션 신설(진행 중 내전 세션 수, 뷰 진입 시 clear, 구성원·운영진 공통, 매치 결과 카드 미확인 제외 명시).
- [x] `pages/11-Clan-Events.md`: "사이드바 알림 점" 섹션 신설((a) 24h 내 RSVP 미응답 + (b) 진행 중 투표 미응답 합산, 신규 이벤트 등록은 RSVP 미응답으로 자연 흡수).
- [x] `pages/12-Clan-Manage.md`: `#manage` 알림 점을 "행동성"으로 분류 명시 — 뷰 진입 clear 없음, `mockManageRequestsRender`·`mockManageMembersRender` 종료 시 자동 refresh만 일어남.
- [x] `mockup/scripts/clan-mock.js`: `mockSidebarNotifyRefresh` 함수 상단에 D-SHELL-03 6뷰 규칙 주석 블록 추가(`#dash/#balance/#events/#manage/#stats/#store`).

### 2026-04-20 — 가입 요청 배지 시인성 개선 + 사이드바 "클랜 관리" N 알림 점 연동
- [x] `mockup/pages/main-clan.html`: 공용 빨간 카운트 배지 `.mock-notify-pill` CSS 신설(사이드바 `.sidebar-notify-dot`와 동일한 #ef4444·화이트 텍스트·원형, 탭/카드 라벨 inline 정렬용). 가입 요청 탭 배지(`#mock-manage-requests-badge`)와 카드 헤더 카운트(`#mock-manage-requests-count`)의 `badge badge-muted` → `mock-notify-pill`로 교체하고 0건 기본 hidden. 사이드바 "클랜 관리" 메뉴 항목에 `sidebar-item--notify` + `#sidebar-notify-manage` `.sidebar-notify-dot` 추가.
- [x] `mockup/scripts/clan-mock.js`: `mockSidebarNotifyRefresh`에 manage 자동 집계 분기 추가 — `#mock-manage-requests-tbody` `<tr>` 수 + `mockManageMembersStats().newDormant` 합을 `#sidebar-notify-manage`에 표시하고 0이면 hidden(디버그 토글 시 "N"). `mockManageRequestsRender`는 카운트가 0이면 탭/카드 배지를 `hidden`+`aria-hidden`으로 숨기고 렌더 종료 시 `mockSidebarNotifyRefresh()` 호출. `mockManageMembersRender`도 종료 시 동일 호출해 휴면 진입 반영.
- [x] `docs/01-plan/pages/12-Clan-Manage.md`: "가입 요청 탭" 배지와 사이드바 알림 점 동작(`요청 대기 수 + 신규 휴면 진입 수 ≥ 1이면 N 표시`) 명시. 구현 참고에 `mockSidebarNotifyRefresh`의 manage 집계 로직과 `mockManageRequestsRender`·`mockManageMembersRender` 종료 시 동기 호출 규약 추가.

### 2026-04-20 — 클랜 관리 탭 분리(가입 요청/구성원) + 이모지 → SVG 아이콘 통일
- [x] `mockup/pages/main-clan.html`: `#view-manage` 탭을 `overview / requests / members / subscribe` 4개로 확장(기존 3개). 탭 라벨 "구성원 관리" → "구성원"으로 축약, `requests` 탭 라벨에 대기 카운트 배지(`#mock-manage-requests-badge`) 부착. 기존 members 패널에 붙어 있던 가입 요청 카드를 새 `data-manage-panel="requests"`로 이동하고 `신청일` 컬럼 + `#mock-manage-requests-tbody`·`#mock-manage-requests-count` 식별자 추가. 페이지 부제 문구 갱신.
- [x] `mockup/pages/main-clan.html`: 이모지 → `.ui-ic` SVG(stroke/currentColor). 휴면 섹션 제목 배지 `😴 → 달 아이콘`, 개인 상세 모달 제목 `✎ → 연필 아이콘`, 활성도 필터 select 옵션에서 🟢/🟡 제거(텍스트만 유지). `.mock-activity-badge`·`.mock-manage-summary-pill`·`.mock-manage-dormant-alert-icon` CSS에 ui-ic 스케일·색상 보정 추가.
- [x] `mockup/scripts/clan-mock.js`: `mockManageSetTab`에 `requests` 케이스 추가, `clanGo('manage')` 초기 진입 시 `mockManageRequestsRender` 호출 추가. `mockActivityBadgeHtml`을 SVG 기반으로 리팩터(MOCK_ACTIVITY_ICON.active/inactive/dormant 3종 · 체크 서클 / 시계 / 달). 요약 배너 pill의 🟢/🟡/😴/👥 → SVG 아이콘, 알림 배너 ⚠ → 경고 삼각 SVG(`MOCK_ICON_ALERT`). 가입 요청 카드와 탭 배지 카운트를 tbody `<tr>` 개수로 동기화하는 `window.mockManageRequestsRender` 신설. 휴면 빈 상태 메시지의 `🎉` 제거.
- [x] `docs/01-plan/pages/12-Clan-Manage.md`: 한 줄 요약·사용자 흐름·화면 구성·탭 번호 체계를 4탭 구조로 재정리(탭 2 가입 요청 / 탭 3 구성원 / 탭 4 구독결제). 권한 매트릭스에 "가입 요청 탭 진입"·"구성원 탭 진입·검색·활성도 필터"·"휴면 섹션 일괄 강퇴" 행 추가. 활성도 분류 표의 "배지" 컬럼 → "아이콘"(체크 서클/시계/달)으로 표기 전환 + "아이콘 체계" 블록쿼트 신설(모든 상태 아이콘을 `.ui-ic` SVG로). 구현 참고에 `mockManageSetTab`의 `requests` 케이스와 `mockManageRequestsRender` 명시.

### 2026-04-20 — D-CLAN-07 멤버 관리 페이지 반영 (활성도 요약·필터·휴면 섹션·일괄 강퇴)
- [x] `mockup/scripts/clan-mock.js`: `MOCK_MANAGE_MEMBERS` 12명에 `daysSince` 필드 추가(분포: 활성 5 / 비활성 4 / 휴면 3, `m6`에 `dormantNewlyEntered`). `mockClassifyActivity(daysSince)` + 임계 상수(30/60) + `MOCK_CLAN_MAX_MEMBERS=30`. 필터 분할(`mockManageMembersFilterList` = 활성+비활성, `mockManageMembersDormantList` = 휴면). 렌더 3분할(`mockManageMembersRenderSummary`·`...RenderActive`·`...RenderDormant`). 활성도 필터 select(`mockManageMembersOnActivityFilter`), 휴면 섹션 토글·페이저·체크박스·전체선택(페이지 한정)·일괄 강퇴(`mockManageMembersBulkKickDormant` — localStorage `clansync-mock-manage-kicked-dormant-v1`), 알림 배너 닫기(`mockManageMembersDismissDormantAlert` — sessionStorage `clansync-mock-manage-dormant-banner-dismissed-v1`), 초기화 헬퍼(`mockManageMembersResetKickedDormant`). `mockManageSetTab`에 members 전환 시 자동 render 호출 추가.
- [x] `mockup/pages/main-clan.html`: `#view-manage` members 패널 확장 — 요약 배너 컨테이너(`#mock-manage-members-summary`), 활성도 필터 select, 테이블 헤더에 "활성도" 컬럼, 휴면 섹션(`<section id="mock-manage-dormant-section">` 접힘 카드 + 체크박스·전체선택·선택 카운트·일괄 강퇴 버튼·페이저). CSS 블록 추가(`.mock-manage-members-summary`·`.mock-manage-summary-pill`·`.mock-manage-dormant-alert`·`.mock-activity-badge`·`.mock-manage-dormant-section` 등).
- [x] `docs/01-plan/pages/12-Clan-Manage.md`: 탭 2 "구성원 관리" 영역 D-CLAN-07 재구성(요약 배너 4 pill·활성도 필터·휴면 섹션 세부·일괄 강퇴 범위=현재 페이지). "활성도 분류" 표 신설. "목업과 실제 구현의 차이"에 `daysSince` 필드·localStorage 키 2종 설명. "결정 필요"에서 D-CLAN-07 줄긋기. "구현 참고"에 새 전역 함수·상수·스토리지 키 일괄 등재.

### 2026-04-20 — D-CLAN-03·06 결정 닫기 + D-CLAN-07 신설 (라이프사이클·인원·멤버 활성도)
- [x] `decisions.md`: D-CLAN-03·06 OPEN→DECIDED + D-CLAN-07 신설. 표 행 갱신 + 하단 풀 명세 3개. D-CLAN-03(정책 위반/휴면/부실 3분류 + 단계별 제재 + 신고 자동 임계 폐기, 운영진 직접 판단), D-CLAN-06(200 유지·Free·Premium 동일·인원 차별화 없음), D-CLAN-07(활성<30d/비활성 30~60d/휴면 60d+, 광범위 활동, 휴면 한도 외, 자동 탈퇴 없음·일괄 수동 탈퇴).
- [x] `schema.md`: 관계도 `User ──< ClanReport >── Clan` 추가. `clans` 테이블 — `lifecycle_status enum`·`moderation_status enum`·`last_activity_at` 신설, `max_members` CHECK 200, `is_active`를 도출 컬럼화. `clan_members` 테이블 — `last_activity_at` 신설 + 인덱스 권장. `clan_reports` 테이블 신설(reason enum·status enum·1인 1클랜 1회 유니크). "이번달 활성 유저 비율" 분모 정의 갱신(휴면 제외).
- [x] `pages/06-ClanAuth.md`: 만들기 폼 max_members 안내 카피 + 경고 박스 D-CLAN-03 정합. "클랜 라이프사이클 — 목록 노출 정책" 표 신설(5×3 노출 매트릭스), "신고 흐름" 섹션 신설. "결정 필요" 7개 결정 모두 줄긋기. "목업과 실제 구현의 차이" 섹션 갱신.
- [x] `mockup/pages/clan-auth.html`: `CLANS`에 `ghost` 휴면 시연 데이터 추가, `getFilteredClanKeys`에서 `dormant`·`deleted`·`hidden` 제외 필터 추가. 만들기 폼 max_members 안내 카피 D-CLAN-06·07 권장 정합. 경고 박스 카피 D-CLAN-03 단계별 제재·자동 휴면 명시.

### 2026-04-20 — D-CLAN-01·02·04·05 결정 닫기 (가입 라이프사이클 + 만들기 폼 정합)
- [x] `decisions.md`: D-CLAN-01·02·04·05 OPEN→DECIDED. 하단 DECIDED 절에 6칸 분량 풀 명세(분리 테이블 머신·단일 신청 정책·폼↔DB 정합·해제 동작).
- [x] `schema.md`: `clans` 테이블 갱신 — `name varchar(24)`, `style enum`, `tier_range text[]`(8티어, 챌린저 포함), `min_birth_year int` 추가, `age_range` 제거. `clan_join_requests` 신설(부분 유니크 인덱스로 게임당 단일 신청 강제). 관계도에 `User ──< ClanJoinRequest >── Clan` 추가.
- [x] `pages/06-ClanAuth.md`: 사용자 흐름·만들기 폼 표·상태 머신·"결정 필요" 줄긋기·구현 참고 함수 목록을 결정에 맞춰 정합.
- [x] `mockup/pages/clan-auth.html`: 챌린저 칩 추가(필터·만들기), 출생연도 select 신설, 자유 태그 입력 칸 + `addCustomTag/validateCustomTag`, `selectSingleChip` 버그 수정(해제 허용), `submitJoin`/`cancelPendingApplication`이 `sessionStorage.clansync_clan_apply` 시뮬레이션, `openJoinFromDrawer`에 단일 신청 검증 모달, `applyClanAuthBootstrap()`이 `?game=`·`?pending=1` 흡수해 `pendingView` 자동 노출, `filterClans`+`getFilteredClanKeys`+`applyFilters`로 클라이언트 검색·필터 통합, `handleCreateClan`이 폼 전체 payload(11개 필드)를 `sessionStorage.clansync_create_clan_draft`에 저장.

### 2026-04-20 — D-AUTH-01·02 결정 닫기 (라우팅 매트릭스 + 게임별 OAuth)
- [x] `decisions.md`: D-AUTH-01 / D-AUTH-02 OPEN→DECIDED. 하단 DECIDED 절에 6칸 매트릭스 + 게임 슬러그×제공자 매핑 표 풀 명세.
- [x] `pages.md`: 미들웨어 흐름 다이어그램에 매트릭스 4 케이스 + `next` 쿼리 반영. "라우팅 매트릭스" 박스 신설(요약표). 가드 체인 표 #04·#05·#06 갱신(`?reauth=1`·`pendingView`·`next` 명시).
- [x] `pages/04-Main_GameSelect.md` / `pages/05-GameAuth.md` / `pages/06-ClanAuth.md`: 사용자 흐름·진입 조건·상태별 화면·구현 참고에서 매트릭스 6칸·`reauth=1`·`GAME_AUTH_PROVIDERS` 맞춤. "결정 필요" 항목 줄긋기 처리.
- [x] `mockup/pages/games.html`: 카드를 `data-game/auth/clan-status/clan-id/clan-name`로 6칸 시뮬레이션 + 단일 라우터 `routeFromGameCard()` 도입. 인라인 상수 핫픽스(OW→main-clan 직행) 제거.
- [x] `mockup/pages/game-auth.html`: `GAME_AUTH_PROVIDERS` 매핑(overwatch/valorant/lol/pubg/__fallback__) + `applyGameAuthConfig()` 부트스트랩, `?reauth=1` 안내 배지, lol/pubg CTA 비활성, 폴백 시 "← 게임 선택으로" 버튼.

### 2026-04-20 — 토큰 절약 메타 정비 + 아이콘 팩 git 정리 + 목업 보완 피드백
- [x] 아이콘: `heroicons` 서브모듈 deinit/제거, `.gitmodules` 정리. ionicons + heroicons 둘 다 `<pack>/in-use/` 화이트리스트 패턴(`.gitignore`)으로 전환. 풀팩은 디스크 보존, README 4장으로 정책 안내.
- [x] 룰 슬림화: `project-context.mdc`의 `@docs/...` 9개 자동 첨부 제거(평문 경로화) + stale `IMPLEMENTATION_PROGRESS_*.md` 4건 제거. `session-handoff`/`git-nano-commit` 압축. `AGENTS.md`에 응답 스타일 8개 항목 추가(선언/재진술/회고/추측 읽기 금지 등).
- [x] `/todo` 커맨드: 없는 `TODO_Phase2.md` 직접 참조 → "현재 페이즈 진행도"로 일반화.
- [x] 목업 보완 피드백 카탈로그화: A(즉시 코드 보완 가능 7건), B(결정 필요 8건), C(에셋 교체 3건), D(구조적 한계). `decisions.md` OPEN 38건 기준. 다음 세션 후보 3개로 좁힘.

- [x] `TODO_Phase1.md`: 종료(2026-03-28)·S00 Phase 2 항목을 Phase2 문서로 이관·요약표 S00 완료
- [x] `TODO_Phase2.md`: 참조표·종료조건·체크 A~E·슬라이스 매핑·`pages.md` 전 경로+MainClan 하위·메모
- [x] 허브·`FEATURE_INDEX`·`README`·`project-context`·`todo`·`session-handoff`: 현재 단계 Phase 2

### 2026-03-28 — Phase 2 권장 프롬프트: schema·허브 갱신·과제 한 문장
- [x] `TODO.md` Phase 2 블록: `schema.md` 포함, 완료 시 허브 마지막 갱신·Phase2·세션 로그 명시

### 2026-03-28 — Phase 1 권장 프롬프트: 슬라이스 `@` 경로 정리
- [x] `slice-XX-*.md` 대신 `slice-NN-....md`로 실제 파일명 치환 안내 + 체크·요약표 **진행 중**·BACKLOG 명시

### 2026-03-28 — 허브 권장 프롬프트 정합 (Phase 1 기본 + Phase 2 보조)
- [x] `TODO.md` 다음 세션 블록: Phase 1 복사용을 기본으로 두고, Phase 2 착수용은 두 번째 블록으로 분리
- [x] `.cursor/commands/todo.md` §4 절차를 위 형식에 맞게 정리

### 2026-03-28 — 세션 로그 파일 분리
- [x] `TODO_LOG.md` 신설, `TODO.md`에서 히스토리 제거(토큰 절약)

### 2026-03-28 — 진행도 문서 페이즈 분리
- [x] `TODO_Phase1.md`·`TODO_Phase2.md` 신설, 본 파일은 허브·세션 로그 전용

### 2026-03-28 — 랜딩·온보딩 미결 BACKLOG 대조
- [x] `BACKLOG.md`: PRD·`pages.md`와 항목 매칭·랜딩/온보딩 표·경제·통계 그룹 분리
- [x] `pages.md` Landing 캐치프라이즈 → BACKLOG 단일 참조

### 2026-03-28 — S02 게임·클랜 온보딩 문서 정합
- [x] `pages.md`: GameAuth·ClanAuth 목업 동작·온보딩 순서(1→4)·BACKLOG 링크, `slice-02` 수용 기준

### 2026-03-28 — S01 라우트·미들웨어 `pages.md` 정합
- [x] 라우팅 맵에 `/profile`·게시글 상세(목업 미작성) 명시, 미들웨어에 프로필·게임 하위 분리, Phase 1 목업 대응표·`slice-01` 수용 기준

### 2026-03-28 — mockup-spec 정합 (공통 목업)
- [x] `mockup-spec.md`: 트리(`_hub`·`profile`·`clan-mock`·`partials`)·MainGame 레이아웃·Premium 목업 클래스·MainClan 탭·Profile·MainGame 필터/플레이스홀더·`data/` 메모
- [x] **공통 목업** `mockup-spec` 대비 항목 완료 (S00은 Phase 2 섹션 추가 시까지 표상 **진행 중** 유지)

### 2026-03-28 — S08 프로필·꾸미기 ↔ 밸런스 정책 정합
- [x] `MOCK_BADGE_NAMEPLATE_MAX`·프로필 상단 안내·`nameplate-case-modal` 푸터, `pages/09-BalanceMaker.md`·`pages.md`·`slice-08` 갱신

### 2026-03-28 — S07 MainGame 홍보·LFG·필터·플레이스홀더
- [x] `main-game.html`: LFG 필터 초기화 `#sec-lfg .lfg-filter-panel` 수정, `navTo`/에셋 BACKLOG 주석, `.mock-main-game-asset-hint` 안내
- [x] `pages.md` MainGame 목업 요약, `BACKLOG.md`·`slice-07` 수용 기준, 진행도·요약표 S07 **완료**

### 2026-03-28 — S03 MainClan 쉘 문서·플랜 경계 정합
- [x] `non-page/clan-main-static-mockup-plan.md` §2.1 해시·뷰 매핑, §3 권한·§3.1 플랜·§8 현재 네비 정책 반영
- [x] `slice-03` 수용 기준 완료, 진행도·요약표 S03 폴리시 열 **완료**

### 2026-03-28 — S06 이벤트·관리·스토어 문서·목업 정합
- [x] `pages.md`에 통계·관리·스토어 섹션 추가, `non-page/clan-main-static-mockup-plan.md` §4.3–4.6 목업 ID·권한 반영
- [x] 이벤트 대진표: Premium 탭 배지 + Free 플랜 시 본문 숨김(`mock-hide-on-free`)·안내 문구
- [x] `slice-06` 수용 기준·진행도·요약표

### 2026-03-28 — S05 클랜 통계 문서·목업 정합
- [x] `pages/10-Clan-Stats.md` §5·§9 재작성: 탭 4개(요약·명예의 전당·경기 기록·앱 이용)·권한·HoF vs 경기 기록 구분
- [x] `slice-05` 수용 기준 반영, `main-clan.html`/`clan-mock.js` 주석 정리

### 2026-03-28 — S04 밸런스 문서·목업 정합
- [x] `pages/09-BalanceMaker.md`에 워크플로 탭 라벨·허브 `?plan=`·`mockClanCurrentPlan` 설명 보강
- [x] `main-clan.html` 밸런스 도움말 `data-tip`에서 § 제거(프로젝트 UI 가이드)
- [x] S04 진행도·`slice-04` 수용 기준(문서 순서) 반영

### 2026-03-28 — /todo 동기화 (재실행)
- `FEATURE_INDEX`·`BACKLOG`·`mockup/pages/*.html`·`clan-mock.js`·`app.js` 경로 대조
- S04 `pages/09-BalanceMaker.md`·S05 `pages/10-Clan-Stats.md`·S01 `pages.md` 등 **폴리시·정합** 미완 항목 재확인 (체크리스트 변경 없음)
- 빠른 요약표·다음 세션 권장 프롬프트 갱신

### 2026-03-28 — /todo 커맨드로 진행도 동기화
- [x] S05·S06 목업 존재 여부 재확인 후 체크·요약표 반영
- [x] `.cursor/commands/todo.md` 추가 (재실행 시 동일 절차)
- [x] 다음 세션 권장 프롬프트 섹션 갱신

### 2026-03-28 — 문서·용어·슬라이스 정리
- [x] PRD 동결·`FEATURE_INDEX`·`slices/`·`BACKLOG` 정리
- [x] Free/Premium 용어 통일 (규칙·목업)
- [x] 본 진행도 문서(`TODO.md`) 신설

---

### 2026-04-21 — Phase 1 감사 후속 (AUDIT-Phase1-2026-04-21)
- [x] **C-1** `10-Clan-Stats.md` 슬라이스 링크 `slice-05-clan-stats.md`로 정정
- [x] **C-2** `docs/TODO_Phase2.md` 신설 (허브·FEATURE_INDEX 등 기존 링크 복구)
- [x] **M-2~M-4** `09-BalanceMaker` D-EVENTS-03 DECIDED 반영·OPEN 항목 Phase 2+ 라벨 · `12-Clan-Manage` D-CLAN-02 · `14-Profile` D-PERM-01/`view_alt_accounts`·D-PRIV-01 정합 · **m-7** BALANCE 별칭 문구
- [x] **M-5** 슬라이스 S00~S08 `## 결정 참조` 블록 추가
- [x] **M-1** `main-game.html` LFG 헤더 「내 신청 N건」pill · 모집자 카드/드로어 「신청자 N명」·`lfgAppCount` 연동 · **m-4** 미사용 `.ranking-insight-placeholder` CSS 제거
- [x] **Minor 목업** `_hub.html` 프로필 링크 · 전 페이지 `<meta description>` · `#mock-match-correction-request-modal` `aria-modal="true"`
- [x] **Minor 문서** `10-Clan-Stats` 결정 현황 중복 제거 · `schema.md` games/maps/player_scores/medals/board_posts D- 교차 링크 · **m-8/m-9** `slice-00` 역할 용어·`Phase 2+` 표기 규약
- [x] `TODO.md`·`TODO_Phase1.md` 메타 갱신

### 템플릿 (복사 후 사용)

```
### YYYY-MM-DD — (세션 제목)
- [ ] (이번 세션에서 끝낸 작업 1)
- [ ] (작업 2)
```
