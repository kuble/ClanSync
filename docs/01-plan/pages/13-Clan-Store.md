# 13 Clan Store · 클랜 스토어

> **D-STORE-01 / D-ECON-01 / D-ECON-02** (DECIDED 2026-04-20) — 코인 트리거 매트릭스·Phase 1 수치 베이스라인·세탁 방지 정책 확정. [decisions.md §D-STORE-01](../decisions.md#d-store-01--코인-적립차감-트리거-매트릭스) · [§D-ECON-01](../decisions.md#d-econ-01--코인-수치-베이스라인) · [§D-ECON-02](../decisions.md#d-econ-02--코인-세탁-방지-정책).  
> **D-STORE-02 / D-STORE-03** (DECIDED 2026-04-20) — Premium 카드 클릭은 **플랜 비교 모달**(요청 플로우 없음). 구매는 **환불 없음 원칙**(시스템 오류 자동 롤백 + 운영자 재량 정정만 예외). [§D-STORE-02](../decisions.md#d-store-02--premium-잠금-카드의-업그레이드-안내-동선) · [§D-STORE-03](../decisions.md#d-store-03--환불되돌리기-정책).

## 한 줄 요약
클랜 코인으로 클랜·개인 꾸미기 아이템을 사는 화면. 클랜 풀 / 개인 풀 두 종류의 잔액과 클랜 꾸미기 / 개인 꾸미기 두 탭으로 구성된다. **두 풀은 이전 불가** — 각 풀은 정해진 트리거로만 유입되고, 정해진 카탈로그로만 소비된다 (D-ECON-02).

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

### 카드 (예시, D-ECON-01 확정 가격)
| 이름 | 분류 | 가격 | Premium |
|------|------|------|---------|
| 클랜 홈 배너 스타일 팩 | clan_deco | 1,200 | — |
| 홍보글 상단 고정 7일 | clan_deco | 800 | — |
| 클랜 태그 글로우 | clan_deco | 2,000 | ✓ (Free 비활성) |
| 대진표 개최 | (기능) | 500 | — |

### 권한
- 클랜 풀 차감은 **운영진+ 전용** (leader·officer). 일반 구성원은 버튼 비활성 (D-STORE-01).
- 1회 500 이상 클랜 풀 지출은 **2-man rule** 추가 승인 필요 (D-ECON-02, Phase 2+).
- 클랜장 교체 직후 **72시간 클랜 풀 지출 동결**(에스크로, D-ECON-02).

### Free / Premium 분기 (D-STORE-02)
- Premium 카드는 Free 플랜에서 회색 비활성 + "Premium" 라벨. 클릭 시 **플랜 비교 모달**(요청 플로우·알림 없음).
- 역할별 모달 CTA:
  - **leader / officer**: "플랜 비교 보기" + **"구독·결제 탭으로 이동"** 보조 CTA (officer는 열람 전용, 플랜 변경은 leader).
  - **member**: 정보 표시만. CTA 카피는 "**Premium 전용 항목입니다. 클랜장에게 문의하세요.**" — 알림·요청 버튼 없음.
- 모달 본문은 Free vs Premium 혜택 요약표(자동 밸런스·A 점수·맵 밴·디스코드 알림·대진표·승부예측·태그 글로우). 가격 표기는 Phase 2+.

## 탭 2 — 개인 꾸미기

### 활성 풀
- **개인 풀** (잔액에서 차감).

### 게임 필터
- 칩: 공통 / 오버워치 / 발로란트.
- 카드의 `data-store-item-game` 속성과 일치할 때만 표시.

### 카드 (예시, D-ECON-01 확정 가격)
| 이름 | 게임 | 분류 | 가격 | Premium |
|------|------|------|------|---------|
| 네임카드 테마 팩 | OW | profile_deco | 400 | — |
| 뱃지 슬롯 테두리 | VAL | profile_deco | 600 | — |
| 네임플레이트 서브 라인 팩 | 공통 | profile_deco | 500 | — |
| store 뱃지 (일반) | 공통·게임별 | profile_deco | 500 | — |
| store 뱃지 (레어) | 공통·게임별 | profile_deco | 1,200 | — |
| 승부예측 코인 보너스 | 공통 | premium_bonus | 1,500 | ✓ (Free 비활성) |

> store 출처 뱃지는 D-PROFILE-04에 따라 **개인 코인만**으로 구매 가능. 클랜 코인으로는 뱃지를 살 수 없다.

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

### 잔액 (D-STORE-01)
- **클랜 풀**: `clans.coin_balance` (원장 `coin_transactions WHERE pool_type='clan'` 합계의 캐시).
- **개인 풀**: `users.coin_balance` (원장 `coin_transactions WHERE pool_type='personal'` 합계의 캐시).
- 표시는 천 단위 콤마, 통화 표기 없음 (현금 거래 X).
- `CHECK (coin_balance >= 0)` — 음수 불가, 차감 시 트랜잭션 내 검증.

### 적립 트리거 매트릭스 (D-STORE-01)

| 풀 | 트리거 | 금액 (D-ECON-01) | 멱등성 키 |
|----|--------|------:|-----------|
| personal | 내전 출전 | +10 | `(match_id, user_id, 'enter')` |
| personal | 내전 승리 | +20 | `(match_id, user_id, 'win')` |
| personal | 내전 MVP | +30 | `(match_id, user_id, 'mvp')` |
| personal | 일일 출석 | +5 | `(user_id, date)` |
| personal | 7일 연속 출석 | +30 | `(user_id, streak_week_start)` |
| personal | 이벤트 미션 | +50~+200 | `(event_id, user_id, mission_key)` |
| clan | 스크림 완료 (양측) | +100 | `(scrim_room_id, clan_id)` |
| clan | 대진표 참가 | +200 | `(tournament_id, clan_id, 'entry')` |
| clan | 대진표 우승 | +1,000 | `(tournament_id, clan_id, 'winner')` |
| clan | 신규 가입자 (월 상한 500) | +50 / 명 | `(clan_id, member_id)` |
| clan | Premium 월간 보너스 | +500 | `(clan_id, yyyymm)` |

- **일일 적립 상한**: 개인 200 / 클랜 2,000 (이벤트 제외, 24h 롤링).
- **풀 간 이전 금지**: 개인 ↔ 클랜 API 부재 (D-ECON-02).
- 거래 로그 `coin_transactions` (user / clan / pool / amount / reason / reference / sub_key / balance_after / correction_of).

### 차감 트리거
- 개인 풀: 개인 꾸미기 구매 + store 뱃지 구매 (D-PROFILE-04).
- 클랜 풀: 클랜 꾸미기 구매 + 홍보글 상단 고정 (`board_posts.is_pinned`) + 대진표 개최.
- 카드 구매는 `purchases` 레코드 + `coin_transactions` 차감을 **한 트랜잭션**으로 INSERT. `purchases.coin_transaction_id` UNIQUE로 1:1 연결.

### 세탁 방지 (D-ECON-02)
- `coin_transactions` **INSERT-only** (RLS로 UPDATE/DELETE 차단). 정정은 `correction_of` 로 연결된 반대 부호 거래로만.
- 클랜 풀 1회 500 이상 지출은 2-man rule (Phase 2+) · `purchases.approved_by` 기록.
- 클랜장 교체 후 72h `clans.ownership_transferred_at` 기준 클랜 풀 지출 동결.

### 환불·되돌리기 정책 (D-STORE-03)
- **환불 없음 원칙**. 모든 구매는 즉시 영구 적용. 사용자 UI에 환불 버튼을 제공하지 않는다.
- **예외 1 · 시스템 오류 자동 롤백**: 구매 트랜잭션 장애·중복 웹훅·가격 오표기 등 기술적 오류는 서비스가 자동 정정(`reason='system_rollback'` · `correction_of` 연결).
- **예외 2 · 운영자 재량 정정**: 계정 탈취 증명·아이템 기능 결함·정책 위반 구매 확인 등. 운영자가 **반대 부호 `coin_transactions`** INSERT + `purchases.voided_at`·`voided_by`·`void_reason` 업데이트. **자기 계정 정정 금지**(`voided_by ≠ user_id`).
- 사용자 귀책("실수로 샀어요"·"마음이 바뀌었어요")은 일관 거절. 정책 카피로 대응.
- 월별 정정 리포트(Phase 2+) — 운영자 투명성.
- 구매 확인 다이얼로그에 **"환불은 지원되지 않습니다"** 고지 의무.

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
- ~~D-STORE-01 클랜 코인·개인 코인의 적립/차감 트리거 매트릭스~~ — **DECIDED 2026-04-20**. §데이터·연동 참고.
- ~~D-STORE-02 Premium 잠금 카드의 업그레이드 안내 동선~~ — **DECIDED 2026-04-20**. §Free / Premium 분기 참고.
- ~~D-STORE-03 구매 후 환불·되돌리기 정책~~ — **DECIDED 2026-04-20**. §환불·되돌리기 정책 참고.
- ~~(보강) 구성원의 클랜 풀 구매 가능 여부~~ — **결론**: D-STORE-01로 운영진+ 전용 확정. 일반 구성원 구매 버튼 비활성.

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
- [decisions.md](../decisions.md) (D-STORE-01/02/03 · D-ECON-01/02 DECIDED)
- [gating-matrix.md](../gating-matrix.md) §8
