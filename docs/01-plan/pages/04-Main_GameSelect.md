# 04 Main Game Select · 게임 선택

## 한 줄 요약
로그인한 사용자가 어떤 게임의 클랜 활동을 할지 고르는 허브 화면. 게임의 인증·소속 상태에 따라 다음 화면이 갈린다.

## 누가 / 언제 본다
- 로그인한 사용자.
- 로그인 직후 기본 진입점.

## 화면 진입 조건
- 로그인 필요 (= 라우트 가드). 미로그인 시 `/sign-in`으로 자동 이동.

## 사용자 흐름

게임 카드 클릭 후 행선지는 **(게임 인증) × (클랜 소속)** 6칸 매트릭스로 결정된다 (D-AUTH-01 · DECIDED 2026-04-20). 자세한 표는 [pages.md §라우팅 매트릭스](../pages.md#게임-인증--클랜-소속-라우팅-매트릭스-d-auth-01--decided-2026-04-20) 또는 [decisions.md §D-AUTH-01](../decisions.md#d-auth-01--게임-인증--클랜-소속-라우팅-매트릭스).

```
[게임 카드 클릭]  ── routeFromGameCard(card) ──►
   │
   ├─ #1 인증 ✗ · clan=none    ──► /games/[g]/auth
   ├─ #2 인증 ✗ · clan=pending ──► /games/[g]/auth   (인증 복구 후 #5로 자연 이동)
   ├─ #3 인증 ✗ · clan=member  ──► /games/[g]/auth?reauth=1
   ├─ #4 인증 ✓ · clan=none    ──► /games/[g]/clan
   ├─ #5 인증 ✓ · clan=pending ──► /games/[g]/clan   (pendingView 자동 노출)
   ├─ #6 인증 ✓ · clan=member  ──► /games/[g]/clan/[clanId]
   └─ 출시 예정 / 추가 예정     ──► 비활성 (안내만)
```

부가:
- 우상단 프로필 메뉴 → "마이페이지"는 플레이어 프로필 모달 띄우기 (실패 시 `/profile`로 이동)
- "로그아웃" → `/sign-in`

## 화면 구성

```
[Navbar]
  로고  →  /                              [프로필 아바타 ▾]
                                            ├─ 닉네임 / 이메일
                                            ├─ 마이페이지 → 모달
                                            ├─ 보유 코인 (개인 풀)
                                            ├─ 다크 모드 토글
                                            ├─ 언어 탭 (KR/EN/JP)
                                            └─ 로그아웃

[본문]
  H1 "게임 선택"
  부제 "플레이할 게임을 선택하세요."
  검색 [게임 검색 ____]   ← 이름 부분 일치 필터

  [게임 그리드 #gamesGrid]
    ┌─────────────────────────┐  ┌─────────────────────────┐
    │ Overwatch               │  │ Valorant                │
    │ ● 초록   클랜 가입됨    │  │ ● 빨강   계정 미연동    │
    │ "Phoenix Rising 클랜"   │  │                         │
    └─────────────────────────┘  └─────────────────────────┘
    ┌─────────────────────────┐  ┌─────────────────────────┐
    │ League of Legends       │  │ PUBG                    │
    │ ● 회색   출시 예정      │  │ ● 회색   출시 예정      │
    └─────────────────────────┘  └─────────────────────────┘
    ┌─────────────────────────┐
    │ + 다른 게임             │
    │   곧 추가 예정          │
    │   요청하시면 검토합니다 │
    └─────────────────────────┘
```

### 모달·드로어
- **플레이어 프로필 모달** — 프로필 메뉴의 "마이페이지" 클릭 시 partial을 가져와 표시. 실패 시 `/profile`로 이동.

## 버튼·입력·링크가 하는 일

| 요소 | 동작 |
|------|------|
| 게임 검색 입력 | 카드 이름 부분 일치로 표시/숨김. 결과 0건일 때 빈 상태 안내 (운영 시 추가, D-검색 결과 안내) |
| 게임 카드 (활성) | `routeFromGameCard(card)` — 카드 `data-auth`·`data-clan-status`·`data-clan-id`를 읽어 D-AUTH-01 매트릭스대로 분기. 목업 OW 카드는 `data-auth=true · clan-status=member`(매트릭스 #6) → `main-clan.html`. 발로란트 카드는 `data-auth=false · clan-status=none`(매트릭스 #1) → `game-auth.html?game=valorant` |
| 게임 카드 (LoL / PUBG) | 비활성. 클릭 무반응 |
| + 다른 게임 카드 | 비활성. 안내만 |
| 마이페이지 | 플레이어 프로필 모달 |
| 로그아웃 | `/sign-in` |
| 다크 모드 토글 | 시각만 (목업). 운영 시 사용자 설정 저장 |
| 언어 탭 | 시각만 (D-LANDING-02) |

## 상태별 화면

| 상태 | 처리 |
|------|------|
| 첫 진입 | 카드 그리드 즉시 표시 (정적) |
| 검색 결과 0건 | 빈 상태 안내 ("검색 결과가 없습니다") — 목업에는 미구현 |
| 카드 상태 점 | 매트릭스 6칸 + 비활성 1칸 = 7가지: 초록(#6) / 파랑(#4·#5) / 빨강(#1·#2) / 노랑(#3) / 회색(예정). 라벨 카피는 [decisions.md §D-AUTH-01](../decisions.md#d-auth-01--게임-인증--클랜-소속-라우팅-매트릭스) 표 |
| 모달 fetch 실패 | `/profile`로 자동 이동 |
| 로그아웃 진행 중 | 별도 표시 없음 (즉시 이동) |

## 권한·구독에 따른 차이
- 모든 로그인 사용자 공통.
- 구독 등급 분기 없음 (요금제 비교는 `/pricing`이나 클랜 관리에서).

## 데이터·연동
- 사용자별 **게임 인증 상태**: 어떤 게임에 외부 계정을 연동했는지.
- 사용자별 **클랜 소속 상태**: 게임별 어느 클랜에 속해 있는지.
- 활성 클랜이 있으면 클랜명을 카드 라벨로 표시.

## 목업과 실제 구현의 차이
- 목업 카드는 D-AUTH-01 매트릭스를 `data-*` 속성으로 시뮬레이션. 실제로는 서버 컨텍스트에서 `(auth_status, clan_status)`를 받아 같은 매트릭스로 분기.
- 목업은 카드 라벨이 정적. 실제로는 사용자별 상태에 따라 동적으로 채움.
- 검색 결과 0건 안내 미구현.

## 결정 필요
- ~~D-AUTH-01 게임 인증·클랜 소속 상태에 따른 라우팅 매트릭스~~ → DECIDED 2026-04-20 ([decisions.md](../decisions.md#d-auth-01--게임-인증--클랜-소속-라우팅-매트릭스))
- (신설 검토) 검색 결과 0건 화면 카피
- (신설 검토) 게임 카드 정렬 규칙 (출시순? 활동 클랜수? 사용자 활동순?)

## 구현 참고 (개발자용)

- 목업 파일: `mockup/pages/games.html`
- 카드 컨테이너: `#gamesGrid`
- 검색 핸들러: `filterGames(input)` — `.game-name` 부분 일치
- 카드 클릭 라우터: `routeFromGameCard(card)` — `data-game / data-auth / data-clan-status / data-clan-id / data-clan-name`을 읽어 D-AUTH-01 매트릭스 6칸으로 분기. `data-disabled="true"`(출시 예정)는 무반응.
- 프로필 모달: `mockPlayerProfileModalOpen()` (`app.js`) — partial fetch, 실패 시 `profile.html` 이동
- 프로필 메뉴 토글: `toggleProfileMenu()` → `#profileDropdown.open`

## 연관 문서
- [pages.md](../pages.md)
- [slices/slice-01-routing-shell.md](../slices/slice-01-routing-shell.md)
- [schema.md](../schema.md) (`user_game_profiles`, `clan_members`)
- [decisions.md](../decisions.md) (D-AUTH-01)
