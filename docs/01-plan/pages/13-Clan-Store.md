# 13 Clan Store · 클랜 스토어

## 한 줄 요약
클랜 코인으로 클랜·개인 꾸미기 아이템을 사는 화면. 클랜 풀 / 개인 풀 두 종류의 잔액과 클랜 꾸미기 / 개인 꾸미기 두 탭으로 구성된다.

## 누가 / 언제 본다
- 클랜 소속 사용자 전원.
- 클랜 활동 보상으로 받은 코인을 쓰거나, 잔액을 확인할 때.

## 화면 진입 조건
- 클랜 메인 진입 조건과 동일.
- 클랜 메인 사이드바 `#store` 또는 직접 해시.

## 사용자 흐름

```
스토어 진입 (클랜 꾸미기 탭 기본)
    │
    ├─ 잔액 확인 (클랜 풀 + 개인 풀 두 칩)
    │
    ├─ 클랜 꾸미기 탭 ──► 카드 그리드
    │     · "구매" → 잔액 차감 + 보유 표시 (D-STORE-01)
    │     · Premium 잠금 카드는 비활성 + "Premium" 라벨
    │
    └─ 개인 꾸미기 탭 ──► 게임 필터 (공통 / OW / VAL) + 카드 그리드
          · "개인 프로필 열기" 버튼 → 플레이어 프로필 모달
          · 카드 구매 → 개인 풀에서 차감
```

## 화면 구성

```
H1 "클랜 스토어"
부제 "클랜 풀·개인 풀 분리 · 탭마다 사용 코인이 다릅니다 · 천 단위 콤마 목업. 현금 거래 없음."

[정책 안내 박스 — 점선 카드]
  꾸미기 정책: 프로필·밸런스 네임카드 등 개인 꾸미기는
  서비스 제공 에셋(스토어·이벤트 등)만 사용. 이미지 업로드 X.

[관리 분리 안내]
  클랜 배너·클랜 아이콘 업로드·교체는 클랜 관리 메뉴에서.

[잔액 행]
  (클랜 풀 15,400)   (개인 풀 3,200)   ← 활성 풀에 강조

[탭] [클랜 꾸미기] [개인 꾸미기]
```

## 탭 1 — 클랜 꾸미기

### 활성 풀
- **클랜 풀** (잔액에서 차감).

### 카드 (예시)
| 이름 | 분류 | 가격 | Premium |
|------|------|------|---------|
| 클랜 홈 배너 스타일 팩 | clan_deco | 1,200 | — |
| 홍보글 상단 고정 7일 | clan_deco | 800 | — |
| 클랜 태그 글로우 | clan_deco | 2,000 | ✓ (Free 비활성) |

### 권한
- 클랜 풀 차감은 운영진+ 액션 (D-STORE-01에서 확정).
- 구성원이 클랜 풀 항목을 구매할 수 있는지: 운영 정책으로 결정.

### Free / Premium 분기
- Premium 카드는 Free 플랜에서 회색 비활성 + "Premium" 라벨. 클릭 시 업그레이드 안내 동선 (D-STORE-02).

## 탭 2 — 개인 꾸미기

### 활성 풀
- **개인 풀** (잔액에서 차감).

### 게임 필터
- 칩: 공통 / 오버워치 / 발로란트.
- 카드의 `data-store-item-game` 속성과 일치할 때만 표시.

### 카드 (예시)
| 이름 | 게임 | 분류 | 가격 | Premium |
|------|------|------|------|---------|
| 네임카드·밸런스 슬롯 테마 팩 | OW | profile_deco | 400 | — |
| 대표 뱃지 슬롯 테두리 | VAL | profile_deco | 600 | — |
| 네임플레이트 서브 라인 팩 | 공통 | profile_deco | 500 | — |
| 승부예측 코인 보너스 | 공통 | premium_bonus | 1,500 | ✓ (Free 비활성) |

### 액션
- 카드 "구매" → 개인 풀에서 차감 (D-STORE-01).
- 우상단 "개인 프로필 열기" → 플레이어 프로필 모달.

## 모달
- 별도 모달 없음. (구매 결과는 토스트 또는 카드 상태 변경)
- "개인 프로필 열기"는 글로벌 프로필 모달 재사용 (`mockPlayerProfileModalOpen`).

## 권한·구독에 따른 차이

자세한 표는 [gating-matrix.md](../gating-matrix.md) §8. 핵심:

| 항목 | leader | officer | member | free | premium |
|------|:------:|:-------:|:------:|:----:|:-------:|
| 잔액 열람 (클랜 풀·개인 풀) | ✓ | ✓ | ✓ | — | — |
| 클랜 꾸미기 구매 | ✓ | ✓ | ◐ (D-STORE 결정) | — | — |
| 클랜 태그 글로우 (Premium 카드) | ✓ | ✓ | ✗ | 🔒 | ✓ |
| 개인 꾸미기 구매 | ✓ | ✓ | ✓ | — | — |
| 승부예측 코인 보너스 | ✓ | ✓ | ✓ | 🔒 | ✓ |

## 데이터·연동

### 잔액
- **클랜 풀**: `clans.coin_balance` (또는 동등 컬럼).
- **개인 풀**: `users.coin_balance`.
- 표시는 천 단위 콤마, 통화 표기 없음 (현금 거래 X).

### 적립·차감 (D-STORE-01)
- 적립 트리거 후보:
  - 밸런스 결과 등록 (출전 보너스)
  - 승부예측 적중
  - 이벤트 / 출석
  - 클랜 보상 (대진표 우승 등 — D-EVENTS-05와 연동)
- 차감 트리거: 카드 구매.
- 거래 로그 `coin_transactions` (사용자 / 클랜 / 시점 / 사유 / 금액 / 잔액 스냅샷).

### 보유 / 적용
- 구매한 꾸미기 아이템은 보유 인벤토리에 추가.
- 적용은 프로필(개인 꾸미기) 또는 클랜 관리(클랜 꾸미기 일부)에서 수행 (스토어에서 직접 적용 안 함).

## 목업과 실제 구현의 차이
- 잔액은 정적 표시. 구매 시 차감 없음.
- 카드 "구매" 클릭 시 alert만.
- Premium 카드 잠금 안내 후 업그레이드 동선 미연결 (D-STORE-02).
- 게임 필터는 클라이언트 필터만 (서버 데이터 없음).
- "개인 프로필 열기"는 partial fetch 모달 — 운영 시 동일 컴포넌트 재사용.

## 결정 필요
- D-STORE-01 클랜 코인·개인 코인의 적립/차감 트리거 매트릭스
- D-STORE-02 Premium 잠금 카드의 업그레이드 안내 동선
- D-STORE-03 구매 후 환불·되돌리기 정책
- (보강) 구성원의 클랜 풀 구매 가능 여부

## 구현 참고 (개발자용)

- 목업 위치: `mockup/pages/main-clan.html` `#view-store` (5942~6022)
- 탭 전환: `mockStoreSetTab(btn, 'clan' | 'personal')`
- 게임 필터: `mockStoreSetGameFilter(btn, 'all' | 'ow' | 'val')`
- 구매: `mockStorePurchaseMock(btn)` (alert만)
- 잔액 행: `[data-store-balance-row][data-active-pool="clan"|"personal"]`
- 카드 데이터 속성: `data-store-title`, `data-store-item-game`, `data-store-tag`
- Premium 잠금 카드: `.mock-store-card.pro` + 비활성 버튼
- 정책 카피 영역: `.mock-store-policy-note`, `.mock-store-policy-sep`
- 잔액 표시 클래스: `.coin-amount`

## 연관 문서
- [pages.md](../pages.md)
- [slices/slice-06-events-manage-store.md](../slices/slice-06-events-manage-store.md)
- [schema.md](../schema.md) (`coin_transactions`, `clans`, `users`)
- [12-Clan-Manage.md](./12-Clan-Manage.md) (클랜 풀 잔액 표시 일관성)
- [14-Profile-Customization.md](./14-Profile-Customization.md) (구매한 개인 꾸미기 적용)
- [decisions.md](../decisions.md) (D-STORE-01~03)
- [gating-matrix.md](../gating-matrix.md) §8
