# 07 MainClan · 클랜 메인 (셸 + 대시보드)

## 한 줄 요약
하나의 클랜을 활동 단위로 묶은 메인 허브. 좌측 사이드바로 대시보드 / 밸런스메이커 / 통계 / 이벤트 / 관리 / 스토어를 갈아끼우는 "셸"이고, 첫 화면은 대시보드.

## 누가 / 언제 본다
- 로그인 + 게임 인증 + 해당 클랜 소속 사용자.
- 게임 선택에서 "클랜 가입됨" 카드 클릭, 또는 가입 승인 직후.

## 화면 진입 조건
- 로그인 → 게임 인증 → 클랜 소속 (= 라우트 가드 3단계).
- 미충족 시 부족한 단계로 돌려보냄.
- 메뉴 중 "클랜 관리"는 운영진+ 전용 (직접 URL 접근도 차단, `?hubDebug=1`만 예외).

## 사용자 흐름

```
클랜 메인 진입 (#dash 기본)
    │
    ├─ 사이드바 클릭 ──► 해당 뷰로 전환 (URL 해시 갱신)
    │       · 대시보드 #dash
    │       · 밸런스메이커 #balance
    │       · 클랜 통계 #stats
    │       · 이벤트 #events
    │       · 클랜 관리 #manage   (운영진+)
    │       · 클랜 스토어 #store
    │
    ├─ 사이드바 하단 ──► 외부 화면
    │       · 커뮤니티 → 메인 게임 허브 (/games/[g])
    │       · 프로필 → /profile
    │
    └─ 클랜 배너 "내전 시작" 버튼 (대시보드/스토어에서만 표시)
            ├─ 운영진+ ──► #balance
            └─ 구성원 ──► alert ("구성원은 밸런스메이커를 열 수 없습니다")
```

## 화면 구성 (셸 레이아웃)

```
┌───────────────────────────────────────────────────────────────┐
│  [Navbar]   브레드크럼: Overwatch › Phoenix Rising           │
├──────┬────────────────────────────────────────────────────────┤
│      │                                                        │
│      │  [클랜 배너] (대시보드 / 스토어에서만 표시)            │
│      │   클랜명 · 멤버수 · 지향  ...  [내전 시작]            │
│      │                                                        │
│ side │  ┌────────────── 본문 (현재 뷰) ─────────────────┐  │
│ bar  │  │                                                │  │
│      │  │  view-dash / view-balance / view-stats / ...   │  │
│      │  │                                                │  │
│      │  └────────────────────────────────────────────────┘  │
│      │                                                        │
└──────┴────────────────────────────────────────────────────────┘
```

### 사이드바 동작
- 데스크톱(≥769px): **기본 64px(접힘)** ← 마우스 올리면 220px로 펼쳐짐 (라벨·항목명 노출).
- 모바일(≤768px): 햄버거 → 옆 패널(드로어) 형태. 배경 오버레이 클릭 시 닫힘.
- 본문은 항상 접힘 기준(64px) 마진을 가져 호버 펼침이 본문을 밀지 않음.

### 사이드바 항목

| 항목 | 해시 | 권한 | 알림 점 |
|------|------|------|---------|
| 대시보드 | `#dash` | 전원 | — |
| 밸런스메이커 | `#balance` | 전원 (구성원은 관전 + "내전 시작" 차단) | `#sidebar-notify-balance` |
| 클랜 통계 | `#stats` | 전원 (구성원은 일부 탭 차단) | — |
| 이벤트 | `#events` | 전원 (구성원은 등록 불가) | `#sidebar-notify-events` |
| 클랜 관리 | `#manage` | **운영진+ 전용** | — |
| 클랜 스토어 | `#store` | 전원 | — |
| ─── 하단 ─── | | | |
| 커뮤니티 (메인 게임) | `/games/[g]` | 전원 | — |
| 프로필 | `/profile` | 전원 | — |

### 클랜 배너 표시 규칙

| 뷰 | 배너 |
|----|------|
| 대시보드 (`view-dash`) | ✓ 표시 |
| 클랜 스토어 (`view-store`) | ✓ 표시 |
| 밸런스메이커 / 통계 / 이벤트 / 관리 | ✗ 숨김 |

## 대시보드 본문 (view-dash)

대시보드는 클랜의 "거실" 같은 화면. 한눈에 클랜 상태를 보고 바로 다음 행동을 결정한다.

### 영역 구성

```
[클랜 공지사항]                   [다가오는 일정]
  최신 5개 핀 카드                  · 정기 내전 (오늘)
  [전체보기]                        · Blue Storm 스크림 (확정)
                                    · 클랜 토너먼트 (Premium)
[클랜 규칙 미리보기]              [이벤트 →]
  로컬 저장 텍스트 미리보기
  [전체보기]
                                  [클랜 배지 컬렉션]
                                    창단 · 내전100 · 스크림우승 · 만원클랜
                                    🔒 잠금 배지 2개 (해금 조건 툴팁)

[MVP 카드 3개]
  · 승률 MVP
  · 참여율 MVP
  · 승부예측 MVP   (Free에서는 🔒 + "업그레이드" 버튼)
```

### 모달

| 모달 | 트리거 | 내용 |
|------|--------|------|
| 공지 읽기 | 공지 카드 클릭 | 제목 · 메타 · 본문 · [닫기] |
| 규칙 읽기 | 규칙 카드 클릭 / Enter | 전체 규칙 텍스트 · [닫기] |

### 운영진 전용 표시
- 공지 카드 옆 "관리" 링크 → 클랜 관리(개요)의 공지 작성/편집으로 점프.
- 규칙 카드 옆 "편집" 링크 → 클랜 관리(개요)의 규칙 편집으로 점프.

## 버튼·입력·링크가 하는 일 (셸 + 대시보드)

| 요소 | 동작 |
|------|------|
| 사이드바 항목 | 해당 뷰로 전환 + 해시 갱신. 대시보드는 해시 제거 |
| 사이드바 호버 | 220px로 확장, 라벨 노출 |
| 모바일 햄버거 | 사이드바 드로어 열기 |
| 클랜 배너 "내전 시작" | 운영진+ → `#balance`, 구성원 → alert |
| 공지/규칙 카드 | 읽기 모달 |
| "관리" / "편집" (운영진+) | 클랜 관리 → 개요 탭으로 이동 |
| MVP 카드 "업그레이드" (Free) | 결제/구독 화면으로 이동 (운영 시 정의) |
| 다가오는 일정 카드 | 이벤트(`#events`)로 이동 |
| 사이드바 하단 "커뮤니티" | `/games/[g]` |
| 사이드바 하단 "프로필" | `/profile` |

## 상태별 화면

| 상태 | 처리 |
|------|------|
| 공지 0건 | "등록된 공지가 없습니다. 클랜 관리에서 공지를 작성하세요." |
| 규칙 미등록 | "아직 등록된 규칙이 없습니다. 클랜 관리에서 규칙을 등록하세요." |
| 규칙 로드 실패 | "규칙을 불러오지 못했습니다." |
| 알림 점 | 디버그 모드(`MOCK_SIDEBAR_NOTIFY_DEBUG = true` 또는 `?sidebarNotifyDebug=1`)일 때 표시. 운영 트리거는 D-SHELL-03 |
| 구성원의 #manage 직접 진입 | alert 후 차단. `?hubDebug=1`이면 예외 |

## 권한·구독에 따른 차이

자세한 표는 [gating-matrix.md](../gating-matrix.md) §2~§3 참조. 요약하면:

- **클랜장** (leader): 모든 메뉴 + 모든 액션.
- **운영진** (officer): 클랜 관리 메뉴 접근, 공지·규칙 편집, 이벤트 등록, 구성원 관리 등. 단, 구독·결제 변경은 클랜장만.
- **구성원** (member): "관리" 메뉴 자체 차단. "내전 시작" 차단. 클랜 통계의 "경기 기록" 탭 차단.
- **Free 플랜**: 승부예측 MVP 카드 잠금 + "업그레이드" 안내. 그 외 대시보드는 동일.
- **Premium 플랜**: 모든 카드 활성.

## 데이터·연동
- **공지**: 클랜별 공지 목록(최대 5개 핀 표시). 본문은 모달에서 전체 표시.
- **규칙**: 클랜별 단일 텍스트.
- **다가오는 일정**: 캘린더에서 가까운 N건 (운영 시 자동 채움 — 목업은 정적 3건).
- **MVP 카드**: 통계 집계 결과 (승률 MVP, 참여율 MVP, 승부예측 MVP).
- **클랜 배지 컬렉션**: 해금된 배지 + 잠금 배지(툴팁에 해금 조건).

## 목업과 실제 구현의 차이

### 목업 전용 시나리오 (운영 시 제거 또는 디버그 한정)
- `_hub.html`이 sessionStorage로 역할/플랜을 토글하고, iframe URL `?role=…&plan=…`로 클랜 메인을 로드.
- `?role=` `?plan=` 쿼리는 목업 한정. 운영에선 서버 세션·DB 권한이 단일 출처여야 함 (D-SHELL-02).
- `?hubDebug=1`은 구성원이 관리 메뉴를 클릭 가능하게 하는 디버그 우회. 운영에선 비활성.

### 본문 데이터
- 공지·규칙은 목업에서 `localStorage`로 저장. 실제는 서버 DB.
- 다가오는 일정은 목업 정적 마크업. 실제는 캘린더 데이터에서 가까운 N건을 동적으로.
- "관리" 링크의 `#mock-clan-role-label` 같은 데드 슬롯이 일부 존재.

## 결정 필요
- D-SHELL-01 사이드바 hover 확장의 모바일 대응 일관성
- D-SHELL-02 `?role=` `?plan=` 쿼리 우회 차단 (서버 권한 단일 출처)
- D-SHELL-03 사이드바 알림 점의 운영 트리거 규칙
- (대시보드) 다가오는 일정의 동적 채움 정책 — 며칠 이내 / 최대 N건

## 구현 참고 (개발자용)

- 목업 파일: `mockup/pages/main-clan.html`, `mockup/_hub.html`
- 핵심 스크립트: `mockup/scripts/clan-mock.js`, `mockup/scripts/app.js`
- 뷰 매핑: `CLAN_VIEW_MAP` (`dash`→`view-dash`, `events`→`view-events`, …)
- 배너 숨김 뷰 목록: `CLAN_BANNER_HIDE_VIEWS` (`balance`, `stats`, `events`, `manage`)
- 사이드바 본문 클래스: `body.app-sidebar-collapsible`, 컨테이너 `aside#app-sidebar.sidebar`
- 너비: 기본 64px, hover 220px (CSS `mockup/styles/main.css`)
- 권한·플랜 결정:
  - `mockClanCurrentRole()`, `mockClanCurrentPlan()`
  - 우선순위: `?role=` / `?plan=` → sessionStorage(`clansync-hub-mock-role`, `clansync-hub-mock-plan`) → localStorage(`clansync-mock-subscribe-v1`)
  - body 클래스: `mock-role-leader|officer|member`, `mock-plan-free|premium`
- 게이팅 클래스: `mock-officer-only`, `mock-member-only`, `mock-hide-on-free`, `mock-plan-premium`, `mock-plan-free`
- 알림 점: `#sidebar-notify-balance`, `#sidebar-notify-events`, `mockSidebarNotifyRefresh()`, `mockSidebarNotifyClearView(view)`
- 공지·규칙 저장 키: `MOCK_CLAN_NOTICE_POSTS_KEY`, `MOCK_CLAN_RULES_KEY`, `MOCK_CLAN_RULES_DEFAULT_TEXT`
- 디버그 배너: `#mock-hub-debug-banner` (`?hubDebug=1`)

## 연관 문서
- [pages.md](../pages.md)
- [slices/slice-03-main-clan-shell.md](../slices/slice-03-main-clan-shell.md)
- [non-page/clan-main-static-mockup-plan.md](../non-page/clan-main-static-mockup-plan.md)
- [gating-matrix.md](../gating-matrix.md)
- [decisions.md](../decisions.md)
- 하위 뷰 문서: [09-BalanceMaker.md](./09-BalanceMaker.md), [10-Clan-Stats.md](./10-Clan-Stats.md), [11-Clan-Events.md](./11-Clan-Events.md), [12-Clan-Manage.md](./12-Clan-Manage.md), [13-Clan-Store.md](./13-Clan-Store.md)
