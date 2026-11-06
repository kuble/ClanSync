# 서버 없이 실행하는 로직 검사

기존 E2E에서 로직만 검증하던 18개 파일을 이동했다. 테스트 본문과 기대값은 유지하며 상대 import만 새 위치에 맞췄다. Playwright의 TypeScript·expect 기능을 계속 사용하지만 브라우저 fixture·웹 서버·global setup·DB 환경 로더를 사용하지 않는다.

```powershell
npm run test:unit
npm run test:unit -- e2e/logic/formation-rules.spec.ts
npm run test:unit -- e2e/logic/roster-autosave.spec.ts:10
```

| 범위 | 파일 |
|---|---|
| 기록·통계·집계 | `archive-day-stats`, `balance-history-rules`, `clan-match-records`, `clan-stats-analytics`, `dashboard-rows`, `player-session-stats` |
| 편성·점수·동기화 규칙 | `balance-score-display`, `balance-team-summary`, `draw-presentation`, `formation-rules`, `hero-ban-rules`, `ma-snapshot`, `roster-autosave` |
| 카탈로그·알림 메시지 | `personal-emblems-catalog`, `discord-message` |
| 권한·안전 경계·쿠키 | `review-rules`, `security-fix-rules`, `session-cookies` |

파일 확장자는 모두 `.spec.ts`다. 네트워크 의존 동작은 기존 모의 클라이언트·응답을 사용하며 실제 DB·외부 서비스에 요청하지 않는다. 실제 세션 생성·저장·권한/RLS·코인 정산·실시간 화면 검증은 기존 E2E와 DB 회귀에 남겨 둔다.

실행 설정은 [전용 설정](../../playwright.unit.config.ts)이다. 기존 브라우저 설정과 라이트 설정은 이 폴더를 수집하지 않는다. 결과는 터미널에 요약하고 산출물은 `test-results/logic`에 둔다. 로컬 DB 실행 잠금과 대시보드 이력은 사용하지 않아 DB 준비 중에도 실행할 수 있다.

운영 반영 전에는 `npm run test:all`로 린트·타입·로직·DB·프로덕션 E2E를 모두 실행한다. `npm run test:e2e`만 실행하면 이 폴더는 포함하지 않으므로 전체 검증 완료로 기록하지 않는다. 새 브라우저·DB 의존 검사는 이 폴더에 추가하지 않는다.
