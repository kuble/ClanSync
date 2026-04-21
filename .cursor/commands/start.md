# start

ClanSync **목업 서버**(정적 HTML)와 **Phase 2 Next.js 개발 서버**를 함께 구동한다.

## 실행 순서

### 1. 포트 8788 (목업) — 사용 중이면 종료 후 기동

```powershell
$conn = netstat -ano | findstr :8788
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

### 2. 포트 3000 (Next.js) — 사용 중이면 종료 후 기동

```powershell
$conn3000 = netstat -ano | findstr :3000
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
