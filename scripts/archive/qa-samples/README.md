# QA 샘플 보정 도구 보관

2026-11-06 일반 개발 경로에서 분리했다. 정기 검사·시드·앱 실행에서는 사용하지 않는다. 기존 QA 샘플을 다시 보정하도록 명시적으로 요청받은 경우에만 저장소 루트에서 실행한다. 이동 과정에서는 도구를 실행하지 않았고 QA 데이터를 변경하지 않았다.

| 도구 | 기본 실행 | 쓰기 옵션·영향 |
|---|---|---|
| `qa-leader-alt-accounts.mjs` | `node scripts/archive/qa-samples/qa-leader-alt-accounts.mjs` | `--apply`: 허용된 QA 리더의 누락된 샘플 부계정 2개만 추가한다. 기존 행은 보존한다. |
| `qa-default-namecards.mjs` | `node scripts/archive/qa-samples/qa-default-namecards.mjs` | `--apply`: QA 14계정의 기본 꾸미기를 무작위로 적용한다. `--backgrounds-only`는 배경만 바꾼다. 기존 선택을 바꾸므로 현재 QA 검수 중에는 실행하지 않는다. |
| `add-qa-coaches.mjs` | `node scripts/archive/qa-samples/add-qa-coaches.mjs` | `--apply`: 기존 QA 멤버의 누락된 선생님 샘플 프로필만 추가한다. 기존 프로필·명단은 보존한다. |

모두 기본값은 미리보기이며 공유 QA 허용 목록 검사를 유지한다. 환경 로더와 계정 규칙은 각각 `scripts/test-env.mjs`, `scripts/fixtures/qa-fixtures.mjs`의 현재 공용 파일을 사용한다. 시드를 재실행하거나 운영 DB를 대상으로 사용하지 않는다.

완료된 예시 꾸미기 초기화·프로필 사진 정리 도구와 전용 SQL은 제거했다. 과거 도구는 Git 이력에서 확인한다. 현재 사진 테이블·버킷 부재 검증은 [기존 DB 회귀](../../profile-photo-retirement-db.test.mjs)를 유지한다. `.supabase-test`의 연결 설정·데이터 백업은 정리 대상이 아니다.
