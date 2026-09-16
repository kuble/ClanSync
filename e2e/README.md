# Playwright E2E

## 테스트 환경

`clansync-test` (`moretvteewfcztxvwztw`, 서울 리전, Free)을 전용 QA DB로 사용합니다. 운영 데이터를 복사하지 않고 마이그레이션과 QA 픽스처로 구성했습니다.

- `e2e/env.example`을 저장소 루트의 `.env.e2e.local`로 복사하고 **테스트 프로젝트**의 키와 DB 비밀번호를 채웁니다. 현재 개발 PC에는 설정되어 있습니다.
- `CRON_SECRET`은 테스트용 난수를 사용합니다. 운영 키와 공유하지 않습니다.
- 시드와 Playwright는 `.env.local`을 읽지 않습니다. CI 환경변수는 `.env.e2e.local`보다 우선하며, URL이 허용된 테스트 프로젝트와 다르면 실행 전에 차단합니다.
- 프로젝트를 교체할 때는 `scripts/test-env.mjs`의 허용 대상을 함께 갱신합니다.

## 실행

**사용자가 QA를 직접 테스트 중인 현재는 시드를 건너뛴다.** 기존 `QA_01_Clan`의 열린 명단을 보존하려면 PowerShell에서 다음처럼 실행한다.

```powershell
$env:E2E_SKIP_SEED="1"
npm run test:e2e
Remove-Item Env:E2E_SKIP_SEED
```

`balance-session-live.spec.ts`는 `isolated-balance-fixture.ts`로 임시 사용자 12명·Premium 클랜을 생성하고 종료 시 해당 데이터만 정리한다. 현재 사용자가 조작 중인 세션·명단을 재사용하거나 초기화하지 않는다. 다른 기존 시나리오는 각자의 픽스처를 사용하므로 전체 테스트가 모든 QA 데이터를 읽기만 하는 것은 아니다.

최초 환경 구성 또는 공유 QA 작업이 없을 때의 기본 실행은 다음과 같다.

```sh
npm run db:test:push
npm run db:seed
npm run test:db
npm run test:e2e
```

`db:test:push`는 `.supabase-test/`의 별도 CLI 연결을 사용합니다. 기존 `supabase/.temp` 연결은 유지됩니다. 관리 토큰은 프로세스 환경 또는 `.env.local`의 `SUPABASE_ACCESS_TOKEN`을 사용하며, DB 비밀번호는 테스트 환경에서만 읽습니다. 타입 검증은 `npm run db:test:types`로 `.supabase-test/database.types.ts`에 생성합니다.

Playwright는 전용 포트 **3010**에서 새 앱 서버를 시작합니다. 기존 서버를 재사용하거나 외부 URL로 연결하지 않으므로 테스트 DB와 앱 DB가 달라지는 일을 방지합니다. 포트 변경은 `PLAYWRIGHT_DEV_PORT`를 사용합니다. 공유 픽스처를 변경하는 테스트가 있어 작업자는 1개입니다. 서버는 UTC로 실행하고 테스트 환경에만 `DEV_GAME_LINK_SIMULATOR=1`을 주입합니다. 운영 DB URL·Vercel Production에서는 이 플래그로 시뮬레이터를 활성화할 수 없습니다.

프로덕션 빌드로 검증하려면 PowerShell에서:

```powershell
$env:CI="true"
npm run test:e2e
Remove-Item Env:CI
```

CI 경로는 `npm run build` 후 `next start`를 사용합니다. 로컬 기본 경로는 `next dev`이며 같은 저장소의 dev 인스턴스와 충돌할 경우 CI 경로를 사용합니다.

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

`npm run dev:qa`는 실제 앱을 `http://localhost:3011`에서 QA DB로 실행한다. `QA_Leader_01`로 일반 로그인하면 운영진 조작이 가능하다. QA 클랜은 리더와 `QA_Member_02`~`12`로 12명이며, `QA_Member_01`은 온보딩 테스트를 위해 별도로 둔다. 역할을 흉내내는 URL이나 인증 우회는 없다. `db:seed`는 열린 세션을 정리하므로 직접 테스트 중에는 다시 실행하지 않는다.

시드 상세: [debug-and-fixtures.md](../docs/01-plan/debug-and-fixtures.md)

2026-09-16 기준 QA 마이그레이션은 56개, 운영은 50개다. 작업 브랜치는 `codex/live-session-formation`이며 운영 전 6개 적용이 대기 중이다. 프로필의 게임별 선호를 저장한 뒤 밸런스 화면의 본인 라운드 선호·설정·기록을 직접 확인할 수 있다. 전체 회귀 82건 통과 후 수정한 내전 통합 1건과 프로필 1건 개별 재검증 통과, 총 84시나리오. DB·기타 검증 범위는 [Phase 2 현황](../docs/TODO_Phase2.md)을 따른다.
