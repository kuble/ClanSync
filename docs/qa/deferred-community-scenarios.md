# 보류 중인 게임 커뮤니티 검증

2026-11-06 항상 건너뛰던 시나리오 6개를 실행 파일에서 이 목록으로 옮겼다. 기능 재개 전까지 활성 회귀 수에 포함하지 않으며 통과한 것으로 기록하지 않는다. 원래 테스트 본문·보조 함수는 Git 기준 커밋 `f250515a`의 해당 파일에서 복원할 수 있다.

| ID | 원래 파일·테스트 제목 | 재개 시 복원할 검증 | 현재 검증과 구분 |
|---|---|---|---|
| C01 | `e2e/frontend-rebuild.spec.ts` — `community promotion modal publishes a real post and opens its detail` | 커뮤니티 홍보 작성 창의 실제 저장·DB 내용·상세 열람·목록 복귀·생성 데이터 정리 | 현재 클랜 홍보·가입 연동은 [홍보 검사](../../e2e/clan-promotion.spec.ts), 사진 편집은 [인라인 편집 검사](../../e2e/promotion-inline-editor.spec.ts)로 유지한다. 구형 커뮤니티 작성 화면 검증을 대신 통과로 간주하지 않는다. |
| C02 | `e2e/frontend-rebuild.spec.ts` — `KST LFG modal defaults to a future local deadline and stores the same UTC instant` | 한국 시간 기본 마감·UTC 저장 일치, 슬롯·마이크·본문 저장과 정리 | LFG 작성 화면 재개 시 복원한다. 현재 [시간대 로직 검사](../../e2e/logic/security-fix-rules.spec.ts)는 화면 저장 흐름을 대체하지 않는다. |
| C03 | `e2e/frontend-rebuild.spec.ts` — `390px community menu closes after navigation and browser history restores the tab` | 390px 메뉴 닫힘·가로 넘침·이전/다음 탭 복원 | 커뮤니티 탭 재개 시 복원한다. 현재 계정·클랜 헤더 검사는 유지한다. |
| C04 | `e2e/design-followup.spec.ts` — `community composers keep their actions visible and preserve real post submission` | 홍보·LFG·스크림 작성 창의 1304/390/320px 고정 동작·긴 제목 저장·상세·화면 오류·임시 클랜 정리 | 활성 클랜 홍보·모바일 검증은 홍보 검사로 유지하고 나머지 커뮤니티 작성 화면은 보류한다. |
| C05 | `e2e/navigation-feedback.spec.ts` — `promotion sorting preserves filters and browser history without refetching the hub` | 홍보 정렬·필터·브라우저 기록 보존과 중복 서버 조회 방지 | 구형 커뮤니티 정렬 재개 시 복원한다. 현재 [클랜 찾기 조건 검사](../../e2e/clan-discovery-eligibility.spec.ts)와 활성 클랜 이동 피드백 검사는 유지한다. |
| C06 | `e2e/ui-regression.spec.ts` — `홈·홍보·LFG·순위·스크림 패널 문구 확인` | 커뮤니티 홈·홍보·LFG 작성 창·순위·스크림 탭의 진입·문구·닫기 | 커뮤니티 탭 재개 시 복원한다. 대시보드·헤더·알림·이벤트·온보딩 검사는 유지한다. |

## 유지한 활성 범위

- `frontend-rebuild.spec.ts`: 개인·클랜 상점 구매 취소 시 잔액·보유 정보 보존.
- `design-followup.spec.ts`: 한국 날짜 표시, 데스크톱·모바일 넘침, 게시판·코칭·기록·프로필 편집창.
- `navigation-feedback.spec.ts`: 서버 응답 지연 중 클랜 페이지 이동 표시.
- `ui-regression.spec.ts`: 대시보드·헤더·알림·이벤트와 구형 대진표 주소 호환·온보딩.

개발 전용 배너 스튜디오와 대용량 통계 검사의 조건부 건너뛰기는 이 목록으로 옮기지 않았다. 각각 프로덕션 비공개·명시적 대용량 검사 조건을 계속 검증한다.
