# 폐기 기능 DB 정리 — 2026-10-26

대상은 QA `moretvteewfcztxvwztw`다. public/private 앱 테이블 79개와 함수 237개를 조회하고 앱·작업 스크립트, DB 함수·트리거·외래키·정책·예약 작업의 참조를 대조했다. 사용자에게 정확한 테이블과 건수를 제시한 뒤 **9개 모두 삭제 승인**을 받았다. 운영 DB에는 적용하지 않았다.

## 삭제 대상

| 기능 | 테이블 | 삭제 전 행 수 | 판단 근거 |
| --- | --- | ---: | --- |
| 진열장 | showcase_catalog | 11 | 프로필·상점·전용 코드 제거 완료 |
| 진열장 | user_showcase_inventory | 5 | 동일 |
| 진열장 | user_showcase_libraries | 2 | 동일 |
| 과거 공개 설정 | profile_visibility | 1 | 기본 공개 전환 이후 읽지 않는다고 DB 주석에도 명시 |
| 과거 Discord 웹훅 | clan_notification_secrets | 0 | 봇 전환 후 사용 중단. 이전 claim/finalize RPC만 참조 |
| 과거 5칸 배지 | badges | 4 | 현재 클랜 배지·개인 엠블럼과 별개. 화면·조회·호출자 없음 |
| 과거 5칸 배지 | user_badge_unlocks | 0 | 동일 |
| 과거 5칸 배지 | user_badge_picks | 1 | 동일. 미사용 서버 액션도 함께 제거 |
| 과거 게임별 꾸미기 | user_nameplate_selections | 0 | 계정 공통 선택으로 이전 완료. 조회자 없음 |

합계 9개 테이블·24행. 관련 함수 8개, 전용 enum 2개도 제거했다. 테이블에 속한 정책·트리거·인덱스·제약조건은 함께 제거된다. 적용한 [마이그레이션](../../supabase/migrations/20261026001427_remove_retired_profile_and_webhook_storage.sql)은 CASCADE 없이 의존성이 예상과 다르면 중단하도록 작성했다([PostgreSQL DROP TABLE](https://www.postgresql.org/docs/current/sql-droptable.html)). 과거 마이그레이션은 이력 재현을 위해 유지한다.

현재 환급 RPC가 과거 선택 테이블을 정리하던 한 참조는 `user_namecard_selections`로 바꿨다. 환급·권한·원장 처리의 나머지 정의는 유지한다. 현재 장착한 프레임의 회수, 코인 환급·합계·중복 환급 거절을 임시 계정으로 검증했다.

## 보존 판정과 결과

- **나머지 70개 테이블:** 적용 직전/직후 전체 행의 정렬된 해시와 건수를 비교해 모두 동일했다. [79개 테이블별 결과](retired-db-storage-2026-10-26.csv). 개인 데이터 원문이나 비밀값은 기록하지 않았다.
- **미니룸:** 현재 `/profile/miniroom`·개인 상점·전용 RPC에서 사용한다. `housing_catalog` 등은 private 함수에서 읽기 때문에 단순한 앱 문자열 검색만으로 삭제할 수 없다.
- **개인 엠블럼·클랜 배지·현재 네임카드:** 현재 화면·조회/저장·상점에서 사용한다. 구 5칸 배지와 별도 구조다.
- **참가자 연결·초대와 명예의 전당 공감:** 앱은 RPC를 호출하며 해당 DB 함수가 내부 테이블을 사용한다. 보존했다.
- **Discord 봇:** 현재 `clan_discord_connections`와 outbox·bot claim/finalize 경로는 사용 중이다. 알림 기록도 보존했다.
- private 통계 테이블 4개는 통계 조회·집계·정정 함수에서 사용하므로 보존했다. 비어 있다는 이유로 현행 기능의 테이블을 삭제하지 않았다.

## 검증

- `npm run db:test:push` → `npm run db:test:types` 적용 후 QA 생성 타입을 앱에 동기화했다. 타입 차이는 폐기 객체 삭제뿐이다.
- DB 카탈로그: 삭제 대상 테이블/함수/enum 모두 0개, 나머지 함수의 폐기 테이블 참조 0개, cron의 폐기 참조 0건.
- 현재 프로필 공개·계정 꾸미기·미니룸 회귀와 신규 삭제/환급 테스트 24개 항목 통과. [신규 검사](../../scripts/retired-storage-db.test.mjs)를 `test:db`에 포함했다.
- 변경 파일 ESLint와 분리된 QA 환경의 최적화 빌드(TypeScript 포함) 통과. 보안 advisor 오류 수준 조회가 종료 코드 0으로 완료됐다.
- 공개 프로필 E2E 1개는 시드 없이 임시 계정으로 통과했다. 기존 `security-fix-boundaries.spec.ts`는 테스트 환경의 `server-only` 직접 import 문제로 수집되지 않아, 폐기 API의 부재는 신규 DB 테스트로 확인했다. 해당 보안 파일의 다른 시나리오 전체는 실행하지 않았다.
