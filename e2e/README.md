# Playwright E2E

## 테스트 환경

`clansync-test` (`moretvteewfcztxvwztw`, 서울 리전, Free)을 전용 QA DB로 사용합니다. 운영 데이터를 복사하지 않고 마이그레이션과 QA 픽스처로 구성했습니다.

- `e2e/env.example`을 저장소 루트의 `.env.e2e.local`로 복사하고 **테스트 프로젝트**의 키와 DB 비밀번호를 채웁니다. 현재 개발 PC에는 설정되어 있습니다.
- `CRON_SECRET`은 테스트용 난수를 사용합니다. 운영 키와 공유하지 않습니다.
- 시드와 Playwright는 `.env.local`을 읽지 않습니다. CI 환경변수는 `.env.e2e.local`보다 우선하며, URL이 허용된 테스트 프로젝트와 다르면 실행 전에 차단합니다.
- 프로젝트를 교체할 때는 `scripts/test-env.mjs`의 허용 대상을 함께 갱신합니다.

## 실행

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
- `onboarding.spec.ts`: 무소속 멤버 온보딩
- `join-request-flow.spec.ts`: 가입 신청·리더 거절
- `ui-regression.spec.ts`: 클랜·게임 탭, 대진표·밸런스 세션
- `cron.spec.ts`: 인증 없는 요청 401, 테스트 DB에서 인증된 알림 처리 200
- `review-rules.spec.ts`: 권한 조회 오류·권한 재정의, 개발 연동 제한, 명시적 시간대 입력
- `event-timezone.spec.ts`: 한국 브라우저·UTC 서버에서 일정 생성·제목 수정·시간 수정
- `game-link.spec.ts`: QA 환경의 서버 게임 인증 기록

온보딩 계정만 바꾸려면 `.env.e2e.local` 또는 CI에 `E2E_EMAIL`과 `E2E_PASSWORD`를 모두 설정합니다. 환경 확인은 `npm run test:e2e:env-check`, 운영 대상 차단 검증은 `node --test scripts/test-env.test.mjs`입니다. 비밀번호 값은 출력하지 않습니다.

`npm run test:db`는 `scripts/review-db.test.mjs`의 실제 DB 회귀를 실행합니다. 동일한 테스트 URL 허용 목록을 사용하고 임시 사용자·클랜·모집·일정을 생성한 뒤 정리합니다. 서비스 RPC 직접 호출 차단, 잔액·게임 인증 위조 거부, RLS, LFG·가입 동시 승인, 일정·스크림 알림 재예약과 롤백을 확인합니다. 별도 앱 서버는 필요 없습니다.

시드 상세: [debug-and-fixtures.md](../docs/01-plan/debug-and-fixtures.md)
