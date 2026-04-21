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
| D-EVENTS-01 | DECIDED (2026-04-20) · Supplemented (2026-04-21) → D-PERM-01 흡수 (2026-04-21) | 스크림 확정 → 클랜 이벤트 자동 생성 + 수동 등록 유형 제한 + RSVP 범위 + 권한 분기 | `scrim_rooms.status='confirmed'` 전환 시 **양쪽 클랜 각각**에 `clan_events` 자동 INSERT. `source='scrim_auto'` 이벤트는 **읽기 전용**. **수동 등록은 내전·이벤트 2종만**. **RSVP는 스크림 전용 단일 토글**. → 편집·삭제·참가 명단 권한은 권한 키 `manage_clan_events`(기본 운영진+, 토글 가능)로 일반화. [§D-EVENTS-01](#d-events-01--스크림-확정--클랜-이벤트-자동-생성동기화) · [§Supplemental](#d-events-01-supplemental--유형-수동-제한--rsvp-범위--권한-분기--2026-04-21) |
| D-EVENTS-02 | REVISED (2026-04-21) | 일정 반복 — 요일·시각만, 종료 조건·상한 폐지 | 반복은 `weekly`(월~일 다중 체크박스 + `HH:mm`) · `monthly`(시작일의 day-of-month + `HH:mm`) · `none` 3종뿐. **종료 조건(count/until/never) 3모드 및 52회 hard stop 전면 폐지** — 편집(반복=none 저장) 또는 삭제로만 종료. [§D-EVENTS-02 Revised](#d-events-02-revised--일정-반복-요일시각-기반-무기한--2026-04-21) |
| D-EVENTS-03 | DECIDED (2026-04-20) | 일정 알림 채널 (카카오/디스코드) 발송 시점·실패 시 재시도 | Premium 전용 Discord + 카카오 알림톡, Free는 in-app만. **카카오 기본 OFF**(옵트인), Discord 연동 시 ON. 발송 슬롯 T-24h·T-1h·T-10min·T+0. 재시도 지수 백오프 5회(1m→5m→30m→2h→6h) 후 DLQ. Quiet hours 00~07 KST 카카오 연기. 중복 방지 `(event_id, kind, scheduled_at, channel)` UNIQUE. [§D-EVENTS-03](#d-events-03--일정투표-알림-채널정책) |
| D-EVENTS-04 | DECIDED (2026-04-20) | 투표 알림 반복(`마감 전까지 매일`) ↔ 마감일과의 일관성 검증 | 반복 모드별 마감 하한: **매일 ≥ +48h**, **매주 ≥ +14d**, **마감 전까지 매일 ≥ +24h** (24h 미만 에러). 상한 60d(초과 경고). 투표 생성 시 Server Action이 전체 발송 스케줄을 `notification_log` 예약 INSERT, 마감 도달 시 잔여 예약 자동 취소. [§D-EVENTS-04](#d-events-04--투표-알림과-마감일-일관성-검증) |
| D-EVENTS-05 | DECIDED (2026-04-20) | 대진표(Bracket) 결과의 클랜 통계·코인 반영 여부 | **대진표 = 클랜 내 이벤트**(클랜 간 토너먼트는 기획 없음). 통계는 **별도 섹션**("대진표" 탭)으로 정기 내전(`match_type='intra'`)과 완전 분리. HoF·외부 순위표 반영 X(D-ECON-03 유지). 참여율·매너 점수는 내전과 동일 가중치 가산. **코인은 D-ECON-01 확정값만**(개최 500 차감·참가 +200·우승 +1,000, 전부 클랜 풀). 개인 풀 보상·MVP 자동 산정 **없음**. [§D-EVENTS-05](#d-events-05--대진표-결과의-통계코인-반영) |

## 클랜 관리 (MANAGE)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-MANAGE-01 | DECIDED (2026-04-20) → D-PERM-01 흡수 (2026-04-21) | 구독·결제 탭 접근 권한 | officer는 **열람**(금액·일시 포함). **플랜 변경·결제 수단·환불·영수증 상세·환불**은 leader 전용. → 권한 키 `manage_subscription`(잠김)으로 일반화. [§D-MANAGE-01](#d-manage-01--구독결제-탭-접근-권한) |
| D-MANAGE-02 | DECIDED (2026-04-20) → D-PERM-01 흡수 (2026-04-21) | 구성원 개인 상세 편집 권한 + 휴면 일괄 강퇴 | 역할 변경·officer 강퇴·휴면 일괄 강퇴·leader 위임은 **leader 전용**. member 강퇴·가입 요청 승인/거절은 officer 허용. **M점수 편집**은 클랜 설정 토글. → 권한 키 `delegate_leader`/`kick_officer`/`bulk_kick_dormant`(잠김), `kick_member`/`approve_join_requests`/`edit_mscore`(토글)로 일반화. [§D-MANAGE-02](#d-manage-02--구성원-개인-상세-편집-권한과-m점수-토글) |
| D-MANAGE-03 | DECIDED (2026-04-20) → D-PERM-01 흡수 (2026-04-21) | 부계정 조회 정책 | 자기신고 방식 유지. 조회 범위는 **클랜 설정 토글** → 권한 키 `view_alt_accounts`(개인 정보 카테고리, **기본 ✓/✓/✓**)로 일반화. 기본값이 운영진→멤버까지로 확장됨. [§D-MANAGE-03](#d-manage-03--부계정-조회-정책과-공개-범위-토글) |
| D-MANAGE-04 | DECIDED (2026-04-20) | 클랜 배너·아이콘 업로드 제약 | 배너 **3MB** / 아이콘 **2MB**. MIME `image/jpeg·png·webp`. 애니메이션 불가. 서버 자동 리사이즈·썸네일. [§D-MANAGE-04](#d-manage-04--클랜-배너아이콘-업로드-제약) |

## 권한 (PERM)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-PERM-01 | DECIDED (2026-04-21) | 클랜 권한 매트릭스 모델 도입 (Discord 스타일 하이브리드) | **6 카테고리 × 21 권한 키** (재무·계정 / 멤버 관리 / 평판·통계 / 경기 운영 / 홍보·자원 / **개인 정보**). 잠긴 권한 5개(leader 고정), 토글 가능 권한 16개. 저장: `clan_settings.permissions jsonb`. Phase 1 = 카탈로그·스키마·목업 const만. Phase 2+ = 매트릭스 UI 구현. 기존 D-MANAGE-01/02/03·D-EVENTS-01·D-SCRIM-02·D-STATS-01/02/04 결정 흡수. [§D-PERM-01](#d-perm-01--클랜-권한-매트릭스-모델-도입) |

## 스토어 · 코인 (STORE)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-STORE-01 | DECIDED (2026-04-20) | 클랜 코인·개인 코인의 적립/차감 트리거 매트릭스 | 개인 풀·클랜 풀 **이전 금지**. 개인 적립: 내전 출전/승리/MVP·출석·이벤트·승부예측. 개인 차감: 개인 꾸미기·store 뱃지. 클랜 적립: 스크림 완료·대진표·신규 가입자(월 상한 500)·Premium 월 보너스. 클랜 차감: 클랜 꾸미기·홍보 상단 고정·대진표 개최. 멱등성 키 필수, `coin_transactions` INSERT-only. [§D-STORE-01](#d-store-01--코인-적립차감-트리거-매트릭스) |
| D-STORE-02 | DECIDED (2026-04-20) | Premium 잠금 카드의 업그레이드 안내 동선 | Premium 카드 클릭 → **플랜 비교 모달 + "클랜장에게 문의하세요" 카피**(요청 플로우·알림 없음). leader/officer는 모달에서 `#subscription` 탭 이동 CTA 추가. member는 정보 표시만. [§D-STORE-02](#d-store-02--premium-잠금-카드의-업그레이드-안내-동선) |
| D-STORE-03 | DECIDED (2026-04-20) | 구매 후 환불·되돌리기 정책 | **환불 없음 원칙** + 시스템 오류 자동 롤백 + **운영자 재량 정정**(반대 부호 `coin_transactions` + `correction_of`). 자기 계정 정정 금지, 감사 로그 필수, 월 정정 리포트. `purchases.voided_at`·`voided_by`·`void_reason` 추가. [§D-STORE-03](#d-store-03--환불되돌리기-정책) |

## 메인 게임 허브 (MAINGAME)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-LFG-01 | DECIDED (2026-04-21) | LFG 신청 후 상태(applied/accepted/canceled) UI · 본인 화면 표시 | 상태 enum 5종(`applied`/`accepted`/`rejected`/`canceled`/`expired`). 신청자 카드에 "신청됨" 배지 + 헤더 "내 신청 N건" pill, 모집자 카드에 "신청자 N명" + 수락/거절. 중복 신청 금지(부분 UNIQUE). `lfg_applications` 테이블 신설. [§D-LFG-01](#d-lfg-01--lfg-신청-상태-ui와-수락-플로우) |
| D-RANK-01 | DECIDED (2026-04-21) | 클랜 홍보 정렬의 "인기" 기준 (조회수 필드 부재) | **"인기" 정렬 폐기**. 외부 경쟁 유인 차단(D-ECON-03 정합) + 가입 신청 자체가 인기 측정. `setPromoSort` 옵션은 `newest` / `space` 2종만. Phase 2+에 `activity_pct_30d` 추가 시 "활성도" 정렬 도입 후보. [§D-RANK-01](#d-rank-01--클랜-홍보-인기-정렬-폐기) |
| D-SCRIM-01 | DECIDED (2026-04-21) | 스크림 채팅 자동 종료 시점(목업: 시작 +6h)의 운영 정책 확정 | 상태별 종료 시점 분기: `confirmed`/`matched`=`scheduled_at + 6h`, `cancelled`=`cancelled_at + 1h`, `finished`=`finished_at + 24h`, `draft`=모집글 만료 시. 종료 = 메시지 INSERT 차단(RLS) + 읽기 전용. 운영진 수동 닫기 가능. T-1h in-app 알림. [§D-SCRIM-01](#d-scrim-01--스크림-채팅방-자동-종료-정책) |
| D-SCRIM-02 | DECIDED (2026-04-21) → D-PERM-01 흡수 (2026-04-21) | 스크림 양측 운영진 확정 동시성 처리 (한쪽만 확정한 상태에서 일정 변경) | **2-phase commit**: `scrim_room_confirmations`(`scrim_room_id`, `side`) UNIQUE. 양쪽 행 존재 시 트리거가 `scrim_rooms.status='confirmed'` UPDATE. → 권한 키 `confirm_scrim`(잠김, 운영진+ 고정)으로 일반화. [§D-SCRIM-02](#d-scrim-02--스크림-양측-확정-동시성-2-phase-commit) |

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
| D-STATS-01 | DECIDED (2026-04-21) → D-PERM-01 흡수 | HoF 설정 권한 (운영진+ 전체 vs 클랜장 전용) | 권한 키 `set_hof_rules`로 등록. 기본 leader만(✓/✗/✗), 클랜 토글로 officer 허용 가능. [§D-STATS-01](#d-stats-01--hof-설정-권한-d-perm-01-흡수) |
| D-STATS-02 | DECIDED (2026-04-21) | 경기 기록의 사후 정정 권한·이력 보존 정책 | 직접 정정 권한은 `correct_match_records`(기본 leader, officer 허용 토글). 일반 멤버는 **정정 요청 모달**로 운영진에게 요청 (`view_match_records` 권한 보유자에 한함, 7일 만료, 결과/로스터/맵 + 자유 사유). 신설 테이블 `match_record_correction_requests` + `match_record_history`(before/after 자동 기록). 운영진 수동 정정 — 자동 적용 X. [§D-STATS-02](#d-stats-02--경기-사후-정정-요청-모달과-이력-보존) |
| D-STATS-03 | DECIDED (2026-04-21) | "앱 이용 횟수" 측정 단위 정의 (세션 / 페이지뷰 / 액션) | **활동일 (person-day, DAU 합산)** — 멤버가 자기 클랜 페이지에 첫 페이지뷰를 기록한 날 = 1. `clan_daily_member_activity(clan_id, user_id, activity_date)` UNIQUE. 영역 1(누적 활동일) ↔ 영역 2(distinct 멤버) ↔ 영역 3(내전 경기 수)이 도달·참여·결과 3축 보완. 열람: 멤버 전체. 외부 노출: D-ECON-03 차단 유지. [§D-STATS-03](#d-stats-03--앱-이용-횟수-측정-단위--활동일-person-day) |
| D-STATS-04 | DECIDED (2026-04-21) → D-PERM-01 흡수 | CSV 내보내기·기간 필터 도입 여부 | CSV 내보내기는 권한 키 `export_csv`(기본 leader, officer 허용 토글)로 등록. 실제 CSV 생성·기간 필터 UI 구현은 **Phase 2+** 보류 — Phase 1은 권한 카탈로그 등록만. [§D-STATS-04](#d-stats-04--csv-내보내기-d-perm-01-흡수--phase-2-구현-보류) |

## 경제 · 코인 (ECON)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-ECON-01 | DECIDED (2026-04-20) | 클랜 코인 구체적 수치 (지급량, 가격) | Phase 1 베이스라인 확정. 개인 일일 적립 상한 **200**(이벤트 제외), 클랜 일일 적립 상한 **2,000**. 내전 출전 +10 / 승리 +20 / MVP +30, 스크림 완료 +100, 대진표 우승 +1,000, 가격 목록은 §D-ECON-01 표. 운영 전 A/B 튜닝 예정. [§D-ECON-01](#d-econ-01--코인-수치-베이스라인) |
| D-ECON-02 | DECIDED (2026-04-20) | 운영진 부정 코인 세탁 방지 정책 | ① 풀 간 이전 완전 금지. ② `coin_transactions` INSERT-only(RLS로 UPDATE/DELETE 차단). ③ 1회 500 이상 클랜 풀 지출은 **2-man rule**(Phase 2+). ④ 클랜장 교체 후 **72h 지출 동결**. ⑤ 의심 패턴 자동 flag + 일시 동결(Phase 2+). ⑥ `purchases.pool_source`·`approved_by` 기록. [§D-ECON-02](#d-econ-02--코인-세탁-방지-정책) |
| D-ECON-03 | DECIDED (2026-04-20) | 클랜 순위표 민감 지표 포함 여부 | **외부 공개 순위표에서 경쟁 지표 전면 제외**(승률·K/D·MVP 수 등). 공개 지표는 활동성·규모·매너 점수·이벤트 참여만. 경쟁 지표는 **운영진+ 내부 화면**(클랜 관리·HoF)에만. [§D-ECON-03](#d-econ-03--클랜-순위표-민감-지표-노출-범위) |
| D-ECON-04 | DECIDED (2026-04-20) | 특이사항 태그 세부 기준 | **자동 산정 전용**(수동 태깅 없음). Phase 1 초기 카탈로그 13종(`streak_lose_3/4/5`·`streak_win_3/5`·`slump`·`hot_streak`·`map_expert`·`map_rookie`·`mvp_hot`·`no_show`·`no_show_repeat`·`new_clan_week`). 본 클랜 내전만 집계, 경기 종료 시·일일 배치 재계산. tone `good/bad/neutral`. [§D-ECON-04](#d-econ-04--특이사항-태그-카탈로그) |

## 통신 · 알림 (NOTIF)

| 코드 | 상태 | 항목 | 메모 |
|------|------|------|------|
| D-NOTIF-01 | DECIDED (2026-04-21) | 운영·개인·일정 알림을 통합하는 in-app 알림 센터 도입 | **프리셋 α(디스코드식 통합 센터)** — 네비게이션바 상단 **벨 아이콘 + 드로워**. 범위 = **운영 + 개인 결과 + D-EVENTS-03 일정 알림 전체 통합**. 저장 = **M1 분리 + FK**: `notification_log`(기존 발송 레이어 유지) + `notifications`(신설 피드 레이어). 일정 in-app 발송 시 AFTER UPDATE 트리거로 `notifications` INSERT, 운영·개인 알림은 소스 테이블(`clan_join_requests`·`match_record_correction_requests`·`scrim_room_confirmations`·`lfg_applications` 등) **DB 트리거로 자동 INSERT**. 2상태(unread/read), 읽은 후 **7일 자동 GC**. D-SHELL-03 사이드바 메뉴별 점은 **병존**(척도 다름). D-PERM-01 권한 키 신설 없음(수신자 계산은 소스 RLS). [§D-NOTIF-01](#d-notif-01--in-app-알림-센터-통합-도입) |
| D-NOTIF-02 | DECIDED (2026-04-21) | 브라우저 ServiceWorker 웹 푸시 도입 여부·과금 게이팅·권한 프롬프트 타이밍 | **프리셋 α (보수적 도입)** — **Premium 전용**(D-EVENTS-03 카카오·Discord 과금 경계 정합), **4 카테고리 독립 토글**(운영·개인·일정·채팅), 권한 요청은 **벨 드로워 최초 열 때 맥락형 배너**, **서버 quiet hours 00~07 KST 준수**(07시 일괄). 스키마 신설: `web_push_subscriptions`(user_id·endpoint·p256dh·auth·user_agent·created_at·revoked_at, soft delete). `notification_log.channel` 카탈로그에 `web_push` 추가. **권한 키 신설 없음**(개인 구독은 본인 선택). 범위 = **R3** (결정·스키마 + 벨 드로워 최상단 inert 예고 배너 1줄만). 실구현(VAPID·ServiceWorker·서버 워커·구독 관리 UI)은 **Phase 2+ 이관** — 공급자 선택은 후속 D-NOTIF-02b. [§D-NOTIF-02](#d-notif-02--브라우저-서비스워커-웹-푸시-도입-정책-프리셋-α) |

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
- **"인기" 정렬은 제거**(D-RANK-01 DECIDED 2026-04-21) — 조회수 필드 없음·외부 경쟁 유인 최소화. 상세 [§D-RANK-01](#d-rank-01--클랜-홍보-인기-정렬-폐기).

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
- [decisions.md §D-RANK-01](#d-rank-01--클랜-홍보-인기-정렬-폐기) (DECIDED 2026-04-21) · [§D-STATS-01~04](#) (OPEN)
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

### D-EVENTS-01 — 스크림 확정 → 클랜 이벤트 자동 생성·동기화

- **결정일**: 2026-04-20
- **요지**: 스크림이 양측 운영진 합의로 확정되면 **양쪽 클랜의 `clan_events`에 각각 1행** 자동 INSERT. 해당 이벤트는 **스크림에서 파생된 뷰**이므로 **읽기 전용**, 시간·장소·제목 수정은 스크림 본체에서만. 취소·시간 변경 시 양쪽 이벤트가 자동 동기화.

**트리거 (Phase 2+ 서버 구현)**

| 스크림 상태 전이 | 이벤트 측 동작 | 멱등 키 |
|-------------------|---------------|---------|
| `matched` → `confirmed` (최초 확정) | 양쪽 클랜에 각각 INSERT (`source='scrim_auto'`, `scrim_id`, `kind='scrim'`) | `(clan_id, scrim_id)` UNIQUE → 중복 INSERT 시 no-op |
| `confirmed` 상태에서 `scheduled_at` 변경 | 양쪽 이벤트 `start_at` UPDATE | — |
| `confirmed` 상태에서 `place`·`title` 변경 | 양쪽 이벤트 해당 필드 UPDATE | — |
| `confirmed` → `cancelled` | 양쪽 이벤트 `cancelled_at = now()` 세팅(**행 삭제 금지**) | — |
| `cancelled` → `confirmed` (재확정) | 양쪽 이벤트 `cancelled_at = NULL` 복원 | — |
| `confirmed` → `finished` (경기 종료) | 양쪽 이벤트 `finished_at` 세팅, 알림 스케줄 중단 | — |

**구현 레이어 (2중 방어)**

1. **Server Action** (주 경로): 스크림 확정 버튼·취소 버튼 Action이 트랜잭션 내에서 `scrim_rooms` UPDATE + 양쪽 `clan_events` UPSERT를 함께 실행.
2. **PostgreSQL 트리거** (안전망): `scrim_rooms` AFTER UPDATE OF status 트리거가 같은 로직 수행. Server Action 누락·직접 SQL 수정 대비. 트리거 내부에서 멱등 키로 중복 INSERT 방지.
3. 트리거·Server Action이 동시에 실행되어도 `ON CONFLICT DO NOTHING`·`UPDATE ... WHERE cancelled_at IS DISTINCT FROM ...`로 no-op 보장.

**읽기 전용 정책**

- `source='scrim_auto'` 이벤트의 수동 편집 UI는 숨김 + 읽기 전용 모달.
- 일정 카드 하단 배지 **"스크림에서 자동 등록"** + "스크림 상세 열기" 링크(`/games/[g]/#scrim` · `scrimDrawer` open).
- 이벤트 행 삭제 버튼 없음 — 스크림 취소만이 유일한 "제거" 경로(취소 후에도 행은 남고 `cancelled_at` 배지로 표시).
- 수동 등록 이벤트(`source='manual'`)는 제약 없음(기존 동작 유지).

**취소 표시 규칙**

- 캘린더 셀 점: 회색 dim + 취소선 스타일(`mock-events-cal-dot--cancelled` 신설 예정).
- 일정 카드: 제목 취소선 + 우상단 "취소됨" 라벨.
- 알림 스케줄: D-EVENTS-03에 따라 `cancelled_at` 세팅 순간 **미발송 예약 알림 전부 취소**(이미 보낸 건은 별도 취소 알림 1회 발송 — Discord·카카오 재사용).

**Phase 2+ 스키마 영향 (요지)**

- `clan_events` 확장 필드: `kind`·`source`·`scrim_id`·`cancelled_at`·`finished_at` (상세는 `schema.md`).
- `scrim_rooms.status` enum 확장: 현재 `'open'/'closed'` → `'draft'/'matched'/'confirmed'/'cancelled'/'finished'`. 세부 전이·동시성·채팅 종료는 [§D-SCRIM-01](#d-scrim-01--스크림-채팅방-자동-종료-정책) · [§D-SCRIM-02](#d-scrim-02--스크림-양측-확정-동시성-2-phase-commit)에서 확정 (2026-04-21).
- UNIQUE `(clan_id, scrim_id) WHERE scrim_id IS NOT NULL`.
- 트리거 함수 `clan_events_sync_from_scrim()` — `schema.md` 트리거 절 신설 예정.

**Phase 1 목업 (변경 없음)**

- 목업 `#view-events` 캘린더는 정적 마크업. "자동 등록" 카피는 이미 존재. 실제 동기화 로직은 Phase 2+에서 구현.
- 스크림 모달(`#scrimApplyModal`·`#scrimChatModal`)의 "확정" 버튼은 현재 alert만. Phase 1 범위 유지.

### D-EVENTS-01 Supplemental — 유형 수동 제한 · RSVP 범위 · 권한 분기 · 2026-04-21

- **결정일**: 2026-04-21 (원결정 §D-EVENTS-01을 **확장 · 대체하지 않음**)
- **요지**: D-EVENTS-01의 "스크림=자동 등록/읽기 전용" 원칙이 굳어지면서, 주변 UX에서 세 가지 미정 지점이 드러났다 — (1) 일정 등록 모달에서 "스크림" 유형을 선택할 수 있는 잔재, (2) RSVP(`going/maybe/not_going`)가 모든 유형에 공용이라 내전·이벤트에도 표시되는 일관성 없음, (3) 참가자 명단·편집·삭제·"스크림 상세 열기" 버튼의 노출 권한이 정해지지 않음. 이 Supplemental은 세 지점을 확정한다.

**정책**

| 항목 | 정책 | 근거 |
|------|------|------|
| 수동 등록 가능 유형 | **내전 · 이벤트** 2종만 (`kind IN ('intra','event')`). "스크림" 유형 선택지 제거. | 스크림은 반드시 스크림 모집 게시판 경로를 거쳐 `source='scrim_auto'` 행으로만 생성. 수동 스크림을 허용하면 트리거·멱등 키·읽기 전용 정책이 동시에 깨진다. |
| RSVP 범위 | **스크림(`kind='scrim'`) 전용**. 내전·이벤트는 RSVP 섹션 미노출. | 내전·이벤트는 "참석 응답" 개념이 실제 운영과 어긋남(내전=구성원 전원 대상·이벤트=임의 참여). RSVP는 스크림 참가 명단을 만드는 기능 전용. |
| RSVP 값 | `enum('none','going')` 2상태. **단일 "참가" 버튼 토글** + 확인 팝업(`confirm`). 기존 `maybe`·`not_going`은 사용하지 않음. | 스크림은 출전 여부만 중요. 3상태는 운영진이 명단 파악할 때 혼동만 증가. |
| 참가자 명단 노출 | **운영진+(officer + leader) 전용**. 일반 구성원 드로워에는 명단 섹션이 렌더되지 않음. 각 항목은 **인게임 닉네임** + (선택) 게임 태그. | 자기 닉네임이 어디에 노출되는지 구성원이 사전 인지할 수 있도록, 참가 확인 팝업에 "참가 명단에 인게임 닉네임이 노출됩니다"를 명시. |
| "스크림 상세 열기" 버튼 | **운영진+ 전용**. 일반 구성원 드로워에는 이 버튼을 표시하지 않음(배지 "스크림에서 자동 등록"은 전원 노출). | 구성원이 스크림 상세에서 변경권이 없는 정보를 열람하는 UX가 불필요하다는 사용자 피드백. |
| 편집·삭제 버튼 | **운영진+ 전용**. 일반 구성원에게는 `manual` 이벤트에서도 버튼 미노출. `scrim_auto` 이벤트에는 애초에 렌더하지 않음(D-EVENTS-01 원결정 유지). | 운영 권한과 캘린더 UI 권한 정렬. |

**UI 매트릭스**

| 드로워 요소 | 내전 드로워 (`kind='intra'`, `source='manual'`) | 이벤트 드로워 (`kind='event'`, `source='manual'`) | 스크림 드로워 (`kind='scrim'`, `source='scrim_auto'`) |
|-------------|:--:|:--:|:--:|
| "스크림에서 자동 등록" 배지 | 숨김 | 숨김 | **전원 노출** |
| "스크림 상세 열기" 버튼 | 숨김 | 숨김 | **운영진+만** |
| 본문 `<dl>` (시작·장소·반복·알림) | 전원 | 전원 | 전원 |
| "참가" 단일 토글 버튼 | **숨김** | **숨김** | **전원** |
| 참가자 명단(인게임 닉네임) | 숨김 | 숨김 | **운영진+만** |
| 편집·삭제 버튼 | 운영진+만 | 운영진+만 | 숨김(스크림 본체에서만) |
| "읽기 전용" 안내 문구 | 숨김 | 숨김 | 전원 |

**참가 토글 UX 흐름**

1. 드로워 열림 → 현재 `rsvp`가 `'going'`이면 버튼 라벨 `"참가 취소"` + 상단 배지 `"참가 중"`(녹색), 아니면 `"참가"` + `"미참가"`.
2. 버튼 클릭 → `confirm("이 스크림에 참가하시겠습니까? 참가 명단에 인게임 닉네임이 노출됩니다.")` / 취소 시 `confirm("이 스크림 참가를 취소하시겠습니까?")`.
3. OK → `ev.rsvp` 토글 → 버튼·배지·(운영진+가 열람 중이면) 명단 즉시 재렌더. 캘린더 슬롯 리스트에도 스크림이면 `참가 중` 배지 반영.

**스키마 영향 (최소)**

- `clan_events.kind` CHECK 수동 등록 시 `kind IN ('intra','event')` 강제 — Server Action 입력 스키마에 반영, DB에는 `CHECK (source = 'scrim_auto' OR kind IN ('intra','event'))` 추가 제안.
- `event_rsvps.response` 사용 범위: `event_id`가 `kind='scrim'`인 행에 한해서만 INSERT 허용(RLS/Trigger). Free 여부와 무관.
- `event_rsvps.response` 값 실제 사용: `'going'`만. `'maybe'`·`'not_going'` enum은 후방호환으로 남기되 UI에서는 쓰지 않음.

**Phase 1 목업 반영 (이 결정과 함께 커밋)**

- `mockup/pages/main-clan.html` — 일정 등록 모달 `#mev-type`에서 `<option>스크림</option>` 제거. 드로워의 "스크림 상세 열기"·편집/삭제 버튼에 `.mock-officer-only` 적용. RSVP 3버튼을 단일 `#mock-event-drawer-rsvp-btn`으로 교체하고 섹션 자체를 `hidden`(JS가 `kind='scrim'`일 때만 노출). 참가자 명단 섹션 `#mock-event-drawer-attendees`(`.mock-officer-only`) 신설.
- `mockup/scripts/clan-mock.js` — `mockEventDrawerRsvp` 3상태 로직 제거, `mockEventDrawerRsvpToggle` 단일 토글 + `confirm()`. `__mockEventDrawerRenderAttendees`가 `MOCK_EVENTS[*].attendees`에서 인게임 닉네임 렌더 + 참가 중이면 "나" 태그를 상단에 삽입. 슬롯 리스트 배지는 "참가 중"만 노출.
- 기존 `mockEventDrawerRsvp(value)` 시그니처는 단일 토글로 포워딩(임시 호환).

### D-EVENTS-02 Revised — 일정 반복: 요일·시각 기반 무기한 · 2026-04-21

- **결정일**: 2026-04-21 (2026-04-20 원결정을 **대체**. 원문은 아래 §D-EVENTS-02 Original에 보존)
- **요지**: 반복 모드를 `none` / `weekly` / `monthly` 3종으로 단순화한다. `weekly`는 **월~일 중 하나 이상의 요일 + 동일 시각(`HH:mm`)**. `monthly`는 **시작일의 day-of-month + 동일 시각**. `daily`·`biweekly`는 제거(쓰임이 겹치거나 희소). **종료 조건(count/until/never) 3모드 및 52회 인스턴스 hard stop을 전면 폐지** — 반복은 **편집(반복=`none`으로 저장) 또는 삭제 전까지 무기한**으로 계속된다.

**변경 요약 (Original → Revised)**

| 항목 | Original (2026-04-20) | Revised (2026-04-21) |
|------|---|---|
| 반복 모드 | `none`/`weekly`/`biweekly`/`monthly` | `none`/`weekly`/`monthly` (`daily`·`biweekly` 제거) |
| 주간 반복 요일 지정 | 시작 일시의 요일 1개만 상속 | **월~일 체크박스 다중 선택**(≥1) + 동일 시각 |
| 월간 반복 날짜 지정 | 시작 일시의 day-of-month 1개 | 동일 (단, 시각 입력 UI 명시화) |
| 종료 조건 | `never`/`count(1-52)`/`until` 3모드 라디오 | **없음** (컬럼·UI 전체 제거) |
| 인스턴스 상한 | 52개 hard stop + `never` 자동 count 전환 | **없음** (lazy 계산이라 DB 비용 0) |
| 편집·삭제 UX | 이 일정만 / 이후 모두 / 전체 + `clan_event_exceptions` | 동일 — `clan_event_exceptions`는 유지 |

**반복 데이터 모델 (Revised)**

| 필드 | 타입 | 제약 | 비고 |
|------|------|------|------|
| `repeat` | `enum('none','weekly','monthly')` | NOT NULL · 기본 `none` | `daily`·`biweekly` 없음 |
| `repeat_weekdays` | `smallint[]` | `repeat='weekly'` 시 길이 ≥ 1, 모든 원소 1~7(ISO 월=1) · 그 외 NULL | 예: `{1,3,5}` = 매주 월·수·금 |
| `repeat_time` | `time` | `repeat IN ('weekly','monthly')` 시 NOT NULL · 그 외 NULL | `HH:mm:ss` (KST 해석) |

**DROP되는 컬럼** (원결정의 스키마 중): `repeat_end_kind` · `repeat_end_count` · `repeat_end_at` · 관련 CHECK 제약 전부.

**인스턴스 생성 전략 — 템플릿 + 지연 (Revised)**

- DB는 템플릿 1행만 저장 (`repeat` + `repeat_weekdays` + `repeat_time`).
- 캘린더 조회 시 요청 윈도우(예: 가시 월)만큼 가상 인스턴스를 on-the-fly 계산.
  - `weekly`: 템플릿 `start_at` ≤ 윈도우 범위에서 `weekdays × 주` 조합.
  - `monthly`: 시작일의 day-of-month를 월마다 적용. 해당 일자가 없는 달(예: 2월 30일)은 **skip**(실시간 계산 특성상 자연 처리).
- 종료 조건이 없으므로 윈도우 계산 상한은 **클라이언트 조회 범위**로 자연 제한됨(서버는 멀리 앞 범위 요청 시 최대 365일 등 UX 범위 제약만 건다).
- 실제 상한이 필요한 경우(예: 연도 이동) 클라이언트가 범위 파라미터로 통제.

**편집·삭제 UX (유지)**

| 액션 | 영향 범위 |
|------|----------|
| 이 일정만 수정 | `clan_event_exceptions`에 해당 인스턴스 override 저장 |
| 이번과 이후 모두 수정 | 새 템플릿 INSERT + 기존 템플릿을 해당 시점부터 **종료** (→ `repeat='none'`으로 갱신하고 종료 시점 이후 인스턴스 차단 플래그 필요 시 `cancelled_at` 활용) |
| 전체 수정 | 템플릿 행 UPDATE |
| 이 일정만 취소 | `clan_event_exceptions.cancelled_at` 세팅 |
| 전체 취소·삭제 | 템플릿 `cancelled_at` 세팅 또는 행 삭제 |

**UI 규칙 (일정 모달 · 목업 반영됨)**

- 반복 select = `없음 (일회)` / `매주 · 요일·시각 지정` / `매월 · 시작일의 일자 · 시각 지정` 3개만.
- `weekly` 선택 시 **월~일 체크박스 7개** 그룹(선택된 요일 모두 동일 시각 반복) + `<input type="time">` 노출. 저장 시 체크된 요일이 0개면 인라인 에러.
- `monthly` 선택 시 **시각 `<input type="time">`**만 노출 + "시작일의 일자를 매월 반복" 안내.
- 종료 조건 fieldset·`never/count/until` 라디오·52회 경고 모두 **제거**.
- 모든 반복 모드에 "편집·삭제 전까지 계속 반복됩니다" 안내 명시.

**영향 범위 업데이트**

- `docs/01-plan/schema.md` — `clan_events`에서 `repeat_end_kind`·`repeat_end_count`·`repeat_end_at` 컬럼 삭제, `repeat_weekdays smallint[]`·`repeat_time time` 추가. `repeat` enum에서 `daily`·`biweekly` 제거.
- `docs/01-plan/pages/11-Clan-Events.md` — 일정 모달 반복 섹션·종료 조건 섹션·인스턴스 상한 언급 삭제·교체.
- `mockup/pages/main-clan.html` · `mockup/scripts/clan-mock.js` — 이 결정으로 이미 반영.

---

### D-EVENTS-02 Original — 일정 반복 종료 조건 (SUPERSEDED 2026-04-21)

> 이 블록은 이력 보존용. 최신 정책은 위 §D-EVENTS-02 Revised 참조.

- **결정일**: 2026-04-20
- **요지**: 반복(`weekly`/`biweekly`/`monthly`) 선택 시 종료 조건을 **3모드**로 제공한다. `never`(무한)는 허용하되 **서버가 12개월 hard stop**, `count`는 1~52회, `until`은 특정 날짜. 생성 인스턴스 수는 모드 무관 **상한 52개**. 저장 전략은 **템플릿 1행 + 지연 인스턴스 생성 + 예외 테이블**.

**종료 조건 모드**

| 모드 | UI 카피 | 저장 필드 | 서버 보정 |
|------|---------|-----------|-----------|
| `never` | "종료일 없음 (약 1년 후 자동 만료)" | `repeat_end_kind='never'` · 기타 NULL | 52번째 인스턴스 이후 **자동 중단** + 클랜장에게 "반복 일정이 만료되었습니다. 연장하려면 새로 등록해 주세요" in-app 알림 |
| `count` | "N회 반복" (1~52) | `repeat_end_kind='count'` · `repeat_end_count int` | `CHECK (repeat_end_count BETWEEN 1 AND 52)` |
| `until` | "YYYY-MM-DD까지 반복" | `repeat_end_kind='until'` · `repeat_end_at timestamptz` | 52개 넘으면 등록 시 에러(프론트 1차 + 서버 최종) |

**스키마 제약 (요지)**

```
CHECK (
  (repeat = 'none' AND repeat_end_kind IS NULL
    AND repeat_end_count IS NULL AND repeat_end_at IS NULL)
  OR (repeat != 'none' AND repeat_end_kind IS NOT NULL)
)
CHECK (
  (repeat_end_kind = 'count' AND repeat_end_count IS NOT NULL AND repeat_end_at IS NULL)
  OR (repeat_end_kind = 'until' AND repeat_end_at IS NOT NULL AND repeat_end_count IS NULL)
  OR (repeat_end_kind = 'never' AND repeat_end_count IS NULL AND repeat_end_at IS NULL)
  OR repeat_end_kind IS NULL
)
```

**인스턴스 생성 전략 — 템플릿 + 지연**

- DB에는 **템플릿 행 1개**(`clan_events`)만 저장. 반복 인스턴스를 물리적으로 INSERT하지 않음.
- 캘린더 조회 시 서버가 **요청 윈도우**(예: 가시 월 범위)만큼 가상 인스턴스를 **on-the-fly 계산**. 계산 결과에 `instance_idx`·`instance_start_at`·`template_id` 부여.
- **RSVP·수정·취소 등 개별 인스턴스 액션**은 별도 테이블 `clan_event_exceptions (template_id, instance_idx, override_start_at, override_place, cancelled_at, ...)` 에 저장. 템플릿 + 예외로 합성해 최종 표시.
- 과거 인스턴스는 자동 hidden(뷰 쿼리에서 `instance_start_at < now() - 30d` 숨김), 영구 삭제 금지(기록 보존).

**편집·삭제 UX**

| 액션 | 영향 범위 |
|------|----------|
| **이 일정만 수정** | `clan_event_exceptions` 해당 인스턴스 행에만 override 저장 |
| **이번과 이후 모두 수정** | 새 템플릿 INSERT(다음 인스턴스부터) + 기존 템플릿 `repeat_end_at = 직전 인스턴스` 설정 |
| **전체 수정** | 템플릿 행 UPDATE (모든 인스턴스 재계산) |
| **이 일정만 취소** | `clan_event_exceptions.cancelled_at` 세팅 |
| **전체 취소** | 템플릿 `cancelled_at` 세팅 (예외 불필요) |

**`never` hard stop 세부**

- 52번째 인스턴스 종료 후 서버 cron이 `repeat_end_kind='never'` + 실인스턴스 52개 도달 템플릿을 감지 → `repeat_end_kind='count'`·`repeat_end_count=52`로 자동 전환.
- in-app 알림 1회 + 이메일 알림(옵션).
- 재등록 시 새 템플릿으로 처리(기존과 분리). 이력은 그대로 보존.

**UI 규칙**

- 일정 모달 "반복" select가 `none` 아닐 때 "종료 조건" 그룹 노출.
- 라디오 3개(`never`/`count`/`until`) + 조건부 필드(`count` → 숫자 input, `until` → datepicker).
- "52회 넘으면 등록 불가" 인라인 에러는 **실시간**(입력값 변경 즉시 계산).
- 목업은 현재 `mock-event-modal`에 반복 select만 있음. Phase 1 범위 유지(변경 없음).

### D-EVENTS-03 — 일정·투표 알림 채널·정책

- **결정일**: 2026-04-20
- **요지**: 알림 채널은 **Discord (연동 시 기본 ON)**, **카카오 알림톡 (기본 OFF · 옵트인)**, **in-app (항상 ON)** 3종. Free 플랜은 in-app만. 발송은 일정 기준 **T-24h · T-1h · T-10min · T+0** 4개 슬롯(일정 성격에 따라 일부 스킵). 실패는 **지수 백오프 5회**. quiet hours(00~07 KST) 카카오 자동 연기. 모든 스케줄은 `notification_log` 테이블에서 단일 출처로 관리.

**채널 · 플랜 매트릭스**

| 채널 | Free | Premium | 기본값(Premium) | 비고 |
|------|:----:|:-------:|----------------|------|
| in-app (브라우저 알림 센터·navbar 벨) | ✓ | ✓ | ON (강제) | 비로그인 시 무시 |
| Discord (DM 또는 클랜 채널) | ✗ | ✓ | **ON** (연동 있을 때만) | OAuth `identify email` 외 Bot OAuth 별도(D-AUTH-05) |
| 카카오 알림톡 | ✗ | ✓ | **OFF** | 사용자가 알림 설정에서 명시적 ON 시 발송 · 번호 인증 필요 |

**발송 슬롯 (일정 기준)**

| 슬롯 | 트리거 | 스킵 조건 | 채널 |
|------|--------|-----------|------|
| T-24h | 시작 24시간 전 | 일정이 24h 이내 등록 시 스킵 | in-app · Discord · 카카오(ON 시) |
| T-1h | 시작 1시간 전 | — | in-app · Discord · 카카오(ON 시) |
| T-10min | 시작 10분 전 | — | in-app · Discord |
| T+0 | 시작 순간 | 일정 옵션에서 체크 시에만 | in-app |

**투표 발송 슬롯** (D-EVENTS-04 규칙도 함께 적용)

| 반복 모드 | 발송 스케줄 |
|-----------|-------------|
| `없음(한 번)` | 생성 즉시 1회 |
| `매일` | 매일 09:00 KST · 마감 도달 시 종료 |
| `매주` | 생성 요일 매주 09:00 KST · 마감 도달 시 종료 |
| `마감 전까지 매일` | 마감 24h 전부터 매일 09:00 KST + 마감 1h 전 마지막 긴급 경고 |

- 발송 시각 사용자 설정 가능(기본 09:00). `notification_preferences.digest_hour`.

**실패 재시도 (지수 백오프)**

- 1회차 실패 → 1분 후 재시도 → 5분 → 30분 → 2시간 → 6시간. 총 5회.
- 5회 실패 시 **DLQ**(dead letter queue) 이관 + 운영자 대시보드 알림.
- Discord rate limit **429** 수신 시 `Retry-After` 헤더 준수(백오프 무시).
- 카카오 알림톡 실패는 당사자에게 in-app 폴백 메시지 1회 자동 발송.
- 재시도 카운트는 `notification_log.attempt_count`에 기록. 모든 시도 타임스탬프는 `notification_attempts` child 테이블(Phase 2+ 운영 로그).

**중복 방지**

- UNIQUE `(event_id, slot_kind, scheduled_at, channel, recipient_user_id)`.
- 재시도는 행 추가가 아닌 `attempt_count++` · `last_error` UPDATE.
- 멱등 전송: Discord·카카오 페이로드에 `dedup_key = hash(notification_log.id)` 포함, 공급자 측 중복 수신 감지.

**Quiet Hours (카카오 전용)**

- 기본 **00:00~07:00 KST** 자동 연기 → 07:00에 일괄 발송.
- 사용자 설정에서 범위 조정 가능(`notification_preferences.quiet_start`·`quiet_end`).
- Discord·in-app은 제약 없음(사용자가 직접 음소거 책임).
- 긴급 슬롯 T-10min은 quiet hours 무시(스크림 시작 임박 등 손실 치명적).

**사용자 옵트 구조 (`notification_preferences` 테이블)**

```
user_id pk
channel_discord bool default true   -- 연동 있을 때만 의미
channel_kakao bool default false    -- D-EVENTS-03 기본 OFF
channel_inapp bool default true     -- 항상 true (UI에서 토글 숨김)
kakao_verified_phone text null      -- 카카오 알림톡 수신 전 필수
quiet_start time default '00:00'
quiet_end time default '07:00'
digest_hour smallint default 9      -- 투표 매일 발송 시각
per_event_kind jsonb                -- {"scrim":true,"intra":true,"event":true,"poll":true}
updated_at timestamptz
```

**연관 문서 업데이트 대상**

- `schema.md` — `notification_preferences`·`notification_log` 테이블 신설.
- `pages/11-Clan-Events.md` — 알림 채널·Quiet hours 행 추가.
- `pages/14-Profile-Customization.md` — 프로필 "알림 설정" 섹션에서 카카오·Discord 토글 노출(Phase 2+).
- D-AUTH-05(Discord OAuth) 스코프가 이 결정의 전제. 알림 발송용 Bot OAuth는 별도 권한 플로우.

### D-EVENTS-04 — 투표 알림과 마감일 일관성 검증

- **결정일**: 2026-04-20
- **요지**: 반복 알림 모드별로 **최소 마감 리드타임**을 강제한다. 위반 시 등록 에러. 프론트 1차 검증 + 서버 Server Action 최종 검증의 이중 게이트. 생성 시점에 전체 발송 스케줄을 `notification_log`에 예약 INSERT하고, 마감 도달 시 잔여 예약을 **자동 취소**.

**검증 매트릭스**

| 알림 반복 | 마감 **하한** | 마감 **상한** | 위반 시 |
|-----------|:------------:|:------------:|--------|
| `없음(한 번)` | 지금 + 1시간 | 지금 + 180d | 미만 에러 / 초과 경고 |
| `매일` | 지금 + **48h** | 지금 + 60d | 미만 에러 ("48시간 이내 마감은 '한 번' 또는 '마감 전까지 매일' 사용") |
| `매주` | 지금 + **14d** | 지금 + 180d | 미만 에러 |
| `마감 전까지 매일` | 지금 + **24h** | 지금 + 60d | 미만 에러 · 초과 경고 |

**에러 카피 (UI)**

- "48시간 이내 마감에는 '매일' 반복 알림을 사용할 수 없습니다. '한 번' 또는 '마감 전까지 매일'을 선택해 주세요."
- "14일 이내 마감에는 '매주' 반복 알림을 사용할 수 없습니다."
- "24시간 이내 마감에는 '마감 전까지 매일'을 사용할 수 없습니다. '한 번' 알림을 권장합니다."
- 60일 초과 경고: "마감이 60일 이상 떨어진 투표입니다. 반복 알림이 과도할 수 있습니다. 계속 진행하시겠어요?"

**생성 플로우 (Server Action)**

1. 프론트 `mockEventPollSubmit` (Phase 2 버전)이 서버 Action 호출.
2. Action이 검증 매트릭스 실행 → 실패 시 `{ok:false, field:'deadline', message}` 반환.
3. 통과 시 `clan_polls` INSERT + 발송 슬롯 계산 결과 전부를 `notification_log`에 `status='scheduled'`로 INSERT.
4. 마감 도달 시 DB 트리거가 `UPDATE notification_log SET status='cancelled' WHERE poll_id=? AND status='scheduled'`.
5. 수동 조기 종료도 동일 로직.

**발송 시각 계산 예시** (기준 시각 = 지금, 반복 = `마감 전까지 매일`, 마감 = 지금 + 72h)

- 24h 전부터 매일 09:00: 마감 직전 24h 윈도우 내 09:00 시점이 1~2개 포함 → 2회 예약.
- 마감 1h 전 긴급: 1회 예약 (`slot_kind='poll_deadline_1h'`).
- 생성 즉시: 1회 예약 (`slot_kind='poll_created'`).
- 총 4회 발송 예약.

**중복·충돌 처리**

- 사용자가 투표 **수정**(마감 연장 등)하면 기존 예약 전부 `status='cancelled'`로 UPDATE + 재계산 결과를 새로 INSERT. 멱등 키로 중복 예약 방지.
- 사용자가 **이미 투표** 했어도 알림은 받음(동료 미투표 독촉 목적). 수신 거부는 `notification_preferences.per_event_kind.poll=false`.

**테스트 가이드 (Phase 2+)**

- 경계값: 마감 = 지금 + 48h 0분 0초 (`매일` 허용). 지금 + 47h 59m 59s → 에러.
- 하한값 정확도: `clock_skew_ms < 5000` 기준 허용 오차.
- 타임존: 모든 검증은 **서버 시각(UTC) 기준 + KST 변환**. 사용자 입력 `datetime-local`은 클라이언트 타임존 → 서버에서 KST 정규화.

### D-EVENTS-05 — 대진표 결과의 통계·코인 반영

- **결정일**: 2026-04-20
- **요지**: **대진표는 클랜 내 이벤트** 전용(클랜 간 토너먼트는 기획 범위 밖). 통계는 정기 내전(`match_type='intra'`)과 **완전 분리된 "대진표" 섹션**으로 표시. **코인은 D-ECON-01 확정값**(개최 500·참가 +200·우승 +1,000, 전부 **클랜 풀**)만. 개인 풀 보상·MVP 자동 산정 **없음**. 참여율·매너 점수는 내전과 동일 가중치로 가산.

**통계 반영 매트릭스**

| 지표 | 정기 내전(`intra`) | 대진표(`bracket`) | 비고 |
|------|:-----------------:|:-----------------:|------|
| 클랜 평균 승률 · K/D | ✓ | ✗ (별도 섹션) | 외부 순위표 반영 = 내전만 (D-ECON-03 유지) |
| 참여율 (개인·클랜) | ✓ | ✓ (동일 가중치) | 한 경기 1포인트 |
| 매너 점수 | ✓ | ✓ (동일 가중치) | no-show·불량 행동은 내전과 동일 감점 |
| MVP 자동 태그 (D-ECON-04) | ✓ | ✗ | `mvp_hot`·`slump` 등은 내전 13종만. 대진표는 태그 시스템 미적용 |
| HoF 후보 집계 | ✓ | ✗ | HoF는 내전 기준 |
| 대진표 전용 통계 | — | ✓ | "우승 횟수"·"최다 참가" 등 독립 지표 |

**노출 위치**

| 화면 | 대진표 결과 표시 |
|------|------------------|
| 외부 공개 클랜 순위표 | **제외** (D-ECON-03 경쟁 지표 비노출 원칙 유지) |
| 클랜 통계(`#stats`) | **별도 탭 "대진표"** 신설. 내전 탭과 UI 분리. 우승 횟수·참가 횟수·최근 대진표 5건 |
| 클랜 관리(`#manage`) | 대진표 아카이브: 전체 이력 · 개설자 · 참가자 · 시상 결과 |
| MainClan 대시보드 | 다가오는 대진표 1~2건 카드(시작 임박 시) |

**코인 · 경제 (D-ECON-01 재확인)**

| 트리거 | 금액 | 풀 | 멱등 키 |
|--------|:----:|:--:|--------|
| 대진표 개최 확정 | **-500** | 클랜 | `(tournament_id, 'host')` |
| 대진표 개최 취소 | **+500** | 클랜 | `(tournament_id, 'refund_host')` · 우승 확정 전에만 |
| 대진표 참가 등록 완료 | **+200** | 클랜 | `(tournament_id, clan_id, 'entry')` · 본 클랜 내 이벤트이므로 실질적으로 **대회당 1회**만 |
| 대진표 우승 팀 확정 | **+1,000** | 클랜 | `(tournament_id, clan_id, 'winner')` |
| **개인 풀 보상** | — | — | **없음** (D-ECON-01 미정의 = 미지급) |
| **MVP 자동 산정** | — | — | **없음** (D-ECON-04 13종 태그는 내전 전용) |

**"우승 클랜 = 개최 클랜"인 이유**

- 대진표는 한 클랜 내부 토너먼트이므로 `tournaments.host_clan_id`와 `tournament_results.winner_clan_id`가 **항상 동일**.
- 코인은 우승 팀 개인에게 분배되지 않고 **클랜 풀에 귀속**. 팀 단위 보상은 운영진이 수동으로 스토어 구매·명예 뱃지 지급 등으로 변환 가능(D-STORE-01 클랜 풀 소비 매트릭스).

**스키마 핵심 (Phase 2+)**

- `tournaments` — 개최 · 참가자 · 상태.
- `tournament_teams` — 팀(본 클랜 구성원들의 집합).
- `tournament_matches` — 라운드별 개별 경기 결과.
- `tournament_results` — 최종 우승·준우승(코인 지급 트리거).
- 상세는 `schema.md` 토너먼트 절 신설 예정.

**Phase 1 목업 (변경 없음)**

- `#view-events` 탭 2 "대진표 생성기(Premium)"는 UI 셸만. 4단계 마법사는 시각 전용.
- 결과 저장·통계 반영은 Phase 2+에서 구현.

**연관 문서**

- [D-ECON-01](#d-econ-01--코인-수치-베이스라인) — 코인 수치 출처
- [D-ECON-03](#d-econ-03--클랜-순위표-민감-지표-노출-범위) — 외부 순위표 비노출 근거
- [D-ECON-04](#d-econ-04--특이사항-태그-카탈로그) — 대진표 태그 미적용 근거
- [pages/10-Clan-Stats.md](./pages/10-Clan-Stats.md) — 대진표 별도 탭 설계(Phase 2+)
- [pages/11-Clan-Events.md §탭 2](./pages/11-Clan-Events.md) — 대진표 마법사 UI

---

### D-SCRIM-01 — 스크림 채팅방 자동 종료 정책

- **결정일**: 2026-04-21
- **요지**: 스크림 모집 글 단위로 열리는 채팅방(상대 클랜과의 1:1 협상방)을 **상태별로 다른 시점에 자동 종료**한다. 종료 = 신규 메시지 INSERT 차단(RLS) + 클라이언트는 읽기 전용 표시. 상태 행은 보존(아카이브). 운영진은 수동 종료·재개 가능. 종료 1시간 전 in-app 알림.

**상태별 종료 시점 매트릭스**

| `scrim_rooms.status` | 자동 종료 시점 (`closed_at`) | 종료 사유 카피 | 비고 |
|----------------------|------------------------------|----------------|------|
| `draft` (모집 중·매칭 전) | 별도 자동 종료 없음 | — | 모집 글 자체가 만료(`expires_at`)되면 함께 닫힘 |
| `matched` (한쪽만 확정 또는 협상 중) | `scheduled_at + 6h` | "경기 시작 시각으로부터 6시간 경과" | 협상 후속 시간 보장. D-SCRIM-02 타임아웃과 별도 |
| `confirmed` (양측 확정) | `scheduled_at + 6h` | "경기 시작 시각으로부터 6시간 경과" | 경기 진행·평판 입력·정리 시간 포함 |
| `cancelled` | `cancelled_at + 1h` | "스크림이 취소되었습니다" | 후속 정리·사과 메시지용 짧은 윈도우 |
| `finished` | `finished_at + 24h` | "경기 결과 정리 마감" | 평판·MVP 정정 윈도우 |

**구현 레이어**

1. **클라이언트 가드**: `scrimChatSessionExpiresAt(s)`가 위 매트릭스로 계산 → 채팅 모달 진입 시·1초 인터벌로 비교. 종료 시점 도달 시 모달 자동 닫고 `closed_at` 안내.
2. **서버 cron** (Phase 2+): 5분 간격으로 `scrim_rooms WHERE closed_at IS NULL AND <매트릭스 조건>` 검색 → `UPDATE closed_at = now()`. 함께 알림 발송 큐에 종료 안내 1회 enqueue.
3. **RLS**: `scrim_messages` INSERT 정책에 `WHERE NOT EXISTS (SELECT 1 FROM scrim_rooms WHERE id = NEW.scrim_room_id AND closed_at IS NOT NULL)` 추가.

**알림 슬롯 (D-EVENTS-03 채널 정책 재사용)**

| 슬롯 | 발송 | 채널 | 비고 |
|------|------|------|------|
| `scrim_chat_close_t-1h` | `closed_at - 1h` | in-app | 양측 운영진·참가자 전원 |
| `scrim_chat_closed` | `closed_at` 도달 시 | in-app | 1회. Discord·카카오 미사용(소음 방지) |

**운영자 수동 제어**

- **수동 종료**: `confirmed` 또는 `matched` 상태에서 양측 운영진 누구나 가능. `closed_at = now()` + `closed_by`(감사 필드) 기록.
- **재개(reopen)**: 종료 후 24h 이내, 양측 운영진 모두 동의(2-man) 시 가능. `closed_at = NULL` 복원. Phase 2+ 기능 — Phase 1 목업은 미지원.

**스키마 영향 (Phase 2+)**

- `scrim_rooms.closed_at timestamptz NULL` (이미 신설됨, schema.md §scrim_rooms).
- `scrim_rooms.closed_by uuid FK → users NULL` (수동 종료 시).
- `scrim_rooms.closed_reason enum('auto_timeout','manual','cancelled','finished')` (NULL = 미종료).
- 인덱스: `(closed_at) WHERE closed_at IS NULL AND status IN ('matched','confirmed')` — cron 후보 조회 가속.

**Phase 1 목업 매핑**

- 현행 `scrimChatSessionExpiresAt(s) = scheduled_at + 6h`는 `confirmed`·`matched`만 가정한 단순화 — 정합성 양호. `cancelled`·`finished` 상태는 목업 데이터에 없어서 영향 없음.
- 채팅 종료 alert 카피 "채팅방이 종료되었습니다. (경기 시작 시각으로부터 6시간 경과)"는 본 결정의 `confirmed`/`matched` 케이스 카피와 일치.
- 운영진 수동 종료·재개 UI는 Phase 1 비포함(상단 카피로만 안내).

**연관 문서**

- [D-EVENTS-01](#d-events-01--스크림-확정--클랜-이벤트-자동-생성동기화) — `confirmed` 전이 시 `clan_events` 자동 동기화
- [D-SCRIM-02](#d-scrim-02--스크림-양측-확정-동시성-2-phase-commit) — 양측 확정·일정 변경 시 confirmation 무효화
- [schema.md §scrim_rooms](./schema.md#scrim_rooms-스크림-채팅방)
- [pages/08-MainGame.md §탭 4](./pages/08-MainGame.md)

---

### D-SCRIM-02 — 스크림 양측 확정 동시성 (2-phase commit)

- **결정일**: 2026-04-21
- **요지**: 스크림 확정은 **양측 운영진이 각자 1회씩 "확정"을 누르는 2단계** 모델로 처리한다. 신설 테이블 `scrim_room_confirmations`에 `(scrim_room_id, side)` UNIQUE 행으로 누적되며, 양쪽 행이 모두 존재하는 순간 트리거가 `scrim_rooms.status='confirmed'` + `confirmed_at=now()`로 전이한다. **일정·장소·모드를 한쪽이 변경하면 모든 confirmation을 자동 무효화** → 양측 모두 재확정 필요. 한쪽 확정 후 `scheduled_at - 1h`까지 다른 쪽이 확정하지 않으면 자동 `cancelled` 전이 + 양측 알림.

**확정 상태 표현**

| 상태 | `scrim_rooms.status` | `scrim_room_confirmations` |
|------|---------------------|----------------------------|
| 협상 중 (양쪽 모두 미확정) | `matched` | 0행 |
| 한쪽만 확정 | `matched` | 1행 (`side IN ('host','guest')`) |
| 양쪽 확정 | `confirmed` | 2행 (`host` + `guest`) |
| 일정 변경 직후 | `matched` | **0행** (트리거가 전부 DELETE) |
| 취소 | `cancelled` | 모두 DELETE |

**동시성 보장**

- `scrim_room_confirmations`에 UNIQUE `(scrim_room_id, side)` — 같은 쪽 운영진이 동시에 여러 번 눌러도 1행만 INSERT.
- 양측이 동시(밀리초 차이)에 확정 → PG 트랜잭션 + `scrim_rooms` 행 잠금(`SELECT ... FOR UPDATE`)으로 직렬화. 두 트랜잭션이 모두 commit되면 트리거가 단 1회만 `status='confirmed'` UPDATE 실행.
- 트리거 `scrim_rooms_promote_to_confirmed()` — `AFTER INSERT ON scrim_room_confirmations`로 양쪽 행 존재 확인 후 `status='matched'` → `'confirmed'` 전이. 이미 `confirmed`면 no-op.

**일정 변경 → 자동 무효화**

- 변경 대상 컬럼: `scheduled_at`, `mode`, `tier_min`, `tier_max`, `place`, `title`(목록 표시용 변경 제외).
- `scrim_rooms` `BEFORE UPDATE` 트리거 `scrim_rooms_invalidate_confirmations()`: 위 컬럼이 실제로 변경됐으면 `DELETE FROM scrim_room_confirmations WHERE scrim_room_id = NEW.id` + `NEW.status = 'matched'` + `NEW.confirmed_at = NULL`. D-EVENTS-01 자동 동기화는 `confirmed` 전이 시점에만 발화하므로, 무효화 → 재확정 흐름에서도 멱등.
- **변경자 본인은 자신의 confirmation 자동 재INSERT 없음** — 변경자가 다시 "확정" 눌러서 재확정 사이클을 시작해야 함(상대 측 확인 의무 부각). UI 카피로 명시: "일정을 변경하셨습니다. 양측 모두 다시 확정해 주세요."

**타임아웃 정책**

- 한쪽 확정(=`scrim_room_confirmations` 1행) 후 다른 쪽이 `scheduled_at - 1h`까지 확정하지 않으면 cron이 `status='cancelled'` + `cancelled_at=now()` 전이 + 양측 in-app 알림 + Discord(연동 시).
- 이후 동일 시각으로 재확정 원하면 D-EVENTS-01 `cancelled → confirmed` 재확정 경로 사용.

**취소 동시성**

- 한쪽 운영진이 취소 시 즉시 `status='cancelled'` + `cancelled_at=now()` + 양측 알림. confirmation 행 모두 DELETE.
- 양측 동시 취소 → 트랜잭션 잠금으로 1회만 `cancelled_at` 기록.
- 취소 후 재확정은 D-EVENTS-01 표준 경로(어느 쪽이든 다시 "확정" 누르면 `cancelled → matched`로 복원, confirmation 새로 누적).

**알림 슬롯 (D-EVENTS-03 채널 정책 재사용)**

| 슬롯 | 트리거 | 채널 | 수신자 |
|------|--------|------|--------|
| `scrim_one_side_confirmed` | 1행 INSERT | in-app + Discord | **반대 측** 운영진 |
| `scrim_both_confirmed` | `status='confirmed'` 전이 | in-app + Discord | **양측** 운영진·참가자 (`clan_events` 자동 동기화 직후) |
| `scrim_invalidated` | confirmation 자동 무효화 | in-app | **양측** 운영진 (변경 사실 + "재확정 필요") |
| `scrim_one_side_timeout` | cron `cancelled` 전이 | in-app + Discord | **양측** 운영진 |
| `scrim_cancelled` | `status='cancelled'` 전이 | in-app + Discord | **양측** 운영진·참가자 |

**스키마 영향 (Phase 2+)**

- 신설 `scrim_room_confirmations` 테이블 — 컬럼 `id`/`scrim_room_id`/`side enum('host','guest')`/`confirmed_by uuid FK→users`/`confirmed_at timestamptz DEFAULT now()`. UNIQUE `(scrim_room_id, side)`. RLS = INSERT 본인 클랜 운영진+, DELETE 서비스 롤(트리거 전용).
- `scrim_rooms` 트리거 2개 신설(promote · invalidate). 기존 `clan_events_sync_from_scrim`(D-EVENTS-01)은 그대로 — `status` 변화 감지로 idempotent.
- 인덱스: `scrim_room_confirmations(scrim_room_id)` (PK가 BIGINT면 자동 — UUID라면 명시적 추가).

**Phase 1 목업 매핑**

- 현행 `scrimJoinState[joinKey] = { host: false, guest: false }` 메모리 객체가 `scrim_room_confirmations` 2행을 시뮬레이션 — 양쪽 토글 시 `scrim_rooms.status='모집 완료'`(=`confirmed`)로 승격하는 흐름 일치.
- 일정 변경 시 confirmation 자동 무효화는 **본 결정과 함께 추가**: `openScrimEditModal` 또는 `submitScrimApply`(편집 모드)에서 변경 컬럼이 실제로 바뀌면 `scrimJoinState[joinKey] = { host: false, guest: false }` 리셋 + alert "일정을 변경하셨습니다. 양측 모두 다시 확정해 주세요."
- 한쪽 확정 후 타임아웃 시뮬레이션은 Phase 1 비포함(시간 의존 코드 추가 비용 대비 가치 낮음).
- "재확정 사이클 시작 책임" 카피는 채팅 모달 안내 줄에 한 줄 추가.

**연관 문서**

- [D-SCRIM-01](#d-scrim-01--스크림-채팅방-자동-종료-정책) — 채팅방 종료 정책
- [D-EVENTS-01](#d-events-01--스크림-확정--클랜-이벤트-자동-생성동기화) — `confirmed` 전이 시 자동 이벤트 동기화
- [schema.md §scrim_rooms](./schema.md#scrim_rooms-스크림-채팅방) · §scrim_room_confirmations (신설)
- [pages/08-MainGame.md §탭 4 — 상태 머신](./pages/08-MainGame.md)

---

### D-LFG-01 — LFG 신청 상태 UI와 수락 플로우

- **결정일**: 2026-04-21
- **요지**: LFG(같이 할 사람) 모집 글에 대한 신청은 5상태 enum(`applied`/`accepted`/`rejected`/`canceled`/`expired`)으로 추적한다. 신청자·모집자 양쪽 화면에 상태가 즉시 반영되며, **한 모집 글당 같은 사용자는 동시에 1건만 active 신청** 가능(부분 UNIQUE 인덱스). 모집 글의 `slots`만큼 `accepted`가 누적되면 모집 자동 마감(`status='filled'`). 알림은 in-app 전용(Phase 1 범위).

**상태 enum 정의**

| 값 | 의미 | 전이 |
|----|------|------|
| `applied` | 신청 접수, 모집자 확인 대기 | → `accepted` (모집자) / `rejected` (모집자) / `canceled` (신청자) / `expired` (cron) |
| `accepted` | 모집자가 수락 | 종결 상태 |
| `rejected` | 모집자가 거절 | 종결 상태 (신청자 재신청 가능 — 새 행) |
| `canceled` | 신청자가 본인 신청 취소 | 종결 상태 (재신청 가능) |
| `expired` | 모집 글 만료 시 미확정 신청 일괄 자동 전환 | 종결 상태 |

**부분 UNIQUE 인덱스 (중복 신청 방지)**

```sql
CREATE UNIQUE INDEX lfg_app_one_active_per_user
  ON lfg_applications (post_id, applicant_user_id)
  WHERE status = 'applied';
```

- `accepted`/`rejected`/`canceled`/`expired` 상태에서는 같은 (post, user) 조합으로 새 행 INSERT 가능 → 거절 후 재신청·취소 후 재신청 자연 지원.
- `applied`가 1건이라도 있으면 동일 사용자 추가 신청 차단(서버 422 에러).

**신청자 화면 UI**

| 위치 | 표시 |
|------|------|
| LFG 카드(타인 모집) | 본인이 `applied` 상태면 우상단 **"신청됨"** 배지(파랑). `accepted`면 **"수락됨"** 배지(초록), `rejected`면 **"거절됨"** 배지(회색·24h 후 미표시) |
| LFG 드로어 | 헤더 아래 상태 줄 — `applied`: "참여 신청 접수됨 · 모집자 응답 대기 중"(+ 취소 버튼) / `accepted`: "수락되었습니다! 모집자에게 직접 연락해 주세요." / `rejected`: "이번에는 거절되었습니다." |
| 헤더 우측 | "내 신청 N건" pill — 클릭 시 `#lfgApplicationsModal` 신청 내역 모달 |
| in-app 알림 | 모집자가 수락/거절 시 1회 |

**모집자 화면 UI**

| 위치 | 표시 |
|------|------|
| LFG 카드(내 모집) | 우상단 "신청자 N명" 카운트 배지(N>0일 때만) |
| LFG 드로어 | 본문에 "신청자 목록" 섹션 — 닉/티어/포지션/마이크 + 수락/거절 버튼 (드로어 내에서 즉시 처리) |
| in-app 알림 | 신청 INSERT 시 1회 ("새 신청 도착") |

**수락 → 자동 마감 규칙**

- 모집 글 `lfg_posts.slots`(예: 2명 모집) ≤ `accepted` 카운트 도달 시 트리거가 `lfg_posts.status='filled'` + 잔여 `applied` 신청 일괄 `expired` 전환 + 신청자에게 in-app 알림.
- 모집자가 수동으로 모집 종료 시에도 동일 처리.

**만료 처리 (cron · 5분 간격)**

- `lfg_posts.expires_at < now()` AND `status='open'` → `status='expired'` UPDATE + 모든 `applied` 신청을 `expired`로.
- 신청자에게 알림 1회 ("모집이 마감되어 신청이 자동 만료되었습니다").

**스키마 영향 (Phase 2+)**

- 신설 `lfg_posts` 테이블 (현재 schema.md에 없음 — community_posts 와 별도) — 컬럼 `id`/`game_id`/`creator_user_id`/`mode`/`format`/`slots`/`tiers text[]`/`positions text[]`/`mic_required`/`start_time int`/`expires_at`/`desc`/`status enum('open','filled','expired','canceled')`/`created_at`.
- 신설 `lfg_applications` 테이블 — 컬럼 `id`/`post_id FK→lfg_posts`/`applicant_user_id FK→users`/`status enum`/`tier`/`role`/`mic_required`/`message text`/`created_at`/`resolved_at`/`resolved_by FK→users NULL`.
- RLS: SELECT = 신청자 본인 + 모집자. INSERT = 본인 신청, 게임 인증 통과. UPDATE(`status`) = 모집자(accept/reject) + 신청자 본인(`canceled`만). DELETE 차단(soft).
- 위 부분 UNIQUE 인덱스 + `(post_id, status)` 보조 인덱스(목록 카운트 가속).

**Phase 1 목업 매핑**

- 본 결정과 함께 목업도 동기화: `submitLfgApply`가 alert만 띄우던 흐름을 sessionStorage `clansync-mock-lfg-apps-v1`(맵: `postId → {status, appliedAt}`)로 시뮬레이션. 카드/드로어 진입 시 본인 상태 배지 자동 렌더.
- 모집자 측(내 모집) 신청자 목록도 sessionStorage `clansync-mock-lfg-applicants-v1`(맵: `postId → [{nick, status, tier, role}]`) 더미 데이터로 시연. 운영진+ 권한 게이팅은 D-CLAN-01 일관성을 위해 미적용(LFG는 개인 단위).
- "수락 → 모집 자동 마감"은 시뮬레이션에서 `slots` 도달 시 `lfgPosts[*].status='filled'` 마킹 + 카드 흐림 처리.

**연관 문서**

- [pages/08-MainGame.md §탭 3 — LFG](./pages/08-MainGame.md)
- [schema.md](./schema.md) — `lfg_posts` · `lfg_applications` 신설 (이 결정과 함께 추가)
- [D-EVENTS-03](#d-events-03--이벤트-알림-채널과-발송-정책) — 알림 채널 (LFG는 in-app만 사용)

---

### D-RANK-01 — 클랜 홍보 "인기" 정렬 폐기

- **결정일**: 2026-04-21
- **요지**: 클랜 홍보 게시판(`#sec-promo`)의 정렬 옵션에서 **"인기" 정렬을 영구 제거**한다. 이유: (1) 조회수 필드(`views`) 부재 → 도입 시 외부 경쟁 유인 발생(D-ECON-03 외부 공개 경쟁 지표 차단 정책과 모순), (2) "사람 많이 보는 클랜" 신호는 가입 신청 자체로 이미 측정됨(별도 정렬 불필요), (3) 목업의 `setPromoSort('popular')` 호출 시 `b.views - a.views`가 NaN → 정렬 무력화 버그.

**Phase 1 변경**

| 위치 | 변경 |
|------|------|
| `setPromoSort` 분기 | `'popular'` 케이스 삭제 |
| 정렬 select 옵션 (운영 시) | `newest`(최신) / `space`(여유 있음) 2종만 |
| `PROMOS[*].views` 필드 | 미사용 컬럼으로 잔존 → 다음 정리 시 제거 검토 |
| 페이지 문서 카피 | `popular` 언급 제거 |

**대안 정렬 (Phase 2+ 도입 후보)**

| 옵션 | 데이터 출처 | 근거 |
|------|-------------|------|
| **활성도** (`activity_pct_30d` desc) | `clans.last_activity_at` (D-CLAN-07) + 멤버 활동률 집계 | 죽은 클랜 회피, 외부 경쟁 유인 없음 |
| **신규** (`days asc`) | `clans.created_at` | 기존 `newest`와 동등 — 카피 정리만 |
| **여유 있음** (`(max - now) desc`) | `clans.member_count` 비교 | 모집 의지 표현 |

- "활성도"는 D-ECON-03 매트릭스에서도 외부 노출 허용 지표(✓ 외부 순위표). 정합.
- "최근 인원 변화" 등 가입 신청수를 직접 노출하는 정렬은 도입하지 않음(과열 방지).

**근거: D-ECON-03 정합**

- D-ECON-03(2026-04-20)에서 외부 공개 클랜 순위표는 활동성·규모·매너 점수·이벤트 참여만 노출하기로 결정.
- "조회수" = 외부 경쟁 자극 지표에 가까움 → 추가하지 않는 편이 일관성 유지.
- 가입 신청 자체(`clan_join_requests`)는 본인 + 클랜 운영진만 보이는 비공개 신호. 외부 경쟁 자극으로 이어지지 않음.

**Phase 1 목업 매핑**

- 본 결정과 함께 `setPromoSort`에서 `popular` 분기 한 줄(`if (promoSort === 'popular') list = [...list].sort((a,b) => b.views - a.views);`) 삭제.
- 현재 HTML에 정렬 select UI 자체가 없음(코드만 존재) → UI 추가는 Phase 2+ 보류. 카피·페이지 문서에서 `popular` 언급 제거.
- `PROMOS[*].views`는 데이터 정의에 포함되어 있지 않아 영향 없음.

**연관 문서**

- [pages/08-MainGame.md §탭 2 — 정렬](./pages/08-MainGame.md)
- [D-ECON-03](#d-econ-03--클랜-순위표-민감-지표-노출-범위) — 외부 경쟁 지표 차단 원칙
- [D-CLAN-07](#) — 활성도 측정의 데이터 출처(`last_activity_at`)

---

### D-PERM-01 — 클랜 권한 매트릭스 모델 도입

- **결정일**: 2026-04-21
- **요지**: 클랜 단위 권한 처리를 **결정마다 토글 1개씩 추가**하는 방식에서 → **Discord 스타일 권한 매트릭스(하이브리드)** 로 일반화한다. "굵직한 권한"만 매트릭스에 등록하고 자잘한 액션 가드는 기존 패턴(`mock-officer-only`/`mock-leader-only` CSS 클래스)을 유지한다. 6개 카테고리 × 21개 권한 키. 저장은 `clan_settings.permissions jsonb` 단일 컬럼. **Phase 1 = 카탈로그·스키마·목업 const만**, **Phase 2+ = 매트릭스 UI 구현 + 기존 토글 마이그레이션**.

**카테고리 구조**

매트릭스 화면(Phase 2+)은 6개 카테고리로 그룹핑한다. 카테고리 이름·순서는 멘탈 모델 기준 — "찾고자 하는 권한이 어느 카테고리?" 즉답 가능하도록 기능 영역별 분리.

| # | 카테고리 | 의미 | 권한 키 수 | 잠긴 키 |
|---|----------|------|:---------:|:------:|
| 1 | 재무·계정 | 결제·하이재킹 방지 | 2 | 2 |
| 2 | 멤버 관리 | 입출 결정 | 4 | 2 |
| 3 | 평판·통계 | 평판 지표·기록 | 5 | 0 |
| 4 | 경기 운영 | 일정·매칭 | 2 | 1 |
| 5 | 홍보·자원 | 외부 노출·자산 지출 | 2 | 0 |
| 6 | **개인 정보** | 본인 데이터 공개 범위 (클랜 단위 기본 정책) | 6 | 0 |

> **카테고리 6 "개인 정보"는 본질이 다름**: 다른 카테고리가 "행위자가 무엇을 할 수 있는가"라면, 개인 정보는 "내 데이터를 누구에게 공개할 것인가"의 **클랜 단위 기본값**. 개인이 본인 프로필에서 더 닫는 옵션은 **Phase 2+ 후속 결정 D-PRIV-01 후보**로 보류.

**권한 키 카탈로그 (전체)**

| 카테고리 | 권한 키 | 의미 | leader | officer | member | 토글? | 흡수 |
|---------|--------|------|:------:|:------:|:------:|:----:|------|
| 재무·계정 | `manage_subscription` | 결제·플랜 변경 | ✓ | ✗ | ✗ | 🔒 | D-MANAGE-01 |
| 재무·계정 | `delegate_leader` | 클랜장 위임 | ✓ | ✗ | ✗ | 🔒 | D-MANAGE-02 |
| 멤버 관리 | `kick_officer` | 운영진 강퇴 | ✓ | ✗ | ✗ | 🔒 | D-MANAGE-02 |
| 멤버 관리 | `bulk_kick_dormant` | 휴면 일괄 강퇴 | ✓ | ✗ | ✗ | 🔒 | D-MANAGE-02 |
| 멤버 관리 | `kick_member` | 일반 멤버 강퇴 | ✓ | ✓ | ✗ | ✓ | — |
| 멤버 관리 | `approve_join_requests` | 가입 신청 승인/거절 | ✓ | ✓ | ✗ | ✓ | — |
| 평판·통계 | `edit_mscore` | M점수 편집 | ✓ | ✗ | ✗ | ✓ (officer 허용) | D-MANAGE-02 |
| 평판·통계 | `set_hof_rules` | HoF 설정 모달 | ✓ | ✗ | ✗ | ✓ (officer 허용) | **D-STATS-01** |
| 평판·통계 | `view_match_records` | 경기 기록 열람 (캘린더·일별 슬라이더) | ✓ | ✓ | ✗ | ✓ (member 허용) | — |
| 평판·통계 | `correct_match_records` | 경기 사후 정정 | ✓ | ✗ | ✗ | ✓ (officer 허용) | **D-STATS-02** |
| 평판·통계 | `export_csv` | CSV 내보내기 | ✓ | ✗ | ✗ | ✓ (officer 허용) | **D-STATS-04** |
| 경기 운영 | `manage_clan_events` | 이벤트 편집/삭제 | ✓ | ✓ | ✗ | ✓ | D-EVENTS-01 |
| 경기 운영 | `confirm_scrim` | 스크림 양측 확정 | ✓ | ✓ | ✗ | 🔒 | D-SCRIM-02 |
| 홍보·자원 | `manage_promo` | 클랜 홍보 글 작성/수정 | ✓ | ✓ | ✗ | ✓ | — |
| 홍보·자원 | `manage_clan_pool` | 클랜 풀 지출 | ✓ | ✓ | ✗ | ✓ | — |
| 개인 정보 | `view_alt_accounts` | 부계정 조회 | ✓ | ✓ | ✓ | ✓ | D-MANAGE-03 |
| 개인 정보 | `view_monthly_stats` | 월간 전적 공개 | ✓ | ✓ | ✗ | ✓ (member 허용) | — |
| 개인 정보 | `view_yearly_stats` | 연간 전적 공개 | ✓ | ✓ | ✗ | ✓ (member 허용) | — |
| 개인 정보 | `view_synergy_winrate` | 시너지 승률 공개 | ✓ | ✓ | ✗ | ✓ (member 허용) | — |
| 개인 정보 | `view_map_winrate` | 맵별 승률 공개 | ✓ | ✓ | ✗ | ✓ (member 허용) | — |
| 개인 정보 | `view_mscore` | M점수 공개 | ✓ | ✓ | ✗ | ✓ (member 허용) | — |

🔒 = 잠긴 권한 (leader 고정, 토글 불가). 보안·하이재킹 방지·재무 책임·트리거 정합성(`confirm_scrim`은 D-SCRIM-02 양측 운영진 가정과 결합) 사유.

**잠긴 권한 5개 사유**

| 권한 키 | 잠긴 이유 |
|--------|----------|
| `manage_subscription` | 클랜 명의 카드/환불 책임 — leader 고정 |
| `delegate_leader` | 하이재킹 방지 — 본인만 위임 가능 |
| `kick_officer` | officer 간 충돌·증식 방지 |
| `bulk_kick_dormant` | 범위가 커서 leader 책임 |
| `confirm_scrim` | D-SCRIM-02 트리거가 `side enum('host','guest')`로 양측 클랜 **운영진** 가정 — member 위임 시 트리거 정합성 깨짐 |

**스토리지 형태**

```sql
ALTER TABLE clan_settings ADD COLUMN permissions jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 예: 기본값에서 officer가 M점수 편집 + member가 월간 전적 공개로 토글된 클랜
-- {
--   "edit_mscore":         ["leader", "officer"],
--   "view_monthly_stats":  ["leader", "officer", "member"]
-- }
```

- **부재 키 = 매트릭스 default 적용** (코드 상수 `CLAN_PERMISSION_DEFAULTS`). DB에는 변경된 키만 저장 → 카탈로그 추가 시 마이그레이션 불필요.
- 잠긴 키는 jsonb에 저장돼도 코드 상수가 강제로 default를 덮어씀(이중 가드).
- Phase 2+ 운영 부담 커지면 `clan_role_permissions(clan_id, role, permission_key, granted)` 정규화 테이블로 마이그레이션. jsonb → relational은 단순 변환.

**RLS 가드 함수 (Phase 2+)**

```sql
CREATE OR REPLACE FUNCTION has_clan_permission(p_clan_id uuid, p_user_id uuid, p_perm text)
RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_role text;
  v_allowed text[];
BEGIN
  -- 1. 사용자의 클랜 내 역할
  SELECT role INTO v_role FROM clan_members
   WHERE clan_id = p_clan_id AND user_id = p_user_id AND status = 'active';
  IF v_role IS NULL THEN RETURN false; END IF;

  -- 2. 잠긴 권한 (코드 상수와 동일하게 SQL에서도 강제)
  IF p_perm IN ('manage_subscription','delegate_leader','kick_officer',
                'bulk_kick_dormant') THEN
    RETURN v_role = 'leader';
  END IF;
  IF p_perm = 'confirm_scrim' THEN
    RETURN v_role IN ('leader', 'officer');
  END IF;

  -- 3. 일반 키 — clan_settings.permissions 우선, 없으면 default
  SELECT permissions->p_perm INTO v_allowed FROM clan_settings WHERE clan_id = p_clan_id;
  IF v_allowed IS NULL THEN v_allowed := default_permission_for(p_perm); END IF;
  RETURN v_role = ANY(v_allowed);
END;
$$;
```

**Phase 1 목업 매핑**

- **매트릭스 UI는 만들지 않음**. 기존 `mock-officer-only`·`mock-leader-only` CSS 가드 그대로 유지.
- `mockup/scripts/clan-mock.js` 상단에 `CLAN_PERMISSION_CATALOG` 상수 추가 (카테고리·키·default·토글 가능 여부) — 코드로 매트릭스 진실 표현.
- "운영 권한 설정" 카드 (`#mock-clan-overview`)에 안내 카피 1줄 추가: "Phase 2+에 권한 매트릭스로 전면 확장 예정 — 자세한 카탈로그는 `decisions.md §D-PERM-01` 참조."
- 기존 `MOCK_CLAN_SETTINGS_KEY = "clansync-mock-clan-settings-v1"`는 그대로 유지 (M점수·부계정 토글 호환). `permissions` jsonb 시뮬레이션은 v2 키로 분리해 향후 마이그레이션 동선 마련.

**기존 결정 흡수 매핑 (전체)**

| 기존 결정 | 흡수 권한 키 | 본문 변경 |
|----------|-------------|----------|
| D-MANAGE-01 (구독·결제) | `manage_subscription` | 본문 유지, 헤더 표 메모만 갱신 |
| D-MANAGE-02 (개인 상세 편집·휴면 강퇴·M점수) | `delegate_leader`, `kick_officer`, `bulk_kick_dormant`, `kick_member`, `approve_join_requests`, `edit_mscore` | 본문 유지 |
| D-MANAGE-03 (부계정 조회) | `view_alt_accounts` (**기본값 변경: officer→member 확장**) | 본문 유지, 새 default 적용 |
| D-EVENTS-01 (이벤트 권한 분기) | `manage_clan_events` | 본문 유지 |
| D-SCRIM-02 (스크림 양측 확정) | `confirm_scrim` (잠김) | 본문 유지 |
| D-STATS-01 (HoF 설정 권한) | `set_hof_rules` | 흡수형 결정 블록(이 결정 직후) |
| D-STATS-02 (경기 사후 정정) | `correct_match_records` + `view_match_records` | 별도 결정 블록 (정정 요청 모달 + 이력) |
| D-STATS-04 (CSV 내보내기) | `export_csv` | 흡수형 결정 블록 |

→ 기존 결정 본문은 **건드리지 않음**(비파괴 처리). 헤더 표 메모에 "→ D-PERM-01 흡수" 노트만 1줄 추가됨.

**연관 문서**

- [D-MANAGE-01](#d-manage-01--구독결제-탭-접근-권한) · [D-MANAGE-02](#d-manage-02--구성원-개인-상세-편집-권한과-m점수-토글) · [D-MANAGE-03](#d-manage-03--부계정-조회-정책과-공개-범위-토글)
- [D-EVENTS-01](#d-events-01--스크림-확정--클랜-이벤트-자동-생성동기화) · [D-SCRIM-02](#d-scrim-02--스크림-양측-확정-동시성-2-phase-commit)
- [D-STATS-01](#d-stats-01--hof-설정-권한-d-perm-01-흡수) · [D-STATS-02](#d-stats-02--경기-사후-정정-요청-모달과-이력-보존) · [D-STATS-04](#d-stats-04--csv-내보내기-d-perm-01-흡수--phase-2-구현-보류)
- [schema.md §clan_settings](./schema.md) — `permissions jsonb` 추가
- [pages/10-Clan-Stats.md](./pages/10-Clan-Stats.md) — `set_hof_rules` · `view_match_records` · `correct_match_records` · `export_csv` 적용

**Phase 2+ 작업 백로그**

1. 매트릭스 UI 구현 (클랜 관리 → 권한 탭 신설)
2. `has_clan_permission()` SQL 함수 + RLS 정책 21개 권한 키별 적용
3. 기존 `clan_settings.allow_officer_edit_mscore`·`alt_accounts_visibility` 컬럼을 `permissions` jsonb로 마이그레이션 후 deprecated
4. 카탈로그 추가 시 부재 키 = default 적용이라 마이그레이션 불필요 (jsonb 유연성)
5. D-PRIV-01 (개인 단위 프라이버시 오버라이드) 후속 결정

---

### D-STATS-01 — HoF 설정 권한 (D-PERM-01 흡수)

- **결정일**: 2026-04-21
- **요지**: HoF 설정 모달 권한은 D-PERM-01 권한 매트릭스에 권한 키 `set_hof_rules`로 등록한다. **기본값 = leader만**(✓/✗/✗), 클랜 토글로 officer 허용 가능. 외부 공개 토글(`expose_hof`)은 D-MANAGE-03·기존 정책과 동일하게 leader 전용 유지.
- **흡수 권한 키**: `set_hof_rules` (평판·통계 카테고리, 토글 가능)
- **목업 영향**:
  - 기존 `mock-officer-only` 클래스 유지 (현 목업은 운영진+ 노출). Phase 2+에서 `has_clan_permission(clan, user, 'set_hof_rules')`로 교체 시 default(leader)에 맞춰 자동으로 좁혀짐.
  - `pages/10-Clan-Stats.md §HoF "설정" 모달` 섹션에 권한 키 명시 추가.
- **연관**: [D-PERM-01](#d-perm-01--클랜-권한-매트릭스-모델-도입) · [D-ECON-03](#d-econ-03--클랜-순위표-민감-지표-노출-범위) (외부 공개 분리)

---

### D-STATS-02 — 경기 사후 정정 요청 모달과 이력 보존

- **결정일**: 2026-04-21
- **요지**: 경기 기록(승패·로스터·맵)이 잘못 입력된 경우, **운영진+가 직접 수정**(권한 키 `correct_match_records`, 기본 leader / officer 허용 토글)하거나, 일반 멤버가 **정정 요청 모달**을 통해 운영진에게 요청한다. 운영진이 모달에서 **수동으로 새 값을 입력·저장하는 시점에** `match_record_history`에 before/after 자동 INSERT — 정정 출처(직접/요청) 모두 동일 이력 테이블 사용.

**권한 분리**

| 액션 | 권한 키 | 기본값 | 토글 |
|------|--------|--------|------|
| 경기 기록 열람 (캘린더·슬라이더 진입) | `view_match_records` | ✓/✓/✗ | member 허용 |
| 정정 요청 모달 열기 | (별도 키 없음 — `view_match_records` 보유자) | 동일 | 동일 |
| 직접 정정 | `correct_match_records` | ✓/✗/✗ | officer 허용 |

> **요청 모달은 별도 권한 키를 두지 않음**. "기록을 볼 수 있는 사람만 정정 요청 가능"이 자연스러움 — 보지 못하는 경기를 정정 요청할 수 없으므로. `view_match_records` 토글로 멤버에게 열어주면 멤버도 요청 가능.

**정정 요청 모달 흐름**

1. 사용자가 경기 카드에서 "정정 요청" 버튼 클릭 → `#mock-match-correction-request-modal` 오픈
2. 입력 항목:
   - **결과** (블루승/레드승, optional)
   - **로스터** (블루·레드 멤버 수정, optional)
   - **맵** (드롭다운, optional)
   - **자유 사유** (필수, max 500자)
3. 제출 → `match_record_correction_requests` INSERT → AFTER INSERT 트리거가 `correct_match_records` 권한 보유자 전원의 `notifications`에 `kind='match_correction_requested'` 피드 생성 (D-NOTIF-01 통합 센터, DECIDED 2026-04-21)
4. 운영진이 알림에서 진입 → 요청 상세 모달 → "정정 적용" 클릭 시 운영진이 직접 새 값 입력 → 저장 → `match_record_history` INSERT + 요청 행 `status='accepted'`
5. 운영진이 "반려" 클릭 시 → 요청 행 `status='rejected'` + 반려 사유 → 요청자에게 알림
6. **자동 적용 X** — 요청은 단순히 운영진을 호출하는 신호이며, 실제 데이터 변경은 운영진의 손을 거친다.

**중복 방지·만료**

- 같은 경기에 active 요청 1건만(부분 UNIQUE 인덱스 `WHERE status='pending'`).
- 7일 내 미처리 시 cron으로 자동 expire (`status='expired'`).
- 거절·만료 후 같은 경기 재요청 가능.

**`match_record_correction_requests` 테이블 (Phase 2+)**

```sql
CREATE TABLE match_record_correction_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  requester_id    uuid NOT NULL REFERENCES users(id),
  proposed_result text,                    -- 'blue_win'/'red_win' or NULL
  proposed_roster jsonb,                    -- {blue: [user_id...], red: [user_id...]} or NULL
  proposed_map    text,
  reason          text NOT NULL,            -- 자유 사유 (필수)
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','rejected','expired')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  resolved_by     uuid REFERENCES users(id),
  reject_reason   text                       -- status='rejected' 시
);

CREATE UNIQUE INDEX match_correction_one_active_per_match
  ON match_record_correction_requests (match_id)
  WHERE status = 'pending';
```

**`match_record_history` 테이블 (Phase 2+)**

```sql
CREATE TABLE match_record_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  changed_by  uuid NOT NULL REFERENCES users(id),
  source      text NOT NULL CHECK (source IN ('direct','request')),
  request_id  uuid REFERENCES match_record_correction_requests(id),  -- source='request' 시
  before      jsonb NOT NULL,                                          -- {result, roster, map}
  after       jsonb NOT NULL,
  reason      text,                                                    -- 직접 정정 시 입력값
  changed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX match_history_by_match ON match_record_history (match_id, changed_at DESC);
```

- INSERT-only 테이블 (UPDATE/DELETE RLS 차단). HoF·통계 재집계 시 history를 reverse-replay 해 시점별 통계 재현 가능.

**알림 슬롯 (D-EVENTS-03 채널 정책 재사용)**

| 슬롯 | 트리거 | 채널 | 수신자 |
|------|--------|------|--------|
| `match_correction_requested` | 요청 INSERT | in-app | `correct_match_records` 권한 보유자 전원 |
| `match_correction_accepted` | 운영진 적용 | in-app | 요청자 |
| `match_correction_rejected` | 운영진 반려 | in-app | 요청자 (반려 사유 포함) |
| `match_correction_expired` | cron 만료 | in-app | 요청자 |

**Phase 1 목업 매핑**

- `mockup/pages/main-clan.html`에 `#mock-match-correction-request-modal` 신설 (입력 폼 + 미리보기).
- `mockup/scripts/clan-mock.js`에 sessionStorage `clansync-mock-match-correction-requests-v1` 헬퍼 (요청 누적·상태 변경 시뮬레이션).
- 경기 카드에 "정정 요청" 버튼 추가 — `view_match_records` 권한자(현 목업은 운영진+) 노출. 멤버 노출은 `mock-officer-only` 가드 유지.
- 운영진 측 "요청 처리" UI는 D-NOTIF-01(알림 센터, DECIDED 2026-04-21) 통합 피드 드로워를 통해 일관 진입. Phase 1 목업은 네비 벨 드로워 → 경기 카드 alert로 이동하는 플레이스홀더.

**연관 문서**

- [D-PERM-01](#d-perm-01--클랜-권한-매트릭스-모델-도입) — 권한 키 `correct_match_records`, `view_match_records`
- [pages/10-Clan-Stats.md §탭 3 — 경기 기록](./pages/10-Clan-Stats.md)
- [schema.md](./schema.md) — `match_record_correction_requests` · `match_record_history` 신설

---

### D-STATS-03 — "앱 이용 횟수" 측정 단위 = 활동일 (person-day)

- **결정일**: 2026-04-21 (사용자 컨펌)
- **요지**: 탭 4 "앱 이용" §영역 1의 "연도×월 앱 이용 횟수"를 **활동일(person-day)** 로 정의한다. 멤버가 **자기 클랜 페이지에 첫 페이지뷰**를 기록한 날 = 1. 같은 날 추가 접속·새로고침은 카운트되지 않는다(DAY UNIQUE). 월 합계 = 그 달의 모든 멤버의 활동일 합.

**핵심 정의 표**

| 항목 | 값 |
|------|-----|
| **단위** | person-day (멤버 1명이 하루에 1번 활동 = 1) |
| **트리거** | 자기 클랜 페이지(클랜 메인·관리·통계·이벤트 등 `/clan/[clan_id]/...` 라우트군)에서의 **첫 페이지뷰** |
| **카운트 컨텍스트** | **자기 클랜 페이지 진입 시에만** 카운트. 다른 클랜 탐색·메인 게임 허브·프로필 등은 본 클랜 통계에 미반영 |
| **시간대** | 클랜 `clans.timezone`(없으면 `Asia/Seoul`) 기준 자정 경계 |
| **열람 권한** | 멤버 전체 (영역 2·3과 동일) |
| **외부 노출** | D-ECON-03 차단 — 다른 클랜이 우리 클랜 활동일 수치를 보지 못함. 클랜 순위표·검색 등에 노출 금지 |

**왜 활동일인가 (옵션 A 선택 사유)**

1. **3개 영역의 자연스러운 보완**: 영역 1(누적 활동일=도달) ↔ 영역 2(distinct 멤버=참여) ↔ 영역 3(내전 경기 수=결과) — 3축이 한 화면에서 의미 있게 읽힌다.
2. **DAY UNIQUE 가드** = 새벽 새로고침·매크로·프리페치 스팸을 자동 차단.
3. **운영 지표로 직관적**: "이번 달 활동일 240회 / 활성 멤버 35명 / 내전 18경기" 한 줄로 클랜 건강도 파악 가능.
4. **D-ECON-03(외부 경쟁 지표 차단) 부합**: person-day 합산은 외부 순위로 가공되기 어려운 **내부 운영 척도**.

**선택되지 않은 옵션 (참고)**

- 옵션 B (의미 있는 액션 카운트) — 액션 목록·가중치 정의가 끝없이 늘어남. 후속 카드(액션별 분석)로 별도 도입 가능.
- 옵션 C (페이지뷰) — 새로고침·라우팅에 부풀려져 "활성도"가 아닌 "엔게이지먼트 노이즈"가 됨.
- 옵션 D (세션) — 30분 임계값의 임의성, 다중 디바이스 분기 혼란.

**트리거 = 첫 페이지뷰 (사용자 선택)**

- **장점**: 가벼움. 별도 액션 정의·가중치 협의 불필요. 클라이언트에서 라우터 진입 시 바로 INSERT.
- **노이즈 방어 (Phase 2+ 구현 시 필수)**:
  - `robots.txt` 차단된 경로 + User-Agent 봇 필터.
  - HTTP `Sec-Fetch-Dest=prefetch` / `Purpose=prefetch` 헤더 가진 요청 제외.
  - 인증된 세션의 첫 GET만 (비인증·preflight 제외).
  - 본인이 자기 클랜의 멤버일 것 (`clan_members WHERE status='active'` 검증).
- **첫 의미 있는 인터랙션(옵션 b) 미선택 사유**: 클라이언트 액션 정의 부담 + "이게 왜 1?" 디버깅 비용. 노이즈는 헤더·인증 가드로 충분히 방어 가능하다는 판단.

**스토리지 모델**

```sql
CREATE TABLE clan_daily_member_activity (
  clan_id        uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date  date NOT NULL,
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clan_id, user_id, activity_date)
);

CREATE INDEX clan_dma_by_clan_date
  ON clan_daily_member_activity (clan_id, activity_date DESC);
```

- INSERT-only (UPDATE/DELETE RLS 차단).
- 멱등 INSERT: `INSERT ... ON CONFLICT (clan_id, user_id, activity_date) DO NOTHING` — 같은 날 중복 진입은 silently 무시.
- 7일·30일 통계는 `WHERE activity_date >= now()::date - 7` 같은 윈도우 쿼리로 즉시 산출.

**RLS**

- SELECT: 같은 클랜 활성 멤버 전원 (영역 2·3과 동일 정책).
- INSERT: 본인이 해당 클랜의 활성 멤버일 때만, `activity_date = current_date AT TIME ZONE clans.timezone`로 강제. 과거 날짜·미래 날짜·타 클랜 INSERT 차단.
- UPDATE/DELETE: 전면 차단 (서비스 롤도 GC 외엔 만지지 않음).
- 멤버가 클랜에서 탈퇴해도 기존 행 보존 — 과거 통계의 진실성 유지. 영구 삭제는 사용자 계정 삭제(GDPR)에서만.

**집계 뷰 (Phase 2+)**

```sql
CREATE MATERIALIZED VIEW clan_monthly_activity AS
SELECT
  clan_id,
  date_trunc('month', activity_date)::date AS month,
  COUNT(*) AS person_days,
  COUNT(DISTINCT user_id) AS active_members
FROM clan_daily_member_activity
GROUP BY 1, 2;

-- 매일 새벽 1회 REFRESH (cron)
```

- 영역 1 표 = `person_days`, 영역 2 막대 = `active_members`. 같은 MV 한 줄로 두 영역이 동시 산출됨 — 일관성 강화.
- 연간 집계 = 월간 집계의 SUM (활동일은 합산 가능, distinct 멤버는 별도 연도 윈도우 필요).

**연도 vs 월 집계의 미묘한 점**

- **활동일(영역 1)**: 월 person_day 합산이 곧 연간 합산. 합 가능.
- **distinct 멤버(영역 2)**: 월 active_members의 단순 합 ≠ 연 active_members. 연간은 별도 `COUNT(DISTINCT user_id) WHERE activity_date BETWEEN ...`. → MV에 `clan_yearly_activity`도 별도 만들 것.

**카운트 컨텍스트 = "자기 클랜 페이지 진입" 정의**

- 포함 라우트 (Phase 2+ 확정): `/clan/[clan_id]`, `/clan/[clan_id]/manage`, `/clan/[clan_id]/stats`, `/clan/[clan_id]/events`, `/clan/[clan_id]/promo` 등 클랜 컨텍스트 파라미터를 가진 모든 라우트.
- 제외: `/main-game` 허브, `/profile`, `/balance` 등 클랜 비종속 라우트, 공개 클랜 프로필 (다른 클랜 탐색).
- 다중 클랜 멤버(향후 가능성): 각 클랜별로 독립 카운트. 멤버가 같은 날 두 클랜에 들어가면 두 클랜 모두 +1.

**Phase 1 목업 영향**

- 통계 카드 자체는 정적 마크업 유지(영역 1/2/3 모두 더미 숫자). 백엔드 집계 로직은 Phase 2+에서 구현.
- §탭 4 영역 1 카피를 "정의는 구현 시 확정" → "**활동일(person-day): 자기 클랜 페이지 진입 시 1회/일 카운트**"로 갱신.
- 사이드바·페이지 라벨 "앱 이용"은 그대로 유지 (코드 식별자 `rankmap`도 유지 — 역사적 명칭).

**열람 권한과 D-PERM-01 관계**

- 영역 1/2/3 모두 **모든 클랜 멤버 열람**. D-PERM-01 권한 키 신설 불필요 (별도 토글 없음).
- 단, **CSV 내보내기**는 D-STATS-04 흡수의 `export_csv` 권한 키로 별도 가드 (Phase 2+ 구현 시).
- 외부 클랜·비멤버에게는 노출 금지 (D-ECON-03).

**Phase 2+ 작업 백로그**

1. `clan_daily_member_activity` 테이블 + RLS + INSERT 멱등 RPC 구현.
2. 클랜 라우트 진입 미들웨어/서버 컴포넌트에서 RPC 1회 호출 (인증·prefetch 헤더 가드 포함).
3. `clan_monthly_activity` · `clan_yearly_activity` MV + cron 새벽 REFRESH.
4. 통계 페이지에서 MV 조회 → 영역 1·2 동시 렌더.
5. (옵션 B 후속) "의미 있는 액션" 카드 — 별도 결정 D-STATS-05 후보.

**연관**

- [pages/10-Clan-Stats.md §탭 4 — 앱 이용](./pages/10-Clan-Stats.md)
- [D-ECON-03 클랜 순위표 민감 지표](#d-econ-03--클랜-순위표-민감-지표-노출-범위) — 외부 노출 차단 원칙
- [D-PERM-01](#d-perm-01--클랜-권한-매트릭스-모델-도입) — 별도 권한 키 미신설(전원 열람), CSV는 `export_csv`(D-STATS-04)
- [schema.md](./schema.md) — `clan_daily_member_activity` 신설

---

### D-STATS-04 — CSV 내보내기 (D-PERM-01 흡수 + Phase 2+ 구현 보류)

- **결정일**: 2026-04-21
- **요지**: CSV 내보내기 권한은 D-PERM-01에 권한 키 `export_csv`로 등록 (기본 leader, officer 허용 토글). 실제 CSV 생성·기간 필터 UI 구현은 **Phase 2+ 보류** — Phase 1은 권한 카탈로그 등록만.
- **흡수 권한 키**: `export_csv` (평판·통계 카테고리)
- **Phase 2+ 도입 시 범위 (예시)**:
  - "앱 이용" 탭의 연/월 표 → CSV
  - "경기 기록" 탭의 일자 범위 선택 → 경기 목록 CSV
  - HoF 등재자 명단 → CSV (외부 공개 토글과 별개로 클랜 내부 사용)
- **목업 영향**: 카피 변경 없음. `pages/10-Clan-Stats.md §탭 4` 각주 "운영진은 필요 시 CSV 내보내기·기간 필터를 둘 수 있음(기획)"은 그대로 유지하되 D-PERM-01·D-STATS-04 링크 추가.
- **연관**: [D-PERM-01](#d-perm-01--클랜-권한-매트릭스-모델-도입) · [pages/10-Clan-Stats.md §탭 4](./pages/10-Clan-Stats.md)

---

### D-NOTIF-01 — in-app 알림 센터 통합 도입

- **결정일**: 2026-04-21 (사용자 컨펌)
- **요지**: 지금까지 각 결정(D-CLAN-02·D-STATS-02·D-SCRIM-01/02·D-LFG-01·D-CLAN-07 등)이 정의한 개별 in-app 알림 슬롯과 D-EVENTS-03 일정 알림을 **단일 피드**로 통합한다. 네비게이션바 상단에 **벨 아이콘 + 드로워**(디스코드식)를 두고, 모든 수신 알림이 이 한 곳에 모인다. D-SHELL-03 사이드바 메뉴별 점(예: `#manage` pending 가입 요청 수)은 **집계 척도가 달라** 병존 유지한다.

**수신자 관점 3분류**

| 분류 | 성격 | 예시 | 이 결정 이전 문제 |
|------|------|------|------------------|
| 운영/관리 알림 | 나는 **처리 주체** (누군가가 결정을 요구) | 가입 신청 접수, 정정 요청 접수, 상대 클랜 스크림 확정, LFG 신청 접수, 멤버 휴면 진입 | 각 탭 배지·cron 이메일로 산재. 드로워·피드 없음 |
| 개인 결과 알림 | 나는 **요청자** (내가 제출한 것의 결과) | 내 가입 신청 승인/거절, 내 정정 요청 수락/거절/만료, 내 LFG 신청 수락/거절, 스크림 양측 확정·무효화 통보, 스크림 채팅 1시간 전 종료 안내 | 재진입한 화면에서만 확인 가능. 센터 없음 |
| 일정 알림 | 시간 경과 | "내전 24h 후 시작", "투표 마감 1h" | D-EVENTS-03 채널(Discord/카카오)은 잘 흐르지만 **in-app** 경로만 앱 내에서 다시 보기 어려움 |

**프리셋 비교 (사용자 컨펌 내역 기록용)**

| 프리셋 | UI 진입점 | 범위 | 저장 | 선택 여부 |
|--------|----------|------|------|----------|
| α | 네비 상단 **벨 + 드로워** | 운영 + 개인 + 일정 전체 통합 | `notification_log` + `notifications` 분리 | **✓ 선택** |
| β | "클랜 관리" 메뉴 확장만 | 운영진만 | `notifications` 단일 | |
| γ | 통합 안 함 (no-op) | — | 변경 없음 | |
| δ | α + 브라우저 ServiceWorker 푸시 | α와 동일 | α와 동일 | (Phase 2+ 후속 결정 후보) |

**저장 모델 — M1 (분리 + FK)**

두 테이블은 **책임이 다르므로 분리 유지**한다.

| 테이블 | 책임 | 기존 여부 |
|--------|------|----------|
| `notification_log` | 언제 어느 채널로 예약·발송·실패·재시도했는가(기술/발송 레이어). `event_id`·`slot_kind`·`channel`·`recipient_user_id`·`scheduled_at`·`status`·`retry_count`·`dlq_reason` | 기존 (D-EVENTS-03/04) |
| `notifications` | 수신자의 in-app 피드 — `recipient_user_id`·`kind`·`source_table`·`source_id`·`payload jsonb`·`read_at`·`created_at` (UI/수신자 레이어) | **신설** |

**관계**

```
notification_log (기존, D-EVENTS-03/04)
  ├── channel='in_app' AND status='sent'로 전환
  │       └─→ AFTER UPDATE 트리거 → INSERT INTO notifications
  │           (source_table='notification_log', source_id=log.id, kind='event_reminder', ...)
  └── channel='discord' / 'kakao' 예약 → notifications 미반영 (외부 채널만)

notifications (신설)
  ├── 일정 알림  → source_table='notification_log'
  ├── 운영 알림  → source_table='clan_join_requests'
  │                             / 'match_record_correction_requests'
  │                             / 'scrim_room_confirmations'
  │                             / 'lfg_applications' 등
  └── 개인 결과 알림 → 소스 테이블 AFTER UPDATE 트리거로 직접 INSERT
```

**왜 M1인가 (M2·M3 탈락 사유)**

- **M2** (`notification_log` 확장 흡수): 기술 레이어(재시도·DLQ)와 UI 레이어(읽음)를 섞으면 기존 UNIQUE(`event_id`, `slot_kind`, `scheduled_at`, `channel`, `recipient_user_id`) 제약이 운영 알림에 맞지 않음. D-EVENTS-03/04 본문·스키마를 대규모 재작업해야 함.
- **M3** (`notification_log` deprecate): 재시도·DLQ·예약 취소 로직 재설계 비용 과다. 이미 DECIDED인 D-EVENTS-03/04를 뒤집는 셈이라 번복 비용 큼.

**개인/운영 알림 동기화 = DB 트리거**

- 각 소스 테이블의 상태 변화(예: `match_record_correction_requests.status` `pending → accepted`)에 AFTER UPDATE 트리거를 건다.
- 트리거가 `notifications`에 행을 INSERT — 수신자·kind·source_table·source_id·payload(스냅샷) 채워넣는다.
- 장점: **알림 누락 불가**(애플리케이션 코드에서 빼먹어도 DB 레벨에서 보장), 트랜잭션 내 원자성.
- 예시 트리거 매핑:

| 소스 테이블 | 트리거 조건 | `kind` | 수신자 |
|------------|-------------|--------|--------|
| `clan_join_requests` | INSERT | `join_request_submitted` | `approve_join_requests` 권한자(클랜 운영진) |
| `clan_join_requests` | AFTER UPDATE status → accepted/rejected | `join_request_{accepted,rejected}` | 신청자 본인 |
| `match_record_correction_requests` | INSERT | `match_correction_requested` | `correct_match_records` 권한자 |
| `match_record_correction_requests` | AFTER UPDATE status → accepted/rejected/expired | `match_correction_{accepted,rejected,expired}` | 요청자 본인 |
| `scrim_room_confirmations` | INSERT (한쪽 확정) | `scrim_one_side_confirmed` | 상대 클랜의 `confirm_scrim` 권한자 |
| `scrim_rooms` | AFTER UPDATE status → confirmed/invalidated/cancelled | `scrim_{both_confirmed,invalidated,cancelled}` | 양측 운영진·관여 멤버 |
| `scrim_rooms` | cron: scheduled_at - 1h with status='confirmed' | `scrim_chat_closing_soon` | 참가자 (D-SCRIM-01) |
| `lfg_applications` | INSERT | `lfg_applied` | 모집자 |
| `lfg_applications` | AFTER UPDATE status → accepted/rejected/expired | `lfg_{accepted,rejected,expired}` | 신청자 본인 |
| `clan_members` | AFTER UPDATE activity_status → 'dormant' (D-CLAN-07) | `member_became_dormant` | 운영진 |
| `notification_log` | AFTER UPDATE status → sent, channel='in_app' | `event_reminder` (slot_kind 포함) | `recipient_user_id` |

**읽음·GC 동작**

| 동작 | 결과 |
|------|------|
| 드로워 열기 | 표시된 항목 일괄 `read_at = now()` |
| "원본 열기" 클릭 | 해당 항목 read + `source_table`·`source_id` 조회해 딥링크로 이동 |
| 개별 dismiss 버튼 | **없음** (단순성 우선) |
| 자동 GC | 읽은 후 **7일** 경과분 cron으로 삭제 (`read_at < now() - interval '7 days'`) |
| 미열람 유지 | `read_at IS NULL`인 행은 GC 대상 아님 — 아무리 오래돼도 보존 |

**payload 설계**

- 알림 생성 시점의 스냅샷을 `payload jsonb`에 넣는다. 예: `{"requester_nickname":"철수","match_label":"2026-04-15 19:30 / 소환사의 협곡"}`.
- 이유: 원본 row가 삭제/수정돼도 피드 문구가 "알 수 없는 신청"이 되지 않도록. UI 렌더 시 payload만 쓰고 source 테이블 join을 피한다(피드 조회 성능).
- 원본 열기는 source_table·source_id로 재조회 — 해당 시점에 RLS로 접근성 재확인.

**사이드바(D-SHELL-03)와의 병존**

- 사이드바 각 메뉴의 알림 점(`#sidebar-notify-balance/events/manage`)은 **해당 메뉴 고유 집계**(진행 중 세션 수·24h 내 미응답·pending 가입 등). 이 집계는 `notifications` 미열람 수와 **일치시키지 않는다**.
- 벨 배지는 `SELECT COUNT(*) FROM notifications WHERE recipient_user_id = ? AND read_at IS NULL`.
- 둘 다 의미가 다르다: 메뉴 점 = "이 화면에 해야 할 일이 있다", 벨 = "내 피드에 새 소식이 있다".
- 예: 가입 신청 1건이 오면 사이드바 `#manage` 점 +1, 벨 +1. 운영진이 가입 요청 화면에 들어가 처리하면 `#manage` 점은 데이터 기반으로 자연히 -1, 벨은 드로워를 열면 -1.

**권한 (D-PERM-01 연관)**

- **권한 키 신설 없음**. `notifications` 행의 수신자(`recipient_user_id`)는 소스 트리거에서 계산될 때 이미 권한 체크가 끝난 상태다(예: `join_request_submitted`는 `approve_join_requests` 권한자에게만 보냄).
- 따라서 RLS는 단순: `SELECT WHERE recipient_user_id = auth.uid()`. 그 외 사용자는 절대 못 읽음.

**Phase 1 목업 영향**

- 목업은 **단발성 alert/토스트**가 아니라 **네비게이션바 상단 벨 아이콘 + 드로워 오버레이**로 구조를 가시화한다.
- 더미 알림 3~5건(정정 요청, LFG 수락, 일정 리마인더 등) 시딩해 스크롤·읽음 처리 동작 시연.
- 저장은 `sessionStorage` 플레이스홀더 (`clansync-mock-notifications-v1`). Phase 2+에 Supabase `notifications` 테이블로 교체.
- 사이드바 기존 알림 점은 **그대로** — 벨과 별개 집계임을 UI상 분명히 유지.

**Phase 2+ 작업 백로그**

1. `notifications` 테이블 + RLS + GC cron 구현.
2. 10+ 소스 테이블에 AFTER UPDATE/INSERT 트리거 설치(순차 슬라이스).
3. `notification_log.channel='in_app' AND status='sent'` 전환 트리거.
4. 네비게이션바 벨 컴포넌트 + 드로워 UI(D-SHELL-03 메뉴 점과 충돌 없는 배치).
5. **후속 결정 D-NOTIF-02** — 브라우저 푸시(ServiceWorker) 도입 여부·QoS. **DECIDED 2026-04-21** (프리셋 α, Premium 전용, Phase 2+ 실구현). [§D-NOTIF-02](#d-notif-02--브라우저-서비스워커-웹-푸시-도입-정책-프리셋-α)
6. **후속 결정 후보 D-NOTIF-03** — 이메일 다이제스트(일간/주간 요약) 여부.

**연관**

- [D-EVENTS-03](#d-events-03--일정투표-알림-채널정책) · [D-EVENTS-04](#d-events-04--투표-알림과-마감일-일관성-검증) — `notification_log` 기존 스키마 비파괴
- [D-SHELL-03](#d-shell-03--사이드바-알림-점-트리거-규칙) — 사이드바 메뉴 점과 병존
- [D-PERM-01](#d-perm-01--클랜-권한-매트릭스-모델-도입) — 권한 키 신설 없음, 수신자 계산은 소스 RLS
- [D-CLAN-02](#d-clan-02--가입-신청-상태-머신과-중복정책) · [D-STATS-02](#d-stats-02--경기-사후-정정-요청-모달과-이력-보존) · [D-SCRIM-01](#d-scrim-01--스크림-채팅방-자동-종료-정책) · [D-SCRIM-02](#d-scrim-02--스크림-양측-확정-동시성-2-phase-commit) · [D-LFG-01](#d-lfg-01--lfg-신청-상태-ui와-수락-플로우) · [D-CLAN-07](#d-clan-07--클랜-멤버-활성도-분류와-휴면-멤버-처리) — 알림 슬롯 소스
- [schema.md](./schema.md) — `notifications` 신설
- [pages/07-MainClan.md](./pages/07-MainClan.md) — 네비게이션바 벨·드로워 진입점

---

### D-NOTIF-02 — 브라우저 서비스워커 웹 푸시 도입 정책 (프리셋 α)

- **결정일**: 2026-04-21 (사용자 컨펌)
- **요지**: D-NOTIF-01의 in-app 피드를 **OS 레벨 브라우저 푸시**로 확장한다. Web Push API + ServiceWorker + VAPID 기반. **Premium 전용**으로 두어 D-EVENTS-03(카카오·Discord)의 유료 알림 채널 경계와 정합. **Phase 1은 결정·스키마·목업 예고 배너만** — 실제 VAPID 키·워커·구독 관리 UI는 Phase 2+ (후속 D-NOTIF-02b에서 공급자 선정).

**프리셋 비교 (사용자 컨펌 내역 기록용)**

| 축 | α (**✓ 선택**) | β | γ | δ |
|---|---|---|---|---|
| 과금 게이팅 | **Premium 전용** | Free 포함 전체 | Free = 본인 관련 운영/개인 결과만, Premium = 전체 | 도입 보류 / DROPPED |
| 카테고리 구독 | 4 카테고리 독립 토글 (운영·개인·일정·채팅) | 4 카테고리 | Free=2, Premium=4 | — |
| 권한 프롬프트 | **벨 드로워 최초 열 때 맥락형 배너** | 동일 | α + 중요 이벤트 첫 수신 시 재안내 | — |
| 조용 시간 | **서버 quiet hours 00~07 KST 준수**(07시 일괄) | 미적용 (디바이스 DnD 위임) | 서버 quiet hours 준수 | — |
| 업셀 카피 | Free 드로워에 "브라우저 알림은 Premium 전용" 배너 | 없음 | Free에 "더 많은 카테고리는 Premium" | — |
| 선택 여부 | **✓** | — | — | — |

**β/γ/δ 탈락 근거**

- **β** (Free 전면 허용): VAPID·웹 푸시 인프라가 사실상 무료여서 기술적으로 가능하지만, **D-EVENTS-03의 "외부 채널 = Premium" 원칙**을 깨뜨린다. 장기적으로 카카오알림톡·Discord 게이팅의 근거가 약해지고 Premium 차별화 훼손.
- **γ** (Free 중요 알림만 하이브리드): 정책상 자연스럽지만 `kind × plan` 매트릭스가 **11 kind × 2 plan = 22 조합**으로 복잡. 테스트·QA 비용 증가. 추후 D-NOTIF-02c로 분리 검토 가능.
- **δ** (도입 보류): in-app만으로도 탭을 열어둔 사용자는 커버. 하지만 모바일 사용자·탭 닫은 사용자의 재참여 경로가 0이 되어 참여율 저하 위험.

**범위 R3 (Phase 1 반영 규모) — 근거**

- **R1** (전면 목업 스텁, 알림 설정 페이지 신설): Phase 1 슬라이스 S09(알림 설정)가 아직 정의되어 있지 않아 오버엔지니어링.
- **R2** (결정·스키마만): 의사결정이 UI에 드러나지 않아 세션 간 컨텍스트 소실 위험.
- **R3 (**선택**)**: R2 + **벨 드로워 최상단에 inert 예고 배너 1줄**(`"🔔 브라우저 알림은 Premium 전용 · Phase 2+ 예정 (D-NOTIF-02)"`). 구현 5분, Phase 2+ 실제 권한 배너로 교체 지점 명확.

**스키마 (Phase 1 추가)**

- `web_push_subscriptions` 테이블 신설:

  | 컬럼 | 타입 | 설명 |
  |------|------|------|
  | id | uuid PK | |
  | user_id | uuid NOT NULL FK → users ON DELETE CASCADE | |
  | endpoint | text NOT NULL | Push Service URL (FCM·APNs Web·Mozilla autopush 등) |
  | p256dh | text NOT NULL | 클라 공개 키(base64url) |
  | auth | text NOT NULL | 클라 auth 시크릿(base64url) |
  | user_agent | text NULL | 구독 시 User-Agent (디바이스 식별용) |
  | created_at | timestamptz NOT NULL DEFAULT now() | |
  | revoked_at | timestamptz NULL | soft delete — 재구독 시 새 행 INSERT(히스토리 보존) |

  UNIQUE `(user_id, endpoint) WHERE revoked_at IS NULL` — 동일 디바이스 중복 구독 방지 (revoked는 히스토리로 남음).
  한 사용자 **N 디바이스 허용** (PC·모바일 브라우저 각각).

- `notification_log.channel` 카탈로그 확장:
  | 값 | 설명 | 과금 |
  |----|------|------|
  | `in_app` | D-NOTIF-01 피드 sync 대상 | Free·Premium 공통 |
  | `discord` | Bot 발송 | Premium |
  | `kakao` | 알림톡 | Premium (옵트인) |
  | **`web_push`** *(신설)* | ServiceWorker push | **Premium** |

- **재시도 정책**: D-EVENTS-03 지수 백오프 5회(1m→5m→30m→2h→6h) 동일. 410 Gone(구독 폐기) 응답 시 즉시 DLQ 없이 `web_push_subscriptions.revoked_at = now()` 업데이트하고 재시도 중단.

**발송 플로우 (Phase 2+ 구현 시)**

```
notifications INSERT (D-NOTIF-01 트리거 결과)
  │
  ├─ recipient의 users.plan = 'premium' 인가?
  │    ├─ 예 → web_push_subscriptions 활성 행 조회
  │    │       ├─ 각 디바이스별 notification_log INSERT
  │    │       │   (channel='web_push', status='queued', scheduled_at=now())
  │    │       └─ quiet hours 00~07 KST 이면 scheduled_at = 07:00 KST로 지연
  │    └─ 아니오 → 스킵 (notifications 피드에만 남음)
  └─ 사용자의 카테고리 구독 off 인가?
       └─ 예 → 스킵
```

**권한 프롬프트 타이밍 (UX)**

- **첫 로그인 즉시 요청 금지** (거절률 60%+ 데이터 기반). `Notification.requestPermission()` 호출 시점:
  1. 사용자가 네비 상단 벨 아이콘을 **처음 클릭**한 순간, 드로워 최상단에 **맥락형 배너** 노출:
     ```
     🔔 브라우저 알림을 받으시겠어요?
        새 가입 요청·스크림 확정 등을 앱 밖에서도 바로 알 수 있습니다.
        [알림 켜기]  [나중에]
     ```
  2. "알림 켜기" 클릭 시에만 `Notification.requestPermission()` 호출.
  3. 거절 시 7일간 배너 재표시 금지. 이후에도 앞서와 동일 배너 + "브라우저 설정에서 허용해야 재노출 가능" 보조 카피.
- **Free 사용자**: 배너 대신 Premium 업셀 문구 (`"브라우저 알림은 Premium 전용입니다. [플랜 비교]"`) — Phase 2+.

**카테고리 구독 토글 (Phase 2+ UI)**

- 사용자 설정 `/settings/notifications` (신설 예정, 슬라이스 S09 후보):
  - 운영/관리: 기본 ON
  - 개인 결과: 기본 ON
  - 일정: 기본 ON
  - 채팅(멘션): 기본 OFF (소음 방지)
- 저장 위치: `users.web_push_prefs jsonb` 또는 `web_push_subscriptions.prefs jsonb` — Phase 2+ 결정.

**조용 시간 (Quiet Hours)**

- **서버 측 00~07 KST 준수** — D-EVENTS-03 카카오알림톡과 동일 정책. 그 시간대 발생 알림은 07:00 KST로 `scheduled_at` 지연.
- 예외: **본인이 직접 트리거한 이벤트**(예: 내가 제출한 정정 요청 결과)는 조용 시간에도 즉시 발송 — 본인 요청 응답이므로.
- 디바이스 OS DnD는 **별개 레이어**로 존중 — 서버가 07시에 발송해도 OS가 차단하면 그건 사용자의 OS 설정 책임.

**권한 (D-PERM-01 연관)**

- **권한 키 신설 없음**. 개인 구독은 본인 선택이므로 D-PERM-01 매트릭스와 독립.
- RLS: `web_push_subscriptions`는 본인 행만 SELECT/INSERT/UPDATE 가능. DELETE는 cron(410 Gone 정리) 전용.

**Phase 1 목업 영향 (R3)**

- 벨 드로워 최상단(제목 바로 아래)에 **inert 예고 배너 1줄**:
  ```
  🔔 브라우저 알림은 Premium 전용 · Phase 2+ 예정 (D-NOTIF-02)
  ```
- 클릭 핸들러 없음(inert), Phase 2+에서 "알림 켜기" 버튼으로 교체.
- CSS 클래스 `.mock-notifications-push-hint`로 분리 — Phase 2+ 삭제 시 검색 용이.

**Phase 2+ 작업 백로그 (슬라이스 제안)**

1. VAPID 키 쌍 생성·환경 변수 등록 (`VAPID_PUBLIC_KEY`·`VAPID_PRIVATE_KEY`).
2. `web_push_subscriptions` 테이블 + RLS.
3. `/settings/notifications` 페이지 신설 + 카테고리 토글 UI.
4. `public/sw.js` ServiceWorker 등록 + `push`·`notificationclick` 이벤트 핸들러.
5. 드로워 맥락형 배너 → 실제 `Notification.requestPermission()` 연동.
6. 서버 워커: `notifications` INSERT → web_push 발송 (`web-push` npm 패키지 또는 Supabase Edge Function).
7. Quiet hours 지연 로직 (scheduled_at 계산).
8. 410 Gone 응답 시 `revoked_at` 업데이트 트리거.
9. 관리 대시보드: 디바이스 구독 목록 (사용자 본인 프로필에서 "이 디바이스에서 로그아웃" 유사).
10. **후속 결정 D-NOTIF-02b** — web_push 공급자 / SDK 선택 (web-push npm 패키지 · Firebase Cloud Messaging · OneSignal 등).
11. **후속 결정 D-NOTIF-02c** — γ 하이브리드(Free 중요 알림 허용) 재검토 (운영 데이터 6개월 누적 후).

**연관**

- [D-NOTIF-01](#d-notif-01--in-app-알림-센터-통합-도입) — 피드 소스, web_push는 추가 채널
- [D-EVENTS-03](#d-events-03--일정투표-알림-채널정책) — 외부 채널 과금 경계·재시도 정책 재사용, quiet hours 정합
- [D-PERM-01](#d-perm-01--클랜-권한-매트릭스-모델-도입) — 권한 키 신설 없음
- [schema.md](./schema.md) — `web_push_subscriptions` 신설, `notification_log.channel` 카탈로그 확장
- [pages/07-MainClan.md](./pages/07-MainClan.md) — 벨 드로워 예고 배너 (R3)
