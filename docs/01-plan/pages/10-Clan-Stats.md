# 10 Clan Stats · 클랜 통계

> ⚠️ 이전 버전은 인코딩 손상으로 복구가 불가해 mockup `#view-stats` 기준으로 새로 작성. 옛 결정 항목이 있다면 [decisions.md](../decisions.md)에 D-STATS-XX로 추가 등재 필요.  
> **D-ECON-03** (DECIDED 2026-04-20) — 이 페이지는 **클랜 내부 통계**로 경쟁 지표 노출 허용. 단, HoF 등재 결과의 **외부(비구성원) 공개**는 별도 토글(기본 비공개) 대상. 외부 공개 클랜 순위표에서는 경쟁 지표(승률·K/D·MVP 수 등) 전면 제외. [decisions.md §D-ECON-03](../decisions.md#d-econ-03--클랜-순위표-민감-지표-노출-범위).

## 한 줄 요약
클랜 활동을 숫자로 보여주는 뷰. 요약 / 명예의 전당 / 경기 기록 / 앱 이용 4개 상단 탭으로 구성된다.

## 누가 / 언제 본다
- 클랜 소속 사용자 전원이 열람.
- "경기 기록" 탭은 운영진+ 전용.

## 화면 진입 조건
- 클랜 메인 진입 조건과 동일.
- 사이드바 `#stats` 또는 직접 해시.
- 구성원이 "경기 기록" 탭에 직접 접근 시 자동으로 "요약" 탭으로 복귀.

## 사용자 흐름

```
통계 진입 (요약 탭 기본)
    │
    ├─ 요약 ──► 핵심 지표 KPI 행 (전체 경기 / 구성원 / 클랜 설립일)
    │
    ├─ 명예의 전당 (HoF) ──► 승률·참여율·월별·연도별 순위
    │              · 운영진+: "설정" → 공개 범위·등재 기준 모달
    │
    ├─ 경기 기록 (운영진+) ──► 캘린더에서 일자 선택 → 그날의 경기 슬라이더 + 일별 승률 순위
    │
    └─ 앱 이용 (rankmap) ──► 연도×월 표 + 내전 순 참여 인원 막대 + 내전 경기 횟수 막대
```

## 화면 구성

```
H1 "클랜 통계"

[탭 행]
  [요약]  [명예의 전당]  [경기 기록 (운영진+)]  [앱 이용]
```

## 탭 1 — 요약 (Summary)

### 영역
| KPI 카드 | 값 | 메타 |
|----------|-----|------|
| 전체 경기 수 | 합계 | "내전 N · 스크림 M" |
| 구성원 | 현재 인원 | "현재 클랜 소속 인원" |
| 클랜 설립일 | 날짜 | "클랜 생성일" |

### 비고
- 단순 KPI. 차트 없음.
- 실제 구현 시 추가 KPI(이번 달 경기 수, 평균 출전 등) 검토.

## 탭 2 — 명예의 전당 (HoF)

### 영역
- 카드 헤더: "명예의 전당" + (운영진+) "설정" 버튼.
- 본문: 동적 렌더 (`#mock-stats-hof-root`).
  - 승률 순위 (월·연·전체)
  - 참여율 순위
  - 누적 활동 순위
  - 등재된 멤버는 닉·아바타·지표·뱃지.

### "설정" 모달 (`#mock-hof-settings-modal`)

> **D-STATS-01 (DECIDED 2026-04-21) → D-PERM-01 흡수** — 권한 키 `set_hof_rules` (평판·통계 카테고리, 기본 leader만, 클랜 토글로 officer 허용 가능). 외부 공개 토글(`expose_hof`)은 별도 leader 전용 유지. [decisions.md §D-STATS-01](../decisions.md#d-stats-01--hof-설정-권한-d-perm-01-흡수) · [§D-PERM-01](../decisions.md#d-perm-01--클랜-권한-매트릭스-모델-도입).

권한 보유자가 구성원에게 보일 공개 범위·등재 기준을 조정.

| 항목 | 옵션 |
|------|------|
| 승률 순위 공개 (구성원) | 상위 3 / 5 / 10 / 20위 / 전체 |
| 참여율 순위 공개 (구성원) | 동일 |
| 월별 순위 공개 시점 | 상시 / 매월 1일 |
| 연도별 순위 공개 시점 | 상시 / 매년 1월 1일 |
| 등재 기준 — 집계 기간 총 경기 수 기준점 | 1~5000 (예: 100) |
| 기준점 이하일 때 — 최소 참여 비율 % | 1~100 (예: 30) |
| 기준점 초과일 때 — 절대 최소 출전 경기수 | 1~2000 (예: 30) |
| **외부 공개 여부** (D-ECON-03) | **비공개**(기본) / 클랜 상세 프로필 공개. `clan_settings.expose_hof boolean DEFAULT false` — leader만 변경 가능(Phase 2+) |

### 등재 규칙 요약
- 집계 기간 총 경기 수가 **기준점 이하**면 → "총 경기 수 × 비율 %"를 올림한 값 이상 출전 시 등재.
- **기준점 초과**면 → "절대 최소 출전" 경기수 이상 출전 시 등재.

### 권한 (D-PERM-01 흡수)
- 열람: 전원.
- "설정": 권한 키 `set_hof_rules` 보유자. **기본 leader만**, 클랜이 매트릭스에서 officer 허용 토글 시 officer도 가능.
- 외부 공개 토글(`expose_hof`): leader 전용 (잠긴 정책).

## 탭 3 — 경기 기록 (Archive · `view_match_records` 권한)

### 영역
- 캘린더 영역 (`#mock-stats-archive-cal-root`): 월간 캘린더, 경기 있는 일자 마커.
- 일자 선택 시:
  - 본문 헤딩: "YYYY-MM-DD 경기 기록"
  - 좌측 슬라이더 (`#mock-stats-archive-slider-root`): 그날의 경기 카드 좌우 이동
    - 경기 카드: 블루/레드 라인업, 결과, 맵, 시간
    - **"정정 요청" 버튼** (`view_match_records` 보유자 전원 노출)
    - **"직접 정정" 버튼** (`correct_match_records` 보유자만 노출)
  - 우측 패널 (`#mock-stats-archive-winrate`): 그날의 승률 순위

### 권한 (D-PERM-01 흡수)
- **탭 진입**: 권한 키 `view_match_records` (기본 운영진+, 토글로 멤버 허용).
- **직접 정정**: 권한 키 `correct_match_records` (기본 leader만, 토글로 officer 허용).
- **정정 요청**: `view_match_records` 보유자 누구나 (별도 키 없음).
- 권한 미보유자가 직접 접근 시 자동으로 요약 탭 복귀.

### 정정 요청 모달 (`#mock-match-correction-request-modal` · D-STATS-02 DECIDED 2026-04-21)

운영진이 직접 정정할 시간이 없거나, 권한이 없는 멤버(토글로 `view_match_records` 열린 경우)가 잘못된 경기 기록을 발견했을 때 사용하는 흐름.

**요청자 흐름**

1. 경기 카드 → "정정 요청" 클릭 → 모달 오픈
2. 입력:
   - **결과** (블루승/레드승, optional)
   - **로스터** (블루·레드 멤버 수정, optional)
   - **맵** (드롭다운, optional)
   - **자유 사유** (필수, max 500자)
3. 제출 → `match_record_correction_requests` INSERT → AFTER INSERT 트리거가 `correct_match_records` 권한 보유자 전원의 `notifications`에 `kind='match_correction_requested'` 피드 생성(D-NOTIF-01 통합 센터, DECIDED 2026-04-21)
4. 같은 경기에 active 요청 1건만 가능(부분 UNIQUE) — 기존 요청 처리 전엔 추가 요청 차단
5. 7일 내 미처리 시 자동 expire → 재요청 가능

**운영진 처리 흐름**

1. 네비게이션바 알림 벨(D-NOTIF-01) 또는 클랜 관리 메뉴에서 요청 상세 진입
2. "정정 적용" 클릭 → 운영진이 새 값을 직접 입력 → 저장
   - **자동 적용 X** — 요청 내용은 참고 자료, 실제 데이터 변경은 운영진 손을 거침
   - 저장 시점에 `match_record_history` INSERT (before/after 자동 기록, `source='request'`, `request_id` 연결)
   - `match_record_correction_requests.status = 'accepted'` UPDATE → AFTER UPDATE 트리거가 요청자 본인에게 `kind='match_correction_accepted'` 피드 생성(D-NOTIF-01)
3. "반려" 클릭 → 반려 사유 입력 → `status='rejected'` UPDATE → 트리거가 요청자에게 `kind='match_correction_rejected'` 피드 생성(payload에 반려 사유 포함)

**직접 정정 (권한 보유자)**

- 경기 카드 → "직접 정정" 클릭 → 정정 모달(요청 모달과 다른 UI) → 새 값 입력 → 저장
- `match_record_history` INSERT (`source='direct'`, `request_id=NULL`)

### 이력 보존 (D-STATS-02 DECIDED 2026-04-21)

- `match_record_history` 테이블 INSERT-only로 모든 정정의 before/after 영구 보존.
- HoF 등재 재집계 시 history reverse-replay로 시점별 통계 재현 가능.
- 같은 경기에 정정이 반복되면 운영 anomaly flag (Phase 2+).

## 탭 4 — 앱 이용 (Rankmap)

> 사이드바 라벨은 "앱 이용". 코드 식별자는 `rankmap` (역사적 명칭).

### 영역 1: 연도별 월별 앱 이용 횟수
> **D-STATS-03 (DECIDED 2026-04-21)** — 측정 단위 = **활동일(person-day)**. 멤버가 자기 클랜 페이지(`/clan/[clan_id]/...`)에 첫 페이지뷰를 기록한 날 = 1. 같은 날 추가 접속·새로고침은 카운트되지 않음(DAY UNIQUE). 클랜 `timezone` 자정 경계. [decisions.md §D-STATS-03](../decisions.md#d-stats-03--앱-이용-횟수-측정-단위--활동일-person-day) · [schema.md §clan_daily_member_activity](../schema.md).

- 표: 연도(행) × 1~12월(열) + 연간 합계.
- 셀 값 = 그 달/연의 person-day 합 (예: "이번 달 240회 = 멤버들이 합쳐 240번의 활동일을 보냄").
- 영역 2(distinct 멤버 수)와 짝을 이뤄 **도달 × 참여**의 두 면을 동시에 보여줌.
- 미래 월은 `—` (집계 전).
- 활동일 카운트 라우트: `/clan/[clan_id]`·`/clan/[clan_id]/manage`·`/clan/[clan_id]/stats`·`/clan/[clan_id]/events`·`/clan/[clan_id]/promo` 등 클랜 컨텍스트 라우트군. 메인 게임 허브·프로필·다른 클랜 탐색은 미반영.
- 노이즈 가드: HTTP `Sec-Fetch-Dest=prefetch` / `Purpose=prefetch` 헤더 요청 + 봇 User-Agent + 비인증 요청 모두 카운트 제외.
- 외부 노출: **금지** (D-ECON-03 — 다른 클랜·비멤버에게 노출하지 않음).
- 각주: "**CSV 내보내기**는 권한 키 `export_csv` 보유자만(D-PERM-01 흡수, 기본 leader, 토글로 officer 허용). 실제 CSV 생성·기간 필터 UI는 Phase 2+ 도입 — Phase 1은 권한 카탈로그 등록만." [decisions.md §D-STATS-04](../decisions.md#d-stats-04--csv-내보내기-d-perm-01-흡수--phase-2-구현-보류)

### 영역 2: 내전 순 참여 인원
- 안내: 해당 기간에 내전 로스터에 1회 이상 포함된 **서로 다른** 멤버 수.
- 서브탭: 월간 / 연간 막대 그래프.
- 미래 월은 muted 막대.

### 영역 3: 내전 경기 횟수
- 클랜이 등록한 **내전**만 집계 (스크림·이벤트 제외).
- 서브탭: 월간 / 연간.

## 모달

| 모달 | 트리거 | 비고 |
|------|--------|------|
| 명예의 전당 설정 | HoF 탭의 "설정" (`set_hof_rules` 보유자) | 위 표 참조 |
| 경기 카드 상세 (옵션) | 경기 카드 클릭 | 라인업·맵·결과·플레이어 KDA. 운영 시 정의 |
| **정정 요청** (`#mock-match-correction-request-modal`) | 경기 카드 → "정정 요청" (`view_match_records` 보유자) | D-STATS-02 — 결과/로스터/맵 + 자유 사유, 7일 만료 |
| **직접 정정** | 경기 카드 → "직접 정정" (`correct_match_records` 보유자) | 새 값 입력 → 저장 시 `match_record_history` 자동 INSERT |

## 권한·구독에 따른 차이

자세한 표는 [gating-matrix.md](../gating-matrix.md) §5. 핵심:

| 항목 | leader | officer | member | 권한 키 (D-PERM-01) | free | premium |
|------|:------:|:-------:|:------:|---------------------|:----:|:-------:|
| 요약 | ✓ | ✓ | ✓ | — | — | — |
| 명예의 전당 열람 | ✓ | ✓ | ✓ | — | — | — |
| HoF "설정" | ✓ | ✗→토글 | ✗ | `set_hof_rules` (토글로 officer 허용) | — | — |
| 경기 기록 열람 | ✓ | ✓ | ✗→토글 | `view_match_records` (토글로 member 허용) | — | — |
| 경기 직접 정정 | ✓ | ✗→토글 | ✗ | `correct_match_records` (토글로 officer 허용) | — | — |
| 경기 정정 요청 | ✓ | ✓ | ✗→토글 | `view_match_records` 보유자(별도 키 없음) | — | — |
| 앱 이용 열람 | ✓ | ✓ | ✓ | — | — | — |
| CSV 내보내기 | ✓ | ✗→토글 | ✗ | `export_csv` (토글로 officer 허용) · Phase 2+ UI | — | — |

> Free / Premium 분기 없음 (현 목업 기준). 운영 시 Premium 한정 인사이트(예: 시간대 분석, 영웅별 시너지 차트)를 추가할 수 있음.

## 데이터·연동

### 요약 KPI
- 출처: `matches`, `match_results`, `clan_members`, `clans.created_at`.

### HoF
- 집계: 사용자별 (승률, 참여율, 누적 활동) × 월/연/전체.
- 등재 필터: 위 등재 규칙으로 컷오프.
- 공개 범위 설정값은 클랜 설정에 저장.

### 경기 기록
- 출처: `matches`, `match_players`, `match_results`.
- 캘린더는 월별 fetch.
- 일자 선택 시 그날의 경기 묶음 + 승률 순위 응답.

### 앱 이용 (rankmap)
- 출처: `clan_daily_member_activity` (D-STATS-03 — 활동일/person-day, DAY UNIQUE, 자기 클랜 라우트 첫 페이지뷰 트리거).
- 영역 1(person_days) · 영역 2(active_members) 동시 산출 = `clan_monthly_activity` MV.
- 영역 3(내전 경기 수)은 `matches` 별도 집계.

## 목업과 실제 구현의 차이
- 모든 수치는 정적 / `MOCK_*` 데이터 기반.
- HoF 본문은 비어 있고 컨테이너만 있음 (`#mock-stats-hof-root`) — 실제는 서버 응답 렌더.
- 경기 기록 캘린더·슬라이더·승률 패널도 컨테이너만 — 실제는 fetch + 동적 렌더.
- "앱 이용" 표·차트는 정적 마크업.
- HoF 설정 모달은 입력만 받고 alert로 저장 처리.

## 결정 현황
- **D-PERM-01 (DECIDED 2026-04-21)** 클랜 권한 매트릭스 모델 — 본 페이지의 모든 권한이 매트릭스에 흡수됨
- **D-STATS-01 (DECIDED 2026-04-21)** HoF 설정 권한 → `set_hof_rules` 키
- **D-STATS-02 (DECIDED 2026-04-21)** 경기 사후 정정 + 정정 요청 모달 + 이력 보존
- **D-STATS-03 (DECIDED 2026-04-21)** "앱 이용 횟수" = 활동일(person-day) — `clan_daily_member_activity`
- **D-STATS-04 (DECIDED 2026-04-21)** CSV 내보내기 → `export_csv` 키 (Phase 2+ UI 보류)
- **D-NOTIF-01 (DECIDED 2026-04-21)** in-app 알림 센터 통합 — 정정 요청 접수/수락/거절/만료 4슬롯이 네비 벨 드로워로 집결 ([decisions.md §D-NOTIF-01](../decisions.md#d-notif-01--in-app-알림-센터-통합-도입))
- (보강) Premium 한정 통계 카드 추가 여부

## 구현 참고 (개발자용)

- 목업 위치: `mockup/pages/main-clan.html` `#view-stats` (4791~5429)
- 탭 전환: `mockStatsSetSection(btn, 'summary' | 'hof' | 'archive' | 'rankmap')`
- 구성원 가드: 구성원이 archive 탭 진입 시 자동으로 summary로 복귀 (`mockStatsGuardArchiveForMember`)
- HoF 설정: `window.mockStatsHofOpenSettingsModal`, `window.mockStatsHofCloseSettingsModal`, `window.mockStatsHofSaveSettingsModal`
- HoF 컨테이너: `#mock-stats-hof-root`
- 아카이브 컨테이너: `#mock-stats-archive-cal-root`, `#mock-stats-archive-slider-root`, `#mock-stats-archive-winrate`
- 내전 순 참여 탭: `window.mockStatsIntraPartSetTab(btn, 'month' | 'year')`
- 권한 클래스: `mock-officer-only` (탭 + 패널)

## 연관 문서
- [pages.md](../pages.md)
- [slices/slice-05-clan-stats.md](../slices/slice-05-clan-stats.md)
- [schema.md](../schema.md) (`matches`, `match_players`, `match_results`)
- [07-MainClan.md](./07-MainClan.md) (셸 + MVP 카드의 통계 출처)
- [09-BalanceMaker.md](./09-BalanceMaker.md) (경기 결과 입력의 출처)
- [decisions.md §D-PERM-01](../decisions.md#d-perm-01--클랜-권한-매트릭스-모델-도입) · [§D-STATS-01](../decisions.md#d-stats-01--hof-설정-권한-d-perm-01-흡수) · [§D-STATS-02](../decisions.md#d-stats-02--경기-사후-정정-요청-모달과-이력-보존) · [§D-STATS-03](../decisions.md#d-stats-03--앱-이용-횟수-측정-단위--활동일-person-day) · [§D-STATS-04](../decisions.md#d-stats-04--csv-내보내기-d-perm-01-흡수--phase-2-구현-보류)
- [schema.md §clan_settings](../schema.md) (`permissions jsonb`) · `match_record_correction_requests` · `match_record_history` · `clan_daily_member_activity`
- [gating-matrix.md](../gating-matrix.md) §5
