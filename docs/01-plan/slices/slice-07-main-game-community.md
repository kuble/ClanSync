# S07 — MainGame 커뮤니티

## 결정 참조

- LFG 신청·수락 UI **[D-LFG-01](../decisions.md#d-lfg-01--lfg-신청-상태-ui와-수락-플로우)** · 홍보 정렬(인기 폐기) **[D-RANK-01](../decisions.md#d-rank-01--클랜-홍보-인기-정렬-폐기)**.
- 스크림 채팅 종료·양측 확정: **[D-SCRIM-01](../decisions.md#d-scrim-01--스크림-채팅방-자동-종료-정책)** · **[D-SCRIM-02](../decisions.md#d-scrim-02--스크림-양측-확정-동시성-2-phase-commit)** (권한 키 `confirm_scrim`, **[D-PERM-01](../decisions.md#d-perm-01--클랜-권한-매트릭스-모델-도입)**).

## 스코프

- 게임 단위 커뮤니티 `/games/[gameSlug]`
- 홍보 게시판, 스크림/LFG, 순위·평판(권한별) — PRD §7

## 수용 기준

- [x] 홍보 카드·필터(`setPromoGroupFilter`·`togglePromoSpecial`·`resetPromoFiltersAll`)·드로어(`openPromoDrawer`/`closePromoDrawer`)·가입(`openJoinModal`) 동작 경로가 목업에서 명확; LFG·스크림 필터는 `lfg-filter-panel`·`resetLfgFilters`(선택자 `#sec-lfg`)·`navTo` 주석 참고

## 목업

| 경로 |
|------|
| `mockup/pages/main-game.html` |

## 백로그

- 가입 신청 대기 목록 → 프로필 연동은 [../BACKLOG.md](../BACKLOG.md)
