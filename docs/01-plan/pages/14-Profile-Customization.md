# 14 Profile Customization · 프로필 / 꾸미기

## 한 줄 요약
사용자 본인의 글로벌 프로필 화면. 게임별 탭에서 네임카드(= 네임플레이트)와 뱃지 케이스를 꾸미고, 클랜 외부에서도 본인 활동을 보여주는 허브.

## 누가 / 언제 본다
- 로그인 사용자 본인.
- 클랜 메인·게임 허브의 사이드바 하단 "프로필", 프로필 메뉴 "마이페이지"에서 진입.

## 화면 진입 조건
- 로그인 필요. 게임 인증·클랜 소속 무관.
- 미로그인 시 `/sign-in`으로 이동.

## 사용자 흐름

```
프로필 진입
    │
    ├─ 요약 영역 (닉·아바타·등급·코인 등)
    │
    ├─ 게임별 탭 ──► 오버워치 / 발로란트 (등록된 게임만)
    │      │
    │      ├─ 네임카드 미리보기 클릭 ──► 네임플레이트 케이스 모달
    │      │
    │      ├─ 뱃지 스트립 클릭 / "뱃지 케이스" ──► 뱃지 케이스 모달
    │      │
    │      └─ 게임별 통계 / 최근 경기 / 가입 클랜
    │
    └─ "가입 신청 대기 목록" (D-PROFILE-02)
```

## 화면 구성

```
[Navbar]   ← 글로벌 nav

[프로필 헤더]
  아바타 · 닉네임 · 등급 · 가입일
  코인 잔액 (개인 풀)
  소속 클랜 칩 (게임별)

[게임 탭]   [오버워치] [발로란트]   ← 등록된 게임만 노출

[네임카드 미리보기]
  엠블럼 + 닉바 + 서브 + 프레임 + 뱃지 5개 스트립
  [네임카드 편집] → 네임플레이트 케이스 모달
  [뱃지 케이스]   → 뱃지 케이스 모달

[게임별 통계]
  내전 출전 / 승률 / 최근 경기 / 베스트 영웅 ...

[가입 신청 대기 목록] (D-PROFILE-02)
  표: 클랜명 / 신청일 / 상태(대기/승인/거절) / [취소]
```

## 모달 1 — 뱃지 케이스 (`#mock-badge-case-modal`)

### 목적
획득한 뱃지를 보고, 그중 **최대 5개**를 픽해 네임카드 스트립에 노출.

### 영역
- 게임별 변형: `data-badge-case-for="ow"`, `data-badge-case-for="val"`
- 상단 카테고리 탭 (게임별로 다름):
  - OW: 전투·승률 / 참여·활동 / 이벤트·시즌 / 클랜·스크림 / ClanSync
  - VAL: 전투·승률 / 참여·활동 / 이벤트·시즌 / 클랜·스크림 / ClanSync
- 본문: 카테고리별 뱃지 그리드.
  - 획득 슬롯 (`mock-badge-case-slot--earned`): 클릭 시 픽/해제. 5개 초과 시 안내 + 차단.
  - 잠금 슬롯: 비활성 + 해금 조건 툴팁 (D-PROFILE-04).
- 하단 액션: 닫기.

### 픽 규칙
- **최대 5개** (`MOCK_BADGE_NAMEPLATE_MAX = 5`).
- 픽 순서대로 네임카드 스트립의 슬롯 5개에 채움 (앞쪽 우선).
- 게임별로 픽이 분리됨 (OW에서 픽한 5개 / VAL에서 픽한 5개 따로).

### 스트립 동기화
- 모달의 픽 변경 → 프로필 카드 스트립 + 메인 클랜 네임카드 + 밸런스 슬롯 네임카드까지 반영 (D-PROFILE-03).

### 권한·구독
- 모든 로그인 사용자 동일.
- 잠금 뱃지 해금 출처(스토어/이벤트/업적)는 D-PROFILE-04.

## 모달 2 — 네임플레이트 케이스 (`#mock-nameplate-case-modal`)

### 목적
네임카드 4요소(엠블럼 / 이름바 / 서브 / 프레임)를 **프리셋만으로** 꾸미기.

### 정책
- **이미지 업로드 미지원**. 서비스 제공 에셋(스토어·이벤트 보상 등)만 사용.
- 클랜 배너·아이콘 같은 클랜 단위 꾸미기와 별도.

### 영역
- 게임별 변형: `data-nameplate-case-for="ow"`, `data-nameplate-case-for="val"`
- 상단 탭: 엠블럼 / 이름바 / 서브 / 프레임
- 각 탭: 옵션 그리드. 한 탭 안에서는 단일 선택.

### 적용 범위
- 선택 즉시 프로필 미리보기 반영.
- 메인 클랜 화면의 네임카드, 밸런스 슬롯에도 동기화 (D-PROFILE-01에서 셀렉터·이벤트 규약 확정).

### 권한·구독
- 모든 로그인 사용자 동일. 보유 옵션은 사용자별로 다름.

## 가입 신청 대기 목록 (D-PROFILE-02)

### 카드/표
| 컬럼 | 설명 |
|------|------|
| 클랜명 | 신청한 클랜 |
| 게임 | 어떤 게임의 클랜인지 |
| 신청일 | 신청 접수 일시 |
| 상태 | 대기 / 승인 / 거절 |
| 액션 | 대기 중일 때 "취소" 가능 |

데이터 출처·취소 액션은 D-PROFILE-02에서 확정.

## 권한·구독에 따른 차이

자세한 표는 [gating-matrix.md](../gating-matrix.md) §10. 핵심:

| 항목 | 본인 | 게스트 |
|------|:----:|:------:|
| 요약·게임별 탭 열람 | ✓ | ✗ |
| 뱃지 케이스 모달 | ✓ | ✗ |
| 네임플레이트 케이스 모달 | ✓ | ✗ |
| 가입 신청 대기 목록 | ✓ | ✗ |

(클랜장/운영진/구성원에 따른 차이는 없음. 본인 프로필이므로 권한 분기 X.)

## 데이터·연동

### 게임 키
- `ow` (오버워치), `val` (발로란트) 등.
- 사용자가 인증한 게임만 탭으로 노출.

### 뱃지 픽 (게임별)
- 키 예: `mockBadgeCaseGetPicks(game)` → string[] (최대 5).
- 운영 시 사용자 테이블에 `(user_id, game, badge_id, slot_index)` 또는 동등.

### 네임플레이트 옵션 (게임별)
- 카테고리 4종(emblem/namebar/sub/frame) × 옵션 ID.
- 운영 시 사용자별 보유 옵션 + 현재 선택을 저장.

### 메타 매핑
- 네임플레이트 옵션 → 미리보기 라벨/아이콘 매핑은 `MOCK_NAMEPLATE_META`.

### 동기화 셀렉터
- `data-nameplate-preview` 등 셀렉터로 외부 화면(메인 클랜·밸런스)이 같은 데이터를 구독.
- D-PROFILE-01에서 공통 이벤트·셀렉터 규약 확정.

## 목업과 실제 구현의 차이
- 픽·옵션은 클라이언트에서 계산만. 영속 저장은 일부 `localStorage`.
- 잠금 뱃지의 해금 조건 툴팁이 일부 비어 있음 (D-PROFILE-04).
- "가입 신청 대기 목록"은 마크업도 정적 — D-PROFILE-02에서 데이터 출처 결정.
- 메인 클랜·밸런스 슬롯의 네임플레이트는 "프리셋만" 정책을 따라야 함 (BalanceMaker 문서와 일치).

## 결정 필요
- D-PROFILE-01 프로필 ↔ 메인 클랜 ↔ 밸런스 슬롯의 네임플레이트 동기화 셀렉터·이벤트 규약
- D-PROFILE-02 가입 신청 대기 목록의 데이터 출처·취소 액션
- D-PROFILE-03 뱃지 케이스 픽 ↔ 메인 카드 스트립 동기화
- D-PROFILE-04 뱃지 해금 출처 (스토어 / 업적 / 이벤트) 정의

## 구현 참고 (개발자용)

- 목업 파일: `mockup/pages/profile.html`
- 모달 partial:
  - `mockup/partials/badge-case-modal.html`
  - `mockup/partials/nameplate-case-modal.html`
  - `mockup/partials/player-profile-modal.html` (글로벌 미리보기 모달)
- 핵심 함수 (`mockup/scripts/app.js`):
  - 뱃지: `mockBadgeCaseModalOpen(game)`, `mockBadgeCaseModalClose`, `mockBadgeCaseTab`, `mockBadgeCaseTogglePick`, `mockBadgeCaseGetPicks(game)`
  - 네임플레이트: `mockNameplateCaseModalOpen(game)`, `mockNameplateCaseTab`, `mockNameplateCaseSelect`
  - 프로필 모달: `mockPlayerProfileModalOpen()` — partial fetch 실패 시 `/profile`로 이동
- 상수: `MOCK_BADGE_NAMEPLATE_MAX = 5`, `MOCK_NAMEPLATE_META`
- 네임플레이트 외부 동기화 셀렉터: `data-nameplate-preview` (현재는 단순 셀렉터, D-PROFILE-01에서 확장)

## 연관 문서
- [pages.md](../pages.md)
- [slices/slice-08-player-profile-decorations.md](../slices/slice-08-player-profile-decorations.md)
- [09-BalanceMaker.md](./09-BalanceMaker.md) (네임플레이트·뱃지를 경기 화면에 표시)
- [13-Clan-Store.md](./13-Clan-Store.md) (꾸미기 아이템 구매 출처)
- [decisions.md](../decisions.md) (D-PROFILE-01~04)
- [gating-matrix.md](../gating-matrix.md) §10
- [BACKLOG.md](../BACKLOG.md) (가입 신청 대기 목록 → D-PROFILE-02로 흡수)
