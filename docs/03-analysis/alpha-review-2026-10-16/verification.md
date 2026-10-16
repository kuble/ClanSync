# 검증 기록

2026-10-16. 기준 커밋 `1f1a619`, QA DB allowlist는 `scripts/test-env.mjs`를 사용했다. 사용자 QA 서버 3011의 빌드 경로와 명단은 건드리지 않았다. 서버는 `.next-e2e`/3010에서 실행했다. 초기 측정 스크립트의 전역 signOut으로 같은 QA 리더의 브라우저 로그인이 해제되어 다시 로그인했고, 보존하는 스크립트는 `scope: local`만 사용한다. 테스트 데이터 변경은 없었다.

## 앱

- QA 환경 변수를 로드하고 `CLANSYNC_E2E=1`에서 `next build --webpack`: 전후 빌드 성공. 첫 수정 빌드의 누락된 useEffect import는 복구 후 통과.
- 변경 소스·측정/보고서 서버 스크립트 ESLint 통과. 프로덕션 빌드에서 TypeScript 확인.
- `E2E_SKIP_SEED=1`, QA 전용 서버, 임시 픽스처로 다음 **5개 시나리오** 통과:
  - `balance-lobby-performance.spec.ts`: 11초 유휴 RSC 0회, RSVP 변화 928ms, 방 제목 변화, 삭제 후 30초 보완 조회, 오프라인→온라인 복구.
  - `balance-lobby.spec.ts`의 ‘내전 기록 권한’, ‘정규 내전 예약’.
  - `flash-settings-visibility.spec.ts`의 리더·멤버 호스트 점수/설정 보호.
  - `formation-settings-preview.spec.ts`의 화면 표시·밴픽 미리보기 및 적용 저장.
- 새 로비 테스트의 초기 픽스처 오류(game_id 누락, 개설자 자동 참석 수 미반영)는 수정 후 동일 동작 검증을 통과했다. 앱 오류를 기대값 완화로 덮은 결과가 아니다.
- `node --test docs/03-analysis/alpha-review-2026-10-16/economics.test.mjs`: 2건 통과.
- `node scripts/serve-alpha-review.mjs --self-test`: `.env.local`·소스·경로 우회에 대한 파일 allowlist 확인.

## 성능 재현

`scripts/measure-alpha-pages.mjs`는 QA 리더를 이용해 3010의 네 경로를 각각 5회 탐색하고 `.supabase-test/alpha-{label}.json`을 쓴다. `.env.e2e.local`과 별도 QA 프로덕션 빌드를 준비한 상태에서 `node scripts/measure-alpha-pages.mjs latest`로 실행한다. 운영 서버를 대상으로 할 수 없고 새로 만든 인증 세션만 local signOut한다. 기준/변경 버전을 비교할 때는 각 버전을 별도 checkout·동일 빌드 옵션으로 준비해야 한다. 현재 사용자 작업 폴더를 강제로 reset하지 않는다.

JS 수치는 각 script response body를 합친 압축 해제 크기이며 같은 파일의 반복 탐색도 포함한다. cold 첫 탐색·네트워크·QA 병행 부하가 있어 TTFB 중앙값은 참고값이다. 첫 로비 요청은 전 337ms·최종 후 312ms였고, 초기 후보에서는 700ms도 나왔다. 통계 중앙값은 85→109ms로 증가했다. 전체 사이트의 체감 속도가 일괄 개선됐다고 판정하지 않았다.

DB는 CLI의 QA 연결에서 읽기 전용 트랜잭션, `SET LOCAL ROLE authenticated`, QA 리더 JWT sub 문맥을 설정해 EXPLAIN ANALYZE했다. Data API의 공개 explain 설정·RLS·테이블·인덱스를 바꾸지 않았다. 실제 데이터에서 count/limit 결과는 약 10ms로 비슷했다. 원시 브라우저 샘플과 DB 요약은 [measurements.json](measurements.json)에 보존했다.

## 제한과 다음 검증

실제 배포의 LCP·INP·p95, 100명 동시 부하, 운영 청구서, 유료 전환율, 모든 브라우저/모바일/테마, OCR 실인식·Overwolf 커스텀 경기 수집은 검증하지 않았다. 전체 회귀·운영 빌드 및 운영 DB 적용은 배포 승인 전 별도 실행한다. OCR 법률 검토는 공개 공식 자료 기반의 도입 판단이며 개별 서비스의 법률 의견서나 게임사 서면 승인이 아니다.
