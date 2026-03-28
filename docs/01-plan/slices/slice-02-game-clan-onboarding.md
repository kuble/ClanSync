# S02 — 게임·클랜 온보딩

## 스코프

- 게임별 인증 (`/games/[gameSlug]/auth`)
- 클랜 가입·생성 (`/games/[gameSlug]/clan`)

## 수용 기준

- [x] 게임 인증: 목업에서 연동 중 버튼 상태·완료 시 `clan-auth` 이동·에러 블록 — `game-auth.html` / `pages.md` GameAuth
- [x] 클랜: 가입(검색·추천·홍보·신청·대기) vs 생성(폼·경고) — `clan-auth.html` / `pages.md` ClanAuth·온보딩 순서

## 목업

| 경로 |
|------|
| `mockup/pages/game-auth.html` |
| `mockup/pages/clan-auth.html` |

## 스키마

- `user_game_profiles`, `clans`, `clan_members` — [../schema.md](../schema.md)

## Premium

- 온보딩 자체는 동일. 홍보 카드 «Premium 구독 클랜» 뱃지 등은 표시용 목업.
