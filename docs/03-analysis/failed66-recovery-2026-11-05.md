# 남은 브라우저 실패 66건 수정·검증

2026-11-05 KST. 앞선 로컬 재검사에서 남은 **66건 모두 통과**했다. 원래 실패 목록을 파일·전체 제목으로 대조했고 변경된 제목은 개별 대응했다. 반복 실행·추가 회귀는 66건에 중복 합산하지 않았다. 대상 66건의 건너뜀·미검증은 0건이다.

## 확인한 기능 수정

- 프로필 데이터 로딩 중 탭·모바일 선택기를 비활성화해 로딩 중 누른 탭이 데이터 도착 후 초기화되는 문제를 막았다.
- 게시판 댓글 저장 후 서버 재검증이 URL의 해시를 바꾸더라도 댓글창의 열린 상태와 초안을 유지한다. 글 이동·스크롤·공통 댓글 동작도 다시 확인했다.
- 개인 통계의 로딩 영역 높이를 유지하고 명예의 전당 설정창의 접근성 이름을 제목으로 고정했다. 존재하지 않는 멤버 주소는 멤버 목록을 표시한다.
- 대표 엠블럼 저장 중 같은 계정의 새 서버 데이터가 도착해도 저장 잠금을 조기에 해제하거나 결과를 버리지 않도록 했다. 계정·클랜 변경 시 이전 결과를 무효화하는 검사는 유지한다.
- 언어 저장 후 현재 화면이 갱신되지 않는 경로를 수정했다. 언어 변경 때만 문서를 새로 열고 계정 정보 탭을 유지한다. 페이지 이동·새로고침·재로그인 뒤 유지와 한국어 복귀를 확인했다.

## 검사 보정

현재 제품의 모바일 선택기·문구·이름 표시·에메랄드 범위·공개 정책에 맞춰 오래된 선택자와 기대값을 수정했다. 실제 로그인·활성 소속·개인정보 제외·비공개 통계·멤버 권한 거부는 계속 검증한다. 승부예측은 직접 테이블 쓰기 대신 허용된 RPC로 저장하고 직접 쓰기 거부도 확인한다.

테스트 준비 시 시작/종료와 가입/안내 완료 시각을 일관되게 지정했다. 댓글창은 hover·키보드·터치 동작을 구분하고, 로딩·전환 완료 후 목록·크기를 확인한다. 동시 경매 선택은 사라질 수 있는 브라우저 응답 본문 대신 HTTP 응답과 저장된 양 팀 선택·잔액·편성 완료를 함께 검증한다.

## 실행·자원

전용 로컬 Supabase에서 한 번에 한 묶음, 브라우저 worker 1·자동 재시도 0으로 실행했다. 각 브라우저 묶음은 프로덕션 빌드를 사용한다. 변경 코드 ESLint도 통과했다. 기존 3011 QA 계정·내전 기록, 클라우드 QA·운영 DB는 수정하지 않았다. 아래 모든 실행에서 종료 후 임시 계정·클랜·경기 0건을 확인했다.

| 실행 ID | 통과 / 실패 / 건너뜀 | DB 읽기+쓰기 ms | 임시 파일 / 교착 |
|---|---:|---:|---:|
| 2026-11-05T05-08-13-269Z-5eabc7b7 | 4 / 8 / 0 | 26.31 | 0 / 0 |
| 2026-11-05T05-13-35-820Z-a4be77f5 | 10 / 3 / 0 | 2.94 | 0 / 0 |
| 2026-11-05T05-20-13-115Z-e8405487 | 6 / 5 / 0 | 5.84 | 0 / 0 |
| 2026-11-05T05-26-06-850Z-e1a032d1 | 0 / 0 / 0 | 0.24 | 0 / 0 |
| 2026-11-05T05-28-36-629Z-0bcec88f | 9 / 5 / 0 | 4.37 | 0 / 0 |
| 2026-11-05T05-36-13-464Z-aef02d89 | 4 / 11 / 0 | 4.20 | 0 / 0 |
| 2026-11-05T05-40-54-695Z-2490cd3d | 9 / 6 / 1 | 3.05 | 0 / 0 |
| 2026-11-05T05-47-56-621Z-2da6633c | 18 / 9 / 0 | 6.33 | 0 / 0 |
| 2026-11-05T05-56-54-557Z-c46690be | 10 / 5 / 0 | 5.50 | 0 / 0 |
| 2026-11-05T06-03-17-265Z-ce84e79b | 3 / 2 / 0 | 3.36 | 0 / 0 |
| 2026-11-05T06-08-23-646Z-aad5daa9 | 1 / 1 / 0 | 3.34 | 0 / 0 |
| 2026-11-05T06-11-32-444Z-a762d5db | 0 / 1 / 0 | 1.11 | 0 / 0 |
| 2026-11-05T06-15-05-448Z-fe8b3b65 | 4 / 0 / 0 | 1.43 | 0 / 0 |

중간 실패는 원인 확인과 수정 전 결과다. 05:26 실행은 브라우저 시작 전 빌드 오류로 종료했으며 수정 후 다시 빌드했다. 공통 화면 묶음의 기존 보류 커뮤니티 1건은 대상 66건에 포함되지 않는다. 계측 구간은 앱 빌드·검사를 포함하며 DB 초기화·전체 정리 비용은 제외한다.

명예의 전당 댓글의 중간 실행에서 로컬 upstream 응답 오류 1회를 관측했다. 다음 독립 실행에서는 동일 시나리오가 끝까지 통과했다. 이는 해당 기능의 지속 실패가 재현되지 않았다는 뜻이며, 과거 클라우드 Disk IO 경고의 원인을 확정하거나 온라인 예산 회복을 증명하지 않는다.

## 66건별 최종 통과 근거

63건은 원래 제목과 직접 대조했다. 제목을 바꾼 3건은 파일과 시나리오로 개별 대응했다: `balance-session-live`의 고정 편성 시작 대기·실패·재시도, `clan-rules-scroll`의 현재 규칙 배너 이동·읽기 중 일시정지·동작 축소, `profile-visibility`의 등록 ID/인증 여부 공개와 계정 정보 비공개다. 현재 명세에 따라 바뀐 동작을 옛 정책의 통과로 해석하지 않는다.

| 검사 파일·줄 | 시나리오 | 최종 통과 실행 |
|---|---|---|
| e2e/balance-auction-flow.spec.ts:90 | 주장 전용 지명·입찰, 자동 경매와 공개 아이템 선택 후 편성 완료 | 2026-11-05T05-56-54-557Z-c46690be |
| e2e/balance-history-current.spec.ts:8 | 현재 내전 기록: 호버 닫힘·좌측 요약·모바일 순서·좌우 드래그·승률 정렬 | 2026-11-05T05-20-13-115Z-e8405487 |
| e2e/balance-insights.spec.ts:5 | 점수 토글·즉시 맵 비교·깜짝 결과 무보상과 데이터 삭제 | 2026-11-05T05-56-54-557Z-c46690be |
| e2e/balance-lobby.spec.ts:325 | 깜짝 내전: 클랜원 개설·참석 응답과 출전 명단 분리·동시 방 격리 | 2026-11-05T05-20-13-115Z-e8405487 |
| e2e/balance-member-preference.spec.ts:16 | 서로 다른 루프백 탭: 클랜원 선호 저장·프로필 복귀·운영진 조작 숨김 | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/balance-prediction-settings.spec.ts:77 | 경기 화면 간소화·Premium 승부예측 설정·관전자 드로워·점수 범위 | 2026-11-05T06-08-23-646Z-aad5daa9 |
| e2e/balance-profile-navigation.spec.ts:6 | 내전의 출전자·관전자는 네임카드로 프로필을 방문하고 운영 조작은 유지한다 | 2026-11-05T05-28-36-629Z-0bcec88f |
| e2e/balance-role-team-review.spec.ts:8 | 역할 자동배정 후 팀 조정·저장·공유 확인을 마쳐야 다음 단계로 진행한다 | 2026-11-05T05-20-13-115Z-e8405487 |
| e2e/balance-roster-dock.spec.ts:7 | 맵 팝업·배너와 클랜원 목록 네 방향 부착·드래그·되돌리기·자동 저장 | 2026-11-05T05-20-13-115Z-e8405487 |
| e2e/balance-session-live.spec.ts:102 | 고정 편성의 경기 시작 대기·실패·재시도 중 보드를 유지하고 조작을 막는다 | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/balance-session-live.spec.ts:204 | 독립 QA 세션: 자동 저장·개인 선호·화면 내 공유 추첨·자동 전환·기록 | 2026-11-05T05-20-13-115Z-e8405487 |
| e2e/clan-board-article-navigation.spec.ts:5 | article metadata precedes its title and footer actions adapt to desktop and mobile | 2026-11-05T05-56-54-557Z-c46690be |
| e2e/clan-board-comment-scroll.spec.ts:5 | board comments open in the hall-of-fame drawer and allow replies | 2026-11-05T05-56-54-557Z-c46690be |
| e2e/clan-board-reaction-people.spec.ts:12 | board comment reaction people: scoped names, keyboard, retry and access boundaries | 2026-11-05T05-13-35-820Z-a4be77f5 |
| e2e/clan-board-viewport.spec.ts:12 | board content fills the available viewport and scrolls the final notice fully into view | 2026-11-05T05-13-35-820Z-a4be77f5 |
| e2e/clan-board.spec.ts:19 | 클랜원 게시판 작성·댓글·공감·리플레이 상태·방송 채널·읽기 권한 | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/clan-channel-manual-live.spec.ts:8 | 방송 작성자 수동 상태·권한·편집 보존과 게시판 입력 스타일 | 2026-11-05T05-13-35-820Z-a4be77f5 |
| e2e/clan-coaching.spec.ts:76 | 클랜원 선생님 등록·지정 신청·담당 상태·참여자 댓글 알림과 신청 중단 | 2026-11-05T05-40-54-695Z-2490cd3d |
| e2e/clan-comment-parity.spec.ts:33 | board and stats comments share basic and custom emoji behavior | 2026-11-05T05-56-54-557Z-c46690be |
| e2e/clan-discord-notifications.spec.ts:340 | notification links survive sign-in/sign-up, game verification and clan approval; exact event, notice, poll and reservation open | 2026-11-05T05-28-36-629Z-0bcec88f |
| e2e/clan-discovery-eligibility.spec.ts:5 | discovery filters account demographics before pagination and preserves other filters | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/clan-emoji-composition.spec.ts:25 | custom emojis compose posts, board/stat comments and all reaction targets with square crop UI | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/clan-inquiry.spec.ts:7 | pending applicant can reopen the shared clan room until their request is resolved | 2026-11-05T05-08-13-269Z-5eabc7b7 |
| e2e/clan-leadership-transfer.spec.ts:5 | leader confirms a transfer from members, becomes a member and loses management access | 2026-11-05T05-28-36-629Z-0bcec88f |
| e2e/clan-line-tabs.spec.ts:7 | 관리 중복 행 제거·탭 설명·마우스/키보드/터치와 공통 탭 이동 | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/clan-management.spec.ts:7 | officers manage real notices and rules across management and dashboard | 2026-11-05T05-28-36-629Z-0bcec88f |
| e2e/clan-member-record-links.spec.ts:4 | members show game verification without emails and link to authorized personal records | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/clan-participants.spec.ts:138 | completed guest rounds preserve scores, history identity and next-session evaluation across linking and undo | 2026-11-05T05-28-36-629Z-0bcec88f |
| e2e/clan-promotion.spec.ts:12 | clan promotion appears during clan discovery and accepts applications outside recruitment preferences | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/clan-request-isolation.spec.ts:29 | RSC request data stays isolated between accounts and refreshes changed permissions | 2026-11-05T05-56-54-557Z-c46690be |
| e2e/clan-rules-scroll.spec.ts:4 | rules advance every eight seconds, pause while reading, and respect reduced motion | 2026-11-05T05-28-36-629Z-0bcec88f |
| e2e/clan-stats-periods.spec.ts:11 | stats: period-wide filters, popup selectors, tooltip, record tab and staff qualification boundary | 2026-11-05T05-28-36-629Z-0bcec88f |
| e2e/clan-stats-settings.spec.ts:78 | stats settings: tab scopes, granular record grants and private payloads | 2026-11-05T05-28-36-629Z-0bcec88f |
| e2e/design-followup.spec.ts:69 | board, coaching, records and profile editors share fixed actions on mobile | 2026-11-05T05-56-54-557Z-c46690be |
| e2e/flash-settings-visibility.spec.ts:6 | flash rooms hide scores and unavailable settings for member hosts and clan leaders | 2026-11-05T05-20-13-115Z-e8405487 |
| e2e/frontend-rebuild.spec.ts:143 | separate stores cancel purchases without changing balances or ownership | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/game-link.spec.ts:9 | nickname-free signup retains errors and a new profile displays the full BattleTag | 2026-11-05T05-40-54-695Z-2490cd3d |
| e2e/header-layout.spec.ts:41 | public headers share logo scale and fit desktop/mobile in dark | 2026-11-05T06-03-17-265Z-ce84e79b |
| e2e/header-layout.spec.ts:51 | account, community and clan headers fit desktop/mobile in dark | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/header-layout.spec.ts:41 | public headers share logo scale and fit desktop/mobile in light | 2026-11-05T06-03-17-265Z-ce84e79b |
| e2e/header-layout.spec.ts:51 | account, community and clan headers fit desktop/mobile in light | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/hof-comments.spec.ts:94 | HoF reactions: persist, separate category/period, paginate and moderate | 2026-11-05T05-56-54-557Z-c46690be |
| e2e/light-theme.spec.ts:100 | light desktop routes, account onboarding and the bannerless clan hero fit mobile | 2026-11-05T05-40-54-695Z-2490cd3d |
| e2e/light-theme.spec.ts:152 | light stats, reservation and live match settings stay within 320px and 390px | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/loading-layouts.spec.ts:15 | 지연·실패·재시도 중 통계의 필터·소개·카드 영역을 유지한다 | 2026-11-05T05-40-54-695Z-2490cd3d |
| e2e/memory-gallery-packing.spec.ts:7 | mixed photo heights pack tightly in posting order across responsive columns | 2026-11-05T05-13-35-820Z-a4be77f5 |
| e2e/namecard-frames-and-symbol-colors.spec.ts:7 | symbol colors and ten free frames persist across cards, profiles and comment avatars | 2026-11-05T05-13-35-820Z-a4be77f5 |
| e2e/normal-symbols.spec.ts:7 | five free symbols apply without purchases and follow the player into comments | 2026-11-05T05-40-54-695Z-2490cd3d |
| e2e/personal-emblem-awards.spec.ts:10 | award cases prefer the best recent grade and filter full history by gold, silver and bronze | 2026-11-05T06-03-17-265Z-ce84e79b |
| e2e/personal-emblem-case.spec.ts:5 | 공통 엠블럼 케이스: 공개 권한·계열 성장·대표 저장·프로필/개인기록 공유 | 2026-11-05T05-36-13-464Z-aef02d89 |
| e2e/personal-emblem-library.spec.ts:11 | 게임 아이콘 필터와 월간·연간 진열은 키보드·모바일·상세 이력을 유지한다 | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/personal-store.spec.ts:24 | 기본 디자인과 공통 잔액은 여러 게임 클랜에서 동일하다 | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/player-profile-display.spec.ts:5 | personal banners use game-specific BattleTags and signup details within personal-record access | 2026-11-05T05-36-13-464Z-aef02d89 |
| e2e/profile-account-help.spec.ts:6 | 계정 안내는 제목 툴팁으로 표시하고 네임카드는 모바일까지 폭을 채운다 | 2026-11-05T06-15-05-448Z-fe8b3b65 |
| e2e/profile-game-identities.spec.ts:6 | 게임 이름으로 클랜을 선택하고 모바일·스와이프·키보드로 탐색한다 | 2026-11-05T06-15-05-448Z-fe8b3b65 |
| e2e/profile-introduction-details.spec.ts:4 | 소개의 부계정은 게임과 공개 권한을 따르고 비공개 통계의 멤버도 검색한다 | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/profile-language.spec.ts:5 | account language persists across pages, reloads and sign-ins | 2026-11-05T06-15-05-448Z-fe8b3b65 |
| e2e/profile-role-preference.spec.ts:10 | 프로필 선호는 연속 저장 후 즉시 다시 편집되며 실패 시 마지막 확정값으로 복구된다 | 2026-11-05T06-15-05-448Z-fe8b3b65 |
| e2e/profile-visibility.spec.ts:7 | 통합 소개 API는 로그인 방문자에게 등록 ID와 인증 여부를 공개하고 계정·보관함·내부 ID를 제외한다 | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/profile-withdrawal-data.spec.ts:12 | 실제 클랜·계정 탈퇴는 개인 데이터 삭제와 공동 기록 보존 안내에 일치한다 | 2026-11-05T05-36-13-464Z-aef02d89 |
| e2e/stats-profile-navigation.spec.ts:6 | 개인 기록의 공통 네임카드는 해당 플레이어 소개로, 엠블럼은 해당 플레이어 케이스로 연결한다 | 2026-11-05T05-36-13-464Z-aef02d89 |
| e2e/stats-profile-navigation.spec.ts:98 | 모든 역할은 멤버 검색으로 시작하고 통계 제한 대상도 소개를 연다 | 2026-11-05T05-47-56-621Z-2da6633c |
| e2e/ui-regression.spec.ts:15 | UI 회귀 — MainClan (QA 리더) / 대시보드·탭 URL·헤딩 로드 | 2026-11-05T05-56-54-557Z-c46690be |
| e2e/ui-regression.spec.ts:35 | UI 회귀 — MainClan (QA 리더) / 헤더: 커뮤니티·프로필·게임 선택 링크 | 2026-11-05T05-40-54-695Z-2490cd3d |
| e2e/ui-regression.spec.ts:67 | UI 회귀 — MainClan (QA 리더) / 이벤트는 캘린더·투표만 제공하고 구형 대진표 주소는 캘린더로 연다 | 2026-11-05T05-40-54-695Z-2490cd3d |
| e2e/ui-regression.spec.ts:132 | UI 회귀 — 무소속 멤버 픽스처 / 오버워치 클랜 온보딩 허브 | 2026-11-05T05-40-54-695Z-2490cd3d |

원시 결과·trace·DB 지표는 `.local-tests/runs/{실행 ID}/`, 대조 목록은 `.tmp/fix66-baseline.json`·`.tmp/fix66-latest.json`에 있다. 실행 현황은 `http://localhost:3040`에서 확인한다.

이번 범위는 남아 있던 실패 66건과 영향받는 추가 회귀다. 이전 전체 검사의 미실행·보류 항목까지 전체 회귀가 완료됐다는 의미는 아니다. 운영 배포는 하지 않았다.
