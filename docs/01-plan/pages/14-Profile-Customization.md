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

### 스트립 동기화 (D-PROFILE-03 — DECIDED)
- **compact 5슬롯** (dense-from-front). 앞쪽부터 연속해서 채우고, 해제 시 **뒷 항목이 앞으로 shift**되어 빈 슬롯은 항상 뒤쪽에 몰린다.
- 모달의 픽 변경 → `localStorage["clansync-mock-badge-picks-v1"]` 저장 + `window.dispatchEvent(new CustomEvent('clansync:badge:picks:changed', { detail: { game, picks } }))`.
- 구독자(프로필 카드 스트립 + 메인 클랜 구성원 본인 행 + BalanceMaker 본인 슬롯)는 `[data-badge-strip="{game}"][data-badge-strip-self]` 컨테이너에서 이벤트를 수신해 `[data-badge-strip-slot="0..4"]`를 다시 렌더.
- 운영 시 `user_badge_picks(user_id, game_id, slot_index, badge_id)` UPSERT + **해제·재배치 시 slot_index를 0..(n-1)로 재할당**(트랜잭션) + RLS(같은 클랜 구성원 SELECT 공개).
- [decisions.md §D-PROFILE-03](../decisions.md#d-profile-03--뱃지-케이스--프로필-스트립-동기화) 참조.

### 권한·구독
- 모든 로그인 사용자 동일.
- 잠금 뱃지 해금 출처는 D-PROFILE-04에서 `achievement` / `event` / `store` 3종으로 확정. store는 **개인 코인만** 사용 가능.

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

### 적용 범위 (D-PROFILE-01 — DECIDED)
- 선택 즉시 프로필 미리보기 반영.
- `localStorage["clansync-mock-nameplate-state-v1"]` 저장 + `window.dispatchEvent(new CustomEvent('clansync:nameplate:changed', { detail: { game, state } }))`.
- 구독자(메인 클랜 구성원 본인 행 네임카드 + BalanceMaker 본인 매치 슬롯)는 `[data-nameplate-preview="{game}"][data-nameplate-self]` 요소에서 이벤트 수신 → `mockNameplateApplyPreview(game)` 재호출.
- **같은 탭 내부만 즉시 반영** — 다른 탭/창은 새 진입·새로고침 시 localStorage에서 재로드.
- [decisions.md §D-PROFILE-01](../decisions.md#d-profile-01--네임플레이트-동기화-규약) 참조.

### 권한·구독
- 모든 로그인 사용자 동일. 보유 옵션은 사용자별로 다름 — 운영 시 `user_nameplate_inventory` 기반으로 모달 옵션 disable 처리.

## 가입 신청 대기 목록 (D-PROFILE-02 — DECIDED)

### 데이터 출처
- 단일 소스: `clan_join_requests` (D-CLAN-02).
- 필터: `user_id = me AND (status='pending' OR (status IN ('approved','rejected') AND resolved_at > now() - interval '7 days'))`.
- 정렬: `created_at DESC`.
- **canceled / expired 는 목록에 노출하지 않는다** (감사 로그에만 남음).

### 카드/표
| 컬럼 | 설명 |
|------|------|
| 클랜명 | 신청한 클랜 (클릭 시 클랜 소개) |
| 게임 | 어떤 게임의 클랜인지 (`ow`/`val`) |
| 신청일 | `created_at` 기준 |
| 상태 | pending → "심사 대기" · approved → "승인됨" · rejected → "거절됨" |
| 액션 | pending: **[취소]** 버튼 · approved: "[클랜으로 이동]" · rejected: 액션 없음 |

### 취소 액션
- pending 일 때만 활성. 클릭 → confirm 다이얼로그("신청을 취소하시겠어요?") → `UPDATE clan_join_requests SET status='canceled', resolved_by='self', resolved_at=now() WHERE id=? AND user_id=auth.uid() AND status='pending'`.
- D-CLAN-02 상태 머신과 동일(pending에서만 canceled로 전이).
- 성공 시 즉시 행 제거.

### 제약
- 게임당 pending 신청은 **1건** (D-CLAN-02). pending 행은 최대 등록 게임 수만큼.
- 재신청은 **24시간 쿨다운** (D-CLAN-02).

[decisions.md §D-PROFILE-02](../decisions.md#d-profile-02--가입-신청-대기-목록-데이터-출처)

## 게임별 탭 — 부계정 (D-MANAGE-03)

### 목적
같은 게임의 부계정(2nd account, 알트, 스머프)을 **자기신고**로 등록해 내전·랭크 히스토리가 뒤섞이지 않도록 안내한다. 증빙 API는 현 단계에서 구축하지 않으며, 클랜 운영 시 분쟁 방지 목적으로 사용한다.

### 영역
- 게임별 탭 내부에 "부계정" 카드 (해당 게임에 `user_game_profiles.is_verified = true` 일 때만 노출).
- 리스트: 등록된 부계정 닉 + 메모 + 삭제 버튼.
- 하단 액션: "+ 부계정 추가" 버튼.

### 모달 — 부계정 추가

입력
- 부계정 닉(배틀태그 등) · 메모(선택).

**고지 (중요 · D-MANAGE-03)**

모달 본문에는 다음 안내가 항상 표시된다:

> "등록한 부계정은 자기신고입니다. **클랜에 소속되어 있는 경우**, 해당 클랜의 설정에 따라 **운영진 또는 클랜 전체 구성원에게 공개될 수 있습니다**. 공개 범위는 클랜 관리 → 개요 → '운영 권한 설정'에서 확인할 수 있습니다."

- 하단 체크박스: "위 내용에 동의합니다." — 체크해야 추가 버튼 활성화.
- 추가 버튼 클릭 시 `user_alt_accounts` 에 INSERT.

### 공개 범위 요약 (본인 기준)

| 토글 값 | 본인 | 같은 클랜 운영진+ | 같은 클랜 구성원 | 타 클랜 / 비소속 |
|---------|:----:|:----------------:|:----------------:|:---------------:|
| `officers` (기본) | ✓ | ✓ | ✗ | ✗ |
| `clan_members` (클랜장이 전환 시) | ✓ | ✓ | ✓ | ✗ |

- 토글은 **클랜 설정**이며 본인이 직접 조작하지 않는다. 현재 소속 클랜의 토글 상태는 프로필 카드 한 줄로 표시: "현재 이 게임의 소속 클랜 '{clan_name}'에서는 부계정이 **{운영진만 / 클랜 전체}** 볼 수 있습니다."
- 비소속 사용자가 추가하는 부계정은 타인에게 공개되지 않는다(본인만 조회).

### 삭제
- 언제든 본인이 삭제 가능. 삭제 시 운영진 화면에서 즉시 사라진다. 감사 로그에는 "삭제됨" 스텁만 남는다.

### 신고·차단
- 부계정으로 발생한 매너 이슈(도배·어뷰징)는 [클랜 신고 흐름(D-CLAN-03)](../decisions.md#d-clan-03--클랜-라이프사이클--정책-위반휴면부실-처리)에 흡수한다. 별도 부계정 신고 API는 만들지 않는다.

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

### 뱃지 픽 (게임별, D-PROFILE-03)
- 목업: `mockBadgeCaseGetPicks()` → `{ ow: [id, id, …, null, null], val: [...] }` — **compact(dense-from-front)**, 길이 5, 빈 슬롯은 반드시 뒤쪽.
- 영속: `localStorage["clansync-mock-badge-picks-v1"]`. `mockBadgeEnsureCompactArray()`가 로드·저장 시 중간 null·중복을 자동 정규화.
- 이벤트: `clansync:badge:picks:changed` (`detail: { game, picks }`).
- 운영: `user_badge_picks(user_id, game_id, slot_index, badge_id)` + `UNIQUE(user_id, game_id, slot_index)`. 해제·재배치 시 slot_index 재할당(트랜잭션), 빈 슬롯에 해당하는 행은 DELETE.

### 뱃지 카탈로그·해금 (D-PROFILE-04)
- `badges(game_id, category, unlock_source, unlock_condition jsonb, linked_id)`.
- `user_badge_unlocks(user_id, badge_id)` — 해금 이력. 해금은 영구(환불 없음).
- store 출처 뱃지는 `unlock_condition.coin_type = 'personal'` 고정 — 개인 코인만.
- 잠금 뱃지 툴팁은 `unlock_source`에 따라 다른 카피 (achievement "진행도 x/y" · event "{end_date}까지" · store "{price} 개인 코인").

### 네임플레이트 옵션 (게임별, D-PROFILE-01)
- 카테고리 4종(`emblem`/`namebar`/`sub`/`frame`) × 옵션 ID.
- 영속: `localStorage["clansync-mock-nameplate-state-v1"]`.
- 이벤트: `clansync:nameplate:changed` (`detail: { game, state }`).
- 운영: `nameplate_options` 카탈로그 + `user_nameplate_inventory` 보유 + `user_nameplate_selections` 현재 선택.

### 메타 매핑
- 네임플레이트 옵션 → 미리보기 라벨/아이콘 매핑은 `MOCK_NAMEPLATE_META`.

### 동기화 셀렉터 (D-PROFILE-01·03)
| 용도 | 셀렉터 | 비고 |
|------|--------|------|
| 네임플레이트 프리뷰 | `[data-nameplate-preview="{game}"]` | 기존. 전체 구독자 |
| 본인 네임플레이트 구독 | `[data-nameplate-preview="{game}"][data-nameplate-self]` | MainClan 본인 행·BalanceMaker 본인 슬롯에만 부여 |
| 뱃지 스트립 컨테이너 | `[data-badge-strip="{game}"]` | 신규 |
| 뱃지 스트립 슬롯 | `[data-badge-strip-slot="{0..4}"]` | compact, 앞쪽부터 연속 채움 — 빈 슬롯은 뒤쪽 |
| 본인 뱃지 구독 | `[data-badge-strip="{game}"][data-badge-strip-self]` | 본인 구독자만 |

## 목업과 실제 구현의 차이
- 픽·옵션은 클라이언트에서 계산 + `localStorage` 영속. 새 탭/창에는 즉시 전파되지 않음(D-PROFILE-01 `self_only`).
- 잠금 뱃지의 `unlock_source`별 툴팁 카피는 Phase 2+에서 실제 진행도·이벤트 기간·가격으로 채워짐. 목업은 정적 문구.
- "가입 신청 대기 목록"은 목업에서 `clan_join_requests` 시뮬레이션(버튼·상태 뱃지 동작만). 운영 시 D-CLAN-02의 상태 머신 직결.
- 메인 클랜·밸런스 슬롯의 네임플레이트는 "프리셋만" 정책을 따라야 함 (BalanceMaker 문서와 일치).
- 네임플레이트·뱃지 동기화: 같은 탭 내부만 즉시 반영. BroadcastChannel/storage 이벤트는 도입하지 않음.

## 결정 필요
- ~~D-PROFILE-01 프로필 ↔ 메인 클랜 ↔ 밸런스 슬롯의 네임플레이트 동기화 셀렉터·이벤트 규약~~ (DECIDED 2026-04-20 — `[data-nameplate-preview]` + `data-nameplate-self` + `clansync:nameplate:changed`. [§D-PROFILE-01](../decisions.md#d-profile-01--네임플레이트-동기화-규약))
- ~~D-PROFILE-02 가입 신청 대기 목록의 데이터 출처·취소 액션~~ (DECIDED 2026-04-20 — `clan_join_requests` 단일 소스, 7일 자동 숨김, pending만 취소 가능. [§D-PROFILE-02](../decisions.md#d-profile-02--가입-신청-대기-목록-데이터-출처))
- ~~D-PROFILE-03 뱃지 케이스 픽 ↔ 메인 카드 스트립 동기화~~ (DECIDED 2026-04-20 — **compact** 5슬롯(dense-from-front), `[data-badge-strip]` + `clansync:badge:picks:changed`. [§D-PROFILE-03](../decisions.md#d-profile-03--뱃지-케이스--프로필-스트립-동기화))
- ~~D-PROFILE-04 뱃지 해금 출처 (스토어 / 업적 / 이벤트) 정의~~ (DECIDED 2026-04-20 — `unlock_source enum`·store는 개인 코인만. [§D-PROFILE-04](../decisions.md#d-profile-04--뱃지-해금-출처))
- ~~D-MANAGE-03 부계정 공개 범위~~ — **D-PERM-01 흡수 (2026-04-21)** — 권한 키 `view_alt_accounts`(개인 정보 카테고리), **기본 ✓/✓/✓**(leader·officer·member). D-PRIV-01 프리셋 α는 통계 5키만 오버라이드 대상이며 **부계정(`view_alt_accounts`)은 제외**(운영·신뢰 근거는 [§D-PRIV-01](../decisions.md#d-priv-01--개인-단위-프라이버시-오버라이드-프리셋-α)). 프로필에 부계정 추가 시 고지·동의 체크박스는 기존과 동일.

## 구현 참고 (개발자용)

- 목업 파일: `mockup/pages/profile.html`
- 모달 partial:
  - `mockup/partials/badge-case-modal.html`
  - `mockup/partials/nameplate-case-modal.html`
  - `mockup/partials/player-profile-modal.html` (글로벌 미리보기 모달)
- 핵심 함수 (`mockup/scripts/app.js`):
  - 뱃지: `mockBadgeCaseModalOpen(game)`, `mockBadgeCaseModalClose`, `mockBadgeCaseTab`, `mockBadgeCaseTogglePick`, `mockBadgeCaseGetPicks()`
  - 네임플레이트: `mockNameplateCaseModalOpen(game)`, `mockNameplateCaseTab`, `mockNameplateCaseSelect`, `mockNameplateGetState()`, `mockNameplateApplyPreview(game)`
  - **영속화·외부 구독**: `mockBadgeRestoreFromStorage()`, `mockBadgeSaveToStorage()`, `mockBadgeDispatchChange(game)`, `mockNameplateRestoreFromStorage()`, `mockNameplateSaveToStorage()`, `mockNameplateDispatchChange(game)`, `mockBindExternalProfileSync()` (MainClan·BalanceMaker 페이지 로드 시 구독 바인딩)
  - 프로필 모달: `mockPlayerProfileModalOpen()` — partial fetch 실패 시 `/profile`로 이동
- 상수: `MOCK_BADGE_NAMEPLATE_MAX = 5`, `MOCK_NAMEPLATE_META`
- localStorage 키: `clansync-mock-nameplate-state-v1`, `clansync-mock-badge-picks-v1`
- 커스텀 이벤트: `clansync:nameplate:changed`, `clansync:badge:picks:changed`
- 동기화 셀렉터: `[data-nameplate-preview]`, `[data-nameplate-self]`, `[data-badge-strip]`, `[data-badge-strip-slot]`, `[data-badge-strip-self]`

## 연관 문서
- [pages.md](../pages.md)
- [slices/slice-08-player-profile-decorations.md](../slices/slice-08-player-profile-decorations.md)
- [09-BalanceMaker.md](./09-BalanceMaker.md) (네임플레이트·뱃지를 경기 화면에 표시)
- [13-Clan-Store.md](./13-Clan-Store.md) (꾸미기 아이템 구매 출처)
- [decisions.md](../decisions.md) (D-PROFILE-01~04, D-MANAGE-03 → D-PERM-01 `view_alt_accounts`, D-PRIV-01)
- [gating-matrix.md](../gating-matrix.md) §10
- [BACKLOG.md](../BACKLOG.md) (가입 신청 대기 목록 → D-PROFILE-02로 흡수)
