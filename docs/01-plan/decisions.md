# 결정 필요 항목 인덱스 (Decisions)

> 페이지 문서들에서 발견된 "확정 안 된 규칙·정책"을 한 곳에 모은다. 페이지 문서 본문에서는 `D-XXX-NN` 코드만 참조하고, 결정 시 여기서 닫는다.
>
> [BACKLOG.md](./BACKLOG.md)의 미결 항목도 점진적으로 이쪽으로 이전한다.

## 사용 규칙

- 항목은 **카테고리별 코드** (예: `D-AUTH-01`)로 식별. 한 번 부여된 코드는 재사용하지 않는다.
- 상태: `OPEN` (논의 중) / `DECIDED` (결정 완료, 결정 내용 함께 적기) / `DROPPED` (결정 불필요로 판단).
- 결정 시: "결정" 칸을 채우고, 영향받는 페이지 문서/슬라이스/PRD를 같은 PR에서 함께 갱신한다.

---

## 인증 · 온보딩 (AUTH)

| 코드 | 상태 | 항목 | 메모 / 영향 문서 |
|------|------|------|------------------|
| D-AUTH-01 | DECIDED (2026-04-20) | 게임 인증 + 클랜 소속 상태에 따른 라우팅 룰 | 6칸 매트릭스 확정. 아래 [DECIDED §D-AUTH-01](#d-auth-01--게임-인증--클랜-소속-라우팅-매트릭스) 참고. 영향: `pages.md`, `pages/04~06`, `games.html`, `game-auth.html` |
| D-AUTH-02 | DECIDED (2026-04-20) | 게임별 OAuth 분기. 발로란트/LoL 진입 시 `game-auth` 화면 분기 | 게임 슬러그 → 제공자 매핑 표 확정. 아래 [DECIDED §D-AUTH-02](#d-auth-02--게임별-oauth-제공자-매핑) 참고 |
| D-AUTH-03 | OPEN | 비밀번호 정책 클라이언트 강제 시점, 만 10세 룰의 의미 | 목업 출생연도 select 상한이 `현재-10`이라 만 10세 미만 가입 불가로 읽힘 |
| D-AUTH-04 | OPEN | 비밀번호 찾기 플로우 (메일 발송 → 재설정 화면) | 목업 `sign-in.html`에 링크만 있고 동작 없음 |
| D-AUTH-05 | OPEN | Discord OAuth 권한 범위 (식별만? 길드 정보 읽기?) | 목업 버튼만 존재 |
| D-AUTH-06 | OPEN | 로그인 실패 잠금 정책 (몇 회 실패 시 몇 분 잠금) | 목업에는 없음 |
| D-AUTH-07 | OPEN | 자동 로그인 토글의 출입증 유지 기간 | 목업은 시각 토글만 |

## 클랜 · 가입 (CLAN)

| 코드 | 상태 | 항목 | 메모 / 영향 문서 |
|------|------|------|------------------|
| D-CLAN-01 | DECIDED (2026-04-20) | 클랜 검색·필터의 서버/클라 분담 + 페이지 사이즈 | 페이지 사이즈 5 유지. Phase 1 = 클라 필터링, Phase 2+ = 서버 페이징·인덱스. [§D-CLAN-01](#d-clan-01--클랜-목록-검색필터페이지네이션-분담) |
| D-CLAN-02 | DECIDED (2026-04-20) | 가입 신청 상태 머신, 중복 신청 정책, 취소 가능 시점 | 분리 테이블 `clan_join_requests` 신설. 게임당 단일 신청. pending 동안 항상 취소 + 거절 후 즉시 재신청. [§D-CLAN-02](#d-clan-02--가입-신청-상태-머신과-중복정책) |
| D-CLAN-03 | DECIDED (2026-04-20) | 클랜 라이프사이클 — 정책 위반·휴면·부실 분류와 처리 | 3분류(`violating/dormant/stale`). 신고는 자동 임계 없이 운영진 직접 판단. 휴면 60d→숨김·+90d→삭제. 부실 30d→삭제. [§D-CLAN-03](#d-clan-03--클랜-라이프사이클--정책-위반·휴면·부실-처리) |
| D-CLAN-04 | DECIDED (2026-04-20) | 클랜 만들기 폼 제출 payload | 클랜명 24자, `style` enum, `tier_range text[]` (8티어), `min_birth_year int`, age_range 제거, 클랜 자유 태그 입력. [§D-CLAN-04](#d-clan-04--클랜-만들기-폼-payload-스키마-정합) |
| D-CLAN-05 | DECIDED (2026-04-20) | 지향 단일 칩 "다시 누르면 해제" 동작 | 해제 허용 — 지향은 선택 사항. `style` nullable. [§D-CLAN-05](#d-clan-05--지향-단일-칩-해제-허용) |
| D-CLAN-06 | DECIDED (2026-04-20) | 클랜 인원 상한 / Premium 인원 차별 여부 | 200명 유지 (Free·Premium 동일). 인원 차별화 없음, Premium은 기능으로만 차별화. [§D-CLAN-06](#d-clan-06--인원-상한-200-유지-premium-인원-차별화-없음) |
| D-CLAN-07 | DECIDED (2026-04-20) | 클랜 멤버 활성도 분류와 휴면 멤버 처리 | 활성<30d / 비활성 30~60d / 휴면 60d+. 광범위 활동(로그인+내전+게시글+관리). 휴면은 한도 외(활성+비활성만 200). 자동 탈퇴 없음 + 클랜장 알림 + 일괄 수동 탈퇴. [§D-CLAN-07](#d-clan-07--클랜-멤버-활성도-분류와-휴면-멤버-처리) |

## 클랜 메인 · 셸 (SHELL)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-SHELL-01 | OPEN | 사이드바 hover 확장 동작의 모바일 대응 (모바일은 드로어 패턴) | 데스크톱은 64px → hover 220px |
| D-SHELL-02 | OPEN | `?role=` `?plan=` 쿼리 우회 가능 여부 (목업·디버그 전용 vs 운영 차단) | 보안·치팅 영향 |
| D-SHELL-03 | DECIDED (2026-04-20) | 사이드바 알림 점 트리거 규칙 | `#dash` 알림 점 없음(허브 중복 방지). `#balance` = 진행 중 내전 세션 수. `#events` = 24h 내 RSVP 미응답 + 진행 중 투표 미응답. `#manage` = 가입 요청 pending + 신규 휴면 진입(D-CLAN-02·07). balance/events는 뷰 진입 시 자동 clear, manage는 데이터로만 clear. [§D-SHELL-03](#d-shell-03--사이드바-알림-점-트리거-규칙) |

## 이벤트 · 일정 (EVENTS)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-EVENTS-01 | OPEN | 스크림 확정 → 클랜 이벤트 자동 생성 트리거·중복·취소 동기화 규칙 | 목업은 안내 카피만 있고 매칭 로직 없음 |
| D-EVENTS-02 | OPEN | 일정 반복 종료 조건 (횟수 / 종료일) | 목업은 반복 종류만 4가지 (`없음/매주/매월/격주`), 종료 조건 없음 |
| D-EVENTS-03 | OPEN | 일정 알림 채널 (카카오/디스코드) 발송 시점·실패 시 재시도 | 목업 캘린더 범례에 "알림은 연동 후" 명시 |
| D-EVENTS-04 | OPEN | 투표 알림 반복(`마감 전까지 매일`) ↔ 마감일과의 일관성 검증 | 목업은 미검증 |
| D-EVENTS-05 | OPEN | 대진표(Bracket) 결과의 클랜 통계·코인 반영 여부 | Premium 기능, 결과 활용 미정의 |

## 클랜 관리 (MANAGE)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-MANAGE-01 | DECIDED (2026-04-20) | 구독·결제 탭 접근 권한 | officer는 **열람**(금액·일시 포함). **플랜 변경·결제 수단·환불·영수증 상세·환불**은 leader 전용. [§D-MANAGE-01](#d-manage-01--구독결제-탭-접근-권한) |
| D-MANAGE-02 | DECIDED (2026-04-20) | 구성원 개인 상세 편집 권한 + 휴면 일괄 강퇴 | 역할 변경·officer 강퇴·휴면 일괄 강퇴·leader 위임은 **leader 전용**. member 강퇴·가입 요청 승인/거절은 officer 허용. **M점수 편집**은 **클랜 설정 토글**(`allow_officer_edit_mscore`, 기본 false → leader만) 기반. [§D-MANAGE-02](#d-manage-02--구성원-개인-상세-편집-권한과-m점수-토글) |
| D-MANAGE-03 | DECIDED (2026-04-20) | 부계정 조회 정책 | 자기신고 방식 유지. 조회 범위는 **클랜 설정 토글**(`alt_accounts_visibility`, 기본 `officers`). 추가 시 "클랜 소속 시 공개됨" 고지 필수. 증빙 API는 Phase 2+ 재검토, 문제 신고는 D-CLAN-03 흐름 흡수. [§D-MANAGE-03](#d-manage-03--부계정-조회-정책과-공개-범위-토글) |
| D-MANAGE-04 | DECIDED (2026-04-20) | 클랜 배너·아이콘 업로드 제약 | 배너 **3MB** / 아이콘 **2MB**. MIME `image/jpeg·png·webp`. 애니메이션 불가. 서버 자동 리사이즈·썸네일. [§D-MANAGE-04](#d-manage-04--클랜-배너아이콘-업로드-제약) |

## 스토어 · 코인 (STORE)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-STORE-01 | OPEN | 클랜 코인·개인 코인의 적립/차감 트리거 매트릭스 (밸런스 결과 / 승부예측 / 이벤트 / 출석 등) | 목업은 잔액 정적 표시, 차감 없음 |
| D-STORE-02 | OPEN | Premium 잠금 카드의 업그레이드 안내 동선 | 목업은 비활성 버튼만 |
| D-STORE-03 | OPEN | 구매 후 환불·되돌리기 정책 | 미정의 |

## 메인 게임 허브 (MAINGAME)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-LFG-01 | OPEN | LFG 신청 후 상태(applied/accepted/canceled) UI · 본인 화면 표시 | 목업은 `submitLfgApply`가 alert만 |
| D-RANK-01 | OPEN | 클랜 홍보 정렬의 "인기" 기준 (조회수 필드 부재) | 목업 `setPromoSort('popular')` 호출 시 NaN 위험 |
| D-SCRIM-01 | OPEN | 스크림 채팅 자동 종료 시점(목업: 시작 +6h)의 운영 정책 확정 | |
| D-SCRIM-02 | OPEN | 스크림 양측 운영진 확정 동시성 처리 (한쪽만 확정한 상태에서 일정 변경) | 목업은 alert만 |

## 프로필 · 꾸미기 (PROFILE)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-PROFILE-01 | OPEN | 프로필에서 고른 네임플레이트가 BalanceMaker 매치 슬롯에 전파되는 규약 (공통 셀렉터/이벤트) | 목업은 `data-nameplate-preview` 셀렉터 외에 동기화 없음 |
| D-PROFILE-02 | OPEN | "가입 신청 대기 목록" 데이터 출처·취소 액션 | BACKLOG에서 이전. 목업 정적 |
| D-PROFILE-03 | OPEN | 뱃지 케이스 ↔ 프로필 스트립 동기화 (모달에서 고른 5개가 메인 카드에 반영) | 목업은 모달 내부에서만 변화 |
| D-PROFILE-04 | OPEN | 뱃지 해금 출처 (스토어 / 업적 / 이벤트) 정의 | 목업은 카테고리 탭만 |

## 랜딩 · 마케팅 (LANDING)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-LANDING-01 | OPEN | 랜딩 캐치프라이즈 최종 문구 | BACKLOG에서 이전 |
| D-LANDING-02 | OPEN | 다국어(KR/EN/JP) 활성 시점 | 목업 버튼만 |
| D-LANDING-03 | OPEN | 약관·개인정보·문의 링크 실제 페이지 | 목업 `href="#"` |

## 통계 · 명예의 전당 (STATS)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-STATS-01 | OPEN | HoF 설정 권한 (운영진+ 전체 vs 클랜장 전용) | 목업은 운영진+로 노출 |
| D-STATS-02 | OPEN | 경기 기록의 사후 정정 권한·이력 보존 정책 | 목업은 정정 UI 없음 |
| D-STATS-03 | OPEN | "앱 이용 횟수" 측정 단위 정의 (세션 / 페이지뷰 / 액션) | 목업 카피 "정의는 구현 시 확정" |
| D-STATS-04 | OPEN | CSV 내보내기·기간 필터 도입 여부 | 목업 각주에만 언급 |

## 경제 · 코인 (ECON)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-ECON-01 | OPEN | 클랜 코인 구체적 수치 (지급량, 가격) | BACKLOG에서 이전 |
| D-ECON-02 | OPEN | 운영진 부정 코인 세탁 방지 정책 | BACKLOG에서 이전 |
| D-ECON-03 | OPEN | 클랜 순위표 민감 지표 포함 여부 | BACKLOG에서 이전 |
| D-ECON-04 | OPEN | 특이사항 태그 세부 기준 | BACKLOG에서 이전 |

---

## 결정 완료 (DECIDED)

> 결정된 항목은 이 절로 옮기고 결정 일자·내용·관련 PR/문서를 함께 적는다.

### D-AUTH-01 — 게임 인증 × 클랜 소속 라우팅 매트릭스

- **결정일**: 2026-04-20
- **요지**: 게임 슬러그 단위(`/games/[gameSlug]/...`)로 진입 시도가 들어오면 아래 우선순위로 가드한다. 첫 번째 위반에서 fallback 라우트로 자동 이동(= 리다이렉트).

**가드 우선순위 (위 → 아래)**

1. 비로그인 → `/sign-in?next=<원래 경로>`
2. 게임 인증 없음 → `/games/[gameSlug]/auth?next=<원래 경로>`
3. 클랜 소속이 `none`(미가입) → `/games/[gameSlug]/clan` (가입 탭)
4. 클랜 소속이 `pending`(신청 중) → `/games/[gameSlug]/clan` (가입 탭 + `pendingView` 자동 노출)
5. 클랜 소속이 `member` → 요청 경로 허용. `/games/[gameSlug]/auth` 또는 `/games/[gameSlug]/clan` 직진입 시 `/games/[gameSlug]/clan/[clanId]`로 자동 이동

**6칸 매트릭스 (게임 카드 클릭 또는 `/games/[gameSlug]/...` 직접 진입)**

| # | 게임 인증 | 클랜 소속 | 카드 점·라벨 | 결과 라우트 | 비고 |
|---|----------|-----------|-------------|------------|------|
| 1 | ✗ | none | 빨강 ● "계정 미연동" | `/games/[g]/auth` | 표준 온보딩 시작점 |
| 2 | ✗ | pending | 빨강 ● "계정 미연동 · 신청 보류" | `/games/[g]/auth` | 인증 복구 후 매트릭스 #5로 자연 이동 |
| 3 | ✗ | member | 노랑 ● "계정 재연동 필요" | `/games/[g]/auth?reauth=1` | 토큰 만료된 기존 멤버 |
| 4 | ✓ | none | 파랑 ● "클랜 찾는 중" | `/games/[g]/clan` | clan-auth 가입 탭 |
| 5 | ✓ | pending | 파랑 ● "<클랜명> 가입 신청 중" | `/games/[g]/clan` | `pendingView` 자동 노출 |
| 6 | ✓ | member | 초록 ● "<클랜명> 가입됨" | `/games/[g]/clan/[clanId]` | 클랜 메인 |

**예외**

- `/games/[gameSlug]` (MainGame 커뮤니티): 가드 1·2만 적용 (게임 인증 필요, 클랜 소속 무관). 매트릭스 #1·#2·#3은 `/auth`로 보내고, #4·#5·#6은 모두 진입 허용.
- `/profile`: 가드 1만 적용. 게임·클랜 가드 없음.
- `?reauth=1` (#3): `game-auth` 화면 상단에 "기존 인증이 만료되어 다시 연결이 필요합니다" 안내 카피 노출. 성공 시 직전 클랜 메인으로 복귀.

**상태 출처**

- `auth_status` ← `user_game_profiles` (게임 슬러그 단위 토큰 유효성)
- `clan_status` ← `clan_members` (게임 슬러그 단위 자기 행) + `clan_join_requests` (`pending` 행)
- 둘 다 미들웨어에서 한 번에 조회해 컨텍스트로 전달 (Phase 2+ slice-01에서 정의)

**Phase 1 목업 시뮬레이션**

- `games.html` 카드에 `data-game` `data-auth` `data-clan-status` `data-clan-id` `data-clan-name` 속성으로 6칸을 표현.
- 단일 라우터 함수 `routeFromGameCard(card)`가 위 매트릭스를 평가해 행선지를 결정.
- OW 카드의 "auth 우회 → main-clan 직행" 핫픽스를 제거하고, 정상 케이스는 `data-auth=true · data-clan-status=member`(매트릭스 #6)로 표현해 결과적으로 `main-clan.html`로 이동하도록 시연.

### D-AUTH-02 — 게임별 OAuth 제공자 매핑

- **결정일**: 2026-04-20
- **요지**: `/games/[gameSlug]/auth` 화면은 슬러그(또는 Phase 1 목업의 `?game=` 쿼리)에 따라 제공자·제목·아이콘·CTA를 동적으로 렌더한다. 단일 화면, 단일 컴포넌트.

| 슬러그 | 제공자 | 제목 | 아이콘 | CTA 라벨 | 안내 카피 | 상태 |
|--------|--------|------|--------|----------|-----------|------|
| `overwatch` | Battle.net OAuth | 오버워치 계정 연동 | 🎮 | Battle.net으로 계속하기 | "Battle.net 계정으로 본인을 확인합니다." | 활성 |
| `valorant` | Riot RSO (Sign-On) | 발로란트 계정 연동 | 🎯 | Riot 계정으로 계속하기 | "Riot 계정으로 본인을 확인합니다." | 활성 |
| `lol` | Riot RSO | 리그 오브 레전드 계정 연동 | ⚔️ | (출시 예정) | "곧 추가 예정입니다." | 비활성 |
| `pubg` | Krafton (TBD) | PUBG 계정 연동 | 🪖 | (출시 예정) | "곧 추가 예정입니다." | 비활성 |
| 그 외 / 누락 | — | 지원하지 않는 게임 | ❓ | ← 게임 선택으로 | "지원하지 않는 게임 슬러그입니다." | 폴백 |

**Phase 1 목업 구현 노트**

- `game-auth.html` 상단 `<script>`에 `GAME_AUTH_PROVIDERS` 매핑 객체 + `applyGameAuthConfig()` 부트스트랩 함수.
- `?game=` 쿼리 파싱 후 매핑된 설정으로 `auth-title`·`game-icon-large`·`verify-method-*`·CTA 버튼·info-box를 갱신.
- `lol`/`pubg`는 CTA 비활성 + "출시 예정" 안내. `?reauth=1`이면 상단에 재연동 안내 배지 표시 (D-AUTH-01 매트릭스 #3 후속).
- 운영 단계에서는 `?game=` 쿼리가 사라지고 `[gameSlug]` 패스 파라미터로 대체.

**Riot RSO 결정 근거 (참고)**

- LoL과 발로란트는 Riot 계정 단일 SSO. 따라서 한 사용자가 이미 발로란트 인증을 마쳤다면 LoL 출시 후 같은 OAuth 토큰을 재사용해 자동 연동 가능 (Phase 2+ 최적화 후보).

### D-CLAN-01 — 클랜 목록 검색·필터·페이지네이션 분담

- **결정일**: 2026-04-20
- **요지**: Phase 1은 클라이언트, Phase 2+는 서버. 페이지 사이즈는 5 고정.

| 항목 | Phase 1 (목업) | Phase 2+ (운영) |
|------|---------------|-----------------|
| 데이터 출처 | 정적 `CLANS` 객체 (목업 7개) | 서버 페이징 API (`GET /games/[g]/clans?page=&size=&...`) |
| 검색 | 클라 — `clan.name`·`clan.title` 부분 일치 (대소문자 무시) | 서버 — `name ILIKE '%q%' OR description ILIKE '%q%'`. 인덱스: `(game_id, name)` GIN trgm |
| 필터 (모집 상태·지향·포지션·티어·기타) | 클라 — `filterState` 객체 → 카드 표시/숨김 | 서버 — 필터별 `WHERE` + 컴포지트 인덱스. 칩별 enum/배열 `&&` 연산 |
| 페이지 사이즈 | `PAGE_SIZE = 5` (코드 상수) | 5 유지. URL `?size=` 미허용(우회 방지) |
| 정렬 | 기본: 핀(Premium) → 최신순 | 동일. 정렬 칩 추가는 별도 결정 |

**페이지 사이즈를 5로 유지하는 근거**

- 카드 1장이 키 큰 카드(클랜 아이콘·뱃지·태그 묶음). 5장이면 1뷰포트에 정확히 들어와 스크롤 부담↓.
- 카드 클릭 시 우측 드로어가 열리는 디자인이라, 옆 공간 확보를 위해 본문 카드 수를 적게 유지.
- 검색·필터를 적극 쓰도록 유도 — 무한 스크롤로 흘려보내는 패턴 회피.

**Phase 2+ 마이그레이션 메모**

- 응답 형태: `{ items: Clan[], total: number, page: number, size: number }`. 클라 컴포넌트는 `total`로 페이지 버튼 렌더.
- 검색어·필터 변경 시 디바운스 300ms + `AbortController`로 이전 요청 취소.
- 첫 페이지는 SSR로 prefetch (Next.js Server Component) → LCP 단축.

### D-CLAN-02 — 가입 신청 상태 머신과 중복정책

- **결정일**: 2026-04-20
- **요지**: 신청 라이프사이클을 별도 테이블 `clan_join_requests`로 분리. 게임당 단일 활성 신청. pending 동안 항상 취소 가능. 거절 후 쿨다운 없음.

**상태 머신**

```
              ┌──── (사용자 취소) ────► canceled
              │
none ──► pending ──── (클랜장 승인) ────► approved ──► clan_members.status = 'active'
              │
              └──── (클랜장 거절) ────► rejected
```

- `none` = 신청 행 자체가 없음 (D-AUTH-01 매트릭스의 `clan_status = none`)
- `pending` = `clan_join_requests`에 행 있음 (D-AUTH-01 매트릭스 `clan_status = pending` → `clan-auth.html` 진입 시 `pendingView` 자동 노출)
- `approved` = `clan_members`에 `status = 'active'` 행 생성 + `clan_join_requests` 행은 보존(이력)
- `rejected` / `canceled` = `clan_join_requests` 행에 종료 사유 기록, **즉시 재신청 가능** (쿨다운 없음)

**중복 신청 정책 (단일 신청)**

- 한 사용자는 **한 게임 내 동시에 1개 클랜에만 `pending` 상태**를 가질 수 있다.
- 다른 클랜 카드에서 신청 시도 시: "현재 ‘<기존 클랜명>’ 가입 신청 중입니다. 취소하고 새로 신청할까요?" 모달 → 확인 시 기존 행 `canceled` + 새 신청 생성 (트랜잭션).
- 다른 게임의 클랜 신청은 영향 없음 (게임 단위 독립).

**테이블 스키마** (schema.md 신설)

```
clan_join_requests
  id              uuid PK
  clan_id         uuid FK → clans
  user_id         uuid FK → users
  game_id         uuid FK → games        -- 단일 신청 정책 검증용
  status          enum('pending','approved','rejected','canceled')
  applied_at      timestamptz
  resolved_at     timestamptz NULL       -- approved/rejected/canceled 시각
  resolved_by     uuid FK → users NULL   -- 처리한 클랜장/운영진 (사용자 취소 시 = self)
  message         text                   -- 자기소개 (목업 modal의 textarea)
  reject_reason   text NULL              -- 클랜장 거절 사유 (선택)

UNIQUE INDEX uq_active_request
  ON clan_join_requests (user_id, game_id)
  WHERE status = 'pending';              -- 게임당 단일 활성 신청 강제
```

- 부분 유니크 인덱스로 단일 신청 정책을 DB 레벨에서 강제.
- 이력 조회는 status 무관 SELECT, 활성 신청 조회는 `WHERE status='pending'` + 인덱스 hit.

**클랜장 처리 동선**

- 클랜 관리 화면(`/manage`)에서 `pending` 목록 → 승인/거절 액션. 승인 트랜잭션:
  1. `clan_join_requests.status = 'approved'`, `resolved_at`, `resolved_by` 갱신
  2. `clan_members` 행 INSERT (`status='active'`, `role='member'`, `joined_at = NOW()`)
  3. (선택) 사용자에게 알림 발송

**Phase 1 목업 시뮬레이션**

- `clan-auth.html`이 `?pending=1` + `?game=` 받으면 `sessionStorage.clansync_clan_apply_status = 'pending'`로 가정하고 `pendingView` 즉시 노출 (D-AUTH-01 매트릭스 #5).
- `pendingView`에 "신청 취소" 버튼 추가. 클릭 → `sessionStorage` 클리어 + 가입 탭 복귀.
- `submitJoin()`에서 신청 정보를 `sessionStorage.clansync_clan_apply = { clanKey, clanName, appliedAt }`로 기록.

### D-CLAN-04 — 클랜 만들기 폼 payload·스키마 정합

- **결정일**: 2026-04-20
- **요지**: 폼·DB가 어긋난 4개 필드를 **24자 이름·`style` enum·`tier_range[]`·`min_birth_year`** 로 정렬. 자유 태그 입력 추가.

**`clans` 테이블 변경**

| 컬럼 | 변경 | 비고 |
|------|------|------|
| `name` | `varchar(30)` → **`varchar(24)`** | 폼 maxlength와 통일. 카드 라벨 깨짐 방지 |
| `style` | **신설** `enum('social','casual','tryhard','pro') NULL` | 친목/즐겜/빡겜/프로 (단일 값). NULL = 지향 미설정 (D-CLAN-05) |
| `tier_range` | **신설** `text[]` | `'bronze'·'silver'·'gold'·'plat'·'diamond'·'master'·'gm'·'challenger'` 8값 중 다중. 빈 배열 = 티어 무관 |
| `min_birth_year` | **신설** `int NULL` | 가입 가능 출생연도 하한 (예: 1995 = 1995년 또는 그 이전 출생자만 가입). NULL = 무관 |
| `age_range` | **삭제** | 자유 텍스트로는 검색·필터 불가. `min_birth_year` + 자유 태그로 대체 |
| `tags` | 변경 없음 | `text[]`. 추천 태그(PRESET_TAGS) + 클랜 자유 추가, 최대 5개 |
| `gender_policy` | 변경 없음 | enum 그대로 |
| `max_members` | 변경 없음 | 2~200 (D-CLAN-06 별도) |

**Premium 클랜의 인원 상한 확장 여부는 D-CLAN-06에서 결정.**

**폼 입력 변경 (`clan-auth.html` 만들기 탭)**

| 칸 | 변경 | 비고 |
|----|------|------|
| 클랜명 | maxlength 24 유지 | DB도 24로 정합 |
| 지향 | 4개 칩 그대로 (단일 칩 해제 허용 — D-CLAN-05) | 한글: 친목/즐겜/빡겜/프로 |
| 티어대 | **챌린저 칩 추가** (8개) | 데이터 값: `'challenger'` |
| 태그 | 추천 칩 (PRESET_TAGS) + **자유 태그 입력 칸 신설** | 합산 최대 5개. 자유 입력은 Enter 또는 "+" 버튼으로 추가 |
| 출생연도 하한 | **신설** select (선택 사항) | "전연령" / "1970년생부터" ~ "현재년도-15년생부터" 옵션. 미선택 시 NULL |
| 나이대 (`age_range`) | **제거** | min_birth_year + 자유 태그로 대체 |

**가입 가능 최소 나이는 만 10세 유지** (D-AUTH-03 별도 결정 항목). 출생연도 select 상한은 `현재년도 - 10`.

**`handleCreateClan` payload (Phase 1 목업)**

`sessionStorage.clansync_create_clan_draft`에 다음 형태로 저장 후 `main-clan.html` 이동:

```js
{
  name, style, tier_range[], tags[], min_birth_year,
  gender_policy, max_members, description, rules,
  discord_url, kakao_url
}
```

**검증 룰** (Phase 1)

- 클랜명: 빈값 금지, 24자 이내 (현재 코드 유지)
- 최대 인원: 2~200 클램프 (현재 코드 유지)
- 자유 태그: 1~12자, 한글·영문·숫자·공백만, 합산 5개 한도 — `validateCustomTag(text)` 신설
- 다른 필드: 모두 선택 사항 (Phase 1 검증은 가벼움 유지, Phase 2에서 강화)

### D-CLAN-05 — 지향 단일 칩 해제 허용

- **결정일**: 2026-04-20
- **요지**: 같은 칩 재클릭 시 선택 해제 가능. 지향은 선택 사항이며, 비워두면 `style = NULL`로 저장.

**현행 코드 버그**

```js
function selectSingleChip(el, group) {
  document.querySelectorAll(`.create-chip[data-group="${group}"]`).forEach(c => c.classList.remove('active'));
  el.classList.toggle('active', !el.classList.contains('active'));
  // 주석은 "다시 누르면 해제"이지만 forEach가 먼저 모든 active를 제거한 뒤 toggle을 평가하므로 항상 active 상태가 됨
}
```

**수정 후 동작**

```js
function selectSingleChip(el, group) {
  const wasActive = el.classList.contains('active');
  document.querySelectorAll(`.create-chip[data-group="${group}"]`).forEach(c => c.classList.remove('active'));
  if (!wasActive) el.classList.add('active');
}
```

- 같은 칩 재클릭 → 비활성으로 돌아감 (4개 모두 꺼진 상태)
- 다른 칩 클릭 → 기존 활성 해제 + 새 칩 활성 (단일 선택 유지)

**UX 카피**

- 칩 그룹 위 라벨 옆에 "(선택 사항 — 비워두면 모든 분위기 환영)" 도움말. 폼 제출 시 `style = NULL` 허용.

### D-CLAN-03 — 클랜 라이프사이클 — 정책 위반·휴면·부실 처리

- **결정일**: 2026-04-20
- **요지**: "가짜 클랜"이라는 이분법 대신 비즈니스 용어로 3분류. 분류별 발견·처리 차등. 신고는 자동 임계 없이 운영진 직접 판단(악의 신고 방어).

**3분류 (한글·영어·DB enum)**

| # | 한글명 | 영어 | DB `lifecycle_status` | 정의 |
|---|---|---|---|---|
| 0 | 활성 | Active | `active` | 정상 운영 클랜 (기본값) |
| 1 | 정책 위반 | Violating | `violating` | 신고 또는 운영진 직권으로 정책 위반 판정. 단계별 제재 진행 중 |
| 2 | 휴면 | Dormant | `dormant` | 마지막 활동 60일 무. 목록에서 완전 숨김. 추가 90일 무 → 자동 삭제 |
| 3 | 부실 | Stale | `stale` | 생성 후 30일 멤버 1명 AND 활동 0건 → 자동 삭제 예정 |
| 4 | 삭제됨 | Deleted | `deleted` | 자동·수동 삭제 처리됨. 행은 보존(매치 기록 무결성), 모든 화면에서 제외 |

**제재 단계 (정책 위반 한정)**

운영진 검토 큐에서 `moderation_status` 단계 전환:

| 단계 | `moderation_status` | 효과 | 클랜장 액션 |
|------|---------------------|------|-------------|
| 0 | `clean` | 평상시 | — |
| 1 | `reported` | 신고 누적, 운영진 큐 진입 (사용자에 미노출) | — |
| 2 | `warned` | 경고 발송, 가입 신청 차단 | 30일 내 소명 가능 |
| 3 | `hidden` | 비공개 (목록·검색·드로어 모두 숨김) | 30일 내 소명 시 운영진 재검토 |
| 4 | `deleted` | 클랜 삭제 (`lifecycle_status='deleted'`로 전환) | 클랜장 계정 7일 정지 (반복 시 영구) |

**신고 시스템**

- **자격**: 동일 게임 인증 사용자만 (D-AUTH-01 `auth=true` 매트릭스 전제). 1인 1클랜 1회 한정.
- **자동 임계 없음** — 신고 1건이라도 들어오면 운영진 큐(`moderation_status='reported'`)로 진입. 운영진이 신고 내용 + 클랜 상태 직접 확인 후 단계 전환 결정.
- **악의 신고 방어** — 운영진이 신고 무효 판정 시 신고자에게 1차 경고. 누적 3회 무효 신고 시 신고 자격 30일 박탈.
- **신고 자동 처리는 미래 옵션** — 충분한 운영 데이터 누적 후 명백한 패턴(예: 신고 10건+, 신고자 모두 무관계)에 한해 자동 `warned` 도입 검토 (D-CLAN-03b).

**자동 휴리스틱 (휴면·부실)**

| 분류 | 트리거 (배치 잡, 매일 1회) | 사전 알림 | 자동 액션 |
|------|---------------------------|-----------|-----------|
| 휴면 진입 | 모든 멤버의 `last_activity_at`이 60일+ 전 | 클랜장에 D-7 알림 | `lifecycle_status = 'dormant'` |
| 휴면 → 삭제 | 휴면 진입 후 추가 90일 무활동 | 클랜장에 D-30 + D-7 알림 | `lifecycle_status = 'deleted'` |
| 부실 → 삭제 | 생성 후 30일, 멤버 1명 AND 매치 0건 AND 게시글 0건 | 클랜장에 D-7 알림 | `lifecycle_status = 'deleted'` |

**클랜장 알림 발송**

- **인앱 알림** + (Premium 클랜은) **이메일** — 휴면 임박, 휴면 진입, 삭제 임박 단계마다.
- 알림 응답으로 활동(로그인 + 어떤 액션이든 1건) 시 `lifecycle_status='active'`로 자동 복귀.

**UI 정책**

| 분류 | 클랜 카드 | 검색 | 드로어 | 가입 시도 |
|------|-----------|------|--------|-----------|
| `active` | 표시 | 포함 | 가능 | 가능 |
| `violating` (`reported`/`warned`) | 표시 (사용자에 일반 카드처럼) | 포함 | 가능 | **신청 차단** (단계 ≥ warned) |
| `violating` (`hidden`) | **숨김** | **제외** | 차단 | 차단 |
| `dormant` | **숨김** | **제외** | — | — |
| `stale` | 표시 (신생 클랜과 구분 어려움) | 포함 | 가능 | 가능 (자동 삭제 D-7 알림은 클랜장에만) |
| `deleted` | 숨김 | 제외 | 차단 | 차단 |

### D-CLAN-06 — 인원 상한 200 유지, Premium 인원 차별화 없음

- **결정일**: 2026-04-20
- **요지**: 무료·유료 모두 200명 동일. 인원으로는 차별화하지 않고 Premium은 기능(AI 밸런싱·전적·승부 예측 등)으로만 차별화. 200명 클랜의 실질 운영 가능성은 D-CLAN-07 멤버 활성도 분류로 보완.

**근거**

- 시장 호환성 — 대형 디스코드 게임 서버가 200명+를 일반적으로 운영. ClanSync 클랜이 디스코드 사용자를 자연스럽게 흡수하려면 200명 한도가 필요.
- Premium의 가치는 **인원이 아닌 기능** — AI 팀 밸런싱, 전적 분석, 승부 예측, 스크림 매칭 우선권 등이 Premium 차별 포인트. 이미 메인 화면 카드 ✓ 뱃지 + Premium 툴팁이 그 방향 시사.
- 200명 클랜의 운영 부담은 **운영진 권한(`officer`)** 분산 + **D-CLAN-07 활성도 분류**로 해결. 대부분의 멤버는 비활성·휴면이라 동시 운영 부하는 낮음.

**Premium 인원 확장 가능성 (Phase 2+)**

- Premium 클랜이 200을 넘는 수요가 실제로 발생하면 Phase 2+에서 별도 결정(D-CLAN-06b)으로 검토. Phase 1·2 동안은 200 유지.

**스키마 영향**

- `clans.max_members int DEFAULT 30 CHECK (max_members BETWEEN 2 AND 200)` — 기존 그대로. CHECK 제약 추가로 200 초과 방지.

**UX**

- 만들기 폼에 권장 안내 카피: "권장 인원: 30~50명 (오버워치 기준 내전 1~2팀 운영). 200명까지 설정 가능하며, 멤버 활성도는 자동으로 활성·비활성·휴면으로 분류됩니다 (D-CLAN-07)."

### D-CLAN-07 — 클랜 멤버 활성도 분류와 휴면 멤버 처리

- **결정일**: 2026-04-20
- **요지**: 멤버를 마지막 활동 시점 기반 3분류(활성/비활성/휴면)로 자동 그룹화. 휴면 멤버는 인원 한도(200) 외로 보관. 자동 탈퇴 없음 — 클랜장이 멤버 관리 페이지에서 일괄 수동 탈퇴.

**활성도 분류 (멤버별 자동 도출)**

마지막 활동 시점 `clan_members.last_activity_at` 기준:

| 분류 | 한글명 | 영어 | 기간 | UI 표시 |
|------|--------|------|------|---------|
| 활성 | Active | `active` | 최근 30일 내 활동 1건+ | 멤버 목록 기본 표시 |
| 비활성 | Inactive | `inactive` | 30~60일 무활동 | 멤버 목록 표시 + "비활성" 배지 |
| 휴면 | Dormant | `dormant` | 60일+ 무활동 | 멤버 목록 별도 섹션("휴면 멤버") + 토글로 숨김/표시 |

> 분류는 DB에 저장된 enum이 아니라 **`last_activity_at`을 기준으로 쿼리·뷰에서 도출**한다 (배치 잡 불필요). Phase 2+ 캐시 컬럼화 가능.

**"활동"의 정의 (광범위)**

다음 중 어느 하나라도 발생 시 `clan_members.last_activity_at = NOW()` 갱신:

- 클랜 페이지 로그인·진입
- 내전·스크림 참여 (`match_players` INSERT)
- 클랜 게시판 글·댓글 작성
- 운영진 액션 (가입 승인·거절, 멤버 정리 등 — 운영진의 활동도 활동으로 카운트)

`clan_members.last_participated_at`(매치 참여만)과는 별개 컬럼으로 유지. `last_activity_at`이 광범위 활동 시점.

**인원 상한 카운트 정책**

- 200명 한도에 카운트되는 멤버: **활성 + 비활성** 만
- 휴면 멤버는 한도 **외** 보관 — 통계·인원 표시는 활성+비활성 기준, 휴면은 별도 표시 ("휴면 5명")

**휴면 멤버 자동 처리 — 자동 탈퇴 없음**

- 휴면 진입 시점에 **클랜장에게만 알림** ("X명이 휴면 멤버로 전환되었습니다 — 정리하시겠어요?")
- **자동 탈퇴 없음**. 클랜장이 멤버 관리 페이지의 휴면 섹션에서 체크박스로 일괄 수동 탈퇴.
- 자동 탈퇴 로직은 추후 데이터 누적 후 D-CLAN-07b로 재검토 (예: 휴면 6개월+ 자동 탈퇴).

**복귀 (휴면 → 활성)**

- 휴면 멤버가 어떤 활동이든 1건 발생 시 자동으로 활성으로 복귀 (`last_activity_at` 갱신 → 자동 분류 변경).
- 클랜장이 수동 탈퇴 처리한 후 다시 들어오려면 **재가입 신청** (D-CLAN-02 흐름).

**통계 정합 (D-STATS와 직결)**

- schema.md "이번달 활성 유저 비율" 분모 정의 갱신:
  - **기존**: `clan_members.status = 'active'`
  - **변경**: `clan_members.status = 'active' AND last_activity_at >= NOW() - INTERVAL '60 days'` — 즉 활성+비활성만, 휴면 제외.

**클랜장 멤버 관리 페이지 요구사항 (다음 D-MANAGE 작업 시 반영)**

| 섹션 | 표시 | 액션 |
|------|------|------|
| 활성 멤버 (X명) | 닉네임·역할·마지막 활동·내전 참여 횟수 | 권한 변경, 강퇴 |
| 비활성 멤버 (X명) | 동일 + "30일 이상 무활동" 배지 | 권한 변경, 강퇴 |
| 휴면 멤버 (X명, 기본 접힘) | 동일 + "60일 이상 무활동" 배지 + **체크박스** | 일괄 체크 + "선택 멤버 강퇴" 버튼 |

**스키마 영향**

- `clan_members` 테이블에 `last_activity_at timestamptz` 컬럼 신설 (기존 `last_participated_at`은 매치 참여 트래킹용으로 유지).
- 인덱스 권장: `clan_members (clan_id, last_activity_at)` — 활성도 그룹별 카운트 쿼리 최적화.

### D-SHELL-03 — 사이드바 알림 점 트리거 규칙

- **결정일**: 2026-04-20
- **요지**: 사이드바 알림 점은 **"해당 뷰에서 아직 내가 처리/확인하지 않은 행동성 카운트"의 단일 원천**. 정보성 뷰는 **뷰 진입으로 자동 clear**, 행동성 뷰는 **실제 처리로만 clear**. 대시보드는 허브 성격이라 알림 점을 두지 않는다(중복 방지).

**대상·트리거·Clear 매트릭스**

| 뷰 | 해시 | 알림 점 요소 | 성격 | 트리거 (합산) | Clear 방식 |
|----|------|:-----------:|------|---------------|------------|
| 대시보드 | `#dash` | — | 허브 | (없음 — 대시보드 본문 카드들이 각 미확인 항목의 실제 요약이라 사이드바 점 중복 불필요) | — |
| 밸런스메이커 | `#balance` | `#sidebar-notify-balance` | 혼합 | 내가 속한 **진행 중인 내전 세션**(상태 `open` \| `running`) 수 | `#balance` 뷰 **진입 시 자동 clear**. 세션이 끝나지 않았다면 다음 refresh에서 다시 점이 뜸 |
| 이벤트 | `#events` | `#sidebar-notify-events` | 혼합 | (a) 앞으로 **24h 이내** 시작 + 내가 **RSVP 안 한** 일정 수 + (b) **진행 중 투표** 중 내가 **투표 안 한** 수 | `#events` 뷰 **진입 시 자동 clear**. 실제 RSVP/투표 완료 전에는 재진입 시 재표시 |
| 클랜 관리 | `#manage` | `#sidebar-notify-manage` | 행동 | **가입 요청 `pending` 수 + 신규 휴면 진입 미처리 수** (D-CLAN-02 · D-CLAN-07) | 뷰 진입만으로 clear되지 않음. **실제 처리(승인/거절/일괄 강퇴/휴면 배너 닫기)로만 감소** |
| 클랜 통계 | `#stats` | — | 조회형 | (없음) | — |
| 클랜 스토어 | `#store` | — | 조회형 | 신규 쿠폰·아이템 지급은 **이벤트 N** 으로 흡수 | — |

**운영 ↔ Phase 1 목업 데이터 매핑**

| 운영 트리거 | Phase 2 데이터 소스 | Phase 1 목업 근사 |
|------------|---------------------|--------------------|
| 진행 중 내전 세션 | `balance_sessions WHERE status IN ('open','running')` AND 내가 참가자/관전자 | `sessionStorage['clansync-mock-balance-session']==='1'` 또는 기존 `mockSidebarNotifySet('balance', true)` 경로 |
| 24h 내 RSVP 미응답 | `clan_events JOIN event_rsvps` (left join, `start_at ≤ now()+24h`, 내 RSVP 없음) | 실데이터 없음 → `MOCK_SIDEBAR_NOTIFY_DEBUG` 디버그 표시 |
| 진행 중 투표 미응답 | `clan_polls WHERE status='open' AND deadline > now()` + 내 투표 없음 | 실데이터 없음 → 디버그 표시 |
| 가입 요청 `pending` | `SELECT count(*) FROM clan_join_requests WHERE clan_id=? AND status='pending'` | `#mock-manage-requests-tbody <tr>` 수 (목업 정적 행) |
| 신규 휴면 진입 미처리 | `clan_members WHERE dormant_entered_at > now()-30d AND kicked=false` | `mockManageMembersStats().newDormant` (`dormantNewlyEntered=true` 행 수) |

**Clear 동작 분기 근거**

- **정보성 (balance / events)**: "봤다 = 확인"로 간주. 뷰 진입만으로 점을 끄되 실제 조건이 아직 참이면 다음 refresh에서 다시 점이 뜬다. 사용자는 "알림은 봤지만 아직 처리는 안 함"을 자연스럽게 구분.
- **행동성 (manage)**: 뷰에 들어가서 보기만 해선 카운트가 줄지 않는다. 운영진이 가입 요청을 승인/거절하거나 휴면 일괄 강퇴·배너 닫기를 했을 때만 감소. 데이터 기반 자동 집계이므로 별도 seen 상태 없이도 정확.

**알림 점 UI 규격 (Phase 1 공통)**

- 요소: `<span class="sidebar-notify-dot">N</span>` 또는 숫자
- 스타일: `#ef4444` 원형, 흰 글자, `box-shadow` 2px 어두운 외곽. 0 이하일 때 `hidden` 속성 토글
- 카운트가 1 이상일 때 숫자 표시. 단순 boolean(balance 세션 존재 여부 등)일 때는 "N" 글자
- 공용 pill 클래스: `.mock-notify-pill` (탭 라벨·카드 헤더 등 인라인 사용 시)

**제외·이월 항목**

- **"매치 결과 카드" 개념은 도입하지 않는다.** 경기 종료 후 결과 열람은 별도 카드/리스트가 아닌 **결과 입력 완료 시점의 결과 팝업 1회**로 처리한다 — 승부예측이 활성화된 세션에서 밸런스장이 결과 입력으로 승자 팀을 확정하면, 비출전 예측 참여자에게 승리 팀·내 예측 적중 여부·배당받은 클랜코인을 모달/토스트로 즉시 노출하고 끝낸다. 따라서 "매치 결과 미확인" 기반 알림 트리거는 구조적으로 존재하지 않으며, 추후에도 이 트리거는 부활하지 않는다(사후 정정은 클랜 관리의 내전 히스토리에서 별도 다룬다). 상세 흐름은 [09-BalanceMaker.md "경기 종료 · 결과 팝업"](./pages/09-BalanceMaker.md) 참고.
- **대시보드 알림 점** 재고는 당분간 없음. 대시보드 본문에 "가입 요청 요약" "다가오는 일정" 등 카드가 이미 알림 역할을 수행하므로 사이드바 점을 두면 중복.
- **모바일 드로어 상태의 알림 점 배치**는 D-SHELL-01(hover 확장의 모바일 대응)에서 함께 정리.

### D-MANAGE-01 — 구독결제 탭 접근 권한

- **결정일**: 2026-04-20
- **요지**: officer도 탭 본문을 **열람**할 수 있다(금액·일시·현재 플랜). **변경·환불·결제 수단·영수증 상세** 액션만 leader 전용. 운영 대화 병목을 막기 위함.

**권한 매트릭스**

| 요소 | leader | officer | member |
|------|:------:|:-------:|:------:|
| 탭 진입·열람 | ✓ | ✓ | ✗ |
| 현재 플랜 상태 확인 | ✓ | ✓ | ✗ |
| 결제 이력 (금액·일시) 조회 | ✓ | ✓ | ✗ |
| **영수증 상세** 조회 | ✓ | ✗ (마스킹 + "클랜장 전용" 툴팁) | ✗ |
| **결제 수단** 추가·삭제 | ✓ | ✗ | ✗ |
| **플랜 변경** (Free ↔ Premium) | ✓ | ✗ (비활성 버튼) | ✗ |
| 환불 요청 | ✓ | ✗ | ✗ |

**UI 규칙**

- officer 세션에서 제한 액션 버튼은 **비활성 + 툴팁 "클랜장만 변경할 수 있습니다"** 표시 (숨김 아님 — 권한 투명성).
- 결제 수단 정보(카드번호 등 실제 민감 필드)는 leader에게도 `****-1234` 형태로 마스킹. 원본은 결제사 측에서만 관리 (PCI-DSS 회피).
- 메뉴 자체 접근(`#manage` 사이드바)은 기존 D-SHELL 게이팅(`.mock-officer-only`) 유지.

**스키마 영향**

- 없음. 결제·구독은 `subscriptions` / `payments` 테이블이 별도 정의될 Phase 2+ 영역. 권한 분기는 Role 기반 RLS만으로 처리.

### D-MANAGE-02 — 구성원 개인 상세 편집 권한과 M점수 토글

- **결정일**: 2026-04-20
- **요지**: 파괴적·구조적 액션은 leader 전용으로 좁힌다. **M점수 편집만 예외로 클랜 설정 토글**을 두어 leader가 "officer에게도 허용"으로 전환할 수 있게 한다. 단, **기본값은 leader 전용**(안전 우선).

**권한 매트릭스**

| 액션 | leader | officer | 근거 |
|------|:------:|:-------:|------|
| 가입 요청 승인·거절 | ✓ | ✓ | 기존 유지 (D-CLAN-02) |
| member 강퇴 | ✓ | ✓ | 운영 빈도 높음, 가역(재가입 가능) |
| officer 강퇴 | ✓ | ✗ | officer 간 충돌 방지 |
| **역할 변경** (member ↔ officer) | ✓ | ✗ | officer 스스로 officer 증식·권한 상승 방지 |
| **leader 위임** | ✓ | ✗ | 하이재킹 방지 (leader 본인만 위임) |
| **휴면 섹션 일괄 강퇴** (D-CLAN-07) | ✓ | ✗ | 범위가 커서 leader 전용 |
| **M점수 편집** | ✓ | **토글** | `clan_settings.allow_officer_edit_mscore` — 기본 `false`. leader가 true로 켜면 officer도 편집 가능 |

**M점수 토글 설정 UI**

- 위치: **클랜 관리 → 개요 탭 → "운영 권한 설정" 카드** (신설). leader만 이 카드를 조작 가능.
- 카피: "M점수 편집을 운영진에게도 허용" — 기본 꺼짐. 설명 한 줄: "밸런스메이커 팀 밸런스에 직결되는 수치입니다. 운영 빈도가 높아 허용할 수 있지만, 민감한 수치라 기본은 클랜장만 편집합니다."
- 토글 변경 시 확인 모달: "운영진이 즉시 편집 가능해집니다. 감사 로그에는 변경 이력이 기록됩니다."

**UI 규칙**

- 파괴적 버튼은 `.mock-leader-only` 클래스로 officer 세션에서 숨김. CSS: `body.mock-role-officer .mock-leader-only { display: none !important; }`.
- M점수 편집 슬롯은 토글 값에 따라 동적으로 활성/비활성. officer 세션에서 `localStorage['clansync-mock-clan-settings']?.allow_officer_edit_mscore === true`일 때만 편집 가능.

**스키마 영향**

- `clan_settings` 테이블 신설 (또는 `clans` 테이블 컬럼 추가, 스키마 정합은 Phase 2 slice-01에서 결정):
  - `allow_officer_edit_mscore boolean NOT NULL DEFAULT false`
- 감사 로그: `clan_member_audit_log (clan_id, actor_user_id, target_user_id, action enum, before jsonb, after jsonb, created_at)` — 역할 변경·강퇴·M점수 편집·부계정 삭제 등 기록 (Phase 2 상세 설계).

### D-MANAGE-03 — 부계정 조회 정책과 공개 범위 토글

- **결정일**: 2026-04-20
- **요지**: 부계정은 **자기신고** 유지. 같은 게임의 주계정(`user_game_profiles`)과 연결해 저장. 조회 범위는 **클랜 설정 토글**로 leader가 전환 가능. 기본값은 **운영진+ 전용**.

**등록 (자기신고)**

- 위치: `/profile` → 게임 카드 → "부계정 추가" 버튼 (기존 동작 유지).
- 고지: 추가 모달에 **"클랜에 소속되어 있다면, 클랜 공개 범위 설정에 따라 부계정 목록이 운영진 또는 클랜 전체에 공개될 수 있습니다"** 문구를 명시하고, 진행 체크박스로 동의 유도.
- 증빙: 현 단계에서 게임사 API 기반 부계정 증빙은 만들지 않는다(오버워치·발로란트 모두 부계정 공식 API 불확실). Phase 2+ 재검토.

**조회 범위 — 클랜 설정 토글**

| 토글 값 | 본인 | 같은 클랜 운영진+ | 같은 클랜 구성원 | 타 클랜 / 비소속 |
|---------|:----:|:----------------:|:----------------:|:---------------:|
| `officers` (기본) | ✓ | ✓ | ✗ | ✗ |
| `clan_members` | ✓ | ✓ | ✓ | ✗ |

- 위치: **클랜 관리 → 개요 탭 → "운영 권한 설정" 카드** 내 라디오 버튼 2개. leader만 변경 가능.
- 카피: "부계정 공개 범위" — "운영진만 (기본)" · "클랜 전체 공개".
- 변경 시 확인 모달: "클랜 전체 공개로 변경하면 모든 구성원이 서로의 부계정을 볼 수 있습니다. 계속하시겠습니까?"

**신고·차단**

- 부계정 관련 매너 이슈·도배 문제는 **클랜 신고(D-CLAN-03) 흐름**에 흡수. 별도 부계정 신고 API는 만들지 않는다.
- 본인이 언제든 프로필에서 부계정을 삭제 가능. 삭제 후 운영진 화면에서 즉시 사라짐. 감사 로그에는 "삭제됨" 스텁만 남김.

**스키마 영향**

- `user_alt_accounts (user_id, game_id, alt_nick text, note text, created_at)` — 자기신고 부계정 테이블. RLS: 본인은 읽기·쓰기, 같은 클랜 운영진+는 토글에 따라 읽기.
- `clan_settings.alt_accounts_visibility text NOT NULL DEFAULT 'officers' CHECK (alt_accounts_visibility IN ('officers','clan_members'))`.

### D-MANAGE-04 — 클랜 배너·아이콘 업로드 제약

- **결정일**: 2026-04-20
- **요지**: 모바일 업로드 실패율을 고려해 **배너 3MB / 아이콘 2MB** 로 여유 있게 설정. 정적 이미지만 허용.

**제약 상세**

| 항목 | 배너 | 아이콘 |
|------|------|--------|
| 허용 MIME | `image/jpeg`, `image/png`, `image/webp` | 동일 |
| **최대 용량** | **3 MB** | **2 MB** |
| 권장 해상도 | 1600×400 (4:1) | 512×512 (1:1) |
| 최소 해상도 | 1200×300 | 256×256 |
| 최대 해상도 | 3200×800 | 1024×1024 |
| 비율 강제 | 4:1 (크롭 유도) | 1:1 (크롭 유도) |
| 애니메이션 (GIF·APNG·WebP 애니) | 불가 — 정적만 | 불가 |
| 자동 변환 | 썸네일(400×100) + 중간(800×200) | 64 / 128 / 256 3단계 |
| 저장 경로 | `clan-media/{clan_id}/banner-{hash}.webp` | `clan-media/{clan_id}/icon-{hash}.webp` |
| 업로드 권한 | officer+ | officer+ |

**검증 순서 (클라 → 서버 이중 검증)**

1. 클라: 확장자·MIME → 용량 → 해상도 (실패 시 구체적 에러 — `용량 초과: 현재 3.4 MB, 최대 3 MB`).
2. 서버: MIME 재검증(매직 넘버 기반) → 해상도 → 애니메이션 검출 → 크롭·리사이즈 → `.webp` 변환 저장.
3. 클라 검증 우회 가능하므로 **서버 검증이 최종 권위**.

**저장·전송**

- 버킷: `clan-media` (Supabase Storage). 원본은 private, 변환본만 CDN public.
- 기존 파일은 새 업로드 시 **덮어쓰기가 아닌 새 hash로 추가**하고, 클랜 레코드의 포인터만 교체. 실패 시 롤백 가능.
- 이전 원본은 30일 보관 후 자동 삭제 (간단한 크론·트리거로 Phase 2+에서 구현).

**스키마 영향**

- `clans.banner_url text`, `clans.icon_url text` — 변환본 public URL (기존 컬럼 있다면 재사용).
- `clans.banner_original_key text`, `clans.icon_original_key text` — Storage 원본 키 (private).
