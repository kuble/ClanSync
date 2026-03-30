# Phase 1 — 정적 목업 (`mockup/`, `_hub.html`)

> **상태: 종료** (2026-03-28) — 유지보수·카피 수정 시에만 본 체크를 갱신한다.  
> **허브**: [TODO.md](./TODO.md) · **세션 로그**: [TODO_LOG.md](./TODO_LOG.md) · **Phase 2**: [TODO_Phase2.md](./TODO_Phase2.md)

| 항목 | 값 |
|------|-----|
| **단계** | Phase 1 — 정적 목업 (완료) |
| **마지막 갱신** | 2026-03-28 |

---

## S00 규약·문서

- [x] Free / Premium 용어·문서 맵(`docs/README.md`)·슬라이스(`FEATURE_INDEX`, `slices/`)
- [x] Phase 2 구현·라우트 표는 [TODO_Phase2.md](./TODO_Phase2.md)에서 진행 (Phase 1 범위 밖 항목 이관)

## S01 라우팅·쉘 (랜딩 · 로그인 · 가입 · 게임 선택)

- [x] `mockup/pages/index.html` 랜딩
- [x] `mockup/pages/sign-in.html` · `sign-up.html`
- [x] `mockup/pages/games.html`
- [x] 라우트·미들웨어 흐름 `pages.md` 반영 (`/profile`·게시판 상세 목업 없음·Phase 1 대응표)

## S02 게임·클랜 온보딩

- [x] `mockup/pages/game-auth.html`
- [x] `mockup/pages/clan-auth.html`
- [x] 온보딩 플로우·미들웨어 대응 `pages.md` 반영 (GameAuth/ClanAuth 목업 동작·온보딩 순서·`slice-02`)

## S03 MainClan 쉘 (허브 · 탭 · 플랜/권한 목업)

- [x] `mockup/_hub.html` (역할 · Free/Premium)
- [x] `mockup/pages/main-clan.html` · `mockup/scripts/clan-mock.js` 골격
- [x] 탭별 콘텐츠·플랜 경계 시각적 통일 (`clan-main-static-mockup-plan` §2.1·§3·§4, `mock-hide-on-free`·프로모·배지 패턴 점검)

## S04 밸런스메이커

- [x] 밸런스 서브뷰·설정 목업 존재
- [x] `balance-maker-ui-notes.md` 대비 누락 카피/플로우 (`main-clan.html` data-tip·워크플로 탭·허브 `?plan=` 연동과 동기화)
- [x] Premium 전용(승부예측·밴 등) 목업과 허브 연동 확인 (`_hub.html` → `?plan=` · `mockClanCurrentPlan` · `mock-hide-on-free`)

## S05 클랜 통계

- [x] 통계 뷰·요약·경기 기록·명예의 전당·`mockStats*` 목업 존재 (`main-clan.html`, `clan-mock.js`)
- [x] `clan-stats-plan.md` 대비 탭·권한별 화면·카피 최종 정합 (§5·§9.0·`앱 이용`/`rankmap` 패널, MVP 문구)
- [x] 구성원 vs 운영진 열람 분리 표현 점검 (경기 기록 `mock-officer-only`·`mockStatsSetSection` 가드, HoF vs 아카이브 구분)

## S06 이벤트 · 관리 · 스토어

- [x] 이벤트(캘린더·그리드·대진표 등) 목업 존재
- [x] 관리 탭(구성원·구독 등) 목업 존재
- [x] 스토어 Premium 잠금·코인 표현 목업 존재
- [x] `pages.md` / PRD / clan-main-static-mockup-plan 대비 통일·폴리시 점검 (§4.3–4.6 갱신, 대진표 Premium 게이트·탭 배지)

## S07 MainGame 커뮤니티

- [x] `mockup/pages/main-game.html` 골격
- [x] 홍보·LFG·스크림·필터·`navTo` 핵심 플로우 점검 (`resetLfgFilters` 선택자 수정, `pages.md` 목업 한 줄)
- [x] BACKLOG: 티어/배지 에셋 전 플레이스홀더 안내(`.mock-main-game-asset-hint`·BACKLOG.md 상호 참조)

## S08 프로필 · 꾸미기

- [x] `profile.html` · partials · `app.js` 연동 존재
- [x] 뱃지/네임플레이트 목업과 밸런스 슬롯 정책 일치 (`MOCK_BADGE_NAMEPLATE_MAX`, `balance-maker-ui-notes`·`pages.md` 반영)

## 공통 목업

- [x] `mockup/styles/main.css` 토큰·공통 컴포넌트
- [x] `mockup/scripts/app.js` 공통 인터랙션
- [x] `docs/02-design/mockup-spec.md` 구조·레이아웃·Premium 목업명·MainClan/Profile/MainGame 검토 항목 갱신

---

## 빠른 요약표 (슬라이스)

| 슬라이스 | 목업 1차 | 폴리시·문서 정합 |
|----------|:--------:|:----------------:|
| S00 | 완료 | 완료 |
| S01 | 완료 | 완료 |
| S02 | 완료 | 완료 |
| S03 | 완료 | 완료 |
| S04 | 완료 | 완료 |
| S05 | 완료 | 완료 |
| S06 | 완료 | 완료 |
| S07 | 완료 | 완료 |
| S08 | 완료 | 완료 |

위 체크리스트를 갱신할 때 본 표의 **완료 / 부분 / 미완**도 맞춘다.
