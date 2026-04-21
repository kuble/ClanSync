# 11 Clan Events · 클랜 이벤트

> **D-EVENTS-01 DECIDED (2026-04-20) · Supplemented (2026-04-21)** — 스크림 `status='confirmed'` 전환 시 양쪽 클랜 `clan_events`에 `source='scrim_auto'` 행 자동 INSERT (멱등 키 `(clan_id, scrim_id)`). 이 행은 **읽기 전용**. 추가 확정: 일정 **수동 등록은 내전·이벤트 2종만**(스크림 제외), **RSVP("참가")는 스크림 전용 단일 토글**(확인 팝업 → `going`/`none` 2상태), **참가자 명단(인게임 닉네임)·편집·삭제·"스크림 상세 열기" 버튼은 운영진+ 전용**. → [§D-EVENTS-01](../decisions.md#d-events-01--스크림-확정--클랜-이벤트-자동-생성동기화) · [§Supplemental](../decisions.md#d-events-01-supplemental--유형-수동-제한--rsvp-범위--권한-분기--2026-04-21)
>
> **D-EVENTS-02 REVISED (2026-04-21)** — 반복은 `none`/`weekly`/`monthly` 3종뿐. `weekly`는 **월~일 다중 체크박스 + `HH:mm`**, `monthly`는 **시작일의 day-of-month + `HH:mm`**. **종료 조건(count/until/never)·52회 hard stop 전면 폐지** — 편집(반복=`none`으로 저장) 또는 삭제로만 종료. `clan_event_exceptions`는 그대로 유지. → [decisions.md §D-EVENTS-02 Revised](../decisions.md#d-events-02-revised--일정-반복-요일시각-기반-무기한--2026-04-21)
>
> **D-EVENTS-03 DECIDED (2026-04-20)** — 채널: Discord(연동 시 ON) · 카카오(기본 **OFF 옵트인**) · in-app(항상). 슬롯 T-24h/T-1h/T-10min/T+0. 재시도 지수 백오프 5회 후 DLQ. quiet hours 00~07 KST 카카오 연기. `notification_log`·`notification_preferences` 단일 출처. → [decisions.md §D-EVENTS-03](../decisions.md#d-events-03--일정투표-알림-채널정책)
>
> **D-EVENTS-04 DECIDED (2026-04-20)** — 투표 알림 반복 검증: `매일 ≥ +48h`, `매주 ≥ +14d`, `마감 전까지 매일 ≥ +24h`. 상한 60d(초과 경고). 생성 시 `notification_log` 전체 예약 INSERT, 마감 시 잔여 자동 취소. 프론트 1차 + Server Action 최종 검증. → [decisions.md §D-EVENTS-04](../decisions.md#d-events-04--투표-알림과-마감일-일관성-검증)
>
> **D-EVENTS-05 DECIDED (2026-04-20)** — 대진표 = **클랜 내 이벤트 전용**(클랜 간 토너먼트 기획 없음). 통계는 정기 내전(`intra`)과 별도 "대진표" 섹션. HoF·외부 순위표 반영 X. 참여율·매너는 내전과 동일 가중치. 코인은 D-ECON-01 확정값만(개최 500 · 참가 +200 · 우승 +1,000, 전부 클랜 풀). 개인 풀 보상·MVP 자동 산정 **없음**. → [decisions.md §D-EVENTS-05](../decisions.md#d-events-05--대진표-결과의-통계코인-반영)

## 한 줄 요약
클랜의 일정·대진표·투표를 한 화면에서 운영하는 뷰. 캘린더 / 대진표 생성기(Premium) / 투표 3개 서브탭으로 구성된다.

## 누가 / 언제 본다
- 클랜 소속 사용자 전원이 열람.
- 등록·생성 액션은 운영진+ 전용.

## 화면 진입 조건
- [07-MainClan.md](./07-MainClan.md)와 동일한 라우트 가드 (로그인 → 게임 인증 → 클랜 소속).
- 사이드바 `#events` 또는 직접 해시 `/games/[g]/clan/[c]#events`.

## 사용자 흐름

```
이벤트 뷰 진입 (캘린더 탭 기본)
    │
    ├─ 캘린더 ──► 월간 캘린더 (날짜 클릭 가능)
    │              · 날짜 클릭 → 아래 "선택된 날짜 슬롯 패널"에 시간순 일정 카드
    │              · 슬롯 클릭 → 우측 드로어에서 일정 상세 (RSVP·반복·알림)
    │              · 운영진+: "+ 일정 등록" → 일정 모달
    │              · 자동 등록: 스크림 확정 시 자동 생성됨 (드로어는 읽기 전용 · D-EVENTS-01)
    │
    ├─ 대진표 생성기 (Premium) ──► 4단계 마법사
    │              1. 팀수·형식 → 2. 팀명·로스터 → 3. 시드·미리보기 → 4. 결과 입력
    │              Free일 때: 잠금 안내 + 업그레이드 카피
    │
    └─ 투표 ──► 진행 중 / 종료된 투표 카드
                · 운영진+: "+ 투표 만들기" → 투표 모달
                · 구성원: 진행 중 투표에 투표
```

## 화면 구성 (셸 + 상단 탭)

```
[배너 숨김 — 이 뷰에서는 클랜 배너 미표시]

H1 "클랜 이벤트"
부제 "상단 탭으로 캘린더·대진표·투표를 전환합니다."
힌트 "스크림·매칭에서 일정이 확정되면 해당 스크림이 클랜 이벤트에 자동 등록됩니다(취소·변경 시 동기화)."

[탭] [캘린더] [대진표 생성기 Premium] [투표]
```

## 탭 1 — 캘린더

### 영역
- 도구막 (운영진+): "+ 일정 등록"
- 월 이동 바: ‹ "2026년 3월" ›
- 7×N 그리드: 요일 헤더 + 셀 (이전/다음달은 dim)
- **셀 = 상호작용 가능한 `role="gridcell"`**: 클릭/Enter로 선택, `data-date="YYYY-MM-DD"` (KST 기준), 선택 상태는 `mock-events-cal-cell--selected` 로 하이라이트. 포커스 링 `outline: 2px solid #7c3aed`.
- 셀 마커 점:
  - **보라** = 내전 (`mock-events-cal-dot--internal`)
  - **초록** = 스크림 (`mock-events-cal-dot--scrim`)
  - **주황** = 이벤트 (`mock-events-cal-dot--event`)
- 범례: "점 색: 보라=내전 · 초록=스크림 · 주황=이벤트. 날짜를 클릭하면 아래에 해당 날짜의 일정 슬롯이 표시되고, 슬롯을 클릭하면 우측 드로어에서 상세를 확인할 수 있습니다."

### 선택된 날짜 슬롯 패널 (구 "이번 달 일정" 카드 그리드 대체)

- 캘린더 아래에 **단일 출처**로 표시 — 선택된 날짜의 일정만 시간순(asc)으로.
- 제목: `N월 D일 (요일) 일정` · 우측에 건수 칩 (`aria-live="polite"`).
- 기본 선택: 가장 이른 일정이 있는 날짜(목업). 운영 시 "오늘"이 기본.
- 슬롯 카드 레이아웃 (`.mock-events-slot`, `role="listitem"`):
  - 좌: 시각(HH:mm · 볼드) / 중: 제목·장소·반복·자동 등록 라벨 / 우: 유형 배지 + (스크림에서 현재 사용자 참가 중일 때만) **"참가 중" 녹색 배지**.
  - `kind` ∈ {`intra`, `event`}인 슬롯에는 참가 배지가 없다(RSVP 개념 미적용).
  - 클릭/Enter → 드로어 오픈.
- 빈 상태: "이 날짜에는 등록된 일정이 없습니다. 운영진+는 상단 + 일정 등록 버튼으로 추가할 수 있습니다."

### 일정 상세 드로어 (`#mock-event-drawer`, 우측 슬라이드 인)

- 너비 `min(420px, 92vw)`, `z-index: 181`, 오버레이 + Esc/오버레이 클릭/× 버튼으로 닫힘.
- 헤더: 유형 배지 → 제목 → 부제(한국어 날짜).
  - 스크림(`kind='scrim'`) 드로워에 한해 "스크림에서 자동 등록 · D-EVENTS-01" 배지 + **스크림 상세 열기** 버튼 노출. 배지는 전원 노출, 버튼은 **운영진+만**(D-EVENTS-01 Supplemental).
- 본문 `<dl>`: 시작(날짜·시각·종료), 장소, 반복(예: `매주 월·수·금 21:00 · 편집·삭제 전까지 계속`), 알림(`in-app · Discord · 카카오(옵트인)`).
- **참가 섹션** (D-EVENTS-01 Supplemental) — `kind='scrim'` 드로워에서만 렌더.
  - 단일 **"참가" 토글 버튼** + 상단 상태 배지(`미참가`/`참가 중`). 클릭 시 `confirm()`으로 의사 확인 후 `rsvp` 토글. 3버튼(`going`/`maybe`/`not_going`) 스키마는 폐기.
  - 확인 메시지: 참가 시 `"이 스크림에 참가하시겠습니까? 참가 명단에 인게임 닉네임이 노출됩니다."`, 취소 시 `"이 스크림 참가를 취소하시겠습니까?"`.
  - **참가 명단** (운영진+ 전용, `.mock-officer-only`): 인게임 닉네임 + (선택) 게임 태그 리스트. 현재 사용자가 참가 상태면 상단에 `나` 배지 강조. 좌측 헤더에 "운영진+ 전용" 보조 라벨.
  - 내전(`kind='intra'`)·이벤트(`kind='event'`) 드로워에는 참가 섹션 자체가 숨겨짐.
- 푸터:
  - `source='manual'` (내전·이벤트) → **편집·삭제** 버튼, **운영진+만 표시** (`.mock-officer-only`). 일반 구성원 드로워에는 버튼 영역 자체가 비어 보인다.
  - `source='scrim_auto'` → 편집·삭제 버튼은 전원에게 숨김 + "스크림에서 자동 생성된 일정이므로 **읽기 전용**입니다. 수정은 스크림 상세에서만 가능합니다." 안내 (전원 노출).

### 일정 등록 모달 (`#mock-event-modal`)

| 필드 | 형식 | 비고 |
|------|------|------|
| 제목 | text | 필수. placeholder "예: 정기 내전" |
| 유형 | select | **내전 / 이벤트 2종만** (D-EVENTS-01 Supplemental) — 스크림은 매칭 확정 시 자동 등록(`scrim_auto`)되므로 수동 등록 옵션 제거. |
| 시작 날짜 | `<input type="date">` | 필수. 반복=없음이면 단발 일시의 날짜, 반복=weekly/monthly면 **첫 인스턴스의 날짜** |
| 시각 (24시간제) | `<input type="time">` | 필수. 반복=없음이면 단발 시각, 반복=weekly/monthly면 **모든 인스턴스 공통 시각**. 필드는 모달에 단 하나. 상시 표시 힌트: "반복 일정에서도 모든 인스턴스는 이 시각에 시작합니다." |
| 반복 | select | 없음(일회성·위 날짜·시각에 한 번만) / 매주·선택한 요일마다 위 시각에 반복 / 매월·시작 날짜의 일자에 위 시각으로 반복 (D-EVENTS-02 Revised — `daily`·`biweekly` 제거) |
| 장소·채널 | text | "디스코드 #내전 · 인게임 초대" 등 |
| 안내 | — | "스크림 일정은 매칭 확정 시 자동 등록되므로 여기서 선택할 수 없습니다." · 반복은 "편집·삭제 전까지 계속 반복"을 명시 |

**반복 상세 필드** (D-EVENTS-02 Revised 2026-04-21) — `반복 != 없음`일 때 하위 fieldset으로 노출. **시각은 상단 "시각" 필드 하나만 사용**하며 반복 섹션에는 별도 시각 입력이 없다.

| 반복 값 | 하위 필드 | 안내 | 저장 |
|---------|----------|------|------|
| `weekly` | **월~일 체크박스 7개** (≥1 선택 필수) | "선택한 요일마다 같은 시각에 반복". 시작 날짜 요일이 선택 요일에 포함되지 않으면 경고: "시작 날짜(N요일)는 선택한 요일에 없습니다. 시작 날짜 이후 가장 빠른 선택 요일부터 반복됩니다." | `repeat='weekly'` · `repeat_weekdays smallint[]` (ISO 1=월..7=일) · `repeat_time = 상단 시각` |
| `monthly` | (추가 입력 없음) | 동적 문구: "매월 **N일 HH:mm**에 반복됩니다." · "해당 일자 없는 달(2월 30일 등)은 건너뜁니다." | `repeat='monthly'` · `repeat_weekdays=NULL` · day-of-month = `start_at`의 일자 · `repeat_time = 상단 시각` |

**종료 조건 (POLICY REMOVED 2026-04-21)** — 과거 `never`/`count(1-52)`/`until` 3모드 라디오는 **폐지**. 52회 hard stop도 없음. 반복 일정은 운영진이 **편집에서 반복을 `없음`으로 저장하거나 삭제**할 때까지 계속된다. UI에 종료 조건 fieldset·경고 없음.

**알림 옵션** (D-EVENTS-03 DECIDED) — 이벤트 모달에 알림 토글 섹션 추가:

| 필드 | 컨트롤 | 비고 |
|------|--------|------|
| T-24h 사전 알림 | checkbox default ON | 24h 이내 등록 시 disabled |
| T-1h 임박 알림 | checkbox default ON | — |
| T-10min 긴급 알림 | checkbox default ON | quiet hours 무시 |
| T+0 시작 알림 | checkbox default OFF | — |
| 채널 | 프로필 설정 따름(여기선 읽기 전용 요약만) | Free는 in-app만. 카카오는 옵트인 필요 안내 |

### 권한 (D-EVENTS-01 Supplemental 2026-04-21)
- "+ 일정 등록" 버튼은 **운영진+**만 표시.
- 캘린더 열람·범례·슬롯 카드·드로워 기본 내용(`<dl>`, "스크림 자동 등록" 배지)은 **전원**.
- **스크림 참가 단일 토글 버튼**: 전원(자기 의사로 참가/취소) — `kind='scrim'` 드로워 한정.
- **참가자 명단(인게임 닉네임)**: **운영진+ 전용** (`.mock-officer-only`). 일반 구성원 드로워에는 명단 섹션이 렌더되지 않음.
- **"스크림 상세 열기" 버튼**: **운영진+ 전용**.
- **편집·삭제 버튼**: **운영진+ 전용** (manual 이벤트에 한해 렌더, scrim_auto는 전원 숨김).

### 빈 상태
- 일정 0건이면 "이번 달 등록된 일정이 없습니다" 카피 (운영 시 추가).

## 탭 2 — 대진표 생성기 (Premium)

### Free 잠금
- 본문 상단에 "Premium 플랜 전용입니다…" 안내 + 업그레이드 동선.
- 본문 마법사는 `mock-hide-on-free` 클래스로 숨김.

### Premium 마법사 (4단계, 단계 완료해야 다음 단계 노출)

| 단계 | 내용 | 입력 |
|------|------|------|
| 1. 팀 수·대회 형식 | 토너먼트 규모와 형식 결정 | 팀 수 (2/4/8/16), 대회 형식 (싱글 엘리미네이션 / 더블 엘리미네이션 / 라운드 로빈) |
| 2. 팀 이름·플레이어 선택 | 팀 카드 클릭 후 플레이어 풀에서 칩 클릭 → 로스터 추가. 한 사람은 한 팀만. 다른 팀에 넣으면 자동 이동 | 팀명 입력, 플레이어 풀(밸런스메이커와 동일 풀 공유) |
| 3. 대진표 생성 | 시드 방식 결정 + 1라운드 미리보기 (수동 시 드래그·스왑 가능). "대진표 생성" → 4단계 노출 | 시드 방식 (수동/랜덤/MMR 순), "대진표 생성", "내보내기" |
| 4. 결과 입력 | 각 경기 종료 시 승자 선택. 이전 경기 승자 결정 시 다음 경기 입력 노출 | 경기별 select (승리 팀), "결과 저장" |

### 권한
- Premium 플랜에서 운영진+만 개설. 구성원은 참가·관전.
- **클랜 내 이벤트 전용** (클랜 간 토너먼트 없음, D-EVENTS-05).

### 결과 활용 (D-EVENTS-05 DECIDED)

| 지표 | 반영 여부 | 비고 |
|------|:--------:|------|
| 클랜 승률·K/D (외부 순위표) | ✗ | D-ECON-03 경쟁 지표 비노출 유지 |
| `#stats` 별도 "대진표" 탭 | ✓ | 우승 횟수·참가 횟수·최근 5건. 정기 내전 탭과 분리 |
| 참여율·매너 점수 | ✓ | 정기 내전과 동일 가중치 |
| MVP 자동 태그 (D-ECON-04) | ✗ | 13종 태그는 `match_type='intra'` 전용 |
| HoF 후보 | ✗ | HoF는 내전 기준만 |

**코인** (D-ECON-01 확정값)

| 트리거 | 금액 | 풀 |
|--------|:----:|:--:|
| 개최 확정 | -500 | 클랜 |
| 개최 취소 (우승 확정 전) | +500 | 클랜 |
| 참가 등록 | +200 | 클랜 (대회당 1회) |
| 우승 팀 확정 | +1,000 | 클랜 |
| 개인 풀 보상 | — | **없음** |
| MVP 자동 산정 | — | **없음** |

## 탭 3 — 투표

### 영역
- 도구막 (운영진+): "+ 투표 만들기"
- 카드 리스트:
  - **진행 중**: 제목 / 마감 일시 / 참여 N/M명 / 익명 여부 / 옵션별 % 바 + 라디오 + "투표하기"
  - **종료**: 결과만 표시 (반투명)

### 투표 만들기 모달 (`#mock-event-poll-modal`)

| 필드 | 형식 | 비고 |
|------|------|------|
| 제목 | text | 필수 |
| 선택지 | 다중 input | "선택지 추가" 버튼으로 입력란 늘림 |
| 마감 일시 | text | `YYYY-MM-DD HH:mm` |
| 익명 투표 | checkbox | 닉네임 비공개 |
| 다중 선택 허용 | checkbox | 복수 선택지 투표 |
| 투표 알림 (디스코드 등) | checkbox | 켜면 아래 fieldset 활성 |
| 알림 반복 | select | 없음(한 번) / 매일 / 매주 / 마감 전까지 매일 |
| 알림 일시·시각 | datetime-local / time | 반복 종류에 따라 행 노출 |
| 클랜 공지에 함께 표시 | checkbox | 공지사항에 동시 게시 |

### 검증·일관성 (D-EVENTS-04 DECIDED)

| 알림 반복 | 마감 하한 | 위반 시 에러 카피 |
|-----------|:--------:|-------------------|
| 없음(한 번) | +1h | "지금보다 미래여야 합니다" |
| 매일 | **+48h** | "48시간 이내 마감에는 '매일'을 사용할 수 없습니다. '한 번' 또는 '마감 전까지 매일'을 선택하세요." |
| 매주 | **+14d** | "14일 이내 마감에는 '매주'를 사용할 수 없습니다." |
| 마감 전까지 매일 | **+24h** | "24시간 이내 마감에는 이 반복을 사용할 수 없습니다. '한 번'을 권장합니다." |

- 상한 공통 60d — 초과 시 경고 모달 ("60일 이상 떨어진 투표입니다. 계속 진행하시겠어요?").
- 프론트 1차 인라인 검증 + Server Action이 최종 게이트. 통과 시 `notification_log`에 전체 발송 스케줄을 한 번에 `status='scheduled'`로 INSERT.
- 마감 도달·수동 조기 종료 시 DB 트리거가 잔여 `scheduled` 행을 `cancelled`로 일괄 UPDATE.
- 알림 채널은 D-EVENTS-03 정책(Discord 연동 시 ON · 카카오 옵트인 · in-app 항상)을 따름.

### 권한
- 만들기·종료는 운영진+. 투표 자체는 전원.

### 빈 상태
- 진행 중 투표 0건이면 "현재 진행 중인 투표가 없습니다" 카피.

## 권한·구독에 따른 차이

자세한 표는 [gating-matrix.md](../gating-matrix.md) §6. 핵심:

| 항목 | leader | officer | member | free | premium |
|------|:------:|:-------:|:------:|:----:|:-------:|
| 캘린더·일정 카드·투표 카드 열람 | ✓ | ✓ | ✓ | — | — |
| "+ 일정 등록" / "+ 투표 만들기" | ✓ | ✓ | ✗ | — | — |
| 대진표 생성기 본문 | ✓ | ✓ | ✓ (관전) | 🔒 안내만 | ✓ |
| 알림 발송 (카카오/디스코드) | — | — | — | ✗ | ✓ (D-EVENTS-03) |

## 데이터·연동

### 일정 (`clan_events`)
| 필드 | 설명 |
|------|------|
| `id` | PK |
| `clan_id` | FK |
| `title` | 제목 |
| `kind` | `internal` / `scrim` / `event` (수동 등록은 `internal`·`event`만, `scrim`은 `scrim_auto` 전용 — D-EVENTS-01 Supplemental) |
| `start_at` | 첫 인스턴스 시작 일시 (KST 저장) |
| `repeat` | `none` / `weekly` / `monthly` (D-EVENTS-02 Revised — `daily`·`biweekly` 제거) |
| `repeat_weekdays` | `smallint[]` — ISO 요일 1~7(월=1), `weekly`일 때 ≥1개 필수, 그 외 NULL |
| `repeat_time` | `time` — `HH:mm:ss` (KST), `weekly`·`monthly`일 때 NOT NULL |
| `place` | 장소·채널 |
| `source` | `manual` / `scrim_auto` (D-EVENTS-01) |
| `scrim_id` | `scrim_auto` 행의 원본 스크림 FK |
| `cancelled_at` | 전체 취소 시각 (행 삭제 금지) |
| `finished_at` | 경기 종료 시각 |
| (관련) `clan_event_exceptions` | 템플릿별 개별 인스턴스 override·취소 |
| (관련) `event_rsvps` | 참석 응답 — **`kind='scrim'` 이벤트 전용**. 실제 저장 값은 `response='going'` 1종 (D-EVENTS-01 Supplemental 2026-04-21). 사이드바 알림 점 집계는 스크림 미응답 기준. |
| `scrim_id` | 자동 등록 시 원본 스크림 |

### 스크림 자동 등록
- `scrim_rooms.status='confirmed'` 전환 시 양쪽 클랜 `clan_events`에 `source='scrim_auto'` 행 자동 INSERT (D-EVENTS-01).
- 취소·시간·장소 변경은 양쪽 이벤트에 동기화. 재확정(`cancelled → confirmed`) 시 `cancelled_at=NULL` 복원.
- 중복 방지 UNIQUE `(clan_id, scrim_id) WHERE scrim_id IS NOT NULL`.
- 구현 이중화: Server Action (주 경로) + `scrim_rooms` AFTER UPDATE OF status 트리거 `clan_events_sync_from_scrim()`.
- `source='scrim_auto'` 행은 **읽기 전용**. 수동 편집 UI 숨김 + "스크림에서 자동 등록" 배지 + 스크림 상세 열기 링크.

### 대진표 (D-EVENTS-05 DECIDED — 클랜 내 이벤트 전용)
- 스키마: `bracket_tournaments` · `bracket_teams` · `bracket_team_members` · `bracket_matches` · `bracket_results` (→ `schema.md`).
- `host_clan_id = winner_clan_id` 불변식 (클랜 간 대회 없음).
- 참가자(`bracket_team_members.user_id`)는 반드시 `tournament.host_clan_id`의 `clan_members`.
- 코인 거래 멱등 키: `(tournament_id, 'host')` · `(tournament_id, clan_id, 'entry')` · `(tournament_id, clan_id, 'winner')` · `(tournament_id, 'refund_host')`. 각 거래 ID를 `bracket_tournaments.*_coin_transaction_id`에 보관.

### 투표
- 옵션·집계·익명·다중·마감·알림 설정.
- 종료된 투표는 결과 스냅샷만 남김.

## 사이드바 알림 점 (`#sidebar-notify-events` · D-SHELL-03)

- **트리거 (합산)**:
  - (a) 앞으로 **24h 이내** 시작이 예정된 일정 중 **내가 RSVP를 남기지 않은** 것의 수.
  - (b) **진행 중인 투표** 중 **내가 투표하지 않은** 것의 수.
- **Clear**: `#events` 뷰 진입 시 자동 clear. RSVP/투표가 실제로 채워지기 전까지는 재진입 시 다시 점이 뜬다(정보성).
- **신규 일정 등록** 자체는 별도 트리거로 두지 않는다 — RSVP 미응답으로 자연 흡수되어 중복 알림을 막는다.
- 목업에서는 일정 저장 시 `mockSidebarNotifySet('events', true)`로 점을 켜는 디버그 동작만 구현되어 있다. 실데이터 기반 자동 집계는 Phase 2+에서 구현.
- 자세한 규칙은 [decisions.md §D-SHELL-03](../decisions.md#d-shell-03--사이드바-알림-점-트리거-규칙) 참고.

## 목업과 실제 구현의 차이
- 캘린더 월 이동은 alert만. 실제로는 월별 데이터 fetch.
- 일정 등록·투표 등록 모달은 입력값을 저장하지 않고 alert로 끝.
- "스크림 자동 등록" 카드는 정적 마크업 (실제 스크림 트리거 없음).
- 대진표 마법사는 시각적 단계 진행만 (결과 데이터 영구 저장 없음).
- 투표 카드의 % 바는 정적 수치.

## 결정 필요
_전부 DECIDED (2026-04-20). 본 페이지 상단 블록쿼트 및 `decisions.md §D-EVENTS-01 ~ 05` 참조._

- ~~D-EVENTS-01 스크림 확정 → 클랜 이벤트 자동 생성 트리거·중복·취소 동기화~~ → [§D-EVENTS-01](../decisions.md#d-events-01--스크림-확정--클랜-이벤트-자동-생성동기화)
- ~~D-EVENTS-02 일정 반복 종료 조건 (횟수 / 종료일)~~ → **Revised 2026-04-21: 종료 조건 전면 폐지 · 편집·삭제로만 종료**. [§D-EVENTS-02 Revised](../decisions.md#d-events-02-revised--일정-반복-요일시각-기반-무기한--2026-04-21)
- ~~D-EVENTS-03 알림 채널 발송 시점·실패 시 재시도~~ → [§D-EVENTS-03](../decisions.md#d-events-03--일정투표-알림-채널정책)
- ~~D-EVENTS-04 "마감 전까지 매일" 알림 ↔ 마감일 일관성 검증~~ → [§D-EVENTS-04](../decisions.md#d-events-04--투표-알림과-마감일-일관성-검증)
- ~~D-EVENTS-05 대진표 결과의 통계·코인 반영 여부~~ → [§D-EVENTS-05](../decisions.md#d-events-05--대진표-결과의-통계코인-반영)

## 구현 참고 (개발자용)

- 목업 위치: `mockup/pages/main-clan.html` `#view-events` (5430~6131)
- 서브탭 전환: `mockEventsSetTab(btn, 'cal' | 'bracket' | 'poll')`
- 일정 모달: `#mock-event-modal`, 함수 `mockEventOpenModal`, `mockEventCloseModal`, `window.mockEventSaveMock`
- 투표 모달: `#mock-event-poll-modal`, 함수 `mockEventPollOpenModal`, `mockEventPollAddOption`, `mockEventPollNotifyToggle`, `mockEventPollSubmit`
- 대진표 마법사: `window.mockBracketSetTeamCount`, `mockBracketWizardGo`, `mockBracketSelectTeamCard`, `mockBracketPoolChipClick`, `mockBracketSeedSync`, `mockBracketGenerateClick`, `mockBracketLiveSync`
- Free 잠금 컨테이너: `mock-hide-on-free` (대진표 본문)
- 권한 클래스: `mock-officer-only` (도구막 버튼)
- 캘린더 점 클래스: `mock-events-cal-dot--internal|--scrim|--event`

## 연관 문서
- [pages.md](../pages.md)
- [slices/slice-06-events-manage-store.md](../slices/slice-06-events-manage-store.md)
- [schema.md](../schema.md) (`clan_events`)
- [07-MainClan.md](./07-MainClan.md)
- [08-MainGame.md](./08-MainGame.md) (스크림 자동 등록 트리거 원천)
- [decisions.md](../decisions.md) (D-EVENTS-01~05)
- [gating-matrix.md](../gating-matrix.md) §6
