# 11 Clan Events · 클랜 이벤트

> **D-EVENTS-01 DECIDED (2026-04-20)** — 스크림 `status='confirmed'` 전환 시 양쪽 클랜 `clan_events`에 `source='scrim_auto'` 행 자동 INSERT (멱등 키 `(clan_id, scrim_id)`). 이 행은 **읽기 전용**, 시간·장소·제목 수정은 스크림 본체에서만. 취소·시간 변경 시 양쪽 동기화, 재확정 지원. → [decisions.md §D-EVENTS-01](../decisions.md#d-events-01--스크림-확정--클랜-이벤트-자동-생성동기화)
>
> **D-EVENTS-02 DECIDED (2026-04-20)** — 반복 종료 3모드(`never`/`count`/`until`). `never`는 서버 **12개월 hard stop**, `count` 1~52, `until`은 날짜. 인스턴스 상한 52. 템플릿 1행 + 지연 인스턴스 + `clan_event_exceptions`로 개별 수정·취소. → [decisions.md §D-EVENTS-02](../decisions.md#d-events-02--일정-반복-종료-조건)
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
    ├─ 캘린더 ──► 월간 캘린더 + "이번 달 일정" 카드
    │              · 운영진+: "+ 일정 등록" → 일정 모달
    │              · 자동 등록: 스크림 확정 시 자동 생성됨
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
- 셀 마커 점:
  - **보라** = 내전 (`mock-events-cal-dot--internal`)
  - **초록** = 스크림 (`mock-events-cal-dot--scrim`)
  - **주황** = 이벤트 (`mock-events-cal-dot--event`)
- 범례: "점 색: 보라=내전 · 초록=스크림 · 주황=이벤트. 알림(카카오/디스코드)은 연동 후."
- "이번 달 일정" 카드 그리드 (정기 내전 / 스크림 / 이벤트 등)

### 일정 등록 모달 (`#mock-event-modal`)

| 필드 | 형식 | 비고 |
|------|------|------|
| 제목 | text | 필수. placeholder "예: 정기 내전" |
| 유형 | select | 내전 / 스크림 / 이벤트 |
| 일시 | text | `YYYY-MM-DD HH:mm` (24시간제). 운영 시 datepicker로 D-EVENTS-시간입력 |
| 반복 | select | 없음(일회) / 매주 같은 요일·시간 / 매월 같은 날짜 / 격주 같은 요일 |
| 장소·채널 | text | "디스코드 #내전 · 인게임 초대" 등 |
| 안내 | — | "스크림 일정은 매칭 확정 시 자동 등록…" |

**종료 조건** (D-EVENTS-02 DECIDED) — `반복 != 없음`일 때 하위 그룹으로 노출:

| 모드 | UI | 추가 입력 |
|------|-----|-----------|
| 종료일 없음 | 라디오 기본값 | "약 1년 후 자동 만료" 안내 (서버 52 인스턴스 hard stop) |
| N회 반복 | 라디오 | `count` 숫자 1~52 (52 초과 인라인 에러) |
| 날짜까지 반복 | 라디오 | `until` datepicker (52 초과 인스턴스 생성 시 인라인 에러) |

**알림 옵션** (D-EVENTS-03 DECIDED) — 이벤트 모달에 알림 토글 섹션 추가:

| 필드 | 컨트롤 | 비고 |
|------|--------|------|
| T-24h 사전 알림 | checkbox default ON | 24h 이내 등록 시 disabled |
| T-1h 임박 알림 | checkbox default ON | — |
| T-10min 긴급 알림 | checkbox default ON | quiet hours 무시 |
| T+0 시작 알림 | checkbox default OFF | — |
| 채널 | 프로필 설정 따름(여기선 읽기 전용 요약만) | Free는 in-app만. 카카오는 옵트인 필요 안내 |

### 권한
- "+ 일정 등록" 버튼은 운영진+만 표시.
- 캘린더 열람·범례·일정 카드는 전원.

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
| `kind` | `internal` / `scrim` / `event` |
| `start_at` | 시작 일시 (KST 저장) |
| `repeat` | `none` / `weekly` / `biweekly` / `monthly` |
| `repeat_end_kind` | `never` / `count` / `until` (D-EVENTS-02) |
| `repeat_end_count` | 1~52 (count 모드) |
| `repeat_end_at` | 종료일 (until 모드) |
| `place` | 장소·채널 |
| `source` | `manual` / `scrim_auto` (D-EVENTS-01) |
| `scrim_id` | `scrim_auto` 행의 원본 스크림 FK |
| `cancelled_at` | 전체 취소 시각 (행 삭제 금지) |
| `finished_at` | 경기 종료 시각 |
| (관련) `clan_event_exceptions` | 템플릿별 개별 인스턴스 override·취소 |
| (관련) `event_rsvps` | 참석 응답 (사이드바 알림 점 집계) |
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
- ~~D-EVENTS-02 일정 반복 종료 조건 (횟수 / 종료일)~~ → [§D-EVENTS-02](../decisions.md#d-events-02--일정-반복-종료-조건)
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
