# Playwright E2E

## 테스트 환경

`clansync-test` (`moretvteewfcztxvwztw`, 서울 리전, Free)을 전용 QA DB로 사용합니다. 운영 데이터를 복사하지 않고 마이그레이션과 QA 픽스처로 구성했습니다.

- `e2e/env.example`을 저장소 루트의 `.env.e2e.local`로 복사하고 **테스트 프로젝트**의 키와 DB 비밀번호를 채웁니다. 현재 개발 PC에는 설정되어 있습니다.
- `CRON_SECRET`은 테스트용 난수를 사용합니다. 운영 키와 공유하지 않습니다.
- 시드와 Playwright는 `.env.local`을 읽지 않습니다. CI 환경변수는 `.env.e2e.local`보다 우선하며, URL이 허용된 테스트 프로젝트와 다르면 실행 전에 차단합니다.
- 프로젝트를 교체할 때는 `scripts/test-env.mjs`의 허용 대상을 함께 갱신합니다.

## 실행

기본은 **변경에 영향받는 파일/시나리오만 실행**합니다. 범위 선택은 [위험도별 검증 기준](../.cursor/rules/agent-auto-tasks.mdc), 코드와 테스트 대응은 [문서 진입점](../docs/README.md)을 따릅니다. 작은 UI·문구 수정에 전체 빌드·로그인 14계정·온보딩·DB 회귀를 반복하지 않습니다.

**사용자가 QA를 직접 테스트 중인 현재는 시드를 건너뜁니다.** 예를 들어 내전 동작 변경은 PowerShell에서:

```powershell
$env:E2E_SKIP_SEED = "1"
try {
  npm run test:e2e -- e2e/balance-session-live.spec.ts
} finally {
  Remove-Item Env:E2E_SKIP_SEED
}
```

파일은 아래 시나리오 목록에서 골라 바꿉니다. 한 파일 안에서는 `--grep "테스트 제목"`으로 필요한 시나리오를 선택할 수 있습니다. 변경 소스 린트는 `npx eslint <변경 파일>`, 타입 검사는 `npx tsc --noEmit`입니다.

`balance-session-live.spec.ts`는 `isolated-balance-fixture.ts`로 임시 사용자 12명·Premium 클랜을 생성하고 종료 시 해당 데이터만 정리합니다. 시드 생략만으로 데이터가 격리되지는 않습니다. 다른 기존 시나리오에는 공유 픽스처를 변경하는 테스트도 있으므로 활성 QA 세션·명단을 건드리지 않는 범위를 선택하고, 쓰기 검증은 별도 임시 데이터를 사용합니다.

### 최초 환경 구성

**사용 중인 QA 명단이 없는 경우에만** 아래를 실행합니다. E2E 시작 시 시드가 한 번 실행되므로 `db:seed`를 중복 호출하지 않습니다.

```sh
npm run db:test:push
npm run test:db
npm run test:e2e
```

`db:test:push`는 `.supabase-test/`의 별도 CLI 연결을 사용합니다. 기존 `supabase/.temp` 연결은 유지됩니다. 관리 토큰은 프로세스 환경 또는 `.env.local`의 `SUPABASE_ACCESS_TOKEN`을 사용하며, DB 비밀번호는 테스트 환경에서만 읽습니다. 타입 검증은 `npm run db:test:types`로 `.supabase-test/database.types.ts`에 생성합니다.

Playwright는 전용 포트 **3010**에서 새 앱 서버를 시작합니다. 기존 서버를 재사용하거나 외부 URL로 연결하지 않으므로 테스트 DB와 앱 DB가 달라지는 일을 방지합니다. `CLANSYNC_E2E=1`을 자동 주입해 빌드 폴더를 `.next-e2e`로 분리하므로 QA 서버(3011)의 `.next`와 개발 서버를 동시에 실행할 수 있습니다. 포트 변경은 `PLAYWRIGHT_DEV_PORT`를 사용합니다. 공유 픽스처를 변경하는 테스트가 있어 작업자는 1개입니다. 서버는 UTC로 실행하고 테스트 환경에만 `DEV_GAME_LINK_SIMULATOR=1`을 주입합니다. 운영 DB URL·Vercel Production에서는 이 플래그로 시뮬레이터를 활성화할 수 없습니다.

### main 병합·운영 반영 전 전체 회귀

공유 픽스처 변경이 활성 QA와 충돌하지 않는 상태에서 실행합니다. PowerShell에서:

```powershell
npm run lint
npx tsc --noEmit
npm run test:db
$env:CI = "true"
$env:E2E_SKIP_SEED = "1"
try {
  npm run test:e2e
} finally {
  Remove-Item Env:CI, Env:E2E_SKIP_SEED
}
```

CI 경로는 `npm run build` 후 `next start`를 사용하므로 같은 빌드를 직전에 중복 실행하지 않습니다. 로컬 기본 경로는 별도 빌드 폴더의 `next dev`입니다. 활성 QA 서버와 함께 실행할 수 있으므로 QA를 중단하거나 개발 서버 잠금을 피하려고 전체 빌드를 추가할 필요가 없습니다.

DB 변경은 관련 `scripts/*-db.test.mjs`를 골라 `node --test <파일>`로 실행할 수 있습니다. 전체 `npm run test:db`는 넓은 DB 영향 또는 병합 전 검증에 사용합니다. 전체 회귀·빌드 통과가 운영 DB 적용·배포 승인을 뜻하지는 않습니다.

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
- `balance-member-preference.spec.ts`: 같은 브라우저의 localhost 운영진/127.0.0.1 멤버 로그인 분리·선호 없음/순서 변경/새로고침/프로필 복귀·관리 UI 숨김
- `profile-role-preference.spec.ts`: 별도 임시 사용자의 프로필 선호 연속 저장·즉시 재편집·실패 시 마지막 확정값 복구
- `formation-rules.spec.ts`: 역할 정원·공통 순서·snake 지명·경매 예산/기한/무입찰
- `roster-autosave.spec.ts`: 빠른 연속 입력·편성 전 flush·동시 저장·연결 실패·revision 충돌·최신 명단 복구
- `balance-history-rules.spec.ts`: 유효 승패 통계·고유 출전·연속 승패·0경기·개설 KST 날짜·공개 감사 정보 제한
- `cron.spec.ts`: 인증 없는 요청 401, 테스트 DB에서 인증된 알림 처리 200
- `review-rules.spec.ts`: 권한 조회 오류·권한 재정의, 개발 연동 제한, 명시적 시간대 입력
- `event-timezone.spec.ts`: 한국 브라우저·UTC 서버에서 일정 생성·제목 수정·시간 수정
- `game-link.spec.ts`: QA 환경의 서버 게임 인증 기록
- `clan-dashboard.spec.ts`: 실제 공지·규칙·반복 일정·MVP·Free 제한·모바일
- `clan-management.spec.ts`: 공지 작성·편집·고정·삭제와 규칙 저장·구성원 검색
- `clan-match-records.spec.ts`: 종료 내전 기록·무효/무승부·명예의 전당 참여 집계
- `frontend-rebuild.spec.ts`: 홍보 게시글·LFG 시간대·모바일 메뉴/브라우저 기록·상점 구매 취소

온보딩 계정만 바꾸려면 `.env.e2e.local` 또는 CI에 `E2E_EMAIL`과 `E2E_PASSWORD`를 모두 설정합니다. 환경 확인은 `npm run test:e2e:env-check`, 운영 대상 차단 검증은 `node --test scripts/test-env.test.mjs`입니다. 비밀번호 값은 출력하지 않습니다.

`npm run test:db`는 `scripts/review-db.test.mjs`, `clan-notices-db.test.mjs`, `profile-badge-db.test.mjs`를 순서대로 실행합니다. 동일한 테스트 URL 허용 목록을 사용하고 임시 사용자·클랜·모집·일정을 생성한 뒤 정리합니다. 서비스 RPC 직접 호출 차단, 잔액·게임 인증 위조 거부, RLS, LFG·가입 동시 승인, 알림 재예약, 공지·규칙 권한, 대표 배지 교체의 롤백·동시성을 확인합니다. 별도 앱 서버는 필요 없습니다.

세션·편성 DB 회귀는 `session-round-db.test.mjs`, `formation-db.test.mjs`도 `test:db`에서 실행한다. 동시 저장, 탈퇴·강등, 잘못된 명단, 단계 역행과 마감 이후 변경을 검증한다. 이어서 `role-preferences-db.test.mjs`가 본인 전용 프로필/라운드 선호, 설정 권한·이전 버전 거부, 선호와 편성 시작의 경합, 초기화 후 공개 이력 보존, 다음 라운드 복사 규칙을 임시 데이터로 확인한다.

## 직접 조작하는 QA 페이지

운영진과 클랜원을 동시에 확인할 때는 `http://localhost:3011`에서 `QA_Leader_01`, `http://127.0.0.1:3011`에서 `QA_Member_02`로 각각 로그인한다. 같은 QA 앱·세션을 보되 호스트별 쿠키가 분리되어 다른 탭의 계정을 바꾸지 않는다. 클랜원 탭에서는 본인 선호만 변경하고 운영진 편성 조작은 표시하지 않는다.

Next.js 개발 리소스가 두 호스트에서 모두 로드되도록 `next.config.ts`의 `allowedDevOrigins`에 `127.0.0.1`을 명시한다. 누락되면 멤버 화면의 초기 HTML은 보여도 개발 스크립트가 차단돼 클릭이 작동하지 않을 수 있다. 해당 문제는 실제 QA 개발 서버에서 수정 전 403/수정 후 200 응답과 멤버 조작으로 확인했고, 프로덕션 빌드 E2E는 별도로 검증한다.

`npm run dev:qa`는 실제 앱을 `http://localhost:3011`에서 QA DB로 실행한다. `QA_Leader_01`로 일반 로그인하면 운영진 조작이 가능하다. QA 클랜은 리더와 `QA_Member_02`~`12`로 12명이며, `QA_Member_01`은 온보딩 테스트를 위해 별도로 둔다. 역할을 흉내내는 URL이나 인증 우회는 없다. `db:seed`는 열린 세션을 정리하므로 직접 테스트 중에는 다시 실행하지 않는다.

시드 상세: [debug-and-fixtures.md](../docs/01-plan/debug-and-fixtures.md)

현재 브랜치·운영 적용 대기는 [TODO](../docs/TODO.md), 실행한 검증 근거는 [Phase 2 현황](../docs/TODO_Phase2.md)에서 관리합니다.
