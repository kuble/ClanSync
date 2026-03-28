# 구현 진행도 · 세션 TODO

> 개발 방향과 완료 여부를 한눈에 본다.  
> **규칙**: 구현·목업 작업이 끝난 세션에서는 담당 에이전트가 아래 **체크박스를 반드시 갱신**한다 (`[ ]` → `[x]`). 세션 로그에 한 줄 요약을 남긴다.  
> **/todo 커맨드**: `.cursor/commands/todo.md` 절차로 본 문서를 문서·목업과 동기화한다.

| 항목 | 값 |
|------|-----|
| **현재 단계** | Phase 1 — 정적 목업 (`mockup/`, `_hub.html`) |
| **다음 단계 (예정)** | Phase 2 — Next.js `src/` · API · DB (별도 착수 시) |
| **마지막 갱신** | 2026-03-28 |

---

## Phase 1 — 정적 목업 (슬라이스별)

### S00 규약·문서
- [x] Free / Premium 용어·문서 맵(`docs/README.md`)·슬라이스(`FEATURE_INDEX`, `slices/`)
- [ ] Phase 2 착수 시 본 문서에 Phase 2 섹션 추가

### S01 라우팅·쉘 (랜딩 · 로그인 · 가입 · 게임 선택)
- [x] `mockup/pages/index.html` 랜딩
- [x] `mockup/pages/sign-in.html` · `sign-up.html`
- [x] `mockup/pages/games.html`
- [x] 라우트·미들웨어 흐름 `pages.md` 반영 (`/profile`·게시판 상세 목업 없음·Phase 1 대응표)

### S02 게임·클랜 온보딩
- [x] `mockup/pages/game-auth.html`
- [x] `mockup/pages/clan-auth.html`
- [x] 온보딩 플로우·미들웨어 대응 `pages.md` 반영 (GameAuth/ClanAuth 목업 동작·온보딩 순서·`slice-02`)

### S03 MainClan 쉘 (허브 · 탭 · 플랜/권한 목업)
- [x] `mockup/_hub.html` (역할 · Free/Premium)
- [x] `mockup/pages/main-clan.html` · `mockup/scripts/clan-mock.js` 골격
- [x] 탭별 콘텐츠·플랜 경계 시각적 통일 (`clan-main-static-mockup-plan` §2.1·§3·§4, `mock-hide-on-free`·프로모·배지 패턴 점검)

### S04 밸런스메이커
- [x] 밸런스 서브뷰·설정 목업 존재
- [x] `balance-maker-ui-notes.md` 대비 누락 카피/플로우 (`main-clan.html` data-tip·워크플로 탭·허브 `?plan=` 연동과 동기화)
- [x] Premium 전용(승부예측·밴 등) 목업과 허브 연동 확인 (`_hub.html` → `?plan=` · `mockClanCurrentPlan` · `mock-hide-on-free`)

### S05 클랜 통계
- [x] 통계 뷰·요약·경기 기록·명예의 전당·`mockStats*` 목업 존재 (`main-clan.html`, `clan-mock.js`)
- [x] `clan-stats-plan.md` 대비 탭·권한별 화면·카피 최종 정합 (§5·§9.0·`앱 이용`/`rankmap` 패널, MVP 문구)
- [x] 구성원 vs 운영진 열람 분리 표현 점검 (경기 기록 `mock-officer-only`·`mockStatsSetSection` 가드, HoF vs 아카이브 구분)

### S06 이벤트 · 관리 · 스토어
- [x] 이벤트(캘린더·그리드·대진표 등) 목업 존재
- [x] 관리 탭(구성원·구독 등) 목업 존재
- [x] 스토어 Premium 잠금·코인 표현 목업 존재
- [x] `pages.md` / PRD / clan-main-static-mockup-plan 대비 통일·폴리시 점검 (§4.3–4.6 갱신, 대진표 Premium 게이트·탭 배지)

### S07 MainGame 커뮤니티
- [x] `mockup/pages/main-game.html` 골격
- [x] 홍보·LFG·스크림·필터·`navTo` 핵심 플로우 점검 (`resetLfgFilters` 선택자 수정, `pages.md` 목업 한 줄)
- [x] BACKLOG: 티어/배지 에셋 전 플레이스홀더 안내(`.mock-main-game-asset-hint`·BACKLOG.md 상호 참조)

### S08 프로필 · 꾸미기
- [x] `profile.html` · partials · `app.js` 연동 존재
- [x] 뱃지/네임플레이트 목업과 밸런스 슬롯 정책 일치 (`MOCK_BADGE_NAMEPLATE_MAX`, `balance-maker-ui-notes`·`pages.md` 반영)

### 공통 목업
- [x] `mockup/styles/main.css` 토큰·공통 컴포넌트
- [x] `mockup/scripts/app.js` 공통 인터랙션
- [x] `docs/02-design/mockup-spec.md` 구조·레이아웃·Premium 목업명·MainClan/Profile/MainGame 검토 항목 갱신

---

## Phase 2 — 앱 · API (미착수)

> `src/` 또는 Supabase 연동 착수 시 체크 항목을 여기에 추가한다.

- [ ] Next.js 라우트가 `pages.md`와 대응
- [ ] Supabase 스키마·RLS 초안 (`schema.md` 정합)
- [ ] 인증·클랜 권한 미들웨어

---

## 세션 로그 (날짜순 · 한 세션 = 한 블록)

<!-- 새 세션을 위에 추가 (최신이 위) -->

### 2026-03-28 — S02 게임·클랜 온보딩 문서 정합
- [x] `pages.md`: GameAuth·ClanAuth 목업 동작·온보딩 순서(1→4)·BACKLOG 링크, `slice-02` 수용 기준

### 2026-03-28 — S01 라우트·미들웨어 `pages.md` 정합
- [x] 라우팅 맵에 `/profile`·게시글 상세(목업 미작성) 명시, 미들웨어에 프로필·게임 하위 분리, Phase 1 목업 대응표·`slice-01` 수용 기준

### 2026-03-28 — mockup-spec 정합 (공통 목업)
- [x] `mockup-spec.md`: 트리(`_hub`·`profile`·`clan-mock`·`partials`)·MainGame 레이아웃·Premium 목업 클래스·MainClan 탭·Profile·MainGame 필터/플레이스홀더·`data/` 메모
- [x] **공통 목업** `mockup-spec` 대비 항목 완료 (S00은 Phase 2 섹션 추가 시까지 표상 **진행 중** 유지)

### 2026-03-28 — S08 프로필·꾸미기 ↔ 밸런스 정책 정합
- [x] `MOCK_BADGE_NAMEPLATE_MAX`·프로필 상단 안내·`nameplate-case-modal` 푸터, `balance-maker-ui-notes`·`pages.md`·`slice-08` 갱신

### 2026-03-28 — S07 MainGame 홍보·LFG·필터·플레이스홀더
- [x] `main-game.html`: LFG 필터 초기화 `#sec-lfg .lfg-filter-panel` 수정, `navTo`/에셋 BACKLOG 주석, `.mock-main-game-asset-hint` 안내
- [x] `pages.md` MainGame 목업 요약, `BACKLOG.md`·`slice-07` 수용 기준, 진행도·요약표 S07 **완료**

### 2026-03-28 — S03 MainClan 쉘 문서·플랜 경계 정합
- [x] `clan-main-static-mockup-plan.md` §2.1 해시·뷰 매핑, §3 권한·§3.1 플랜·§8 현재 네비 정책 반영
- [x] `slice-03` 수용 기준 완료, 진행도·요약표 S03 폴리시 열 **완료**

### 2026-03-28 — S06 이벤트·관리·스토어 문서·목업 정합
- [x] `pages.md`에 통계·관리·스토어 섹션 추가, `clan-main-static-mockup-plan.md` §4.3–4.6 목업 ID·권한 반영
- [x] 이벤트 대진표: Premium 탭 배지 + Free 플랜 시 본문 숨김(`mock-hide-on-free`)·안내 문구
- [x] `slice-06` 수용 기준·진행도·요약표

### 2026-03-28 — S05 클랜 통계 문서·목업 정합
- [x] `clan-stats-plan.md` §5·§9 재작성: 탭 4개(요약·명예의 전당·경기 기록·앱 이용)·권한·HoF vs 경기 기록 구분
- [x] `slice-05` 수용 기준 반영, `main-clan.html`/`clan-mock.js` 주석 정리

### 2026-03-28 — S04 밸런스 문서·목업 정합
- [x] `balance-maker-ui-notes.md`에 워크플로 탭 라벨·허브 `?plan=`·`mockClanCurrentPlan` 설명 보강
- [x] `main-clan.html` 밸런스 도움말 `data-tip`에서 § 제거(프로젝트 UI 가이드)
- [x] S04 진행도·`slice-04` 수용 기준(문서 순서) 반영

### 2026-03-28 — /todo 동기화 (재실행)
- `FEATURE_INDEX`·`BACKLOG`·`mockup/pages/*.html`·`clan-mock.js`·`app.js` 경로 대조
- S04 `balance-maker-ui-notes`·S05 `clan-stats-plan`·S01 `pages.md` 등 **폴리시·정합** 미완 항목 재확인 (체크리스트 변경 없음)
- 빠른 요약표·다음 세션 권장 프롬프트 갱신

### 2026-03-28 — /todo 커맨드로 진행도 동기화
- [x] S05·S06 목업 존재 여부 재확인 후 체크·요약표 반영
- [x] `.cursor/commands/todo.md` 추가 (재실행 시 동일 절차)
- [x] 다음 세션 권장 프롬프트 섹션 갱신

### 2026-03-28 — 문서·용어·슬라이스 정리
- [x] PRD 동결·`FEATURE_INDEX`·`slices/`·`BACKLOG` 정리
- [x] Free/Premium 용어 통일 (규칙·목업)
- [x] 본 진행도 문서(`IMPLEMENTATION_PROGRESS.md`) 신설

---

### 템플릿 (복사 후 사용)

```
### YYYY-MM-DD — (세션 제목)
- [ ] (이번 세션에서 끝낸 작업 1)
- [ ] (작업 2)
```

---

## 빠른 요약표

| 슬라이스 | 목업 1차 | 폴리시·문서 정합 |
|----------|:--------:|:----------------:|
| S00 | 완료 | 진행 중 |
| S01 | 완료 | 완료 |
| S02 | 완료 | 완료 |
| S03 | 완료 | 완료 |
| S04 | 완료 | 완료 |
| S05 | 완료 | 완료 |
| S06 | 완료 | 완료 |
| S07 | 완료 | 완료 |
| S08 | 완료 | 완료 |

위 체크리스트를 갱신할 때 본 표의 **완료 / 부분 / 미완**도 맞춘다.

---

## 다음 세션 권장 프롬프트 (/todo 갱신 시 덮어씀)

다음 세션 권장 프롬프트 (복사용):

```
@docs/IMPLEMENTATION_PROGRESS.md @docs/01-plan/BACKLOG.md 참고해서
랜딩·온보딩 관련 미결(캐치프라이즈·가짜 클랜 검증 등)을 `pages.md`·PRD와 대조하고 BACKLOG에만 정리한다.

완료 후 `docs/IMPLEMENTATION_PROGRESS.md` 세션 로그를 남긴다(체크리스트 변경은 선택).
```
