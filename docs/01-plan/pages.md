# ClanSync 페이지 구조

## 라우팅 맵

```
/                          → Landing Page (비로그인)
/sign-in                   → 로그인
/sign-up                   → 회원가입

/profile                   → 플레이어 프로필·꾸미기 (로그인 필요 · 게임 단위 경로 밖)
/games                     → Main_GameSelect (로그인 필요)
/games/[gameSlug]/auth     → GameAuth (게임 인증)
/games/[gameSlug]/clan     → ClanAuth (클랜 가입/생성)
/games/[gameSlug]/clan/[clanId]         → MainClan
/games/[gameSlug]/clan/[clanId]/balance → 밸런스메이커
/games/[gameSlug]/clan/[clanId]/stats   → 클랜 통계(탭·권한: [pages/10-Clan-Stats.md](./pages/10-Clan-Stats.md))
/games/[gameSlug]/clan/[clanId]/events  → 클랜 이벤트
/games/[gameSlug]/clan/[clanId]/manage  → 클랜 관리(구성원별 개인 통계·승패 등)
/games/[gameSlug]/clan/[clanId]/store   → 클랜 스토어
/games/[gameSlug]                       → MainGame (커뮤니티)
/games/[gameSlug]/board/[postId]        → 게시글 상세 (목업 HTML 미작성 · Phase 2+)
```

## 인증/권한 미들웨어 흐름

```
요청
 ├─ 비로그인 → /sign-in?next=<원래 경로>
 ├─ 로그인됨
 │   ├─ /profile (및 전역 계정·꾸미기) → 세션만으로 허용 (게임 OAuth·클랜 소속 불필요)
 │   ├─ /games/[slug]/... 게임 이하 (D-AUTH-01)
 │   │   ├─ 게임 인증 없음 → /games/[gameSlug]/auth?next=<원래 경로>
 │   │   ├─ 클랜 소속 = none    → /games/[gameSlug]/clan
 │   │   ├─ 클랜 소속 = pending → /games/[gameSlug]/clan (가입 탭 + pendingView 자동)
 │   │   └─ 클랜 소속 = member  → 요청 경로 허용
 │   │                            (.../auth · .../clan 직진입 시 .../clan/[clanId]로 정정)
 │   └─ /games/[slug] (MainGame 커뮤니티)는 클랜 소속 가드 면제 — 게임 인증만 필요
 └─ 클랜 권한 부족(관리·밸런스 편집 등) → 403
```

**메모**: 클랜 가입 후 **첫 화면**은 제품 설정에 따름(대개 **클랜 홈** `.../clan/[clanId]`). **MainGame** `.../games/[slug]`는 커뮤니티·홍보·LFG 등으로 별도 진입.

### 게임 인증 × 클랜 소속 라우팅 매트릭스 (D-AUTH-01 · DECIDED 2026-04-20)

게임 카드 클릭 또는 `/games/[gameSlug]/...` 직접 진입 시, (`auth_status`, `clan_status`) 쌍으로 결과가 결정된다. 전체 결정 명세는 [decisions.md §D-AUTH-01](./decisions.md#d-auth-01--게임-인증--클랜-소속-라우팅-매트릭스).

| # | 게임 인증 | 클랜 소속 | 카드 점·라벨 | 결과 라우트 |
|---|----------|-----------|-------------|------------|
| 1 | ✗ | none | 빨강 ● 계정 미연동 | `/games/[g]/auth` |
| 2 | ✗ | pending | 빨강 ● 계정 미연동 · 신청 보류 | `/games/[g]/auth` |
| 3 | ✗ | member | 노랑 ● 계정 재연동 필요 | `/games/[g]/auth?reauth=1` |
| 4 | ✓ | none | 파랑 ● 클랜 찾는 중 | `/games/[g]/clan` |
| 5 | ✓ | pending | 파랑 ● <클랜명> 가입 신청 중 | `/games/[g]/clan` (pendingView) |
| 6 | ✓ | member | 초록 ● <클랜명> 가입됨 | `/games/[g]/clan/[clanId]` |

목업은 카드 `data-game / data-auth / data-clan-status / data-clan-id / data-clan-name` 속성으로 6칸을 표현하고, 단일 라우터 함수 `routeFromGameCard(card)`가 위 표를 평가한다 (`mockup/pages/games.html`).

> 용어가 낯설면 [glossary.md](./glossary.md). 권한·플랜 표는 [gating-matrix.md](./gating-matrix.md). 미결 항목 코드는 [decisions.md](./decisions.md).

---

## 페이지별 가드 체인 · 목업 키 한눈에

> 각 페이지가 **어떤 조건 충족 시 진입 가능**한지(가드 체인)와 **목업이 어디에 상태를 저장**하는지를 모은 표. Next.js 미들웨어/Server Component 가드 작성 시 이 표를 출발점으로 한다.
>
> 가드 체인 컬럼은 위 → 아래 순으로 검사. 첫 번째 위반에서 fallback 라우트로 redirect.

| # | 페이지 문서 | 제품 경로 | 가드 체인 (실패 시 → 이동) | 권한·플랜 게이트 | 목업 storage / 쿼리 키 | 핵심 모달·뷰 |
|---|------------|-----------|----------------------------|--------------------|------------------------|-------------|
| 01 | [01-Landing-Page.md](./pages/01-Landing-Page.md) | `/` | 없음 (게스트 허용). 로그인 상태면 CTA 라벨·동작만 변경 | — | `?role=`, `?plan=`, `?game=` (테스트 어시스트) | 없음 |
| 02 | [02-Sign-In.md](./pages/02-Sign-In.md) | `/sign-in` | 이미 로그인 → `/games`로 이동 | — | `localStorage.clansync_remember_email` (옵션) | 비밀번호 찾기 (D-AUTH-02) |
| 03 | [03-Sign-Up.md](./pages/03-Sign-Up.md) | `/sign-up` | 이미 로그인 → `/games` | — | — | 약관 (D-AUTH-03) |
| 04 | [04-Main_GameSelect.md](./pages/04-Main_GameSelect.md) | `/games` | 비로그인 → `/sign-in` | — | `sessionStorage.clansync_pending_game` (선택한 게임). 카드 `data-auth`·`data-clan-status`로 D-AUTH-01 매트릭스 시뮬레이션 | 프로필 모달 (`#playerProfileModal`) |
| 05 | [05-GameAuth.md](./pages/05-GameAuth.md) | `/games/[gameSlug]/auth` | 1) 비로그인 → `/sign-in?next=...` · 2) 이미 게임 인증 + 클랜 `member` → `.../clan/[clanId]` · 3) 이미 게임 인증 + `none/pending` → `.../clan` (단, `?reauth=1`이면 인증 화면 유지 = D-AUTH-01 #3) | — | `sessionStorage.clansync_oauth_state` (CSRF) — 실서비스. 쿼리 `?game=`(목업) → `[gameSlug]`(운영) | 인증 진행 안내, `?reauth=1` 안내 배지 |
| 06 | [06-ClanAuth.md](./pages/06-ClanAuth.md) | `/games/[gameSlug]/clan` | 1) 비로그인 → `/sign-in?next=...` · 2) 게임 인증 없음 → `.../auth?next=...` · 3) 클랜 `member` → `.../clan/[clanId]` · 4) 클랜 `pending` → 진입 허용 + `pendingView` 자동 노출 | — | `sessionStorage.clansync_pending_clan_apply` (선택한 클랜 ID), `clansync_clan_apply_status` | 가입 신청 모달, 클랜 상세 드로어, `pendingView` |
| 07 | [07-MainClan.md](./pages/07-MainClan.md) | `/games/[gameSlug]/clan/[clanId]` | 1) 비로그인 → `/sign-in` · 2) 게임 인증 없음 → `.../auth` · 3) 클랜 미가입 → `.../clan` · 4) 다른 클랜 ID → 본인 클랜으로 정정 | 사이드바 메뉴별 `mock-officer-only`, `mock-hide-on-free` | URL 해시(`#dashboard`, `#balance` 등), `sessionStorage.clansync_sidebar_collapsed` | 알림 드로어, 채팅 패널 |
| 09 | [09-BalanceMaker.md](./pages/09-BalanceMaker.md) | `/games/[gameSlug]/clan/[clanId]/balance` | 07 가드 + (편집은 운영진+) | 편집: officer+, 관전: member 가능. 일부 옵션(맵 풀 확장 등): premium | `sessionStorage.clansync_balance_session_*` (목업 세션 상태) | 결과 입력, 맵·밴 모달 |
| 10 | [10-Clan-Stats.md](./pages/10-Clan-Stats.md) | `/games/[gameSlug]/clan/[clanId]/stats` | 07 가드 + (경기 기록 탭은 officer+) | "경기 기록" 탭: officer+. 그 외: 전원 | URL 해시 `#stats` + 탭 쿼리(가능) | HoF 설정 모달 |
| 11 | [11-Clan-Events.md](./pages/11-Clan-Events.md) | `/games/[gameSlug]/clan/[clanId]/events` | 07 가드 | 일정 등록·삭제: officer+. 대진표 생성기: premium. 투표 생성: officer+ | URL 해시 `#events`, `sessionStorage.clansync_events_filter` | 일정 등록·상세, 대진표 모달, 투표 생성 |
| 12 | [12-Clan-Manage.md](./pages/12-Clan-Manage.md) | `/games/[gameSlug]/clan/[clanId]/manage` | 07 가드 + officer+ (구성원 직접 접근은 403 또는 클랜 홈) | officer+ 전체. 구독결제 탭은 leader 전용(D-MANAGE-01) | URL 해시 `#manage` | 가입 요청 처리, 구성원 상세, 권한 변경 |
| 13 | [13-Clan-Store.md](./pages/13-Clan-Store.md) | `/games/[gameSlug]/clan/[clanId]/store` | 07 가드 | 클랜 풀 결제: leader. 개인 풀 충전·구매: 본인 | URL 해시 `#store` | 코인 충전, 아이템 구매 확인, Premium 업셀 |
| 08 | [08-MainGame.md](./pages/08-MainGame.md) | `/games/[gameSlug]` | 1) 비로그인 → `/sign-in` · 2) 게임 인증 없음 → `.../auth` (클랜 미가입은 허용) | 스크림 자동 매칭: officer+. 스크림 평판 열람: leader | URL 해시 `#home/#promotion/#lfg/#scrim/#ranking`, `sessionStorage.clansync_lfg_filter` 등 | 가입 신청, 게시글 작성, 스크림 매칭 |
| 14 | [14-Profile-Customization.md](./pages/14-Profile-Customization.md) | `/profile` | 비로그인 → `/sign-in` (게임/클랜 가드 없음) | 일부 프리셋: premium | `localStorage.clansync_nameplate_state`, `clansync_badge_case_state` (게임 단위) | 네임카드 케이스, 뱃지 케이스 모달 |

> ※ 위 storage 키는 **목업 전용**. 실제 구현 시 대응 테이블·세션·서버 캐시로 옮긴다. 키 이름은 `mockup/scripts/*.js`의 사용처를 기준으로 한 인용이며, 일부는 정확 매칭이 아닐 수 있어 구현 진입 시 grep로 재확인 필요.

---

## 정적 목업 HTML ↔ 제품 경로 (Phase 1)

S01 쉘·온보딩·전역 프로필은 아래 파일이 **단일 목업**으로 대응한다. `main-clan`·`main-game` 등은 해시·탭으로 하위 경로를 흉내 낸다([non-page/clan-main-static-mockup-plan.md](./non-page/clan-main-static-mockup-plan.md) §2.1).

| 제품 경로(개념) | 목업 파일 |
|-----------------|-----------|
| `/` | `mockup/pages/index.html` |
| `/sign-in`, `/sign-up` | `sign-in.html`, `sign-up.html` |
| `/games` | `games.html` |
| `/games/.../auth` | `game-auth.html` |
| `/games/.../clan` | `clan-auth.html` |
| `/profile` | `profile.html` |
| `/games/.../clan/[id]` 및 하위 탭·해시 | `main-clan.html` + `clan-mock.js` |
| `/games/[slug]`(커뮤니티) | `main-game.html` |
| `/games/.../board/[postId]` | _(목업 없음)_ |

---

## 페이지별 핵심 컴포넌트

### Landing Page (/)
- 로고, 캐치프라이즈 (미결 — [BACKLOG.md](./BACKLOG.md) 랜딩·온보딩)
- 기능 소개 섹션
- 구독 티어 정보
- 로그인 / 회원가입 버튼

### Sign In (/sign-in)
- 로고
- 이메일/비밀번호 입력
- 로그인 에러 표시
- 자동 로그인 토글
- 비밀번호 찾기 링크
- 회원가입 링크

### Sign Up (/sign-up)
- 로고
- 이메일, 비밀번호, 비밀번호 확인, 닉네임
- 비밀번호 규칙: 영문+숫자+특수문자 8자 이상
- 회원가입 에러 표시

### Main_GameSelect (/games)
- 로고
- 프로필 아이콘 버튼
- 게임 갤러리 (인증 여부 아이콘, 클랜명 표시)
- 게임 검색 (게임 수가 많지 않을 것으로 예상)

### GameAuth (/games/[gameSlug]/auth)
- 게임별 인증 방식 (오버워치: 배틀넷 API)
- **목업** (`game-auth.html`): 상단 스텝(게임 선택 → 계정 연동 → 클랜 입장). `handleBattleNetAuth()` — 버튼 **연동 중…** 비활성 → 약 1.5초 후 `clan-auth.html`로 이동(연동 완료 가정). `#authError`는 실패·재시도 UI(데모에서 수동 표시 가능). 수동 배틀태그·관리자 검토 등 **추가 시나리오**는 [mockup-spec §Game Auth](../02-design/mockup-spec.md) 검토 항목이며, 현재 HTML은 OAuth 시뮬레이션 위주다.

### ClanAuth (/games/[gameSlug]/clan)
- 클랜 가입 탭: 검색, 추천, 홍보글 열람
  - 선택 후 → 가입 대기 상태 (운영진 승인 후 입장)
- 클랜 생성 탭:
  - 태그, 연령대, 성별 정책, 설명, 규칙, 디스코드, 카카오 링크
  - 가짜 클랜 검증 절차 (논의 필요) — [BACKLOG.md](./BACKLOG.md)
- **목업** (`clan-auth.html`): 탭 **클랜 가입** / **클랜 생성**(`switchTab`). 가입 탭 — 검색·필터·추천·홍보 카드·드로어·`가입 신청` 모달·**가입 대기** 화면. 생성 탭 — 태그·정책·링크 필드·경고 문구. 미들웨어상 **게임 인증 완료 후** 이 화면으로 진입(`pages.md` 다이어그램).

### 온보딩 순서 (미들웨어 대응)

1. `/games` — 타이틀 선택  
2. `/games/[gameSlug]/auth` — 게임 계정 연동 (목업: `game-auth.html`)  
3. `/games/[gameSlug]/clan` — 클랜 가입 또는 생성 (목업: `clan-auth.html`)  
4. `/games/[gameSlug]/clan/[clanId]` — 클랜 홈 (목업: `main-clan.html`)

`/profile`은 위 순서와 독립(세션만). 게임·클랜 라우트는 로그인 + (2)~(3) 조건을 만족해야 함.

### MainClan (/games/[gameSlug]/clan/[clanId])
- 클랜 대시보드 (최근 경기, 통계 요약)
- MainGame으로 이동 버튼
- 탭: 밸런스메이커 / 통계 / 이벤트 / 관리 / 스토어

### 밸런스메이커 (클랜 내 `/balance`, 운영진+)
- 편집·맵/밴·팀 보드·플랜별 기능. **화면 카피·도움말 본문·스펙 메모**: [pages/09-BalanceMaker.md](./pages/09-BalanceMaker.md)
- **세션**: 밸런스장 1명만 배치 편집, 나머지는 실시간 관전 동기화 → 배치 완료 후 밴(ON 시) → **경기 시작 = 밴 종료 직후**에 승부예측 마감 타이머. 디스코드는 선택 보조.

### 클랜 통계 (`/stats`, MainClan 탭)
- 요약·명예의 전당·앱 이용(맵·활동)·경기 기록(운영진+) 등 — **전체 스펙**: [pages/10-Clan-Stats.md](./pages/10-Clan-Stats.md)

### 클랜 이벤트 (`/games/[gameSlug]/clan/[clanId]/events`, MainClan 탭)
- **월간 캘린더**(현재 월·요일 그리드, 일자별 일정 점/하이라이트) + 하단 **이번 달 일정 그리드**(카드: 유형 배지·시간·장소·반복/자동출처 표기).
- 일정 등록: 유형, 일시, **반복**(없음 / 매주 / 매월 / 격주 등 목업), 장소·채널. 스크림은 매칭 확정 시 **자동 등록**되어 별도 입력 없이 노출(목업 안내 카피).
- Premium: 대진표 생성기(비활성·업셀 목업 가능).

### 클랜 관리 (`/manage`, MainClan 탭 · 운영진+)
- 개요(프로필·공지·규칙·코인 요약·배너 편집) · 구성원 관리(가입 요청·테이블·개인 상세) · 구독결제(클랜장 중심 목업). 정적 목업: `view-manage`, 사이드바 `mock-officer-only`.

### 클랜 스토어 (`/store`, MainClan 탭)
- 클랜/개인 코인 풀 · 클랜 꾸미기·개인 꾸미기 탭 · Premium 잠금 카드 · 꾸미기는 **서비스 프리셋만**(업로드 없음).

### 플레이어 프로필 · 꾸미기 (`/profile`)
- `mockup/pages/profile.html` + partials(`player-profile-modal`·`badge-case-modal`·`nameplate-case-modal`) + `app.js`: **게임별** 네임카드 미리보기·뱃지 케이스(표시 **최대 5개**·게임 키별 상태). 네임플레이트는 **프리셋만** — 밸런스 경기 화면과 동일 정책(`pages/09-BalanceMaker.md` §참가자 네임플레이트).

### MainGame (/games/[gameSlug])
- 클랜 홍보 게시판
- 스크림 신청 게시판
- 스크림 자동 매칭 버튼 (운영진+)
- 클랜 순위표
- 스크림 평판 (클랜장 전용)
- **정적 목업** (`mockup/pages/main-game.html`): 사이드바 `navTo`로 홈·LFG·스크림·홍보·순위 전환; LFG·스크림·홍보는 공통 `lfg-filter-panel` 패턴·초기화(↺); 홍보는 활성 필터 태그·`promoDrawer`·가입 `openJoinModal`; 티어·배지는 BACKLOG 에셋 전까지 플레이스홀더(`.mock-main-game-asset-hint`).

