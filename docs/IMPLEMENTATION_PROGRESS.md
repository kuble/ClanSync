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
- [ ] 라우트·미들웨어 흐름이 `pages.md`와 불일치 없는지 최종 점검

### S02 게임·클랜 온보딩
- [x] `mockup/pages/game-auth.html`
- [x] `mockup/pages/clan-auth.html`
- [ ] 온보딩 플로우 UX 문서 대비 최종 점검

### S03 MainClan 쉘 (허브 · 탭 · 플랜/권한 목업)
- [x] `mockup/_hub.html` (역할 · Free/Premium)
- [x] `mockup/pages/main-clan.html` · `mockup/scripts/clan-mock.js` 골격
- [ ] 탭별 콘텐츠·플랜 경계 시각적 통일 (clan-main-static-mockup-plan 반영 여부)

### S04 밸런스메이커
- [x] 밸런스 서브뷰·설정 목업 존재
- [ ] `balance-maker-ui-notes.md` 대비 누락 카피/플로우
- [ ] Premium 전용(승부예측·밴 등) 목업과 허브 연동 확인

### S05 클랜 통계
- [x] 통계 뷰·요약·경기 기록·명예의 전당·`mockStats*` 목업 존재 (`main-clan.html`, `clan-mock.js`)
- [ ] `clan-stats-plan.md` 대비 탭·권한별 화면·카피 최종 정합
- [ ] 구성원 vs 운영진 열람 분리 표현 점검

### S06 이벤트 · 관리 · 스토어
- [x] 이벤트(캘린더·그리드·대진표 등) 목업 존재
- [x] 관리 탭(구성원·구독 등) 목업 존재
- [x] 스토어 Premium 잠금·코인 표현 목업 존재
- [ ] `pages.md` / PRD / clan-main-static-mockup-plan 대비 통일·폴리시 점검

### S07 MainGame 커뮤니티
- [x] `mockup/pages/main-game.html` 골격
- [ ] 홍보·LFG·필터 등 핵심 플로우 점검
- [ ] BACKLOG: 티어/배지 에셋 교체 전까지 플레이스홀더 유지 표시

### S08 프로필 · 꾸미기
- [x] `profile.html` · partials · `app.js` 연동 존재
- [ ] 뱃지/네임플레이트 목업과 밸런스 슬롯 정책 일치 확인

### 공통 목업
- [x] `mockup/styles/main.css` 토큰·공통 컴포넌트
- [x] `mockup/scripts/app.js` 공통 인터랙션
- [ ] `docs/02-design/mockup-spec.md` 대비 누락 스타일/패턴 정리

---

## Phase 2 — 앱 · API (미착수)

> `src/` 또는 Supabase 연동 착수 시 체크 항목을 여기에 추가한다.

- [ ] Next.js 라우트가 `pages.md`와 대응
- [ ] Supabase 스키마·RLS 초안 (`schema.md` 정합)
- [ ] 인증·클랜 권한 미들웨어

---

## 세션 로그 (날짜순 · 한 세션 = 한 블록)

<!-- 새 세션을 위에 추가 (최신이 위) -->

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
| S01 | 완료 | 미완 |
| S02 | 완료 | 미완 |
| S03 | 완료 | 미완 |
| S04 | 부분 | 미완 |
| S05 | 완료 | 미완 |
| S06 | 완료 | 미완 |
| S07 | 부분 | 미완 |
| S08 | 부분 | 미완 |

위 체크리스트를 갱신할 때 본 표의 **완료 / 부분 / 미완**도 맞춘다.

---

## 다음 세션 권장 프롬프트 (/todo 갱신 시 덮어씀)

다음 세션 권장 프롬프트 (복사용):

```
@docs/01-plan/FEATURE_INDEX.md @docs/01-plan/slices/slice-04-balance-maker.md @docs/01-plan/balance-maker-ui-notes.md @docs/IMPLEMENTATION_PROGRESS.md 참고해서
balance-maker-ui-notes.md와 목업(main-clan 밸런스 뷰·clan-mock.js)의 누락 카피·플로우·도움말을 맞추고, Premium 전용 블록과 허브 플랜 전환 연동을 점검한다.

완료 후 docs/IMPLEMENTATION_PROGRESS.md 체크박스·요약표·세션 로그를 갱신해줘.
```
