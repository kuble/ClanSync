# ClanSync 문서 안내

시작할 때는 **[TODO](TODO.md) → 아래 기능별 진입점 → 필요한 명세**만 읽습니다. 기획 전체·완료 이력은 해당 결정의 근거가 필요할 때만 찾습니다. 제안·확정 요구·구현·검증 완료 상태를 구분합니다.

[서비스 진입 변경 기획](01-plan/entry-experience-redesign.md) → [공통·화면별 상세 설계](02-design/entry-experience/README.md) — 랜딩·로그인·회원가입·게임 선택·게임 인증/재연동·클랜 가입 6개 화면과 이메일 확인·클랜 생성·리더 환영의 구도, 문구, 상태·복귀, 데이터·검증 기준. 랜딩·로그인·회원가입·게임 선택·게임 ID 등록의 시각 개선을 실제 경로에 적용했으며 추가 상태 개선과 클랜 참여 화면의 재설계는 후속이다.

[100명 이하 알파 점검: 디자인 화면 링크·성능 측정·OCR 검토·운영 손익](03-analysis/alpha-review-2026-10-16/README.md) · `node scripts/serve-alpha-review.mjs`로 클릭형 보드를 연다.

테마·모바일 재점검: [테마 전환](../src/components/ui/theme-toggle.tsx) · [라이트 검증](../e2e/light-theme.spec.ts) · [실제 저장 선택을 적용하는 Playwright 프로필](../playwright.light.config.ts) · [검증 범위](03-analysis/alpha-review-2026-10-16/verification.md#라이트-테마모바일-점검).

[게임 ID 표시·QA 레거시 닉네임 컬럼 폐기](03-analysis/profile-game-identity-audit-2026-10-23.md) · [컬럼 부재·기록 보존 회귀](../scripts/legacy-nickname-retirement-db.test.mjs) · [게임 ID/로비/관리 회귀](../e2e/game-player-names.spec.ts) · [다중 게임/모바일 UI](../e2e/profile-game-identities.spec.ts) · [QA 임시 ID 보정](../scripts/qa-game-identities.mjs).

미인증 게임 ID: [직접 입력·본인 저장](../src/app/actions/game-identity.ts) · [진입/인증 상태 분리](../src/lib/onboarding/load-game-onboarding.ts) · [게임 프로필 상태](../src/components/profile/profile-identity.tsx) · [저장/위조 차단·가입/생성·모바일 회귀](../e2e/manual-game-identity.spec.ts).

부계정 ID 형식: [추가·수정 검사](../src/app/actions/profile-alt-accounts.ts) · [본계정/부계정 DB 직접 요청 회귀](../e2e/game-identity-format.spec.ts) · [화면 오류·정상 저장 회귀](../e2e/profile-inline-alt-accounts.spec.ts).

## 기능별 코드·테스트 진입점

검증 범위는 [변경 위험도 기준](../.cursor/rules/agent-auto-tasks.mdc), 실행 명령은 [E2E 안내](../e2e/README.md)를 따릅니다. 아래는 관련 파일을 찾는 지도이며 매번 전부 읽거나 실행하는 목록이 아닙니다.

| 기능 | 코드 시작점 | 관련 테스트 |
|---|---|---|
| 랜딩 | [공개 경로](../src/app/page.tsx) · [공용 화면·미리보기](../src/components/entry/landing/landing-page.tsx) · [개발 미리보기](../src/app/dev/landing-preview/page.tsx) | [공개 랜딩·메뉴·기록·알림·로그인 스모크](../e2e/smoke.spec.ts) |
| 공지·정책·문의 | [공지사항](../src/app/notices/page.tsx) · [이용약관 초안](../src/app/terms/page.tsx) · [개인정보 초안](../src/app/privacy/page.tsx) · [문의](../src/app/contact/page.tsx) · [공용 페이지](../src/components/entry/service-info-page.tsx) · [공용 푸터](../src/components/entry/site-footer.tsx) | [공개 이동·초안·홈 복귀](../e2e/service-info.spec.ts) · [테마·모바일](../e2e/light-theme.spec.ts) |
| 로그인 화면 | [페이지](../src/app/sign-in/page.tsx) · [폼](../src/app/sign-in/sign-in-form.tsx) · [공용 셸](../src/components/entry/auth-shell.tsx) · [개발 미리보기](../src/app/dev/sign-in-preview/page.tsx) | [공개 스모크](../e2e/smoke.spec.ts) · [테마·모바일](../e2e/light-theme.spec.ts) · [로그인·실패·자동 로그인](../e2e/auth-performance.spec.ts) |
| 회원가입 화면 | [페이지](../src/app/sign-up/page.tsx) · [폼](../src/app/sign-up/sign-up-form.tsx) · [공용 스타일](../src/components/entry/auth.module.css) · [명세](02-design/entry-experience/02-sign-up.md) | [가입 오류·입력 보존·새 프로필](../e2e/game-link.spec.ts) · [테마·모바일·입력](../e2e/light-theme.spec.ts) · [공개 문구](../e2e/formal-copy.spec.ts) |
| 클랜 홍보·가입 조건 | [관리 UI](../src/components/main-clan/clan-promotion-settings.tsx) · [공용 가입 조건](../src/components/onboarding/clan-recruitment-fields.tsx) · [작성·저장](../src/app/actions/clan-promotion.ts) · [클랜 찾기 노출](../src/app/games/[gameSlug]/clan/page.tsx) · [상세·신청](../src/components/onboarding/clan-join-list.tsx) · [관리 명세](01-plan/pages/12-Clan-Manage.md) | [가입 가능 필터·페이지·검색 결합](../e2e/clan-discovery-eligibility.spec.ts) · [게시·노출·조건·모바일·접근·가입 복귀](../e2e/clan-promotion.spec.ts) · [글자 사이 사진·삭제·실행 취소](../e2e/promotion-inline-editor.spec.ts) · [본문 직렬화](../scripts/promotion-document.test.mjs) · [출생연도 범위](../scripts/recruitment-years.test.mjs) · [변경 불가·신청/승인·교체 원자성](../scripts/clan-recruitment-db.test.mjs) |
| 게임 선택 | [페이지](../src/app/games/page.tsx) · [목록·검색](../src/components/games/game-card-grid.tsx) · [로딩](../src/app/games/loading.tsx) · [명세](02-design/entry-experience/04-game-select.md) | [목록·검색·클랜 이동·테마/모바일 확인](TODO_Phase2.md#2026-10-30-게임-선택-목록형-시각-개선) |
| 게임 ID 등록 | [페이지](../src/app/games/[gameSlug]/auth/page.tsx) · [직접 입력·QA 도구](../src/components/onboarding/game-auth-connect.tsx) · [명세](02-design/entry-experience/05-game-auth.md) | [직접 입력·미인증·가입/생성·테마/모바일](../e2e/manual-game-identity.spec.ts) · [재연결·중복](../e2e/game-link.spec.ts) · [QA 연결·가입 신청](../e2e/onboarding.spec.ts) |
| 개인·클랜 상점 | [개인 상점](../src/app/store/page.tsx) · [디자인 목록/필터/구매/적용](../src/components/store/personal-store-products.tsx) · [클랜 상품](../src/components/store/store-panels.tsx) | [검색·페이지·구매·공용 잔액·반응형](../e2e/personal-store.spec.ts) · [칭호·프로필 장착](../e2e/account-namecards.spec.ts) · [클랜 검색·보유·미리보기·구매](../e2e/clan-appearance.spec.ts) |
| 플레이어 소개·꾸미기 | [소개](../src/components/profile/profile-identity.tsx) · [공개 소개 조회](../src/lib/profile/load-player-identity.ts) · [공통 네임카드](../src/components/profile/profile-namecard.tsx) · [명세](01-plan/pages/14-Profile-Customization.md) | [공통 카드·칭호·계정 UI](../e2e/account-namecards.spec.ts) · [공통 카드/칭호 DB](../scripts/account-namecards-db.test.mjs) · [소개·계정 탭·반응형](../e2e/profile-composition.spec.ts) · [기본 공개 UI](../e2e/profile-visibility.spec.ts) · [기본 공개 DB](../scripts/profile-visibility-db.test.mjs) |
| 클랜 게시판·사진 앨범 | [모바일 목차](../src/components/main-clan/clan-board-navigation.tsx) · [목록/입력 규칙](../src/lib/clan/board.ts) · [저장 액션](../src/app/actions/clan-board.ts) · [기본 댓글 공감](../src/app/actions/board-comment-reactions.ts) · [화면](../src/components/main-clan/clan-board-posts.tsx) · [통계와 공통 댓글 UI](../src/components/main-clan/clan-comments.tsx) · [명세](01-plan/pages/15-Clan-Board.md) | [본문 높이/하단](../e2e/clan-board-viewport.spec.ts) · [모바일 선택/뒤로가기](../e2e/clan-board-mobile-navigation.spec.ts) · [작성·상태·사진·권한](../e2e/clan-board.spec.ts) · [두 댓글 화면·이모티콘 비교](../e2e/clan-comment-parity.spec.ts) · [기본 댓글 공감 RLS](../e2e/board-comment-reactions.spec.ts) · [댓글 공감자 조회·권한](../e2e/clan-board-reaction-people.spec.ts) · [목록 전송량·배치](../e2e/clan-board-list.spec.ts) · [DB/RLS](../scripts/clan-boards-db.test.mjs) · [공지 이동](../e2e/clan-management.spec.ts) |
| 내전 회차·클랜 배지 케이스 | [회차](../src/lib/clan/load-clan-history.ts) · [배지 로더](../src/lib/clan/load-clan-badges.ts) · [핀 케이스](../src/components/main-clan/clan-badges.tsx) | [회차·획득·대시보드](../e2e/clan-management-overview.spec.ts) · [분류/N·멤버 판정/회수·상세](../e2e/clan-badge-growth.spec.ts) · [계열별 진열·주년 상세](../e2e/clan-badge-series.spec.ts) · [새 획득 보존·확인 격리](../e2e/clan-badge-read-state.spec.ts) · [발급/진열 권한](../scripts/clan-boards-db.test.mjs) |
| 코칭 선생님·신청 알림 | [선생님 UI](../src/components/main-clan/clan-coach-directory.tsx) · [선생님 조회](../src/lib/clan/load-clan-coaches.ts) · [알림 벨](../src/components/main-clan/clan-inapp-notification-bell.tsx) | [등록·신청·댓글 알림](../e2e/clan-coaching.spec.ts) · [담당 권한·수신자 DB](../scripts/clan-coaching-db.test.mjs) |
| 방송 링크·수동 생방송 표시 | [채널 UI](../src/components/main-clan/clan-channel-links.tsx) · [저장 액션](../src/app/actions/clan-board.ts) · [표시 방식](guides/clan-channel-live.md) | [작성자 권한·상태 보존·입력 스타일](../e2e/clan-channel-manual-live.spec.ts) |
| 내전 로비·예약·참석 응답 | [로비](../src/components/main-clan/clan-balance-lobby.tsx) · [방 액션](../src/app/actions/clan-balance-rooms.ts) · [방 권한](../src/lib/balance/room-access.ts) | [로비 통합](../e2e/balance-lobby.spec.ts) · [방 DB](../scripts/balance-rooms-db.test.mjs) |
| 설정 On/Off 토글 | [공통 Switch](../src/components/ui/switch.tsx) — 하위 설정은 왼쪽 연결선과 들여쓰기로 표현한다. 복수 항목 선택·동의는 체크박스 유지 | [경기 설정](../e2e/formation-settings-preview.spec.ts) · [알림 설정](../e2e/clan-discord-notifications.spec.ts) · [폼 저장](../e2e/auction-catalog.spec.ts) |
| 명단 입력·자동 저장 | [명단 편집](../src/components/main-clan/clan-balance-roster-editor.tsx) · [자동 저장](../src/lib/balance/roster-autosave.ts) | [목록 배치·드래그](../e2e/balance-roster-dock.spec.ts) · [roster-autosave](../e2e/roster-autosave.spec.ts) · [내전 통합](../e2e/balance-session-live.spec.ts) |
| 미가입 참가자·계정 연결 | [기록·승인 규칙](02-design/clan-participants.md) · [가입 승인·기록 선택 창](../src/components/main-clan/participant-record-dialog.tsx) · [명부](../src/components/main-clan/clan-participant-management.tsx) · [액션](../src/app/actions/clan-participants.ts) | [추천·검색·가입 승인·해제·동시성](../e2e/clan-participant-approval.spec.ts) · [누적·권한·점수·원본 보존](../e2e/clan-participants.spec.ts) |
| 클랜 탈퇴·재가입·이전 구성원 | [소속 규칙](02-design/clan-participants.md#탈퇴강퇴와-같은-계정의-재가입-2026-10-16) · [탈퇴 UI](../src/components/profile/profile-clan-memberships.tsx) · [명단·재가입 허용](../src/components/main-clan/manage-members-table.tsx) · [소속 액션](../src/app/actions/clan-manage-members.ts) | [격리 브라우저 흐름](../e2e/clan-membership-return.spec.ts) · [실제 클랜/계정 탈퇴·삭제/보존](../e2e/profile-withdrawal-data.spec.ts) · [소속·권한·기록 보존 DB](../scripts/clan-membership-db.test.mjs) |
| 구성원 참여 상태·방문 | [관리 목록](../src/components/main-clan/manage-members-table.tsx) · [일일 판정](../supabase/migrations/20261030020000_daily_member_participation.sql) · [기준](01-plan/pages/12-Clan-Manage.md#내전-참여-상태-d-clan-07--2026-10-30-변경) | [출전/경계/권한 DB](../scripts/clan-participation-activity-db.test.mjs) · [점·5분 갱신·방문 RPC](../e2e/clan-member-activity.spec.ts) · [모바일 압축·작업 접근](../e2e/clan-members-mobile.spec.ts) |
| 참가자 점수·세션 전적 | [정보창](../src/components/main-clan/balance-player-details.tsx) · [세션 집계](../src/lib/balance/player-session-stats.ts) · [점수 표시](../src/lib/balance/score-display.ts) | [점수·호버 통합](../e2e/balance-insights.spec.ts) · [세션 집계](../e2e/player-session-stats.spec.ts) · [합계](../e2e/balance-score-display.spec.ts) |
| 역할 추첨·팀 편성·공유 연출 | [편성 UI](../src/components/main-clan/clan-balance-formation.tsx) · [경매 연출](../src/components/main-clan/balance-auction-stage.tsx) · [보드 연출](../src/components/main-clan/clan-balance-reveal-board.tsx) · [규칙](../src/lib/balance/formation.ts) | [formation-rules](../e2e/formation-rules.spec.ts) · [추첨 후 팀 조정](../e2e/balance-role-team-review.spec.ts) · [경매 흐름](../e2e/balance-auction-flow.spec.ts) · [내전 통합](../e2e/balance-session-live.spec.ts) · [편성 DB](../scripts/formation-db.test.mjs) |
| 내전 전략 아이템 | [내전별 구성](../src/components/main-clan/balance-auction-item-settings.tsx) · [공통 편집 UI](../src/components/main-clan/clan-auction-item-settings.tsx) · [관리 액션](../src/app/actions/clan-auction-items.ts) | [기본 아이템 관리](../e2e/auction-catalog.spec.ts) · [깜짝 내전 구성·실제 시작](../e2e/round-auction-items.spec.ts) · [권한 DB](../scripts/clan-auction-items-db.test.mjs) |
| 관전자 승부예측·코인 풀·내전 순위 | [예측 드로워](../src/components/main-clan/clan-balance-prediction-pool.tsx) · [제출 액션](../src/app/actions/clan-balance-session.ts) · [집계 액션](../src/app/actions/clan-prediction-pool.ts) | [참여/정산 UI](../e2e/balance-prediction-pool.spec.ts) · [금액/RLS DB](../scripts/prediction-pool-db.test.mjs) · [설정 DB](../scripts/prediction-settings-db.test.mjs) · [권한 경계](../e2e/security-fix-boundaries.spec.ts) |
| 역할 선호·라운드 설정 | [선호 액션](../src/app/actions/role-preferences.ts) · [설정 UI](../src/components/main-clan/clan-balance-settings.tsx) | [프로필 선호](../e2e/profile-role-preference.spec.ts) · [멤버 선호](../e2e/balance-member-preference.spec.ts) · [선호 DB](../scripts/role-preferences-db.test.mjs) |
| 경기 전 밴픽·수동 맵 | [경기 준비](../src/components/main-clan/clan-balance-prematch-controls.tsx) · [밴 설정](../src/lib/balance/prematch.ts) · [맵 목록](../src/lib/balance/map-pools.ts) | [밴픽 통합](../e2e/balance-prematch.spec.ts) · [밴픽 DB](../scripts/prematch-db.test.mjs) |
| 세션·라운드·기록·자동 종료 | [세션 액션](../src/app/actions/clan-balance-session.ts) · [자동 종료 설정](../src/app/actions/clan-balance-settings.ts) · [기록 규칙](../src/lib/balance/history.ts) | [자동 종료 DB](../scripts/balance-auto-close-db.test.mjs) · [기록 규칙](../e2e/balance-history-rules.spec.ts) · [내전 통합](../e2e/balance-session-live.spec.ts) · [세션 DB](../scripts/session-round-db.test.mjs) |
| 로그인·권한·계정 격리 | [인증 액션](../src/app/actions/auth.ts) · [클랜 접근](../src/lib/clan/request-clan-access.ts) | [auth-performance](../e2e/auth-performance.spec.ts) · [쿠키](../e2e/session-cookies.spec.ts) · [계정 격리](../e2e/clan-request-isolation.spec.ts) · [RLS/권한 DB](../scripts/review-db.test.mjs) |
| 클랜 운영·공지 | [관리 탐색](../src/components/main-clan/clan-manage-tabs.tsx) · [영역별 데이터](../src/components/main-clan/clan-manage-content.tsx) · [회차 집계](../src/lib/clan/load-clan-history.ts) · [배지](../src/components/main-clan/clan-badges.tsx) · [공지 액션](../src/app/actions/clan-notices.ts) | [관리](../e2e/clan-management.spec.ts) · [운영 현황·공지 3개](../e2e/clan-management-overview.spec.ts) · [대시보드](../e2e/clan-dashboard.spec.ts) · [공지 DB](../scripts/clan-notices-db.test.mjs) |
| 클랜 규칙 항목 관리 | [개별 편집](../src/components/main-clan/clan-rules-editor.tsx) · [공통 파서](../src/lib/clan/rules.ts) · [대시보드 넘김](../src/components/main-clan/clan-rules-ticker.tsx) | [추가/수정/삭제·실패·멤버 열람](../e2e/clan-rules.spec.ts) |
| 클랜 통계·사이트 이용 | [통계 로더](../src/lib/clan/stats/load-clan-stats.ts) · [집계 규칙](../src/lib/clan/stats/clan-stats-analytics.ts) · [통계 화면](../src/components/main-clan/clan-stats-experience.tsx) · [공통 연월 팝업](../src/components/ui/period-select.tsx) · [기간 집계](../src/lib/clan/stats/intra-overview.ts) · [명예의 전당 반응](../src/app/actions/hof-comments.ts) · [관리 방문 화면](../src/components/main-clan/clan-site-usage-panel.tsx) | [기간·권한 UI](../e2e/clan-stats-periods.spec.ts) · [플레이어 태그·기본 정보·권한](../e2e/player-profile-display.spec.ts) · [집계](../e2e/clan-stats-analytics.spec.ts) · [기록/HoF](../e2e/clan-match-records.spec.ts) · [반응/댓글 권한](../e2e/hof-comments.spec.ts) · [권한 경계](../e2e/security-fix-boundaries.spec.ts) |
| 통계 조회 성능 | [조회 모델 설계](02-design/clan-stats-read-model.md) · [요약·기록 RPC 로더](../src/lib/clan/stats/stats-read-model.ts) · [기간 지연 조회](../src/components/main-clan/use-stats-period.tsx) | [정합성·권한](../e2e/clan-stats-read-model.spec.ts) · [1만 경기 측정](../e2e/clan-stats-scale.spec.ts) |
| 프로필 엠블럼 경로·공통 헤더 | [프로필 하위 케이스](../src/app/profile/[userId]/emblems/page.tsx) · [공통 심벌·경로](../src/components/ui/header-breadcrumbs.tsx) | [이전 링크·권한·모바일·헤더 일관성](../e2e/personal-emblem-profile-route.spec.ts) · [게임 선택·상점/편집 아이콘](../e2e/profile-navigation.spec.ts) |
| 개인 엠블럼·대표 케이스 | [본인 통합 케이스](../src/app/profile/emblems/page.tsx) · [본인 획득 조회](../src/lib/personal-emblems/load-owned-case.ts) · [전용 페이지](../src/app/games/[gameSlug]/clan/[clanId]/emblems/page.tsx) · [공통 케이스](../src/components/personal-emblems/personal-emblem-case.tsx) · [GET 조회](../src/app/api/clans/[clanId]/personal-emblems/route.ts) · [대표 저장](../src/app/actions/personal-emblems.ts) · [계열·단계](../src/lib/personal-emblems/catalog.ts) · [프로필 연결](../src/components/profile/profile-identity.tsx) · [프로필 공개 조회](../src/lib/personal-emblems/load-profile-case.ts) | [공개·저장·공유·모바일 UI](../e2e/personal-emblem-case.spec.ts) · [수상·단계·대표 규칙](../e2e/personal-emblems-catalog.spec.ts) · [RLS·소속 DB](../scripts/personal-emblems-db.test.mjs) · [계정 대표 RLS](../scripts/account-personal-emblems-db.test.mjs) · [게임·클랜 혼합 대표](../e2e/account-personal-emblems.spec.ts) · [영구 보관·최초 날짜 DB](../scripts/personal-emblem-history-db.test.mjs) · [정정·공개·재가입 보존](../e2e/personal-emblem-history.spec.ts) · [월/연 수상·터치](../e2e/personal-emblem-awards.spec.ts) · [다중 게임·탈퇴/재가입](../e2e/personal-emblem-library.spec.ts) |
| 경기 기록 추가·정정·제거 | [기록 액션](../src/app/actions/clan-match-records.ts) · [편집 창](../src/components/main-clan/match-record-editor.tsx) · [날짜별 기록](../src/components/main-clan/clan-stats-archive.tsx) · [당일 전적](../src/components/main-clan/archive-day-table.tsx) | [CRUD·권한·원본 보존](../e2e/clan-match-record-editing.spec.ts) · [영역 유지·고정 높이](../e2e/clan-stats-periods.spec.ts) |
| 일정·캘린더·시간대 | [캘린더 UI](../src/components/main-clan/clan-events-view.tsx) · [일정 액션](../src/app/actions/clan-events.ts) · [시간 파싱](../src/lib/clan/parse-event-start.ts) | [반응형 패널·드로워](../e2e/event-calendar-layout.spec.ts) · [event-timezone](../e2e/event-timezone.spec.ts) · [review-rules](../e2e/review-rules.spec.ts) |
| 투표·생성 폼 | [목록·참여·결과](../src/components/main-clan/clan-events-polls-tab.tsx) · [도넛 결과](../src/components/main-clan/clan-poll-results.tsx) · [생성 UI](../src/components/main-clan/clan-poll-create-dialog.tsx) · [투표 액션](../src/app/actions/clan-polls.ts) | [생성·검증·모바일](../e2e/clan-poll-create.spec.ts) · [선택·변경·결과·직접 링크](../e2e/clan-poll-voting.spec.ts) · [시작 예약·익명 응답](../e2e/clan-poll-schedule.spec.ts) |
| Discord 공용 봇·클랜 알림 | [연결 안내](guides/discord-bot-setup.md) · [설정 UI](../src/components/main-clan/clan-discord-settings.tsx) · [활용 갤러리](../src/components/main-clan/discord-benefits-gallery.tsx) · [종류별 설정](../src/lib/clan/discord-notification-settings.ts) · [발송](../src/lib/notifications/dispatch-discord-bot-notifications.ts) · [분 단위 워커](../scripts/discord-notification-worker.mjs) | [종류·중복·권한·온보딩·링크](../e2e/clan-discord-notifications.spec.ts) · [자동 저장 실패·연속 변경](../e2e/clan-settings-autosave.spec.ts) · [봇 권한·예약](../e2e/event-discord-bot.spec.ts) · [기존 DB 회귀](../scripts/review-db.test.mjs) |
| 클랜 채팅방 초대 링크 | [서비스·주소 검증](../src/lib/clan/community-links.ts) · [설정](../src/components/main-clan/clan-community-links-form.tsx) · [저장](../src/app/actions/clan-community-links.ts) · [Discord 자동 입장](../src/lib/clan/resolve-clan-discord-entry.ts) · [배너 아이콘](../src/components/main-clan/clan-community-links.tsx) · [선정 근거](01-plan/pages/07-MainClan.md#클랜-채팅방-링크-2026-10-28) | [수동 링크·권한](../e2e/clan-community-links.spec.ts) · [봇 초대·자동/수동 입장](../e2e/clan-discord-entry.spec.ts) |
| 공통 화면·페이지 이동 | [클랜 셸](../src/components/main-clan/main-clan-shell.tsx) · [클랜 레이아웃](../src/app/games/[gameSlug]/clan/[clanId]/layout.tsx) | [navigation-feedback](../e2e/navigation-feedback.spec.ts) · [frontend-rebuild](../e2e/frontend-rebuild.spec.ts) · [ui-regression](../e2e/ui-regression.spec.ts) · [추가 편집 창·26경로 모바일](../e2e/design-followup.spec.ts) |

## 무엇을 볼 때 어디로 가는가

클랜 프로필·배너: [설정 UI](../src/components/main-clan/clan-appearance-settings.tsx) · [프로필 업로드 API](../src/app/api/games/[gameSlug]/clans/[clanId]/profile-image/route.ts) · [배너 적용](../src/app/actions/clan-banner-settings.ts) · [구매·권한 검증](../e2e/clan-appearance.spec.ts).

배너 제작·색상 프리셋: [개발 스튜디오](../src/app/dev/clan-banners/page.tsx) · [패턴·등급·선택 ID](../src/lib/clan/banner-catalog.ts) · [공통 6색](../src/lib/cosmetics/color-presets.ts) · [렌더러](../src/components/cosmetics/clan-banner-artwork.tsx) · [제작 가이드](design/clan-banners/normal-v1/README.md#색상-프리셋-개발-환경) · [집중 검증](../e2e/clan-banner-studio.spec.ts).

프로필 아바타: [심벌 표시](../src/components/profile/player-avatar.tsx) · [프로필·이전 사진 미사용 검증](../e2e/profile-symbol-avatars.spec.ts).

| 목적 | 기준 문서 |
|------|-----------|
| 게임 이미지·아이콘 권리 문의 | [에셋 권리 확인 목록](licenses/game-assets-review.md) · [개별 파일·원본 URL CSV](licenses/game-assets-inventory.csv) |
| 프로젝트 소개·실행 | [프로젝트 README](../README.md) |
| 실제 시연 영상·Vrew 내레이션 제작 | [다른 프로젝트에도 쓰는 제작 가이드](guides/demo-video-vrew-workflow.md) · [ClanSync 촬영 범위](clansync-demo-video.md) |
| 현재 작업·다음 우선순위 | [TODO.md](TODO.md) |
| 미구현 범위·다음 개선 후보 | [2026-10-15 구현 차이와 개선 제안](03-analysis/implementation-gaps-2026-10-15.md) — 기획 잔여·일부 구현·운영 연결·추가 제안 구분 |
| 클랜 배지 확장 디자인·선택 | [선택 핀·QA 화면](design/clan-badges/expansion-v1/production-v1/README.md) · [이전 5안 비교](design/clan-badges/expansion-v1/README.md) · [발급 기준](01-plan/clan-badge-expansion-v1.md) · [전체 후보](01-plan/clan-badge-catalog.md) |
| 내전 세션·라운드·날짜·참여 용어 | [용어 사전](01-plan/glossary.md#내전-운영-용어) — D-SESSION-01 확정 기준 |
| 정규·깜짝 방·예약·임시 진행자 | [내전 로비 명세](02-design/session-lobby.md) |
| 기획·디자인 고도화 논의 | [고도화 논의 문서](01-plan/product-design-evolution.md) — 제안 7개·결정 질문·화면 방향 |
| 편성 방식·팀원용 공유 연출 | [편성 명세](02-design/formation-modes.md) — 확정 규칙·적용 범위·후속 구분 |
| 클랜 통계·역할별 함께한 기록/상대 전적 | [통계 명세](01-plan/pages/10-Clan-Stats.md) — 명예의 전당·내전 통계·경기 기록·개인 기록, 사이트 이용은 관리로 이전. 1차 구현 범위와 잔여 항목은 §7 참조 |
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

공용 반응·사진 꾸미기: [권한/규격](../src/lib/clan/cosmetics.ts) · [이모티콘 API](../src/app/api/games/[gameSlug]/clans/[clanId]/emojis/route.ts) · [관리](../src/components/main-clan/clan-emoji-settings.tsx) · [사진 표시](../src/components/main-clan/memory-photo.tsx) · [원본 비율 검증](../e2e/memory-photo-aspect-ratio.spec.ts) · [앨범 밀도/순서/반응형 검증](../e2e/memory-gallery-packing.spec.ts) · [한 줄 문구 검증](../e2e/memory-photo-caption.spec.ts) · [여러 스티커 조작](../src/components/main-clan/memory-sticker-editor.tsx) · [종류/팩 선택](../src/components/main-clan/memory-cosmetic-picker.tsx) · [배치 형식/검증](../src/lib/clan/photo-sticker.ts) · [상점 체험](../src/components/store/clan-photo-pack-preview.tsx) · [스티커 직접 조작/크기/회전·터치·저장](../e2e/memory-stickers.spec.ts) · [게시글 인접 이동/작성자 사진](../e2e/clan-board-article-navigation.spec.ts) · [격리 구매/업로드/RLS/꾸미기/모달 검증](../e2e/clan-cosmetics.spec.ts).

공용 이모티콘 작성/반응 확장: [공통 입력·표시·선택기](../src/components/main-clan/clan-emoji-content.tsx) · [정사각형 편집](../src/components/main-clan/clan-emoji-crop-dialog.tsx) · [이미지 변환](../src/lib/clan/process-emoji.ts) · [범용 반응 액션](../src/app/actions/clan-emoji-reactions.ts) · [조합·좌표/GIF·권한/디자인 검증](../e2e/clan-emoji-composition.spec.ts).
