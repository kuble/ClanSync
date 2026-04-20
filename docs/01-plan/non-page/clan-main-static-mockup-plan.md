# 클랜 메인 · 서브 영역 정적 목업 플랜

> **범위**: `mockup/` + `_hub.html` 만. Next.js·Supabase 연동은 제외.  
> **참고**: 제품 라우트는 @docs/01-plan/pages.md · 요구는 @docs/01-plan/PRD.md §6.x

**구현 반영(정적 목업)**: `mockup/pages/main-clan.html` + `mockup/scripts/clan-mock.js` + `_hub.html` 사이드바 **목업 권한**(sessionStorage + `?role=` 로 iframe 로드). 서브뷰·Premium·탭·모달은 플랜에 맞춤.

---

## 1. 목적

- 실제 구현 전에 **화면 구조·정보 우선순위·운영진/구성원 시야 차이**를 고정한다.
- 디자이너·기획·개발이 같은 HTML을 보며 **절차(어떤 화면 다음에 무엇이 보이는지)**를 맞춘다.
- `_hub` iframe에서 **빌드 없이** 즉시 확인 가능해야 한다.

---

## 2. IA(정보 구조) — 제품 URL과의 대응

| 제품 경로(개념) | 정적 목업에서의 이름 | PRD 모듈 |
|----------------|---------------------|----------|
| `.../clan/[clanId]` (루트) | **대시보드** | MainClan 요약 |
| `.../balance` | **밸런스메이커** | §6.1 |
| `.../stats` | **클랜 통계** | §6.2 |
| `.../events` | **클랜 이벤트** | §6.3 |
| `.../manage` | **클랜 관리** | §6.4 |
| `.../store` | **클랜 스토어** | §6.5 |

허브에서는 **파일 하나 + 화면 전환**이어도 되고, 나중에 HTML 분할도 가능하다. 현재는 `pages/main-clan.html` 내 해시/JS 전환으로 묶여 있음.

### 2.1 해시 · 뷰 ID 매핑 (`clan-mock.js`)

| URL 해시 (`#`) | `clanGo` 키 | 활성 `clan-view` id |
|----------------|------------|----------------------|
| (없음) | `dash` | `view-dash` |
| `balance` | `balance` | `view-balance` |
| `stats` | `stats` | `view-stats` |
| `events` | `events` | `view-events` |
| `manage` | `manage` | `view-manage` |
| `store` | `store` | `view-store` |

대시보드는 주소에서 해시를 제거(`replaceState`)하고, 나머지 뷰는 `#키`로 공유 가능.

---

## 3. 권한(운영진 vs 구성원) 목업 전략

정적 HTML에는 로그인이 없으므로 다음 중 하나로 **기획 의도만** 드러낸다.

1. **권한 배지**: 사이드바 클랜 헤더 `#mock-clan-role-label` — `?role=` → `body.mock-role-leader` / `mock-role-officer` / `mock-role-member`.
2. **이중 블록**: 뷰 내부 `.mock-officer-only` / `.mock-member-only` (예: 밸런스 결과 입력 vs 관전).
3. **쿼리 + CSS**: **`?role=leader|officer|member`** — `clan-mock.js`의 `applyRoleBodyClass()`가 `body`에 반영. 허브 `_hub.html`은 `sessionStorage` + `main-clan.html?role=&plan=` iframe 로드.

**구현 메모 (관리 메뉴)**  
- **클랜 관리**만 구성원에게 막음: 사이드바 링크는 `.mock-officer-only`로 숨김 + `data-officer-nav`에 구성원일 때 `opacity`·`pointer-events`·`title` 처리; `clanGo('manage')`는 `OFFICER_VIEWS` 가드로 alert. `?hubDebug=1`이면 미리보기 허용.  
- **밸런스메이커**는 구성원도 사이드바에서 진입(세션 대기 플로우). PRD 「밸런스 = 운영진+ 전용」과 병행해 문서화됨([balance-maker-ui-notes.md](./balance-maker-ui-notes.md)).

### 3.1 플랜(Free / Premium) 목업

- **`?plan=free|premium`** (최우선) 또는 구독 `localStorage` → `mockClanCurrentPlan()` → `body.mock-plan-free` / `mock-plan-premium`.
- **Premium 전용 UI**: `mock-hide-on-free`(Free에서 숨김), 안내는 `mock-balance-free-note`(Free에서만 표시·Premium에서 숨김). 밸런스·이벤트 대진표·스토어 `pro` 카드 등에 공통 패턴.
- **사이드바 하단** `mock-premium-upgrade-promo`: Free만 표시, Premium에서 숨김.

---

## 4. 서브 페이지별 목업에 넣을 블록 (플래닝 체크리스트)

### 4.1 대시보드 (클랜 홈)

- **구현**: `view-dash` — 공통 배너·대시보드 카드 영역.
- 클랜 배너·한 줄 메타(게임명, 인원, 태그).
- 공지 영역, 배지(업적) 그리드.
- MVP·다가오는 일정·내 참여율 등 **요약 카드** (이미 상당 부분 존재).
- 커뮤니티(MainGame) 이동 진입점.
- **다음 검토**: “최근 경기 1~2건” 카드 추가 여부.

### 4.2 밸런스메이커

- 경기 단위 탭 또는 목록(작성중 / 종료 예시).
- 맵·모드(제어/호위 등) 메타.
- A/B 팀 로스터: 닉·태그·역할(탱/딜/힐)·수동·자동 점수.
- 승률 예측 바(목업 수치) + **Premium** 배지가 붙는 항목(자동 밸런스, OCR, 승부예측) 구분.
- 특이사항 태그 영역(자동 생성 **표시만**).
- **다음 검토**: 맵/영웅 밴픽 Premium 존을 빈 슬롯으로라도 배치할지.

### 4.3 클랜 통계

- 집계 단위는 **클랜만**(경기 아카이브·유형별 건수·맵·모드별 진행 횟수·**클랜 누적** 내전 B/R 팀 승 비중 등). **구성원 개인 상세·드릴다운은 클랜 관리(§6.4)** 와 구분. 상세·탭 4개·권한: **@docs/01-plan/clan-stats-plan.md** §9.0.
- **구현**: `view-stats` + `clan-mock.js` (`mockStats*`). 목업 `?role=member` 시 **경기 기록** 탭만 숨김.

### 4.4 클랜 이벤트

- **구현**: `view-events` — 하위 탭 **캘린더** · **대진표 생성기** · **투표** (`mockEventsSetTab`).
- 캘린더 + 이번 달 일정 그리드, 유형별 점 색(내전·스크림·이벤트). 운영진: **일정 등록** 모달.
- **PRD**: 대진표 생성기는 **Premium 전용**. 목업: Free 플랜(`body.mock-plan-free`)일 때 대진표 패널 본문은 `mock-hide-on-free`, 안내 문구는 `mock-balance-free-note`로 표시; 탭 라벨에 Premium 표기.
- 투표: 운영진만 생성·종료(툴바 `mock-officer-only`).

### 4.5 클랜 관리

- **구현**: `view-manage` — 상위 탭 **개요** · **구성원 관리** · **구독결제** (`mockManageSetTab`). 사이드바 `#manage`는 **운영진+만**(`.mock-officer-only`).
- 가입 요청·구성원 테이블(참여일·기부 등 목업 컬럼), 구독 결제는 **클랜장 중심** 카피.

### 4.6 클랜 스토어

- **구현**: `view-store` — 클랜/개인 풀, **클랜 꾸미기** / **개인 꾸미기** 탭, 카드에 `Premium`·`pro` 스타일 잠금 버튼 예시.
- **정책 문구(목업)**: 개인·네임플레이트 꾸미기는 **사측 제공 에셋만**, **업로드 불가**. 클랜 배너·아이콘은 **클랜 관리**와 연계(스토어 카피에 명시됨).

---

## 5. 구현 순서 제안 (정적 목업만)

1. **P0 — 내비게이션 일관성**: 사이드바·해시·활성 상태·허브 안내 문구 유지.
2. **P1 — 대시보드**: PRD와 안 맞는 카드/카피 정리, 빈 상태(데이터 없을 때) 1케이스.
3. **P2 — 밸런스 / 통계**: Premium 경계선을 시각적으로 통일(배지·disabled 스타일).
4. **P3 — 이벤트 / 스토어**: 캘린더·상품 그리드 밀도·모바일 줄바꿈.
5. **P4 — 관리**: 멤버 상세·추가 컬럼·권한별 시나리오.

---

## 6. 산출물·파일

| 산출물 | 위치 (현재 기준) |
|--------|------------------|
| 허브 | `mockup/_hub.html` |
| 클랜 셸 + 서브 뷰 | `mockup/pages/main-clan.html` (+ `mockup/styles/main.css` 보조 클래스) |
| 공통 스크립트 | `mockup/scripts/app.js` (전역 충돌 주의 — 클랜 전용은 인라인 또는 `clan-mock.js` 분리 검토) |

---

## 7. 명시적 비범위

- API·DB·인증·RLS.
- Next.js 라우트·컴포넌트 수정.
- 다국어 실제 전환(문구는 한국어 기준 목업으로 두고, 자리만 확보 가능).

---

## 8. 미결 정책 (기획에서 먼저 결정하면 목업이 쉬워짐)

- (현재 목업) 구성원도 **통계·이벤트·스토어** 네비는 동일하게 노출, **클랜 관리**만 제한. 변경 시 사이드바·`OFFICER_VIEWS`·문서를 함께 수정.
- 클랜 순위표·평판(MainGame)과 **클랜 메인** 사이 카피/진입 관계.
- Premium 기능을 목업에서 **항상 보이게(잠금)** 할지, 아예 숨길지.

이 문서는 허브 목업 작업의 **스코프·우선순위·PRD 매핑**을 고정하는 용도이며, 합의가 바뀌면 여기와 `main-clan.html`을 함께 갱신한다.
