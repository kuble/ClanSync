# 구현 진행도 — 세션 로그

> **허브**: [IMPLEMENTATION_PROGRESS.md](./IMPLEMENTATION_PROGRESS.md) — 상태·페이즈 링크·다음 프롬프트는 허브만 보면 된다.  
> **이 파일**: 히스토리만 쌓이므로 **일상 참조 시 `@IMPLEMENTATION_PROGRESS.md`만** 쓰고, 세션 종료·감사 시에만 이 파일을 연다.

<!-- 새 세션을 위에 추가 (최신이 위) -->

### 2026-03-28 — 허브 권장 프롬프트 정합 (Phase 1 기본 + Phase 2 보조)
- [x] `IMPLEMENTATION_PROGRESS.md` 다음 세션 블록: Phase 1 복사용을 기본으로 두고, Phase 2 착수용은 두 번째 블록으로 분리
- [x] `.cursor/commands/todo.md` §4 절차를 위 형식에 맞게 정리

### 2026-03-28 — 세션 로그 파일 분리
- [x] `IMPLEMENTATION_PROGRESS_SESSION_LOG.md` 신설, `IMPLEMENTATION_PROGRESS.md`에서 히스토리 제거(토큰 절약)

### 2026-03-28 — 진행도 문서 페이즈 분리
- [x] `IMPLEMENTATION_PROGRESS_Phase1.md`·`IMPLEMENTATION_PROGRESS_Phase2.md` 신설, 본 파일은 허브·세션 로그 전용

### 2026-03-28 — 랜딩·온보딩 미결 BACKLOG 대조
- [x] `BACKLOG.md`: PRD·`pages.md`와 항목 매칭·랜딩/온보딩 표·경제·통계 그룹 분리
- [x] `pages.md` Landing 캐치프라이즈 → BACKLOG 단일 참조

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
