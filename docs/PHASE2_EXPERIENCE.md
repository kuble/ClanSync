# Phase 2 체감 로드맵 (사람용 보조 트랙)

> **운영 문서**: [TODO_Phase2.md](./TODO_Phase2.md) (마일스톤 체크·라우트 표·공통 게이트).  
> 이 문서는 **매 마일스톤마다 무엇이 눈에 달라지는지**를 사람 언어로 정리한 보조 트랙이다. 에이전트가 실구현 시 읽을 필요가 없으며, 마일스톤 시연·리뷰·릴리즈 노트 시점에만 열면 된다.

## 별명 표

| 기술 | 별명 | 한 줄 |
|------|-----|------|
| M0 | 지도 펴는 날 | 로드맵·폴더 정리, 화면 변화 없음 |
| M1 | DB가 숨 쉬는 날 | 눈에는 안 보여도 Supabase Studio에서 테이블이 생기고 `?role=` 쿼리가 떨어진다 |
| **M2** | **첫 로그인이 뚫리는 날** | **실 이메일로 회원가입 → 로그인 → `/games` 진입. 첫 진짜 데모** |
| M3 | 클랜에 들어가는 날 | 게임 인증 → 클랜 검색 → 가입 신청. 다른 계정과 엮이기 시작 |
| M4 | 내 클랜 홈이 생기는 날 | 사이드바·탭·역할별 다른 화면 |
| **M5** | **나를 꾸미는 날** | **프로필·네임플레이트·뱃지 — 집중 폴리시 #1** |
| M6a | 숫자가 보이는 날 | 월간/연간 통계·HoF |
| M6b | 클랜을 굴리는 날 | 일정·관리·스토어(운영자 워크플로) |
| M6c | 한 판 돌리는 날 | 밸런스메이커·밴픽·예측 |
| M7 | 밖과 만나는 날 | 홍보·LFG·클랜 순위 (외부 클랜·플레이어) |
| **M8** | **한 바퀴 돈 날** | **Phase 2 감사 · Phase 2+ 이관 — 집중 폴리시 #2** |

## 데모 시나리오 30초 (마일스톤별)

### M1 — DB가 숨 쉬는 날

화면 변화 없음. 대신 다음 2가지로 체감.

1. Supabase Studio(또는 `supabase status`) 열기 → `users` · `user_game_profiles` · `games` · `clans` · `clan_members` 5개 테이블이 빈 상태로 존재.
2. `npm run dev` 후 `/?role=leader&plan=premium` 접속 → 미들웨어가 두 쿼리를 드롭해 URL이 `/`만 남는 것 확인 (**D-SHELL-02**).

**PR preview URL**: Vercel 연결이 M1에서 자동화되면 이후 모든 시나리오에 공유용 URL이 자동 발급된다.

### M2 — 첫 로그인이 뚫리는 날

1. 시크릿 창 `/` 접속 → "시작하기" CTA
2. `demo+a@clansync.test` / `correcthorsebatterystaple` 가입 (비번 ≥12자 **D-AUTH-03**)
3. 자동 로그인 → `/games` 진입. 게임 카드 3장 전부 "빨강 ● 계정 미연동" (**D-AUTH-01** #1)
4. 로그아웃 → 재로그인, 자동 로그인 30일 체크박스 (**D-AUTH-07**)
5. 잠금 확인: 틀린 비번 5회 연속 → 15분 잠금 (**D-AUTH-06**, UI는 동일 문구)

### M3 — 클랜에 들어가는 날

두 창 동시 운영. A(방금 가입 · 클랜 없음) · B(기존 클랜 officer).

1. A: `/games` → LoL 카드 → OAuth(모의) → `/games/lol/clan`
2. A: "드래곤테이머즈" 검색 → 드로어 → 가입 신청 (**D-CLAN-01** 검색 · **D-CLAN-02** 상태 pending)
3. B: `/games/lol/clan/[id]/manage` 가입 요청 탭에서 A 보임 → 승인
4. A: 새로고침 → `/games/lol/clan/[id]`로 자동 라우팅 (**D-AUTH-01** #6)

### M4 — 내 클랜 홈이 생기는 날

A(member) · B(officer)가 같은 `/games/lol/clan/[id]` 진입.

- A: 사이드바에 "관리" 메뉴 숨김 / B: 노출 (**D-PERM-01**)
- B: 가입 요청 도착 시 사이드바 알림 점 (**D-SHELL-03**)
- A/B 양쪽 `?role=leader` 붙여도 middleware가 제거 (**D-SHELL-02**)
- 탭 5개(`balance`·`stats`·`events`·`manage`·`store`)는 스텁이지만 URL·레이아웃 유지

### M5 — 나를 꾸미는 날 (집중 폴리시 #1)

1. `/profile` 네임플레이트 케이스에서 3슬롯 중 1개 교체 → `/games/lol/clan/[id]` 대시보드 네임카드에 즉시 반영 (브로드캐스트 재설계본)
2. 뱃지 케이스 5슬롯 dense-from-front (**D-PROFILE-03**)
3. 스토어에서 새 네임플레이트 구매(모의) → 케이스에 즉시 해금 (**D-PROFILE-04**)

### M6a — 숫자가 보이는 날

member로 `/games/lol/clan/[id]/stats` 월간/연간 탭. 내전 결과 샘플 3건을 심어 두고, 접속 시 **D-STATS-03** DAU 카운트가 올라가는 것을 Supabase 쿼리로 확인.

### M6b — 클랜을 굴리는 날

- officer: `/events`에서 내전 등록 → 디스코드 웹훅(모의) 발사 (**D-EVENTS-03**)
- leader: `/manage`에서 휴면 멤버 일괄 강퇴 (**D-MANAGE-02**)
- member: `/store`에서 개인 코인 아이템 구매 → 코인 적립/차감 트리거 매트릭스 (**D-STORE-01**)

### M6c — 한 판 돌리는 날

officer 세션 시작 → 10명 배치 → M점수 기반 팀 제안 → 맵 밴 룰렛 → 결과 입력 → member 다음 로그인 시 승부예측 정산 팝업 1회(또는 Phase 2+ placeholder).

### M7 — 밖과 만나는 날

member로 `/games/lol`(MainGame) 접속.

- 홈 탭: 홍보·LFG·순위 미리보기 카드
- 홍보 탭: 외부 클랜 카드 → 드로어 → 가입 신청 (**D-RANK-01**)
- LFG 탭: 모집 올리기 → 신청자 N명 pill(Phase 1에 붙은 UI)이 실제 DB 카운트로 갱신 (**D-LFG-01**)
- 스크림 탭: "Phase 2+ 예정" 안내 화면만

### M8 — 한 바퀴 돈 날 (집중 폴리시 #2)

Phase 1 감사([AUDIT-Phase1-2026-04-21.md](./AUDIT-Phase1-2026-04-21.md)) 포맷 복제. Vercel `main` preview = 스테이징 데모 URL.

## 라우트 라이브 상태

🟥 목업만 · 🟧 스텁만 · 🟩 라이브 · 🟦 Phase 2+ 보류

| 경로 | 마일스톤 | 상태 |
|------|---------|------|
| `/` | M0 스텁 → M2 | 🟩 |
| `/sign-in` | M2 | 🟩 |
| `/sign-up` | M2 | 🟩 |
| `/games` | M2 | 🟩 |
| `/games/[g]/auth` | M3 | 🟥 |
| `/games/[g]/clan` | M3 | 🟥 |
| `/games/[g]/clan/[id]` | M4 | 🟥 |
| `/games/[g]/clan/[id]/balance` | M6c | 🟥 |
| `/games/[g]/clan/[id]/stats` | M6a | 🟥 |
| `/games/[g]/clan/[id]/events` | M6b | 🟥 |
| `/games/[g]/clan/[id]/manage` | M6b | 🟥 |
| `/games/[g]/clan/[id]/store` | M6b | 🟥 |
| `/games/[g]` 홈·홍보·LFG·순위 | M7 | 🟥 |
| `/games/[g]` 스크림 탭 | Phase 2+ | 🟦 |
| `/games/[g]/board/[postId]` | Phase 2+ | 🟦 |
| `/profile` | M5 | 🟥 |

매 마일스톤 완료 시 해당 행을 🟩으로 갱신.

## 집중 폴리시 구간

- **M5 프로필·꾸미기** — 인터랙션·애니메이션·배치 감각. 여기서 공들인 디테일이 M6c 밴픽·M7 홍보 카드에 전염된다.
- **M8 종료 감사** — 일관성·타이포·색·간격 정돈(Design System 차원).

그 외 모든 마일스톤은 [TODO_Phase2.md](./TODO_Phase2.md) "UI/UX 게이트 3"을 통과해야 한다 — 키보드 온리 플로우·3폭(375/768/1280) 반응형·로딩/에러/빈 상태.

## 미리보기 URL 운영

- Vercel 프로젝트 연결은 **M1 인프라**에서 수행(`vercel link` + GitHub 연동).
- PR마다 자동 preview URL 발급 → 각 마일스톤 데모 시나리오에 공유.
- `main` 브랜치 = 실질 스테이징 데모.
- 환경 변수는 Vercel → Settings → Environment Variables에서 Preview/Production 분리.
