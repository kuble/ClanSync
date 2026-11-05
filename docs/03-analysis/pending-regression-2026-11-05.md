# 미실행·보류 검사와 전체 누적 결과 — 2026-11-05

후속: 아래 당시의 문체 실패는 51개 표현 수정 후 단위 검사 32/32 통과로 해소했다. 통계·엠블럼 쓰기 최적화와 DB 186항목 재검증은 [후속 검증](stats-write-optimization-2026-11-05.md)에 별도 기록한다. 이 문서의 당시 실행 수치는 소급해 바꾸지 않는다.

공유 QA 3011의 계정·클랜·내전 기록에 쓰기·시드를 실행하지 않았다. 전용 로컬 DB `clansync-automated-tests`(55431)와 검사 서버 3010만 사용했다. 운영 DB·배포는 변경하지 않았다.

## 집계

| 구분 | 통과 | 실패 | 기능 보류 | 근거 |
|---|---:|---:|---:|---|
| 브라우저 누적 최신 358건 | 352 | 0 | 6 | 기존 357건 + 로컬 API 인증 1건 |
| 그중 이전 미실행·조건부 38건 | 32 | 0 | 6 | 로그인 13·권한 16·개발 화면 2·대용량 1, 커뮤니티 6 |
| DB 29개 파일 | 182 | 0 | 0 | 상위 검사 묶음을 포함하는 실행기 집계 |
| 유틸리티·검사 도구 단위 검사 | 31 | 1 | 0 | 12개 파일·32건을 호스트에서 재실행 |
| 시작 시 정리 도구 | 통과 | 0 | 0 | 활성 QA·검사 서버, 설정·백업 보존 자체 검사 |

브라우저는 **누적 최신 결과**이며 한 번의 전체 실행 결과가 아니다. 181건은 전용 로컬 실행 근거가 있고, 171건은 앞선 전체 실행의 통과 근거를 유지한다. 이전 142개 실패는 로컬에서 모두 해결했으며, 이번에는 남은 38개를 대조했다. 반복 실행·관련 재확인 항목을 중복 합산하지 않았다. [항목별 전체 CSV](regression-results-2026-11-05.csv), [앞선 66건 복구](failed66-recovery-2026-11-05.md), [이전 DB·브라우저 재현](local-failure-bottlenecks-2026-11-05.md).

## 이번에 보완한 검사

- Playwright 목록 읽기가 Node 전용 실행기 변환 오류로 중단됐다. 초대 만료 도우미를 별도 Node 프로세스로 실행해 358건 목록과 초대 가입 검사를 확인했다.
- 에메랄드를 빠뜨린 연속 티어 범위 검사를 보정하고, 에메랄드 없는 범위를 연속 범위로 잘못 축약하지 않는 단언을 추가했다.
- 개인 기록 검사는 현재의 항목별 공개 정책을 따른다. 일반 멤버의 원본 기록·타인 포인트·운영진 편집 권한 차단은 유지하고, 설정 저장과 실제 API 응답·DB 값·화면 갱신을 확인했다. 역할별 점수 저장 후 특정 URL 호출을 강제하던 대기를 실제 갱신 결과 단언으로 대체했다.
- 개발 전용 배너 화면에만 로컬 개발 서버 모드를 제공했다. 일반 검사는 계속 프로덕션 빌드·worker 1·재시도 0이다. 게시판·코칭·반응 슬롯 DB 파일 3개(16개 항목)를 기본 DB 전체 명령에 추가했다.
- 1만 경기 검사에서 조회·정정·기존 조회 비교는 성공했으나, UUID 250개를 URL 필터로 보내는 종료 정리가 `URI too long`으로 실패했다. 삭제 묶음을 100개로 줄여 생성부터 삭제까지 재검증했다. 첫 실패 때도 외부 실행기의 로컬 전체 초기화는 완료됐다.
- 임시 진단 산출물 `.tmp`를 소스 린트 대상에서 제외했다. 전체 린트 오류 0, 기존 경고 1(`clan-balance-settings.tsx`의 `tx` 의존성), 타입 검사 통과. 프로덕션 브라우저 묶음마다 빌드를 통과했다.

## 남은 실패와 기능 보류

유일한 단위 검사 실패는 `scripts/ui-formal-copy.test.mjs`다. 격식체 정책(`docs/01-plan/slices/slice-00-conventions.md`)에 비추어 51개 표현을 지적한다. 예: 가입 안내의 “주세요”, 로그인·랜딩의 “시작하세요”, 소개 예시의 “나눠요”. 이번 검증에서는 화면 문구를 일괄 바꾸거나 이 검사를 무력화하지 않았다. 기능 오류와 별개지만 전체 검사 성공으로 간주하지 않는다. 상세 위치는 아래 목록에 보존한다.

커뮤니티 화면 6건은 제품에서 해당 진입 자체가 보류되어 실행하지 않았다. 조건부 실행 누락이나 통과로 집계하지 않으며, 기존 홍보·클랜 찾기 대체 흐름과 구분한다:

- `e2e/design-followup.spec.ts:116` — community composers keep their actions visible and preserve real post submission
- `e2e/frontend-rebuild.spec.ts:37` — community promotion modal publishes a real post and opens its detail
- `e2e/frontend-rebuild.spec.ts:76` — KST LFG modal defaults to a future local deadline and stores the same UTC instant
- `e2e/frontend-rebuild.spec.ts:115` — 390px community menu closes after navigation and browser history restores the tab
- `e2e/navigation-feedback.spec.ts:51` — promotion sorting preserves filters and browser history without refetching the hub
- `e2e/ui-regression.spec.ts:90` — UI 회귀 — MainGame 커뮤니티 탭 › 홈·홍보·LFG·순위·스크림 패널 문구 확인

## 남은 38건 대조

| 파일 | 검사 | 최신 결과 | 로컬 실행 ID |
|---|---|---|---|
| clan-banner-studio.spec.ts:56 | 색상은 추가 이미지 요청·영역 교체 없이 변경하고 10개 패턴에서 재사용한다 | 통과 | 2026-11-05T06-53-25-384Z-15652184 |
| clan-banner-studio.spec.ts:97 | 색상 키보드·터치 선택과 주소 복원·잘못된 선택의 기본값을 지원한다 | 통과 | 2026-11-05T06-53-25-384Z-15652184 |
| clan-stats-scale.spec.ts:6 | statistics scale benchmark uses an isolated 10,000-match clan | 통과 | 2026-11-05T07-01-28-259Z-cfb3f5f4 |
| design-followup.spec.ts:116 | community composers keep their actions visible and preserve real post submission | 기능 보류 | — |
| fixture-login.spec.ts:10 | QA 픽스처 계정 로그인 › QA_Leader_01 (@clansync-qa.local) | 통과 | 2026-11-05T06-38-03-318Z-c6fe8047 |
| fixture-login.spec.ts:10 | QA 픽스처 계정 로그인 › QA_Admin_01 (@clansync-qa.local) | 통과 | 2026-11-05T06-38-03-318Z-c6fe8047 |
| fixture-login.spec.ts:10 | QA 픽스처 계정 로그인 › QA_Member_02 (@clansync-qa.local) | 통과 | 2026-11-05T06-38-03-318Z-c6fe8047 |
| fixture-login.spec.ts:10 | QA 픽스처 계정 로그인 › QA_Member_03 (@clansync-qa.local) | 통과 | 2026-11-05T06-38-03-318Z-c6fe8047 |
| fixture-login.spec.ts:10 | QA 픽스처 계정 로그인 › QA_Member_04 (@clansync-qa.local) | 통과 | 2026-11-05T06-38-03-318Z-c6fe8047 |
| fixture-login.spec.ts:10 | QA 픽스처 계정 로그인 › QA_Member_05 (@clansync-qa.local) | 통과 | 2026-11-05T06-38-03-318Z-c6fe8047 |
| fixture-login.spec.ts:10 | QA 픽스처 계정 로그인 › QA_Member_06 (@clansync-qa.local) | 통과 | 2026-11-05T06-38-03-318Z-c6fe8047 |
| fixture-login.spec.ts:10 | QA 픽스처 계정 로그인 › QA_Member_07 (@clansync-qa.local) | 통과 | 2026-11-05T06-38-03-318Z-c6fe8047 |
| fixture-login.spec.ts:10 | QA 픽스처 계정 로그인 › QA_Member_08 (@clansync-qa.local) | 통과 | 2026-11-05T06-38-03-318Z-c6fe8047 |
| fixture-login.spec.ts:10 | QA 픽스처 계정 로그인 › QA_Member_09 (@clansync-qa.local) | 통과 | 2026-11-05T06-38-03-318Z-c6fe8047 |
| fixture-login.spec.ts:10 | QA 픽스처 계정 로그인 › QA_Member_10 (@clansync-qa.local) | 통과 | 2026-11-05T06-38-03-318Z-c6fe8047 |
| fixture-login.spec.ts:10 | QA 픽스처 계정 로그인 › QA_Member_11 (@clansync-qa.local) | 통과 | 2026-11-05T06-38-03-318Z-c6fe8047 |
| fixture-login.spec.ts:10 | QA 픽스처 계정 로그인 › QA_Member_12 (@clansync-qa.local) | 통과 | 2026-11-05T06-38-03-318Z-c6fe8047 |
| frontend-rebuild.spec.ts:37 | community promotion modal publishes a real post and opens its detail | 기능 보류 | — |
| frontend-rebuild.spec.ts:76 | KST LFG modal defaults to a future local deadline and stores the same UTC instant | 기능 보류 | — |
| frontend-rebuild.spec.ts:115 | 390px community menu closes after navigation and browser history restores the tab | 기능 보류 | — |
| navigation-feedback.spec.ts:51 | promotion sorting preserves filters and browser history without refetching the hub | 기능 보류 | — |
| security-fix-boundaries.spec.ts:73 | alternate accounts require a shared clan for the same game; owners retain access | 통과 | 2026-11-05T06-45-10-211Z-d09926ba |
| security-fix-boundaries.spec.ts:85 | single-choice concurrent first votes replace atomically; multiple choice remains supported | 통과 | 2026-11-05T06-45-10-211Z-d09926ba |
| security-fix-boundaries.spec.ts:103 | history RLS preserves live access and staff/own-open-flash history only | 통과 | 2026-11-05T06-45-10-211Z-d09926ba |
| security-fix-boundaries.spec.ts:118 | delegated score editors persist only allowed fields and cannot modify other round state | 통과 | 2026-11-05T06-45-10-211Z-d09926ba |
| security-fix-boundaries.spec.ts:137 | prediction changes racing settlement conserve clan/personal coins and cannot change afterward | 통과 | 2026-11-05T06-45-10-211Z-d09926ba |
| security-fix-boundaries.spec.ts:160 | closed map/hero ballot snapshots include accepted votes and reject stale identities | 통과 | 2026-11-05T06-45-10-211Z-d09926ba |
| security-fix-boundaries.spec.ts:181 | concurrent scrim confirmations promote once; old schedules cannot hide upcoming rooms | 통과 | 2026-11-05T06-45-10-211Z-d09926ba |
| security-fix-boundaries.spec.ts:199 | LFG counts are consistent for viewers without exposing other applicants | 통과 | 2026-11-05T06-45-10-211Z-d09926ba |
| security-fix-boundaries.spec.ts:210 | member management request renders access denied instead of E488 | 통과 | 2026-11-05T06-45-10-211Z-d09926ba |
| security-fix-boundaries.spec.ts:217 | member dashboard and statistics retain aggregate totals without historical raw records | 통과 | 2026-11-05T06-45-10-211Z-d09926ba |
| security-fix-boundaries.spec.ts:243 | site-usage source rows are visible to staff but hidden from members | 통과 | 2026-11-05T06-45-10-211Z-d09926ba |
| security-fix-boundaries.spec.ts:254 | pool prediction picks are private while aggregate totals remain shared | 통과 | 2026-11-05T06-45-10-211Z-d09926ba |
| security-fix-boundaries.spec.ts:303 | statistics use four sections and site usage appears in staff management | 통과 | 2026-11-05T06-57-19-064Z-9de81d58 |
| security-fix-boundaries.spec.ts:340 | personal records expose only the sections selected by staff to members | 통과 | 2026-11-05T06-45-10-211Z-d09926ba |
| security-fix-boundaries.spec.ts:396 | staff can inspect prediction payouts and edit completed evaluation scores | 통과 | 2026-11-05T06-49-27-950Z-da6aaee1 |
| security-fix-boundaries.spec.ts:492 | UTC calendar can select a month-end Korean occurrence | 통과 | 2026-11-05T06-45-10-211Z-d09926ba |
| ui-regression.spec.ts:90 | UI 회귀 — MainGame 커뮤니티 탭 › 홈·홍보·LFG·순위·스크림 패널 문구 확인 | 기능 보류 | — |

## 로컬 실행·정리

| 실행 ID | 모드 | 통과/실패/건너뜀 | 종료 후 계정·클랜·경기 |
|---|---|---|---|
| 2026-11-05T06-38-03-318Z-c6fe8047 | e2e | 15/0/0 | 0/0/0 |
| 2026-11-05T06-40-42-750Z-5ee63ee7 | e2e | 12/5/0 | 0/0/0 |
| 2026-11-05T06-45-10-211Z-d09926ba | e2e | 15/2/0 | 0/0/0 |
| 2026-11-05T06-49-27-950Z-da6aaee1 | e2e | 1/1/0 | 0/0/0 |
| 2026-11-05T06-53-25-384Z-15652184 | e2e | 5/0/0 | 0/0/0 |
| 2026-11-05T06-55-21-564Z-473a5e82 | db | 16/0/0 | 0/0/0 |
| 2026-11-05T06-57-19-064Z-9de81d58 | e2e | 1/1/0 | 0/0/0 |
| 2026-11-05T07-01-28-259Z-cfb3f5f4 | e2e | 1/0/0 | 0/0/0 |

실행 이력·실패 trace·전후 DB 통계는 `.local-tests/runs/<실행 ID>/`에 있다. 로컬 현황은 `http://127.0.0.1:3040`에서 확인한다. 초기 실패 실행은 삭제하거나 통과로 덮어쓰지 않았다.

| 실행 ID | 측정 구간 초 | 블록 읽기 MiB | DB 읽기/쓰기 ms | WAL 기록/동기화 ms | 임시 파일 bytes / 교착 |
|---|---:|---:|---:|---:|---:|
| 2026-11-05T06-38-03-318Z-c6fe8047 | 59.306 | 1.22 | 21.5 | 138.5 | 0 / 0 |
| 2026-11-05T06-40-42-750Z-5ee63ee7 | 148.74 | 1.3 | 7.3 | 357.5 | 0 / 0 |
| 2026-11-05T06-45-10-211Z-d09926ba | 152.73 | 1.34 | 5.4 | 310.3 | 0 / 0 |
| 2026-11-05T06-49-27-950Z-da6aaee1 | 134.428 | 1.26 | 2.7 | 144.7 | 0 / 0 |
| 2026-11-05T06-53-25-384Z-15652184 | 15.14 | 0.11 | 0.2 | 15 | 0 / 0 |
| 2026-11-05T06-55-21-564Z-473a5e82 | 5.376 | 1.02 | 1.8 | 61.5 | 0 / 0 |
| 2026-11-05T06-57-19-064Z-9de81d58 | 101.868 | 1.23 | 35.1 | 433.4 | 2560729044 / 0 |
| 2026-11-05T07-01-28-259Z-cfb3f5f4 | 158.761 | 0.97 | 38.5 | 999.5 | 6767205029 / 0 |

위 수치는 준비·시드와 종료 후 전체 초기화 비용을 제외하며, 브라우저 묶음은 앱 빌드 시간을 포함한다. 온라인 Supabase의 Disk IO Budget 회복이나 운영 환경 성능을 입증하는 수치는 아니다.

## 1만 경기 성능과 병목

최종 실행 `2026-11-05T07-01-28-259Z-cfb3f5f4`는 10명·1만 경기·10만 출전 행을 생성하고, 조회·결과 정정·날짜 조회·기존 방식 비교·삭제까지 통과했다.

| 작업 | 관측 시간 | 응답 크기 |
|---|---:|---:|
| 현재 통계 모델 조회 3회 | 63 / 25 / 26ms | 40,541 bytes |
| 결과 한 건 정정 | 1,242ms | — |
| 하루 경기 조회 | 23ms | 35,888 bytes |
| 비교용 기존 전체 기록 조회 | 23,539ms | 214,792 bytes |

일반 작은 검사 묶음에서는 임시 파일 쓰기가 0이었지만, 대량 생성·정정·삭제를 포함한 최종 측정 구간에는 **약 6.30GiB의 누적 임시 파일 쓰기**가 발생했다. 남아 있는 데이터 크기가 아니다. 가장 큰 요청은 `private.refresh_clan_stats` 142회·누적 약 87.49초였으며 임시 블록 쓰기가 이 요청에 집중됐다. 함수 자체 시간도 전체 통계 재계산 약 52.56초, 개인 엠블럼 갱신 약 34.79초였다. 요청·중첩 함수 시간을 서로 합산하지 않는다.

따라서 이 자료에서 우선 추적할 비용은 **대량 변경 때 반복되는 전체 통계·엠블럼 재계산**이다. 읽기 화면 응답 시간만으로 DB 부하가 작다고 판단할 수 없다. 정리 요청 길이 오류를 고친 것은 검사 안정성 보완이며, 이 재계산 비용을 최적화한 것은 아니다. 합성 자료 한 묶음의 관측이므로 운영 성능이나 과거 온라인 QA의 I/O 예산 소진 원인을 단정하지 않는다. 서로 다른 두 실행의 수치를 빼서 정확한 삭제 비용으로 해석하지 않는다.

## 문체 검사 지적 위치

- `src/app/actions/clan-event-notify.ts:16: 주세요`
- `src/app/actions/clan-event-notify.ts:58: 주세요`
- `src/app/actions/clan-event-notify.ts:68: 주세요`
- `src/app/api/games/[gameSlug]/clans/[clanId]/promotion/route.ts:7: 주세요`
- `src/app/contact/page.tsx:14: 들려주세요`
- `src/app/contact/page.tsx:15: 만나요`
- `src/app/contact/page.tsx:15: 나눠주세요`
- `src/app/dev/hof-summary/page.tsx:30: 보세요`
- `src/app/page.tsx:9: 시작하세요`
- `src/app/sign-in/sign-in-form.tsx:26: 이어가세요`
- `src/app/sign-in/sign-in-form.tsx:47: 없으신가요`
- `src/app/sign-up/sign-up-form.tsx:33: 만나보세요`
- `src/app/sign-up/sign-up-form.tsx:70: 있으신가요`
- `src/components/entry/auth-shell.tsx:16: 이어가세요`
- `src/components/entry/auth-shell.tsx:17: 준비하세요`
- `src/components/entry/auth-shell.tsx:17: 정해보세요`
- `src/components/entry/landing/clan-activity-preview.tsx:21: 나눠요`
- `src/components/entry/landing/clan-activity-preview.tsx:24: 모아두세요`
- `src/components/entry/landing/clan-activity-preview.tsx:28: 정해요`
- `src/components/entry/landing/clan-activity-preview.tsx:28: 확인하세요`
- `src/components/entry/landing/clan-activity-preview.tsx:31: 받아보세요`
- `src/components/entry/landing/formation-modes-preview.tsx:10: 나눠요`
- `src/components/entry/landing/formation-modes-preview.tsx:10: 있어요`
- `src/components/entry/landing/formation-modes-preview.tsx:11: 정해요`
- `src/components/entry/landing/formation-modes-preview.tsx:11: 겨뤄보세요`
- `src/components/entry/landing/formation-modes-preview.tsx:12: 더해요`
- `src/components/entry/landing/landing-page.tsx:79: 준비해요`
- `src/components/entry/landing/landing-page.tsx:88: 돌아보세요`
- `src/components/entry/landing/landing-page.tsx:98: 지원하나요`
- `src/components/entry/landing/landing-page.tsx:99: 무료인가요`
- `src/components/entry/landing/landing-page.tsx:100: 있나요`
- `src/components/entry/landing/landing-page.tsx:104: 보세요`
- `src/components/entry/landing/notification-example.tsx:9: 좋을까요`
- `src/components/entry/landing/records-preview.tsx:18: 살펴보세요`
- `src/components/entry/landing/records-preview.tsx:19: 살펴보세요`
- `src/components/entry/landing/records-preview.tsx:20: 확인해요`
- `src/components/main-clan/clan-coach-directory.tsx:47: 알려주세요`
- `src/components/main-clan/clan-discord-settings.tsx:74: 주세요`
- `src/components/main-clan/clan-discord-settings.tsx:127: 해제할까요`
- `src/components/main-clan/clan-invite-share.tsx:71: 초대하세요`
- `src/components/main-clan/clan-member-welcome.tsx:56: 주세요`
- `src/components/main-clan/clan-member-welcome.tsx:67: 주세요`
- `src/components/main-clan/clan-promotion-settings.tsx:110: 주세요`
- `src/components/main-clan/clan-promotion-settings.tsx:139: 주세요`
- `src/components/main-clan/clan-promotion-settings.tsx:140: 주세요`
- `src/components/main-clan/clan-promotion-settings.tsx:160: 주세요`
- `src/components/main-clan/promotion-editor.tsx:132: 적어보세요`
- `src/components/onboarding/clan-join-list.tsx:103: 주세요`
- `src/components/onboarding/inquiry-button.tsx:157: 보세요`
- `src/components/onboarding/inquiry-button.tsx:162: 입력하세요`
- `src/components/profile/profile-language.tsx:39: 주세요`
