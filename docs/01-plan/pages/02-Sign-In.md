# 02 Sign In · 로그인

## 한 줄 요약
이미 가입한 사용자가 이메일·비밀번호로 다시 들어오는 화면.

## 누가 / 언제 본다
- 로그인 안 된 사람.
- 보호된 화면(예: 게임 선택, 클랜)에 접근하려다 막혔을 때 자동으로 보냄.

## 화면 진입 조건
- 잠금 없음 (= 라우트 가드 없음). 누구나 진입 가능.
- 이미 로그인된 사용자가 들어오면 게임 선택(`/games`)으로 자동 이동 (운영 시 정책. 목업은 무동작).

## 사용자 흐름

```
이메일·비밀번호 입력
    │
    ▼
"로그인" 클릭
    │
    ├─ 성공 ──► /games 로 이동
    │
    ├─ 입력 누락 ──► 입력 칸 아래 안내 ("이메일을 입력해 주세요.")
    │
    ├─ 자격 불일치 ──► 폼 위 빨간 안내 띠 ("이메일 또는 비밀번호가 올바르지 않습니다.")
    │
    └─ 잠금 (반복 실패) ──► "잠시 후 다시 시도해 주세요." 안내 (D-AUTH-06)
```

부가 동선:
- "비밀번호 찾기" 클릭 → 별도 화면 (D-AUTH-04: 토큰 1시간 유효·중립 응답·rate limit)
- "Discord로 계속하기" 클릭 → 디스코드 OAuth (D-AUTH-05: `identify email` scope 한정)
- "회원가입" 링크 → `/sign-up`

## 화면 구성

```
[좌측 후기 패널] (≤768px에서는 숨김)
  인용: "클랜 운영이 훨씬 쉬워졌어요…"
  서명: KR Phoenix · 클랜장

[우측 폼 카드]
  [← 뒤로 (ClanSync)]  → /
  H1 "다시 오신 걸 환영해요!"
  부제 "ClanSync 계정으로 로그인하세요."

  ── 이메일 ──────────────────────
  ── 비밀번호 [눈 토글 아이콘] ──
  [자동 로그인 토글]   [비밀번호 찾기]

  [    로그인    ]   ← primary CTA

  ─── 또는 ───

  [  💬 Discord로 계속하기  ]

  계정이 없으신가요? [회원가입] → /sign-up
```

### 모달·드로어
- 없음.

## 버튼·입력·링크가 하는 일

| 요소 | 규칙·동작 |
|------|----------|
| 이메일 | `type=email`, placeholder "your@email.com". 비면 안내. 형식 검사는 운영 시 추가 |
| 비밀번호 | `type=password`, placeholder "비밀번호를 입력하세요". 비면 안내. 길이 검사는 가입에서만 |
| 눈 아이콘 | 비밀번호 보이기/숨기기 토글. `aria-label` 동기화 |
| 자동 로그인 토글 | **D-AUTH-07**: OFF = refresh token 24h, ON = 30일(슬라이딩 연장). 공용 PC 주의 tooltip. `users.auto_login`은 기본 체크값만 저장 — 실제 세션 TTL은 제출 시 체크박스 상태 우선. |
| 비밀번호 찾기 | **D-AUTH-04** 플로우: 이메일 1칸 → 재설정 메일 발송 → `/auth/reset-password?token=…` → 새 비번(strong 정책) 입력 → `/sign-in`. 토큰 1시간 · 1회용 · 60초/24h 5회 rate limit. 이메일 존재 여부 비노출. |
| 로그인 (primary) | 폼 제출 → 성공 시 `/games` |
| Discord로 계속하기 | **D-AUTH-05**: scope `identify email` 만. 길드·메시지 접근 없음. 기존 계정 매칭은 `email_verified=true` 일 때만 병합, 미검증/불일치면 신규 플로우. 클랜↔Discord 연동(알림)은 별도 Bot OAuth로 분리(D-EVENTS-03). |
| 회원가입 | `/sign-up` |
| ← 뒤로 (ClanSync) | `/` (랜딩) |

## 상태별 화면

| 상태 | 처리 |
|------|------|
| idle | "로그인" 버튼 활성 |
| 요청 중 | 버튼 라벨 "로그인 중…", 버튼 비활성, 입력 잠금 |
| 입력 누락 | 해당 입력 칸 아래 빨간 안내, 폼 비제출 |
| 자격 불일치 | 폼 상단 빨간 안내 띠 (`.error-msg` 슬롯 활용). **잠금 케이스와 카피 통합**: "이메일 또는 비밀번호가 올바르지 않거나, 잠시 후 다시 시도해 주세요." |
| 반복 실패 잠금 | **D-AUTH-06**: IP+email 5회 연속 실패 → 15분 잠금. 잠금 여부·남은 시간·실패 횟수 모두 UI 비노출(타이밍 공격 방지). 성공 시 카운터 리셋. 감사는 `auth_failed_logins` 테이블. |
| 네트워크 오류 | "잠시 후 다시 시도해 주세요." 안내 |
| 성공 | 즉시 `/games`로 이동 |

## 권한·구독에 따른 차이
- 없음.

## 데이터·연동
- Supabase Auth의 이메일+비밀번호 로그인.
- 성공 시 출입증(access token 1h + refresh token OFF 24h / ON 30d)을 브라우저에 저장 (D-AUTH-07).
- 실패 시 `auth_failed_logins` 에 감사 레코드 적재 (D-AUTH-06).
- Discord OAuth 사용 시 scope `identify email` 만 요청 (D-AUTH-05). 성공 시 `users.discord_user_id`에 병합.
- 비밀번호 재설정 토큰은 `password_resets` 테이블에 해시로 저장, 1시간 유효, 1회용 (D-AUTH-04).

## 목업과 실제 구현의 차이
- 목업은 이메일이 비어 있지 않으면 무조건 통과시켜 `/games`로 보냄. 비밀번호·잠금은 검사 자체 없음.
- `.error-msg` CSS 슬롯은 정의돼 있지만 마크업에 미사용 → 운영에선 실제 에러 카피를 여기에 표시.
- 자동 로그인 토글에 **D-AUTH-07 안내 tooltip** 부착. 실제 TTL은 Supabase 세션 API 연결 후 적용.
- 비번 찾기 링크는 Phase 1 목업에서 alert로 D-AUTH-04 요지만 노출(실제 재설정 2화면은 Phase 2에서 구현).
- Discord 버튼은 alert로 scope 안내만. 실제 OAuth는 Phase 2.
- 좌측 후기 서명에 오타 (`Pheonix` → `Phoenix`) — 정리 필요.

## 결정 필요
- ~~D-AUTH-04 비밀번호 찾기 플로우 (메일 발송 → 재설정 화면 → 만료 시간)~~ → [DECIDED: 1시간 유효·중립 카피·rate limit](../decisions.md#d-auth-04--비밀번호-찾기-플로우)
- ~~D-AUTH-05 Discord OAuth 권한 범위 (식별만? 길드 정보 읽기?)~~ → [DECIDED: `identify email` 만](../decisions.md#d-auth-05--discord-oauth-scope)
- ~~D-AUTH-06 로그인 실패 잠금 정책 (몇 회 / 몇 분)~~ → [DECIDED: IP+email 5회·15분](../decisions.md#d-auth-06--로그인-실패-잠금-정책)
- ~~D-AUTH-07 자동 로그인 토글의 출입증 유지 기간~~ → [DECIDED: OFF 24h / ON 30d](../decisions.md#d-auth-07--자동-로그인-유지-기간)

## 구현 참고 (개발자용)

- 목업 파일: `mockup/pages/sign-in.html`
- 핵심 함수: `handleSignIn(e)` (이메일 빈 값만 alert), `togglePwd(btn)`, `showForgotAlert()`(D-AUTH-04 시뮬레이션), `showDiscordScopeAlert()`(D-AUTH-05)
- 빈 에러 슬롯: `.error-msg` (CSS만 정의, 마크업 미사용)
- 자동 로그인 토글: `#autoLogin` wrapper `title` 속성에 D-AUTH-07 안내 ("체크 시 약 30일 유지 · 공용 PC에서는 해제")
- 좌측 패널 숨김 브레이크포인트: 768px

## 연관 문서
- [pages.md](../pages.md)
- [slices/slice-01-routing-shell.md](../slices/slice-01-routing-shell.md)
- [schema.md](../schema.md) (`users`)
- [decisions.md](../decisions.md) §[D-AUTH-04](../decisions.md#d-auth-04--비밀번호-찾기-플로우) · [D-AUTH-05](../decisions.md#d-auth-05--discord-oauth-scope) · [D-AUTH-06](../decisions.md#d-auth-06--로그인-실패-잠금-정책) · [D-AUTH-07](../decisions.md#d-auth-07--자동-로그인-유지-기간)
