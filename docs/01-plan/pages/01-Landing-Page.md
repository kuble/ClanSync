# 01 Landing Page · 랜딩

> **D-LANDING-01** (DECIDED 2026-04-20, 잠정) — 현재 헤드라인 유지. Phase 2+ 재검토 포인트. [decisions.md §D-LANDING-01](../decisions.md#d-landing-01--랜딩-캐치프라이즈-최종-문구-잠정).  
> **D-LANDING-02** (DECIDED 2026-04-20) — Phase 1/2는 KR 전용. EN/JP 버튼은 시각 + "준비 중" 토스트. 실제 i18n은 Phase 3+. [§D-LANDING-02](../decisions.md#d-landing-02--다국어-활성-시점과-범위).  
> **D-LANDING-03** (DECIDED 2026-04-20) — 약관 3종 정적 MDX + `/contact`는 내부 폼(`contact_requests` 테이블). [§D-LANDING-03](../decisions.md#d-landing-03--약관개인정보api-tos문의-페이지-구현-방식).  
> **D-LANDING-04** (DECIDED 2026-04-20) — 로그인된 사용자의 `/` 진입은 **`/games` 자동 리다이렉트**(`?from=logo` · 앵커 포함은 건너뜀). [§D-LANDING-04](../decisions.md#d-landing-04--로그인된-사용자의-랜딩-진입-처리).

## 한 줄 요약
서비스를 처음 접하는 비로그인 사용자에게 ClanSync가 무엇인지 보여주고 로그인/가입으로 유도하는 첫 화면.

## 누가 / 언제 본다
- **비로그인 사용자** — 외부 링크·검색·홍보를 통한 첫 진입점.
- 로그인된 사용자는 **`/games` 로 자동 리다이렉트**(D-LANDING-04). 단, 로고 클릭(`?from=logo`) 또는 내부 앵커(`#features`·`#games`·`#pricing`) 포함 진입은 예외(의도적 재방문 존중).

## 화면 진입 조건
- 잠금 없음. 누구나 진입 가능.
- **로그인 세션 가드** (D-LANDING-04):
  - 비로그인 → 랜딩 그대로 렌더.
  - 로그인 + 쿼리/해시 없음 → 서버 컴포넌트에서 `redirect("/games")`(SSR 리다이렉트, 랜딩 히어로 깜빡임 없음).
  - 로그인 + `?from=logo` 또는 `#section` 포함 → 랜딩 그대로 렌더.

## 사용자 흐름
1. 진입 → 상단 nav + Hero에서 가치 제안 확인
2. Hero·우상단의 "로그인" 또는 "가입하기" 클릭
3. 또는 nav 앵커(`#features`, `#games`, `#pricing`)로 페이지 내 스크롤 탐색
4. 미리보기 캐러셀·기능·게임·요금제·푸터까지 단방향 스크롤

## 화면 구성

```
[Navbar]
  로고  |  지원 기능  지원 게임  가격  |  KR EN JP  |  로그인  가입하기

[Hero]
  타이틀: Archive Your History, **Stay in Sync**
  부제:   추억을 기록하고 클랜을 체계적으로 관리하세요.
  CTA:    [로그인]  [가입하기 ›]

[Preview Carousel]
  슬라이드 2장 자동 전환 (3.5초 간격)
  · CLAN DASHBOARD · DUMMY DATA  / clansync.gg/clan/dashboard
  · GAME DASHBOARD · DUMMY DATA  / clansync.gg/game/dashboard
  도트 인디케이터 클릭으로 수동 전환

[#features 지원 기능]
  카드 7개 슬라이더 + 도트 페이지네이션
  반응형 페이지 크기 3 / 2 / 1 (PC / 태블릿 / 모바일)
  카드 호버 시 자동 슬라이드 정지

[#games 지원 게임]
  타일: Overwatch (1.2K ACTIVE CLANS) · Valorant (지원 예정)
       · LoL (지원 예정) · + MORE GAMES (요청 검토)

[#pricing 요금제]
  Free   ₩0      / 회원가입 무료 / 기본 기능 리스트
  Premium ₩9,900 / 클랜당 월     / + 밴픽, 승부예측, AI 자동 밸런스 등

[Footer]
  이용약관 · 개인정보처리방침 · 게임사 API ToS · 문의하기
  © 2026 ClanSync...
  "ClanSync는 Blizzard Entertainment와 공식 제휴 관계가 아닙니다."
```

### 모달·드로어
- 없음.

## 버튼·입력·링크가 하는 일

| 요소 | 위치 | 동작 |
|------|------|------|
| 로고 (좌상단) | Navbar | `/` 새로고침 (자기 자신) |
| KR / EN / JP | Navbar | Phase 1/2: 시각적 active만. EN/JP 클릭 시 **"English/日本語 지원은 준비 중입니다"** 토스트(3s, D-LANDING-02). Phase 3+에 EN → JP 순서로 실제 활성화 |
| 로그인 (우상단) | Navbar | `/sign-in`으로 이동 |
| 가입하기 (우상단) | Navbar | `/sign-up`으로 이동 |
| Hero CTA "로그인" | Hero | `/sign-in` |
| Hero CTA "가입하기 ›" | Hero | `/sign-up` |
| 미리보기 도트 | Carousel | 해당 슬라이드로 점프, 자동 전환 일시정지 |
| 기능 카드 | features | 호버 시 설명 패널. 클릭 액션 없음 |
| 게임 타일 | games | 클릭 액션 없음 (정보 표시) |
| 요금제 CTA (없음) | pricing | 별도 CTA 없음. 본문 텍스트만 |
| 푸터 링크 | Footer | Phase 1은 `href="#"` 자리표시자 + `title` 툴팁("Phase 2+ 구현"). Phase 2+ 목적지 — `/terms`·`/privacy`·`/api-tos`(정적 MDX) · `/contact`(내부 폼, `contact_requests` 테이블 INSERT) (D-LANDING-03) |

## 상태별 화면

| 상태 | 처리 |
|------|------|
| 첫 진입 | Hero → 캐러셀 자동 시작 |
| 캐러셀 호버 | 자동 슬라이드 정지 |
| 좁은 화면 (≤980px) | nav 중앙 링크 숨김, 우측 CTA만 |
| 모바일 | 전체 1단 스택. 슬라이더 1열 |
| 빈/에러 | 정적 페이지라 해당 없음 |

## 권한·구독에 따른 차이
- 없음. 누구에게나 동일.
- (요금제 카드의 "Premium" 항목은 안내일 뿐, 가입 후 클랜 단위로 적용)

## 데이터·연동
- 정적 카피 중심. 서버 호출 없음.
- **세션 가드**(D-LANDING-04): 페이지 컴포넌트(Server Component)에서 `cookies()` 로 세션 확인 후 조건부 `redirect("/games")`. 미들웨어 레벨에서는 처리하지 않는다(크롤러·OG 카드 이미지 생성·SEO 회피).
- **다국어**(D-LANDING-02): Phase 1/2는 `lang="ko"` 고정. `users.language` enum 컬럼은 스키마에 남기되 Phase 3+까지 DEFAULT `'ko'`·변경 UI 없음.
- **푸터 링크**(D-LANDING-03): Phase 2+에 `/terms`·`/privacy`·`/api-tos` 정적 MDX + `/contact` 폼(→ `contact_requests` 테이블). 스팸 방지(Captcha·rate limit·honeypot) 필수.

## 목업과 실제 구현의 차이
- 목업 푸터 링크는 `href="#"` 유지 + `title` 툴팁으로 "Phase 2+ 구현" 안내(D-LANDING-03).
- 목업에서는 세션이 없으므로 `?simulate=logged_in` 쿼리 진입 시 `games.html`로 `location.replace` 시뮬레이션(D-LANDING-04).
- "1.2K ACTIVE CLANS" 같은 숫자는 카피용. 실제 구현 시 서버에서 값을 내려받을지(라이브 카운터) vs 정적 카피로 둘지 결정.
- 다국어 버튼은 시각적 active만 토글 + EN/JP 클릭 시 "준비 중" 토스트(D-LANDING-02).

## 결정 필요
- ~~D-LANDING-01 캐치프라이즈 최종 문구~~ — **DECIDED (잠정) 2026-04-20**. Phase 2+ 재검토.
- ~~D-LANDING-02 다국어(KR/EN/JP) 활성 시점·범위~~ — **DECIDED 2026-04-20**. Phase 1/2 KR 전용.
- ~~D-LANDING-03 약관·개인정보·문의 링크의 실제 페이지~~ — **DECIDED 2026-04-20**. 약관 정적 MDX + `/contact` 내부 폼.
- ~~D-LANDING-04 이미 로그인된 사용자 진입 시 자동 이동 여부~~ — **DECIDED 2026-04-20**. `/games` 자동 리다이렉트(쿼리·앵커 예외).

## 구현 참고 (개발자용)

- 목업 파일: `mockup/pages/index.html`
- 캐러셀 함수: `setPreviewSlide(index)`, 자동 전환 3500ms
- 기능 슬라이더 페이지네이션: `#feature-pagination` (반응형 페이지 크기 3 / 2 / 1)
- 게임 슬라이더: `#games-pagination`
- CSS만 존재 / 마크업에 없는 요소: `.hero-tag`
- 외부 의존성 없음 (정적 HTML)

## 연관 문서
- [pages.md](../pages.md)
- [slices/slice-01-routing-shell.md](../slices/slice-01-routing-shell.md)
- [BACKLOG.md](../BACKLOG.md) → 캐치프라이즈 항목은 [decisions.md](../decisions.md) D-LANDING-01로 이전
- [glossary.md](../glossary.md)
