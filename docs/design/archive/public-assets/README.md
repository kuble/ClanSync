# 공개 폴더에서 옮긴 제작·검수 자료

2026-11-06 제품에서 직접 제공하지 않는 자료 12개를 내용 변경 없이 옮겼다.

- `clan-banners/normal-v1/`: 초기 배너 WebP 10장. [제작 목록](../../clan-banners/normal-v1/manifest.json)의 `archivePath`가 저장소 기준 경로다. 제품은 기존 SVG 마스크를 사용한다.
- `personal-emblems/v1/`: 개인 엠블럼 검수용 `review.html`, `review.mjs`. 루트에서 `node scripts/serve-personal-emblems.mjs`를 실행하고 `http://127.0.0.1:3044/`로 확인한다. 서버가 기존 공개 카탈로그·PNG와 함께 제공하므로 보관 HTML을 직접 열지 않는다.

개인 엠블럼 공통 카탈로그는 앱에서도 사용하므로 `public/personal-emblems/v1/catalog.mjs`에 유지한다. 현재 리소스·입력 원본·검증 캡처는 이동·삭제하지 않았다.
