# ClanSync 실제 기능 시연 영상

2026-09-30 QA 앱의 실제 브라우저 조작을 촬영한다. 대시보드 → 내전 로비·경기 진행 → 클랜 통계 순서이며, 한국어 합성 내레이션과 자막, 장면 제목을 넣은 1920×1080 MP4를 만든다.

## 촬영 범위

- 대시보드: 공지 상세, 클랜 규칙, 반복 일정, 배지, 지난달 MVP.
- 내전: 정규·깜짝 내전과 예약 설정, 명단 추가·자리 교환·되돌리기, 멤버의 역할 선호, 공통 역할 추첨·무작위 팀 배정, 맵 투표·추첨, 영웅 밴, 예시 승패 기록, 내전 기록·다음 라운드·종료.
- 클랜 통계: 명예의 전당의 네 부문과 기간 필터, 순위 토크 작성 화면, 내전 활동 그래프·맵/영웅 분포, 날짜별 경기 기록·참가자 검색·전적 정렬, 개인 요약·수상 엠블럼·맵별 승률·시너지·점수 및 승부예측 이력.

예약·주장 지명·경매는 설정 미리보기로 표시한다. 실제 편성은 역할 추첨과 무작위 배정을 사용한다. 댓글 입력은 등록하지 않는다. 게임 플레이는 촬영 대상에 포함하지 않으며 결과 입력은 시연용 예시임을 설명한다. 방송용 화면, 실제 경매 입찰과 관전 멤버의 예측 등록은 이번 영상에서 조작하지 않는다.

## 데이터와 출력

`QA_01_Clan`은 대시보드·통계를 읽을 때만 사용한다. 내전 쓰기 조작은 새 QA 계정 12명과 `ClanSync 시연 클랜`에서 진행한 뒤 정리한다. 허용된 QA 연결은 기존 `loadTestEnv()`로 검증한다. 기존 QA 명단을 재시드하거나 운영 DB·배포를 변경하지 않는다. 페이지 방문에 따른 정상 이용 집계는 발생할 수 있다.

출력 폴더는 Git에서 제외된 `test-results/clansync-demo-2026-09-30/`다. MP4·SRT·대본·장면 목록만 공유한다. 녹화 준비 중 생성되는 인증 상태와 임시 계정 정보는 `cleanup-demo.mjs`에서 삭제한다.

화면의 개발 도구 표시와 QA 플랜 전환 버튼은 촬영 브라우저에서만 숨긴다. 클릭 위치 표시, 상단 장면 제목과 하단 자막을 추가하며 앱 소스는 수정하지 않는다. 원본 화면은 1600×760이고 최종 프레임의 화면 영역은 1920×912다. 원본 녹화·중간 파일과 도구는 로컬 작업 폴더에 남는다.

## 다시 제작하기

기존 QA 서버 `npm run dev:qa`가 3011에서 실행 중이어야 한다. 브라우저 실행이 가능한 환경, 한국어 `Microsoft Heami Desktop` 음성, Pillow를 사용하는 Python, H.264/AAC·libass를 지원하는 FFmpeg가 필요하다. `prepare-demo.mjs`는 중복 생성을 피하기 위해 기존 임시 픽스처 파일이 있으면 중단한다.

저장소 루트에서 순서대로 실행한다:

```powershell
node scripts/demo/prepare-demo.mjs
pwsh -NoProfile -File scripts/demo/make-narration.ps1
node scripts/demo/record-demo.mjs
python scripts/demo/render-demo.py --ffmpeg <FFmpeg 실행 파일 경로>
node scripts/demo/cleanup-demo.mjs
```

실패한 장면부터 재촬영하려면 `node scripts/demo/record-demo.mjs --from=25-records`처럼 시작 장면을 지정한다. 이미 완료한 조작을 포함하는 내전 구간은 해당 방의 현재 단계가 맞는지 확인한다. 영상 합성은 각 촬영 목록에서 장면별 최신 성공 녹화를 선택하며 31개 장면이 모두 있어야 최종 영상을 만든다. 임시 클랜을 정리하면 재촬영에는 새 픽스처가 필요하다.

- [대본과 장면 제목](../scripts/demo/scenes.json)
- [녹화](../scripts/demo/record-demo.mjs) · [음성](../scripts/demo/make-narration.ps1) · [영상 합성](../scripts/demo/render-demo.py)
- [QA 준비](../scripts/demo/prepare-demo.mjs) · [소유 데이터만 정리](../scripts/demo/cleanup-demo.mjs)

앱 동작 변경은 없으므로 전체 빌드·회귀 대신 촬영 스크립트 린트·문법, 실제 QA 조작, 최종 미디어 디코딩과 장면별 화면·음성 스트림을 확인한다. 이 검증은 제품 전체 QA 통과를 뜻하지 않는다.
