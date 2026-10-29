# 영상 촬영용 QA 꾸미기 정리

2026-10-29 이미지 교체 준비로 예전 QA 배너와 적용 스크립트를 제거했다. QA 배너·네임카드는 기본 상태이며, 게임 연동 ID·계정·클랜·경기·게시판은 유지한다. 과거 시연용 표시 이름과 제작 이력은 Git에서 확인한다.

QA 꾸미기만 정리하는 도구:

- 미리보기: `node scripts/archive/2026-10-qa/reset-qa-cosmetics.mjs`
- 롤백 검증: `node scripts/archive/2026-10-qa/reset-qa-cosmetics.mjs --check`
- 적용: `node scripts/archive/2026-10-qa/reset-qa-cosmetics.mjs --apply`

QA 프로젝트 링크와 환경 허용 목록을 확인하고, 적용 전 꾸미기·구매·원장·잔액을 `.supabase-test/cosmetics-before-*.json`에 백업한다. 구매 차감 및 정정의 순액만 복원하고 관련 원장을 삭제하며, 기본 카탈로그·다른 원장·나머지 공개 테이블의 동일성을 트랜잭션 안에서 검증한다. 시드는 실행하지 않는다. 운영 DB에는 실행하지 않는다.
