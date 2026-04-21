# Phase 1 품질 점검 & 문서 감사 리포트 — 2026-04-21

> **범위**: `mockup/` 정적 목업 전수 + `docs/01-plan/` 계획 문서 감사
> **기준 시점**: D-PRIV-01 종결 직후 (Phase 1 결정 사이클 실질 마감)
> **방법**: 2개 read-only explore 에이전트 병렬 실행 + 사후 교차 검증
> **공식 결정 수**: **54행** (헤더 표) — DECIDED 53 / REVISED 1 (D-EVENTS-02) / DROPPED 1 (D-NOTIF-03) · OPEN 0

## 종합 점수

| 구분     | 건수   | 성격                                                    |
|----------|--------|---------------------------------------------------------|
| Critical |  **2** | 깨진 파일 링크·누락 파일 — 즉시 수정 필요               |
| Major    |  **5** | DECIDED 상태 미반영·슬라이스 결정 매핑 부재 — 다음 묶음 |
| Minor    | **10** | 표기 혼용·접근성 보강·메타 부재 — 장기 백로그           |

트랙별 요약:
- **목업(트랙 A)**: Critical 0 · Major 1 · Minor 4 — 16개 핵심 DECIDED 샘플 기준 반영률 **15/16 (94%)**
- **문서(트랙 B)**: Critical 2 · Major 4 · Minor 6 — 14개 페이지 스펙 중 **10 ✅ · 4 ⚠️**

---

## 1. Critical (즉시 수정)

### C-1. `10-Clan-Stats.md:249` — 존재하지 않는 슬라이스 파일 링크
- **현재**: `[slices/slice-05-stats-hof.md](../slices/slice-05-stats-hof.md)`
- **정정**: `[slices/slice-05-clan-stats.md](../slices/slice-05-clan-stats.md)`
- **근거**: `decisions.md:1537`·`PRD.md:91`·`FEATURE_INDEX.md:13`은 모두 `slice-05-clan-stats.md`. 10-Clan-Stats.md만 구식 이름 유지.
- **영향**: 문서 내 링크 클릭 시 404. 읽기 흐름 단절.
- **수정 난이도**: 사소 (StrReplace 1줄).

### C-2. `TODO_Phase2.md` 파일 부재 → 4개 문서에서 링크 깨짐
- **누락 파일**: `docs/TODO_Phase2.md`
- **깨진 링크 위치**:
  - `docs/TODO.md:11, 34, 37`
  - `docs/TODO_Phase1.md:4, 16`
  - `docs/01-plan/FEATURE_INDEX.md:4`
  - `docs/README.md:15, 31, 48`
- **배경**: `TODO_LOG.md:700`에 *"없는 TODO_Phase2.md 직접 참조 → 현재 페이즈 진행도로 일반화"* 라는 정리 기록이 있음. **의도적 삭제**일 가능성이 크지만, 4개 문서는 여전히 참조 중.
- **선택지**:
  - **A**: Phase 2 착수 준비용으로 `TODO_Phase2.md` 신설 (Phase 1 결정 사이클 종료 직후 → 자연스러움).
  - **B**: 4개 문서에서 `TODO_Phase2.md` 참조 제거 후 `TODO.md` 단일 허브로 일반화.
- **권장**: **A**. Phase 1이 실질 마감된 지금 시점이 Phase 2 허브 문서를 만드는 정석 타이밍.

---

## 2. Major (다음 묶음 권장)

### M-1. 목업 · D-LFG-01 헤더 pill / 모집자측 카운트 UI 미반영
- **증상**:
  - `lfgAppCount()` 함수는 정의되어 있으나 **호출 지점 없음** (dead code).
  - 결정문이 요구한 **"내 신청 N건" 헤더 pill** · **모집자 측 "신청자 N명"** UI가 목업에 없음.
- **영향**: LFG 기능 사용자 인터페이스 피드백 부재. 신청 상태 변경이 눈에 띄지 않음.
- **수정 범위**: `mockup/pages/main-game.html` LFG 헤더 영역 + `mockup/scripts/clan-mock.js` `lfgAppCount()` 연동.
- **관련 결정**: [decisions.md §D-LFG-01](./01-plan/decisions.md).

### M-2. `09-BalanceMaker.md:290-296` — D-EVENTS-03이 "결정 필요" 섹션에 잔존
- **증상**: "결정 필요" 섹션 첫 bullet이 *"디스코드 알림 채널·발송 시점·실패 시 재시도 (D-EVENTS-03와 공유)"* — 이미 DECIDED된 결정.
- **정정**: 취소선 + DECIDED 날짜 + `§D-EVENTS-03` 앵커 추가.
- **참고**: 같은 섹션의 나머지 4개 항목(승부예측 정산·동률·재경기·A 점수·룰렛 연출)은 정말 OPEN — Phase 2+ 이관 성격으로 라벨링 권장.

### M-3. `12-Clan-Manage.md:248` — D-CLAN-02가 OPEN bullet로 잔존
- **증상**: D-MANAGE-01~04는 취소선 + DECIDED인데 D-CLAN-02만 단독으로 *"가입 요청 상태 머신 (이 화면이 핵심 소비자)"* 으로 남음.
- **실제 상태**: `decisions.md:32`에서 D-CLAN-02 **DECIDED (2026-04-20)**.
- **정정**: 취소선 + DECIDED 날짜 + `§D-CLAN-02` 앵커 추가.

### M-4. `14-Profile-Customization.md:240` — D-MANAGE-03 부계정 기본값 서술이 구식
- **현재**: *"D-MANAGE-03 부계정 공개 범위 (DECIDED — 클랜 설정 토글, **기본 `officers`**)"*
- **실제**: `decisions.md:63`에서 **D-PERM-01로 흡수(2026-04-21)** · 권한 키 `view_alt_accounts` · **기본 ✓/✓/✓ (leader·officer·member 모두 허용)**.
- **정정**: D-PERM-01 흡수·새 default·D-PRIV-01 제외 근거까지 한 줄로 업데이트.
- **영향**: 프로필 페이지 문서만 읽는 독자가 구식 정책을 기준으로 Phase 2 설계에 착수할 위험.

### M-5. 슬라이스 9종 대부분에 최근 D- 결정 매핑 부재
- **증상**: `slice-07-main-game-community.md` 등이 D-LFG-01 / D-RANK-01 / D-SCRIM-01·02 / D-PERM-01(`confirm_scrim`) 에 대한 **결정 코드 참조 한 줄도 없음**. 슬라이스 본문이 "목업 시연 수준"에 머물러 DECIDED 스냅샷이 반영되지 않음.
- **영향 큰 슬라이스 Top 3**:
  - `slice-07-main-game-community.md`: D-LFG-01 · D-RANK-01 · D-SCRIM-01/02 · D-PERM-01
  - `slice-05-clan-stats.md`: D-STATS-01~04 · D-PERM-01 · D-NOTIF-01(정정 알림)
  - `slice-03-main-clan-shell.md`: D-SHELL-01~03 · D-NOTIF-01/02 · D-PRIV-01 R3
- **수정 범위**: 각 슬라이스 상단에 "결정 참조" 섹션 1개 추가 (3~5줄씩 9개). Phase 2 구현자를 위한 필수 참조 경로.

---

## 3. Minor (장기 백로그)

### 목업 계열

- **m-1. `_hub.html`에 `profile.html` 미등재** — 허브 네비는 11개 경로만. `pages/profile.html`은 존재하나 허브 진입 경로 없음. 현재는 `main-clan.html` → 프로필 링크로만 진입 가능.
- **m-2. 목업 `<meta description>` 부재** — 모든 페이지가 `<title>`만 있고 description 없음. Phase 2+ Next.js 마이그레이션 시 일괄 부여.
- **m-3. `#mock-match-correction-request-modal` `aria-modal="true"` 누락** — `role="dialog"`·`aria-labelledby`는 있으나 `aria-modal` 없음. 신규 모달 권장 패턴 대비 gap.
- **m-4. 데드 CSS `.ranking-insight-placeholder`** — `main-game.html` 인라인 스타일에만 정의, 사용처 없음.

### 문서 계열

- **m-5. `TODO_Phase1.md` 마지막 갱신일 2026-03-28로 구식** — `TODO.md` 허브는 2026-04-21까지 최신화되었으나 Phase 1 메타만 3월 시점에 멈춤. Phase 1 종료 선언 반영 필요.
- **m-6. `10-Clan-Stats.md` "결정 현황" 제목 2곳 중복 (170·227행)** — `### 결정 현황` (170) + `## 결정 현황` (227). 어느 것이 최신인지 독자가 혼란.
- **m-7. D-BALANCE 계열 별명 코드 정식화 필요** — `09-BalanceMaker.md:286`에 *"D-BALANCE 계열 후속 결정"* 표현. `decisions.md` 헤더 표에 미등재. Phase 2+에서 정식 D-코드(D-BALANCE-01 등) 부여 시점에 갱신.
- **m-8. 역할 용어 한/영 혼용** — `leader`·`officer`·`member` (영문) vs 클랜장·운영진·멤버·구성원 (한글) — 페이지·슬라이스·decisions 전반. 의도적(영문=권한 키, 한글=UX 카피)일 수 있으나 컨벤션 문서에 한 줄 명시 권장.
- **m-9. "Phase 2+" 표기 혼용** — 대부분 `Phase 2+`이나 일부 `phase 2` 소문자. 컨벤션 통일.
- **m-10. schema.md 일부 테이블 헤딩에 D- 코드 링크 부재** — `games`·`maps`·`player_scores`·`medals`·`board_posts` 등은 설명 블록쿼트에 `D-` 링크 없음. "고아"라기보다 교차 링크 미부가. Phase 2 진입 전 일괄 부가 권장.

---

## 4. 결정 반영 검증 상세 (목업 · 16건 샘플)

| ID | 평가 | 근거·비고 |
|----|------|-----------|
| D-SHELL-01 | ✅ | `main.css` 768px 중단점, 64→220px hover, 모바일 드로어 `min(248px, 76vw)` |
| D-SHELL-03 | ✅ | `#sidebar-notify-balance`·`#sidebar-notify-events`·`#sidebar-notify-manage` ID + `mockSidebarNotifyRefresh` |
| D-PERM-01 | ✅ | `CLAN_PERMISSION_CATALOG` 6 카테고리 × 21 권한 키 |
| D-STATS-02 | ✅ | `#mock-match-correction-request-modal` + `mockMatchCorrection*` 로직 |
| D-STATS-03 | ✅ | "앱 이용" 탭·person-day 설명·D-STATS-03 뱃지 |
| D-NOTIF-01 | ✅ | `#mock-navbar-notify-bell`·`#mock-notifications-drawer`·`role="dialog"`·`aria-modal="true"` |
| D-NOTIF-02 | ✅ | `.mock-notifications-push-hint` inert 예고 배너 |
| D-PRIV-01 | ✅ | D-PERM-01 안내 박스 내 `.mock-privacy-override-hint` R3 예고 카피 |
| **D-LFG-01** | **⚠️** | 신청됨/수락됨 배지는 있으나 헤더 "내 신청 N건" pill · 모집자측 "신청자 N명" 미반영 (→ **M-1**) |
| D-SCRIM-02 | ✅ | `scrimJoinState` host/guest 양측 확정 · 일정 변경 시 확정 무효화 알림 |
| D-EVENTS-02 | ✅ | `mev-repeat` `none`/`weekly`/`monthly` 3종 · 종료 조건 UI 폐지 |
| D-MANAGE-03 | ✅ | `altAccountsVisibility` 토글 · 자기신고 고지 |
| D-ECON-03 | ✅ | 공개 클랜 순위 탭에 승률/K/D/MVP 등 경쟁 지표 **컬럼 없음** — 내전 수·활성 비율만 노출 |
| D-PROFILE-03 | ✅ | `data-badge-strip` · compact-5 dense-from-front · `clansync-mock-badge-picks-v1` 동기화 |
| D-LANDING-04 | ✅ | `?simulate=logged_in` + `from=logo`/`hash` 예외 처리 후 `games.html`로 `replace` |
| D-AUTH-01 | ✅ | `games.html` 6칸 라우팅 매트릭스 주석 · `clan-auth.html` pending 흐름 |

**반영률**: **15/16 (94%)** — 유일 부분 반영은 D-LFG-01.

---

## 5. 14개 페이지 스펙 점검 요약

| 파일 | 상태 | 비고 |
|------|------|------|
| 01-Landing-Page.md | ✅ | D-LANDING-01~04 취소선+DECIDED |
| 02-Sign-In.md | ✅ | D-AUTH-04~07 DECIDED |
| 03-Sign-Up.md | ✅ | D-AUTH-01·03 DECIDED |
| 04-Main_GameSelect.md | ✅ | D-AUTH-01 DECIDED |
| 05-GameAuth.md | ✅ | D-AUTH-01·02 DECIDED |
| 06-ClanAuth.md | ✅ | D-CLAN-01~07 DECIDED |
| 07-MainClan.md | ✅ | D-SHELL·NOTIF·PRIV 및 후속 후보 정리 |
| 08-MainGame.md | ✅ | LFG/RANK/SCRIM DECIDED |
| **09-BalanceMaker.md** | **⚠️** | D-EVENTS-03 OPEN 잔존 (→ **M-2**) |
| **10-Clan-Stats.md** | **⚠️** | 슬라이스 링크 깨짐 (→ **C-1**) · 결정현황 제목 중복 (→ **m-6**) |
| 11-Clan-Events.md | ✅ | D-EVENTS-01~05 전부 DECIDED |
| **12-Clan-Manage.md** | **⚠️** | D-CLAN-02 OPEN 잔존 (→ **M-3**) |
| 13-Clan-Store.md | ✅ | D-STORE-01~03 DECIDED |
| **14-Profile-Customization.md** | **⚠️** | D-MANAGE-03 부계정 기본값 구식 (→ **M-4**) |

---

## 6. 추정·미검증 항목 (전수 조사 생략)

감사 시간 제약으로 **전수 검증하지 않은** 항목들. Phase 2 착수 전 정밀 감사 권장.

- **decisions.md 앵커 링크 123건**을 대상으로 한 슬러그-헤딩 완전 일치 검증 (D-CLAN-04 샘플은 검증 완료: 정상)
- **페이지·슬라이스·schema의 모든 `D-` 코드 참조**를 헤더 표 54행과 전수 대조
- **목업 `<a href>`·`onclick` 전체 URL** 도달 가능성 크롤링
- **미사용 CSS 클래스 전수** (일부 `.ranking-insight-placeholder`만 스팟 확인)
- **미정의 JS 함수 호출 전수** (일부 가드 패턴만 확인)

---

## 7. 권장 수정 순서

Phase 2 착수 전 기준:

1. **C-1 + C-2** (Critical 2건) — 5분. 즉시.
2. **M-2 + M-3 + M-4** (페이지 문서 DECIDED 상태 갱신 3건) — 15분. 문서 정합성.
3. **M-5** (슬라이스 9종에 결정 참조 추가) — 60~90분. Phase 2 구현자 위한 필수 입구.
4. **M-1** (D-LFG-01 목업 UI 보강) — 30~45분. 기능 피드백 완결.
5. Minor 10건 — Phase 2 진입 후 필요 시 개별 처리.

---

## 8. 연관 문서

- [TODO.md](./TODO.md) — 허브 (마지막 갱신: 2026-04-21 D-PRIV-01 종결)
- [TODO_LOG.md](./TODO_LOG.md) — 세션 로그
- [01-plan/decisions.md](./01-plan/decisions.md) — 전체 결정 카탈로그
- [01-plan/schema.md](./01-plan/schema.md) — DB 스키마 기준 문서
