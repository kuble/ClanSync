# 구현 진행도 — 세션 로그

> **허브**: [TODO.md](./TODO.md) — 상태·페이즈 링크·다음 프롬프트는 허브만 보면 된다.  
> **이 파일**: 히스토리만 쌓이므로 **일상 참조 시 `@TODO.md`만** 쓰고, 세션 종료·감사 시에만 이 파일을 연다.

<!-- 새 세션을 위에 추가 (최신이 위) -->

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

### 템플릿 (복사 후 사용)

```
### YYYY-MM-DD — (세션 제목)
- [ ] (이번 세션에서 끝낸 작업 1)
- [ ] (작업 2)
```
