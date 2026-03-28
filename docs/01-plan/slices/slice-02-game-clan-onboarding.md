# S02 — 게임·클랜 온보딩

## 스코프

- 게임별 인증 (`/games/[gameSlug]/auth`)
- 클랜 가입·생성 (`/games/[gameSlug]/clan`)

## 수용 기준

- [ ] 게임 인증 완료 전/후 UI 상태가 구분됨 (목업)
- [ ] 클랜 탭: 가입(검색·추천·홍보) vs 생성(태그·정책·링크) 흐름이 PRD와 일치

## 목업

| 경로 |
|------|
| `mockup/pages/game-auth.html` |
| `mockup/pages/clan-auth.html` |

## 스키마

- `user_game_profiles`, `clans`, `clan_members` — [../schema.md](../schema.md)

## Premium

- 온보딩 자체는 동일. 홍보 카드 «Premium 구독 클랜» 뱃지 등은 표시용 목업.
