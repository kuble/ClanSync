# S07 — MainGame 커뮤니티

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
