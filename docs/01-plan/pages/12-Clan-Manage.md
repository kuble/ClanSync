# 12 Clan Manage · 클랜 관리

## 한 줄 요약
운영진+ 전용 운영 콘솔. 개요 / 가입 요청 / 구성원 / 구독결제 4개 서브탭으로 클랜 프로필·공지·규칙·가입 요청·멤버·결제를 운영한다.

## 누가 / 언제 본다
- 운영진+ (officer / leader).
- 일상 운영(공지·규칙 갱신, 가입 요청 처리, 구독 갱신)을 위해.

## 화면 진입 조건
- 클랜 메인 진입 조건 + **운영진+ 권한 필수**.
- 구성원이 사이드바·해시·직접 URL로 진입 시 차단 (alert + 대시보드로 복귀). `?hubDebug=1`만 예외.

## 사용자 흐름

```
관리 뷰 진입 (개요 탭 기본)
    │
    ├─ 개요 ──► 클랜 프로필 요약 / 배너·아이콘 편집 / 공지 게시글 / 규칙
    │
    ├─ 가입 요청 ──► 대기 중인 신청 승인·거절 (D-CLAN-02 상태 머신)
    │
    ├─ 구성원 ──► 활성도 요약 / 검색·활성도 필터 / 활성+비활성 테이블 / 휴면 섹션(일괄 강퇴) / 행 클릭 → 개인 상세 모달
    │
    └─ 구독결제 ──► 현재 플랜 / 결제 기록 / (클랜장만) 플랜 변경
```

## 화면 구성

```
H1 "클랜 관리"
부제 "개요 · 가입 요청 · 구성원 · 구독결제로 구분합니다."

[탭] [개요] [가입 요청 (N)] [구성원] [구독결제]
```

- **가입 요청 탭**에는 대기 카운트 배지(`N`)가 라벨에 붙는다. 구성원 탭 진입 시 개요 카운트가 줄어들도록 승인/거절 후 동기화한다.
- 대기 카운트 배지는 사이드바 N 알림 점과 동일한 빨간 원형 카운트 pill(`.mock-notify-pill`)을 사용한다. 0건이면 숨긴다.
- **사이드바 "클랜 관리" 메뉴**에도 알림 점(`#sidebar-notify-manage`, `.sidebar-notify-dot`)이 붙는다. `가입 요청 pending 수 + 신규 휴면 진입 미처리 수`의 합이 1 이상이면 빨간 N 점을 표시해서 운영진이 바로 인지할 수 있게 한다. 실제 구현에서는 서버 측 카운트(pending 요청, 최근 휴면 전환 이벤트)를 조합해 동일한 배지를 갱신한다.
- `#manage`는 **행동성 알림**(D-SHELL-03)으로 분류된다. 뷰 진입만으로 clear되지 않으며, **실제 처리**(가입 요청 승인/거절, 휴면 멤버 일괄 강퇴, 휴면 진입 배너 닫기)를 통해 카운트가 줄어야 사라진다. 따라서 `mockSidebarNotifyClearView('manage')` 케이스는 존재하지 않고, `mockManageRequestsRender` · `mockManageMembersRender` 종료 시 `mockSidebarNotifyRefresh()` 호출로 자동 재집계된다. 규칙은 [decisions.md §D-SHELL-03](../decisions.md#d-shell-03--사이드바-알림-점-트리거-규칙) 참고.

## 탭 1 — 개요 (Overview)

### 영역
1. **클랜 프로필 요약 카드**
   - 배지 칩 (경쟁 / 성인 / 마이크 필수 등)
   - 메타 한 줄 (예: "연령 20대+ · 클랜 공개 방")
   - 외부 링크 행: 디스코드 / 오픈카카오톡
   - 클랜 코인 현황 (잔액 + "스토어·이벤트와 연동" 캡션)
2. **배너 · 클랜 아이콘 카드** (운영진+)
   - "배너 이미지 편집" / "클랜 아이콘 편집" 버튼
   - 업로드 모달 하단에 D-MANAGE-04 제약 안내: "JPEG · PNG · WebP / 배너 최대 3MB · 아이콘 최대 2MB / 정적 이미지만 / 자동 리사이즈"
3. **클랜 공지 (게시글) 카드** (운영진+)
   - "+ 공지 작성"
   - 공지 게시글 리스트 (수정 / 삭제 / 핀 토글)
4. **클랜 규칙 카드** (운영진+)
   - 단일 textarea
   - "저장" + "저장됨" 토스트
5. **운영 권한 설정 카드** (신설 · D-MANAGE-02 / D-MANAGE-03 · leader-only 쓰기)
   - 제목: "운영 권한 설정" · 부제: "운영진이 수행할 수 있는 범위를 조정합니다."
   - 토글 1 — **M점수 편집을 운영진에게도 허용** (`allow_officer_edit_mscore`, 기본 OFF)
     - 설명: "밸런스메이커 팀 밸런스에 직결되는 민감한 수치입니다. 기본은 클랜장만 편집합니다."
   - 라디오 1 — **부계정 공개 범위** (`alt_accounts_visibility`, 기본 `officers`)
     - 옵션 A: "운영진만" (기본, 권장)
     - 옵션 B: "클랜 전체 공개" — 선택 시 확인 모달 "모든 구성원이 서로의 부계정을 볼 수 있습니다. 계속하시겠습니까?"
   - officer 세션에서는 카드가 **읽기 전용**(입력 요소 disabled + "클랜장만 변경할 수 있습니다" 캡션)

### 모달

| 모달 | 트리거 | 비고 |
|------|--------|------|
| 클랜 이미지 편집 | "배너/아이콘 편집" | data URL 업로드, 미리보기, 적용. **D-MANAGE-04 제약 적용**: MIME `image/jpeg·png·webp`, 배너 ≤ 3MB / 아이콘 ≤ 2MB, 애니메이션 거부. 위반 시 즉시 에러 문구 |
| 공지 작성/편집 | "+ 공지 작성" / 공지 행 편집 | 제목·본문·핀 여부. 저장 시 게시글 리스트 갱신 |
| 공지 삭제 확인 | 공지 행 삭제 | confirm |
| 부계정 공개 전환 확인 | 운영 권한 설정 카드의 라디오 → "클랜 전체 공개" | "모든 구성원이 서로의 부계정을 볼 수 있게 됩니다. 계속하시겠습니까?" · leader만 |
| M점수 officer 허용 전환 확인 | 운영 권한 설정 카드의 토글 ON | "운영진이 즉시 M점수 편집 가능해집니다. 감사 로그가 기록됩니다." · leader만 |

### 권한
- 모든 카드 운영진+ 전용 (`mock-officer-only`).
- 클랜 코인 잔액 표시는 모든 운영진+가 조회 가능.
- **운영 권한 설정 카드**만 예외: 열람은 운영진+, **변경은 leader 전용**(`.mock-leader-only`로 래핑). officer 세션에서는 입력 요소가 disabled + "클랜장만 변경할 수 있습니다" 캡션.

## 탭 2 — 가입 요청 (Requests)

### 영역
1. **가입 요청 카드**
   - 표: 닉네임 / 게임 ID / 신청일 / [승인][거절]
   - 승인 / 거절 클릭 시 가입 신청 상태 머신과 연결 (D-CLAN-02)
   - 승인 후 해당 신청자는 **구성원** 탭에 즉시 반영되고, 탭 라벨 옆 대기 카운트 배지 `N`이 감소한다.
   - 거절 시 신청자에게는 사유 없이 반려되었음이 통지된다(상세 이유 공개 여부는 D-CLAN-02).

### 권한
- 운영진+ (승인·거절 모두 허용). leader/officer 권한 차이 없음. (D-MANAGE-02 확정)

## 탭 3 — 구성원 (Members · D-CLAN-07 활성도 분류)

### 영역
1. **활성도 요약 배너** (카드 상단)
   - 4개 pill: `활성` / `비활성` / `휴면` / `인원 한도` (각 pill 앞에 상태 아이콘)
     - 활성: 체크 서클 아이콘
     - 비활성: 시계 아이콘
     - 휴면: 달 아이콘
     - 인원 한도: users 아이콘
   - 인원 한도는 `활성 + 비활성` 합만 카운트 (휴면 제외)
   - **신규 휴면 진입 알림**: "최근 7일간 N명이 새로 휴면 분류됐습니다" 띠 — 경고 삼각 아이콘 + `×` 닫기 버튼 (세션 동안 재표시 안 함)
2. **도구 바**: 검색바(닉네임·게임 ID) + 활성도 필터 select(`전체 / 활성만 / 비활성만`) + 결과 카운트
3. **활성 + 비활성 테이블**: 활성도 배지 / 닉네임 / 게임 ID / 역할 / 가입일 / 최근 참여(+경과일) / 클랜 기부
   - 페이지네이션(5명씩)
   - 행 클릭 → **개인 기록 상세 모달**
4. **휴면 멤버 섹션** (접힘 카드, 기본 접힘)
   - 헤더: `[달 아이콘] 휴면` 배지 + `휴면 멤버` 라벨 + `N명` 카운트 pill + `펼치기/접기` 토글
   - 안내: "60일+ 무활동, 자동 탈퇴 없음, 인원 한도 제외" (D-CLAN-07)
   - 표: 체크박스 / 닉네임 / 게임 ID / 역할 / 가입일 / 최근 참여 / [상세]
   - 도구 바: `현재 페이지 전체 선택` 체크박스 + 선택 수 표시 + `선택 멤버 일괄 강퇴` 버튼
   - 일괄 강퇴 범위: **현재 페이지만** (오판 시 복구 어려우므로)
   - 페이지네이션(5명씩)

> **아이콘 체계**: 모든 상태/액션 아이콘은 이모지가 아닌 stroke 기반 SVG(`.ui-ic`)로 표기한다. `currentColor` 상속으로 배지/pill의 색상에 자동 동화된다.

### 개인 기록 상세 모달

탭으로 다음 영역을 본다 (목업 `MOCK_MANAGE_MEMBERS`):

| 탭 / 영역 | 내용 |
|-----------|------|
| 요약 | 닉, 역할, 가입일, 최근 참여 |
| 기록 | 출전 · 승률 · 평균 KDA · 베스트 영웅 |
| 맵 / 역할 / 시너지 | 맵별 승률, 역할별 픽률, 시너지 좋은 동료 |
| 부계정 | 등록된 부계정 닉 (D-MANAGE-03). 공개 범위는 `clan_settings.alt_accounts_visibility`에 따라 `officers` 기본 / `clan_members` 옵션 |
| 운영 액션 | **역할 변경·officer 강퇴·leader 위임**(`.mock-leader-only`) / **member 강퇴·가입 승인 거절**(운영진+) / **M점수 편집**(기본 leader만, 토글 ON 시 officer도) — D-MANAGE-02 매트릭스 |

### 권한 (D-MANAGE-02 확정 매트릭스)

| 액션 | leader | officer |
|------|:------:|:-------:|
| 검색·페이지네이션·개인 상세 열람 | ✓ | ✓ |
| 가입 요청 승인·거절 | ✓ | ✓ |
| member 강퇴 | ✓ | ✓ |
| officer 강퇴 | ✓ | ✗ (`.mock-leader-only`) |
| 역할 변경 (member ↔ officer) | ✓ | ✗ |
| leader 위임 | ✓ | ✗ |
| **휴면 섹션 일괄 강퇴** | ✓ | ✗ |
| **M점수 편집** | ✓ | 토글 (`allow_officer_edit_mscore` true일 때 ✓) |
| **부계정 열람** | ✓ | ✓ (기본) / member도 열람 가능 (`alt_accounts_visibility='clan_members'` 시) |

### 활성도 분류 (D-CLAN-07)

| 분류 | 아이콘 | 기준 | UI 취급 | 인원 한도 |
|------|--------|------|---------|:---------:|
| 활성 | 체크 서클 | `daysSince < 30` | 기본 테이블, 필터 "활성만" 대상 | 포함 |
| 비활성 | 시계 | `30 ≤ daysSince < 60` | 기본 테이블, 필터 "비활성만" 대상 | 포함 |
| 휴면 | 달 | `daysSince ≥ 60` | 별도 접힘 섹션 · 체크박스 일괄 강퇴 | **제외** |

- 분류 판정 기준 컬럼: `clan_members.last_activity_at` (schema.md 참조).
- "활동"의 정의는 D-CLAN-07 `활성도 정의` 절을 따른다(로그인·매치·게시글·운영 액션 등 포괄).
- **자동 탈퇴 없음**: 휴면 멤버는 시스템이 자동 강퇴하지 않는다. 클랜장이 섹션에서 체크박스로 선택해 일괄 정리한다.
- **신규 휴면 진입 알림**: 최근 7일 내 휴면으로 새로 분류된 멤버가 있으면 요약 배너 상단에 경고 띠 표시. 닫으면 세션 내 재표시 금지.

## 탭 4 — 구독결제 (Subscribe)

### 영역
- 카드 (운영진+ `mock-officer-only`):
  - 안내 문구 (Free / Premium 버전 분리)
  - 현재 플랜 요약: 플랜명 / 다음 결제일 / 사용 인원 등 (운영진+ 모두 열람)
  - **결제 기록 표** (일시 / 금액 / 수단 / 상태) — officer도 금액·일시 열람 가능. **영수증 상세**(세부 항목·결제사 응답 등) 링크만 `.mock-leader-only`
  - 액션 영역: "목업 결제 1건 추가", "Premium" / "Free" 플랜 전환 버튼, 결제 수단 관리, 환불 요청 — **모두 `.mock-leader-only`**. officer 세션에서는 **비활성 버튼 + "클랜장만 변경할 수 있습니다" 툴팁** 표시(숨김 아님 — 권한 투명성).
- 구성원 진입 시 (`mock-member-only`):
  - "구독·결제는 운영진 이상만 이용할 수 있습니다(목업)."

### 권한 정책 (D-MANAGE-01 확정)

| 요소 | leader | officer | member |
|------|:------:|:-------:|:------:|
| 메뉴·탭 진입 | ✓ | ✓ | ✗ |
| 현재 플랜 상태 확인 | ✓ | ✓ | ✗ |
| 결제 이력 (금액·일시) 조회 | ✓ | ✓ | ✗ |
| 영수증 상세 조회 | ✓ | ✗ | ✗ |
| 결제 수단 추가·삭제 | ✓ | ✗ | ✗ |
| 플랜 변경 (Free ↔ Premium) | ✓ | ✗ (비활성 + 툴팁) | ✗ |
| 환불 요청 | ✓ | ✗ | ✗ |

- officer가 제한 액션 버튼을 클릭해도 동작하지 않고, hover 시 "클랜장만 변경할 수 있습니다" 툴팁만 표시한다. 숨기지 않고 비활성으로 노출해 "왜 못하지?"를 사전에 해소.

## 권한·구독에 따른 차이

자세한 표는 [gating-matrix.md](../gating-matrix.md) §7. 핵심:

| 항목 | leader | officer | member |
|------|:------:|:-------:|:------:|
| 메뉴 진입 | ✓ | ✓ | ✗ |
| 개요 본문 (프로필·공지·규칙·코인) | ✓ | ✓ | ✗ |
| 배너·아이콘 편집 (3MB / 2MB) | ✓ | ✓ | ✗ |
| 공지 작성·편집·삭제 | ✓ | ✓ | ✗ |
| 규칙 편집 | ✓ | ✓ | ✗ |
| 운영 권한 설정 카드 열람 | ✓ | ✓ (읽기 전용) | ✗ |
| 운영 권한 설정 카드 변경 (M점수·부계정) | ✓ | ✗ | ✗ |
| 가입 요청 탭 진입·승인·거절 | ✓ | ✓ | ✗ |
| 구성원 탭 진입·검색·활성도 필터 | ✓ | ✓ | ✗ |
| member 강퇴 | ✓ | ✓ | ✗ |
| officer 강퇴·역할 변경·leader 위임 | ✓ | ✗ | ✗ |
| 휴면 섹션 일괄 강퇴 (D-CLAN-07) | ✓ | ✗ | ✗ |
| M점수 편집 | ✓ | 토글 ON 시 ✓ | ✗ |
| 부계정 열람 | ✓ | ✓ | 토글 `clan_members` 시 ✓ |
| 구독결제 — 본문·이력 열람 | ✓ | ✓ | — |
| 구독결제 — 영수증 상세·결제 수단·환불 | ✓ | ✗ | — |
| 구독결제 — 플랜 변경 | ✓ | ✗ (비활성 + 툴팁) | — |

## 데이터·연동

### 클랜 프로필 (`clans`)
- 배지·메타·외부 링크·잔액·연동 정보.
- 배너·아이콘 URL은 별도 스토리지.

### 공지 (`clan_notices` 또는 동등)
- (clan_id, 제목, 본문, pinned, created_at, updated_at, author_id)
- 게시글·피드 모델과 통합 가능 (목업 카피 참조).

### 규칙 (`clan_rules` 또는 단일 컬럼)
- 단일 텍스트. 클랜당 1행.

### 구성원 (`clan_members`)
- 역할 (leader/officer/member), 가입일, 최근 참여, 누적 기부.
- 검색·페이지네이션은 서버 페이징 권장 (인원 500+ 대비).

### 가입 요청 (`clan_join_requests`)
- 상태 머신 D-CLAN-02. 승인 시 `clan_members` 레코드 생성.

### 결제 (`coin_transactions` / 별도 `subscription_payments`)
- 일시·금액·수단·상태.
- Stripe / 토스 연동은 운영 시 결정.

## 목업과 실제 구현의 차이
- 가입 요청 승인/거절은 alert만. 실제는 상태 머신 갱신 + 이벤트 발행.
- 구성원 표는 `MOCK_MANAGE_MEMBERS`에서 가져옴. 검색·페이지네이션은 클라이언트 한정.
- **활성도 분류(D-CLAN-07)**: 목업은 각 멤버에 하드코딩된 `daysSince` 숫자 필드를 기반으로 분류. 실제는 `last_activity_at` 타임스탬프에서 서버·클라이언트가 계산.
- **휴면 일괄 강퇴**: 목업은 `localStorage`(`clansync-mock-manage-kicked-dormant-v1`)에 강퇴 id를 기록해 같은 브라우저에서 유지. 실제는 `clan_members.status = 'left'` 업데이트 + 감사 로그.
- **휴면 진입 알림 배너**: 목업은 `sessionStorage`(`clansync-mock-manage-dormant-banner-dismissed-v1`)에 닫힘 플래그 저장(세션 단위). 실제는 사용자별 `dismissed_until` 시각을 서버에 저장해 재표시 규칙을 구성.
- 공지·규칙은 `localStorage`에 저장. 실제는 서버 DB.
- 구독 토글은 `localStorage`(`clansync-mock-subscribe-v1`)에 저장. 실제는 결제 연동.
- 배너·아이콘 업로드는 data URL을 `localStorage`에 저장 → 운영 시 스토리지 + URL.
- 개인 상세 모달은 카드 텍스트만 — 운영 액션이 alert 수준.

## 결정 필요
- ~~D-MANAGE-01 구독·결제 탭 접근 권한~~ (DECIDED 2026-04-20 — officer 열람 OK, 변경·영수증·환불은 leader)
- ~~D-MANAGE-02 개인 상세 편집 권한 + 휴면 일괄 강퇴~~ (DECIDED 2026-04-20 — 역할·officer강퇴·leader위임·휴면일괄강퇴는 leader 전용, M점수는 `allow_officer_edit_mscore` 토글)
- ~~D-MANAGE-03 부계정 조회 정책~~ (DECIDED 2026-04-20 — `alt_accounts_visibility` 클랜 설정 토글, 기본 officers)
- ~~D-MANAGE-04 배너·아이콘 업로드 제약~~ (DECIDED 2026-04-20 — 배너 3MB / 아이콘 2MB · JPEG/PNG/WebP · 정적만)
- D-CLAN-02 가입 요청 상태 머신 (이 화면이 핵심 소비자)
- ~~D-CLAN-07 활성도 분류 (목업 반영 완료)~~

## 구현 참고 (개발자용)

- 목업 위치: `mockup/pages/main-clan.html` `#view-manage`
- 탭 전환: `window.mockManageSetTab(btn, 'overview' | 'requests' | 'members' | 'subscribe')` — `requests` 선택 시 `mockManageRequestsRender`, `members` 선택 시 `mockManageMembersRender` 자동 호출
- **가입 요청 탭**: `window.mockManageRequestsRender` — 정적 `<tr>` 개수로 탭 뱃지(`#mock-manage-requests-badge`)와 카드 배지(`#mock-manage-requests-count`)를 동기화하고, 0건이면 `hidden`으로 숨긴다. 렌더 종료 시 `window.mockSidebarNotifyRefresh()`를 호출해 사이드바 N 점도 같이 갱신. 실제 구현에서는 `clan_join_requests` 쿼리 결과로 대체 (D-CLAN-02)
- **사이드바 알림 점**: `window.mockSidebarNotifyRefresh` — `#sidebar-notify-manage` 배지에 `가입 요청 <tr> 개수 + mockManageMembersStats().newDormant`를 표시. `mockManageMembersRender`·`mockManageRequestsRender` 종료 시 자동 호출되어 휴면 진입 이벤트와 요청 처리에 실시간 반응한다.
- 배너·아이콘: `window.mockClanImageModalOpen('banner' | 'icon')`
- 공지: `window.mockClanNoticePostModalOpen(post|null)` + `MOCK_CLAN_NOTICE_POSTS_KEY` localStorage 키
- 규칙: `window.mockClanManageSaveRules`, 키 `MOCK_CLAN_RULES_KEY`
- 구성원 검색·활성도 필터·페이저: `window.mockManageMembersOnSearch`, `window.mockManageMembersOnActivityFilter`, `window.mockManageMembersPage` + `MOCK_MANAGE_MEMBERS`
- **활성도 분류(D-CLAN-07)**: 내부 함수 `mockClassifyActivity(daysSince)` · 임계 상수 `MOCK_ACTIVITY_THRESHOLD_INACTIVE=30`, `MOCK_ACTIVITY_THRESHOLD_DORMANT=60`
- **휴면 섹션**: 토글 `window.mockManageMembersToggleDormantSection`, 페이저 `window.mockManageMembersDormantPage`, 체크 `window.mockManageMembersToggleDormant(id, checked)`, 전체선택 `window.mockManageMembersSelectAllDormantPage`, 일괄 강퇴 `window.mockManageMembersBulkKickDormant`, 초기화 `window.mockManageMembersResetKickedDormant`
- **스토리지 키**: 강퇴 기록 `clansync-mock-manage-kicked-dormant-v1` (localStorage), 알림 배너 닫힘 `clansync-mock-manage-dormant-banner-dismissed-v1` (sessionStorage)
- 구독: `window.mockManageSubscribeAddMockPayment`, `window.mockManageSubscribeSetPlan('premium' | 'free')`, 키 `clansync-mock-subscribe-v1`
- **운영 권한 설정 카드 (D-MANAGE-02 / D-MANAGE-03)**: `window.mockClanSettingsGet()` → `{allowOfficerEditMscore: bool, altAccountsVisibility: 'officers'|'clan_members'}`. 변경: `window.mockClanSettingsSet(partial)`. 저장 키 `clansync-mock-clan-settings-v1` (localStorage).
- **업로드 검증 (D-MANAGE-04)**: `window.mockClanImageValidate(file, kind)` — kind는 `'banner'|'icon'`. 반환 `{ok: bool, error?: string}`. MIME·용량(3MB/2MB) 검증. 위반 시 모달 하단 에러 문구.
- 운영진+ 표시: `mock-officer-only`, 구성원 안내: `mock-member-only`, **leader 전용**: `mock-leader-only`
- 카드 hint 분기: `.mock-clan-subscribe-hint-free`, `.mock-clan-subscribe-hint-premium`
- 구성원 진입 차단: `applyManageGate` (alert + 대시보드 복귀, `?hubDebug=1` 예외)

## 연관 문서
- [pages.md](../pages.md)
- [slices/slice-06-events-manage-store.md](../slices/slice-06-events-manage-store.md)
- [schema.md](../schema.md) (`clans`, `clan_members`, `clan_join_requests`)
- [07-MainClan.md](./07-MainClan.md) (셸 + 공지·규칙 ↔ 대시보드 연결)
- [13-Clan-Store.md](./13-Clan-Store.md) (코인 잔액 표시 일관성)
- [decisions.md](../decisions.md) (D-MANAGE-01~04, D-CLAN-02)
- [gating-matrix.md](../gating-matrix.md) §7
