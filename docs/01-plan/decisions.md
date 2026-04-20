# 결정 필요 항목 인덱스 (Decisions)

> 페이지 문서들에서 발견된 "확정 안 된 규칙·정책"을 한 곳에 모은다. 페이지 문서 본문에서는 `D-XXX-NN` 코드만 참조하고, 결정 시 여기서 닫는다.
>
> [BACKLOG.md](./BACKLOG.md)의 미결 항목도 점진적으로 이쪽으로 이전한다.

## 사용 규칙

- 항목은 **카테고리별 코드** (예: `D-AUTH-01`)로 식별. 한 번 부여된 코드는 재사용하지 않는다.
- 상태: `OPEN` (논의 중) / `DECIDED` (결정 완료, 결정 내용 함께 적기) / `DROPPED` (결정 불필요로 판단).
- 결정 시: "결정" 칸을 채우고, 영향받는 페이지 문서/슬라이스/PRD를 같은 PR에서 함께 갱신한다.

---

## 인증 · 온보딩 (AUTH)

| 코드 | 상태 | 항목 | 메모 / 영향 문서 |
|------|------|------|------------------|
| D-AUTH-01 | DECIDED (2026-04-20) | 게임 인증 + 클랜 소속 상태에 따른 라우팅 룰 | 6칸 매트릭스 확정. 아래 [DECIDED §D-AUTH-01](#d-auth-01--게임-인증--클랜-소속-라우팅-매트릭스) 참고. 영향: `pages.md`, `pages/04~06`, `games.html`, `game-auth.html` |
| D-AUTH-02 | DECIDED (2026-04-20) | 게임별 OAuth 분기. 발로란트/LoL 진입 시 `game-auth` 화면 분기 | 게임 슬러그 → 제공자 매핑 표 확정. 아래 [DECIDED §D-AUTH-02](#d-auth-02--게임별-oauth-제공자-매핑) 참고 |
| D-AUTH-03 | DECIDED (2026-04-20) | 비밀번호 정책 클라이언트 강제 시점, 만 10세 룰의 의미 | 비번 **strong 강제**(영+숫+특, 8~72자). 출생연도 `currentYear-10` 상한 **유지**(만 10세 미만 차단). 만 14세 미만은 법정대리인 동의 UI 필요 — Phase 2+ 이관. [§D-AUTH-03](#d-auth-03--비밀번호-정책과-최저-가입-연령) |
| D-AUTH-04 | DECIDED (2026-04-20) | 비밀번호 찾기 플로우 (메일 발송 → 재설정 화면) | Supabase 재설정 메일 + 토큰 **1시간** 유효. rate limit 60초/24h 5회. 이메일 존재 여부 노출 금지(중립 카피). [§D-AUTH-04](#d-auth-04--비밀번호-찾기-플로우) |
| D-AUTH-05 | DECIDED (2026-04-20) | Discord OAuth 권한 범위 (식별만? 길드 정보 읽기?) | scope **`identify email`** 만. 클랜↔Discord 연동(알림·역할 동기화 등)은 **별도 Bot OAuth**로 분리(D-EVENTS-03). [§D-AUTH-05](#d-auth-05--discord-oauth-scope) |
| D-AUTH-06 | DECIDED (2026-04-20) | 로그인 실패 잠금 정책 (몇 회 실패 시 몇 분 잠금) | **IP+email 5회 연속 실패 → 15분 잠금**. 성공 시 리셋. 감사 테이블 `auth_failed_logins` 신설. [§D-AUTH-06](#d-auth-06--로그인-실패-잠금-정책) |
| D-AUTH-07 | DECIDED (2026-04-20) | 자동 로그인 토글의 출입증 유지 기간 | **OFF 24h · ON 30d**(슬라이딩 연장). 비번 변경·로그아웃·정지 시 전 세션 즉시 무효화. [§D-AUTH-07](#d-auth-07--자동-로그인-유지-기간) |

## 클랜 · 가입 (CLAN)

| 코드 | 상태 | 항목 | 메모 / 영향 문서 |
|------|------|------|------------------|
| D-CLAN-01 | DECIDED (2026-04-20) | 클랜 검색·필터의 서버/클라 분담 + 페이지 사이즈 | 페이지 사이즈 5 유지. Phase 1 = 클라 필터링, Phase 2+ = 서버 페이징·인덱스. [§D-CLAN-01](#d-clan-01--클랜-목록-검색필터페이지네이션-분담) |
| D-CLAN-02 | DECIDED (2026-04-20) | 가입 신청 상태 머신, 중복 신청 정책, 취소 가능 시점 | 분리 테이블 `clan_join_requests` 신설. 게임당 단일 신청. pending 동안 항상 취소 + 거절 후 즉시 재신청. [§D-CLAN-02](#d-clan-02--가입-신청-상태-머신과-중복정책) |
| D-CLAN-03 | DECIDED (2026-04-20) | 클랜 라이프사이클 — 정책 위반·휴면·부실 분류와 처리 | 3분류(`violating/dormant/stale`). 신고는 자동 임계 없이 운영진 직접 판단. 휴면 60d→숨김·+90d→삭제. 부실 30d→삭제. [§D-CLAN-03](#d-clan-03--클랜-라이프사이클--정책-위반·휴면·부실-처리) |
| D-CLAN-04 | DECIDED (2026-04-20) | 클랜 만들기 폼 제출 payload | 클랜명 24자, `style` enum, `tier_range text[]` (8티어), `min_birth_year int`, age_range 제거, 클랜 자유 태그 입력. [§D-CLAN-04](#d-clan-04--클랜-만들기-폼-payload-스키마-정합) |
| D-CLAN-05 | DECIDED (2026-04-20) | 지향 단일 칩 "다시 누르면 해제" 동작 | 해제 허용 — 지향은 선택 사항. `style` nullable. [§D-CLAN-05](#d-clan-05--지향-단일-칩-해제-허용) |
| D-CLAN-06 | DECIDED (2026-04-20) | 클랜 인원 상한 / Premium 인원 차별 여부 | 200명 유지 (Free·Premium 동일). 인원 차별화 없음, Premium은 기능으로만 차별화. [§D-CLAN-06](#d-clan-06--인원-상한-200-유지-premium-인원-차별화-없음) |
| D-CLAN-07 | DECIDED (2026-04-20) | 클랜 멤버 활성도 분류와 휴면 멤버 처리 | 활성<30d / 비활성 30~60d / 휴면 60d+. 광범위 활동(로그인+내전+게시글+관리). 휴면은 한도 외(활성+비활성만 200). 자동 탈퇴 없음 + 클랜장 알림 + 일괄 수동 탈퇴. [§D-CLAN-07](#d-clan-07--클랜-멤버-활성도-분류와-휴면-멤버-처리) |

## 클랜 메인 · 셸 (SHELL)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-SHELL-01 | DECIDED (2026-04-20) | 사이드바 hover 확장 동작의 모바일 대응 (모바일은 드로어 패턴) | 중단점 **768px** 고정. 데스크톱 ≥769px = hover 확장(기본 64px → 220px, 본문 margin-left 64px 고정). 모바일 ≤768px = 햄버거 → 좌측 드로어(`min(248px, 76vw)`). 닫기 트리거 4종(오버레이·Esc·내부 항목 클릭·리사이즈 769+). `aria-expanded`·`aria-label` 동기화, 오픈 시 body 스크롤락. Phase 2+에서 focus trap 추가. [§D-SHELL-01](#d-shell-01--사이드바-반응형-패턴-데스크톱-hover--모바일-드로어) |
| D-SHELL-02 | DECIDED (2026-04-20) | `?role=` `?plan=` 쿼리 우회 가능 여부 (목업·디버그 전용 vs 운영 차단) | 운영 단일 출처는 **서버 세션 + DB RLS**. `?role=`·`?plan=`·`?hubDebug=1`·`?simulate=logged_in`·`?sidebarNotifyDebug=*`·`?balanceSession=*` 6종은 **미들웨어가 정화**(제거 후 302 redirect). 디버그 계열은 `NEXT_PUBLIC_DEBUG_QUERY=1` **+ admin 세션** 동시 충족에만 해석, 사용 시 `audit_debug_queries` 감사 기록. `/mockup/*`는 운영 빌드에서 제외. [§D-SHELL-02](#d-shell-02--권한디버그-쿼리-우회-차단-정책) |
| D-SHELL-03 | DECIDED (2026-04-20) | 사이드바 알림 점 트리거 규칙 | `#dash` 알림 점 없음(허브 중복 방지). `#balance` = 진행 중 내전 세션 수. `#events` = 24h 내 RSVP 미응답 + 진행 중 투표 미응답. `#manage` = 가입 요청 pending + 신규 휴면 진입(D-CLAN-02·07). balance/events는 뷰 진입 시 자동 clear, manage는 데이터로만 clear. [§D-SHELL-03](#d-shell-03--사이드바-알림-점-트리거-규칙) |

## 이벤트 · 일정 (EVENTS)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-EVENTS-01 | OPEN | 스크림 확정 → 클랜 이벤트 자동 생성 트리거·중복·취소 동기화 규칙 | 목업은 안내 카피만 있고 매칭 로직 없음 |
| D-EVENTS-02 | OPEN | 일정 반복 종료 조건 (횟수 / 종료일) | 목업은 반복 종류만 4가지 (`없음/매주/매월/격주`), 종료 조건 없음 |
| D-EVENTS-03 | OPEN | 일정 알림 채널 (카카오/디스코드) 발송 시점·실패 시 재시도 | 목업 캘린더 범례에 "알림은 연동 후" 명시 |
| D-EVENTS-04 | OPEN | 투표 알림 반복(`마감 전까지 매일`) ↔ 마감일과의 일관성 검증 | 목업은 미검증 |
| D-EVENTS-05 | OPEN | 대진표(Bracket) 결과의 클랜 통계·코인 반영 여부 | Premium 기능, 결과 활용 미정의 |

## 클랜 관리 (MANAGE)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-MANAGE-01 | DECIDED (2026-04-20) | 구독·결제 탭 접근 권한 | officer는 **열람**(금액·일시 포함). **플랜 변경·결제 수단·환불·영수증 상세·환불**은 leader 전용. [§D-MANAGE-01](#d-manage-01--구독결제-탭-접근-권한) |
| D-MANAGE-02 | DECIDED (2026-04-20) | 구성원 개인 상세 편집 권한 + 휴면 일괄 강퇴 | 역할 변경·officer 강퇴·휴면 일괄 강퇴·leader 위임은 **leader 전용**. member 강퇴·가입 요청 승인/거절은 officer 허용. **M점수 편집**은 **클랜 설정 토글**(`allow_officer_edit_mscore`, 기본 false → leader만) 기반. [§D-MANAGE-02](#d-manage-02--구성원-개인-상세-편집-권한과-m점수-토글) |
| D-MANAGE-03 | DECIDED (2026-04-20) | 부계정 조회 정책 | 자기신고 방식 유지. 조회 범위는 **클랜 설정 토글**(`alt_accounts_visibility`, 기본 `officers`). 추가 시 "클랜 소속 시 공개됨" 고지 필수. 증빙 API는 Phase 2+ 재검토, 문제 신고는 D-CLAN-03 흐름 흡수. [§D-MANAGE-03](#d-manage-03--부계정-조회-정책과-공개-범위-토글) |
| D-MANAGE-04 | DECIDED (2026-04-20) | 클랜 배너·아이콘 업로드 제약 | 배너 **3MB** / 아이콘 **2MB**. MIME `image/jpeg·png·webp`. 애니메이션 불가. 서버 자동 리사이즈·썸네일. [§D-MANAGE-04](#d-manage-04--클랜-배너아이콘-업로드-제약) |

## 스토어 · 코인 (STORE)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-STORE-01 | DECIDED (2026-04-20) | 클랜 코인·개인 코인의 적립/차감 트리거 매트릭스 | 개인 풀·클랜 풀 **이전 금지**. 개인 적립: 내전 출전/승리/MVP·출석·이벤트·승부예측. 개인 차감: 개인 꾸미기·store 뱃지. 클랜 적립: 스크림 완료·대진표·신규 가입자(월 상한 500)·Premium 월 보너스. 클랜 차감: 클랜 꾸미기·홍보 상단 고정·대진표 개최. 멱등성 키 필수, `coin_transactions` INSERT-only. [§D-STORE-01](#d-store-01--코인-적립차감-트리거-매트릭스) |
| D-STORE-02 | DECIDED (2026-04-20) | Premium 잠금 카드의 업그레이드 안내 동선 | Premium 카드 클릭 → **플랜 비교 모달 + "클랜장에게 문의하세요" 카피**(요청 플로우·알림 없음). leader/officer는 모달에서 `#subscription` 탭 이동 CTA 추가. member는 정보 표시만. [§D-STORE-02](#d-store-02--premium-잠금-카드의-업그레이드-안내-동선) |
| D-STORE-03 | DECIDED (2026-04-20) | 구매 후 환불·되돌리기 정책 | **환불 없음 원칙** + 시스템 오류 자동 롤백 + **운영자 재량 정정**(반대 부호 `coin_transactions` + `correction_of`). 자기 계정 정정 금지, 감사 로그 필수, 월 정정 리포트. `purchases.voided_at`·`voided_by`·`void_reason` 추가. [§D-STORE-03](#d-store-03--환불되돌리기-정책) |

## 메인 게임 허브 (MAINGAME)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-LFG-01 | OPEN | LFG 신청 후 상태(applied/accepted/canceled) UI · 본인 화면 표시 | 목업은 `submitLfgApply`가 alert만 |
| D-RANK-01 | OPEN | 클랜 홍보 정렬의 "인기" 기준 (조회수 필드 부재) | 목업 `setPromoSort('popular')` 호출 시 NaN 위험 |
| D-SCRIM-01 | OPEN | 스크림 채팅 자동 종료 시점(목업: 시작 +6h)의 운영 정책 확정 | |
| D-SCRIM-02 | OPEN | 스크림 양측 운영진 확정 동시성 처리 (한쪽만 확정한 상태에서 일정 변경) | 목업은 alert만 |

## 프로필 · 꾸미기 (PROFILE)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-PROFILE-01 | DECIDED (2026-04-20) | 프로필에서 고른 네임플레이트가 BalanceMaker 매치 슬롯에 전파되는 규약 (공통 셀렉터/이벤트) | 셀렉터 `[data-nameplate-preview="{game}"]` + 본인 구독용 `[data-nameplate-self]`. 저장 `localStorage` `clansync-mock-nameplate-state-v1`, 이벤트 `clansync:nameplate:changed`. 같은 탭 내부만 즉시 반영. [§D-PROFILE-01](#d-profile-01--네임플레이트-동기화-규약) |
| D-PROFILE-02 | DECIDED (2026-04-20) | "가입 신청 대기 목록" 데이터 출처·취소 액션 | `clan_join_requests` (D-CLAN-02)에서 본인 `status IN ('pending','approved','rejected')` 필터. pending 항시 노출, approved/rejected는 **7일 후 자동 숨김**. pending 일 때만 "취소" 가능. [§D-PROFILE-02](#d-profile-02--가입-신청-대기-목록-데이터-출처) |
| D-PROFILE-03 | DECIDED (2026-04-20) | 뱃지 케이스 ↔ 프로필 스트립 동기화 (모달에서 고른 5개가 메인 카드에 반영) | **compact** 픽(5슬롯, dense-from-front · 해제 시 뒤 항목 앞으로 shift). 셀렉터 `[data-badge-strip="{game}"]` + `[data-badge-strip-slot="{i}"]`, 본인 구독 `[data-badge-strip-self]`. 저장 `localStorage` `clansync-mock-badge-picks-v1`, 이벤트 `clansync:badge:picks:changed`. [§D-PROFILE-03](#d-profile-03--뱃지-케이스--프로필-스트립-동기화) |
| D-PROFILE-04 | DECIDED (2026-04-20) | 뱃지 해금 출처 (스토어 / 업적 / 이벤트) 정의 | `badges.unlock_source enum('achievement','event','store')` + `unlock_condition jsonb` + `linked_id uuid NULL`. store 구매는 **개인 코인만**(클랜 코인 불가). 카테고리 × 출처는 독립 축. [§D-PROFILE-04](#d-profile-04--뱃지-해금-출처) |

## 랜딩 · 마케팅 (LANDING)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-LANDING-01 | DECIDED (2026-04-20, 잠정) | 랜딩 캐치프라이즈 최종 문구 | **현재 헤드라인 유지**(`Archive Your History, Stay in Sync` + "추억을 기록하고 클랜을 체계적으로 관리하세요."). Phase 2+ 구현 완료 후 **재검토 포인트**로 남김. [§D-LANDING-01](#d-landing-01--랜딩-캐치프라이즈-최종-문구-잠정) |
| D-LANDING-02 | DECIDED (2026-04-20) | 다국어(KR/EN/JP) 활성 시점·범위 | Phase 1은 **KR 전용**. EN/JP 버튼은 시각적 토글 + 클릭 시 **"준비 중" 안내 토스트**. 실제 i18n 도입은 **Phase 3+** (우선순위 EN → JP). [§D-LANDING-02](#d-landing-02--다국어-활성-시점과-범위) |
| D-LANDING-03 | DECIDED (2026-04-20) | 약관·개인정보·게임사 API ToS·문의 실제 페이지 | 약관 3종(`/terms`·`/privacy`·`/api-tos`)은 **정적 MDX**. 문의만 **내부 폼** `/contact` → `contact_requests` 테이블 INSERT. Captcha·rate limit 의무. Phase 2+ 관리자 콘솔에서 열람·답변. [§D-LANDING-03](#d-landing-03--약관개인정보api-tos문의-페이지-구현-방식) |
| D-LANDING-04 | DECIDED (2026-04-20) | 로그인된 사용자의 랜딩 진입 처리 | **`/games` 자동 리다이렉트** (SPA `history.replaceState`, 뒤로가기 시 `/` 재방문 방지). 단, `?from=logo` 또는 `#` 앵커 포함 진입은 **리다이렉트 건너뜀**(의도적 재방문 존중). [§D-LANDING-04](#d-landing-04--로그인된-사용자의-랜딩-진입-처리) |

## 통계 · 명예의 전당 (STATS)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-STATS-01 | OPEN | HoF 설정 권한 (운영진+ 전체 vs 클랜장 전용) | 목업은 운영진+로 노출 |
| D-STATS-02 | OPEN | 경기 기록의 사후 정정 권한·이력 보존 정책 | 목업은 정정 UI 없음 |
| D-STATS-03 | OPEN | "앱 이용 횟수" 측정 단위 정의 (세션 / 페이지뷰 / 액션) | 목업 카피 "정의는 구현 시 확정" |
| D-STATS-04 | OPEN | CSV 내보내기·기간 필터 도입 여부 | 목업 각주에만 언급 |

## 경제 · 코인 (ECON)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-ECON-01 | DECIDED (2026-04-20) | 클랜 코인 구체적 수치 (지급량, 가격) | Phase 1 베이스라인 확정. 개인 일일 적립 상한 **200**(이벤트 제외), 클랜 일일 적립 상한 **2,000**. 내전 출전 +10 / 승리 +20 / MVP +30, 스크림 완료 +100, 대진표 우승 +1,000, 가격 목록은 §D-ECON-01 표. 운영 전 A/B 튜닝 예정. [§D-ECON-01](#d-econ-01--코인-수치-베이스라인) |
| D-ECON-02 | DECIDED (2026-04-20) | 운영진 부정 코인 세탁 방지 정책 | ① 풀 간 이전 완전 금지. ② `coin_transactions` INSERT-only(RLS로 UPDATE/DELETE 차단). ③ 1회 500 이상 클랜 풀 지출은 **2-man rule**(Phase 2+). ④ 클랜장 교체 후 **72h 지출 동결**. ⑤ 의심 패턴 자동 flag + 일시 동결(Phase 2+). ⑥ `purchases.pool_source`·`approved_by` 기록. [§D-ECON-02](#d-econ-02--코인-세탁-방지-정책) |
| D-ECON-03 | DECIDED (2026-04-20) | 클랜 순위표 민감 지표 포함 여부 | **외부 공개 순위표에서 경쟁 지표 전면 제외**(승률·K/D·MVP 수 등). 공개 지표는 활동성·규모·매너 점수·이벤트 참여만. 경쟁 지표는 **운영진+ 내부 화면**(클랜 관리·HoF)에만. [§D-ECON-03](#d-econ-03--클랜-순위표-민감-지표-노출-범위) |
| D-ECON-04 | DECIDED (2026-04-20) | 특이사항 태그 세부 기준 | **자동 산정 전용**(수동 태깅 없음). Phase 1 초기 카탈로그 13종(`streak_lose_3/4/5`·`streak_win_3/5`·`slump`·`hot_streak`·`map_expert`·`map_rookie`·`mvp_hot`·`no_show`·`no_show_repeat`·`new_clan_week`). 본 클랜 내전만 집계, 경기 종료 시·일일 배치 재계산. tone `good/bad/neutral`. [§D-ECON-04](#d-econ-04--특이사항-태그-카탈로그) |

---

## 결정 완료 (DECIDED)

> 결정된 항목은 이 절로 옮기고 결정 일자·내용·관련 PR/문서를 함께 적는다.

### D-AUTH-01 — 게임 인증 × 클랜 소속 라우팅 매트릭스

- **결정일**: 2026-04-20
- **요지**: 게임 슬러그 단위(`/games/[gameSlug]/...`)로 진입 시도가 들어오면 아래 우선순위로 가드한다. 첫 번째 위반에서 fallback 라우트로 자동 이동(= 리다이렉트).

**가드 우선순위 (위 → 아래)**

1. 비로그인 → `/sign-in?next=<원래 경로>`
2. 게임 인증 없음 → `/games/[gameSlug]/auth?next=<원래 경로>`
3. 클랜 소속이 `none`(미가입) → `/games/[gameSlug]/clan` (가입 탭)
4. 클랜 소속이 `pending`(신청 중) → `/games/[gameSlug]/clan` (가입 탭 + `pendingView` 자동 노출)
5. 클랜 소속이 `member` → 요청 경로 허용. `/games/[gameSlug]/auth` 또는 `/games/[gameSlug]/clan` 직진입 시 `/games/[gameSlug]/clan/[clanId]`로 자동 이동

**6칸 매트릭스 (게임 카드 클릭 또는 `/games/[gameSlug]/...` 직접 진입)**

| # | 게임 인증 | 클랜 소속 | 카드 점·라벨 | 결과 라우트 | 비고 |
|---|----------|-----------|-------------|------------|------|
| 1 | ✗ | none | 빨강 ● "계정 미연동" | `/games/[g]/auth` | 표준 온보딩 시작점 |
| 2 | ✗ | pending | 빨강 ● "계정 미연동 · 신청 보류" | `/games/[g]/auth` | 인증 복구 후 매트릭스 #5로 자연 이동 |
| 3 | ✗ | member | 노랑 ● "계정 재연동 필요" | `/games/[g]/auth?reauth=1` | 토큰 만료된 기존 멤버 |
| 4 | ✓ | none | 파랑 ● "클랜 찾는 중" | `/games/[g]/clan` | clan-auth 가입 탭 |
| 5 | ✓ | pending | 파랑 ● "<클랜명> 가입 신청 중" | `/games/[g]/clan` | `pendingView` 자동 노출 |
| 6 | ✓ | member | 초록 ● "<클랜명> 가입됨" | `/games/[g]/clan/[clanId]` | 클랜 메인 |

**예외**

- `/games/[gameSlug]` (MainGame 커뮤니티): 가드 1·2만 적용 (게임 인증 필요, 클랜 소속 무관). 매트릭스 #1·#2·#3은 `/auth`로 보내고, #4·#5·#6은 모두 진입 허용.
- `/profile`: 가드 1만 적용. 게임·클랜 가드 없음.
- `?reauth=1` (#3): `game-auth` 화면 상단에 "기존 인증이 만료되어 다시 연결이 필요합니다" 안내 카피 노출. 성공 시 직전 클랜 메인으로 복귀.

**상태 출처**

- `auth_status` ← `user_game_profiles` (게임 슬러그 단위 토큰 유효성)
- `clan_status` ← `clan_members` (게임 슬러그 단위 자기 행) + `clan_join_requests` (`pending` 행)
- 둘 다 미들웨어에서 한 번에 조회해 컨텍스트로 전달 (Phase 2+ slice-01에서 정의)

**Phase 1 목업 시뮬레이션**

- `games.html` 카드에 `data-game` `data-auth` `data-clan-status` `data-clan-id` `data-clan-name` 속성으로 6칸을 표현.
- 단일 라우터 함수 `routeFromGameCard(card)`가 위 매트릭스를 평가해 행선지를 결정.
- OW 카드의 "auth 우회 → main-clan 직행" 핫픽스를 제거하고, 정상 케이스는 `data-auth=true · data-clan-status=member`(매트릭스 #6)로 표현해 결과적으로 `main-clan.html`로 이동하도록 시연.

### D-AUTH-02 — 게임별 OAuth 제공자 매핑

- **결정일**: 2026-04-20
- **요지**: `/games/[gameSlug]/auth` 화면은 슬러그(또는 Phase 1 목업의 `?game=` 쿼리)에 따라 제공자·제목·아이콘·CTA를 동적으로 렌더한다. 단일 화면, 단일 컴포넌트.

| 슬러그 | 제공자 | 제목 | 아이콘 | CTA 라벨 | 안내 카피 | 상태 |
|--------|--------|------|--------|----------|-----------|------|
| `overwatch` | Battle.net OAuth | 오버워치 계정 연동 | 🎮 | Battle.net으로 계속하기 | "Battle.net 계정으로 본인을 확인합니다." | 활성 |
| `valorant` | Riot RSO (Sign-On) | 발로란트 계정 연동 | 🎯 | Riot 계정으로 계속하기 | "Riot 계정으로 본인을 확인합니다." | 활성 |
| `lol` | Riot RSO | 리그 오브 레전드 계정 연동 | ⚔️ | (출시 예정) | "곧 추가 예정입니다." | 비활성 |
| `pubg` | Krafton (TBD) | PUBG 계정 연동 | 🪖 | (출시 예정) | "곧 추가 예정입니다." | 비활성 |
| 그 외 / 누락 | — | 지원하지 않는 게임 | ❓ | ← 게임 선택으로 | "지원하지 않는 게임 슬러그입니다." | 폴백 |

**Phase 1 목업 구현 노트**

- `game-auth.html` 상단 `<script>`에 `GAME_AUTH_PROVIDERS` 매핑 객체 + `applyGameAuthConfig()` 부트스트랩 함수.
- `?game=` 쿼리 파싱 후 매핑된 설정으로 `auth-title`·`game-icon-large`·`verify-method-*`·CTA 버튼·info-box를 갱신.
- `lol`/`pubg`는 CTA 비활성 + "출시 예정" 안내. `?reauth=1`이면 상단에 재연동 안내 배지 표시 (D-AUTH-01 매트릭스 #3 후속).
- 운영 단계에서는 `?game=` 쿼리가 사라지고 `[gameSlug]` 패스 파라미터로 대체.

**Riot RSO 결정 근거 (참고)**

- LoL과 발로란트는 Riot 계정 단일 SSO. 따라서 한 사용자가 이미 발로란트 인증을 마쳤다면 LoL 출시 후 같은 OAuth 토큰을 재사용해 자동 연동 가능 (Phase 2+ 최적화 후보).

### D-AUTH-03 — 비밀번호 정책과 최저 가입 연령

- **결정일**: 2026-04-20
- **요지**: 비밀번호는 **strong 정책(영문+숫자+특수문자, 8~72자)**을 제출 시점에 강제한다. 출생연도 `currentYear - 10` 상한은 **유지**(만 10세 미만 가입 차단). 만 14세 미만은 한국 개인정보보호법상 법정대리인 동의가 필요하므로 **동의 플로우는 Phase 2+**로 이관하고, Phase 1에서는 안내 카피만 노출한다.

**비밀번호 정책**

| 구분 | 규칙 |
|------|------|
| 길이 | **최소 8자 / 최대 72자** (bcrypt 한도) |
| 구성 | 영문 대/소문자 1자 이상 + 숫자 1자 이상 + 특수문자 1자 이상 **모두 필수** |
| 강도 바 | `weak / medium / strong` 3단계. strong 미만은 제출 버튼 비활성 + inline 에러 |
| 클라이언트 강제 | 제출 시점(`handleSignUp`) 통과 검사, 실패 시 폼 전송 자체 차단 |
| 서버 재검증 | 동일 정규식을 Supabase `handle_new_user` 트리거/Edge Function에서 재검증 (클라이언트 우회 차단) |
| 비밀번호 확인 필드 | Phase 1 목업은 단일 필드 유지. Phase 2 도입 시 `checkPwdMatch` 데드 코드 복구 |

사용 정규식 (참고):

```
/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z\d\S]{8,72}$/
```

**최저 가입 연령 (만 10세 유지)**

- 출생연도 select: 상한 `currentYear - 10`, 하한 1950년 (`populateYears` 기존 구현 유지).
- 이유: 게임 서비스 특성상 초등 고학년 이상 유저 수용 필요. 만 14세 미만 유저는 소수지만 허용한다.
- **만 14세 미만 가입자에 대한 법정대리인 동의 UI는 Phase 2+에서 추가한다.** Phase 1 범위:
  - 가입 폼 하단 안내 문구 한 줄: "만 14세 미만은 가입 시 법정대리인 동의가 필요합니다. (서비스 오픈 시 추가 절차 안내)"
  - 실제 동의 체크박스·보호자 이메일 입력 UI는 Phase 1 범위 밖. 스키마에만 `users.minor_guardian_consent_at timestamptz NULL` 컬럼을 미리 두어 Phase 2+ 흡수 지점을 만든다.

**스키마 영향**

- `schema.md` `users` 테이블에 `birth_year int`, `gender enum('male','female','undisclosed')`, `password_updated_at timestamptz`, `minor_guardian_consent_at timestamptz NULL` 컬럼 추가.
- Phase 1 목업은 `birth_year`/`gender`를 session storage 수준으로만 저장(실DB 미연결).

**영향 문서·파일**

- `pages/03-Sign-Up.md` — 비번 규칙·강도 바 임계·연령 안내 카피 갱신, "결정 필요" 삭선.
- `mockup/pages/sign-up.html` — `handleSignUp`에 strong 정규식 검증 추가, 강도 계산 정확도 보정, 14세 미만 안내 카피 문구 삽입.
- `schema.md` — users 컬럼 4개 추가.

### D-AUTH-04 — 비밀번호 찾기 플로우

- **결정일**: 2026-04-20
- **요지**: Supabase Auth의 재설정 메일 템플릿을 사용한다. 이메일 존재 여부를 응답으로 노출하지 않고, 재설정 토큰은 **1시간** 유효 + 발송 rate limit을 강제한다.

**플로우**

```
/sign-in "비밀번호 찾기" 링크
        │
        ▼
/auth/forgot-password  (이메일 1칸)
        │
  "재설정 메일 보내기" 클릭
        │
        ▼
서버 — 이메일 존재 여부 무관하게 항상 중립 응답
  "가입된 이메일이면 재설정 메일을 보냈어요. 메일함을 확인해 주세요."
        │
        ▼
(이메일 수신)
        │  재설정 링크 클릭
        ▼
/auth/reset-password?token=...
  - 새 비밀번호 입력 (strong 정책)
  - 새 비밀번호 확인 입력 (일치 검사)
        │
  "비밀번호 변경" 클릭
        │
        ▼
성공 → "비밀번호를 변경했어요. 다시 로그인해 주세요." → /sign-in
실패 → 토큰 만료·사용됨·잘못됨 분기별 안내
```

**정책 수치**

| 항목 | 값 |
|------|-----|
| 재설정 토큰 유효기간 | **1시간** |
| 같은 이메일 재발송 간격 | 60초 |
| 같은 이메일 24시간 발송 한도 | **5회** |
| 같은 IP 24시간 발송 한도 | 10회 (abuse 방지) |
| 토큰 1회용 | 사용 즉시 invalidate |
| 성공 후 처리 | 해당 사용자의 **모든 활성 세션 무효화** (자동 로그아웃) |

**UI 카피 원칙**

- 이메일 존재 여부를 응답에 노출하지 않는다(account enumeration 방지).
- 발송 한도 초과 시: "너무 많이 요청하셨어요. 잠시 후 다시 시도해 주세요." — 남은 시간은 노출하지 않음.

**스키마 영향**

- `password_resets` 테이블 신설 (id·user_id·token_hash·expires_at·used_at·ip·user_agent). 실제 저장 값은 토큰 **해시**이며 평문 토큰은 이메일에만 포함.
- Supabase 내장 테이블을 사용하는 경우 애플리케이션 레벨에서는 rate limit만 별도 관리.

**영향 문서·파일**

- `pages/02-Sign-In.md` — 비번 찾기 링크 동작 상세화, D-AUTH-04 삭선.
- (신규) `pages/02a-Forgot-Password.md` 또는 `02-Sign-In.md` 하위 섹션으로 재설정 2화면을 문서화.
- `mockup/pages/sign-in.html` — `.forgot-link`에 onClick alert로 D-AUTH-04 요지(메일 발송·1시간 유효) 안내 시뮬레이션.

### D-AUTH-05 — Discord OAuth scope

- **결정일**: 2026-04-20
- **요지**: Discord는 **서드파티 로그인 용도로만** 사용한다. scope는 **`identify email`** 로 한정. 클랜 운영·알림을 위한 **Discord 연동은 별도 Bot OAuth**로 분리해 Phase 2+ (`D-EVENTS-03`) 결정에서 다룬다.

**Phase 1 scope**

| scope | 사용 여부 | 비고 |
|-------|:---:|-----|
| `identify` | O | Discord 사용자 ID·아바타·글로벌 이름 |
| `email` | O | 기존 ClanSync 계정과의 매칭 키 |
| `guilds` | X | 사용자의 디스코드 길드 목록 — 요청하지 않음 |
| `guilds.join` | X | 봇 초대 — Phase 2+ Bot OAuth로 분리 |
| `gdm.join` / `rpc` / `voice` | X | 사용 안 함 |

**매칭 규칙**

- Discord 로그인 성공 시 받은 email과 `users.email`이 일치하고 `email_verified=true` 라면 **기존 계정에 Discord ID 병합**.
- email이 미검증이거나 불일치면 **신규 계정 플로우**로 진입 — 닉네임·출생연도·성별 등 필수 필드는 추가 입력 화면에서 수집(Phase 2에서 구현, Phase 1 목업은 `alert()`로 플로우만 설명).
- Discord 이메일 변경 시 자동 재매칭은 하지 않는다(보안상 수동 처리).

**UI 카피**

- 동의 화면 진입 전 안내: "ClanSync는 Discord 계정의 식별 정보와 이메일만 사용합니다. 디스코드 서버·메시지에는 접근하지 않습니다."
- 클랜↔Discord 알림 연동이 나중에 추가되더라도 **로그인 scope는 확장하지 않음** — 별도 Bot OAuth로 독립 동의.

**영향 문서·파일**

- `pages/02-Sign-In.md` — Discord 버튼 동작·scope 주석, D-AUTH-05 삭선.
- `mockup/pages/sign-in.html` — Discord 버튼 onClick에 scope 안내 alert 시뮬레이션.

### D-AUTH-06 — 로그인 실패 잠금 정책

- **결정일**: 2026-04-20
- **요지**: **IP+email 조합 기준 5회 연속 실패 → 15분 잠금**. 성공 로그인 시 카운터 리셋. 감사·분석 용도로 별도 테이블에 실패 이력을 저장한다.

**정책**

| 항목 | 값 |
|------|-----|
| 기준 키 | `(email, ip)` 조합 |
| 잠금 임계 | **5회 연속 실패** (성공 시 카운터 리셋) |
| 잠금 시간 | **15분** |
| 잠금 중 시도 | 카운트 증가 **없음**. 응답은 동일한 "잠시 후 다시 시도해 주세요." (이메일 존재 여부 비노출) |
| 로그 보존 | 90일 (감사·보안 분석 후 자동 삭제) |
| 수동 해제 | 관리자 전용 엔드포인트 — Phase 2+ |

**응답 차이 숨김**

- 잠금 여부·남은 시간·실패 횟수는 응답·UI에 **절대 노출하지 않는다** (account enumeration + brute force 타이밍 공격 방지).
- 폼 상단 안내 카피는 "이메일 또는 비밀번호가 올바르지 않거나, 잠시 후 다시 시도해 주세요." 와 같이 두 케이스를 하나로 묶는다.

**스키마 영향 — `auth_failed_logins` 신설**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| email | citext | 시도된 이메일 (가입 유무 무관) |
| ip | inet | 요청 IP |
| user_agent | text | |
| reason | enum(`invalid_password`,`unknown_email`,`locked`,`oauth_denied`) | 실패 사유 |
| attempted_at | timestamptz DEFAULT now() | |

**인덱스**: `(email, ip, attempted_at DESC)` + `(attempted_at)` (TTL 삭제용).

**영향 문서·파일**

- `pages/02-Sign-In.md` "상태별 화면" 표의 "반복 실패 잠금" 행 갱신, D-AUTH-06 삭선.
- `schema.md` `auth_failed_logins` 테이블 섹션 신설.
- `mockup/pages/sign-in.html` — `.error-msg` 슬롯 활성화 + 5회 이상 시 잠금 카피 시뮬레이션 스크립트.

### D-AUTH-07 — 자동 로그인 유지 기간

- **결정일**: 2026-04-20
- **요지**: 자동 로그인 체크 해제 시 **24시간**, 체크 시 **30일** refresh token을 발급한다. 활동 감지 시 슬라이딩 연장. 보안 이벤트 시 전 세션 즉시 무효화.

**정책**

| 상태 | refresh token 유효기간 | access token 유효기간 | 슬라이딩 연장 |
|------|:---:|:---:|:---:|
| 자동 로그인 **OFF** | 24시간 | 1시간 | 활동 있을 때만(연장 상한 = 24h) |
| 자동 로그인 **ON** | **30일** | 1시간 | 활동 감지 시 마지막 사용 시각 기준 30일 재설정 |

**즉시 무효화 트리거**

- 비밀번호 변경·재설정 성공 (D-AUTH-04 연동) → 해당 사용자 모든 세션 revoke
- 명시적 "모든 기기에서 로그아웃" 버튼 클릭 (Phase 2+ 계정 설정 화면)
- 계정 정지·탈퇴
- 로그인 실패 잠금(D-AUTH-06) 중에는 신규 세션 발급 금지

**`users.auto_login` 컬럼 의미**

- 해당 사용자의 **기본 체크박스 상태** 저장 (다음 로그인 화면에서 자동 체크 여부).
- 실제 세션 TTL은 **로그인 시 전송된 체크박스 상태**로 결정 — DB 값보다 요청 페이로드가 우선.

**UI 안내**

- 체크박스 옆 tooltip/title: "체크 시 약 30일간 자동 로그인이 유지돼요. 공용 PC에서는 해제해 주세요."
- 체크 해제 시: 기본 24시간 유지 — 사용자에게는 별도 안내 없음(현재 UX 유지).

**스키마 영향**

- Supabase Auth 세션 테이블에 저장되므로 별도 스키마 변경 없음. 다만 `users.auto_login`은 "마지막 선택값"으로 계속 사용.
- 필요 시 `auth_sessions` 뷰로 마지막 활동 시각·기기·IP를 노출하는 Phase 2+ 계정 관리 화면 고려.

**영향 문서·파일**

- `pages/02-Sign-In.md` 자동 로그인 토글 규칙 행 갱신, D-AUTH-07 삭선.
- `mockup/pages/sign-in.html` 토글 버튼에 tooltip·title 추가, 내부 alert로 "30일 유지" 안내 시뮬레이션.

### D-CLAN-01 — 클랜 목록 검색·필터·페이지네이션 분담

- **결정일**: 2026-04-20
- **요지**: Phase 1은 클라이언트, Phase 2+는 서버. 페이지 사이즈는 5 고정.

| 항목 | Phase 1 (목업) | Phase 2+ (운영) |
|------|---------------|-----------------|
| 데이터 출처 | 정적 `CLANS` 객체 (목업 7개) | 서버 페이징 API (`GET /games/[g]/clans?page=&size=&...`) |
| 검색 | 클라 — `clan.name`·`clan.title` 부분 일치 (대소문자 무시) | 서버 — `name ILIKE '%q%' OR description ILIKE '%q%'`. 인덱스: `(game_id, name)` GIN trgm |
| 필터 (모집 상태·지향·포지션·티어·기타) | 클라 — `filterState` 객체 → 카드 표시/숨김 | 서버 — 필터별 `WHERE` + 컴포지트 인덱스. 칩별 enum/배열 `&&` 연산 |
| 페이지 사이즈 | `PAGE_SIZE = 5` (코드 상수) | 5 유지. URL `?size=` 미허용(우회 방지) |
| 정렬 | 기본: 핀(Premium) → 최신순 | 동일. 정렬 칩 추가는 별도 결정 |

**페이지 사이즈를 5로 유지하는 근거**

- 카드 1장이 키 큰 카드(클랜 아이콘·뱃지·태그 묶음). 5장이면 1뷰포트에 정확히 들어와 스크롤 부담↓.
- 카드 클릭 시 우측 드로어가 열리는 디자인이라, 옆 공간 확보를 위해 본문 카드 수를 적게 유지.
- 검색·필터를 적극 쓰도록 유도 — 무한 스크롤로 흘려보내는 패턴 회피.

**Phase 2+ 마이그레이션 메모**

- 응답 형태: `{ items: Clan[], total: number, page: number, size: number }`. 클라 컴포넌트는 `total`로 페이지 버튼 렌더.
- 검색어·필터 변경 시 디바운스 300ms + `AbortController`로 이전 요청 취소.
- 첫 페이지는 SSR로 prefetch (Next.js Server Component) → LCP 단축.

### D-CLAN-02 — 가입 신청 상태 머신과 중복정책

- **결정일**: 2026-04-20
- **요지**: 신청 라이프사이클을 별도 테이블 `clan_join_requests`로 분리. 게임당 단일 활성 신청. pending 동안 항상 취소 가능. 거절 후 쿨다운 없음.

**상태 머신**

```
              ┌──── (사용자 취소) ────► canceled
              │
none ──► pending ──── (클랜장 승인) ────► approved ──► clan_members.status = 'active'
              │
              └──── (클랜장 거절) ────► rejected
```

- `none` = 신청 행 자체가 없음 (D-AUTH-01 매트릭스의 `clan_status = none`)
- `pending` = `clan_join_requests`에 행 있음 (D-AUTH-01 매트릭스 `clan_status = pending` → `clan-auth.html` 진입 시 `pendingView` 자동 노출)
- `approved` = `clan_members`에 `status = 'active'` 행 생성 + `clan_join_requests` 행은 보존(이력)
- `rejected` / `canceled` = `clan_join_requests` 행에 종료 사유 기록, **즉시 재신청 가능** (쿨다운 없음)

**중복 신청 정책 (단일 신청)**

- 한 사용자는 **한 게임 내 동시에 1개 클랜에만 `pending` 상태**를 가질 수 있다.
- 다른 클랜 카드에서 신청 시도 시: "현재 ‘<기존 클랜명>’ 가입 신청 중입니다. 취소하고 새로 신청할까요?" 모달 → 확인 시 기존 행 `canceled` + 새 신청 생성 (트랜잭션).
- 다른 게임의 클랜 신청은 영향 없음 (게임 단위 독립).

**테이블 스키마** (schema.md 신설)

```
clan_join_requests
  id              uuid PK
  clan_id         uuid FK → clans
  user_id         uuid FK → users
  game_id         uuid FK → games        -- 단일 신청 정책 검증용
  status          enum('pending','approved','rejected','canceled')
  applied_at      timestamptz
  resolved_at     timestamptz NULL       -- approved/rejected/canceled 시각
  resolved_by     uuid FK → users NULL   -- 처리한 클랜장/운영진 (사용자 취소 시 = self)
  message         text                   -- 자기소개 (목업 modal의 textarea)
  reject_reason   text NULL              -- 클랜장 거절 사유 (선택)

UNIQUE INDEX uq_active_request
  ON clan_join_requests (user_id, game_id)
  WHERE status = 'pending';              -- 게임당 단일 활성 신청 강제
```

- 부분 유니크 인덱스로 단일 신청 정책을 DB 레벨에서 강제.
- 이력 조회는 status 무관 SELECT, 활성 신청 조회는 `WHERE status='pending'` + 인덱스 hit.

**클랜장 처리 동선**

- 클랜 관리 화면(`/manage`)에서 `pending` 목록 → 승인/거절 액션. 승인 트랜잭션:
  1. `clan_join_requests.status = 'approved'`, `resolved_at`, `resolved_by` 갱신
  2. `clan_members` 행 INSERT (`status='active'`, `role='member'`, `joined_at = NOW()`)
  3. (선택) 사용자에게 알림 발송

**Phase 1 목업 시뮬레이션**

- `clan-auth.html`이 `?pending=1` + `?game=` 받으면 `sessionStorage.clansync_clan_apply_status = 'pending'`로 가정하고 `pendingView` 즉시 노출 (D-AUTH-01 매트릭스 #5).
- `pendingView`에 "신청 취소" 버튼 추가. 클릭 → `sessionStorage` 클리어 + 가입 탭 복귀.
- `submitJoin()`에서 신청 정보를 `sessionStorage.clansync_clan_apply = { clanKey, clanName, appliedAt }`로 기록.

### D-CLAN-04 — 클랜 만들기 폼 payload·스키마 정합

- **결정일**: 2026-04-20
- **요지**: 폼·DB가 어긋난 4개 필드를 **24자 이름·`style` enum·`tier_range[]`·`min_birth_year`** 로 정렬. 자유 태그 입력 추가.

**`clans` 테이블 변경**

| 컬럼 | 변경 | 비고 |
|------|------|------|
| `name` | `varchar(30)` → **`varchar(24)`** | 폼 maxlength와 통일. 카드 라벨 깨짐 방지 |
| `style` | **신설** `enum('social','casual','tryhard','pro') NULL` | 친목/즐겜/빡겜/프로 (단일 값). NULL = 지향 미설정 (D-CLAN-05) |
| `tier_range` | **신설** `text[]` | `'bronze'·'silver'·'gold'·'plat'·'diamond'·'master'·'gm'·'challenger'` 8값 중 다중. 빈 배열 = 티어 무관 |
| `min_birth_year` | **신설** `int NULL` | 가입 가능 출생연도 하한 (예: 1995 = 1995년 또는 그 이전 출생자만 가입). NULL = 무관 |
| `age_range` | **삭제** | 자유 텍스트로는 검색·필터 불가. `min_birth_year` + 자유 태그로 대체 |
| `tags` | 변경 없음 | `text[]`. 추천 태그(PRESET_TAGS) + 클랜 자유 추가, 최대 5개 |
| `gender_policy` | 변경 없음 | enum 그대로 |
| `max_members` | 변경 없음 | 2~200 (D-CLAN-06 별도) |

**Premium 클랜의 인원 상한 확장 여부는 D-CLAN-06에서 결정.**

**폼 입력 변경 (`clan-auth.html` 만들기 탭)**

| 칸 | 변경 | 비고 |
|----|------|------|
| 클랜명 | maxlength 24 유지 | DB도 24로 정합 |
| 지향 | 4개 칩 그대로 (단일 칩 해제 허용 — D-CLAN-05) | 한글: 친목/즐겜/빡겜/프로 |
| 티어대 | **챌린저 칩 추가** (8개) | 데이터 값: `'challenger'` |
| 태그 | 추천 칩 (PRESET_TAGS) + **자유 태그 입력 칸 신설** | 합산 최대 5개. 자유 입력은 Enter 또는 "+" 버튼으로 추가 |
| 출생연도 하한 | **신설** select (선택 사항) | "전연령" / "1970년생부터" ~ "현재년도-15년생부터" 옵션. 미선택 시 NULL |
| 나이대 (`age_range`) | **제거** | min_birth_year + 자유 태그로 대체 |

**가입 가능 최소 나이는 만 10세 유지** (D-AUTH-03 별도 결정 항목). 출생연도 select 상한은 `현재년도 - 10`.

**`handleCreateClan` payload (Phase 1 목업)**

`sessionStorage.clansync_create_clan_draft`에 다음 형태로 저장 후 `main-clan.html` 이동:

```js
{
  name, style, tier_range[], tags[], min_birth_year,
  gender_policy, max_members, description, rules,
  discord_url, kakao_url
}
```

**검증 룰** (Phase 1)

- 클랜명: 빈값 금지, 24자 이내 (현재 코드 유지)
- 최대 인원: 2~200 클램프 (현재 코드 유지)
- 자유 태그: 1~12자, 한글·영문·숫자·공백만, 합산 5개 한도 — `validateCustomTag(text)` 신설
- 다른 필드: 모두 선택 사항 (Phase 1 검증은 가벼움 유지, Phase 2에서 강화)

### D-CLAN-05 — 지향 단일 칩 해제 허용

- **결정일**: 2026-04-20
- **요지**: 같은 칩 재클릭 시 선택 해제 가능. 지향은 선택 사항이며, 비워두면 `style = NULL`로 저장.

**현행 코드 버그**

```js
function selectSingleChip(el, group) {
  document.querySelectorAll(`.create-chip[data-group="${group}"]`).forEach(c => c.classList.remove('active'));
  el.classList.toggle('active', !el.classList.contains('active'));
  // 주석은 "다시 누르면 해제"이지만 forEach가 먼저 모든 active를 제거한 뒤 toggle을 평가하므로 항상 active 상태가 됨
}
```

**수정 후 동작**

```js
function selectSingleChip(el, group) {
  const wasActive = el.classList.contains('active');
  document.querySelectorAll(`.create-chip[data-group="${group}"]`).forEach(c => c.classList.remove('active'));
  if (!wasActive) el.classList.add('active');
}
```

- 같은 칩 재클릭 → 비활성으로 돌아감 (4개 모두 꺼진 상태)
- 다른 칩 클릭 → 기존 활성 해제 + 새 칩 활성 (단일 선택 유지)

**UX 카피**

- 칩 그룹 위 라벨 옆에 "(선택 사항 — 비워두면 모든 분위기 환영)" 도움말. 폼 제출 시 `style = NULL` 허용.

### D-CLAN-03 — 클랜 라이프사이클 — 정책 위반·휴면·부실 처리

- **결정일**: 2026-04-20
- **요지**: "가짜 클랜"이라는 이분법 대신 비즈니스 용어로 3분류. 분류별 발견·처리 차등. 신고는 자동 임계 없이 운영진 직접 판단(악의 신고 방어).

**3분류 (한글·영어·DB enum)**

| # | 한글명 | 영어 | DB `lifecycle_status` | 정의 |
|---|---|---|---|---|
| 0 | 활성 | Active | `active` | 정상 운영 클랜 (기본값) |
| 1 | 정책 위반 | Violating | `violating` | 신고 또는 운영진 직권으로 정책 위반 판정. 단계별 제재 진행 중 |
| 2 | 휴면 | Dormant | `dormant` | 마지막 활동 60일 무. 목록에서 완전 숨김. 추가 90일 무 → 자동 삭제 |
| 3 | 부실 | Stale | `stale` | 생성 후 30일 멤버 1명 AND 활동 0건 → 자동 삭제 예정 |
| 4 | 삭제됨 | Deleted | `deleted` | 자동·수동 삭제 처리됨. 행은 보존(매치 기록 무결성), 모든 화면에서 제외 |

**제재 단계 (정책 위반 한정)**

운영진 검토 큐에서 `moderation_status` 단계 전환:

| 단계 | `moderation_status` | 효과 | 클랜장 액션 |
|------|---------------------|------|-------------|
| 0 | `clean` | 평상시 | — |
| 1 | `reported` | 신고 누적, 운영진 큐 진입 (사용자에 미노출) | — |
| 2 | `warned` | 경고 발송, 가입 신청 차단 | 30일 내 소명 가능 |
| 3 | `hidden` | 비공개 (목록·검색·드로어 모두 숨김) | 30일 내 소명 시 운영진 재검토 |
| 4 | `deleted` | 클랜 삭제 (`lifecycle_status='deleted'`로 전환) | 클랜장 계정 7일 정지 (반복 시 영구) |

**신고 시스템**

- **자격**: 동일 게임 인증 사용자만 (D-AUTH-01 `auth=true` 매트릭스 전제). 1인 1클랜 1회 한정.
- **자동 임계 없음** — 신고 1건이라도 들어오면 운영진 큐(`moderation_status='reported'`)로 진입. 운영진이 신고 내용 + 클랜 상태 직접 확인 후 단계 전환 결정.
- **악의 신고 방어** — 운영진이 신고 무효 판정 시 신고자에게 1차 경고. 누적 3회 무효 신고 시 신고 자격 30일 박탈.
- **신고 자동 처리는 미래 옵션** — 충분한 운영 데이터 누적 후 명백한 패턴(예: 신고 10건+, 신고자 모두 무관계)에 한해 자동 `warned` 도입 검토 (D-CLAN-03b).

**자동 휴리스틱 (휴면·부실)**

| 분류 | 트리거 (배치 잡, 매일 1회) | 사전 알림 | 자동 액션 |
|------|---------------------------|-----------|-----------|
| 휴면 진입 | 모든 멤버의 `last_activity_at`이 60일+ 전 | 클랜장에 D-7 알림 | `lifecycle_status = 'dormant'` |
| 휴면 → 삭제 | 휴면 진입 후 추가 90일 무활동 | 클랜장에 D-30 + D-7 알림 | `lifecycle_status = 'deleted'` |
| 부실 → 삭제 | 생성 후 30일, 멤버 1명 AND 매치 0건 AND 게시글 0건 | 클랜장에 D-7 알림 | `lifecycle_status = 'deleted'` |

**클랜장 알림 발송**

- **인앱 알림** + (Premium 클랜은) **이메일** — 휴면 임박, 휴면 진입, 삭제 임박 단계마다.
- 알림 응답으로 활동(로그인 + 어떤 액션이든 1건) 시 `lifecycle_status='active'`로 자동 복귀.

**UI 정책**

| 분류 | 클랜 카드 | 검색 | 드로어 | 가입 시도 |
|------|-----------|------|--------|-----------|
| `active` | 표시 | 포함 | 가능 | 가능 |
| `violating` (`reported`/`warned`) | 표시 (사용자에 일반 카드처럼) | 포함 | 가능 | **신청 차단** (단계 ≥ warned) |
| `violating` (`hidden`) | **숨김** | **제외** | 차단 | 차단 |
| `dormant` | **숨김** | **제외** | — | — |
| `stale` | 표시 (신생 클랜과 구분 어려움) | 포함 | 가능 | 가능 (자동 삭제 D-7 알림은 클랜장에만) |
| `deleted` | 숨김 | 제외 | 차단 | 차단 |

### D-CLAN-06 — 인원 상한 200 유지, Premium 인원 차별화 없음

- **결정일**: 2026-04-20
- **요지**: 무료·유료 모두 200명 동일. 인원으로는 차별화하지 않고 Premium은 기능(AI 밸런싱·전적·승부 예측 등)으로만 차별화. 200명 클랜의 실질 운영 가능성은 D-CLAN-07 멤버 활성도 분류로 보완.

**근거**

- 시장 호환성 — 대형 디스코드 게임 서버가 200명+를 일반적으로 운영. ClanSync 클랜이 디스코드 사용자를 자연스럽게 흡수하려면 200명 한도가 필요.
- Premium의 가치는 **인원이 아닌 기능** — AI 팀 밸런싱, 전적 분석, 승부 예측, 스크림 매칭 우선권 등이 Premium 차별 포인트. 이미 메인 화면 카드 ✓ 뱃지 + Premium 툴팁이 그 방향 시사.
- 200명 클랜의 운영 부담은 **운영진 권한(`officer`)** 분산 + **D-CLAN-07 활성도 분류**로 해결. 대부분의 멤버는 비활성·휴면이라 동시 운영 부하는 낮음.

**Premium 인원 확장 가능성 (Phase 2+)**

- Premium 클랜이 200을 넘는 수요가 실제로 발생하면 Phase 2+에서 별도 결정(D-CLAN-06b)으로 검토. Phase 1·2 동안은 200 유지.

**스키마 영향**

- `clans.max_members int DEFAULT 30 CHECK (max_members BETWEEN 2 AND 200)` — 기존 그대로. CHECK 제약 추가로 200 초과 방지.

**UX**

- 만들기 폼에 권장 안내 카피: "권장 인원: 30~50명 (오버워치 기준 내전 1~2팀 운영). 200명까지 설정 가능하며, 멤버 활성도는 자동으로 활성·비활성·휴면으로 분류됩니다 (D-CLAN-07)."

### D-CLAN-07 — 클랜 멤버 활성도 분류와 휴면 멤버 처리

- **결정일**: 2026-04-20
- **요지**: 멤버를 마지막 활동 시점 기반 3분류(활성/비활성/휴면)로 자동 그룹화. 휴면 멤버는 인원 한도(200) 외로 보관. 자동 탈퇴 없음 — 클랜장이 멤버 관리 페이지에서 일괄 수동 탈퇴.

**활성도 분류 (멤버별 자동 도출)**

마지막 활동 시점 `clan_members.last_activity_at` 기준:

| 분류 | 한글명 | 영어 | 기간 | UI 표시 |
|------|--------|------|------|---------|
| 활성 | Active | `active` | 최근 30일 내 활동 1건+ | 멤버 목록 기본 표시 |
| 비활성 | Inactive | `inactive` | 30~60일 무활동 | 멤버 목록 표시 + "비활성" 배지 |
| 휴면 | Dormant | `dormant` | 60일+ 무활동 | 멤버 목록 별도 섹션("휴면 멤버") + 토글로 숨김/표시 |

> 분류는 DB에 저장된 enum이 아니라 **`last_activity_at`을 기준으로 쿼리·뷰에서 도출**한다 (배치 잡 불필요). Phase 2+ 캐시 컬럼화 가능.

**"활동"의 정의 (광범위)**

다음 중 어느 하나라도 발생 시 `clan_members.last_activity_at = NOW()` 갱신:

- 클랜 페이지 로그인·진입
- 내전·스크림 참여 (`match_players` INSERT)
- 클랜 게시판 글·댓글 작성
- 운영진 액션 (가입 승인·거절, 멤버 정리 등 — 운영진의 활동도 활동으로 카운트)

`clan_members.last_participated_at`(매치 참여만)과는 별개 컬럼으로 유지. `last_activity_at`이 광범위 활동 시점.

**인원 상한 카운트 정책**

- 200명 한도에 카운트되는 멤버: **활성 + 비활성** 만
- 휴면 멤버는 한도 **외** 보관 — 통계·인원 표시는 활성+비활성 기준, 휴면은 별도 표시 ("휴면 5명")

**휴면 멤버 자동 처리 — 자동 탈퇴 없음**

- 휴면 진입 시점에 **클랜장에게만 알림** ("X명이 휴면 멤버로 전환되었습니다 — 정리하시겠어요?")
- **자동 탈퇴 없음**. 클랜장이 멤버 관리 페이지의 휴면 섹션에서 체크박스로 일괄 수동 탈퇴.
- 자동 탈퇴 로직은 추후 데이터 누적 후 D-CLAN-07b로 재검토 (예: 휴면 6개월+ 자동 탈퇴).

**복귀 (휴면 → 활성)**

- 휴면 멤버가 어떤 활동이든 1건 발생 시 자동으로 활성으로 복귀 (`last_activity_at` 갱신 → 자동 분류 변경).
- 클랜장이 수동 탈퇴 처리한 후 다시 들어오려면 **재가입 신청** (D-CLAN-02 흐름).

**통계 정합 (D-STATS와 직결)**

- schema.md "이번달 활성 유저 비율" 분모 정의 갱신:
  - **기존**: `clan_members.status = 'active'`
  - **변경**: `clan_members.status = 'active' AND last_activity_at >= NOW() - INTERVAL '60 days'` — 즉 활성+비활성만, 휴면 제외.

**클랜장 멤버 관리 페이지 요구사항 (다음 D-MANAGE 작업 시 반영)**

| 섹션 | 표시 | 액션 |
|------|------|------|
| 활성 멤버 (X명) | 닉네임·역할·마지막 활동·내전 참여 횟수 | 권한 변경, 강퇴 |
| 비활성 멤버 (X명) | 동일 + "30일 이상 무활동" 배지 | 권한 변경, 강퇴 |
| 휴면 멤버 (X명, 기본 접힘) | 동일 + "60일 이상 무활동" 배지 + **체크박스** | 일괄 체크 + "선택 멤버 강퇴" 버튼 |

**스키마 영향**

- `clan_members` 테이블에 `last_activity_at timestamptz` 컬럼 신설 (기존 `last_participated_at`은 매치 참여 트래킹용으로 유지).
- 인덱스 권장: `clan_members (clan_id, last_activity_at)` — 활성도 그룹별 카운트 쿼리 최적화.

### D-SHELL-01 — 사이드바 반응형 패턴 (데스크톱 hover · 모바일 드로어)

- **결정일**: 2026-04-20
- **요지**: 뷰포트 폭 **768px**을 경계로 완전히 다른 두 패턴을 쓴다. 데스크톱은 **hover 확장**(64px ↔ 220px), 모바일은 **좌측 드로어**. 본문은 항상 "접힘 기준 64px" 마진을 유지해 hover 확장이 본문을 밀지 않는다.

**중단점**

- **데스크톱**: `min-width: 769px` — hover 확장 사이드바
- **모바일**: `max-width: 768px` — 햄버거 드로어
- JS·CSS 동일 경계. 중간 상태(타블렛 예외) 없음.

**데스크톱 사양 (≥769px)**

| 항목 | 값 | 메모 |
|------|-----|------|
| 기본 폭 | 64px | 아이콘만, 섹션 타이틀 hidden |
| hover 폭 | 220px | 라벨 노출 + 섹션 타이틀 노출 |
| 전환 | `width 0.2s ease` | CSS transition |
| 본문 margin-left | **64px (고정)** | hover 확장이 본문을 밀지 않음 |
| 그림자 (hover 시) | `8px 0 24px rgba(0,0,0,0.35)` | 접힘 상태는 그림자 없음 |
| 알림 점 배치 | 아이콘 우상단 4x4px 원형 pill, `box-shadow` 2px 외곽 | 확장 시에도 같은 위치 |

**모바일 사양 (≤768px)**

| 항목 | 값 | 메모 |
|------|-----|------|
| 트리거 | `#mobileMenuBtn` 햄버거 (navbar 좌측) | `display:flex` 활성 |
| 드로어 폭 | `min(248px, 76vw)` / `max-width: 248px` | 화면 좁을수록 76vw 우선 |
| 드로어 높이 | `calc(100vh - 60px)` (navbar 제외) | |
| 위치 | 좌측 슬라이드 (`transform: translateX(-100%)` → `translateX(0)`) | `transition 0.22s ease` |
| 오버레이 | 반투명 검정 `rgba(0,0,0,0.55)` | z-index 205, 드로어 z-index 210 |
| 본문 padding | 16px | 데스크톱은 28px |
| 사이드바 아이콘 크기 | 13×13 | 데스크톱 16×16 |

**드로어 닫기 트리거 (4종)**

1. **오버레이 클릭**: 백그라운드 dim 영역 클릭.
2. **Esc 키**: 전역 `keydown` 리스너가 최우선으로 드로어 닫기 호출.
3. **내부 항목 클릭**: `.sidebar` 내부 `a`·`.sidebar-item`·`button` 클릭 시 자동 닫힘 (뷰 전환 후 드로어 잔존 방지).
4. **리사이즈로 769px+ 진입**: `resize` 이벤트가 데스크톱 폭 감지 시 `closeSidebarDrawer()` 강제 호출 (회전·창 크기 변경 대응).

**접근성**

- `#mobileMenuBtn[aria-expanded]`·`[aria-label]`을 `syncSidebarDrawerAria(open)`로 토글 (`"메뉴 열기"` ↔ `"메뉴 닫기"`).
- 드로어 오픈 시 `body.style.overflow = 'hidden'`으로 뒤쪽 스크롤 잠금, 닫을 때 복원.
- **Phase 2+ 이관**: ① focus trap(드로어 열리면 `Tab`이 드로어 내부를 순환) ② 드로어 열 때 첫 포커스를 닫기 힌트/첫 메뉴로 이동 ③ Esc 닫기 후 트리거 버튼(햄버거)으로 포커스 복귀.

**알림 점 (D-SHELL-03 재확인)**

- 모바일 드로어에서도 **아이콘 기준 상대 위치**(sidebar-item 내부 anchor)로 동일하게 배치. 숫자/점 크기·색 동일.
- 드로어가 닫혀 있을 때 햄버거 자체에 **미확인 총합 보조 dot** 노출은 하지 않음(중복 방지 원칙 — D-SHELL-03 본문과 동일). 드로어를 연 뒤 개별 항목에서 확인.
- 데스크톱 hover 확장 중에는 라벨 옆으로 alignment 변동 없음(항상 아이콘 우상단).

**Phase 1 목업 구현 매핑**

| 개념 | 파일·심볼 |
|------|-----------|
| 중단점 상수 | `SIDEBAR_DRAWER_MQ = window.matchMedia('(max-width: 768px)')` (`mockup/scripts/app.js`) |
| 토글·닫기·리사이즈 | `toggleSidebarDrawer()`·`closeSidebarDrawer()`·`onSidebarDrawerResize()` (`app.js`) |
| CSS | `mockup/styles/main.css` §모바일 드로어(438~548) · §데스크톱 hover(571~630) |
| body 클래스 | `app-sidebar-collapsible` (데스크톱 확장 활성) · `app-sidebar-drawer-open` (모바일 오픈 상태) |
| Esc·클릭 핸들러 | `app.js` 175~204 |

**결정 제외 (별도 이슈)**

- 사이드바 **순서·추가 항목**은 `pages/07-MainClan.md §사이드바 항목` 표가 단일 출처. 이 결정은 **반응형 레이아웃**에 한정.
- 알림 점의 운영 트리거는 D-SHELL-03.
- 데스크톱에서 hover 대신 **클릭 핀 고정** 옵션(사용자가 사이드바 펼친 채 고정)은 Phase 2+ 사용자 설정으로 재검토. Phase 1 범위 아님.

### D-SHELL-02 — 권한·디버그 쿼리 우회 차단 정책

- **결정일**: 2026-04-20
- **요지**: 운영에서 **권한·플랜은 서버 세션과 DB(+RLS)를 단일 출처**로 한다. 목업에서 사용하는 6종 쿼리(`?role=`·`?plan=`·`?hubDebug=1`·`?simulate=logged_in`·`?sidebarNotifyDebug=*`·`?balanceSession=*`)는 **운영 빌드에서 무시**하고 미들웨어가 **URL에서 정화**한다. 링크 공유·북마크에 잔존해 다른 사용자에게 디버그 UI가 보이는 사태를 원천 차단.

**정화 대상 쿼리 (6종)**

| 키 | 목업 용도 | 운영 처리 |
|----|-----------|-----------|
| `role` | `leader`/`officer`/`member` 강제 | **제거 + 302 redirect**. 서버가 `session.role_in_clan`·DB 조회로 결정 |
| `plan` | `free`/`premium`/`pro` 강제 | **제거 + 302 redirect**. 서버가 `clans.plan` 조회로 결정 |
| `hubDebug` | 구성원이 관리 화면 미리보기 | 운영 기본 **제거**. `NEXT_PUBLIC_DEBUG_QUERY=1` **AND** admin 세션일 때만 해석 |
| `simulate` | 랜딩 로그인 시뮬 (D-LANDING-04) | 운영 **제거**. Phase 1 목업 전용, Phase 2+에서는 코드 삭제 |
| `sidebarNotifyDebug` | 알림 점 강제 표시 | 운영 기본 **제거**. 디버그 조건 동일 |
| `balanceSession` | 구성원 밸런스 라이브 UI 미리보기 | 운영 기본 **제거**. 디버그 조건 동일 |

**미들웨어 처리 순서** (Phase 2+ `src/middleware.ts`)

1. 요청 URL 파싱 → 위 6종 키 존재 여부 확인.
2. 하나라도 있으면:
   - 디버그 계열(`hubDebug`·`sidebarNotifyDebug`·`balanceSession`): `NEXT_PUBLIC_DEBUG_QUERY !== '1'` OR 세션 admin 아님 → 제거.
   - 권한 계열(`role`·`plan`·`simulate`): 조건 없이 **항상 제거**.
3. 정화된 URL로 **302 redirect**. 루프 방지: redirect 후에는 6종 키가 전부 사라진 상태.
4. 권한·플랜 컨텍스트는 **미들웨어가 별도 조회**해 `x-clansync-role`·`x-clansync-plan` 요청 헤더로 주입. 서버 컴포넌트는 이 헤더만 신뢰.

**디버그 쿼리 허용 조건 (동시 충족)**

- `process.env.NEXT_PUBLIC_DEBUG_QUERY === '1'` — 빌드 타임 환경 변수.
- `session.user.is_admin === true` — DB 세션 기반 플랫폼 운영자 플래그.
- 둘 중 하나라도 거짓이면 쿼리는 **제거 대상**이며 UI에도 반영되지 않음.
- 디버그 쿼리 실사용 시 `audit_debug_queries` 테이블에 INSERT(Phase 2+): `user_id`·`path`·`query_json`·`created_at`·`ip_hash`.

**클라이언트 방어 (이중 안전망)**

- 서버에서 정화됐어도 SPA 네비게이션·History API 조작으로 URL에 임의 키가 섞일 수 있으므로, **클라이언트 진입점에서도 6종 키를 무시**한다.
- 구현 가이드: `useSearchParams()`로 이들 키를 직접 읽는 코드 금지. 필요 시 `getDebugFlags()` 공용 유틸을 통해 위 "허용 조건"을 통과할 때만 값 반환.
- ESLint 룰 또는 코드 리뷰 체크리스트로 강제. 목업 `mockup/scripts/clan-mock.js`의 `mockClanCurrentRole()`·`mockClanCurrentPlan()` 패턴은 **Phase 2에서 사용 금지** — 서버 컨텍스트만 신뢰.

**RLS 2중 방어**

- UI 레이어에서 `role=leader` 쿼리를 우회해 leader 버튼을 렌더해도, Server Action·API 호출 시 Supabase RLS가 `auth.uid()` 기준 실제 권한으로 403 반환.
- 따라서 **데이터 무결성은 RLS로 보장**, **UI 혼란 방지는 미들웨어 쿼리 정화로 보장**. 두 층은 독립적.

**`/mockup/*` 경로 처리**

- Phase 2 Next.js 빌드에서 `mockup/` 디렉터리는 **`app/` 트리 밖**이므로 라우트로 노출되지 않음. `public/` 복사 대상에서도 제외.
- **Staging 이하 환경에서만** `/mockup/index.html` 공개 배포 여부는 Phase 2+ 결정(기본: 비공개). 공개하더라도 `robots.txt`·`noindex` 메타 필수.
- Phase 1 목업 현재 구동은 `npx http-server mockup -p 8788` 로컬 전용으로 지속(운영 도메인과 분리).

**감사·모니터링**

- `audit_debug_queries` 테이블 스키마(Phase 2+ `schema.md`에 추가 예정):
  - PK `id uuid`, `user_id uuid` NULL 허용(비로그인), `path text`, `query_json jsonb`, `ip_hash text`, `user_agent text`, `created_at timestamptz default now()`.
  - RLS: INSERT는 서비스 롤만, SELECT는 admin만.
- 운영자 대시보드(Phase 2+): 30일 내 디버그 쿼리 사용 건수·상위 path 리스트. 과도한 사용 감지 시 환경 변수 off.

**Phase 1 목업 영역 (변경 없음)**

- 목업은 현재 규칙을 그대로 유지한다. `?role=`·`?plan=`·`?hubDebug=1` 등은 허브·스크린샷·QA 미리보기 목적으로 **유효**. `_hub.html`의 `hubClanMainSrc()` 쿼리 조립 로직도 유지.
- 본 결정은 **Phase 2 운영 빌드의 미들웨어·환경 변수·감사**에 대한 선언. Phase 1 목업 코드 변경 없음.

**연관 문서**

- [07-MainClan.md §목업과 실제 구현의 차이](./pages/07-MainClan.md#목업과-실제-구현의-차이)
- [gating-matrix.md 부록 B](./gating-matrix.md)
- Phase 2 미들웨어 스펙은 `slice-01` 신설 시 본 결정을 인용.

### D-SHELL-03 — 사이드바 알림 점 트리거 규칙

- **결정일**: 2026-04-20
- **요지**: 사이드바 알림 점은 **"해당 뷰에서 아직 내가 처리/확인하지 않은 행동성 카운트"의 단일 원천**. 정보성 뷰는 **뷰 진입으로 자동 clear**, 행동성 뷰는 **실제 처리로만 clear**. 대시보드는 허브 성격이라 알림 점을 두지 않는다(중복 방지).

**대상·트리거·Clear 매트릭스**

| 뷰 | 해시 | 알림 점 요소 | 성격 | 트리거 (합산) | Clear 방식 |
|----|------|:-----------:|------|---------------|------------|
| 대시보드 | `#dash` | — | 허브 | (없음 — 대시보드 본문 카드들이 각 미확인 항목의 실제 요약이라 사이드바 점 중복 불필요) | — |
| 밸런스메이커 | `#balance` | `#sidebar-notify-balance` | 혼합 | 내가 속한 **진행 중인 내전 세션**(상태 `open` \| `running`) 수 | `#balance` 뷰 **진입 시 자동 clear**. 세션이 끝나지 않았다면 다음 refresh에서 다시 점이 뜸 |
| 이벤트 | `#events` | `#sidebar-notify-events` | 혼합 | (a) 앞으로 **24h 이내** 시작 + 내가 **RSVP 안 한** 일정 수 + (b) **진행 중 투표** 중 내가 **투표 안 한** 수 | `#events` 뷰 **진입 시 자동 clear**. 실제 RSVP/투표 완료 전에는 재진입 시 재표시 |
| 클랜 관리 | `#manage` | `#sidebar-notify-manage` | 행동 | **가입 요청 `pending` 수 + 신규 휴면 진입 미처리 수** (D-CLAN-02 · D-CLAN-07) | 뷰 진입만으로 clear되지 않음. **실제 처리(승인/거절/일괄 강퇴/휴면 배너 닫기)로만 감소** |
| 클랜 통계 | `#stats` | — | 조회형 | (없음) | — |
| 클랜 스토어 | `#store` | — | 조회형 | 신규 쿠폰·아이템 지급은 **이벤트 N** 으로 흡수 | — |

**운영 ↔ Phase 1 목업 데이터 매핑**

| 운영 트리거 | Phase 2 데이터 소스 | Phase 1 목업 근사 |
|------------|---------------------|--------------------|
| 진행 중 내전 세션 | `balance_sessions WHERE status IN ('open','running')` AND 내가 참가자/관전자 | `sessionStorage['clansync-mock-balance-session']==='1'` 또는 기존 `mockSidebarNotifySet('balance', true)` 경로 |
| 24h 내 RSVP 미응답 | `clan_events JOIN event_rsvps` (left join, `start_at ≤ now()+24h`, 내 RSVP 없음) | 실데이터 없음 → `MOCK_SIDEBAR_NOTIFY_DEBUG` 디버그 표시 |
| 진행 중 투표 미응답 | `clan_polls WHERE status='open' AND deadline > now()` + 내 투표 없음 | 실데이터 없음 → 디버그 표시 |
| 가입 요청 `pending` | `SELECT count(*) FROM clan_join_requests WHERE clan_id=? AND status='pending'` | `#mock-manage-requests-tbody <tr>` 수 (목업 정적 행) |
| 신규 휴면 진입 미처리 | `clan_members WHERE dormant_entered_at > now()-30d AND kicked=false` | `mockManageMembersStats().newDormant` (`dormantNewlyEntered=true` 행 수) |

**Clear 동작 분기 근거**

- **정보성 (balance / events)**: "봤다 = 확인"로 간주. 뷰 진입만으로 점을 끄되 실제 조건이 아직 참이면 다음 refresh에서 다시 점이 뜬다. 사용자는 "알림은 봤지만 아직 처리는 안 함"을 자연스럽게 구분.
- **행동성 (manage)**: 뷰에 들어가서 보기만 해선 카운트가 줄지 않는다. 운영진이 가입 요청을 승인/거절하거나 휴면 일괄 강퇴·배너 닫기를 했을 때만 감소. 데이터 기반 자동 집계이므로 별도 seen 상태 없이도 정확.

**알림 점 UI 규격 (Phase 1 공통)**

- 요소: `<span class="sidebar-notify-dot">N</span>` 또는 숫자
- 스타일: `#ef4444` 원형, 흰 글자, `box-shadow` 2px 어두운 외곽. 0 이하일 때 `hidden` 속성 토글
- 카운트가 1 이상일 때 숫자 표시. 단순 boolean(balance 세션 존재 여부 등)일 때는 "N" 글자
- 공용 pill 클래스: `.mock-notify-pill` (탭 라벨·카드 헤더 등 인라인 사용 시)

**제외·이월 항목**

- **"매치 결과 카드" 개념은 도입하지 않는다.** 경기 종료 후 결과 열람은 별도 카드/리스트가 아닌 **결과 입력 완료 시점의 결과 팝업 1회**로 처리한다 — 승부예측이 활성화된 세션에서 밸런스장이 결과 입력으로 승자 팀을 확정하면, 비출전 예측 참여자에게 승리 팀·내 예측 적중 여부·배당받은 클랜코인을 모달/토스트로 즉시 노출하고 끝낸다. 따라서 "매치 결과 미확인" 기반 알림 트리거는 구조적으로 존재하지 않으며, 추후에도 이 트리거는 부활하지 않는다(사후 정정은 클랜 관리의 내전 히스토리에서 별도 다룬다). 상세 흐름은 [09-BalanceMaker.md "경기 종료 · 결과 팝업"](./pages/09-BalanceMaker.md) 참고.
- **대시보드 알림 점** 재고는 당분간 없음. 대시보드 본문에 "가입 요청 요약" "다가오는 일정" 등 카드가 이미 알림 역할을 수행하므로 사이드바 점을 두면 중복.
- **모바일 드로어 상태의 알림 점 배치**: D-SHELL-01에서 확정 — 드로어 내부에서도 sidebar-item 아이콘 우상단 기준(데스크톱과 동일 위치), 햄버거 자체에 미확인 총합 dot은 **두지 않음**(중복 방지). 상세는 [§D-SHELL-01 "알림 점" 절](#d-shell-01--사이드바-반응형-패턴-데스크톱-hover--모바일-드로어).

### D-MANAGE-01 — 구독결제 탭 접근 권한

- **결정일**: 2026-04-20
- **요지**: officer도 탭 본문을 **열람**할 수 있다(금액·일시·현재 플랜). **변경·환불·결제 수단·영수증 상세** 액션만 leader 전용. 운영 대화 병목을 막기 위함.

**권한 매트릭스**

| 요소 | leader | officer | member |
|------|:------:|:-------:|:------:|
| 탭 진입·열람 | ✓ | ✓ | ✗ |
| 현재 플랜 상태 확인 | ✓ | ✓ | ✗ |
| 결제 이력 (금액·일시) 조회 | ✓ | ✓ | ✗ |
| **영수증 상세** 조회 | ✓ | ✗ (마스킹 + "클랜장 전용" 툴팁) | ✗ |
| **결제 수단** 추가·삭제 | ✓ | ✗ | ✗ |
| **플랜 변경** (Free ↔ Premium) | ✓ | ✗ (비활성 버튼) | ✗ |
| 환불 요청 | ✓ | ✗ | ✗ |

**UI 규칙**

- officer 세션에서 제한 액션 버튼은 **비활성 + 툴팁 "클랜장만 변경할 수 있습니다"** 표시 (숨김 아님 — 권한 투명성).
- 결제 수단 정보(카드번호 등 실제 민감 필드)는 leader에게도 `****-1234` 형태로 마스킹. 원본은 결제사 측에서만 관리 (PCI-DSS 회피).
- 메뉴 자체 접근(`#manage` 사이드바)은 기존 D-SHELL 게이팅(`.mock-officer-only`) 유지.

**스키마 영향**

- 없음. 결제·구독은 `subscriptions` / `payments` 테이블이 별도 정의될 Phase 2+ 영역. 권한 분기는 Role 기반 RLS만으로 처리.

### D-MANAGE-02 — 구성원 개인 상세 편집 권한과 M점수 토글

- **결정일**: 2026-04-20
- **요지**: 파괴적·구조적 액션은 leader 전용으로 좁힌다. **M점수 편집만 예외로 클랜 설정 토글**을 두어 leader가 "officer에게도 허용"으로 전환할 수 있게 한다. 단, **기본값은 leader 전용**(안전 우선).

**권한 매트릭스**

| 액션 | leader | officer | 근거 |
|------|:------:|:-------:|------|
| 가입 요청 승인·거절 | ✓ | ✓ | 기존 유지 (D-CLAN-02) |
| member 강퇴 | ✓ | ✓ | 운영 빈도 높음, 가역(재가입 가능) |
| officer 강퇴 | ✓ | ✗ | officer 간 충돌 방지 |
| **역할 변경** (member ↔ officer) | ✓ | ✗ | officer 스스로 officer 증식·권한 상승 방지 |
| **leader 위임** | ✓ | ✗ | 하이재킹 방지 (leader 본인만 위임) |
| **휴면 섹션 일괄 강퇴** (D-CLAN-07) | ✓ | ✗ | 범위가 커서 leader 전용 |
| **M점수 편집** | ✓ | **토글** | `clan_settings.allow_officer_edit_mscore` — 기본 `false`. leader가 true로 켜면 officer도 편집 가능 |

**M점수 토글 설정 UI**

- 위치: **클랜 관리 → 개요 탭 → "운영 권한 설정" 카드** (신설). leader만 이 카드를 조작 가능.
- 카피: "M점수 편집을 운영진에게도 허용" — 기본 꺼짐. 설명 한 줄: "밸런스메이커 팀 밸런스에 직결되는 수치입니다. 운영 빈도가 높아 허용할 수 있지만, 민감한 수치라 기본은 클랜장만 편집합니다."
- 토글 변경 시 확인 모달: "운영진이 즉시 편집 가능해집니다. 감사 로그에는 변경 이력이 기록됩니다."

**UI 규칙**

- 파괴적 버튼은 `.mock-leader-only` 클래스로 officer 세션에서 숨김. CSS: `body.mock-role-officer .mock-leader-only { display: none !important; }`.
- M점수 편집 슬롯은 토글 값에 따라 동적으로 활성/비활성. officer 세션에서 `localStorage['clansync-mock-clan-settings']?.allow_officer_edit_mscore === true`일 때만 편집 가능.

**스키마 영향**

- `clan_settings` 테이블 신설 (또는 `clans` 테이블 컬럼 추가, 스키마 정합은 Phase 2 slice-01에서 결정):
  - `allow_officer_edit_mscore boolean NOT NULL DEFAULT false`
- 감사 로그: `clan_member_audit_log (clan_id, actor_user_id, target_user_id, action enum, before jsonb, after jsonb, created_at)` — 역할 변경·강퇴·M점수 편집·부계정 삭제 등 기록 (Phase 2 상세 설계).

### D-MANAGE-03 — 부계정 조회 정책과 공개 범위 토글

- **결정일**: 2026-04-20
- **요지**: 부계정은 **자기신고** 유지. 같은 게임의 주계정(`user_game_profiles`)과 연결해 저장. 조회 범위는 **클랜 설정 토글**로 leader가 전환 가능. 기본값은 **운영진+ 전용**.

**등록 (자기신고)**

- 위치: `/profile` → 게임 카드 → "부계정 추가" 버튼 (기존 동작 유지).
- 고지: 추가 모달에 **"클랜에 소속되어 있다면, 클랜 공개 범위 설정에 따라 부계정 목록이 운영진 또는 클랜 전체에 공개될 수 있습니다"** 문구를 명시하고, 진행 체크박스로 동의 유도.
- 증빙: 현 단계에서 게임사 API 기반 부계정 증빙은 만들지 않는다(오버워치·발로란트 모두 부계정 공식 API 불확실). Phase 2+ 재검토.

**조회 범위 — 클랜 설정 토글**

| 토글 값 | 본인 | 같은 클랜 운영진+ | 같은 클랜 구성원 | 타 클랜 / 비소속 |
|---------|:----:|:----------------:|:----------------:|:---------------:|
| `officers` (기본) | ✓ | ✓ | ✗ | ✗ |
| `clan_members` | ✓ | ✓ | ✓ | ✗ |

- 위치: **클랜 관리 → 개요 탭 → "운영 권한 설정" 카드** 내 라디오 버튼 2개. leader만 변경 가능.
- 카피: "부계정 공개 범위" — "운영진만 (기본)" · "클랜 전체 공개".
- 변경 시 확인 모달: "클랜 전체 공개로 변경하면 모든 구성원이 서로의 부계정을 볼 수 있습니다. 계속하시겠습니까?"

**신고·차단**

- 부계정 관련 매너 이슈·도배 문제는 **클랜 신고(D-CLAN-03) 흐름**에 흡수. 별도 부계정 신고 API는 만들지 않는다.
- 본인이 언제든 프로필에서 부계정을 삭제 가능. 삭제 후 운영진 화면에서 즉시 사라짐. 감사 로그에는 "삭제됨" 스텁만 남김.

**스키마 영향**

- `user_alt_accounts (user_id, game_id, alt_nick text, note text, created_at)` — 자기신고 부계정 테이블. RLS: 본인은 읽기·쓰기, 같은 클랜 운영진+는 토글에 따라 읽기.
- `clan_settings.alt_accounts_visibility text NOT NULL DEFAULT 'officers' CHECK (alt_accounts_visibility IN ('officers','clan_members'))`.

### D-MANAGE-04 — 클랜 배너·아이콘 업로드 제약

- **결정일**: 2026-04-20
- **요지**: 모바일 업로드 실패율을 고려해 **배너 3MB / 아이콘 2MB** 로 여유 있게 설정. 정적 이미지만 허용.

**제약 상세**

| 항목 | 배너 | 아이콘 |
|------|------|--------|
| 허용 MIME | `image/jpeg`, `image/png`, `image/webp` | 동일 |
| **최대 용량** | **3 MB** | **2 MB** |
| 권장 해상도 | 1600×400 (4:1) | 512×512 (1:1) |
| 최소 해상도 | 1200×300 | 256×256 |
| 최대 해상도 | 3200×800 | 1024×1024 |
| 비율 강제 | 4:1 (크롭 유도) | 1:1 (크롭 유도) |
| 애니메이션 (GIF·APNG·WebP 애니) | 불가 — 정적만 | 불가 |
| 자동 변환 | 썸네일(400×100) + 중간(800×200) | 64 / 128 / 256 3단계 |
| 저장 경로 | `clan-media/{clan_id}/banner-{hash}.webp` | `clan-media/{clan_id}/icon-{hash}.webp` |
| 업로드 권한 | officer+ | officer+ |

**검증 순서 (클라 → 서버 이중 검증)**

1. 클라: 확장자·MIME → 용량 → 해상도 (실패 시 구체적 에러 — `용량 초과: 현재 3.4 MB, 최대 3 MB`).
2. 서버: MIME 재검증(매직 넘버 기반) → 해상도 → 애니메이션 검출 → 크롭·리사이즈 → `.webp` 변환 저장.
3. 클라 검증 우회 가능하므로 **서버 검증이 최종 권위**.

**저장·전송**

- 버킷: `clan-media` (Supabase Storage). 원본은 private, 변환본만 CDN public.
- 기존 파일은 새 업로드 시 **덮어쓰기가 아닌 새 hash로 추가**하고, 클랜 레코드의 포인터만 교체. 실패 시 롤백 가능.
- 이전 원본은 30일 보관 후 자동 삭제 (간단한 크론·트리거로 Phase 2+에서 구현).

**스키마 영향**

- `clans.banner_url text`, `clans.icon_url text` — 변환본 public URL (기존 컬럼 있다면 재사용).
- `clans.banner_original_key text`, `clans.icon_original_key text` — Storage 원본 키 (private).

### D-PROFILE-01 — 네임플레이트 동기화 규약

- **결정일**: 2026-04-20
- **요지**: 프로필의 네임플레이트 선택은 4카테고리(emblem/namebar/sub/frame)를 게임별로 저장한다. 목업은 `localStorage`로 영속화하고 **CustomEvent**로 같은 탭 내부 구독자에게 즉시 전파한다. 다른 탭에는 즉시 반영하지 않는다(새 탭 진입 시 localStorage 재로드). BalanceMaker·MainClan에서는 본인 슬롯만 실시간 반영되고, 타 플레이어의 네임플레이트는 Phase 2+ 서버 전파(Supabase Realtime 또는 폴링)로 처리한다.

**공통 규약**

| 항목 | 값 |
|------|-----|
| 상태 저장 키 | `localStorage["clansync-mock-nameplate-state-v1"]` |
| 상태 구조 | `{ ow: { emblem, namebar, sub, frame }, val: { emblem, namebar, sub, frame } }` |
| 프리뷰 셀렉터 | `[data-nameplate-preview="{game}"]` (기존 유지) |
| 본인 구독 셀렉터 | 위 셀렉터에 **부가로** `data-nameplate-self` 속성 추가. BalanceMaker·MainClan 본인 행·슬롯에 부여 |
| 변경 이벤트 | `window.dispatchEvent(new CustomEvent('clansync:nameplate:changed', { detail: { game, state } }))` |
| 구독 방법 | `window.addEventListener('clansync:nameplate:changed', (e) => { if (e.detail.game === myGame) rerender(); })` |
| 초기 동기화 | 페이지 로드 시 `mockNameplateRestoreFromStorage()` 호출 → `[data-nameplate-preview][data-nameplate-self]`에 적용 |

**스키마 영향 (운영)**

- `user_nameplate_selections` 신설: `(user_id, game_id, category, option_id)` + `UNIQUE(user_id, game_id, category)`. RLS: 본인만 SELECT/UPDATE.
- `nameplate_options` (카탈로그): `(id, game_id, category, name, icon_class, unlock_source, linked_id)` — 보유 판정용.
- `user_nameplate_inventory`: `(user_id, game_id, option_id)` — 사용자가 보유한 옵션.

**적용 범위**

- [profile.html](../../mockup/pages/profile.html) 네임카드 미리보기: `[data-nameplate-preview="ow"]`, `[data-nameplate-preview="val"]`.
- [main-clan.html](../../mockup/pages/main-clan.html) 구성원 카드 본인 행: 기존 프리뷰에 `data-nameplate-self` 추가.
- [BalanceMaker](./pages/09-BalanceMaker.md) 매치 슬롯: 본인 슬롯(`data-nameplate-self`)만 로컬 상태 구독. 다른 슬롯은 서버 데이터.
- 플레이어 모달([player-profile-modal](../../mockup/partials/player-profile-modal.html))에서 본인 ID일 때만 로컬 상태 적용.

**연관 문서**

- [pages/14-Profile-Customization.md §데이터·연동](./pages/14-Profile-Customization.md#데이터연동)
- [pages/09-BalanceMaker.md §데이터·연동](./pages/09-BalanceMaker.md)
- [schema.md §user_nameplate_selections](./schema.md)

### D-PROFILE-02 — 가입 신청 대기 목록 데이터 출처

- **결정일**: 2026-04-20
- **요지**: 프로필 "가입 신청 대기 목록"은 D-CLAN-02에서 확정한 `clan_join_requests` 테이블을 단일 소스로 사용한다. **pending**은 항상 노출, **approved/rejected**는 사용자에게 결과를 알리기 위해 7일간 노출 후 자동 숨김. **canceled/expired**는 목록에 나타나지 않는다(감사 기록만 유지). 취소 액션은 pending 일 때만 가능하다.

**데이터 쿼리 (개념)**

```
SELECT r.id, c.name AS clan_name, c.game_id, r.status, r.created_at, r.resolved_at
FROM clan_join_requests r
JOIN clans c ON c.id = r.clan_id
WHERE r.user_id = auth.uid()
  AND (
    r.status = 'pending'
    OR (
      r.status IN ('approved','rejected')
      AND r.resolved_at > now() - interval '7 days'
    )
  )
ORDER BY r.created_at DESC;
```

**UI 동작**

| 상태 | 뱃지 | 액션 |
|------|------|------|
| pending | "심사 대기" (주황) | [취소] 버튼 활성 |
| approved | "승인됨" (녹색) | [클랜으로 이동] (7일간) |
| rejected | "거절됨" (회색) | 액션 없음 (7일 후 자동 숨김) |

**취소 액션**

- 버튼 클릭 → confirm 다이얼로그 → `UPDATE clan_join_requests SET status='canceled', resolved_by='self', resolved_at=now() WHERE id=? AND user_id=auth.uid() AND status='pending'`.
- D-CLAN-02 상태 머신과 동일 — pending에서만 canceled로 전이 가능.
- 성공 시 즉시 행 제거 (7일 유지 대상은 approved/rejected만).

**제약**

- D-CLAN-02에 따라 **게임당 단일 pending 신청**. pending 행은 최대 게임 수만큼.
- 재신청은 24시간 쿨다운 존재 (D-CLAN-02).

**연관 문서**

- [pages/14-Profile-Customization.md §가입 신청 대기 목록](./pages/14-Profile-Customization.md#가입-신청-대기-목록-d-profile-02)
- [decisions.md §D-CLAN-02](#d-clan-02--클랜-가입-신청-플로우)

### D-PROFILE-03 — 뱃지 케이스 ↔ 프로필 스트립 동기화

- **결정일**: 2026-04-20
- **요지**: 뱃지 픽은 **고정 길이 5 · compact(dense-from-front)** 배열로 관리한다. 앞에서부터 순서대로 채우고, 뱃지를 해제하면 **뒷 항목이 앞으로 shift**되어 빈 슬롯이 항상 뒤쪽에 몰린다. 픽 변경은 `localStorage` 저장 + CustomEvent dispatch로 프로필 스트립 + MainClan 본인 행 + BalanceMaker 본인 슬롯에 즉시 반영된다.

> 초기안은 sparse(slot_index 고정·중간 null 허용)였으나, 2026-04-20 검토에서 UX 혼란(빈 슬롯이 중간에 생겨 사용자가 재배치를 강제로 의식해야 함)을 이유로 **compact로 정정**했다. 실제 스트립은 앞쪽이 우선 노출되므로 "앞쪽 = 중요한 뱃지"라는 사용자 직관과도 일치한다.

**공통 규약**

| 항목 | 값 |
|------|-----|
| 상태 저장 키 | `localStorage["clansync-mock-badge-picks-v1"]` |
| 상태 구조 | `{ ow: [id, id, id, id, id], val: [...] }` — 항상 길이 5, **앞쪽부터 연속**으로 채우고 남는 뒤쪽은 `null` |
| 불변식 | 배열 중간에 `null`이 나오면 비정규 상태. 다음 저장·로드 시 자동으로 compact 정규화 |
| 스트립 컨테이너 셀렉터 | `[data-badge-strip="{game}"]` |
| 스트립 슬롯 셀렉터 | `[data-badge-strip-slot="{0..4}"]` |
| 본인 구독 셀렉터 | 컨테이너에 `data-badge-strip-self` 속성 추가 |
| 변경 이벤트 | `window.dispatchEvent(new CustomEvent('clansync:badge:picks:changed', { detail: { game, picks } }))` |

**Compact 규칙**

- **추가**: 현재 채워진 개수(= 첫 `null` 인덱스) 위치에 append. 5개가 다 차 있으면 alert + 차단.
- **해제**: 해당 slot의 뱃지를 제거하고 **그 뒤 슬롯들을 한 칸씩 앞으로 shift**. 마지막 슬롯은 `null`.
- **표시**: 앞쪽부터 아이콘이 연속 노출되고 남는 슬롯은 "비어 있음" placeholder(프로필 스트립에서는 회색/반투명).
- **운영 매핑**: `user_badge_picks(user_id, game_id, slot_index, badge_id)` + `UNIQUE(user_id, game_id, slot_index)`. 해제·추가 시 서버는 해당 사용자·게임의 slot_index를 **0..(n-1)로 재할당**하는 UPSERT를 수행한다(트랜잭션 권장). `badge_id IS NULL` 행은 만들지 않는다 — 대신 slot_index가 채워진 개수보다 크면 해당 행을 DELETE.

**적용 범위**

- [profile.html](../../mockup/pages/profile.html) 네임카드 뱃지 스트립.
- [main-clan.html](../../mockup/pages/main-clan.html) 구성원 카드 본인 행의 뱃지 스트립.
- [BalanceMaker](./pages/09-BalanceMaker.md) 본인 매치 슬롯의 뱃지 표시.
- [player-profile-modal](../../mockup/partials/player-profile-modal.html) 본인 미리보기.

**목업 구현 변경**

- `mockup/scripts/app.js`의 `mockBadgeCaseTogglePick`:
  - 이미 픽된 id → `arr[i..end-1] = arr[i+1..end]` 좌측 shift + 마지막 슬롯 null.
  - 빈 슬롯 있음 → 가장 앞의 null 위치에 append.
  - 꽉 참 → alert 차단.
- `mockBadgeEnsureCompactArray()`가 저장/복원 시 중간 null·중복을 자동 정규화.
- 픽 변경 직후 `clansync:badge:picks:changed` dispatch + localStorage 저장.
- 외부 스트립(`[data-badge-strip]`)은 이벤트 구독으로 `mockBadgeApplyToStrips(game)` 호출.

**연관 문서**

- [pages/14-Profile-Customization.md §모달 1 — 뱃지 케이스](./pages/14-Profile-Customization.md#모달-1--뱃지-케이스-mock-badge-case-modal)
- [decisions.md §D-PROFILE-04](#d-profile-04--뱃지-해금-출처) (해금 출처 정의)
- [schema.md §user_badge_picks](./schema.md)

### D-PROFILE-04 — 뱃지 해금 출처

- **결정일**: 2026-04-20
- **요지**: 뱃지 해금 출처는 `achievement` / `event` / `store` 세 가지 enum으로 분류한다. 카테고리(전투·승률 / 참여·활동 / 이벤트·시즌 / 클랜·스크림 / ClanSync)와는 **독립 축**이며, 한 카테고리 안에 출처가 다른 뱃지가 혼재해도 된다. store 구매는 **개인 코인만** 사용 가능하며, 클랜 코인으로는 뱃지를 구매할 수 없다(클랜 코인은 클랜 단위 혜택·스크림 옵션용).

**스키마**

```
badges (
  id          uuid PK,
  game_id     text NOT NULL,       -- 'ow','val'
  category    text NOT NULL,       -- 'battle','participation','event','clan','clansync'
  code        text UNIQUE NOT NULL,-- e.g. 'ow-battle-1'
  name        text NOT NULL,
  description text NOT NULL,
  icon        text NOT NULL,       -- emoji 또는 아이콘 클래스
  unlock_source enum('achievement','event','store') NOT NULL,
  unlock_condition jsonb NOT NULL, -- 출처별 구조 다름 (아래)
  linked_id   uuid NULL,           -- event_id · store_item_id
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
)

user_badge_unlocks (
  user_id     uuid FK → users,
  badge_id    uuid FK → badges,
  unlocked_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
)
```

**unlock_condition 구조**

| unlock_source | unlock_condition 예시 | 해금 트리거 |
|---------------|------------------------|-------------|
| `achievement` | `{ "metric": "scrim_wins", "threshold": 10, "game_id": "ow" }` | 통계 집계 크론/트리거에서 임계치 도달 시 INSERT `user_badge_unlocks` |
| `event` | `{ "event_code": "spring-cup-2026", "participation": "complete" }` | 이벤트 완료 시점에 서버에서 INSERT (이벤트 기간 외 획득 불가) |
| `store` | `{ "coin_type": "personal", "price": 500 }` | 스토어 구매 플로우에서 INSERT + 개인 코인 차감 |

**store 구매 규칙**

- `coin_type = 'personal'` 고정 (클랜 코인 불가).
- 구매 직후 `user_badge_unlocks` INSERT + `user_coin_ledger` 차감 (개인 풀).
- 환불 없음. 구매 즉시 영구 해금.
- 스토어 노출은 D-STORE-01(스토어 구성)에서 확정.

**잠금 UI 카피 (뱃지 케이스 모달 툴팁)**

| unlock_source | 카피 템플릿 |
|---------------|--------------|
| `achievement` | "진행도 **{current}/{threshold}** — {metric_label} 달성 시 자동 해금" |
| `event` | "**{event_name}** 기간 한정 (~{end_date})" |
| `store` | "스토어에서 **{price} 개인 코인**으로 해금 가능" |

**연관 문서**

- [pages/14-Profile-Customization.md §모달 1 — 뱃지 케이스](./pages/14-Profile-Customization.md#모달-1--뱃지-케이스-mock-badge-case-modal)
- [pages/13-Clan-Store.md](./pages/13-Clan-Store.md) (store 출처 뱃지의 구매 진입점)
- [decisions.md §D-STORE-01](#d-store-01--코인-적립차감-트리거-매트릭스) · [§D-ECON-01](#d-econ-01--코인-수치-베이스라인) · [§D-ECON-02](#d-econ-02--코인-세탁-방지-정책)

---

### D-STORE-01 — 코인 적립/차감 트리거 매트릭스

- **결정일**: 2026-04-20
- **요지**: 클랜 풀(`clan`)과 개인 풀(`personal`) 두 계정을 분리하고, 각 풀은 **정해진 트리거로만** 유입/유출된다. 두 풀 사이의 **이전 API는 만들지 않는다**(D-ECON-02 세탁 방지의 근거). 모든 거래는 `coin_transactions`에 **INSERT-only**로 기록하고, 멱등성 키로 중복 지급·중복 차감을 차단한다.

**개인 풀 (personal)**

| 방향 | 트리거 | 참조 | 멱등성 키 | 비고 |
|------|--------|------|-----------|------|
| 적립 | 내전 출전 | `match_players` | `(match_id, user_id, 'enter')` | 매치 종료 확정 시 일괄 지급 |
| 적립 | 내전 승리 | `match_results` | `(match_id, user_id, 'win')` | 출전 보너스와 **별도** |
| 적립 | 내전 MVP | `match_results` | `(match_id, user_id, 'mvp')` | 매치당 최대 1명 |
| 적립 | 일일 출석 | `user_attendance` | `(user_id, date)` | 1회/일 |
| 적립 | 7일 연속 출석 | `user_attendance.streak` | `(user_id, streak_week_start)` | 주 1회, 최초 7일 도달 시 |
| 적립 | 이벤트 미션 완료 | `event_rewards` (Phase 2+) | `(event_id, user_id, mission_key)` | 금액은 이벤트별 |
| 적립 | 승부예측 적중 | `predictions` (Phase 2+) | `(prediction_id)` | 배당 반영 |
| 차감 | 개인 꾸미기 구매 | `purchases(pool_source='personal')` | `(purchase_id)` | 네임카드·네임플레이트·뱃지 테두리 등 |
| 차감 | store 뱃지 구매 | `user_badge_unlocks(unlock_source='store')` (D-PROFILE-04) | `(user_id, badge_id)` | **개인 코인만**, 클랜 코인 불가 |

**클랜 풀 (clan)**

| 방향 | 트리거 | 참조 | 멱등성 키 | 비고 |
|------|--------|------|-----------|------|
| 적립 | 스크림 완료 | `scrim_rooms.status='closed'` | `(scrim_room_id, clan_id)` | 양쪽 클랜 모두 지급 |
| 적립 | 대진표 참가 | `tournament_entries` (Phase 2+) | `(tournament_id, clan_id, 'entry')` | 대회당 1회 |
| 적립 | 대진표 우승 | `tournament_results` | `(tournament_id, clan_id, 'winner')` | 순위별 차등은 Phase 2+ |
| 적립 | 신규 가입자 | `clan_members.joined_at` | `(clan_id, member_id)` | **월 상한 500** (인위적 가입자 방지) |
| 적립 | Premium 월간 보너스 | `subscriptions` | `(clan_id, yyyymm)` | 월 1회, Premium 플랜 한정 |
| 차감 | 클랜 꾸미기 구매 | `purchases(pool_source='clan')` | `(purchase_id)` | 배너·아이콘·태그 글로우 등 |
| 차감 | 홍보글 상단 고정 | `board_posts.is_pinned=true` | `(post_id, pin_start_at)` | 기간성 — 연장 시 새 트랜잭션 |
| 차감 | 대진표 개최 비용 | `tournaments.hosted_by` | `(tournament_id, 'host')` | 개최 확정 시 선차감, 취소 시 반대 트랜잭션 |

**불변식**

- 개인 풀 ↔ 클랜 풀 **이전 API 없음**. UI에서 이전 버튼도 제공하지 않는다.
- 클랜 풀 지출은 **운영진+ 권한**으로 제한(일반 구성원은 `#view-store` 클랜 꾸미기 탭의 구매 버튼이 비활성).
- `coin_transactions`는 **INSERT-only** — RLS로 UPDATE/DELETE 차단. 정정은 반대 부호 트랜잭션으로만.
- 차감 트랜잭션은 `CHECK (balance_after >= 0)` — 잔액 부족 시 실패. **음수 잔액 불가**.
- 멱등성 키는 `coin_transactions (reference_type, reference_id, sub_key)` 유니크로 강제(재시도/중복 웹훅에도 안전).

**연관 문서**

- [pages/13-Clan-Store.md](./pages/13-Clan-Store.md)
- [schema.md `coin_transactions`·`store_items`·`purchases`](./schema.md#coin_transactions)
- [decisions.md §D-ECON-01](#d-econ-01--코인-수치-베이스라인) · [§D-ECON-02](#d-econ-02--코인-세탁-방지-정책) · [§D-PROFILE-04](#d-profile-04--뱃지-해금-출처)

---

### D-ECON-01 — 코인 수치 베이스라인

- **결정일**: 2026-04-20
- **요지**: Phase 1 베이스라인 수치 확정. **현금 환산 없는 순환 경제**. 평균 활동 사용자가 월간 적립으로 꾸미기 1~2개를 살 수 있는 수준을 목표로 한다. 운영 오픈 전 실 데이터로 A/B 튜닝 예정이며, 수치는 `config` 테이블(Phase 2+)로 외부화해 코드 변경 없이 조정할 수 있게 한다.

**개인 풀 적립**

| 트리거 | 금액 | 상한 |
|--------|------:|------|
| 내전 출전 | +10 | — |
| 내전 승리 | +20 | — |
| 내전 MVP | +30 | — |
| 일일 출석 | +5 | 1회/일 |
| 7일 연속 출석 보너스 | +30 | 주 1회 |
| 이벤트 미션 | +50 ~ +200 | 이벤트별 |
| 승부예측 적중 (Phase 2+) | 배당 가변 | — |
| **일일 개인 적립 상한** | **200** | **24h 롤링**, 이벤트 제외 |

**개인 풀 차감 (가격)**

| 아이템 | 가격 |
|--------|------:|
| 네임카드 테마 팩 | 400 |
| 뱃지 슬롯 테두리 | 600 |
| 네임플레이트 서브 라인 팩 | 500 |
| store 뱃지 (일반) | 500 |
| store 뱃지 (레어) | 1,200 |
| 승부예측 코인 보너스 (Premium 전용) | 1,500 |

**클랜 풀 적립**

| 트리거 | 금액 | 상한 |
|--------|------:|------|
| 스크림 완료 (양측) | +100 | — |
| 대진표 참가 | +200 | 대회당 1회 |
| 대진표 우승 | +1,000 | — |
| 신규 가입자 | +50 / 명 | **월 500** (인위적 가입 방지) |
| Premium 월간 보너스 | +500 | 월 1회 |
| **일일 클랜 적립 상한** | **2,000** | **24h 롤링** |

**클랜 풀 차감 (가격)**

| 아이템 | 가격 |
|--------|------:|
| 클랜 홈 배너 스타일 팩 | 1,200 |
| 홍보글 상단 고정 7일 | 800 |
| 클랜 태그 글로우 (Premium) | 2,000 |
| 대진표 개최 | 500 |

**운영 메모**

- 모든 수치는 `game_config` (Phase 2+)에 키-값으로 저장. 코드에 하드코딩 금지.
- 상한 초과 적립은 **조용히 드롭**(로그에만 기록). 사용자에게는 "오늘의 적립 상한에 도달했습니다" 토스트.
- 환율 없음. 100 코인 = 100 코인. 현금/현물 연결 금지(PRD 「현금 거래 없음」 원칙).

**연관 문서**

- [pages/13-Clan-Store.md](./pages/13-Clan-Store.md) (가격 표와 동기화)
- [decisions.md §D-STORE-01](#d-store-01--코인-적립차감-트리거-매트릭스)

---

### D-ECON-02 — 코인 세탁 방지 정책

- **결정일**: 2026-04-20
- **요지**: 클랜 운영진이 클랜 풀 코인을 개인 이익으로 유용하거나, 허위 가입자·자기거래로 코인을 생성·이전하지 못하게 **구조적으로 차단**한다. 핵심은 "풀 간 이전 API 부재 + 감사 로그 불변성 + 권한 분리 + 시간 지연"의 4단 방어.

**1) 풀 간 이전 완전 금지**

- 클랜 풀 → 개인 풀, 개인 풀 → 클랜 풀 **API를 구현하지 않는다**. 이전 엔드포인트 자체가 존재하지 않으므로 권한 상승 공격도 불가능.
- 클랜 풀 소비처는 **정해진 카탈로그 항목**(클랜 꾸미기·상단 고정·대진표 개최)으로만. 새 소비처는 문서화된 리뷰 절차 후 추가.

**2) `coin_transactions` 불변성**

- INSERT-only. `coin_transactions` 테이블에 대한 UPDATE/DELETE는 **RLS로 전면 차단**(서비스 롤도 불가).
- 정정이 필요하면 반대 부호 트랜잭션을 **새로** 기록. 원거래·정정거래를 `correction_of uuid NULL` 컬럼으로 연결해 감사 추적.

**3) 2-man rule (Phase 2+)**

- 1회 **500 이상**의 클랜 풀 지출은 클랜장·부클랜장 **2명 중 1명이 추가 승인**해야 확정. 단독 지출 불가.
- Phase 1 목업은 정책 안내 카피만(실제 지출 처리는 Phase 2+).

**4) 클랜장 교체 에스크로**

- 클랜장 소유권 이전 후 **72시간** 클랜 풀 **지출 동결**. 적립은 정상 작동.
- 인수자가 악의적으로 교체 직후 잔액을 약탈하는 시나리오 차단.

**5) 의심 패턴 자동 flag (Phase 2+)**

- 24h 내 전일 평균 대비 **3σ 이상** 지출 → 자동 flag + 운영자 알림 + 일시 지출 동결.
- 신규 가입자 보너스가 집중 발생한 직후 대량 지출 → flag.
- 같은 IP/디바이스에서 가입 후 즉시 탈퇴-재가입 반복(가입 보너스 farming) → flag + 보너스 무효화.

**6) 감사 필드**

- `purchases.pool_source enum('clan','personal')` 로 구매 시 소비 풀 명시.
- `purchases.approved_by uuid NULL` — 클랜 풀 지출 시 승인자 user_id.
- `coin_transactions.correction_of uuid NULL` — 정정 거래 링크.
- `coin_transactions.created_by uuid NULL` — 지출·지급을 실행한 주체(자동 적립은 NULL, 수동 지출은 user_id).

**RLS 요약**

- `coin_transactions` — SELECT: 본인 + 클랜 운영진(클랜 지출 한정). INSERT: 서비스 롤만(서버 검증 후). UPDATE/DELETE: **전면 차단**.
- `purchases` — SELECT: 본인 + 클랜 운영진(클랜 풀 구매 한정). INSERT: 서비스 롤만.

**연관 문서**

- [decisions.md §D-STORE-01](#d-store-01--코인-적립차감-트리거-매트릭스) · [§D-ECON-01](#d-econ-01--코인-수치-베이스라인)
- [schema.md `coin_transactions`·`purchases`](./schema.md#coin_transactions)

---

### D-STORE-02 — Premium 잠금 카드의 업그레이드 안내 동선

- **결정일**: 2026-04-20
- **요지**: Free 플랜 클랜에서 Premium 전용 스토어 카드·기능을 클릭하면 **플랜 비교 모달**을 연다. 모달은 역할에 관계없이 동일한 정보(플랜별 혜택 비교 + "이 항목은 클랜이 Premium 플랜일 때 이용할 수 있습니다" 안내)를 보여주고, **업그레이드 요청·알림 플로우는 구현하지 않는다**. leader/officer에게는 보조 CTA로 "구독·결제 탭으로 이동" 버튼을 추가 노출한다.

**역할별 CTA 매트릭스**

| 역할 | 주 CTA | 보조 CTA | 카피 |
|------|--------|----------|------|
| leader | "플랜 비교 보기" + "구독·결제 탭으로 이동" | — | "Premium 플랜으로 업그레이드해 이 기능을 이용하세요" |
| officer | "플랜 비교 보기" + "구독·결제 탭으로 이동"(열람 전용) | — | "Premium 전용 항목입니다. 플랜 변경은 클랜장이 진행합니다" |
| member | "플랜 비교 보기" (모달 내 표만) | — | "Premium 전용 항목입니다. 클랜장에게 문의하세요" |

**플랜 비교 모달 내용 (Phase 1 카피)**

- Free vs Premium 핵심 차이 요약표(자동 밸런스·A 점수·맵 밴·디스코드 알림·대진표·승부예측·태그 글로우 등).
- 가격은 운영 정책(별도 결정).
- 모달 하단 "자세한 내용은 플랜 비교 문서를 참고하세요" 링크 (Phase 2+).

**의도적으로 하지 않는 것**

- 업그레이드 **요청 알림**(leader 수신 알림) — Phase 2+ `clan_notifications` 인프라가 잡히면 재검토.
- member → leader **직접 DM·채팅** 링크 — D-SHELL 영역. 스토어 모달 범위 밖.
- Premium 가격 표기 — 과금 정책 별도 결정.
- 모달에서 **결제 즉시 시작** — `#subscription` 탭 경유 원칙 고수(D-MANAGE-01).

**목업**

- `.mock-store-card.pro` 비활성 버튼 그대로 유지. 클릭 시 `mockStorePremiumInfoModalOpen()` 로 플랜 비교 모달 오픈.
- 모달 내부는 Free/Premium 비교표 고정 HTML + 역할별 CTA 분기(`body.mock-role-leader` / `.mock-role-officer` 클래스로 스위칭).

**연관 문서**

- [pages/13-Clan-Store.md §Free / Premium 분기](./pages/13-Clan-Store.md#free--premium-분기)
- [decisions.md §D-MANAGE-01](#d-manage-01--구독결제-탭-접근-권한) (구독·결제 탭 권한)
- [gating-matrix.md](./gating-matrix.md) §8 (스토어 권한)

---

### D-STORE-03 — 환불·되돌리기 정책

- **결정일**: 2026-04-20
- **요지**: 모든 스토어 구매는 **환불 없음, 구매 즉시 영구 적용**이 원칙(D-PROFILE-04 store 뱃지 정책과 정합). 단, ① **시스템 오류 자동 롤백**과 ② **운영자 재량 정정**의 두 가지 예외 경로만 허용한다. 사용자 주도의 환불 UI·셀프 취소 버튼은 제공하지 않는다. 모든 정정은 `coin_transactions`에 **반대 부호 거래로만** 기록되며 `correction_of`로 원거래와 연결해 **감사 추적 가능**해야 한다.

**예외 1 — 시스템 오류 자동 롤백**

| 오류 유형 | 처리 |
|-----------|------|
| 구매 트랜잭션 중 서버 장애로 코인 차감 후 `purchases` INSERT 실패 | 트랜잭션 롤백 후 **자동 보상 거래** INSERT (`correction_of` 연결) |
| 멱등성 키 중복 검출(재시도·중복 웹훅) | 중복 거래 INSERT 차단. 이미 성립한 거래만 남김 |
| 가격표 오표기로 `store_items.price_coins` 와 UI 표기가 달랐던 구매 | 운영자가 오표기 확인 후 **차액 환급** 거래(정정 유형 `price_correction`) |

- 자동 롤백은 서비스 롤(서버)만 실행. `correction_of`·`reason='system_rollback'`으로 기록.

**예외 2 — 운영자 재량 정정**

- 적용 대상 시나리오: 계정 탈취 증명·아이템 기능 결함·정책 위반 구매 확인·재해 보상.
- **적용 불가 시나리오**: "실수로 구매했다"·"마음이 바뀌었다"·"친구가 대신 샀다" 등 **사용자 귀책**. 정책 카피로 일관 거절.

**운영자 정정 필수 원칙**

1. 모든 정정은 `coin_transactions` INSERT-only로만 기록. `purchases`는 삭제하지 않고 `voided_at` 타임스탬프·`voided_by user_id`·`void_reason text` 필드로 무효화 표시(`purchases` 행은 감사용으로 영구 보존).
2. **자기 계정 정정 금지** — 운영자 본인(또는 본인 소속 클랜)의 거래는 정정 불가(이해 상충). `created_by = voided_by` 검증 서버에서 차단.
3. **정정 사유 기록 필수** — `void_reason` NOT NULL. 빈 값으로는 INSERT 불가.
4. **월 정정 리포트** — 운영자 투명성. 클랜 외부에는 비공개이되, 월별 정정 건수·사유 집계를 `admin_audit_reports`에 자동 생성(Phase 2+).
5. **구매자 알림** — 정정 성립 시 구매자에게 메일·인앱 알림으로 사유 고지.

**환불 스키마 영향**

- `purchases`에 `voided_at timestamptz NULL`, `voided_by uuid FK → users NULL`, `void_reason text NULL` 추가.
- `coin_transactions.reason` 에 `refund_void`·`system_rollback`·`price_correction` 추가.
- `correction_of`로 원거래 ↔ 정정거래 1:1 연결. 한 원거래는 유효한 정정거래를 최대 1건만 가질 수 있다(트리거 또는 서비스 레이어 검증).

**UI · 카피**

- 구매 확인 다이얼로그: "구매 후 **환불은 지원되지 않습니다**. 계속하시겠습니까?"
- 스토어 정책 박스(목업 `mock-store-policy-sep`): "환불·되돌리기는 제공하지 않습니다. 시스템 오류와 운영자 판정 예외만 정정합니다(D-STORE-03)."
- 운영자 정정 툴은 Phase 2+ 관리자 콘솔에만 노출. 일반 사용자 UI에 환불 버튼 없음.

**법적 고지**

- `legal-review.md` "환불 정책 명시 필수" 항목은 본 결정을 **이용 약관 §꾸미기·코인 조항**에 반영함으로써 충족. 현금 거래 없음 원칙과 함께 기재.

**연관 문서**

- [pages/13-Clan-Store.md](./pages/13-Clan-Store.md)
- [schema.md `purchases`·`coin_transactions`](./schema.md#purchases)
- [decisions.md §D-PROFILE-04](#d-profile-04--뱃지-해금-출처) (store 뱃지 환불 불가 원칙) · [§D-ECON-02](#d-econ-02--코인-세탁-방지-정책) (`correction_of` 감사 구조)
- [non-page/legal-review.md](./non-page/legal-review.md)

---

### D-ECON-03 — 클랜 순위표 민감 지표 노출 범위

- **결정일**: 2026-04-20
- **요지**: **외부 공개 클랜 순위표**에서 승률·K/D·MVP 수 등 **경쟁 지표를 전면 제외**한다. 친목·즐겜·빡겜·프로 등 다양한 지향(`clans.style`)을 허용하는 서비스 정책과 정합하며, 경쟁 지표로 인해 친목 지향 클랜이 위축되거나 허수 기록 욕구가 생기는 것을 구조적으로 방지한다. 경쟁 지표는 **해당 클랜의 운영진+ 내부 화면**(클랜 관리·명예의 전당·내전 히스토리)에서만 열람 가능하다.

**지표 노출 매트릭스**

| 지표 | 외부 순위표 | 클랜 상세 프로필(외부 열람) | 클랜 관리(운영진+) | 비고 |
|------|:---:|:---:|:---:|------|
| 클랜 인원 수 | ✓ | ✓ | ✓ | 규모 |
| 최근 30일 활동 멤버 비율 | ✓ | ✓ | ✓ | 활동성 대표 |
| 스크림 완료 건수 (최근 90일) | ✓ | ✓ | ✓ | 활동성 |
| 스크림 매너 평균 (`scrim_ratings.manner_score`) | ✓ | ✓ | ✓ | 평판 |
| 이벤트 참여 횟수 (최근 90일) | ✓ | ✓ | ✓ | 참여성 |
| 클랜 태그·지향·티어 범위 | ✓ | ✓ | ✓ | 소개성 |
| **내전 경기 수** | ✗ | ○ (클랜 자체 설정으로 공개 가능) | ✓ | D-STATS-03 측정 단위 결정 후 재검토 |
| **내전 승률** | ✗ | ✗ | ✓ | 경쟁 지표 — 외부 비공개 |
| **개인 승률·MVP 랭킹** | ✗ | ✗ | ✓ | 개인 단위 민감 |
| **K/D·전투 지표** | ✗ | ✗ | ✓ | 경쟁 지표 |
| **HoF 기록** | ✗ | ○ (클랜장 공개 토글 시) | ✓ | D-STATS-01 권한 결정과 연동 |

- `○` = 클랜 설정으로 토글 가능. 기본값 비공개.
- `✗` 지표는 **API 응답 자체에 포함하지 않는다**(서버 레벨 필터링). 클라이언트 토글 감춤이 아님.

**정렬 기준 (공개 순위표)**

- 기본: **활동 스코어** = 활동 멤버 비율 × 스크림 완료 건수 × 매너 평균을 정규화한 복합 지수.
- 보조 정렬: 규모(인원수 내림차순), 신생(생성일 오름차순), 매너 점수.
- **"인기" 정렬은 제거**(D-RANK-01 관련) — 조회수 필드 없음·외부 경쟁 유인 최소화.

**제외 대상 확장**

- `clans.moderation_status IN ('warned','hidden','deleted')` 클랜은 순위표에서 **완전 제외**(D-CLAN-03과 연동).
- `clans.lifecycle_status='dormant'` 클랜도 제외. `stale`은 표시하되 말미 정렬.

**내부 화면 규칙**

- 클랜 관리·HoF·내전 히스토리는 **해당 클랜 구성원에게만** 경쟁 지표 공개.
- 단, `clan_settings.expose_competitive_metrics boolean DEFAULT false`(Phase 2+) 토글을 두어 클랜장이 자기 클랜의 경쟁 지표를 **클랜 상세 프로필(외부)** 에 선택적으로 공개할 수 있다. 기본값은 비공개.
- 토글 ON/OFF 이력은 감사 로그에 기록.

**연관 문서**

- [schema.md 「클랜 순위·통계 지표」](./schema.md#클랜-순위통계-지표-승률-등-경쟁-지표-제외)
- [slices/slice-05-clan-stats.md](./slices/slice-05-clan-stats.md)
- [decisions.md §D-RANK-01](#) (OPEN — "인기" 정렬 기준) · [§D-STATS-01~04](#) (OPEN)
- [pages/10-Clan-Rank.md](./pages/10-Clan-Rank.md) (해당 파일 있을 경우)

---

### D-ECON-04 — 특이사항 태그 카탈로그

- **결정일**: 2026-04-20
- **요지**: BalanceMaker 슬롯 등에 붙는 **특이사항 태그**는 **서버 자동 산정**으로만 부여한다. 사용자 수동 태깅·운영자 수동 태깅 모두 허용하지 않는다(악용·담합 방지). Phase 1 초기 카탈로그로 **13종 태그**를 확정하고, 집계 창·갱신 시점·해제 조건·노출 우선순위를 문서화한다. 추가 태그는 결정 블록 갱신과 함께 도입한다.

**집계 범위**

- 집계 대상: **본 클랜 내전**(`matches` + `match_players`, `match_type='intra'`)만. 외부 랭크·스크림·대진표 경기는 집계하지 않는다.
- 집계 기준 시각: `matches.played_at`(KST).
- "최근 N경기"는 해당 유저의 **본 클랜 내전 참여 이력** 역순 N건.

**Phase 1 태그 카탈로그**

| 코드 | 톤 | 트리거 규칙 | 해제 조건 | 최대 동시 표시 |
|------|-----|-------------|-----------|---------------|
| `streak_lose_3` | bad | 최근 3경기 연속 패배 | 1승 발생 | ✓ |
| `streak_lose_4` | bad | 최근 4경기 연속 패배 | 1승 발생 | ✓ (`_3` 덮어쓰기) |
| `streak_lose_5` | bad | 최근 5경기 연속 패배 | 1승 발생 | ✓ (`_4` 덮어쓰기) |
| `streak_win_3` | good | 최근 3경기 연속 승리 | 1패 발생 | ✓ |
| `streak_win_5` | good | 최근 5경기 연속 승리 | 1패 발생 | ✓ (`_3` 덮어쓰기) |
| `slump` | bad | 최근 10경기 이상 참여 & 승률 < 30% | 10경기 이동창 승률 ≥ 40% | ✓ |
| `hot_streak` | good | 최근 10경기 이상 참여 & 승률 > 70% | 10경기 이동창 승률 ≤ 60% | ✓ |
| `map_expert` | good | 해당 맵 5경기 이상 & 해당 맵 승률 > 60% | 해당 맵 재계산 값 하락 | 맵별 1개 |
| `map_rookie` | neutral | 해당 맵 본 클랜 첫 경기 | 해당 맵 1경기 완료 | 맵별 1개 |
| `mvp_hot` | good | 최근 5경기 중 MVP 2회 이상 | 다음 MVP 스냅샷에서 조건 미충족 | ✓ |
| `no_show` | bad | 최근 30일 내 노쇼(`balance_session_absences` 등) 1회 | 30일 경과 | ✓ |
| `no_show_repeat` | bad | 최근 90일 내 노쇼 2회 이상 | 90일 경과 | ✓ (`no_show` 덮어쓰기) |
| `new_clan_week` | neutral | 클랜 가입 7일 이내 | 가입 후 7일 경과 | ✓ |

**상호 배타 규칙** (같은 범주 내 상위 태그가 하위 태그를 덮는다)

- `streak_lose_5` > `streak_lose_4` > `streak_lose_3` — 더 긴 연패만 표시.
- `streak_win_5` > `streak_win_3` — 동일.
- `no_show_repeat` > `no_show` — 누적이 우선.

**노출 규칙**

- BalanceMaker 슬롯 라인 2(`mock-balance-slot-line2-tray`)에 세로로 쌓는다.
- **최대 3개**까지 표시. 초과 시 우선순위 `bad > neutral > good` 순.
- 본 클랜 내전에서만 노출. 다른 화면(플레이어 프로필 카드·클랜 관리 리스트 등)에는 **노출하지 않는다**(경기 컨텍스트 전용).

**갱신 시점**

1. **경기 결과 입력 시** — 해당 경기 참여자 전원의 태그를 재계산(`matches.ended_at` 업데이트 트리거).
2. **밸런스 세션 생성 시** — 해당 클랜 전 구성원 스냅샷 재계산(BalanceMaker A 점수 갱신과 같은 흐름).
3. **일일 배치** — KST 06:00에 30일·90일 창 기준 태그(`no_show`·`new_clan_week` 경계) 일괄 재계산.

**스냅샷 저장**

- `match_tags (user_id, clan_id, code, tone, computed_at, expires_at NULL)` 테이블에 **현재 유효 태그**만 저장(이력 불필요). `(user_id, clan_id, code) UNIQUE`.
- `computed_at` 은 최근 재계산 시각, `expires_at` 은 시간 기반 해제가 있는 태그(`no_show` 등)의 만료.
- 서버는 태그 반영 UI 쿼리에서 `expires_at > now() OR expires_at IS NULL` 만 조회.

**악용 방지 (Phase 2+ 검토)**

- 같은 두 플레이어 조합이 반복 경기를 올려 `streak_lose` 고정으로 만드는 시나리오 → 같은 상대와의 24h 내 반복 경기에 가중치 0.5 적용 검토.
- 동일 클랜 내 담합(특정 유저에게 `streak_lose`를 강제) 감지 → 의심 패턴 flag(D-ECON-02 감지 체계와 통합).

**수동 태깅 관련**

- 사용자·운영자 **수동 태깅 불가**. UI에 태그 추가·삭제 버튼을 만들지 않는다.
- 신고·이의제기는 별도 경로(운영자 콘솔)에서만 처리하며, 그 결과는 원본 집계 데이터(`matches`·`match_players`·노쇼 기록)를 정정함으로써 태그에 반영된다.

**연관 문서**

- [pages/09-BalanceMaker.md §특이사항 태그](./pages/09-BalanceMaker.md#특이사항-태그)
- [schema.md `matches`·`match_players`](./schema.md#matches) (신설 `match_tags` 테이블)
- [decisions.md §D-ECON-02](#d-econ-02--코인-세탁-방지-정책) (악용 감지 체계 공유)

---

### D-LANDING-01 — 랜딩 캐치프라이즈 최종 문구 (잠정)

- **결정일**: 2026-04-20 (잠정 채택)
- **요지**: 현재 목업 헤드라인을 **Phase 1 잠정 안**으로 그대로 채택한다. 서비스 구현이 완료되고 실 사용자 피드백이 확보되는 **Phase 2+ 시점에 재검토**한다. 카피는 브랜드·마케팅·법적 고지의 교차 영향이 있어 구현 완성도와 함께 재평가해야 변경 실효가 크다.

**채택된 문구 (Phase 1)**

- **H1 타이틀**: `Archive Your History, Stay in Sync`
- **부제**: "추억을 기록하고 클랜을 체계적으로 관리하세요."

**재검토 트리거** (Phase 2+)

- Phase 2 베타 테스트 종료 시점에 사용자 조사(5-Second Test·First-Impression Test) 수행.
- 한글 우선 문구 도입 여부 재검토(현재는 영어 타이틀 + 한글 부제 하이브리드).
- 기능 키워드(내전·스크림·밸런싱·통계)를 타이틀 또는 부제에 포함시킬지 결정.
- 다국어 지원(D-LANDING-02) 도입 시점과 맞춰 EN/JP 카피 동시 수립.

**Phase 1 변경 규칙**

- 목업·랜딩 카피는 이 결정이 정한 현재 문구를 **변경하지 않는다**. 캐러셀·섹션 부제·CTA 버튼 등 기타 랜딩 카피도 Phase 1 동안은 고정. 변경이 필요하면 이 결정을 **재오픈**하는 별도 PR로만 진행.

**연관 문서**

- [pages/01-Landing-Page.md](./pages/01-Landing-Page.md)
- [BACKLOG.md](./BACKLOG.md) (이미 이관 완료 기록)

---

### D-LANDING-02 — 다국어 활성 시점과 범위

- **결정일**: 2026-04-20
- **요지**: Phase 1·Phase 2 동안 서비스 전체 UI는 **KR 전용**으로 운영한다. 랜딩의 `KR / EN / JP` 버튼은 **시각적 토글**로만 남기고 클릭 시 **"준비 중(Coming soon)" 안내 토스트**를 띄운다. 실제 i18n 도입은 **Phase 3+** 에 우선순위 **EN → JP** 로 진행한다.

**Phase 단계별 범위**

| Phase | KR | EN | JP |
|-------|:---:|:---:|:---:|
| Phase 1 (목업·정적) | ✓ (실제) | 시각 토글만 + "준비 중" 안내 | 동일 |
| Phase 2 (Next.js·베타) | ✓ (실제) | 시각 토글만 + "준비 중" 안내 | 동일 |
| Phase 3 (글로벌 확장) | ✓ | ✓ (도입) | 시각 토글만 |
| Phase 4+ | ✓ | ✓ | ✓ (도입) |

**구현 원칙**

- 랜딩의 KR/EN/JP 버튼은 `aria-pressed`·시각 active 상태만 유지. 클릭 시 **토스트 1회**(3s) — "English/日本語 지원은 준비 중입니다".
- 버튼을 완전히 제거하지 않는 이유: ① 향후 i18n 확장 의지 표명 ② 레이아웃 공간 확보 ③ 글로벌 사용자에게 "한국어만 지원" 신호 제공.
- HTML `lang` 속성은 `lang="ko"` 고정(Phase 2까지).
- 서버 API 응답·이메일·알림은 모두 KR 전용. `users.language` enum 컬럼은 스키마에 남기지만(Phase 3+ 대비) Phase 1·2에서는 DEFAULT `'ko'`·변경 UI 없음.

**Phase 3 도입 시 필요 작업 (체크리스트 · 이 결정에 속함)**

- 카피 번역 — 랜딩·가입/로그인·에러 메시지·이메일·약관 전체.
- 날짜·숫자·통화 로케일 — 코인 표기·KST 시각 표기 등.
- 브랜드 용어 번역 기준 — 내전·스크림·밸런싱 등 고유 용어 번역 여부(영어권은 `Intra-Clan / Scrim / Balance`로 차용어 검토).
- 문의(`/contact`) 폼 다국어 라벨·에러 메시지.

**연관 문서**

- [pages/01-Landing-Page.md](./pages/01-Landing-Page.md)
- [schema.md `users.language`](./schema.md#users-supabase-auth-연동)
- [pages/04-Main_GameSelect.md](./pages/04-Main_GameSelect.md) (다른 페이지 언어 버튼 처리도 동일 규칙 적용)

---

### D-LANDING-03 — 약관·개인정보·API ToS·문의 페이지 구현 방식

- **결정일**: 2026-04-20
- **요지**: 약관 3종(`/terms` · `/privacy` · `/api-tos`)은 **정적 MDX/Markdown 라우트**로 구현하고, **`/contact`만 내부 폼**으로 구현해 제출 시 `contact_requests` 테이블에 INSERT 한다. 운영자 관리자 콘솔(Phase 2+)에서 열람·답변·상태 관리한다. 스팸 방지 레이어(Captcha·rate limit·honeypot) 필수.

**라우트·구현 매트릭스**

| 라우트 | 구현 방식 | 내용·갱신 | 인증 |
|--------|-----------|-----------|------|
| `/terms` | MDX 정적 | 이용약관. 변경 시 버전 스냅샷(`terms_versions` Phase 2+) | Anonymous |
| `/privacy` | MDX 정적 | 개인정보처리방침. 법적 변경 이력 필수 | Anonymous |
| `/api-tos` | MDX 정적 | 게임사 API 이용 고지(Blizzard·Riot 등 브랜드 고지) | Anonymous |
| `/contact` | **Next.js 라우트 + Server Action** | 제목·본문·이메일·유형(select) 입력 폼 → INSERT. 제출 후 성공 페이지로 이동 | Anonymous OK(비로그인 문의 허용) + 로그인 시 `user_id` 자동 연결 |

**`/contact` 폼 스펙 (Phase 2+)**

- 필수 입력: 이메일·문의 유형(`account`·`payment`·`bug`·`policy`·`other`)·제목(최대 120자)·본문(최대 4000자).
- 선택 입력: 관련 클랜(로그인 시 자동 매칭 + 수동 선택)·첨부(Phase 3+).
- 스팸 방지:
  - Turnstile 또는 reCAPTCHA v3 검증(Server Action 내부).
  - IP + 이메일당 **하루 5회** rate limit(`contact_rate_limits` 테이블 또는 Redis).
  - Honeypot 숨김 필드(봇 자동 제출 감지).
  - Profanity·URL 슬램 필터 최소 1단.
- 제출 완료 시 이메일 자동 발송(`/contact/thanks` 페이지 리디렉트 + 접수 확인 메일).

**`contact_requests` 테이블** (schema.md 반영)

- `id uuid PK`, `user_id uuid FK NULL`, `email citext NOT NULL`, `category enum NOT NULL`, `title varchar(120)`, `body text NOT NULL`, `clan_id uuid FK NULL`, `status enum('open','in_progress','resolved','spam','deleted') DEFAULT 'open'`, `assigned_to uuid FK NULL`, `created_at timestamptz`, `resolved_at timestamptz NULL`, `ip_hash bytea NULL`, `user_agent text NULL`.
- RLS: INSERT는 Anonymous + 서비스 롤(rate limit 검증 후). SELECT·UPDATE·DELETE는 운영자 role만.

**약관 버전 관리 (Phase 2+ · 메모)**

- `terms_versions(version, effective_from, published_at, source_commit)` 테이블로 약관 개정 이력 관리 예정.
- 사용자 동의 로그는 `user_terms_agreements(user_id, version, agreed_at)` 로 가입·재동의 시점 추적.
- Phase 1 목업은 링크만 유지하고 실제 페이지는 만들지 않는다.

**목업 처리**

- 푸터 4개 링크는 계속 `href="#"` 유지. **`title` 툴팁**으로 "실제 페이지는 Phase 2+ 구현" 안내.
- `onclick` 으로 alert 띄우지 않고 단순 앵커 이동만(스크롤 위로 올라감) — 시각적 소음 최소화.

**연관 문서**

- [pages/01-Landing-Page.md](./pages/01-Landing-Page.md) (푸터)
- [pages/03-Sign-Up.md](./pages/03-Sign-Up.md) (약관 동의 체크박스)
- [schema.md `contact_requests`](./schema.md#contact_requests)
- [non-page/legal-review.md](./non-page/legal-review.md)

---

### D-LANDING-04 — 로그인된 사용자의 랜딩 진입 처리

- **결정일**: 2026-04-20
- **요지**: 이미 로그인된 사용자가 랜딩(`/`)에 진입하면 **`/games` 로 자동 리다이렉트**한다. `history.replaceState` 를 사용해 **뒤로가기가 `/` 을 재방문하지 않도록** 한다. 단, **로고 클릭(`?from=logo`) 또는 내부 앵커(`#features`·`#games`·`#pricing`) 포함 진입**은 "의도적 재방문"으로 간주하고 리다이렉트를 건너뛴다.

**리다이렉트 판정 플로우 (클라이언트 가드)**

```
/ 진입
  ├─ 로그인 여부 확인 (세션 쿠키 / JWT)
  │   · 비로그인 → 랜딩 그대로 렌더
  │   · 로그인됨 ↓
  ├─ query/hash 확인
  │   · ?from=logo     → 랜딩 그대로 렌더 (로고 클릭 재방문 의도)
  │   · #features 등   → 랜딩 그대로 렌더 (섹션 탐색 의도)
  │   · 그 외          ↓
  └─ history.replaceState("/games") → `/games` 로 이동
```

**구현 포인트**

- 리다이렉트는 **클라이언트 측**에서 수행 (Next.js App Router의 `useEffect` + `router.replace`). SSR·미들웨어에서 처리하지 않는다(캐시·SEO·크롤러 영향 회피).
- `router.replace` 대신 `window.history.replaceState` + `router.push`? → Next.js 표준 API인 `router.replace` 사용. 히스토리 스택에서 `/`는 남지 않는다.
- 로그 아웃 직후의 `/` 진입은 세션 쿠키가 이미 지워져 있으므로 자동으로 비로그인 플로우로 진입 — 추가 처리 불필요.
- 크롤러·OG 크롤링·SEO: 익명 요청은 항상 랜딩 원본을 받는다. 로그인 사용자만 클라이언트 가드로 우회.

**로고 클릭 처리 (페이지 간 공통 규칙)**

- 상단 navbar 로고(모든 페이지 공통)는 **로그인 사용자의 경우 `/games`** 로, **비로그인의 경우 `/`** 로 이동한다. 이 라우팅은 shell 헤더에서 처리(D-SHELL 영역 참조).
- "로그인 사용자가 `/`를 꼭 다시 보고 싶은" 희귀 케이스는 **로고 링크에 `?from=logo` 를 붙이는 방식은 사용하지 않는다** — 이 쿼리는 "내가 직접 주소창에 `/`를 쳤거나 외부 링크로 왔을 때 랜딩을 보겠다"는 수동 탈출구로만 남긴다.

**UX 안전장치**

- 리다이렉트 지연은 **100ms 이내**로 체감되지 않아야 한다. `useEffect` 첫 페인트 전에 가드가 실행되어 랜딩 히어로가 깜빡이지 않도록 **router.replace 호출을 첫 paint 이전**에 실행하거나, 서버 컴포넌트에서 `cookies()` 로 세션 확인 후 `redirect("/games")` 수행(권장 — SSR 리다이렉트가 깜빡임 없음).
- **예외**: 미들웨어 레벨에서 `/` → `/games` 리다이렉트를 하면 크롤러·OG 카드 이미지 생성·소셜 공유 미리보기에 영향. 반드시 **페이지 컴포넌트 내부**에서 세션 읽고 조건부 `redirect` 해야 한다.

**목업 처리 (Phase 1)**

- 목업 `index.html`에 실제 세션이 없으므로 시뮬레이션용 스위치만 추가: 상단에 `<!-- D-LANDING-04: 실서비스에서는 로그인 세션 확인 후 /games 자동 리다이렉트 -->` 주석 + `?simulate=logged_in` 쿼리 시 `games.html`로 `location.replace`.

**연관 문서**

- [pages/01-Landing-Page.md](./pages/01-Landing-Page.md)
- [pages/04-Main_GameSelect.md](./pages/04-Main_GameSelect.md) (리다이렉트 목적지)
- [decisions.md §D-SHELL 계열](#) (shell 로고 라우팅 — 별도 결정 OPEN)
