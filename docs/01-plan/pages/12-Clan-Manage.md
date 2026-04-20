# 12 Clan Manage · 클랜 관리

## 한 줄 요약
운영진+ 전용 운영 콘솔. 개요 / 구성원 관리 / 구독결제 3개 서브탭으로 클랜 프로필·공지·규칙·멤버·결제를 운영한다.

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
    ├─ 구성원 관리 ──► 가입 요청 승인·거절 / 구성원 목록 검색·페이지·행 클릭 → 개인 상세 모달
    │
    └─ 구독결제 ──► 현재 플랜 / 결제 기록 / (클랜장만) 플랜 변경
```

## 화면 구성

```
H1 "클랜 관리"
부제 "개요 · 구성원 관리 · 구독결제로 구분합니다."

[탭] [개요] [구성원 관리] [구독결제]
```

## 탭 1 — 개요 (Overview)

### 영역
1. **클랜 프로필 요약 카드**
   - 배지 칩 (경쟁 / 성인 / 마이크 필수 등)
   - 메타 한 줄 (예: "연령 20대+ · 클랜 공개 방")
   - 외부 링크 행: 디스코드 / 오픈카카오톡
   - 클랜 코인 현황 (잔액 + "스토어·이벤트와 연동" 캡션)
2. **배너 · 클랜 아이콘 카드** (운영진+)
   - "배너 이미지 편집" / "클랜 아이콘 편집" 버튼
3. **클랜 공지 (게시글) 카드** (운영진+)
   - "+ 공지 작성"
   - 공지 게시글 리스트 (수정 / 삭제 / 핀 토글)
4. **클랜 규칙 카드** (운영진+)
   - 단일 textarea
   - "저장" + "저장됨" 토스트

### 모달

| 모달 | 트리거 | 비고 |
|------|--------|------|
| 클랜 이미지 편집 | "배너/아이콘 편집" | data URL 업로드, 미리보기, 적용. 용량/형식 제한 미정 (D-MANAGE-04) |
| 공지 작성/편집 | "+ 공지 작성" / 공지 행 편집 | 제목·본문·핀 여부. 저장 시 게시글 리스트 갱신 |
| 공지 삭제 확인 | 공지 행 삭제 | confirm |

### 권한
- 모든 카드 운영진+ 전용 (`mock-officer-only`).
- 클랜 코인 잔액 표시는 모든 운영진+가 조회 가능.

## 탭 2 — 구성원 관리 (Members)

### 영역
1. **가입 요청 카드**
   - 표: 닉네임 / 게임 ID / [승인][거절]
   - 승인 / 거절 클릭 시 가입 신청 상태 머신과 연결 (D-CLAN-02)
2. **구성원 카드**
   - 검색바: 닉네임·게임 ID 부분 일치 (디바운스)
   - 결과 카운트 표시
   - 표: 닉네임 / 게임 ID / 역할 / 가입일 / 최근 참여 / 클랜 기부
   - 페이지네이션
   - 행 클릭 → **개인 기록 상세 모달**

### 개인 기록 상세 모달

탭으로 다음 영역을 본다 (목업 `MOCK_MANAGE_MEMBERS`):

| 탭 / 영역 | 내용 |
|-----------|------|
| 요약 | 닉, 역할, 가입일, 최근 참여 |
| 기록 | 출전 · 승률 · 평균 KDA · 베스트 영웅 |
| 맵 / 역할 / 시너지 | 맵별 승률, 역할별 픽률, 시너지 좋은 동료 |
| 부계정 | 등록된 부계정 닉 (D-MANAGE-03) |
| 운영 액션 | 역할 변경 (member ↔ officer ↔ leader) / M점수 편집 / 강퇴 등 (D-MANAGE-02) |

### 권한
- 가입 요청 처리·구성원 검색·개인 상세 열람: 운영진+.
- 역할 변경·M점수 편집·강퇴 등 파괴적 액션의 권한 분리는 D-MANAGE-02.

## 탭 3 — 구독결제 (Subscribe)

### 영역
- 카드 (운영진+ `mock-officer-only`):
  - 안내 문구 (Free / Premium 버전 분리)
  - 현재 플랜 요약: 플랜명 / 다음 결제일 / 사용 인원 등
  - 결제 기록 표 (일시 / 금액 / 수단 / 상태)
  - 액션 영역: "목업 결제 1건 추가", "Premium" / "Free" 플랜 전환 버튼
- 구성원 진입 시 (`mock-member-only`):
  - "구독·결제는 운영진 이상만 이용할 수 있습니다(목업)."

### 권한 정책
- **메뉴 접근**: 운영진+ (구성원은 차단).
- **본문 열람**: 운영진+ 모두.
- **플랜 변경·결제**: 클랜장만 (목업 카피 "클랜장만 변경." 적용. 운영 시 D-MANAGE-01 결정).
- 운영진(officer)은 본문은 보지만 변경 버튼은 비활성/숨김으로 두는 것을 권장.

## 권한·구독에 따른 차이

자세한 표는 [gating-matrix.md](../gating-matrix.md) §7. 핵심:

| 항목 | leader | officer | member |
|------|:------:|:-------:|:------:|
| 메뉴 진입 | ✓ | ✓ | ✗ |
| 개요 본문 (프로필·공지·규칙·코인) | ✓ | ✓ | ✗ |
| 배너·아이콘 편집 | ✓ | ✓ | ✗ |
| 공지 작성·편집·삭제 | ✓ | ✓ | ✗ |
| 규칙 편집 | ✓ | ✓ | ✗ |
| 가입 요청 승인·거절 | ✓ | ✓ | ✗ |
| 구성원 검색·페이지 | ✓ | ✓ | ✗ |
| 개인 상세 — 역할 변경·강퇴·M점수 | ✓ | ◐ (D-MANAGE-02) | ✗ |
| 구독결제 본문 열람 | ✓ | ✓ | — |
| 플랜 변경·결제 | ✓ | ✗ | — |

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
- 공지·규칙은 `localStorage`에 저장. 실제는 서버 DB.
- 구독 토글은 `localStorage`(`clansync-mock-subscribe-v1`)에 저장. 실제는 결제 연동.
- 배너·아이콘 업로드는 data URL을 `localStorage`에 저장 → 운영 시 스토리지 + URL.
- 개인 상세 모달은 카드 텍스트만 — 운영 액션이 alert 수준.

## 결정 필요
- D-MANAGE-01 구독·결제 탭 접근 권한 (officer 본문 가시 vs 차단)
- D-MANAGE-02 개인 상세에서 역할 변경·M점수 편집의 권한 분리 (leader-only로 좁힐지)
- D-MANAGE-03 부계정 조회 정책 (동의·증빙·차단)
- D-MANAGE-04 배너·아이콘 업로드 용량/형식 제한
- D-CLAN-02 가입 요청 상태 머신 (이 화면이 핵심 소비자)

## 구현 참고 (개발자용)

- 목업 위치: `mockup/pages/main-clan.html` `#view-manage` (5823~5940)
- 탭 전환: `window.mockManageSetTab(btn, 'overview' | 'members' | 'subscribe')`
- 배너·아이콘: `window.mockClanImageModalOpen('banner' | 'icon')`
- 공지: `window.mockClanNoticePostModalOpen(post|null)` + `MOCK_CLAN_NOTICE_POSTS_KEY` localStorage 키
- 규칙: `window.mockClanManageSaveRules`, 키 `MOCK_CLAN_RULES_KEY`
- 구성원 검색: `window.mockManageMembersOnSearch` + `MOCK_MANAGE_MEMBERS`
- 구독: `window.mockManageSubscribeAddMockPayment`, `window.mockManageSubscribeSetPlan('premium' | 'free')`, 키 `clansync-mock-subscribe-v1`
- 운영진+ 표시: `mock-officer-only`, 구성원 안내: `mock-member-only`
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
