# start

ClanSync 목업 서버를 구동한다.

## 실행 순서

### 1. 포트 확인 및 서버 구동

```powershell
$conn = netstat -ano | findstr :8788
if ($conn) {
    $procId = ($conn -split '\s+' | Where-Object { $_ -match '^\d+$' } | Select-Object -Last 1)
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}
```

백그라운드로 서버 시작 (`block_until_ms: 0`):

```powershell
npx --yes http-server "c:\Projects\ClanSync\mockup" -p 8788 -c-1
```

서버가 뜰 때까지 5초 기다렸다가 터미널 출력을 확인한다.

### 2. 완료 안내

서버 주소 **http://127.0.0.1:8788/_hub.html** 를 사용자에게 안내한다.
(Windows에서 localhost는 IPv6로 해석될 수 있어 127.0.0.1을 사용한다.)
