# 구현 진행도 — 세션 로그

> **허브**: [TODO.md](./TODO.md) — 상태·페이즈 링크·다음 프롬프트는 허브만 보면 된다.  
> **이 파일**: 히스토리만 쌓이므로 **일상 참조 시 `@TODO.md`만** 쓰고, 세션 종료·감사 시에만 이 파일을 연다.

<!-- 새 세션을 위에 추가 (최신이 위) -->

### 2026-04-20 — D-LANDING-01~04 결정 닫기 (랜딩 4건)
- [x] **정책 확정**
  - D-LANDING-01: **잠정 채택**. 현재 헤드라인(`Archive Your History, Stay in Sync` + "추억을 기록하고 클랜을 체계적으로 관리하세요.") 유지. Phase 2+ 구현 완료·사용자 피드백 확보 후 재검토(5-Second / First-Impression Test). Phase 1 동안 랜딩 카피 변경 금지.
  - D-LANDING-02: Phase 1/2 **KR 전용**. EN/JP 버튼은 시각적 active 토글 + 클릭 시 **"준비 중" 토스트(3s)**. HTML `lang="ko"` 고정. `users.language` enum은 스키마 유지(DEFAULT `'ko'`). Phase 3+에 EN → JP 순서로 실제 활성화. Phase 3 도입 체크리스트 4종(카피/로케일/브랜드 용어/문의 폼 라벨) 문서화.
  - D-LANDING-03: 약관 3종(`/terms`·`/privacy`·`/api-tos`)은 **정적 MDX**. **`/contact`만 내부 폼** → `contact_requests` 테이블 INSERT (Server Action + Turnstile/reCAPTCHA v3 + 이메일당 24h 5회/IP당 24h 20회 rate limit + honeypot). 운영자 관리자 콘솔(Phase 2+)에서 열람·답변. 약관 버전 관리(`terms_versions`·`user_terms_agreements`)는 Phase 2+ 메모.
  - D-LANDING-04 (신설): 로그인 사용자의 `/` 진입은 **`/games` 자동 리다이렉트**. 서버 컴포넌트 `cookies()` 확인 후 `redirect()` — 미들웨어·클라이언트 JS 아닌 **SSR 리다이렉트**로 깜빡임 회피. 예외: `?from=logo` 쿼리 또는 `#features`/`#games`/`#pricing` 앵커 포함 진입은 "의도적 재방문"으로 건너뜀. 로고 링크는 shell 헤더에서 로그인 여부에 따라 `/games` vs `/`로 분기(D-SHELL 영역).
- [x] `docs/01-plan/decisions.md`
  - 표 3행(D-LANDING-01/02/03) OPEN → DECIDED + **D-LANDING-04 신규 행 추가** + 요약 풍부화(L-01은 "잠정" 표기).
  - 하단 상세 블록 4개 신규 작성(§D-LANDING-01 잠정 채택·재검토 트리거 · §D-LANDING-02 Phase 단계 매트릭스·Phase 3 체크리스트 · §D-LANDING-03 라우트 매트릭스·`/contact` 폼 스펙·스팸 방지·약관 버전 관리 메모 · §D-LANDING-04 리다이렉트 판정 플로우·SSR 구현 원칙·UX 안전장치·목업 시뮬레이션).
- [x] `docs/01-plan/schema.md`
  - `contact_requests` 테이블 신설(`category` enum·`status` enum·`ip_hash`·`user_agent`·`assigned_to`·`resolved_at`) + CHECK 제약(title ≤ 120·body 1~4000) + 인덱스(status/created_at, email/created_at) + RLS(INSERT 서비스 롤만·SELECT 본인+운영자·UPDATE 운영자만·DELETE 차단 soft delete).
  - `contact_rate_limits` 테이블 메모 추가(Phase 2+, Redis 우선 · fallback 용).
- [x] `docs/01-plan/pages/01-Landing-Page.md`
  - 상단에 D-LANDING-01~04 DECIDED 블록쿼트 4개 추가.
  - "누가 / 언제 본다" · "화면 진입 조건" 재작성(로그인 사용자는 `/games` 자동 리다이렉트, 쿼리/앵커 예외).
  - 버튼·링크 표의 언어 버튼·푸터 링크 행을 결정 내용 반영 카피로 갱신.
  - §데이터·연동 재작성(세션 가드·다국어·푸터 라우팅·스팸 방지).
  - §목업과 실제 구현의 차이에 `?simulate=logged_in` 시뮬레이션 명시.
  - §결정 필요 4개 항목 전부 삭선.
- [x] `mockup/pages/index.html`
  - 언어 버튼(`landing-lang`)에 `data-lang` · `onclick="landingSetLangMock(this)"` · EN/JP에 `title` 툴팁 추가.
  - 푸터 링크 4개에 `data-footer-link`(실제 라우트) · `title` 툴팁(Phase 2+ 구현 메모) 추가.
  - 상단 스크립트에 D-LANDING-04 시뮬레이션 IIFE 추가(`?simulate=logged_in` + `?from=logo`·앵커 예외). `landingSetLangMock` 함수 추가(EN/JP 클릭 시 3초 토스트).
- 남은 OPEN: 없음(랜딩 영역 Phase 1 범위 완료). 연관 OPEN — D-SHELL(로고 라우팅)·Phase 2+ `/contact` 실제 구현·Phase 2+ 약관 버전 관리 테이블.

---

### 2026-04-20 — D-STORE-02 · D-STORE-03 · D-ECON-03 · D-ECON-04 결정 닫기 (STORE/ECON 보조 4건)
- [x] **정책 확정**
  - D-STORE-02: Free 클랜의 Premium 카드 클릭은 **플랜 비교 모달**만 띄운다. 역할별 CTA — leader/officer는 `#subscription` 탭 이동 보조 CTA, member는 정보 표시만(요청·알림 플로우 없음). Premium 가격·혜택 테이블은 모달 내부.
  - D-STORE-03: 환불 **없음 원칙** + 시스템 오류 자동 롤백 + **운영자 재량 정정**만 예외. 자기 계정 정정 금지(`voided_by ≠ user_id` CHECK). `purchases.voided_at`·`voided_by`·`void_reason` 필드로 무효화 표시(행 삭제 금지). 모든 정정은 `coin_transactions` 반대 부호 INSERT + `correction_of` 연결. 월 정정 리포트(Phase 2+). 구매 확인 다이얼로그 고지 의무.
  - D-ECON-03: **외부 공개 순위표에서 경쟁 지표(승률·K/D·MVP) 전면 제외**. 공개 지표는 활동성·규모·매너·이벤트 참여만. 경쟁 지표는 운영진+ 내부 화면(클랜 관리·HoF·내전 히스토리)에만. `clans.moderation_status IN ('warned','hidden','deleted')` 또는 `lifecycle_status='dormant'` 클랜은 순위표 제외. HoF 외부 공개는 `clan_settings.expose_hof` 토글(기본 false).
  - D-ECON-04: 특이사항 태그는 **자동 산정 전용**(수동 태깅 금지). Phase 1 카탈로그 **13종**(`streak_lose_3/4/5`·`streak_win_3/5`·`slump`·`hot_streak`·`map_expert`·`map_rookie`·`mvp_hot`·`no_show`·`no_show_repeat`·`new_clan_week`). 본 클랜 내전만 집계. 경기 종료·밸런스 세션 생성·일일 배치 3 시점에 재계산. `match_tags` 스냅샷 테이블에 현재 유효 태그만 저장(이력 없음).
- [x] `docs/01-plan/decisions.md`
  - 표 4행(D-STORE-02 / D-STORE-03 / D-ECON-03 / D-ECON-04) OPEN → DECIDED + 요약 풍부화.
  - 하단에 상세 블록 4개 신규 작성(§D-STORE-02 역할별 CTA 매트릭스 · §D-STORE-03 예외 정책·운영 원칙·스키마 영향 · §D-ECON-03 지표 노출 매트릭스·정렬 기준 · §D-ECON-04 카탈로그·상호 배타 규칙·노출·갱신·스냅샷 스키마).
- [x] `docs/01-plan/schema.md`
  - `purchases` 3 컬럼 신설(`voided_at`·`voided_by`·`void_reason`) + all-or-nothing CHECK + 자기 정정 차단 CHECK + UPDATE RLS "정상→무효 1회 전이만" 명문화.
  - `match_tags` 테이블 신설 — PK `(user_id, clan_id, code, COALESCE(map_id, …))`, `expires_at` 인덱스, 서비스 롤 전용 RLS. D-ECON-04 스냅샷.
  - 「클랜 순위·통계 지표」 섹션 헤드에 D-ECON-03 DECIDED 블록쿼트 + **노출 정책 매트릭스**(외부 순위표 / 클랜 상세 / 클랜 관리 3열) 추가.
- [x] `docs/01-plan/pages/13-Clan-Store.md`
  - 상단에 D-STORE-02/03 DECIDED 블록쿼트 추가.
  - §Free / Premium 분기 재작성: 역할별 CTA 매트릭스.
  - §환불·되돌리기 정책 신설: 원칙·예외 1/2·UI 고지·월 리포트.
  - 결정 필요 목록에서 D-STORE-02/03 삭선.
- [x] `docs/01-plan/pages/09-BalanceMaker.md`
  - §특이사항 태그 재작성: 카탈로그 13종 표 + 노출 규칙(최대 3개·톤 우선순위) + `match_tags` 스키마 참조 + 갱신 시점 3개(경기 종료·세션 생성·일일 배치).
- [x] `docs/01-plan/pages/10-Clan-Stats.md`
  - 상단에 D-ECON-03 블록쿼트(내부 통계 화면은 경쟁 지표 허용, 외부 공개만 토글 대상).
  - HoF 설정 모달에 **외부 공개 여부** 행 추가(`clan_settings.expose_hof` 기본 false · leader 전용 Phase 2+).
- [x] `mockup/scripts/clan-mock.js`
  - `mockStorePurchaseMock` 앞단에 D-STORE-03 환불 고지 `confirm()` 추가. 미승인 시 구매 취소.
  - `mockStorePremiumInfoMock` 신설 — 역할별(body.mock-role-leader/officer/…) 분기 카피로 `alert()` 출력. D-STORE-02 플랜 비교 요약 포함.
- [x] `mockup/pages/main-clan.html` `#view-store`
  - Premium 카드(클랜 태그 글로우 / 승부예측 코인 보너스) 버튼 2개를 `disabled`에서 `mockStorePremiumInfoMock(this)` 호출로 교체, 라벨 "Premium 안내", `title` 툴팁 추가.
  - 정책 박스 하단에 D-STORE-03 환불 정책 점선 카드 신규 추가.
- **남은 OPEN** (STORE/ECON 영역 최종 정리 — 이 주제 블록은 Phase 1 범위에서 완료):
  - 경제 영역: 없음.
  - 관련: D-RANK-01(클랜 "인기" 정렬 기준)·D-STATS-01~04(HoF 권한·사후 정정·앱 이용 측정·CSV) 등은 별도 세션.

---

### 2026-04-20 — D-STORE-01 · D-ECON-01 · D-ECON-02 결정 닫기 (코인 체계 코어)
- [x] **정책 확정**
  - D-STORE-01: 개인 풀·클랜 풀 분리, **이전 API 부재**. 적립 트리거 매트릭스(내전/출석/이벤트/승부예측 → 개인 · 스크림/대진표/신규가입/Premium → 클랜) + 차감 매트릭스(개인 꾸미기·store 뱃지 → 개인 · 클랜 꾸미기·홍보 고정·대진표 개최 → 클랜). 모든 거래는 `coin_transactions` INSERT-only + `(reference_type, reference_id, sub_key)` 멱등성 키.
  - D-ECON-01: Phase 1 수치 베이스라인. 내전 출전 +10 / 승리 +20 / MVP +30, 출석 +5, 7일 연속 +30, 스크림 완료 +100, 대진표 우승 +1,000, 신규 가입자 +50/명(월 500). **일일 적립 상한** 개인 200 / 클랜 2,000(24h 롤링). 가격 목록 전량 확정(네임카드 400, 뱃지 테두리 600, store 뱃지 500/1,200, 클랜 배너 팩 1,200, 상단 고정 800, 태그 글로우 2,000, 대진표 개최 500 등). 수치는 Phase 2+에 `game_config`로 외부화.
  - D-ECON-02: 세탁 방지 4단 방어 — ① 풀 이전 API 부재 ② `coin_transactions` INSERT-only (RLS로 UPDATE/DELETE 전면 차단) ③ 1회 500 이상 클랜 풀 지출 **2-man rule**(Phase 2+) ④ 클랜장 교체 후 **72h 지출 동결**(에스크로) ⑤ 의심 패턴 자동 flag(Phase 2+) ⑥ `purchases.pool_source`·`approved_by`·`coin_transactions.correction_of`·`created_by` 감사 필드.
- [x] `docs/01-plan/decisions.md`
  - 표 3행(D-STORE-01 / D-ECON-01 / D-ECON-02) OPEN→DECIDED, 요약 풍부화.
  - 하단에 상세 블록 3개 신규 작성(§D-STORE-01·§D-ECON-01·§D-ECON-02). 각 블록에 트리거/가격/불변식/RLS/연관 문서 링크.
  - D-PROFILE-04 말미 cross-ref에 붙어 있던 "(예정)" 표기 제거하고 실링크 교체.
- [x] `docs/01-plan/schema.md`
  - `users.coin_balance`(개인 풀 캐시, `CHECK >= 0`) + 상단 결정 참조 주석 추가.
  - `clans.coin_balance`(클랜 풀 캐시) + `clans.ownership_transferred_at`(72h 에스크로용) 추가.
  - `coin_transactions` 전면 확장: `reference_type` / `reference_id` / `sub_key` / `balance_after` / `correction_of` / `created_by` + UNIQUE 멱등성 키 + `pool_type`별 NOT NULL CHECK + RLS(SELECT 본인·운영진, INSERT 서비스 롤, UPDATE/DELETE `USING(false)`).
  - `store_items` 확장: `pool_source`(`clan_deco⇒clan`, `profile_deco⇒personal` CHECK) · `is_premium_only` · `is_active` · `released_at`.
  - `purchases` 확장: `pool_source` · `price_coins`(스냅샷) · `coin_transaction_id UNIQUE` · `approved_by` + 2-man rule CHECK 메모.
  - `user_attendance` 테이블 신설: `(user_id, date)` PK + `streak` + `streak_reward_claimed`. 출석/연속 보너스의 멱등성 근거.
- [x] `docs/01-plan/pages/13-Clan-Store.md`
  - 상단에 D-STORE-01·D-ECON-01·D-ECON-02 DECIDED 블록쿼트 + 한 줄 요약에 "풀 이전 불가" 명시.
  - 데이터·연동 절 재작성: 잔액 캐시↔원장 관계, 적립 트리거 매트릭스 표(D-ECON-01 금액 포함), 차감 트리거, 세탁 방지 요약.
  - 카드 가격표를 D-ECON-01 확정 값으로 갱신(네임카드 400, 뱃지 테두리 600, 서브 라인 500, store 뱃지 일반 500·레어 1,200, 승부예측 1,500, 클랜 배너 팩 1,200, 상단 고정 800, 태그 글로우 2,000, 대진표 개최 500).
  - "결정 필요" 절에서 D-STORE-01 항목 삭선 + 구성원 클랜 풀 구매 가능 여부 결론 추가("운영진+ 전용").
- [x] `mockup/pages/main-clan.html` `#view-store`: 정책 안내 박스에 **"코인 풀 정책(D-STORE-01 · D-ECON-02)"** 점선 카드 추가(풀 이전 불가·운영진+ 전용·2-man rule·72h 에스크로). 잔액 pill에 `title` 툴팁으로 각 풀의 적립·소비 범위 설명.
- 남은 OPEN: D-STORE-02(Premium 업그레이드 동선) · D-STORE-03(환불·되돌리기) · D-ECON-03(클랜 순위표 민감 지표) · D-ECON-04(특이사항 태그 기준).

### 2026-04-20 — D-PROFILE-03 정정 (sparse → compact, dense-from-front)
- [x] **재결정**: 같은 날 sparse로 확정했던 뱃지 스트립을 **compact(dense-from-front)**으로 정정. 사용자 피드백 "해제되면 아래 뱃지들이 윗 순번부터 자리를 채우고 아래를 비우는 형식". 빈 슬롯은 항상 뒤쪽에 몰리며, 해제 시 뒤 항목이 한 칸씩 앞으로 shift.
- [x] `mockup/scripts/app.js`
  - `mockBadgeEnsureSparseArray` → `mockBadgeEnsureCompactArray`로 이름·의미 변경. 중간 null·중복·초과 길이를 자동으로 앞쪽 연속 + 뒤쪽 null로 정규화.
  - `mockBadgeCaseTogglePick` 재작성: 이미 픽된 id는 좌측 shift + 마지막 슬롯 null, 없으면 첫 null 위치(=현재 채워진 개수)에 append, 5개 꽉 차면 alert 차단.
  - `mockBadgeCaseGetPicks`·`mockBadgeCaseInitDefaultPicks` 내부 호출도 ensureCompactArray로 갱신.
- [x] `docs/01-plan/decisions.md` D-PROFILE-03: 표 요약을 "compact 픽(dense-from-front · 해제 시 뒤 항목 앞으로 shift)"으로 교체. 상세 블록에 정정 사유 블록쿼트 추가, 상태 구조·불변식·Compact 규칙(추가/해제/표시/운영 매핑) 표 재작성. 운영 시 slot_index 재할당 트랜잭션 + 빈 슬롯 DELETE 정책 명시.
- [x] `docs/01-plan/schema.md` `user_badge_picks`: `badge_id NOT NULL`로 조임(빈 슬롯은 행을 만들지 않음), `slot_index 0..n-1 연속` 제약 설명, 해제 시 slot_index 재할당 트랜잭션 예시 추가.
- [x] `docs/01-plan/pages/14-Profile-Customization.md`: 모달 스트립 동기화 절 · 데이터·연동 뱃지 픽 블록 · 동기화 셀렉터 표 · 결정 필요 D-PROFILE-03 삭선 문구를 전부 compact 표현으로 교체.
- 영향 범위: 이미 저장된 localStorage 상태(sparse로 저장되었을 수 있음)는 다음 로드 시 `mockBadgeEnsureCompactArray`가 자동 정규화해 그대로 호환. 운영 데이터베이스는 아직 없으므로 영향 없음.

### 2026-04-20 — D-PROFILE-01~04 결정 닫기 (네임플레이트/뱃지 동기화·가입 신청 대기·해금 출처)
- [x] **정책 확정**
  - D-PROFILE-01: 네임플레이트 동기화 — 상태 키 `clansync-mock-nameplate-state-v1` / 이벤트 `clansync:nameplate:changed` / 셀렉터 `[data-nameplate-preview="{game}"]` + 본인 구독용 `[data-nameplate-self]`. **같은 탭 내부만** 실시간 반영(다른 탭은 새 진입·새로고침 시 localStorage에서 재로드).
  - D-PROFILE-02: 가입 신청 대기 목록 — `clan_join_requests`(D-CLAN-02) 단일 소스. pending 항시 노출, approved/rejected는 7일 후 자동 숨김, canceled/expired는 목록 비노출. **취소는 pending에서만**(resolved_by='self').
  - D-PROFILE-03: 뱃지 스트립 동기화 — **sparse 5슬롯**(null 허용, 해제 시 뒷 항목 shift 없음). 상태 키 `clansync-mock-badge-picks-v1` / 이벤트 `clansync:badge:picks:changed` / 셀렉터 `[data-badge-strip="{game}"]` + `[data-badge-strip-slot="{0..4}"]` + 본인 `[data-badge-strip-self]`.
  - D-PROFILE-04: 뱃지 해금 출처 — `unlock_source enum('achievement','event','store')` + `unlock_condition jsonb` + `linked_id`. **store는 개인 코인만**(클랜 코인 불가). 카테고리 × 출처는 독립 축.
- [x] `docs/01-plan/decisions.md`: D-PROFILE-01~04 표 4행 OPEN→DECIDED 갱신, 하단에 상세 블록 4개 추가(셀렉터·이벤트·스키마 영향·store 제약 등). 각 블록에 스키마·페이지 문서 링크 연결.
- [x] `docs/01-plan/schema.md`
  - 관계도에 `User ──< UserNameplateSelection >── NameplateOption`, `User ──< UserNameplateInventory`, `User ──< UserBadgePick >── Badge`, `User ──< UserBadgeUnlock >── Badge` 4줄 추가.
  - 신규: `nameplate_options`(카탈로그·4카테고리·unlock_source), `user_nameplate_inventory`(PK `(user_id, option_id)`), `user_nameplate_selections`(PK `(user_id, game_id, category)` · 서버 재검증 메모).
  - 신규: `badges`(unlock_source·unlock_condition jsonb·`CHECK (store ⇒ coin_type='personal')`), `user_badge_unlocks`(PK `(user_id, badge_id)`), `user_badge_picks`(PK `(user_id, game_id, slot_index)` · slot 0~4 · null 허용).
- [x] `docs/01-plan/pages/14-Profile-Customization.md`
  - 스트립 동기화 섹션에 sparse + localStorage 키 + 이벤트명 + 셀렉터 표 명시, 네임플레이트 적용 범위도 동일 포맷으로 재작성.
  - 가입 신청 대기 목록을 D-PROFILE-02 확정본으로 재작성(데이터 출처·상태 뱃지·취소 액션·게임당 pending 1건 제약).
  - "데이터·연동" 섹션을 뱃지 픽 / 카탈로그·해금 / 네임플레이트 / 동기화 셀렉터 4블록으로 재편, 셀렉터 표 추가.
  - "목업과 실제 구현의 차이"에 같은 탭 내부만 실시간·다른 탭 미전파·`unlock_source`별 툴팁 카피 차이 명시.
  - "결정 필요" D-PROFILE-01~04 4항목 삭선 + 결정 링크.
  - "구현 참고"에 새 함수(`mockBadgeRestoreFromStorage`·`mockBadgeSaveToStorage`·`mockBadgeDispatchChange`·`mockBadgeApplyToStrips`·네임플레이트 3종·`mockBindExternalProfileSync`)·localStorage 키·이벤트명·셀렉터 총정리 추가.
- [x] `mockup/scripts/app.js`
  - 상수 추가: `MOCK_BADGE_PICKS_STORAGE_KEY`·`MOCK_NAMEPLATE_STATE_STORAGE_KEY`·`MOCK_BADGE_CHANGE_EVENT`·`MOCK_NAMEPLATE_CHANGE_EVENT`·`MOCK_BADGE_META`(외부 스트립 lookup용, 17개 뱃지 메타).
  - 뱃지 픽을 **sparse 배열(고정 길이 5)**로 전환: `mockBadgeEnsureSparseArray`·`mockBadgeCaseGetPicks` localStorage hydration·`mockBadgeCaseInitDefaultPicks` hydrated 가드·`mockBadgeCaseTogglePick` null 할당(뒷 항목 shift 없음).
  - 저장·전파·외부 스트립: `mockBadgeRestoreFromStorage`·`mockBadgeSaveToStorage`·`mockBadgeDispatchChange`·`mockBadgeApplyToStrips`(컨테이너 `[data-badge-strip]` 내부 슬롯 `[data-badge-strip-slot]`에 메타 렌더·빈 슬롯 `mock-badge-strip-slot--empty` 클래스).
  - 네임플레이트: `mockNameplateRestoreFromStorage`·`mockNameplateSaveToStorage`·`mockNameplateDispatchChange`·`mockNameplateGetState` defaults merge hydration. `mockNameplateCaseSelect` 말미에 save + dispatch.
  - DOMContentLoaded: `mockNameplateGetState()`·`mockBadgeCaseGetPicks()`로 hydrate, 양쪽 프리뷰·스트립 초기 적용, `mockBindExternalProfileSync()` 이벤트 구독 바인딩.
  - window export에 새 함수(`mockBadgeApplyToStrips`·`mockBadgeCaseGetPicks`·`mockNameplateGetState`·`mockBindExternalProfileSync`) 추가.
- [x] `mockup/pages/profile.html`
  - OW/VAL 네임플레이트 프리뷰에 `data-nameplate-self` 속성 부여.
  - OW/VAL 뱃지 스트립 컨테이너에 `data-badge-strip="{game}" data-badge-strip-self`, 각 5슬롯에 `data-badge-strip-slot="0..4"` 부여.
  - 가입 신청 대기 목록(OW): Thunder Squad·Running** 2행을 `data-mock-join-request` 식별자 + `.mock-profile-pending-badge` 뱃지 + 취소 버튼 구조로 재작성. VAL 탭은 빈 목록 + "대기 중인 신청이 없습니다." 빈 상태로 재작성.
  - 하단 `<style>` 블록 신설: `.mock-profile-pending-badge`(pending/approved/rejected 색), `.mock-profile-pending-cancel`(hover 붉은 강조), `.mock-badge-strip-slot--empty`.
  - 하단 `<script>` 블록 신설: `mockProfileCancelJoinRequest(id, clanName)`·`mockProfileReadCanceled`·`mockProfileWriteCanceled`·`mockProfileUpdateEmptyState`. sessionStorage `clansync-mock-profile-canceled-v1`에 취소 ID 저장. 재진입 시 저장된 ID의 `<li>` 제거 + 빈 상태 토글.
- [ ] **Phase 2+ 이관**: MainClan·main-game·BalanceMaker 본인 슬롯에 `data-nameplate-self`·`data-badge-strip` 부여 — 현행 데모가 모든 플레이어 프리뷰를 공유하는 구조라 "본인만 분기"가 의미를 갖지 않음. 서버 연동 시 함께 적용.
- 연관 결정: D-CLAN-02(가입 신청 상태 머신), D-STORE-01(스토어 구성 — store 뱃지 구매 진입점), D-ECON-01(코인 체계 — 개인 코인 차감).

### 2026-04-20 — D-AUTH-03~07 결정 닫기 (비번 정책·재설정·Discord scope·잠금·자동로그인)
- [x] **정책 확정**
  - D-AUTH-03: 비번 **strong 강제**(영+숫+특, 8~72자). 출생연도 `currentYear-10` 상한 **유지**(만 10세 미만 차단). 만 14세 미만 보호자 동의 UI는 **Phase 2+ 이관**, Phase 1은 안내 카피만.
  - D-AUTH-04: Supabase 재설정 메일 + 토큰 **1시간** 유효 + 1회용. rate limit 60초·24h 5회. 이메일 존재 여부 비노출 중립 카피. 성공 시 전 세션 revoke.
  - D-AUTH-05: scope **`identify email`** 만. 길드·메시지 권한 요청 안 함. 클랜↔Discord 알림 연동은 별도 Bot OAuth로 분리(D-EVENTS-03).
  - D-AUTH-06: **IP+email 5회 연속 실패 → 15분 잠금**. 잠금 중 시도는 카운트 증가 없음, 카피는 자격 불일치와 통합. 성공 시 리셋. `auth_failed_logins` 신설.
  - D-AUTH-07: refresh token **OFF 24h / ON 30d**(슬라이딩 연장). `users.auto_login`은 사용자 기본 체크박스 값 저장. 비번 변경·로그아웃·정지 시 즉시 전 세션 revoke.
- [x] `docs/01-plan/decisions.md`: D-AUTH-03~07 표 5행 OPEN→DECIDED 갱신, 하단에 상세 블록 5개 추가(비번 정규식·연령 UI Phase 2+·재설정 플로우·scope 표·잠금 쿼리 개념·세션 TTL 표). 각 블록에 영향 문서·스키마 섹션 연결.
- [x] `docs/01-plan/schema.md`
  - `users` 테이블 재정의: `email` citext로 변경, `birth_year int NOT NULL`·`gender enum`·`password_updated_at`·`minor_guardian_consent_at`·`discord_user_id UNIQUE`·`discord_linked_at` 컬럼 추가. 상단에 D-AUTH-03·07 결정 요지 블록쿼트.
  - 신규: `auth_failed_logins` 테이블(이메일·IP·UA·reason enum·인덱스 2종·90일 TTL·RLS 메모·잠금 판정 쿼리 예시).
  - 신규: `password_resets` 테이블(토큰 해시·expires·used_at·IP·UA·UNIQUE·rate limit·서버 경유 RLS).
  - 관계도에 `User ──< AuthFailedLogin`·`User ──< PasswordReset` 두 줄 추가.
- [x] `docs/01-plan/pages/02-Sign-In.md`
  - "사용자 흐름" 부가 동선 3줄에 각 결정 요지 한 줄씩 추가.
  - "버튼·입력·링크" 표의 자동 로그인·비밀번호 찾기·Discord 행을 결정 요지 포함으로 재작성.
  - "상태별 화면" 표의 자격 불일치·반복 실패 잠금 행을 통합 카피·타이밍 공격 방지 메모 포함으로 갱신.
  - "데이터·연동" 섹션을 refresh token TTL·감사 테이블·password_resets·Discord scope 기준으로 재작성.
  - "목업과 실제 구현의 차이"에 alert 시뮬레이션 함수 3종 설명 추가.
  - "결정 필요" D-AUTH-04~07 4항목 삭선 + 결정 링크.
  - "구현 참고"에 `showForgotAlert`·`showDiscordScopeAlert`·`#signin-error-slot`·`#autoLogin` tooltip 추가.
- [x] `docs/01-plan/pages/03-Sign-Up.md`
  - "화면 구성" 블록 다이어그램에 출생연도·비번·만 14세 미만 안내 캡션 D-AUTH-03 주석 추가.
  - "버튼·입력·링크" 표의 출생 연도·비밀번호 행을 strong 정규식·Phase 2+ 동의 UI 메모 포함으로 재작성 + "만 14세 미만 안내" 행 신설.
  - "데이터·연동" 섹션에 `users` 컬럼 4종·`minor_guardian_consent_at` 공란 정책 명시.
  - "목업과 실제 구현의 차이"에 `handleSignUp` 정규식 검증·`#signup-minor-notice` 동적 토글 설명 추가.
  - "결정 필요" D-AUTH-03·01 삭선 + 결정 링크.
  - "구현 참고"에 `validatePasswordStrong`·`updateMinorNotice`·`#signup-minor-notice` 추가.
- [x] `mockup/pages/sign-in.html`
  - 좌측 후기 서명 오타 수정(`Pheonix` → `Phoenix`).
  - `.error-msg` 슬롯(`#signin-error-slot`·`#signin-error-text`)을 마크업에 실제로 붙이고 `.error-msg[hidden]` 규칙 추가.
  - 자동 로그인 토글 래퍼에 D-AUTH-07 tooltip(title) + `showAutoLoginInfo()` 1회 alert 바인딩.
  - "비밀번호 찾기" → `showForgotAlert()`(D-AUTH-04 요지 7줄 alert).
  - Discord 버튼 → `showDiscordScopeAlert()`(scope 4줄 alert).
  - `handleSignIn`에 D-AUTH-06 잠금 시뮬레이션: `SIGNIN_MOCK_FAIL_EMAIL_PREFIX='lock@'`로 시작하는 이메일만 실패 취급, sessionStorage `clansync-mock-signin-fails-v1`에 `(email→{count,lockedUntil})` 저장, 5회 누적 시 15분 잠금. 그 외 이메일은 기존 데모 클릭스루 유지(games.html).
- [x] `mockup/pages/sign-up.html`
  - `.error-msg`·`.info-msg` CSS 블록 신설(error는 sign-in과 동일, info는 주황 톤).
  - 폼 상단에 통합 에러 슬롯(`#signup-error-slot`) 추가, 에러 카피 중앙집중.
  - 출생 연도 select `onchange="updateMinorNotice(this.value)"` 바인딩 + 만 14세 미만 안내 캡션(`#signup-minor-notice`) 신설.
  - 비밀번호 input placeholder "영문+숫자+특수문자 8자 이상" → "영문+숫자+특수문자, 8~72자"로 교체, 하단 `.input-hint`에 D-AUTH-03 안내 문구 추가.
  - `handleSignUp`을 **실제 검증 함수**로 재작성: email·nickname 2자·admin·birthYear·gender·`validatePasswordStrong`·terms 순서로 inline 검증, 실패 시 `signupShowError()`로 상단 슬롯 노출.
  - `SIGNUP_PWD_STRONG_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])[\S]{8,72}$/`·`validatePasswordStrong(v)`·`updateMinorNotice(yearStr)` 신설. 만 14세 미만 판정은 `y > currentYear - 14`.
- 연관 결정: D-AUTH-01(게임 선택 라우팅 — 가입 직후 동작 고정 확정), D-EVENTS-03(Discord Bot OAuth 분리 지점), D-CLAN-03(계정 라이프사이클 — 정지 시 세션 revoke 트리거).

### 2026-04-20 — D-MANAGE-01~04 결정 닫기 (구독권한·M점수 토글·부계정 공개 범위·업로드 제약)
- [x] **정책 확정**
  - D-MANAGE-01: officer도 금액·일시 열람 가능, 영수증 상세·결제 수단·환불·플랜 변경은 leader 전용.
  - D-MANAGE-02: 역할 변경·officer 강퇴·leader 위임·휴면 일괄 강퇴는 leader 전용. **M점수 편집은 `clan_settings.allow_officer_edit_mscore` 토글 기반**(기본 false = leader만, true = officer도 허용). member 강퇴·가입 승인·거절은 officer 허용.
  - D-MANAGE-03: 부계정은 자기신고 유지. **조회 범위는 `clan_settings.alt_accounts_visibility` 토글**(기본 `officers` / 옵션 `clan_members`). 프로필 추가 시 공개 범위 고지·동의 필수. 증빙 API는 Phase 2+ 재검토.
  - D-MANAGE-04: 배너 3MB / 아이콘 2MB. MIME `image/jpeg·png·webp`만. 애니메이션 거부. 서버가 썸네일·변환본 자동 생성. 업로드 권한 officer+.
- [x] `docs/01-plan/decisions.md`: D-MANAGE-01~04 표 4행 OPEN→DECIDED 갱신, 하단에 상세 블록 4개 추가(권한 매트릭스·UI 규칙·토글 설정 UI·감사 로그·업로드 검증 순서 등). 각 블록에 스키마 영향 섹션으로 `clan_settings` / `clan_media` / `user_alt_accounts` 테이블 연결.
- [x] `docs/01-plan/schema.md`
  - 신규: `user_alt_accounts` 테이블(자기신고 부계정, 공개 범위 RLS 연동), `clan_settings` 테이블(클랜별 운영 권한 토글 `allow_officer_edit_mscore` · `alt_accounts_visibility`), `clan_media` 테이블(배너·아이콘 자산 메타·원본 private/변환 public 분리).
  - 수정: `clans` 테이블에 `banner_url`·`icon_url` 컬럼 명시(D-MANAGE-04 최신 변환본 포인터).
- [x] `docs/01-plan/gating-matrix.md` §7 "클랜 관리" 표 전면 재작성(운영 권한 설정 카드 열람/변경 분리, member/officer 강퇴 구분, 휴면 일괄 강퇴 leader 전용, M점수 토글 행, 부계정 조회 토글 행, 구독결제 leader 전용 세부 액션 행). 부록 A의 `.mock-leader-only` 클래스를 "예약" → "실사용"으로 승격, 사용 위치 나열.
- [x] `docs/01-plan/pages/12-Clan-Manage.md`
  - 개요 탭: "운영 권한 설정" 카드 신설 섹션(토글 1·라디오 1, leader 전용 편집, officer 읽기 전용 규칙).
  - 배너·아이콘 카드: D-MANAGE-04 제약 안내 추가. 업로드 모달 behaviour 섹션에 MIME·용량·거부 규칙 명시.
  - 가입 요청·구성원 탭: D-MANAGE-02 권한 매트릭스 확정 표로 교체(`.mock-leader-only` 대상 액션 명시).
  - 구독결제 탭: D-MANAGE-01 권한 매트릭스 + officer 비활성 버튼·툴팁 규칙 추가.
  - "권한·구독에 따른 차이" 표에 신규 액션 10여 개 추가. "결정 필요"에서 D-MANAGE-01~04 삭선 + 결정 링크.
  - 구현 참고에 `window.mockClanSettingsGet/Set`, `window.mockClanImageValidate`, `.mock-leader-only` 클래스, 저장 키 `clansync-mock-clan-settings-v1` 추가.
- [x] `docs/01-plan/pages/14-Profile-Customization.md`: "게임별 탭 — 부계정 (D-MANAGE-03)" 섹션 신설. 자기신고 방식·추가 모달 고지 문구·공개 범위 매트릭스(officers / clan_members)·삭제 정책·신고 경로(D-CLAN-03 흡수) 정리. "결정 필요"에 D-MANAGE-03 삭선 추가.
- [x] `mockup/pages/main-clan.html`
  - CSS: `.mock-leader-only`(officer/member 세션에서 숨김), `.mock-leader-only-disabled`(숨김 아닌 비활성·툴팁 — 구독결제 탭용), `.mock-leader-only-note` 추가.
  - 개요 탭에 "운영 권한 설정" 카드 HTML 신설 — M점수 토글 체크박스 + 부계정 공개 범위 라디오 2개 + leader 전용 안내 캡션.
  - 배너·아이콘 카드: D-MANAGE-04 제약 안내 `<p>` 추가. 업로드 모달에 form error 영역(`#mock-clan-image-modal-error`)·spec hint(`#mock-clan-image-modal-spec`)·MIME 제한 accept 속성 추가.
  - 구독결제 탭 "목업 결제 1건 추가", "Premium", "Free" 버튼에 `.mock-leader-only-disabled` + "클랜장만 변경할 수 있습니다" title 부착. 하단에 D-MANAGE-01 고지 `<p>` 추가.
  - 휴면 섹션 일괄 강퇴 버튼에 `.mock-leader-only` + 옆에 "클랜장만" 안내 캡션.
  - 개인 상세 모달의 부계정 그룹에 공개 범위 라벨(`#mock-mmgr-detail-sub-visibility-label`)과 운영 권한 설정 탐색 안내 추가.
- [x] `mockup/scripts/clan-mock.js`
  - 신규: `MOCK_CLAN_MEDIA_MIME_ALLOWED`, `MOCK_CLAN_MEDIA_LIMITS`(배너 3MB 4:1 · 아이콘 2MB 1:1), `window.mockClanImageValidate(file, kind)` — MIME·용량 실제 검증.
  - `window.mockClanImageModalOpen` / `mockClanImageFileChange`: open 시 kind별 spec hint 동적 업데이트, file change 시 validate → 실패면 error 영역 노출·input 초기화·preview 해제, 성공만 pending dataUrl에 대입.
  - 신규: 클랜 운영 권한 설정 유틸 4개 — `window.mockClanSettingsGet`, `window.mockClanSettingsSet(partial)`, `window.mockClanSettingsSyncUi()`, `window.mockClanSettingsOnToggleMscore`, `window.mockClanSettingsOnAltVisibility`. 저장 키 `clansync-mock-clan-settings-v1`, 기본값 `{allowOfficerEditMscore:false, altAccountsVisibility:'officers'}`. 변경은 leader만, officer/member가 조작 시 값 원복 + alert. "클랜 전체 공개" 선택 시 confirm 모달로 한 단계 더 게이팅.
  - 신규: `window.mockMmgrSyncMscoreGate()` — 개인 상세 모달이 열려 있을 때 역할·운영권한 설정 조합으로 역할 select / M점수 input 3개의 `disabled` + `title` 동적 제어.
  - `applyRoleBodyClass()` / `mockManageSetTab('overview')` / `mockManageMemberDetailOpen(id)` 종료 시 `mockClanSettingsSyncUi()` 자동 호출 — 역할·탭·모달 진입 모든 경로에서 UI 동기화.
  - `mockMmgrOnClanRoleChange` / `mockMmgrOnMScoreChange`에 서버 권한 검증 시뮬레이션 추가 — 조건 미충족 시 alert + `mockMmgrSyncMscoreGate()` 원복.
- [x] `mockup/pages/profile.html` · `mockup/partials/player-profile-modal.html`: 부계정 추가 버튼 4건의 `alert()` 문구에 D-MANAGE-03 공개 범위 고지(자기신고 · 클랜 설정에 따른 공개 범위 · 운영 권한 설정 위치) 추가.
- 연관 결정: D-CLAN-07(휴면 일괄 강퇴 권한 귀속처), D-CLAN-02(가입 요청 권한 재확인), D-PROFILE-02(부계정 섹션이 해당 탭의 자매 섹션).

### 2026-04-20 — "매치 결과 카드" 개념 영구 폐기 + 경기 종료 결과 팝업 스펙 명시
- [x] `decisions.md` §D-SHELL-03 제외·이월 항목 수정: "매치 결과 카드 재검토 여지" → **영구 도입 안 함** 확정. 결과 열람은 결과 입력 완료 시점의 **1회 팝업**(승자·내 적중 여부·배당 코인)으로만 처리하고 그 외 "미확인" 상태를 만들지 않음 명시. 09-BalanceMaker.md 해당 섹션으로 교차 링크.
- [x] `pages/09-BalanceMaker.md`: 사이드바 알림 점 블록의 "매치 결과 카드 미확인 제외(재검토)" 문구 → "매치 결과 기반 알림 구조적 부재"로 강화. **경기 종료 · 결과 팝업** 섹션 신설(대상자 매트릭스 3행: 비출전 예측 참여자 / 출전자 / 관전 구성원, 승부예측 활성·비활성 분기, 세션별 1회·무효 시 원복·사후 정정은 내전 히스토리 위임 규칙). 플로우 번호 7("경기 종료")에 결과 팝업 참조 한 줄 추가.
- [x] `decisions.md`: D-SHELL-03 OPEN→DECIDED 표 행 갱신 + 하단 상세 블록 신설. 원칙("정보성은 진입 시 자동 clear, 행동성은 처리로만 clear"), 대상·트리거·clear 매트릭스(6뷰), 운영↔Phase 1 매핑 표, UI 규격, 제외·이월 항목(매치 결과 카드·dash·모바일 드로어) 명시. `#dash`는 허브 뷰 중복 방지로 알림 점 없음 확정. `#balance` 트리거에서 "매치 결과 미확인" 제거(매치 결과 카드 미설계 이유).
- [x] `pages/07-MainClan.md`: "사이드바 항목" 표의 알림 점 열을 D-SHELL-03 트리거 문구로 확장(6행 전체 갱신), `#manage` 행에 행동성·자동 집계 명시. "알림 점 성격 구분" 블록쿼트(정보성/행동성) 신설. 상태별 화면 표의 "알림 점" 행 운영 트리거 링크로 교체. "결정 필요"에서 D-SHELL-03 삭선 + 결정 링크. 구현 참고에 `#sidebar-notify-manage` 추가.
- [x] `pages/09-BalanceMaker.md`: "사이드바 알림 점" 섹션 신설(진행 중 내전 세션 수, 뷰 진입 시 clear, 구성원·운영진 공통, 매치 결과 카드 미확인 제외 명시).
- [x] `pages/11-Clan-Events.md`: "사이드바 알림 점" 섹션 신설((a) 24h 내 RSVP 미응답 + (b) 진행 중 투표 미응답 합산, 신규 이벤트 등록은 RSVP 미응답으로 자연 흡수).
- [x] `pages/12-Clan-Manage.md`: `#manage` 알림 점을 "행동성"으로 분류 명시 — 뷰 진입 clear 없음, `mockManageRequestsRender`·`mockManageMembersRender` 종료 시 자동 refresh만 일어남.
- [x] `mockup/scripts/clan-mock.js`: `mockSidebarNotifyRefresh` 함수 상단에 D-SHELL-03 6뷰 규칙 주석 블록 추가(`#dash/#balance/#events/#manage/#stats/#store`).

### 2026-04-20 — 가입 요청 배지 시인성 개선 + 사이드바 "클랜 관리" N 알림 점 연동
- [x] `mockup/pages/main-clan.html`: 공용 빨간 카운트 배지 `.mock-notify-pill` CSS 신설(사이드바 `.sidebar-notify-dot`와 동일한 #ef4444·화이트 텍스트·원형, 탭/카드 라벨 inline 정렬용). 가입 요청 탭 배지(`#mock-manage-requests-badge`)와 카드 헤더 카운트(`#mock-manage-requests-count`)의 `badge badge-muted` → `mock-notify-pill`로 교체하고 0건 기본 hidden. 사이드바 "클랜 관리" 메뉴 항목에 `sidebar-item--notify` + `#sidebar-notify-manage` `.sidebar-notify-dot` 추가.
- [x] `mockup/scripts/clan-mock.js`: `mockSidebarNotifyRefresh`에 manage 자동 집계 분기 추가 — `#mock-manage-requests-tbody` `<tr>` 수 + `mockManageMembersStats().newDormant` 합을 `#sidebar-notify-manage`에 표시하고 0이면 hidden(디버그 토글 시 "N"). `mockManageRequestsRender`는 카운트가 0이면 탭/카드 배지를 `hidden`+`aria-hidden`으로 숨기고 렌더 종료 시 `mockSidebarNotifyRefresh()` 호출. `mockManageMembersRender`도 종료 시 동일 호출해 휴면 진입 반영.
- [x] `docs/01-plan/pages/12-Clan-Manage.md`: "가입 요청 탭" 배지와 사이드바 알림 점 동작(`요청 대기 수 + 신규 휴면 진입 수 ≥ 1이면 N 표시`) 명시. 구현 참고에 `mockSidebarNotifyRefresh`의 manage 집계 로직과 `mockManageRequestsRender`·`mockManageMembersRender` 종료 시 동기 호출 규약 추가.

### 2026-04-20 — 클랜 관리 탭 분리(가입 요청/구성원) + 이모지 → SVG 아이콘 통일
- [x] `mockup/pages/main-clan.html`: `#view-manage` 탭을 `overview / requests / members / subscribe` 4개로 확장(기존 3개). 탭 라벨 "구성원 관리" → "구성원"으로 축약, `requests` 탭 라벨에 대기 카운트 배지(`#mock-manage-requests-badge`) 부착. 기존 members 패널에 붙어 있던 가입 요청 카드를 새 `data-manage-panel="requests"`로 이동하고 `신청일` 컬럼 + `#mock-manage-requests-tbody`·`#mock-manage-requests-count` 식별자 추가. 페이지 부제 문구 갱신.
- [x] `mockup/pages/main-clan.html`: 이모지 → `.ui-ic` SVG(stroke/currentColor). 휴면 섹션 제목 배지 `😴 → 달 아이콘`, 개인 상세 모달 제목 `✎ → 연필 아이콘`, 활성도 필터 select 옵션에서 🟢/🟡 제거(텍스트만 유지). `.mock-activity-badge`·`.mock-manage-summary-pill`·`.mock-manage-dormant-alert-icon` CSS에 ui-ic 스케일·색상 보정 추가.
- [x] `mockup/scripts/clan-mock.js`: `mockManageSetTab`에 `requests` 케이스 추가, `clanGo('manage')` 초기 진입 시 `mockManageRequestsRender` 호출 추가. `mockActivityBadgeHtml`을 SVG 기반으로 리팩터(MOCK_ACTIVITY_ICON.active/inactive/dormant 3종 · 체크 서클 / 시계 / 달). 요약 배너 pill의 🟢/🟡/😴/👥 → SVG 아이콘, 알림 배너 ⚠ → 경고 삼각 SVG(`MOCK_ICON_ALERT`). 가입 요청 카드와 탭 배지 카운트를 tbody `<tr>` 개수로 동기화하는 `window.mockManageRequestsRender` 신설. 휴면 빈 상태 메시지의 `🎉` 제거.
- [x] `docs/01-plan/pages/12-Clan-Manage.md`: 한 줄 요약·사용자 흐름·화면 구성·탭 번호 체계를 4탭 구조로 재정리(탭 2 가입 요청 / 탭 3 구성원 / 탭 4 구독결제). 권한 매트릭스에 "가입 요청 탭 진입"·"구성원 탭 진입·검색·활성도 필터"·"휴면 섹션 일괄 강퇴" 행 추가. 활성도 분류 표의 "배지" 컬럼 → "아이콘"(체크 서클/시계/달)으로 표기 전환 + "아이콘 체계" 블록쿼트 신설(모든 상태 아이콘을 `.ui-ic` SVG로). 구현 참고에 `mockManageSetTab`의 `requests` 케이스와 `mockManageRequestsRender` 명시.

### 2026-04-20 — D-CLAN-07 멤버 관리 페이지 반영 (활성도 요약·필터·휴면 섹션·일괄 강퇴)
- [x] `mockup/scripts/clan-mock.js`: `MOCK_MANAGE_MEMBERS` 12명에 `daysSince` 필드 추가(분포: 활성 5 / 비활성 4 / 휴면 3, `m6`에 `dormantNewlyEntered`). `mockClassifyActivity(daysSince)` + 임계 상수(30/60) + `MOCK_CLAN_MAX_MEMBERS=30`. 필터 분할(`mockManageMembersFilterList` = 활성+비활성, `mockManageMembersDormantList` = 휴면). 렌더 3분할(`mockManageMembersRenderSummary`·`...RenderActive`·`...RenderDormant`). 활성도 필터 select(`mockManageMembersOnActivityFilter`), 휴면 섹션 토글·페이저·체크박스·전체선택(페이지 한정)·일괄 강퇴(`mockManageMembersBulkKickDormant` — localStorage `clansync-mock-manage-kicked-dormant-v1`), 알림 배너 닫기(`mockManageMembersDismissDormantAlert` — sessionStorage `clansync-mock-manage-dormant-banner-dismissed-v1`), 초기화 헬퍼(`mockManageMembersResetKickedDormant`). `mockManageSetTab`에 members 전환 시 자동 render 호출 추가.
- [x] `mockup/pages/main-clan.html`: `#view-manage` members 패널 확장 — 요약 배너 컨테이너(`#mock-manage-members-summary`), 활성도 필터 select, 테이블 헤더에 "활성도" 컬럼, 휴면 섹션(`<section id="mock-manage-dormant-section">` 접힘 카드 + 체크박스·전체선택·선택 카운트·일괄 강퇴 버튼·페이저). CSS 블록 추가(`.mock-manage-members-summary`·`.mock-manage-summary-pill`·`.mock-manage-dormant-alert`·`.mock-activity-badge`·`.mock-manage-dormant-section` 등).
- [x] `docs/01-plan/pages/12-Clan-Manage.md`: 탭 2 "구성원 관리" 영역 D-CLAN-07 재구성(요약 배너 4 pill·활성도 필터·휴면 섹션 세부·일괄 강퇴 범위=현재 페이지). "활성도 분류" 표 신설. "목업과 실제 구현의 차이"에 `daysSince` 필드·localStorage 키 2종 설명. "결정 필요"에서 D-CLAN-07 줄긋기. "구현 참고"에 새 전역 함수·상수·스토리지 키 일괄 등재.

### 2026-04-20 — D-CLAN-03·06 결정 닫기 + D-CLAN-07 신설 (라이프사이클·인원·멤버 활성도)
- [x] `decisions.md`: D-CLAN-03·06 OPEN→DECIDED + D-CLAN-07 신설. 표 행 갱신 + 하단 풀 명세 3개. D-CLAN-03(정책 위반/휴면/부실 3분류 + 단계별 제재 + 신고 자동 임계 폐기, 운영진 직접 판단), D-CLAN-06(200 유지·Free·Premium 동일·인원 차별화 없음), D-CLAN-07(활성<30d/비활성 30~60d/휴면 60d+, 광범위 활동, 휴면 한도 외, 자동 탈퇴 없음·일괄 수동 탈퇴).
- [x] `schema.md`: 관계도 `User ──< ClanReport >── Clan` 추가. `clans` 테이블 — `lifecycle_status enum`·`moderation_status enum`·`last_activity_at` 신설, `max_members` CHECK 200, `is_active`를 도출 컬럼화. `clan_members` 테이블 — `last_activity_at` 신설 + 인덱스 권장. `clan_reports` 테이블 신설(reason enum·status enum·1인 1클랜 1회 유니크). "이번달 활성 유저 비율" 분모 정의 갱신(휴면 제외).
- [x] `pages/06-ClanAuth.md`: 만들기 폼 max_members 안내 카피 + 경고 박스 D-CLAN-03 정합. "클랜 라이프사이클 — 목록 노출 정책" 표 신설(5×3 노출 매트릭스), "신고 흐름" 섹션 신설. "결정 필요" 7개 결정 모두 줄긋기. "목업과 실제 구현의 차이" 섹션 갱신.
- [x] `mockup/pages/clan-auth.html`: `CLANS`에 `ghost` 휴면 시연 데이터 추가, `getFilteredClanKeys`에서 `dormant`·`deleted`·`hidden` 제외 필터 추가. 만들기 폼 max_members 안내 카피 D-CLAN-06·07 권장 정합. 경고 박스 카피 D-CLAN-03 단계별 제재·자동 휴면 명시.

### 2026-04-20 — D-CLAN-01·02·04·05 결정 닫기 (가입 라이프사이클 + 만들기 폼 정합)
- [x] `decisions.md`: D-CLAN-01·02·04·05 OPEN→DECIDED. 하단 DECIDED 절에 6칸 분량 풀 명세(분리 테이블 머신·단일 신청 정책·폼↔DB 정합·해제 동작).
- [x] `schema.md`: `clans` 테이블 갱신 — `name varchar(24)`, `style enum`, `tier_range text[]`(8티어, 챌린저 포함), `min_birth_year int` 추가, `age_range` 제거. `clan_join_requests` 신설(부분 유니크 인덱스로 게임당 단일 신청 강제). 관계도에 `User ──< ClanJoinRequest >── Clan` 추가.
- [x] `pages/06-ClanAuth.md`: 사용자 흐름·만들기 폼 표·상태 머신·"결정 필요" 줄긋기·구현 참고 함수 목록을 결정에 맞춰 정합.
- [x] `mockup/pages/clan-auth.html`: 챌린저 칩 추가(필터·만들기), 출생연도 select 신설, 자유 태그 입력 칸 + `addCustomTag/validateCustomTag`, `selectSingleChip` 버그 수정(해제 허용), `submitJoin`/`cancelPendingApplication`이 `sessionStorage.clansync_clan_apply` 시뮬레이션, `openJoinFromDrawer`에 단일 신청 검증 모달, `applyClanAuthBootstrap()`이 `?game=`·`?pending=1` 흡수해 `pendingView` 자동 노출, `filterClans`+`getFilteredClanKeys`+`applyFilters`로 클라이언트 검색·필터 통합, `handleCreateClan`이 폼 전체 payload(11개 필드)를 `sessionStorage.clansync_create_clan_draft`에 저장.

### 2026-04-20 — D-AUTH-01·02 결정 닫기 (라우팅 매트릭스 + 게임별 OAuth)
- [x] `decisions.md`: D-AUTH-01 / D-AUTH-02 OPEN→DECIDED. 하단 DECIDED 절에 6칸 매트릭스 + 게임 슬러그×제공자 매핑 표 풀 명세.
- [x] `pages.md`: 미들웨어 흐름 다이어그램에 매트릭스 4 케이스 + `next` 쿼리 반영. "라우팅 매트릭스" 박스 신설(요약표). 가드 체인 표 #04·#05·#06 갱신(`?reauth=1`·`pendingView`·`next` 명시).
- [x] `pages/04-Main_GameSelect.md` / `pages/05-GameAuth.md` / `pages/06-ClanAuth.md`: 사용자 흐름·진입 조건·상태별 화면·구현 참고에서 매트릭스 6칸·`reauth=1`·`GAME_AUTH_PROVIDERS` 맞춤. "결정 필요" 항목 줄긋기 처리.
- [x] `mockup/pages/games.html`: 카드를 `data-game/auth/clan-status/clan-id/clan-name`로 6칸 시뮬레이션 + 단일 라우터 `routeFromGameCard()` 도입. 인라인 상수 핫픽스(OW→main-clan 직행) 제거.
- [x] `mockup/pages/game-auth.html`: `GAME_AUTH_PROVIDERS` 매핑(overwatch/valorant/lol/pubg/__fallback__) + `applyGameAuthConfig()` 부트스트랩, `?reauth=1` 안내 배지, lol/pubg CTA 비활성, 폴백 시 "← 게임 선택으로" 버튼.

### 2026-04-20 — 토큰 절약 메타 정비 + 아이콘 팩 git 정리 + 목업 보완 피드백
- [x] 아이콘: `heroicons` 서브모듈 deinit/제거, `.gitmodules` 정리. ionicons + heroicons 둘 다 `<pack>/in-use/` 화이트리스트 패턴(`.gitignore`)으로 전환. 풀팩은 디스크 보존, README 4장으로 정책 안내.
- [x] 룰 슬림화: `project-context.mdc`의 `@docs/...` 9개 자동 첨부 제거(평문 경로화) + stale `IMPLEMENTATION_PROGRESS_*.md` 4건 제거. `session-handoff`/`git-nano-commit` 압축. `AGENTS.md`에 응답 스타일 8개 항목 추가(선언/재진술/회고/추측 읽기 금지 등).
- [x] `/todo` 커맨드: 없는 `TODO_Phase2.md` 직접 참조 → "현재 페이즈 진행도"로 일반화.
- [x] 목업 보완 피드백 카탈로그화: A(즉시 코드 보완 가능 7건), B(결정 필요 8건), C(에셋 교체 3건), D(구조적 한계). `decisions.md` OPEN 38건 기준. 다음 세션 후보 3개로 좁힘.

- [x] `TODO_Phase1.md`: 종료(2026-03-28)·S00 Phase 2 항목을 Phase2 문서로 이관·요약표 S00 완료
- [x] `TODO_Phase2.md`: 참조표·종료조건·체크 A~E·슬라이스 매핑·`pages.md` 전 경로+MainClan 하위·메모
- [x] 허브·`FEATURE_INDEX`·`README`·`project-context`·`todo`·`session-handoff`: 현재 단계 Phase 2

### 2026-03-28 — Phase 2 권장 프롬프트: schema·허브 갱신·과제 한 문장
- [x] `TODO.md` Phase 2 블록: `schema.md` 포함, 완료 시 허브 마지막 갱신·Phase2·세션 로그 명시

### 2026-03-28 — Phase 1 권장 프롬프트: 슬라이스 `@` 경로 정리
- [x] `slice-XX-*.md` 대신 `slice-NN-....md`로 실제 파일명 치환 안내 + 체크·요약표 **진행 중**·BACKLOG 명시

### 2026-03-28 — 허브 권장 프롬프트 정합 (Phase 1 기본 + Phase 2 보조)
- [x] `TODO.md` 다음 세션 블록: Phase 1 복사용을 기본으로 두고, Phase 2 착수용은 두 번째 블록으로 분리
- [x] `.cursor/commands/todo.md` §4 절차를 위 형식에 맞게 정리

### 2026-03-28 — 세션 로그 파일 분리
- [x] `TODO_LOG.md` 신설, `TODO.md`에서 히스토리 제거(토큰 절약)

### 2026-03-28 — 진행도 문서 페이즈 분리
- [x] `TODO_Phase1.md`·`TODO_Phase2.md` 신설, 본 파일은 허브·세션 로그 전용

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
- [x] `MOCK_BADGE_NAMEPLATE_MAX`·프로필 상단 안내·`nameplate-case-modal` 푸터, `pages/09-BalanceMaker.md`·`pages.md`·`slice-08` 갱신

### 2026-03-28 — S07 MainGame 홍보·LFG·필터·플레이스홀더
- [x] `main-game.html`: LFG 필터 초기화 `#sec-lfg .lfg-filter-panel` 수정, `navTo`/에셋 BACKLOG 주석, `.mock-main-game-asset-hint` 안내
- [x] `pages.md` MainGame 목업 요약, `BACKLOG.md`·`slice-07` 수용 기준, 진행도·요약표 S07 **완료**

### 2026-03-28 — S03 MainClan 쉘 문서·플랜 경계 정합
- [x] `non-page/clan-main-static-mockup-plan.md` §2.1 해시·뷰 매핑, §3 권한·§3.1 플랜·§8 현재 네비 정책 반영
- [x] `slice-03` 수용 기준 완료, 진행도·요약표 S03 폴리시 열 **완료**

### 2026-03-28 — S06 이벤트·관리·스토어 문서·목업 정합
- [x] `pages.md`에 통계·관리·스토어 섹션 추가, `non-page/clan-main-static-mockup-plan.md` §4.3–4.6 목업 ID·권한 반영
- [x] 이벤트 대진표: Premium 탭 배지 + Free 플랜 시 본문 숨김(`mock-hide-on-free`)·안내 문구
- [x] `slice-06` 수용 기준·진행도·요약표

### 2026-03-28 — S05 클랜 통계 문서·목업 정합
- [x] `pages/10-Clan-Stats.md` §5·§9 재작성: 탭 4개(요약·명예의 전당·경기 기록·앱 이용)·권한·HoF vs 경기 기록 구분
- [x] `slice-05` 수용 기준 반영, `main-clan.html`/`clan-mock.js` 주석 정리

### 2026-03-28 — S04 밸런스 문서·목업 정합
- [x] `pages/09-BalanceMaker.md`에 워크플로 탭 라벨·허브 `?plan=`·`mockClanCurrentPlan` 설명 보강
- [x] `main-clan.html` 밸런스 도움말 `data-tip`에서 § 제거(프로젝트 UI 가이드)
- [x] S04 진행도·`slice-04` 수용 기준(문서 순서) 반영

### 2026-03-28 — /todo 동기화 (재실행)
- `FEATURE_INDEX`·`BACKLOG`·`mockup/pages/*.html`·`clan-mock.js`·`app.js` 경로 대조
- S04 `pages/09-BalanceMaker.md`·S05 `pages/10-Clan-Stats.md`·S01 `pages.md` 등 **폴리시·정합** 미완 항목 재확인 (체크리스트 변경 없음)
- 빠른 요약표·다음 세션 권장 프롬프트 갱신

### 2026-03-28 — /todo 커맨드로 진행도 동기화
- [x] S05·S06 목업 존재 여부 재확인 후 체크·요약표 반영
- [x] `.cursor/commands/todo.md` 추가 (재실행 시 동일 절차)
- [x] 다음 세션 권장 프롬프트 섹션 갱신

### 2026-03-28 — 문서·용어·슬라이스 정리
- [x] PRD 동결·`FEATURE_INDEX`·`slices/`·`BACKLOG` 정리
- [x] Free/Premium 용어 통일 (규칙·목업)
- [x] 본 진행도 문서(`TODO.md`) 신설

---

### 템플릿 (복사 후 사용)

```
### YYYY-MM-DD — (세션 제목)
- [ ] (이번 세션에서 끝낸 작업 1)
- [ ] (작업 2)
```
