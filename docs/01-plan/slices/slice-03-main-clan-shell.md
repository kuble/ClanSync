# S03 — MainClan 쉘 (대시보드·탭·허브)

## 결정 참조

- 반응형 사이드바·디버그 쿼리 차단·메뉴별 알림 점: **[D-SHELL-01](../decisions.md#d-shell-01--사이드바-반응형-패턴-데스크톱-hover--모바일-드로어)** · **[D-SHELL-02](../decisions.md#d-shell-02--권한디버그-쿼리-우회-차단-정책)** · **[D-SHELL-03](../decisions.md#d-shell-03--사이드바-알림-점-트리거-규칙)**.
- in-app 알림 센터·웹 푸시 예고: **[D-NOTIF-01](../decisions.md#d-notif-01--in-app-알림-센터-통합-도입)** · **[D-NOTIF-02](../decisions.md#d-notif-02--브라우저-서비스워커-웹-푸시-도입-정책-프리셋-α)** (범위 R3).
- 개인 프라이버시 오버라이드(프리셋 α, R3 목업 예고): **[D-PRIV-01](../decisions.md#d-priv-01--개인-단위-프라이버시-오버라이드-프리셋-α)** — 권한 기본값 매트릭스는 **[D-PERM-01](../decisions.md#d-perm-01--클랜-권한-매트릭스-모델-도입)**.

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

- [../non-page/clan-main-static-mockup-plan.md](../non-page/clan-main-static-mockup-plan.md) — 정적 목업 반영 메모
