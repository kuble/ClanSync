# Playwright E2E

## 실행

```bash
# Chromium만 (이미 설치됨: npx playwright install chromium)
npm run test:e2e
```

Playwright는 **로컬**에서 `npm run dev`(기본 **http://127.0.0.1:3000**)를 재사용합니다. (`reuseExistingServer`)  
**CI**(`CI=true`)에서는 `npm run build` 후 `next start`(기본 포트 **3010**)로 띄워 같은 저장소에 dev가 두 개 생기지 않게 합니다.

포트만 바꾸려면: `PLAYWRIGHT_DEV_PORT=3020` (Unix) / `$env:PLAYWRIGHT_DEV_PORT="3020"` (PowerShell).

## 온보딩 시나리오

`e2e/onboarding.spec.ts`는 Supabase에 실제로 있는 계정이 필요합니다. **`.env.local`에만** 넣으세요(커밋 금지).

```env
E2E_EMAIL=fixture-solo@clansync-qa.local
E2E_PASSWORD=<QA_SEED_PASSWORD와 동일>
```

또는 본인 QA 계정. 변수가 없으면 해당 스펙은 **skip**되고, `smoke.spec.ts`만 검증됩니다.

**로그인 실패 알림이 뜨면**: `E2E_*`가 `.env.local`의 Supabase(`NEXT_PUBLIC_SUPABASE_URL` 등)와 **같은 프로젝트에 있는 계정**인지, 비밀번호·이메일 오타·앞뒤 공백을 확인하세요.

**브라우저 수동 로그인은 되는데 E2E만 실패**할 때: npm `dotenv`는 `E2E_PASSWORD=ab#cd`처럼 **따옴표 없이 `#`가 있으면 `#` 앞만** 읽습니다. 이제 Playwright는 프로젝트 공통 파서(`scripts/parse-env-file.mjs`)를 쓰므로 `#`가 포함돼도 전체가 유지됩니다. 그래도 의심되면 `npm run test:e2e:env-check`로 **비밀번호 글자 수**가 수동 입력과 같은지 비교하세요.

자세한 시드: [debug-and-fixtures.md](../docs/01-plan/debug-and-fixtures.md)

## 다른 URL

이미 `npm run dev` 등으로 서버를 띄운 주소로만 검증할 때:

```powershell
$env:PLAYWRIGHT_SKIP_WEBSERVER="1"
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000"
npm run test:e2e
```

(`webServer` 자동 기동을 끄므로, 위 URL에 앱이 떠 있어야 합니다.)

**CI에서만** 기본적으로 `next start`가 다른 포트(3010)를 씁니다. 로컬에서도 동일하게 맞추려면 `PLAYWRIGHT_DEV_PORT`를 통일하면 됩니다.
