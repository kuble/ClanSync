# 14 Profile Customization · 프로필 / 꾸미기

## 한 줄 요약
글로벌 프로필을 3D 미니룸과 본인 전용 계정 정보로 나눈다. 다른 로그인 플레이어는 공개한 방과 선택한 소개 정보만 방문한다.

## 2026-10-23 — 개인 엠블럼 케이스

- 본인 프로필에서 활성 게임·클랜별 대표3칸과 보기 링크로 개인 엠블럼 전용 케이스 페이지를 연다. 클랜 배지 페이지와 동일한 분류·명판·진열과 핀별 상세 창을 사용한다. 클랜을 섞어 집계하지 않으며 클랜 개인 기록과 같은 케이스·조회 권한을 사용한다.
- 수상형·달성형의 투명 이미지50장을 전체/수상/달성으로 분류하고 날짜 필터는 두지 않는다. 날짜와 월별12색·연도별6색 순환을 함께 표시하고, 달성형은 계열별 최고 획득 단계1개를 진열하며 상세에서4단계·조건·진척을 확인한다. 고유 엠블럼 이름은 화면·접근성 이름에서 제거하고 `10승 달성`, `월간 승률 1위` 같은 설명과 수상 기간·달성일을 표시한다.
- 본인만 대표 엠블럼을 최대 3개 저장하며 같은 클랜의 개인 기록 배너와 공유한다. 기존 네임카드의 `엠블럼` 프리셋과는 별도 기능이다. 대표 뱃지5개를 고르는 예전 케이스 UI는 제거했다.
- 수상형은 종류별로 금→은→동의 보유 최고 등급 중 최신1개를 진열한다. 팝업에는 전체 월간·연간 수상을 최신순으로 표시하고 금/은/동 필터와 과거 수상의 날짜·순위 확인·대표 지정을 제공한다. 전용 페이지 상단에도 대표3칸을 표시해 지정·해제 결과를 바로 확인하고 각 대표의 상세를 열 수 있다.
- 전용 페이지의 대표3칸은 제목·부제목 행 오른쪽의 작은 표시로 모은다. 셀44px·전체158px이며 폭이 부족하면 제목 아래 오른쪽으로 내려간다. 아래 목록은 진열 영역760px 미만3열/이상5열·셀 최대136px로 유지해 목록에 무게를 둔다. 분류·획득 개수를 한 행에 모으고 목록의 최소 높이·빈 상태는 셀 크기에 맞춘다.
- 수상은 월·연 기간 마감과 해당 기간에 개설된 진행 중 정규 내전의 종료를 모두 충족한 뒤, 해당 기간 전체 대상·부문의 1~3위를 처음 확정해 영구 보관한다. 이후 기록 정정·삭제나 등재 기준·공개 설정 변경으로 수상 결과를 덮어쓰지 않는다.
- 최초 달성일은 정정이 반영된 정규화 기록에서 각 단계 조건을 처음 통과한 시각으로 복원하며 새 기록을 쓸 때 자동으로 달성 이력을 추가한다. 원본 정정·삭제 뒤에도 최초 달성일을 보존하고 한국 시간의 날짜로 표시한다. 같은 계정의 탈퇴·재가입은 수상·달성 이력을 유지하며 계정 삭제·클랜 삭제 시 해당 이력을 연쇄 삭제한다.
- 일반 멤버는 기존 개인 기록 공개 설정을 따른다. 경기 전적 비공개 시 참여·출전·승리·연승 달성형, 예측 적중 비공개 시 예측 달성형을 케이스·대표에서 제외한다. 수상형도 부문 공개 권한에 따라 표시를 숨기며 보관된 기록은 유지한다. 상세 기준은 [클랜 통계의 엠블럼 개편](10-Clan-Stats.md#4-개인-기록)을 따른다.

## 2026-10-23 — 소개와 방을 함께 보는 프로필 (QA)

- 첫 화면은 닉네임·닉네임 첫 글자 아바타·한 줄 소개·소속 클랜·대표 엠블럼과 3D 방을 같은 낮/밤 배경으로 묶는다. 데스크톱은 소개 약30%/방 약70%, 모바일은 소개 다음에 방을 배치한다. 큰 제목·안내문과 중복 계정 요약 카드는 제거한다.
- 한 줄 소개는 본인 인증 후 Auth `user_metadata.profile_intro` 한 필드만 갱신한다. 최대120자·공백 정리·빈 값 지우기를 지원하고 기존 metadata를 보존한다. 실패하면 초안을 유지하고 성공·취소 뒤 입력 버튼으로 초점을 돌린다. 페이지 새로고침 없이 반영해 방 초안을 유지한다.
- 소개의 클랜 선택으로 해당 클랜의 대표3칸과 기존 개인 엠블럼 케이스 링크를 표시한다. 로딩·미획득·오류/재시도를 구분하며 기존 소속·공개 권한을 따른다. 이메일·자동 로그인·클랜 탈퇴·가입 신청·로그아웃/회원 탈퇴는 `계정 정보` 탭에서 관리한다. 진행 중 신청의 요약 알림은 해당 탭 안에 유지한다.
- 최상단 `3D 미니룸 / 계정 정보` 탭으로 분리한다. 계정 탭에 공개 설정·기본 계정·게임 연동/네임카드/부계정/선호 역할·클랜/개인 기록·가입 신청·로그아웃/탈퇴를 통합한다. 탭 전환과 소개 저장은 방 초안을 보존한다. `플레이어 프로필 / 프로필 설정` 행과 대표 뱃지5칸 UI를 제거하고 헤더는 `ClanSync | 프로필`, 게임 표시는 공식 오버워치 심벌을 사용한다.
- [소개](../../../src/components/profile/profile-identity.tsx) · [소개 저장](../../../src/app/actions/profile-intro.ts) · [공개 설정](../../../src/components/profile/profile-visibility.tsx) · [통합 검증](../../../e2e/profile-composition.spec.ts).

## 2026-10-23 — 미니룸 방문·프로필 공개 설정 (QA)

- 본인 화면은 `/profile`, 방문/공개 미리보기는 `/profile/{userId}`다. 비로그인 사용자는 로그인으로 이동한다. 개인 기록 배너의 `미니룸 방문`과 계정 탭의 `방문 화면 보기`로 접근한다.
- 미니룸 공개는 기본 켜짐, 한 줄 소개·플레이 게임·클랜·대표 엠블럼은 기본 꺼짐이다. 공개 설정은 항목별 즉시 저장하며 실패 시 마지막 확정값을 유지한다. 전체 공개를 끄면 하위 설정을 보존하고 방문 조회는 빈 결과를 반환한다.
- 대표 엠블럼은 클랜 공개와 엠블럼 공개가 모두 켜진 경우 같은 클랜 활성 멤버에게만 기존 기록 공개 권한에 따라 표시한다. 다른 클랜 방문자는 해당 케이스 진입점도 받지 않는다. 게임 공개는 게임 이름만 포함하고 게임 계정 ID·부계정은 제외한다.
- 방문 응답에는 닉네임·선택한 소개 정보·배치한 가구·벽지/바닥만 포함한다. 계정 정보·개인 코인·보관 가구·구매 이력·방 revision은 전달하지 않는다. 길게 누르기·키보드·우클릭을 포함한 편집/구매 도구가 없다. 조회는 방을 초기화하거나 소유 가구를 바꾸지 않는다.
- `profile_visibility`는 본인만 조회·저장한다. 기존 계정/방/보관함 RLS는 확대하지 않고 private definer + public invoker RPC `read_player_profile`가 공개 항목만 투영한다. 인증·대상 UUID를 검증하고 요청마다 조회하며 방문 창에 초점이 돌아오면 공개 상태를 갱신한다.
- QA 전용 마이그레이션 `20261023082048_profile_visibility.sql`과 생성 타입을 적용했다. 운영 DB·배포는 보류하며 기존 QA 방·명단·코인은 보존한다.
- [방문 화면](../../../src/app/profile/[userId]/page.tsx) · [공개 설정 저장](../../../src/app/actions/profile-visibility.ts) · [공개·비공개 UI 회귀](../../../e2e/profile-visibility.spec.ts) · [DB/RLS 회귀](../../../scripts/profile-visibility-db.test.mjs).

## 2026-10-23 — 프로필 하우징 1차 (QA)

### 적용 범위

- 프로필 첫 영역에 고정 사선 시점의 3D 미니어처 방을 크게 배치한다. 방 안에 이름·개인 코인과 꾸미기 도구를 띄우며 기존 요약·게임별 꾸미기·역할 선호·클랜·가입 신청은 아래에서 유지한다.
- 가구 구매에는 **클랜 활동으로 각자 모은 개인 코인**을 사용한다. 클랜 공용 잔액과 구분하며, 기존 개인 풀·클랜 풀 분리 정책을 따른다.
- 가구는 총 23종이다. 민트 소파·낮은 원목 테이블·작은 화분과 창문·커튼·벽 선반·벽시계·액자 3종의 총 10종을 무료 지급·배치한다. 나머지는 70~280 개인 코인으로 구매한다. 기존 방은 바닥 배치와 revision을 유지하며 새 벽 가구만 지급한다.
- 방과 보관함은 계정 전체에 속한다. 종류별 1개 영구 보유하며 클랜 탈퇴·이동과 무관하게 유지한다. 1차는 **본인만 열람·편집**한다.
- `방 꾸미기` → 가구 드래그 → 우클릭으로 회전·보관 → `방 저장`. 보기 모드에서도 가구를 450ms 길게 누르면 꾸미기에 진입하며 같은 마우스·손가락으로 이어서 옮긴다. 길게 누르기 전 7px 이상 이동·짧은 탭·스크롤·취소는 진입하지 않는다. 외부 편집 패널과 열·행 입력은 제거한다. 모바일은 가구 선택 후 방 안의 가구 메뉴를 사용한다. 키보드는 가구 버튼에서 방향키로 이동, R로 회전, Delete로 보관, Shift+F10으로 메뉴를 연다.
- `내 가구`·`가구 상점`·`방 분위기`·구매 확인·저장/취소는 모두 방 영역 안에서 처리한다. `꺼내기`는 빈자리를 찾아 배치한다. 카드 또는 `끌어놓기` 손잡이로 직접 배치할 수 있으며, 모바일은 손잡이를 사용해 목록 스크롤과 구분한다. 드래그 중에는 보관함을 가려 배치 공간을 확보한다.
- 바닥은 6×6, 양쪽 벽은 각각 6×4칸이다. 바닥 가구만 90도 회전하며 벽 가구는 벽 사이로 옮긴다. 같은 면에서는 가구가 겹칠 수 없지만 창문·커튼 쌍은 겹쳐 배치할 수 있다. 보관한 벽 가구는 재접속해도 자동으로 다시 배치하지 않는다.
- 드래그 중 반투명 가구와 초록/빨강 표시로 배치 가능 여부를 안내한다. 손을 놓은 유효 위치만 초안에 반영하며 겹침·방 밖·Esc·터치 취소·창 전환은 기존 배치를 유지한다. 보관·꺼내기·드래그 결과도 `방 저장`을 눌러 확정한다.
- 벽지 4종·바닥 3종은 무료로 선택한다. 구매와 배치는 분리되며 구매 직후 가구는 보관함에 추가된다. 구매 확인 창에는 가격·구매 후 잔액·환불 없음 정책을 표시한다. 저장하지 않은 편집은 확인 후 취소한다.
- 가구 겹침·방 밖 배치·미보유 가구·다른 사용자 접근을 DB에서도 차단한다. 구매·개인 원장·잔액은 한 트랜잭션으로 처리하고 중복 요청은 다시 차감하지 않는다. 방 저장은 revision으로 오래된 탭의 덮어쓰기를 거부하며 실패 시 편집 내용을 유지한다.
- 입체 가구 23종은 방과 상점 미리보기에 같은 모델을 사용한다. 창문·커튼·벽 소품은 고정 배경에서 제거하고 각각 선택·이동·보관 가능한 가구로 표시한다. 창문·커튼은 공통 벽 기준에 맞물리며, 벽·상단·걸레받이는 연속 모서리로 마감한다. 실내 가구의 접지 그림자만 유지하고 방 밖으로 드리우는 그림자는 제거한다. 마루/타일·주민을 포함해 외부 이미지·모델 없이 코드로 구성한다.
- 앱의 다크 모드는 밤 배경·조명·창밖 하늘, 라이트 모드는 낮을 표시한다. 벽지 색과 독립적으로 전환하고 방 배치는 유지한다. `MY LITTLE ROOM` 등 장식 문구는 제거한다.
- 입체 렌더러는 지연 로드하고 배치·선택·테마·화면 크기가 바뀔 때만 그린다. 미리보기는 공용 렌더러와 캐시를 사용한다. WebGL 미지원·컨텍스트 유실 때 간편 보기로 전환하고 편집 초안·가구 메뉴·키보드 조작을 유지한다.

### 구현·검증 진입점

- [화면](../../../src/components/profile/profile-housing.tsx) · [방 렌더러](../../../src/components/profile/housing-three-scene.ts) · [입체 가구](../../../src/components/profile/housing-three-models.ts) · [간편 보기 그림](../../../src/components/profile/housing-furniture-art.tsx) · [구매/저장 액션](../../../src/app/actions/profile-housing.ts) · [기본 QA 마이그레이션](../../../supabase/migrations/20261023054921_profile_housing.sql) · [벽 가구 확장](../../../supabase/migrations/20261023064837_profile_housing_wall_furniture.sql).
- [코인·권한·배치 DB 검증](../../../scripts/profile-housing-db.test.mjs) · [격리 계정 UI 흐름](../../../e2e/profile-housing.spec.ts) · [마우스·터치 드래그/꺼내기](../../../e2e/profile-housing-drag.spec.ts) · [방 안 조작·벽 가구·낮/밤](../../../e2e/profile-housing-room.spec.ts). 적용·검증 결과는 [Phase 2 현황](../../TODO_Phase2.md)에 기록한다.

### 후속 제안 (미구현)

- 구매 전 내 방에 미리 놓아보기, 여러 개의 같은 가구 보유, 활동·이벤트 기념 가구와 가격 조정.
- 트로피장 → 대표 업적·내전 기록, 게임 책상 → 선호 역할·영웅 등 정보 전시 연결. 같은 정보는 일반 프로필 영역에서도 열람할 수 있게 한다.
- 방명록·방 확장·방 안 업적 전시는 후속이다. 읽기 전용 방문·공개 범위는 위 QA 범위를 따른다. 아래 기존 게임별 꾸미기 명세는 하우징과 별도로 유지한다.

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
    ├─ 나의 미니룸 ──► 가구 상점 / 방 꾸미기 / 내 가구 / 배치·회전·보관 / 방 저장
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
  헤더 직후: **진행 중인 요약 카드**(게임별·클랜명 블록)가 있으면 먼저 표시된다.
  표: 클랜명 / 신청일 / 상태(대기/승인/거절) / [취소]

**실구현(Phase 2)**: 서버에서 `clan_join_requests`를 조인 embed 없이 읽은 뒤 `clans`·`games`를 별도로 붙여 잘림·RLS 문제로 빈 목록이 되지 않도록 한다. `pending` 은 요약 카드와 아래 목록 모두에 항상 나온다.

[하단 계정 액션]
  [게임 선택] → `/games`
  [로그아웃]   → 세션 종료 후 `/`
  [탈퇴]       → 브라우저 confirm 후 서버에서 본인 계정 삭제(Auth `deleteUser` + `public.users` 연쇄). 성공 시 로그아웃·`/`. 실패 시 `alert`로 메시지(DB RESTRICT 등). 개인 코인 원장·구매는 스키마 `0034` CASCADE 범위에서 함께 제거될 수 있음.
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
- **Phase 2 구현**: 라우트 `dynamic = "force-dynamic"`; 가입 신청·취소·승인·거절 후 `revalidatePath("/profile")`. 본인 목록은 **`fetchMyClanJoinRequests`**(내부 `select_my_clan_join_requests` RPC·`0035_*`)으로 조회한다.
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

**실구현(Phase 2, M5 후속)**

- 테이블 `user_alt_accounts`·RLS(`0043`)·함수 `effective_view_alt_account_roles` — 타인 조회는 같은 활성 클랜에서 `permissions.view_alt_accounts`(부재 시 앱 상수와 동일 기본)로 허용 역할이 겹칠 때만.
- `/profile`: 게임별 탭 안에 인증 완료(`user_game_profiles.is_verified`)인 경우만 「부계동」패널. 소속 활성 클랜·게임이 맞으면 `clan_settings.permissions` 로 요약 줄을 보여 줌(`data-alt-accounts-panel`).
- 서버 액션: 추가 시 인증 검증·동의 필수·삭제 시 본인 행만. 프리플라이트·REST 오류 메시지는 중복 등 DB 응답을 그대로 안내 가능.

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
