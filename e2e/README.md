# Playwright E2E

## 테스트 환경

자동 검사는 PC 안의 전용 Supabase DB를 사용합니다. `loadTestEnv()`는 `.env.test-local`과 `http://127.0.0.1:55431`만 허용하며 온라인 QA와 운영 주소는 거부합니다. 사용자용 3011 QA는 기존 `.env.e2e.local`과 계정·내전 기록을 유지합니다.

검사 사이트는 `http://localhost:3010`을 사용합니다. Playwright API 요청은 HTTP의 `127.0.0.1`에 보안 쿠키를 보내지 않으므로 프로덕션 모드 검사를 그 주소로 바꾸지 않습니다. `local-session-api.spec.ts`가 브라우저 로그인과 API 인증, 비로그인 요청의 분리를 확인합니다.

## 준비와 실행

Docker Desktop이 실행 중인 상태에서 최초 한 번 준비합니다.

```powershell
npm run test:local:setup
npm run test:dashboard
```

[실시간 검사 현황](http://127.0.0.1:3040)에서 진행 단계·실패 상세·소요 시간·정리 결과를 봅니다. [환경 구성과 문제 복구](../docs/guides/local-test-lab.md).

변경에 영향받는 파일 또는 `파일:줄번호`를 선택합니다.

```powershell
npm run test:e2e -- e2e/balance-session-live.spec.ts
npm run test:e2e -- e2e/auth-performance.spec.ts:66
npm run test:db -- scripts/role-preferences-db.test.mjs
```

실행기는 검사 전후 전용 로컬 DB와 Storage 데이터를 정리하고, 브라우저 검사 전에 로컬 QA 계정만 생성합니다. 실패해도 정리하며 계정·클랜·경기 0건 확인을 별도로 기록합니다. 강제 종료 뒤 잔여 데이터는 다음 실행 시작 시 정리합니다. 실행 잠금으로 중복 검사와 동시 초기화를 막습니다. `npm run test:local:clean`으로 수동 정리할 수 있습니다.

브라우저는 프로덕션 빌드·전용 3010 서버·worker 1·재시도 0입니다. 기존 3011 서버를 재사용하지 않습니다. Next는 UTC·`CLANSYNC_E2E=1`·로컬 게임 연결 시뮬레이터로 실행하며 관리 토큰과 Discord 발송 키는 비웁니다. 결과는 `.local-tests/runs/`에 남겨 DB 정리 뒤에도 원인을 추적합니다.

Playwright는 `tsconfig.playwright.json`을 사용합니다. Node에서 서버 조회 함수를 직접 검증할 때 `server-only`를 Next 내장 빈 모듈로 해석하며, 앱 코드의 서버/클라이언트 경계는 유지합니다.

프로덕션 세션은 `Secure` 쿠키를 사용한다. HTTP 루프백에서 Chromium이 보내는 이 쿠키를 Playwright의 Node HTTP 클라이언트가 생략할 수 있으므로, 인증된 서버 액션 재전송은 [공감자 조회 테스트](clan-board-reaction-people.spec.ts)처럼 브라우저 안의 `fetch`로 실행한다. 먼저 정상 인자의 성공·실제 결과를 확인한 뒤 위조·삭제·탈퇴를 검사하고, `redirect: "manual"`로 로그인 리다이렉트가 최종 응답에 섞이지 않게 한다. 비로그인 검증은 별도 브라우저 컨텍스트의 요청을 사용한다.

`db:test:push`와 `db:test:types`는 **온라인 QA 스키마 관리용** 명령입니다. 로컬 자동 검사 준비와 혼용하지 않습니다. 사용자의 QA 명단에는 시드를 실행하지 않습니다.

### main 병합·운영 반영 전 전체 회귀

```powershell
npm run lint
npx tsc --noEmit
npm run test:db
npm run test:e2e
```

로컬 회귀와 온라인 환경 확인을 구분합니다. 로컬 통과만으로 운영 환경의 성능·외부 연동까지 검증했다고 기록하지 않습니다.

### 통계 1만 경기 검증

`clan-stats-scale.spec.ts`는 기본 실행에서 건너뜁니다. 전용 로컬 DB에 임시 사용자 10명·클랜, 1만 경기와 출전자 10만 행을 만들고 첫 화면 통계 조회, 결과 정정, 날짜별 조회를 측정한 뒤 정리합니다. 다른 검사와 동시에 실행하지 않습니다. `STATS_COMPARE_REFERENCE=1`은 기존 전체 조회와 비교하며 기존 경로의 실패 원인도 출력합니다. 공유 QA에는 실행하지 않습니다.

```powershell
$env:STATS_BENCHMARK = "1"
$env:STATS_COMPARE_REFERENCE = "1"
try {
  npm run test:e2e -- e2e/clan-stats-scale.spec.ts
} finally {
  Remove-Item Env:STATS_BENCHMARK, Env:STATS_COMPARE_REFERENCE
}
```

기존 QA 명단은 변경하지 않습니다. PC가 강제 종료되면 다음 실행이 전용 로컬 DB의 잔여 데이터를 정리합니다. 측정값은 서버 통계 모델 조회와 JSON 크기이며 브라우저 전체 렌더링 시간과 다릅니다. 개발 전용 화면의 조건부 검사 실행법은 [로컬 검사 안내](../docs/guides/local-test-lab.md)를 따릅니다.

코인 풀은 `npm run test:prediction-pool:db` 또는 전체 `test:db`에서 금액 보존·동시성·RLS·마감·반환·기존 고정 보상 호환을 검증합니다. 공유 TypeScript 픽스처를 직접 읽으며 검증 환경은 Node.js 24.14입니다. `E2E_SKIP_SEED=1`과 `balance-prediction-pool.spec.ts`는 별도 13명 내전에서 편성 중 참여→5분 타이머→마감→배당/공개 순위와 모바일 너비를 검증합니다. 실제 QA 명단을 시드로 초기화하지 않습니다.

## 픽스처와 시나리오

계정 규칙은 `scripts/fixtures/qa-fixtures.mjs`가 단일 출처입니다. Playwright 시작 시 `global-setup`이 자동으로 시드를 실행하며, QA 클랜의 미종료 밸런스 세션을 삭제합니다. `E2E_SKIP_SEED=1`은 시드만 생략하며 DB 대상 검사는 그대로 적용됩니다.

- `smoke.spec.ts`: 공개 페이지
- `fixture-login.spec.ts`: QA 계정 로그인
- `auth-performance.spec.ts`: 기존 프로필 보존·프로필 복구·로그인 잠금·자동 로그인 쿠키 수명
- `session-cookies.spec.ts`: 실제 SDK의 서버/브라우저 갱신·쿠키 조각 교체·재로그인·로그아웃 때 수명 정책 유지 (HTTP 모의 응답)
- `clan-request-isolation.spec.ts`: 동시 로그인 계정 간 렌더 격리·다음 요청의 변경된 역할/권한 반영
- `navigation-feedback.spec.ts`: 응답 지연 중 이동 표시·서버 재조회 없는 홍보 정렬·브라우저 기록
- `onboarding.spec.ts`: 무소속 멤버 온보딩
- `join-request-flow.spec.ts`: 가입 신청·리더 거절
- `ui-regression.spec.ts`: 클랜·게임 탭, 대진표
- `balance-session-live.spec.ts`: 독립 12명 클랜의 명단 자동 저장·개인 선호·실시간 반영·설정 적용 직후 시작·공유 추첨·주장 지명·경매·결과·기록·다음 라운드·종료
- `balance-prematch.spec.ts`: 독립 QA 클랜의 편성 후 밴 설정·타이머 변경, 맵 유형 중복 선택, 두 클라이언트 가중 추첨·공유 결과·자동 영웅 밴, 수동 맵 저장, 초상화 선택·팀별 밴·기권·밴 확정과 경기 시작
- `balance-member-preference.spec.ts`: 같은 브라우저의 localhost 운영진/127.0.0.1 멤버 로그인 분리·선호 없음/순서 변경/새로고침/프로필 복귀·관리 UI 숨김
- `profile-withdrawal-data.spec.ts`: 임시 계정의 실제 클랜/계정 탈퇴·개인 데이터 삭제·일정/내전/투표/스크림 운영 기록 보존·작성자/호스트 연결 해제·운영자 이름 위조 방지/텍스트 표시·로그인 차단·기존 QA 데이터 동일성과 정리
- `profile-role-preference.spec.ts`: 별도 임시 사용자의 프로필 선호 연속 저장·즉시 재편집·실패 시 마지막 확정값 복구
- `stats-profile-navigation.spec.ts`: 개인 기록 안의 소개·게임 계정·대표 케이스 통합·이전 주소 이동·멤버 버튼 숨김·키보드/터치·모바일
- `profile-visibility.spec.ts`: 공개 소개 API의 인증·최소 필드·타 클랜 조회·미인증/내부 ID 제외·탈퇴/없는 대상과 이전 주소 이동
- `draw-presentation.spec.ts`: 역할 공개 시간·재접속 진행률·득표 가중 강조·무득표 예외
- `formation-rules.spec.ts`: 역할 정원·공통 순서·snake 지명·경매 예산/기한/무입찰
- `roster-autosave.spec.ts`: 빠른 연속 입력·편성 전 flush·동시 저장·연결 실패·revision 충돌·최신 명단 복구
- `balance-roster-dock.spec.ts`: 독립 클랜의 목록 네 방향 부착·빈자리 추가·기존 참여자 교체·자리 교환·되돌리기·자동 저장·모바일 클릭·10명 정원 유지
- `balance-history-rules.spec.ts`: 유효 승패 통계·고유 출전·연속 승패·0경기·개설 KST 날짜·공개 감사 정보 제한
- `cron.spec.ts`: 인증 없는 요청 401, 테스트 DB에서 인증된 알림 처리 200
- `review-rules.spec.ts`: 권한 조회 오류·권한 재정의, 개발 연동 제한, 명시적 시간대 입력
- `event-timezone.spec.ts`: 한국 브라우저·UTC 서버에서 일정 생성·제목 수정·시간 수정
- `event-calendar-layout.spec.ts`: 임시 클랜의 데스크톱 우측 일정·모바일 하단 드로워, 빈 날짜·등록/상세 전환·키보드/포커스·너비 변경 시 선택 유지
- `clan-poll-create.spec.ts`: 임시 클랜의 선택지 추가/삭제·입력/마감 검증·실제 투표/알림 예약·모바일 12개 선택지와 고정 작업 버튼·취소 후 초기화
- `game-link.spec.ts`: QA 환경의 서버 게임 인증 기록
- `clan-dashboard.spec.ts`: 실제 공지·규칙·반복 일정·MVP·Free 제한·모바일
- `clan-management.spec.ts`: 공지 작성·편집·고정·삭제와 규칙 저장·구성원 검색
- `clan-match-records.spec.ts`: 종료 내전 기록·무효/무승부·명예의 전당 참여 집계
- `frontend-rebuild.spec.ts`: 홍보 게시글·LFG 시간대·모바일 메뉴/브라우저 기록·상점 구매 취소

온보딩 계정만 바꾸려면 `.env.e2e.local` 또는 CI에 `E2E_EMAIL`과 `E2E_PASSWORD`를 모두 설정합니다. 환경 확인은 `npm run test:e2e:env-check`, 운영 대상 차단 검증은 `node --test scripts/test-env.test.mjs`입니다. 비밀번호 값은 출력하지 않습니다.

`npm run test:db`는 서비스 권한·원장·알림·공지와 현재 프로필·엠블럼 등 DB 회귀를 순서대로 실행합니다. 개별 파일은 `package.json`을 참조합니다. 동일한 테스트 URL 허용 목록과 별도 임시 데이터를 사용합니다. 폐기 저장소의 삭제 확인과 현재 계정 꾸미기의 환급은 `scripts/retired-storage-db.test.mjs`로 검증합니다. 별도 앱 서버는 필요 없습니다.

세션·편성 DB 회귀는 `session-round-db.test.mjs`, `formation-db.test.mjs`도 `test:db`에서 실행한다. 동시 저장, 탈퇴·강등, 잘못된 명단, 단계 역행과 마감 이후 변경을 검증한다. 이어서 `role-preferences-db.test.mjs`가 본인 전용 프로필/라운드 선호, 설정 권한·이전 버전 거부, 선호와 편성 시작의 경합, 초기화 후 공개 이력 보존, 다음 라운드 복사 규칙을 임시 데이터로 확인한다.

## 직접 조작하는 QA 페이지

운영진과 클랜원을 동시에 확인할 때는 `http://localhost:3011`에서 `QA_Leader_01`, `http://127.0.0.1:3011`에서 `QA_Member_02`로 각각 로그인한다. 같은 QA 앱·세션을 보되 호스트별 쿠키가 분리되어 다른 탭의 계정을 바꾸지 않는다. 클랜원 탭에서는 본인 선호만 변경하고 운영진 편성 조작은 표시하지 않는다.

Next.js 개발 리소스가 두 호스트에서 모두 로드되도록 `next.config.ts`의 `allowedDevOrigins`에 `127.0.0.1`을 명시한다. 누락되면 멤버 화면의 초기 HTML은 보여도 개발 스크립트가 차단돼 클릭이 작동하지 않을 수 있다. 해당 문제는 실제 QA 개발 서버에서 수정 전 403/수정 후 200 응답과 멤버 조작으로 확인했고, 프로덕션 빌드 E2E는 별도로 검증한다.

`npm run dev:qa`는 실제 앱을 `http://localhost:3011`에서 QA DB로 실행한다. `QA_Leader_01`로 일반 로그인하면 운영진 조작이 가능하다. QA 클랜은 리더와 `QA_Member_02`~`12`로 12명이며, `QA_Member_01`은 온보딩 테스트를 위해 별도로 둔다. 역할을 흉내내는 URL이나 인증 우회는 없다. `db:seed`는 열린 세션을 정리하므로 직접 테스트 중에는 다시 실행하지 않는다.

시드 상세: [debug-and-fixtures.md](../docs/01-plan/debug-and-fixtures.md)

현재 브랜치·운영 적용 대기는 [TODO](../docs/TODO.md), 실행한 검증 근거는 [Phase 2 현황](../docs/TODO_Phase2.md)에서 관리합니다.
