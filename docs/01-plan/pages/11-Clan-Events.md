# 11 Clan Events · 클랜 이벤트

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

종료 조건은 미정 (D-EVENTS-02). 알림 관련 필드 없음.

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
- Premium 플랜에서 운영진+만 작성. 구성원은 진행 관전 (D-EVENTS-05에서 결과 활용 정책 결정).

### 결과 활용
- 미정. 대진표 결과를 클랜 통계·코인에 반영할지 D-EVENTS-05.

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

### 검증·일관성
- "마감 전까지 매일" 알림은 마감일과의 일관성 검증 필요 (D-EVENTS-04).
- Premium 한정으로 알림 발송, 중복 방지·가중치는 구현 단계에서 결정 (D-EVENTS-03).

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
| `repeat` | `none` / `weekly` / `monthly` / `biweekly` |
| `repeat_end` | 종료 조건 (D-EVENTS-02) |
| `place` | 장소·채널 |
| `source` | `manual` / `scrim_auto` |
| `scrim_id` | 자동 등록 시 원본 스크림 |

### 스크림 자동 등록
- 스크림 확정 시점에 `clan_events`에 자동 INSERT.
- 스크림 취소·시간 변경 시 동기화 (D-EVENTS-01).
- 중복 방지 키: `(clan_id, scrim_id)`.

### 대진표
- 스키마 확정 미정. 결과를 통계·코인 보상에 반영할지 D-EVENTS-05.

### 투표
- 옵션·집계·익명·다중·마감·알림 설정.
- 종료된 투표는 결과 스냅샷만 남김.

## 목업과 실제 구현의 차이
- 캘린더 월 이동은 alert만. 실제로는 월별 데이터 fetch.
- 일정 등록·투표 등록 모달은 입력값을 저장하지 않고 alert로 끝.
- "스크림 자동 등록" 카드는 정적 마크업 (실제 스크림 트리거 없음).
- 대진표 마법사는 시각적 단계 진행만 (결과 데이터 영구 저장 없음).
- 투표 카드의 % 바는 정적 수치.

## 결정 필요
- D-EVENTS-01 스크림 확정 → 클랜 이벤트 자동 생성 트리거·중복·취소 동기화
- D-EVENTS-02 일정 반복 종료 조건 (횟수 / 종료일)
- D-EVENTS-03 알림 채널 발송 시점·실패 시 재시도
- D-EVENTS-04 "마감 전까지 매일" 알림 ↔ 마감일 일관성 검증
- D-EVENTS-05 대진표 결과의 통계·코인 반영 여부

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
