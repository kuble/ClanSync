# S03 — MainClan 쉘 (대시보드·탭·허브)

## 스코프

- 클랜 홈 `/games/[gameSlug]/clan/[clanId]` 레이아웃
- 탭: 밸런스 / 통계 / 이벤트 / 관리 / 스토어 (문서상 정의)
- 목업 허브: 역할(leader/officer/member)·**Free / Premium** 플랜 전환

## 수용 기준

- [x] `_hub.html`에서 iframe으로 `main-clan.html` 로드 시 플랜·권한이 `sessionStorage` / `?role=`·`?plan=` 와 맞물림 (`hubBuildMainClanUrl` → `applyRoleBodyClass` / `applyPlanBodyClass`)
- [x] Premium 전용 블록은 Free에서 숨김(`mock-hide-on-free`) + 안내(`mock-balance-free-note` 등) — §3.1·밸런스·이벤트·스토어 패턴 통일

## 목업

| 경로 |
|------|
| `mockup/_hub.html` |
| `mockup/pages/main-clan.html` |
| `mockup/scripts/clan-mock.js` |

## 참고

- [../clan-main-static-mockup-plan.md](../clan-main-static-mockup-plan.md) — 정적 목업 반영 메모
