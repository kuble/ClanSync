# 영상 촬영용 QA 꾸미기 정리

2026-10-29 이미지 교체 준비로 예전 QA 배너와 적용 스크립트를 제거했다. QA 배너·네임카드는 기본 상태이며, 게임 연동 ID·계정·클랜·경기·게시판은 유지한다. 과거 시연용 표시 이름과 제작 이력은 Git에서 확인한다.

작업이 끝난 초기화 도구와 전용 SQL은 2026-11-06 제거했다. 과거 도구와 실행 절차는 Git 이력에서 확인한다. 당시 `.supabase-test/cosmetics-before-*.json` 백업과 현재 QA 데이터는 유지하며, 이 기록을 근거로 초기화를 다시 실행하지 않는다.

현재 꾸미기·권한·원장 검증은 [공통 네임카드 회귀](../scripts/account-namecards-db.test.mjs)와 [폐기 저장소 회귀](../scripts/retired-storage-db.test.mjs)를 사용한다. 재사용 가능한 샘플 보정 도구는 [보관 안내](../scripts/archive/qa-samples/README.md)에 별도로 둔다.
