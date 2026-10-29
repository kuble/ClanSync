# 완료된 일회성 QA 도구

2026-10-29~30에 적용을 마친 예시 꾸미기·프로필 사진 정리 도구다. 일반 개발·시드·회귀 실행에는 사용하지 않는다. 과거 실행을 재현해야 할 때만 저장소 루트에서 명시적으로 실행한다. 각 도구의 QA 프로젝트 제한과 기본 미리보기 동작은 유지한다.

- `node scripts/archive/2026-10-qa/reset-qa-cosmetics.mjs`: 예전 예시 상품·구매·꾸미기 정리. 같은 폴더의 SQL을 사용한다.
- `node scripts/archive/2026-10-qa/cleanup-qa-profile-photos.mjs`: 제거된 사진 테이블·버킷 상태 확인. `--apply --delete-bucket`은 정리 재현용이다.

현재 사진 테이블·버킷 부재 검증은 `scripts/profile-photo-retirement-db.test.mjs`를 사용한다. `.supabase-test`의 연결 설정과 데이터 백업은 이 보관 폴더나 캐시 정리 작업의 삭제 대상이 아니다.
