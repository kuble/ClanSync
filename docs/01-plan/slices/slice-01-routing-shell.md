# S01 — 라우팅·쉘 (랜딩·인증·게임 선택)

## 결정 참조

- 로그인 상태 랜딩 처리 **[D-LANDING-04](../decisions.md#d-landing-04--로그인된-사용자의-랜딩-진입-처리)** · 게임/클랜 라우팅 매트릭스 **[D-AUTH-01](../decisions.md#d-auth-01--게임-인증--클랜-소속-라우팅-매트릭스)** · 게임별 OAuth **[D-AUTH-02](../decisions.md#d-auth-02--게임별-oauth-제공자-매핑)**.
- 비밀번호·연령·Discord scope·로그인 잠금·자동 로그인 유지: **[D-AUTH-03](../decisions.md#d-auth-03--비밀번호-정책과-최저-가입-연령)** · **[D-AUTH-05](../decisions.md#d-auth-05--discord-oauth-scope)** · **[D-AUTH-06](../decisions.md#d-auth-06--로그인-실패-잠금-정책)** · **[D-AUTH-07](../decisions.md#d-auth-07--자동-로그인-유지-기간)** (찾기·재설정은 D-AUTH-04).

## 스코프

- 비로그인 랜딩, `/sign-in`, `/sign-up`, `/games` (게임 선택)
- 인증/권한 미들웨어 흐름(문서상 정의)

## 라우트

`docs/01-plan/pages.md` 의 라우팅 맵·미들웨어 다이어그램을 단일 출처로 따른다.

## 수용 기준 (체크리스트)

- [x] 라우트와 목업 HTML 대응 — `pages.md` **정적 목업 HTML ↔ 제품 경로** 표 + 라우팅 맵 (`/profile`·게시글 상세 미작성 명시)
- [x] 미들웨어: `/profile`은 세션만·`/games/...`는 게임 인증→클랜 가입 순 — `pages.md` 다이어그램·메모

## 목업

| 경로 |
|------|
| `mockup/pages/index.html` |
| `mockup/pages/sign-in.html` |
| `mockup/pages/sign-up.html` |
| `mockup/pages/games.html` |

전역 프로필은 S08·`profile.html` — 라우트는 `pages.md` `/profile`.

## 스키마 (참고)

- `users`, 세션은 Supabase Auth — [../schema.md](../schema.md) `users`

## 밖에 둠

- 실제 Next.js `middleware.ts` 구현은 `src/` 요청 시 별도 슬라이스로 쪼갠다.
