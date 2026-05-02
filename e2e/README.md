# Playwright E2E

## 실행

```bash
# Chromium만 (이미 설치됨: npx playwright install chromium)
npm run test:e2e
```

`playwright.config.ts`가 **`npm run dev`를 자동 기동**합니다(포트 3000에 서버가 있으면 재사용).

## 온보딩 시나리오

`e2e/onboarding.spec.ts`는 Supabase에 실제로 있는 계정이 필요합니다. **`.env.local`에만** 넣으세요(커밋 금지).

```env
E2E_EMAIL=fixture-solo@clansync-qa.local
E2E_PASSWORD=<QA_SEED_PASSWORD와 동일>
```

또는 본인 QA 계정. 변수가 없으면 해당 스펙은 **skip**되고, `smoke.spec.ts`만 검증됩니다.

자세한 시드: [debug-and-fixtures.md](../docs/01-plan/debug-and-fixtures.md)

## 다른 URL

```powershell
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3001"; npm run test:e2e
```
