# S02 — 게임·클랜 온보딩

## 결정 참조

- 게임 인증·클랜 소속에 따른 진입 분기 **[D-AUTH-01](../decisions.md#d-auth-01--게임-인증--클랜-소속-라우팅-매트릭스)** · OAuth 제공자 매핑 **[D-AUTH-02](../decisions.md#d-auth-02--게임별-oauth-제공자-매핑)**.
- 클랜 검색·가입 신청 상태·만들기 폼·활성도: **[D-CLAN-01](../decisions.md#d-clan-01--클랜-목록-검색필터페이지네이션-분담)** · **[D-CLAN-02](../decisions.md#d-clan-02--가입-신청-상태-머신과-중복정책)** · **[D-CLAN-04](../decisions.md#d-clan-04--클랜-만들기-폼-payload-스키마-정합)** · **[D-CLAN-07](../decisions.md#d-clan-07--클랜-멤버-활성도-분류와-휴면-멤버-처리)** (라이프사이클 D-CLAN-03 등은 동일 표 참조).

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
