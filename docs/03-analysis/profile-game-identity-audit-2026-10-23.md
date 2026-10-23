# 계정 닉네임·게임 ID 표시 점검

2026-10-23 사용자 결정: 가입 시 계정 닉네임을 받지 않는다. 공통 프로필에 별도 닉네임을 만들지 않고, 클랜별 게임 ID로 플레이어를 식별한다.

## 이번 반영

| 위치 | 표시 규칙 |
|---|---|
| 내 프로필·방문 프로필 | 닉네임·닉네임 첫 글자 아바타 제거. 기본 아바타와 소개 사용. 중복 게임 목록·클랜 소제목 제거 |
| 클랜별 프로필 콜아웃 | 게임 로고·클랜·역할·전체 배틀태그/라이엇 ID와 해당 클랜의 대표 엠블럼을 묶음. 여러 소속은 캐러셀로 탐색 |
| 미니룸 | 개인 이름 대신 `나의 방` |
| 게임 선택의 계정 메뉴 | 기본 아바타·`내 계정`·본인 이메일 |
| 참가자 기록 연결의 현재 계정 | 본인 이메일과 계정 ID 일부. 연결 대상의 게스트 기록명은 보존 |
| 공개 방문 | `미니룸 공개`와 `함께하는 클랜`을 켰을 때 모든 로그인 방문자에게 해당 클랜의 인증된 게임 ID 제공. 이메일·내부 제공자 ID·코인·보관함·계정 정보는 제외 |
| 공통 네임카드 미리보기 | `Player#1234` 예시 유지. 클랜에서는 해당 게임의 실제 ID 표시 |

## 다음 정리 대상으로 선별한 사용처

아래는 `users.nickname` 직접 조회와 실제 표시로 이어지는 경로를 확인한 목록이다. 이번 작업에서 기능 전체를 일괄 변경하지 않았다. 계정 공통 캐시는 다른 게임의 클랜 이름으로 사용할 수 없으므로 게임별 ID 조회로 옮길 대상이다.

| 파일·구간 | 확인 내용 | 정리 방향 |
|---|---|---|
| [clan-manage-content](../../src/components/main-clan/clan-manage-content.tsx) 공지·가입 신청·구성원·구매 이력 | 작성자/신청자/구성원/구매자 이름에 계정 닉네임을 조회하는 네 구간. 구성원 행은 현재 계정 값이 클랜 레이블보다 우선 | 해당 클랜 게임 ID 우선. 운영자 권한·탈퇴자와 기록 주체 ID는 유지 |
| [clan-balance-room-data](../../src/components/main-clan/clan-balance-room-data.tsx) 방장 표시 | `hostRow.nickname` 사용 | 방의 클랜 게임 ID로 표시 |
| [load-clan-polls](../../src/lib/clan/load-clan-polls.ts) 공개 투표 참여자 | `users.nickname`을 참여자 이름으로 매핑 | 투표의 클랜 게임 ID로 표시. 익명 투표의 비공개 정책 유지 |
| [hof-comments](../../src/app/actions/hof-comments.ts) 댓글 저장 직후 | 저장 직후 계정 이름, 재조회 시 `clan_peer_nicknames`를 사용 | 두 경로의 표시 출처 통일 |
| [clan-events](../../src/app/actions/clan-events.ts) 참석자 목록 | `user_game_profiles.nickname` 조회 후 `users.nickname` 대체값 사용 | 검증된 `battle_tag`/`riot_id`로 전환 |
| [participant_label·clan_peer_nicknames](../../supabase/migrations/20261015101934_clan_participant_identity.sql) 공통 클랜 레이블 | `users.nickname` 호환 캐시·게스트 이름·구분 별칭으로 문자열 생성. 통계/로비/게시판 등 여러 호출자가 `nickname`이라는 반환 필드명을 공유 | 중앙 조회부터 게임별 출처로 바꾸되 기존 두 열 RPC 계약과 게스트/과거 기록의 식별자를 보존 |

`nickname`이라는 코드 필드명을 전부 삭제하는 방식은 피한다. 게스트가 신고한 기록명·중복 구분 별칭, 과거 경기 스냅샷, 테스트 픽스처 식별자는 별도 의미가 있다. [미사용 ProfileEmblemCollections](../../src/components/profile/profile-emblem-collections.tsx)도 옛 `nickname` prop을 보유하지만 현재 화면의 호출자는 없다.

## DB 호환 필드

`users.nickname`은 아직 기존 기능의 호환 캐시다. [트리거](../../supabase/migrations/20261015140514_battletag_display_names.sql)가 기본값 `새 회원`을 만들고 오버워치 인증 시 배틀태그의 `#` 이전 부분으로 갱신한다. 가입 입력값이 없다는 이유로 지금 컬럼이나 기록을 지우면 기존 조회가 깨진다. 위 사용처를 바꾼 후 컬럼 정리를 별도로 판단한다.

## QA 임시 ID

- [허용 목록](../../scripts/fixtures/qa-fixtures.mjs)의 14계정만 대상으로 [QA 보정 스크립트](../../scripts/qa-game-identities.mjs)를 실행했다. 14개 모두 인증 표시가 이미 켜져 있었고 비어 있던 배틀태그를 채웠다. 예: `QALeader01#1001`, `QAMember02#2002`.
- `node scripts/qa-game-identities.mjs`는 변경 예정만 조회한다. `--apply`를 명시해야 쓴다. QA 프로젝트를 강제하며 기존에 채운 게임 ID는 덮어쓰지 않는다. 다시 실행한 결과 변경0건을 확인했다.
- 제공자 `game_uid`·로그인·사용자 ID를 유지한다. 코인과 방/가구 전체 스냅샷이 전후 동일한지 스크립트가 확인한다. `users.nickname` 호환 캐시는 기존 배틀태그 트리거에 따라 이름 부분으로 동기화된다.
- QA 표시 데이터이며 실제 외부 OAuth 증명을 만들지 않는다. 기존 명단을 시드로 다시 생성하지 않았다. 이후 명시적으로 시드할 때도 같은 임시 배틀태그를 사용하도록 보완했다.
