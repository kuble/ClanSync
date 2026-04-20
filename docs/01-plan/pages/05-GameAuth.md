# 05 GameAuth · 게임 계정 연동

## 한 줄 요약
선택한 게임의 외부 계정(예: Battle.net)을 ClanSync에 연결해 본인 인증 + 닉네임/티어 정보를 가져오는 화면.

## 누가 / 언제 본다
- 로그인한 사용자가 게임 선택에서 "인증 X" 게임 카드를 누른 경우.
- 외부 계정 잠시 끊겨서 재연동이 필요할 때.

## 화면 진입 조건
- 로그인 필요. 미로그인 시 `/sign-in?next=...`로 자동 이동.
- 이미 인증 완료된 게임이면 자동으로 다음 단계로 보냄 (D-AUTH-01 매트릭스): 클랜 `member` → `.../clan/[clanId]`, `none/pending` → `.../clan`.
- **예외**: 쿼리 `?reauth=1`이 붙어 들어오면 인증 완료된 사용자라도 화면 유지 (D-AUTH-01 #3 — 토큰 만료된 기존 멤버 재연동). 상단에 "기존 인증이 만료되어 다시 연결이 필요합니다" 안내 배지 노출.

## 사용자 흐름

```
[게임 선택] ✓ 완료
    │
    ▼
[2 계정 연동] ← 현재 화면
    │
    ├─ "Battle.net으로 계속하기" 클릭
    │       │
    │       ▼
    │   외부 OAuth 팝업/리다이렉트
    │       │
    │       ├─ 승인 ──► 우리 서버에 토큰·프로필 저장
    │       │           │
    │       │           ▼
    │       │       /games/[g]/clan 으로 이동 (3 클랜 입장)
    │       │
    │       ├─ 거부 / 닫음 ──► 에러 카드 표시 + "다시 시도"
    │       │
    │       └─ 네트워크 오류 ──► 에러 카드 표시 + "다시 시도"
    │
    └─ "← 게임 선택" 클릭 ──► /games
```

## 화면 구성

```
[Navbar]
  로고  →  /          [← 게임 선택]                [프로필 ▾]

[스텝 바]
  ① 게임 선택 ✓   →   ② 계정 연동 (active)   →   ③ 클랜 입장

[재연동 안내 배지]  (?reauth=1 일 때만)
  ⚠ "기존 인증이 만료되어 다시 연결이 필요합니다."

[연동 카드 .auth-card]
  (game-icon-large) ← 슬러그별 아이콘 (D-AUTH-02 표)
  H1: <게임명> 계정 연동       ← 슬러그별 (D-AUTH-02)
  부제: "<제공자> 계정으로 본인을 확인합니다."

  [방법 카드]
    <제공자> OAuth              ← overwatch=Battle.net / valorant·lol=Riot RSO / pubg=Krafton
    "공식 로그인으로 안전하게 연결"

  [    <제공자>으로 계속하기    ]   ← primary CTA (lol·pubg는 비활성 + "출시 예정")

[정보 박스 .info-box]
  "연동은 읽기 전용 권한이며, 비밀번호는 저장하지 않습니다."

[에러 카드 #authError] (기본 숨김, 실패 시 표시)
  H3 "Battle.net 연동에 실패했습니다."
  설명 "팝업이 차단되었는지 확인하고 다시 시도해 주세요."
  [    다시 시도    ]
```

### 모달·드로어
- 없음. 외부 OAuth는 새 창/리다이렉트.

## 버튼·입력·링크가 하는 일

| 요소 | 동작 |
|------|------|
| ← 게임 선택 | `/games` |
| Battle.net으로 계속하기 | OAuth 시작. 클릭 즉시 라벨 "연동 중…" + 비활성 |
| 다시 시도 (에러 카드) | 에러 숨김 + 버튼 복구. OAuth 재시작 |
| 프로필 메뉴 → 마이페이지 | 플레이어 프로필 모달 |

## 상태별 화면

| 상태 | 처리 |
|------|------|
| idle | 기본 카드 + CTA |
| 요청 중 | CTA 라벨 "연동 중…", 비활성. (운영 시) 안내 스피너 표시 — 목업 CSS `.spinner`는 정의만 있고 미사용 |
| OAuth 거부 | 에러 카드 표시. CTA 복구. (목업은 트리거 미구현) |
| 네트워크 오류 | 동일하게 에러 카드 |
| 성공 | D-AUTH-01 매트릭스 평가: clan=member → `.../clan/[clanId]`, 그 외 → `.../clan` (목업은 1.5초 지연 후 `clan-auth.html`로 이동) |
| 이미 연동된 게임으로 재진입 | 자동 다음 단계 (D-AUTH-01). 단 `?reauth=1`이면 화면 유지 |
| 출시 예정 게임 (`lol`, `pubg`) | CTA 비활성 + "곧 추가 예정입니다." (D-AUTH-02) |
| 미지원 슬러그 / 누락 | 폴백 카드("지원하지 않는 게임") + "← 게임 선택으로" CTA |

## 권한·구독에 따른 차이
- 없음. 모든 로그인 사용자 공통.

## 데이터·연동
- **읽기 권한만**: 닉네임, 게임 ID(BattleTag 등), 공개 프로필.
- 비밀번호는 받지 않고 저장하지 않음.
- 성공 시 `user_game_profiles`에 (사용자, 게임, 외부 ID, 연동 일시) 저장.
- 게임별 OAuth 제공자 매핑 (D-AUTH-02 · DECIDED 2026-04-20):
  - `overwatch` → Battle.net OAuth
  - `valorant` → Riot RSO
  - `lol` → Riot RSO (출시 예정 — CTA 비활성)
  - `pubg` → Krafton (출시 예정 — CTA 비활성)
  - 미지원 / 누락 → 폴백 카드
- Riot RSO는 LoL·발로란트가 단일 SSO. Phase 2+ 최적화 후보로, 한쪽 인증이 있으면 다른 쪽 자동 연동 가능.

## 목업과 실제 구현의 차이
- 목업은 1.5초 지연 후 무조건 성공 처리하고 `clan-auth.html`로 이동. 운영은 D-AUTH-01 매트릭스 결과로 분기.
- `?game=` 쿼리를 읽어 `GAME_AUTH_PROVIDERS` 매핑으로 화면 갱신 (D-AUTH-02 적용).
- 에러 카드 `#authError`·재시도는 운영 트리거 없이 데모 시각화용으로 유지.
- 스피너 CSS만 있고 미사용 — 운영 시 인증 진행 상태 표시에 활용 예정.
- `?reauth=1` 안내 배지는 목업에서도 쿼리 감지 시 노출.

## 결정 필요
- ~~D-AUTH-02 게임별 OAuth 화면 분기~~ → DECIDED 2026-04-20 ([decisions.md](../decisions.md#d-auth-02--게임별-oauth-제공자-매핑))
- ~~D-AUTH-01 인증 완료 후 다음 단계 라우팅~~ → DECIDED 2026-04-20 ([decisions.md](../decisions.md#d-auth-01--게임-인증--클랜-소속-라우팅-매트릭스))

## 구현 참고 (개발자용)

- 목업 파일: `mockup/pages/game-auth.html`
- 핵심 매핑: `GAME_AUTH_PROVIDERS = { overwatch, valorant, lol, pubg }` — 제목·아이콘·CTA·안내 카피·활성 여부
- 핵심 함수: `applyGameAuthConfig()` (부트스트랩 — `?game=` 파싱, `?reauth=1` 안내 배지 토글), `handleBattleNetAuth()`(이름은 유지, 모든 제공자 공용 시뮬레이터), `retryAuth()`
- 데드 슬롯: `#authError` (트리거 없음)
- 미사용 CSS: `.spinner`
- 스텝 바: `.step` × 3, active 클래스 토글

## 연관 문서
- [pages.md](../pages.md)
- [slices/slice-02-game-clan-onboarding.md](../slices/slice-02-game-clan-onboarding.md)
- [schema.md](../schema.md) (`user_game_profiles`)
- [decisions.md](../decisions.md) (D-AUTH-01, D-AUTH-02)
