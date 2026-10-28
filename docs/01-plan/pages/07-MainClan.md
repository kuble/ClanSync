# 07 MainClan · 클랜 메인 (셸 + 대시보드)

> **D-SHELL-01 DECIDED (2026-04-20)** — 중단점 **768px** 고정. 데스크톱 ≥769px = hover 확장(기본 64px → 220px, 본문 margin-left 64px 고정). 모바일 ≤768px = 햄버거 → 좌측 드로어(`min(248px, 76vw)`). 닫기 트리거 4종(오버레이 · Esc · 내부 항목 클릭 · 769px+ 리사이즈). `aria-expanded`·`aria-label`·body 스크롤락 동기화. Phase 2+에서 focus trap·트리거 포커스 복귀 추가. → [decisions.md §D-SHELL-01](../decisions.md#d-shell-01--사이드바-반응형-패턴-데스크톱-hover--모바일-드로어)
>
> **D-SHELL-02 DECIDED (2026-04-20)** — 운영 단일 출처는 **서버 세션 + DB RLS**. `?role=`·`?plan=`·`?hubDebug=1`·`?simulate=logged_in`·`?sidebarNotifyDebug=*`·`?balanceSession=*` 6종은 미들웨어가 **정화 + 302 redirect**. 디버그 계열은 `NEXT_PUBLIC_DEBUG_QUERY=1` **AND** admin 세션에서만 해석, 사용 시 `audit_debug_queries` 기록. `/mockup/*`는 운영 빌드에서 제외. → [decisions.md §D-SHELL-02](../decisions.md#d-shell-02--권한디버그-쿼리-우회-차단-정책)
>
> **D-NOTIF-01 DECIDED (2026-04-21)** — 네비게이션바 상단 **알림 벨 아이콘 + 드로워**(디스코드식) 신설. 운영·개인 결과·일정 알림 전체가 `notifications` 피드로 통합된다. 기존 D-SHELL-03 사이드바 메뉴별 점은 **집계 척도가 다르므로 병존**(메뉴 점 = "이 화면에 해야 할 일이 있다", 벨 = "내 피드에 새 소식이 있다"). → [decisions.md §D-NOTIF-01](../decisions.md#d-notif-01--in-app-알림-센터-통합-도입)
> **D-NOTIF-02 DECIDED (2026-04-21)** — 브라우저 ServiceWorker 푸시 **프리셋 α (Premium 전용, 4 카테고리 독립 토글, 서버 quiet hours 00~07 KST 준수)**. **범위 R3** — Phase 1은 결정·스키마(`web_push_subscriptions` · `notification_log.channel='web_push'`)·목업 예고 배너 1줄까지만. 실구현(VAPID·ServiceWorker·권한 프롬프트·구독 관리 UI)은 Phase 2+. → [decisions.md §D-NOTIF-02](../decisions.md#d-notif-02--브라우저-서비스워커-웹-푸시-도입-정책-프리셋-α)

## 한 줄 요약
하나의 클랜을 활동 단위로 묶은 메인 허브. 좌측 사이드바로 대시보드 / 밸런스메이커 / 통계 / 게시판 / 이벤트 / 관리 / 스토어를 갈아끼우는 "셸"이고, 첫 화면은 대시보드.

**2026-10-13:** [클랜 게시판과 배지 케이스](15-Clan-Board.md)를 추가했다. 공지·규칙 작성은 게시판에서 운영진에게만 제공하며 클랜원은 같은 공간에서 열람한다. 대시보드의 공지 3개는 유지하고 공지 상세를 게시판으로 연결한다.

**2026-10-28 주 영역 확대:** 반복 일정의 다음 회차를 포함해 가까운 일정 최대 3건을 보여 준다. 공지·일정 슬롯은 최소 96px·간격 12px이며 데스크톱에서 같은 높이의 주 카드를 채운다. 날짜 배지는 월이 위, 일이 아래다. 제목 아래 여백은 12px, 하단 MVP 카드 최소 높이는 260px다. 로딩·빈 결과는 목록 영역 안에서 처리한다.

**2026-10-28 중요도별 벤토:** 대표 배지 3개를 클랜 배너 안에 통합하고 바로 아래에 한 줄 규칙 바를 둔다. 별도 규칙·배지 카드와 대시보드의 내전 로비 열기 버튼은 제거한다. 배지는 배너 우측 하단에 정렬하며 스토어의 로비 버튼은 유지한다. 1024px 이상은 12열 격자에서 공지 5열·일정 7열을 배치하고 MVP는 그 아래 전체 너비를 쓴다. 800~1023px는 공지 2열·일정 4열 다음 MVP, 좁은 화면은 공지 → 일정 → MVP 순서다. 카드 간격은 모바일 12px·640px 이상 16px다. MVP 세 부문은 800px 이상 한 행, 그 미만은 세로로 쌓는다. 일정 제목은 줄 수 제한 없이 줄바꿈하고 요일·시간은 장소와 분리해 표시한다. 기존 공지 상세·Premium 안내를 유지한다.

**2026-10-28 MVP 챔피언 포커스:** 다섯 시안 중 사용자가 선택한 챔피언 포커스를 적용한다. 각 부문의 1위는 닉네임 15px·비율 40px와 옅은 트로피로 강조하고, 2~3위는 닉네임 13px·비율 17px의 행으로 아래에 정렬한다. 금·은·동 숫자 메달로 순위를 한 번만 표시하며 큰 단상·네임카드·칭호·경기 설명·그래프는 제공하지 않는다. 카드 여백은 18px이고 제목 아이콘·오른쪽 화살표·카드 전체 이동을 유지한다. 기존 테마 토큰으로 어두운 바탕과 금색 강조를 조합한다. 최소 경기·활성 멤버 조건과 승률/승수, 참여 수, 예측 적중률/적중 수 정렬은 유지한다. 공동 1위는 모두 같은 크기로 강조하고 다음 순위를 건너뛴다. 빈 결과·부족한 순위·조회 실패·Free의 승부예측 잠금과 최소 카드 높이를 유지한다. 추가 조회·스키마 변경은 없다.

**2026-10-28 규칙 플립 바·제목 이동:** 높이 52px의 규칙 바는 줄바꿈으로 나눈 항목을 8초마다 하나씩 표시한다. 본문이 계수기처럼 접혀 넘어가며 긴 문장은 한 줄 말줄임·전체 문장 툴팁으로 표시한다. 별도 번호·이전/다음·재생/정지 컨트롤은 제거했다. 마우스/키보드 접근 시 멈추고 벗어나면 다시 넘긴다. 애니메이션 줄이기 설정에서는 자동 넘김과 효과를 끈다. 규칙 제목·본문은 전문을 볼 수 있는 게시판 #rules, 배너 배지는 배지 케이스로 연결한다. 공지·일정·MVP는 기존 제목 `>`와 카드 영역 이동을 유지한다. 대표 배지는 기존 선택·계열 최고 단계 판정을 재사용하며 상세/대표 지정은 케이스에서 한다.

**2026-10-17 대시보드 시각 위계:** 배치·간격은 위 중요도별 벤토를 따르며, 안쪽 16px(MVP 18px), 제목 15px·700 굵기와 본문 13~14px로 읽는 순서를 구분한다. 강조 테두리는 고정 공지에만 사용한다. MVP의 위계는 위 챔피언 포커스를 따르고 개별 제목만 사용하며 공통 제목·기간 행은 제거한다. 배너/규칙 바 다음 공지·일정, 마지막에 MVP를 배치한다. 데이터·권한·상세 이동은 유지한다.

## 클랜 채팅방 링크 (2026-10-28)

운영 설정 → 알림·연동에서 클랜장이 초대 링크를 등록·수정·삭제한다(Free 포함). 운영진은 읽기만 가능하고 활성 클랜원은 대시보드 배너의 서비스 아이콘으로 새 창에서 입장한다. 주소가 없는 서비스는 숨기며 아이콘에 툴팁·접근 가능한 이름을 제공한다. 기존 Discord 봇 연결·Premium 자동 알림과 별도다.

`clan_settings.community_links`와 기존 활성 멤버 조회·클랜장 수정 RLS를 사용한다. 이전 클랜 생성 시 입력한 Discord·카카오 주소는 이어서 읽고, 명시적으로 비우면 다시 나타나지 않는다. 서버와 표시 단계에서 https·서비스별 호스트/초대 경로·길이를 검사하며 자격 증명·포트·제어문자를 거절한다. 저장할 때 외부 채팅방에 접속하지 않으며 만료 여부·실제 입장은 해당 서비스가 처리한다.

공식 안내에서 공유 가능한 초대 링크를 확인한 여섯 서비스를 선정했다. 국가에 따라 자동으로 숨기지는 않는다.

| 서비스 | 등록 형식·공식 근거 |
| --- | --- |
| Discord | `discord.gg/{code}`, `discord.com/invite/{code}` — [공식 초대 안내](https://support.discord.com/hc/en-us/articles/208866998-Invites-101) |
| 카카오톡 오픈채팅 | `open.kakao.com/o/{code}` — 한국용 커뮤니티 선택지, [카카오톡 공식 소개](https://www.kakaocorp.com/page/service/service/KakaoTalk) |
| LINE | `line.me/ti/g/{code}`, `line.me/ti/g2/{code}` 및 `/R/ti/g/` — 일본·아시아용 선택지, [그룹 초대](https://help.line.me/line/smartphone/?contentId=20008159&lang=en) · [OpenChat 링크 공유](https://openchat-jp.line.me/other/usage_guide_user) |
| Telegram | `t.me/{username}`, `t.me/+{code}`, `t.me/joinchat/{code}` — [공식 초대 링크 형식](https://core.telegram.org/api/invites) |
| WhatsApp | `chat.whatsapp.com/{code}` — [공식 그룹 초대 안내](https://faq.whatsapp.com/3242937609289432/) |
| Steam 채팅 | `steamcommunity.com/chat/invite/{code}` — [공식 채팅 업데이트·외부 초대 링크](https://steamcommunity.com/updates/chatupdate?l=english) |

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

### 네비게이션바 상단 알림 벨 (D-NOTIF-01)

네비게이션바 우측(프로필 아바타 옆)에 **벨 아이콘**을 둔다. 클릭하면 우측에서 슬라이드 인하는 **알림 드로워**가 열리며, 운영 알림·개인 결과 알림·일정 알림이 한 피드에 모인다.

```
┌ Navbar ──────────────────────────────────────────────┐
│ [Logo]  Overwatch › Phoenix Rising    🔔ⁿ  [avatar] │
└──────────────────────────────────────────────────────┘
                                         ▲
                                         │ 클릭
                                         ▼
   ┌ 알림 드로워 (우측 슬라이드) ─────┐
   │ 알림                         [X] │
   │ ──────────────────────────────── │
   │ 🔔 브라우저 알림은 Premium 전용  │  ← D-NOTIF-02 예고 배너 (R3, inert)
   │    · Phase 2+ 예정 (D-NOTIF-02)  │
   │ ──────────────────────────────── │
   │ 🟠 A가 가입을 신청했습니다        │
   │    방금 · 운영 · 원본 열기        │
   │ ──────────────────────────────── │
   │ 🟢 정정 요청이 수락되었습니다     │
   │    5분 전 · 개인 결과 · 원본 열기 │
   │ ──────────────────────────────── │
   │ 🔵 정기 내전이 1시간 후 시작      │
   │    55분 전 · 일정 · 원본 열기     │
   │ ──────────────────────────────── │
   │   [모두 읽음]      [닫기]        │
   └─────────────────────────────────┘
```

**벨 배지 수치**

- `SELECT COUNT(*) FROM notifications WHERE recipient_user_id = auth.uid() AND read_at IS NULL` — 미열람 피드 개수.
- 0이면 숫자 뱃지 숨김(벨 아이콘만 표시). 99+는 `99+`로 표기.

**Phase 2 (MainClan Next.js) 구현 메모**

- 벨 목록은 **현재 URL 클랜과 `notifications.clan_id`가 일치**하는 행만 표시한다(셸 컨텍스트 기준). 전역 허브는 후속.
- 드로어를 **닫을 때**(오버레이·×·Escape·항목 링크로 나가기 포함) 그때까지 화면에 있던 목록 중 **미읽음**에 대해 `mark_notification_reads` 일괄 호출 후 `router.refresh` 한다. (열자마자 `revalidatePath`가 겹치면 UI 시트가 열리지 않는 회귀를 피하기 위함.) **모두 읽음**은 해당 클랜 미읽음 전체에 `mark_notifications_read_all_for_clan`(활성 멤버 검증) 후 갱신.

**드로워 동작**

| 동작 | 결과 |
|------|------|
| 벨 아이콘 클릭 | 드로워 열림. 미읽음이 있으면 배지는 낙관적으로 숨김(닫을 때 서버 읽음 확정) |
| 드로워 닫기 | 열려 있을 때 표시된 항목 중 미읽음 `read_at = now()` 일괄·라우트 갱신 |
| "원본 열기" 클릭 | 해당 항목 read + `source_table`·`source_id`로 딥링크 이동. 드로워 닫힘 |
| "모두 읽음" 버튼 | 미열람 전체 `read_at = now()` |
| 드로워 외부 클릭 / Esc | 드로워 닫힘 |
| 스크롤 끝 도달 | Phase 2+에서 cursor 기반 페이지네이션(최근 30건 기본) |

**알림 카테고리 뱃지 (Phase 1 디자인)**

드로워 항목에 `payload.kind`에 따라 카테고리 태그를 붙인다.

- 🟠 **운영** — `join_request_submitted`, `match_correction_requested`, `scrim_one_side_confirmed`, `lfg_applied`, `member_became_dormant`
- 🟢 **개인 결과** — `join_request_{accepted,rejected}`, `match_correction_{accepted,rejected,expired}`, `lfg_{accepted,rejected,expired}`, `scrim_both_confirmed`, `scrim_invalidated`
- 🔵 **일정** — `event_reminder` (slot_kind별 T-24h/T-1h/T-10min/T+0)
- ⚪ **채팅** — `scrim_chat_closing_soon`, `scrim_chat_closed`

**브라우저 푸시 예고 배너 (D-NOTIF-02 · R3)**

Phase 1 범위는 **예고 배너 한 줄**만. 드로워 최상단(제목 바로 아래, 첫 알림 항목 위)에 inert 배너를 둔다 — 클릭 핸들러·hover 효과·포커스 아웃라인 전부 제거.

- 카피 (KR 고정, Phase 1): `🔔 브라우저 알림은 Premium 전용 · Phase 2+ 예정 (D-NOTIF-02)`
- CSS 클래스: `.mock-notifications-push-hint` — Phase 2+에서 실제 **맥락형 권한 배너**(`[알림 켜기]` / `[나중에]` 버튼 포함)로 교체 시 **전용 클래스라 검색·제거 용이**.
- 스타일 지침: 보라색 계열 얇은 틴트(`#1e1b4b` 배경), 흰색 텍스트 `#c7d2fe`, padding 12px, 알림 항목 배경과 구분되도록 테두리 상하(`border-top`/`border-bottom: 1px solid rgba(139,92,246,.3)`).
- Phase 2+ 전환 규약:
  1. Free 사용자 → 배너 "브라우저 알림은 Premium 전용입니다. [플랜 비교]" + 업셀 모달 연결.
  2. Premium + 미구독 → "🔔 브라우저 알림을 받으시겠어요? / [알림 켜기] [나중에]" 맥락형 배너 + `Notification.requestPermission()` 호출.
  3. Premium + 구독 완료 → 배너 숨김. "이 디바이스 로그아웃"은 `/settings/notifications`에서.
  4. Premium + 거절 → 7일간 배너 재표시 금지 (`localStorage.web_push_dismiss_until`).

### 사이드바 동작
- 데스크톱(≥769px): **기본 64px(접힘)** ← 마우스 올리면 220px로 펼쳐짐 (라벨·항목명 노출).
- 모바일(≤768px): 햄버거 → 옆 패널(드로어) 형태. 배경 오버레이 클릭 시 닫힘.
- 본문은 항상 접힘 기준(64px) 마진을 가져 호버 펼침이 본문을 밀지 않음.

### 사이드바 항목

| 항목 | 해시 | 권한 | 알림 점 (운영 트리거 — D-SHELL-03) |
|------|------|------|-----------------------------------|
| 대시보드 | `#dash` | 전원 | — (허브 뷰라 중복 방지, 본문 카드가 이미 알림 요약 역할) |
| 밸런스메이커 | `#balance` | 전원 (구성원은 관전 + "내전 시작" 차단) | `#sidebar-notify-balance` — **진행 중 내전 세션 수**. 뷰 진입 시 자동 clear |
| 클랜 통계 | `#stats` | 전원 (명예의 전당·내전 통계·개인 기록, 상세 권한은 D-STATS-05) | — (조회형) |
| 이벤트 | `#events` | 전원 (구성원은 등록 불가) | `#sidebar-notify-events` — **24h 내 RSVP 미응답 일정 + 진행 중 투표 미응답** 합. 뷰 진입 시 자동 clear |
| 클랜 관리 | `#manage` | **운영진+ 전용** | `#sidebar-notify-manage` — **가입 요청 pending + 신규 휴면 진입 미처리** 합(D-CLAN-02·07). **실제 처리로만 감소** |
| 클랜 스토어 | `#store` | 전원 | — (신규 쿠폰·아이템은 `#events`로 흡수) |
| ─── 하단 ─── | | | |
| 커뮤니티 (메인 게임) | `/games/[g]` | 전원 | — |
| 프로필 | `/profile` | 전원 | — |

> **알림 점 성격 구분**
> - **정보성**(`#balance`, `#events`): "봤다 = 확인"로 간주 → 뷰 진입 시 자동 clear. 조건이 아직 참이면 다음 refresh에 다시 뜬다.
> - **행동성**(`#manage`): 뷰 진입해도 clear되지 않음. 실제 처리(승인/거절/강퇴/휴면 배너 닫기)로 카운트가 0이 되어야 사라진다.

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
| 규칙 읽기 | 규칙 제목·카드 클릭 / Enter | 게시판 공지·규칙의 전체 규칙 |

### 운영진 전용 표시
- 공지 카드 옆 "관리" 링크 → 클랜 관리(개요)의 공지 작성/편집으로 점프.
- 규칙 제목·카드 → 게시판 공지·규칙의 `#rules`로 이동. 실제 편집 권한은 게시판에서 판정한다.

## 버튼·입력·링크가 하는 일 (셸 + 대시보드)

| 요소 | 동작 |
|------|------|
| 사이드바 항목 | 해당 뷰로 전환 + 해시 갱신. 대시보드는 해시 제거 |
| 사이드바 호버 | 220px로 확장, 라벨 노출 |
| 모바일 햄버거 | 사이드바 드로어 열기 |
| 클랜 배너 "내전 시작" | 운영진+ → `#balance`, 구성원 → alert |
| 공지/규칙 카드 | 제목은 게시판 공지·규칙, 개별 공지는 상세로 이동 |
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
| 알림 점 | **운영 트리거는 D-SHELL-03 — 위 "사이드바 항목" 표 참조**. 목업은 실데이터가 부족하므로 기본적으로 `MOCK_SIDEBAR_NOTIFY_DEBUG = true`(또는 `?sidebarNotifyDebug=1`)로 강제 표시하며, `#manage`는 실데이터(가입 요청·휴면 진입)로 자동 집계 |
| 구성원의 #manage 직접 진입 | alert 후 차단. `?hubDebug=1`이면 예외 |

## 권한·구독에 따른 차이

자세한 표는 [gating-matrix.md](../gating-matrix.md) §2~§3 참조. 요약하면:

- **클랜장** (leader): 모든 메뉴 + 모든 액션.
- **운영진** (officer): 클랜 관리 메뉴 접근, 공지·규칙 편집, 이벤트 등록, 구성원 관리 등. 단, 구독·결제 변경은 클랜장만.
- **구성원** (member): "관리" 메뉴 자체 차단. "내전 시작" 차단. 통계는 공개 설정이 적용된 명예의 전당·내전 집계·본인 개인 기록에 접근하고, 내전 통계의 경기 아카이브는 `view_match_records`, 타인 개인 상세는 기존 통계 권한·D-PRIV-01을 따른다([D-STATS-05](../decisions.md#d-stats-05), 기획 확정·구현 대기).
- **Free 플랜**: 승부예측 MVP 카드 잠금 + "업그레이드" 안내. 그 외 대시보드는 동일.
- **Premium 플랜**: 모든 카드 활성.

## 데이터·연동
- **공지**: 공지와 게시된 진행 중 투표를 고정 우선·최신순으로 합쳐 최대 3개 표시한다. 목록 내부 스크롤은 없으며 본문은 모달에서 전체 표시한다. 나머지 공지는 공지 관리에서 확인한다.
- **규칙**: 클랜별 단일 텍스트.
- **다가오는 일정**: 반복 일정을 포함해 가까운 발생 시각순 2건만 표시한다. 나머지는 이벤트 페이지에서 확인하며 목록 스크롤은 두지 않는다. 넓은 화면에서 일정과 배지 카드를 같은 행으로 묶어 상하단 높이를 맞추고 로딩·빈 결과에도 목록 영역을 유지한다.
- **MVP 카드**: 통계 집계 결과 (승률 MVP, 참여율 MVP, 승부예측 MVP).
- **클랜 배지 컬렉션**: 창단·내전 100/500회·1주년의 달성/미달성 상태를 표시한다. 내전 배지는 종료된 정규 내전 회차로 집계하며 개별 경기 수·깜짝 내전은 제외한다. 운영 현황에서도 동일한 집계·컴포넌트를 사용한다.

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
- ~~D-SHELL-01 사이드바 hover 확장의 모바일 대응 일관성~~ → **DECIDED (2026-04-20)**. [decisions.md §D-SHELL-01](../decisions.md#d-shell-01--사이드바-반응형-패턴-데스크톱-hover--모바일-드로어) 참고
- ~~D-SHELL-02 `?role=` `?plan=` 쿼리 우회 차단 (서버 권한 단일 출처)~~ → **DECIDED (2026-04-20)**. [decisions.md §D-SHELL-02](../decisions.md#d-shell-02--권한디버그-쿼리-우회-차단-정책) 참고
- ~~D-SHELL-03 사이드바 알림 점의 운영 트리거 규칙~~ → **DECIDED (2026-04-20)**. [decisions.md §D-SHELL-03](../decisions.md#d-shell-03--사이드바-알림-점-트리거-규칙) 참고
- ~~D-NOTIF-01 in-app 알림 센터 통합~~ → **DECIDED (2026-04-21)**. 네비게이션바 벨 + 드로워 + `notifications` 피드 테이블. [decisions.md §D-NOTIF-01](../decisions.md#d-notif-01--in-app-알림-센터-통합-도입) 참고
- ~~D-NOTIF-02 브라우저 ServiceWorker 푸시~~ → **DECIDED (2026-04-21, 프리셋 α, 범위 R3)**. Premium 전용, 4 카테고리 독립 토글, 맥락형 권한 프롬프트, 서버 quiet hours 00~07 KST 준수. Phase 1은 벨 드로워 상단 inert 예고 배너 + `web_push_subscriptions` 스키마만. 실구현 Phase 2+. [decisions.md §D-NOTIF-02](../decisions.md#d-notif-02--브라우저-서비스워커-웹-푸시-도입-정책-프리셋-α) 참고
- (대시보드, 2026-10-27 반영) 다가오는 일정은 향후 12개월의 반복 발생을 포함한 가까운 2건.
- **D-NOTIF-02b (후속 후보, OPEN)** — web_push 공급자·SDK 선택 (web-push npm 패키지 · Firebase Cloud Messaging · OneSignal 등)
- **D-NOTIF-02c (후속 후보, OPEN)** — Free 하이브리드(중요 알림 허용) 재검토. 운영 6개월 데이터 누적 후
- **D-NOTIF-03** — 이메일 다이제스트(일간/주간 요약) 여부 → **DROPPED 2026-04-21** (도입 보류, 이메일은 거래 메일로만 사용)
- **D-EMAIL-01 (후속 후보, OPEN, Phase 2+)** — 거래 메일 공급자 선택 (Resend · AWS SES · SendGrid). 다이제스트와 분리, D-NOTIF-03 DROPPED 이후 신규 등재
- **D-NOTIF-03b (후속 후보, OPEN, 조건부)** — 다이제스트 도입 재검토. 운영 3~6개월 비활성·휴면 복귀율 데이터 누적 후
- ~~D-PRIV-01 개인 단위 프라이버시 오버라이드~~ → **DECIDED (2026-04-21, 프리셋 α, 범위 R3)**. restrict-only(닫기만) · 통계 5개 키(`view_monthly_stats`·`view_yearly_stats`·`view_synergy_winrate`·`view_map_winrate`·`view_mscore`) · 단일 스위치(member에게만 숨김, leader·officer 항상 열람) · 클랜별 독립. 저장 = `user_privacy_overrides(user_id, clan_id, key, hidden)`. 부계정은 대상 제외(부정행위 은폐 차단). Phase 1은 "운영 권한 설정" 카드 D-PERM-01 안내 박스에 예고 카피 1줄만(`.mock-privacy-override-hint`). 실구현(프로필 "프라이버시 설정" 섹션 + `has_user_stat_access()` SQL 함수)은 Phase 2+. [decisions.md §D-PRIV-01](../decisions.md#d-priv-01--개인-단위-프라이버시-오버라이드-프리셋-α) 참고
- **D-PRIV-01b (후속 후보, OPEN, 조건부)** — 양방향 오버라이드 재검토. `hidden boolean` → `visibility_override enum('inherit','hide','show')` 확장. 운영 6개월 후 "개인이 열고 싶어 한다"는 수요 확인 시
- **D-PRIV-02 (후속 후보, OPEN)** — 부계정(`view_alt_accounts`) 오버라이드 재검토. 부정행위 은폐 리스크 vs 개인 의사 수용의 균형점 재평가
- **D-PRIV-03 (후속 후보, OPEN, Phase 2+)** — 비클랜 맥락(클랜 탈퇴 후·외부 프로필 열람)의 프라이버시 정책

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
- 알림 점: `#sidebar-notify-balance`, `#sidebar-notify-events`, `#sidebar-notify-manage`, `mockSidebarNotifyRefresh()`, `mockSidebarNotifyClearView(view)` — D-SHELL-03 규칙 구현. `manage`는 데이터 기반 자동 집계이므로 `mockSidebarNotifyClearView('manage')` 케이스 **없음**(행동성)
- 알림 벨(D-NOTIF-01): `#mock-navbar-notify-bell`, `#mock-navbar-notify-badge`, `#mock-notifications-drawer`, `mockNotificationsStore`, `mockNotificationsOpenDrawer()`, `mockNotificationsCloseDrawer()`, `mockNotificationsMarkAllRead()`, `mockNotificationsOpenSource(id)`. 스토리지 키 `MOCK_NOTIFICATIONS_KEY = 'clansync-mock-notifications-v1'`. D-SHELL-03 사이드바 메뉴 점과 **독립 집계** (벨 = `notifications.read_at IS NULL` 수, 메뉴 점 = 각 메뉴 고유 척도)
- 브라우저 푸시 예고 배너(D-NOTIF-02 · R3): 드로워 최상단 inert 배너 한 줄. 클래스 `.mock-notifications-push-hint`, Phase 2+ 교체 지점. 클릭 핸들러 없음, 순수 표시용
- 개인 프라이버시 오버라이드 예고(D-PRIV-01 · R3): "운영 권한 설정" 카드의 D-PERM-01 안내 박스 내부 예고 카피 1줄. 클래스 `.mock-privacy-override-hint`, Phase 2+ 교체 지점(프로필 페이지 "프라이버시 설정" 섹션). `aria-hidden="true"`로 보조 디바이스 읽기 제외
- 공지·규칙 저장 키: `MOCK_CLAN_NOTICE_POSTS_KEY`, `MOCK_CLAN_RULES_KEY`, `MOCK_CLAN_RULES_DEFAULT_TEXT`
- 디버그 배너: `#mock-hub-debug-banner` (`?hubDebug=1`)

## 연관 문서
- [pages.md](../pages.md)
- [slices/slice-03-main-clan-shell.md](../slices/slice-03-main-clan-shell.md)
- [non-page/clan-main-static-mockup-plan.md](../non-page/clan-main-static-mockup-plan.md)
- [gating-matrix.md](../gating-matrix.md)
- [decisions.md](../decisions.md)
- 하위 뷰 문서: [09-BalanceMaker.md](./09-BalanceMaker.md), [10-Clan-Stats.md](./10-Clan-Stats.md), [11-Clan-Events.md](./11-Clan-Events.md), [12-Clan-Manage.md](./12-Clan-Manage.md), [13-Clan-Store.md](./13-Clan-Store.md)
