# 검증 기록

2026-10-16. 기준 커밋 `1f1a619`, QA DB allowlist는 `scripts/test-env.mjs`를 사용했다. 사용자 QA 서버 3011의 빌드 경로와 명단은 건드리지 않았다. 서버는 `.next-e2e`/3010에서 실행했다. 초기 측정 스크립트의 전역 signOut으로 같은 QA 리더의 브라우저 로그인이 해제되어 다시 로그인했고, 보존하는 스크립트는 `scope: local`만 사용한다. 테스트 데이터 변경은 없었다.

## 앱

- QA 환경 변수를 로드하고 `CLANSYNC_E2E=1`에서 `next build --webpack`: 전후 빌드 성공. 첫 수정 빌드의 누락된 useEffect import는 복구 후 통과.
- 변경 소스·측정/보고서 서버 스크립트 ESLint 통과. 프로덕션 빌드에서 TypeScript 확인.
- `E2E_SKIP_SEED=1`, QA 전용 서버, 임시 픽스처로 다음 **5개 시나리오** 통과:
  - `balance-lobby-performance.spec.ts`: 11초 유휴 RSC 0회, RSVP 변화 928ms, 방 제목 변화, 삭제 후 30초 보완 조회, 오프라인→온라인 복구.
  - `balance-lobby.spec.ts`의 ‘내전 기록 권한’, ‘정규 내전 예약’.
  - `flash-settings-visibility.spec.ts`의 리더·멤버 호스트 점수/설정 보호.
  - `formation-settings-preview.spec.ts`의 화면 표시·밴픽 미리보기 및 적용 저장.
- 새 로비 테스트의 초기 픽스처 오류(game_id 누락, 개설자 자동 참석 수 미반영)는 수정 후 동일 동작 검증을 통과했다. 앱 오류를 기대값 완화로 덮은 결과가 아니다.
- `node --test docs/03-analysis/alpha-review-2026-10-16/economics.test.mjs`: 2건 통과.
- `node scripts/serve-alpha-review.mjs --self-test`: `.env.local`·소스·경로 우회에 대한 파일 allowlist 확인.

## 디자인 6항목 후속 검증

D1–D6 변경 후 별도 QA 개발 서버(webpack, 3010)와 임시 클랜·계정으로 **5개 시나리오**를 확인했다. 사용자 3011 서버와 활성 QA 명단은 유지했고 자신의 임시 데이터만 정리했다.

- 변경 소스·테스트 ESLint와 `npx tsc --noEmit` 통과.
- `design-consistency.spec.ts`: UTC / America/Los_Angeles에서 한국 시간 00:15 등록 → UTC 저장 → 편집 시 복원 → 23:45 변경, 매주/매월 반복 저장, 페이지 오류 없음. 390×720 패널에서 본문 스크롤 전후 헤더·하단 버튼 위치 유지.
- 같은 파일의 관리 화면 시나리오: 1304 / 390 / 320px 로비 행의 가로 넘침 없음, 작업 버튼 표시, 12px 시각 정보, 생성 창 열기. 구독 카드와 개인 기록 설정 캡처, 명예의 전당 공개 토글 저장 확인.
- `event-calendar-layout.spec.ts`: 데스크톱 목록·상세 높이, 등록·편집 열기, 모바일 드로워·키보드 이동 회귀 통과.
- `event-discord-bot.spec.ts`의 events UI: 알림·연동 이동, 미연결 토글 비활성·하위 옵션 숨김, 일정 시각·알림 설정 저장과 기존 접근 거부 흐름 통과.

초기 미국 서부 브라우저 검증에서 발견한 캘린더 날짜의 서버/브라우저 불일치는 서버 기준 시각 전달과 한국 시간 날짜 구분으로 수정했다. UI 검증의 도움말 팝업 닫기, 개설자 자동 참석 표시와 첫 개발 컴파일 대기는 실제 화면 조건에 맞춰 정리한 뒤 해당 시나리오를 재실행했다. 최종 5건은 분리 실행을 포함한 결과다. 실제 Discord 외부 발송, 전체 브라우저·테마·접근성 전수 검사와 전체 빌드는 이번 UI 변경에서 반복하지 않았다. 기존 UTC 레코드·DB 스키마·권한은 변경하지 않았다.

재현: `E2E_SKIP_SEED=1 npx playwright test e2e/design-consistency.spec.ts e2e/event-calendar-layout.spec.ts e2e/event-discord-bot.spec.ts --grep 'event sheets|management cards|calendar:|events UI:'`. Windows QA 검증은 별도 webpack 개발 서버 설정을 사용했다.

## 추가 페이지·설정 창 점검

D7–D13은 별도 QA 개발 서버(webpack, 3010), `E2E_SKIP_SEED=1`과 임시 클랜·계정으로 검증했다. 사용자 3011 서버와 기존 QA 명단은 유지하고 생성한 임시 데이터만 정리했다.

- 변경 소스·테스트 ESLint, `npx tsc --noEmit` 통과.
- `design-followup.spec.ts`의 주요 **26개 경로 × 320 / 390px**에서 정상 응답과 페이지 가로 넘침 없음을 확인했다. 기본·빈 결과 상태를 포함하며 모든 데이터·권한 조합의 검사는 아니다.
- 같은 파일의 **320×568px** 편집 창 검사: 공지·자유 글·코칭·피드백·방송(플랫폼 4개)·추억·대진표·경기 기록·프로필 꾸미기·뱃지의 헤더와 하단 작업이 본문 스크롤 후에도 같은 위치에 있다. 이전 기록 연결 창의 하단 작업도 화면 안에 표시된다.
- 커뮤니티 홍보·LFG·스크림 작성 창은 **1304 / 390 / 320px**, 높이 568px에서 같은 배치로 확인했다. 대진표와 홍보 글의 긴 공백 없는 제목을 실제 저장한 후 가로 넘침이 없고, 커뮤니티 탐색·작성 중 페이지 오류는 0건이다.
- 기존 `clan-management.spec.ts` 2건, `clan-coaching.spec.ts` 1건, `clan-match-record-editing.spec.ts` 1건, `clan-poll-create.spec.ts` 1건 통과. 공지·코칭 저장, 경기 기록 추가·정정·제거 및 권한, 투표 검증·저장·모바일 하단 작업의 회귀를 확인했다.
- 날짜 함수의 순수 검사 1건은 UTC 날짜·연도 경계와 잘못된 입력을 확인했다. 총 **UI 시나리오 8건 + 날짜 검사 1건** 통과이며, 수정한 시나리오의 분리 재실행을 포함한다.

실제 검증에서 발견한 커뮤니티 날짜의 서버/브라우저 불일치는 동일한 한국 시간 형식과 서버 기준 시각 전달로 수정했다. 테스트용 코칭 선생님 데이터와 프로필의 게임별 탭 선택 누락은 픽스처·진입 동작을 수정한 뒤 통과했다. 커뮤니티 입력의 저장 시각 해석, 경기 기록의 초 단위, DB 스키마·권한은 변경하지 않았다.

재현 대상: `e2e/design-followup.spec.ts`, `e2e/clan-management.spec.ts`, `e2e/clan-coaching.spec.ts`, `e2e/clan-match-record-editing.spec.ts`, `e2e/clan-poll-create.spec.ts`. Windows 검증에서는 별도 webpack 개발 서버 설정으로 실행했다. 실제 모바일 기기·Safari·전체 테마·모든 권한 조합은 확인하지 않았으며, 이번 UI 변경에서는 전체 빌드·전체 DB 회귀를 반복하지 않았다.

## 라이트 테마·모바일 점검

기본 다크를 유지하면서 `clansync-theme`의 실제 저장 선택으로 라이트를 적용했다. 설치된 `next-themes`를 연결했으며 새 의존성은 없다. 별도 3010 webpack QA 서버, `E2E_SKIP_SEED=1`과 생성·정리되는 임시 계정·클랜을 사용했다.

- 기본 문구용 8개 토큰 × 기본 배경 4종의 대비 32조합이 **4.5:1 이상**이며 입력 경계 4조합은 **3:1 이상**이다. 로그인·연동·프로필의 기본 입력도 같은 경계 토큰을 사용한다. 반투명 합성·사진·차트까지 포함한 WCAG 전수 판정은 아니다.
- `light-theme.spec.ts`: 랜딩·로그인·회원가입·잘못된 기록 연결 링크를 1304 / 390 / 320px에서 확인했다. 테마 선택의 새로고침 유지·저장값 없는 기본 다크 복귀, 자동 로그인 토글의 폼 값, 브라우저 콘솔 오류 없음도 확인했다.
- 주요 26경로 × 데스크톱 1304px·모바일 390 / 320px의 **78조건**에서 로딩 상태·스켈레톤이 끝난 본문을 확인했다. 게시판 진입 리다이렉트, 동적 글 상세, 계정 연동·클랜 가입/생성·환영·기록 연결 만료 화면도 추가했다. 기본·빈 결과와 임시 데이터가 대상이며 모든 권한·데이터 조합의 전수 검사는 아니다.
- 320×568px의 게시판·코칭·프로필·기록 편집, 1304 / 390 / 320px 커뮤니티 작성·긴 제목 저장·상세, 통계 설정 4종·예약 하위 설정·경기 설정 3탭을 검사했다. 모바일 클랜 소개 버튼과 경로 표시도 정리했다.
- 관련 실제 동작: 자동 로그인 선택 저장과 기존 프로필 보존, 경기 기록 추가·정정·제거, 투표 저장, 한국 시간 일정 등록·편집, 명예의 전당 공개 저장, 경기 설정 미리보기·설정 적용과 재생 조작을 통과했다.
- 집중 검증은 **UI 시나리오 13건 + 날짜 검사 1건**이다. 변경 파일 ESLint와 `npx tsc --noEmit`도 확인했다. 분리 재실행을 포함한다.

점검 중 발견한 테마 버튼의 초기 ARIA 상태 불일치는 서버 스냅샷을 사용해 수정했다. 중첩 예약 폼의 fieldset은 예약된 스크롤 여백으로 생기던 10px 가로 넘침을 없애고 날짜 입력의 최소 너비를 줄였다. 모바일 경기 설정은 전체 너비를 사용한다. 코칭·날짜·권한·정산 로직은 변경하지 않았다.

검사의 계정 전환은 쿠키를 비운 뒤 수행하며, 페이지 순회는 숨겨진 이전 라우트와 구분해 현재 main 영역이 준비된 뒤 검사한다. 공개 화면 캡처는 hydration 전에 입력 DOM을 바꾸는 도구의 caret 숨김을 끄고 콘솔 오류를 확인했다. 실제 모바일 기기·Safari·가상 키보드·모든 권한 조합은 미검증이고 전체 빌드·DB 회귀·운영 적용은 반복하지 않았다.

재현: `E2E_SKIP_SEED=1 npx playwright test e2e/light-theme.spec.ts e2e/design-followup.spec.ts e2e/design-consistency.spec.ts e2e/formation-settings-preview.spec.ts e2e/clan-poll-create.spec.ts e2e/clan-match-record-editing.spec.ts e2e/auth-performance.spec.ts --grep-invert 'America/Los_Angeles|login still restores|an active login lock|an expired login lock' --config playwright.light.config.ts`. 이번 Windows 실행에서는 같은 라이트 프로필에 별도의 webpack 개발 서버 설정을 사용했다.

## 성능 재현

`scripts/measure-alpha-pages.mjs`는 QA 리더를 이용해 3010의 네 경로를 각각 5회 탐색하고 `.supabase-test/alpha-{label}.json`을 쓴다. `.env.e2e.local`과 별도 QA 프로덕션 빌드를 준비한 상태에서 `node scripts/measure-alpha-pages.mjs latest`로 실행한다. 운영 서버를 대상으로 할 수 없고 새로 만든 인증 세션만 local signOut한다. 기준/변경 버전을 비교할 때는 각 버전을 별도 checkout·동일 빌드 옵션으로 준비해야 한다. 현재 사용자 작업 폴더를 강제로 reset하지 않는다.

JS 수치는 각 script response body를 합친 압축 해제 크기이며 같은 파일의 반복 탐색도 포함한다. cold 첫 탐색·네트워크·QA 병행 부하가 있어 TTFB 중앙값은 참고값이다. 첫 로비 요청은 전 337ms·최종 후 312ms였고, 초기 후보에서는 700ms도 나왔다. 통계 중앙값은 85→109ms로 증가했다. 전체 사이트의 체감 속도가 일괄 개선됐다고 판정하지 않았다.

DB는 CLI의 QA 연결에서 읽기 전용 트랜잭션, `SET LOCAL ROLE authenticated`, QA 리더 JWT sub 문맥을 설정해 EXPLAIN ANALYZE했다. Data API의 공개 explain 설정·RLS·테이블·인덱스를 바꾸지 않았다. 실제 데이터에서 count/limit 결과는 약 10ms로 비슷했다. 원시 브라우저 샘플과 DB 요약은 [measurements.json](measurements.json)에 보존했다.

## 제한과 다음 검증

실제 배포의 LCP·INP·p95, 100명 동시 부하, 운영 청구서, 유료 전환율, 모든 브라우저/모바일/테마, OCR 실인식·Overwolf 커스텀 경기 수집은 검증하지 않았다. 전체 회귀·운영 빌드 및 운영 DB 적용은 배포 승인 전 별도 실행한다. OCR 법률 검토는 공개 공식 자료 기반의 도입 판단이며 개별 서비스의 법률 의견서나 게임사 서면 승인이 아니다.
