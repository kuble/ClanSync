# Playwright E2E

## 실행

```bash
# Chromium만 (이미 설치됨: npx playwright install chromium)
npm run test:e2e
```

`playwright.config.ts`가 **`npm run dev`를 자동 기동**합니다(포트 3000에 서버가 있으면 재사용).

**이미 `npm run dev`를 켜 둔 상태**에서 E2E를 돌리면 그 프로세스를 그대로 씁니다. 방금 코드를 바꿨는데 온보딩 등이 이상하면 **dev 서버를 재시작**하거나, **끈 뒤** `npm run test:e2e`만 실행해 새 프로세스로 맞추세요.

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

```powershell
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3001"; npm run test:e2e
```
