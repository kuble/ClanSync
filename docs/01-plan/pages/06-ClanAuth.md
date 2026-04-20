# 06 ClanAuth · 클랜 가입 / 만들기

## 한 줄 요약
게임 인증을 마친 사용자가 기존 클랜에 들어가거나, 새 클랜을 만드는 온보딩 화면. 가입은 클랜장 승인이 필요한 "신청 → 대기" 모델.

## 누가 / 언제 본다
- 로그인 + 게임 인증 완료 + 해당 게임 클랜 미소속.
- 게임 인증 직후, 또는 게임 선택에서 "클랜 미소속" 카드를 누른 경우.

## 화면 진입 조건 (D-AUTH-01 매트릭스 #4·#5 진입점)
- 로그인 + 해당 게임 인증 완료 (= 라우트 가드 2단계).
- 미충족 시 부족한 단계로 돌려보냄 (`/sign-in?next=...` 또는 `/games/[g]/auth?next=...`).
- 이미 클랜 `member`(매트릭스 #6)면 자동으로 클랜 메인(`/games/[g]/clan/[c]`)으로 이동.
- 클랜 `pending`(매트릭스 #5)이면 진입 허용 + 가입 탭 안에서 `pendingView` 자동 노출 (D-CLAN-02 상태 머신 결정 후 정렬).

## 사용자 흐름

### 가입 탭

```
[가입 탭] ← 기본
    │
    ├─ 검색·필터로 후보 좁히기
    │
    ├─ 카드 클릭 ──► 우측 드로어 (= 옆 패널)
    │                 클랜 상세 (소개 / 규칙 / 모집 포지션 / 티어대 / 배지 / 외부 링크)
    │
    └─ 드로어 → "가입 신청하기 →" ──► 가입 모달 (자기소개 입력)
                                          │
                                          ▼
                                      "가입 신청" 클릭
                                          │
                                          ├─ 신청 성공 ──► pendingView (전체 화면) — "가입 신청 완료!" + [신청 취소] 버튼
                                          │                "게임 목록으로" → /games
                                          │                내부: clan_join_requests INSERT (status=pending, D-CLAN-02)
                                          │
                                          ├─ 이미 다른 클랜 신청 중 ──► "‘<기존 클랜명>’ 가입 신청 중입니다.
                                          │                              취소하고 새로 신청할까요?" 모달
                                          │                              (단일 신청 정책 — D-CLAN-02)
                                          │
                                          └─ 모집 마감 / 인원 초과 ──► 안내
```

신청 후 결과(승인/거절)는 프로필의 "가입 신청 대기 목록"(D-PROFILE-02)이나 알림으로 받음.

### 만들기 탭

```
[만들기 탭]
    │
    ▼
필수·선택 정보 입력
    │
    ▼
"클랜 만들기 →" 클릭
    │
    ├─ 검사 통과 ──► 클랜 생성 + 본인은 클랜장으로 자동 가입
    │                  │
    │                  ▼
    │              /games/[g]/clan/[c] (대시보드)
    │
    └─ 검사 실패 ──► 해당 칸 안내 (이름 빈값 / 이름 24자 초과 / 인원 범위)
```

## 화면 구성

```
[Navbar]
  로고 → /        [← 게임 목록]                [프로필 ▾]

[스텝 바]
  로그인 ✓   →   게임 인증 ✓   →   ③ 클랜 참여 (active)

[탭]  [클랜 가입]  [클랜 만들기]
```

### 가입 탭 본문

```
[검색바]
  [클랜명 검색...    ]    [⚙ 필터]

[필터 팝오버] (필터 클릭 시 토글)
  · 모집 상태 칩: 전체 / 모집 중 / 곧 종료 / 마감
  · 클랜 지향 칩: 친목 / 빡겜 / 스크림 / 이벤트 / ...
  · 모집 포지션 칩: 탱 / 딜 / 힐 (게임별)
  · 티어 칩: 브론즈 ~ 그랜드마스터
  · 기타 칩: 성인 / 마이크 필수 / 디스코드 보유 ...
  [초기화]   [적용]

[결과 줄]   N개 클랜이 검색되었습니다

[클랜 카드 그리드 #clanList]
  ┌──────────────────────────────────────────┐
  │ [아이콘]  Phoenix Rising  ✓Premium 뱃지  │
  │           모집 중 · 빡겜                  │
  │           "함께할 빡겜 동료를 찾습니다"   │
  │           👥 24/30명 · 28일전 창설        │
  │           [배지 배지 배지]                │
  └──────────────────────────────────────────┘
  ... (5개씩 페이지)

[페이지네이션]   ‹  1  2  ›

[클랜 상세 드로어 #clanDrawer] (카드 클릭 시 우측 슬라이드)
  [아바타] [이름] [배지들]
  [스탯: 인원 · 활동 · 평점 등]
  ── 홍보글
  ── 클랜 규칙
  ── 모집 포지션
  ── 티어대
  ── 클랜 배지
  ── 외부 링크 (디스코드 있을 때만)
  ──────────────
  [    가입 신청하기 →    ]

[가입 모달 #joinModal]
  H3 [클랜명]
  부제 "클랜장의 승인 후 클랜에 참여됩니다"
  [자기소개 (선택) textarea]
  [취소]   [가입 신청]

[대기 뷰 #pendingView] (신청 완료 시 전체 화면 전환)
  ✓ 가입 신청 완료!
  [클랜명]에 가입 신청을 보냈어요.
  [    게임 목록으로    ] → /games
```

### 만들기 탭 본문

```
[클랜명 입력 maxlength=24]   [0 / 24]   ← DB clans.name varchar(24) (D-CLAN-04)

[성별 정책 select]
  무관 / 남성 전용 / 여성 전용

[최대 인원 number]   min=2 max=200 default=30   "2~200명 사이로 입력 (D-CLAN-06: Free·Premium 동일 한도)"
   안내 카피: "권장 30~50명. 200까지 설정 가능하며, 60일+ 무활동 멤버는 자동으로 휴면 분류되어 인원에서 제외됩니다 (D-CLAN-07)."

[출생연도 하한 select]   ← 신설 (D-CLAN-04). 미선택 = 무관
  무관 / 1970년생부터 / 1980년생부터 / ... / (현재년도-10)년생부터

[소개 (선택) textarea]
[규칙 (선택) textarea]

[클랜 특성 카드]
  지향 (단일 칩, 선택 사항 — D-CLAN-05 해제 허용)   친목 / 즐겜 / 빡겜 / 프로
  티어대 (다중 칩 — 8개)                              브론즈 / 실버 / 골드 / 플래티넘 / 다이아몬드 / 마스터 / 그랜드마스터 / 챌린저
  태그 (최대 5개)
    ┌─ 추천 칩 (PRESET_TAGS) — 클릭하면 빠르게 추가
    └─ 직접 추가 입력 칸 + [+] 버튼  ← 신설 (D-CLAN-04). 자유 태그
       검증: 1~12자, 한글·영문·숫자·공백만, 합산 5개 한도

[Discord URL (선택)]
[카카오 오픈채팅 URL (선택)]

[⚠ 경고 박스]
  "클랜 생성 시 클랜장 권한이 부여됩니다.
   정책 위반 클랜은 신고·운영진 검토를 거쳐 단계별 제재(경고→비공개→삭제→계정 정지) 대상이 될 수 있으며,
   일정 기간 활동이 없으면 자동으로 휴면·삭제 처리됩니다." (D-CLAN-03)

[    클랜 만들기 →    ]
```

### 모달·드로어 트리

- 가입 탭
  - `#clanDrawer` (옆 패널) — 카드 클릭 시 열림
  - `#joinModal` (팝업) — 드로어의 "가입 신청하기 →" 클릭 시 열림
- 만들기 탭
  - 모달 없음. 인라인 검증만.

## 버튼·입력·링크가 하는 일

### 가입 탭
| 요소 | 동작 |
|------|------|
| 검색 입력 | 클랜명·홍보글 부분 일치로 그리드 필터 (Phase 1 클라, Phase 2+ 서버 — D-CLAN-01) |
| 필터 칩 | 다중 선택. "적용" 시 `applyFilters()` 호출 → 그리드 갱신 |
| 초기화 | 모든 필터 해제 |
| 카드 클릭 | 우측 드로어 열기 |
| 드로어 닫기 (X / 배경) | 드로어 닫기 |
| "가입 신청하기 →" | 가입 모달 열기. **단일 신청 검증** — 이미 다른 클랜 pending이면 "취소하고 새로 신청?" 모달 (D-CLAN-02) |
| "가입 신청" (모달) | `clan_join_requests` INSERT (status=pending) → `pendingView` 표시. Phase 1: `sessionStorage`에 신청 정보 저장 |
| "취소" (모달) | 모달 닫기 |
| "신청 취소" (`pendingView`) | 신청 행 status='canceled' 업데이트 → 가입 탭 복귀. Phase 1: `sessionStorage` 클리어 |
| "게임 목록으로" (`pendingView`) | `/games` |

### 만들기 탭
| 요소 | 동작 |
|------|------|
| 클랜명 | 24자 이내, 빈값 차단 (DB `varchar(24)`와 정합 — D-CLAN-04) |
| 최대 인원 | 2~200 클램프 |
| 출생연도 하한 select | 미선택 = NULL (무관). 옵션 = 1970 ~ (현재년도-10) — D-CLAN-04 |
| 지향 칩 | 단일 선택, **재클릭으로 해제 가능** (D-CLAN-05). 비워두면 `style = NULL` |
| 티어 칩 | 다중 선택 (8개 — 챌린저 포함) |
| 추천 태그 칩 (PRESET_TAGS) | 클릭으로 빠르게 추가 |
| 직접 추가 입력 + [+] 버튼 | 1~12자 한글·영문·숫자·공백만. 합산 5개 한도 (`MAX_TAGS`) |
| Discord/카카오 URL | 선택. 형식 검사 (운영 시) |
| "클랜 만들기 →" | `handleCreateClan` payload 검증 → DB INSERT → 메인 클랜으로 이동. Phase 1: `sessionStorage`에 draft 저장 |

## 상태별 화면

### 가입 탭

| 상태 | 처리 |
|------|------|
| 결과 0건 | "조건에 맞는 클랜이 없습니다" 빈 상태 (운영 시) |
| 검색 중 | 그리드 위 스피너 또는 스켈레톤 카드 |
| 신청 진행 중 | 모달 CTA "신청 중…" 비활성 |
| 신청 성공 | 대기 뷰 전체 화면 전환 |
| 이미 신청 중 / 가입 중 | 모달 CTA 영역에 안내 (D-CLAN-02) |
| 모집 마감 / 인원 초과 | 카드/드로어 CTA 비활성 + 안내 카피 |

### 만들기 탭

| 상태 | 처리 |
|------|------|
| 검증 실패 | 해당 칸 빨간 안내 |
| 생성 중 | CTA 라벨 "만드는 중…" 비활성 |
| 이름 중복 | "이미 사용 중인 클랜명입니다" (운영 시) |

## 권한·구독에 따른 차이
- 누구나 신청·생성 가능.
- Premium **클랜**은 카드에 ✓ 뱃지 + Premium 툴팁 표시 ("AI 팀 밸런싱, 전적 분석, 승부 예측…").
- 가입 사용자 본인의 구독 등급 분기는 없음.

## 데이터·연동

### 클랜 카드 데이터 (목록·드로어 공통)
| 필드 | 설명 |
|------|------|
| `name` | 클랜명 |
| `icon`, `bg` | 아이콘·배경 색/이미지 |
| `now`, `max` | 현재/최대 인원 |
| `pinned` | true면 Premium 클랜 표시 |
| `days` | 활동 일수 (예: 28) |
| `recruit` | `open` / `soon` / `closed` |
| `style` | 지향 (친목 / 빡겜 등) |
| `positions[]` | 모집 포지션 |
| `tiers[]` | 모집 티어대 |
| `discord`, `discordUrl` | 디스코드 보유 여부 + URL |
| `isNew`, `createdAt` | 신생 표시 |
| `badges[]` | 클랜 배지 (아래 참조) |
| `title`, `desc`, `rules` | 홍보글 본문 |

### 클랜 배지 정의 (BADGE_DEFS · 단일 출처)
이 표는 카드·드로어·홍보글 어디에서나 동일하게 쓴다.

| id | 라벨 | 설명 |
|----|------|------|
| `adult` | 성인 | 19세 이상 성인만 가입 가능한 클랜입니다. |
| `elite` | 엘리트 | 마스터 이상 고티어 플레이어만 지원 가능합니다. |
| `mic` | 마이크 필수 | 음성 채팅 필수 클랜입니다. |
| `discord` | 디스코드 | 디스코드 운영 클랜입니다. |
| (그 외) | (목업 `BADGE_DEFS` 참조) | (운영 시 이 표에 추가) |

### 페이지네이션 (D-CLAN-01 · DECIDED 2026-04-20)
- 페이지 사이즈 `5` 고정 (`PAGE_SIZE`). Phase 1은 클라이언트 페이징·필터, Phase 2+는 서버 페이징 (`?page=&size=`).

### Premium 클랜 표시
- 카드/드로어/홍보글의 `pinned === true`인 클랜에 ✓ 뱃지 표시.
- 호버 툴팁: "✦ Premium 구독 클랜 / AI 팀 밸런싱, 전적 분석, 승부 예측 등 프리미엄 기능을 활성화한 클랜입니다."

### 클랜 라이프사이클 — 목록 노출 정책 (D-CLAN-03 · DECIDED 2026-04-20)

가입 탭 그리드·검색 결과·드로어에서 다음 클랜은 **완전 제외**:

| `lifecycle_status` | `moderation_status` | 카드 노출 | 비고 |
|---|---|---|---|
| `active` | `clean`/`reported` | ✅ 노출 | `reported`는 사용자에 일반 카드처럼 보임 (운영진 큐에서만 처리) |
| `active` | `warned` | ✅ 노출, 단 가입 신청 차단 | 카드에 표시 변화 없음, 가입 모달에서 차단 메시지 |
| `active` | `hidden` | ❌ 제외 | 검색·필터·드로어 모두 |
| `dormant` | * | ❌ 제외 | 60일+ 무활동 |
| `stale` | * | ✅ 노출 | 신생 클랜과 구분 어려워 표시. 클랜장에만 자동 삭제 D-7 알림 |
| `deleted` | * | ❌ 제외 | 행 보존, 모든 화면 제외 |

**구현 (Phase 1 목업)**: `CLANS` 데이터에 `lifecycle_status` 필드 추가, `getFilteredClanKeys()` 단계에서 `dormant`·`deleted`·`hidden` 제외 필터 적용. `warned`는 노출하되 드로어 가입 CTA 비활성 + 안내 카피.

### 신고 흐름 (D-CLAN-03 · 운영 — Phase 2+)

목업 범위는 아니지만 흐름 정의:

1. 드로어 또는 클랜 상세 페이지에서 "🚩 신고" 버튼 (동일 게임 인증 사용자만 노출)
2. 신고 모달 — 카테고리 select(`fake/abuse/harassment/spam/illegal/other`) + 자유 서술 textarea(선택)
3. INSERT `clan_reports` (status='pending')
4. 운영진 큐로 들어감 (사용자에는 "신고가 접수되었습니다" 토스트만)
5. 운영진 처리 결과는 신고자에게 인앱 알림 (valid → "조치되었습니다", invalid → "기각되었습니다")

### 가입 신청 상태 머신 (D-CLAN-02 · DECIDED 2026-04-20)

```
              ┌──── (사용자 취소) ────► canceled
              │
none ──► pending ──── (클랜장 승인) ────► approved ──► clan_members.status = 'active'
              │
              └──── (클랜장 거절) ────► rejected
```

- 별도 테이블 `clan_join_requests`로 라이프사이클 관리 (schema.md 참조)
- 게임당 단일 활성 신청 (DB 부분 유니크 인덱스로 강제)
- pending 동안 항상 취소 가능, 거절 후 즉시 재신청 가능 (쿨다운 0)

## 목업과 실제 구현의 차이
- ~~목업의 검색·필터 함수는 `renderClanList`에 연결돼 있지 않아 실제 필터링이 일어나지 않음.~~ → Phase 1 클라 필터링 적용 (D-CLAN-01 · DECIDED).
- ~~목업의 만들기 폼은 클랜명만 검사하고 `main-clan.html`로 이동 — 태그·티어·정책·Discord URL은 제출 payload에 들어가지 않음.~~ → `handleCreateClan` payload 통합 + `sessionStorage` 저장 (D-CLAN-04 · DECIDED).
- ~~신청은 `pendingView`만 보여줄 뿐 실제 상태 저장 없음.~~ → Phase 1 `sessionStorage`로 신청 상태 저장 + `?pending=1` 흡수 (D-CLAN-02 · DECIDED).
- ~~지향 칩은 코드 주석상 "다시 누르면 해제"이지만 구현상 해제가 안 됨.~~ → `selectSingleChip` 수정으로 해제 동작 (D-CLAN-05 · DECIDED).
- ~~가짜 클랜 검증은 경고 카피만 있음.~~ → 라이프사이클 3분류(정책 위반/휴면/부실) + 신고 시스템 정의 (D-CLAN-03 · DECIDED 2026-04-20). 목업은 휴면 클랜 목록 제외 + 만들기 폼 안내 카피만 적용, 신고 모달·운영진 큐는 운영 페이지에서 별도 구현.
- ~~인원 200명의 근거 미정~~ → 200 유지, Free·Premium 동일 (D-CLAN-06 · DECIDED 2026-04-20). 200명 클랜의 운영 가능성은 D-CLAN-07 멤버 활성도 분류로 보완.
- 멤버 활성도 3분류(활성/비활성/휴면)는 D-CLAN-07 (DECIDED 2026-04-20). 멤버 관리 페이지의 휴면 섹션·일괄 탈퇴 UI는 클랜 관리 페이지(`manage.html`) 개발 시 반영.
- 가입 모달과 메인 게임 허브의 가입 모달은 **동일 컴포넌트로 공유** 가능 → 구현 시 추출 권장.

## 결정 필요
- ~~D-CLAN-01 검색·필터의 서버/클라 분담, 페이지 사이즈~~ — DECIDED 2026-04-20
- ~~D-CLAN-02 가입 신청 상태 머신, 중복 신청, 취소 시점~~ — DECIDED 2026-04-20
- ~~D-CLAN-03 클랜 라이프사이클(정책 위반/휴면/부실) 처리~~ — DECIDED 2026-04-20
- ~~D-CLAN-04 클랜 만들기 폼의 실제 저장 payload 정의~~ — DECIDED 2026-04-20
- ~~D-CLAN-05 지향 단일 칩 해제 동작~~ — DECIDED 2026-04-20
- ~~D-CLAN-06 인원 상한 200 유지, Premium 인원 차별화 없음~~ — DECIDED 2026-04-20
- ~~D-CLAN-07 멤버 활성도 분류 + 휴면 멤버 처리~~ — DECIDED 2026-04-20

## 구현 참고 (개발자용)

- 목업 파일: `mockup/pages/clan-auth.html`
- 클랜 데이터: `CLANS` 객체 (키 `phoenix`, `bluestorm` 등 7개)
- 배지 정의: `BADGE_DEFS`
- 핵심 함수:
  - `applyClanAuthBootstrap()` — 진입 시 `?game=`·`?pending=1` 흡수 + `sessionStorage` 신청 상태 복원 → `pendingView` 자동 노출 결정 (D-AUTH-01 매트릭스 #5 / D-CLAN-02)
  - `switchTab(tab)` — 가입/만들기 탭 전환
  - `openClanDrawer(key)` — 드로어에 데이터 채우기
  - `openJoinFromDrawer()` → 단일 신청 검증 후 `joinModal` 표시 (D-CLAN-02)
  - `submitJoin()` → `sessionStorage.clansync_clan_apply` 저장 + `pendingView` 전환
  - `cancelPendingApplication()` — `pendingView` "신청 취소" 버튼 → `sessionStorage` 클리어 + 가입 탭 복귀 (D-CLAN-02)
  - `handleCreateClan()` — 폼 전체 payload 검증 + `sessionStorage.clansync_create_clan_draft` 저장 후 `main-clan.html` 이동 (D-CLAN-04)
  - `selectSingleChip(el, group)` — 같은 칩 재클릭 시 해제 허용 (D-CLAN-05)
  - `addCustomTag()` / `validateCustomTag(text)` — 자유 태그 입력 + 검증 (D-CLAN-04)
  - `filterClans(q)` + `applyFilters()` — 클라이언트 검색·필터링 (D-CLAN-01)
  - `clampMembers(input)`, `MAX_TAGS = 5`, `PAGE_SIZE = 5`
- 데이터 키 (Phase 1 `sessionStorage`):
  - `clansync_clan_apply` — `{ clanKey, clanName, gameSlug, appliedAt }`
  - `clansync_create_clan_draft` — D-CLAN-04 payload 전체
- 전역 메모리: `window._joinClanName`
- 글로벌 배지 툴팁: `#badgeTip` + `showBadgeTip` / `hideBadgeTip`

## 연관 문서
- [pages.md](../pages.md)
- [slices/slice-02-game-clan-onboarding.md](../slices/slice-02-game-clan-onboarding.md)
- [schema.md](../schema.md) (`clans`, `clan_members`)
- [decisions.md](../decisions.md) (D-CLAN-01 ~ 06)
- [gating-matrix.md](../gating-matrix.md)
