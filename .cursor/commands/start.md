# start

ClanSync **목업 서버**(정적 HTML)와 **Phase 2 Next.js 개발 서버**를 함께 구동한다.

## 실행 순서

### 1. 포트 8788 (목업) — LISTENING이면 종료 후 기동

`findstr LISTENING`으로 **해당 포트를 실제로 열고 있는 프로세스**만 골라 종료한다. (그냥 `:8788`만 찾으면 다른 상태 줄이 섞일 수 있음.)

```powershell
$conn = netstat -ano | findstr :8788 | findstr LISTENING
if ($conn) {
    $procId = ($conn -split '\s+' | Where-Object { $_ -match '^\d+$' } | Select-Object -Last 1)
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}
```

백그라운드로 목업 서버 시작 (`block_until_ms: 0`):

```powershell
npx --yes http-server "c:\Projects\ClanSync\mockup" -p 8788 -c-1
```

### 2. 포트 3000 (Next.js) — LISTENING이면 종료 후 기동

Next.js 16은 **같은 프로젝트 디렉터리에 `next dev` 인스턴스가 두 개** 뜨지 않는다. `/start`로 3000을 쓰는 동안 **별도 터미널에서 또 `npm run dev`**를 띄우면 실패하므로, 포트 점유를 정리한 뒤 하나만 기동한다.

```powershell
$conn3000 = netstat -ano | findstr :3000 | findstr LISTENING
if ($conn3000) {
    $procId3000 = ($conn3000 -split '\s+' | Where-Object { $_ -match '^\d+$' } | Select-Object -Last 1)
    Stop-Process -Id $procId3000 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}
```

백그라운드로 Next 개발 서버 (`block_until_ms: 0`):

```powershell
Set-Location c:\Projects\ClanSync; npm run dev
```

서버가 뜰 때까지 5초 기다렸다가 터미널 출력을 확인한다.

### 3. 완료 안내

사용자에게 아래 링크를 채팅에 표시한다. (Windows에서 `localhost`는 IPv6로 해석될 수 있어 **127.0.0.1** 사용.)

| 용도 | URL |
|------|-----|
| 목업 허브 | **http://127.0.0.1:8788/_hub.html** |
| Phase 2 앱 (Next) | **http://127.0.0.1:3000/** |

### 4. 구현 완료 후 자동 검증 (Playwright)

Phase 2 기능을 **한 덩어리 구현해 커밋하기 전**에, 에이전트는 가능하면 아래로 UI·로그인·온보딩 흐름을 검증한다. (상세·`E2E_EMAIL` / `E2E_PASSWORD`: [e2e/README.md](../../e2e/README.md))

- **이미 `/start`로 3000이 떠 있는 경우**  
  `npm run test:e2e` — Playwright가 **기존 dev(3000)를 재사용**한다.
- **dev 없이 깨끗이 맞추고 싶을 때** (CI와 동일)  
  `CI=true npm run test:e2e` — `npm run build` 후 `next start`(기본 **3010**)로 돌려, 로컬에 남은 옛 번들 문제를 줄인다.

온보딩 스펙은 `.env.local`에 `E2E_*`가 있을 때만 로그인 이후까지 실행되고, 없으면 **스모크만** 돈다.

---

## 에이전트 자동화 노트

- 목업·Next 기동은 위 PowerShell을 **그대로 터미널에서 실행**하고, 장시간 프로세스는 **백그라운드**(`block_until_ms: 0`)로 띄운다.
- 검증 단계는 `.cursor/rules/agent-auto-tasks.mdc`와 동일 선상에서 **구현 턴 마무리 시** 수행한다.
