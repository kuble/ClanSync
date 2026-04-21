# ClanSync 데이터 스키마

> Supabase (PostgreSQL) 기반. RLS 모든 테이블 적용 필수.

---

## 핵심 엔티티 관계도

```
User ──< UserGameProfile >── Game
User ──< ClanMember >── Clan
User ──< ClanJoinRequest >── Clan         -- 가입 신청 (D-CLAN-02)
User ──< ClanReport >── Clan              -- 신고 (D-CLAN-03)
User ──< AuthFailedLogin                  -- 로그인 실패 감사 (D-AUTH-06, email FK 없음·citext 문자열)
User ──< PasswordReset                    -- 비밀번호 재설정 토큰 (D-AUTH-04)
User ──< UserNameplateSelection >── NameplateOption  -- 네임플레이트 선택 (D-PROFILE-01)
User ──< UserNameplateInventory  >── NameplateOption -- 사용자 보유 옵션 (D-PROFILE-01)
User ──< UserBadgePick >── Badge          -- 뱃지 스트립 픽 (D-PROFILE-03, slot 0..4)
User ──< UserBadgeUnlock >── Badge        -- 해금된 뱃지 (D-PROFILE-04)
Clan ──< Match ──< MatchPlayer
Match ──< MatchResult
Clan ──< ClanEvent
Clan >── Subscription
Clan ──< BoardPost
ClanMember ──< PlayerScore
ClanMember ──< Medal
ClanMember ──< CoinTransaction
```

---

## 테이블 정의

### users (Supabase Auth 연동)
> **D-AUTH-03** (DECIDED 2026-04-20) — 비밀번호 strong 정책·최저 가입 연령(만 10세)·만 14세 미만 보호자 동의(Phase 2+). [decisions.md §D-AUTH-03](./decisions.md#d-auth-03--비밀번호-정책과-최저-가입-연령).  
> **D-AUTH-07** (DECIDED 2026-04-20) — `auto_login` 은 사용자 **기본 체크박스 값**. 실제 세션 TTL은 로그인 요청 페이로드 기준(OFF 24h / ON 30d). [§D-AUTH-07](./decisions.md#d-auth-07--자동-로그인-유지-기간).
> **D-STORE-01 / D-ECON-01** (DECIDED 2026-04-20) — `coin_balance`는 **개인 풀** 잔액 캐시. Ground truth는 `coin_transactions(pool_type='personal')` 원장 합계. [decisions.md §D-STORE-01](./decisions.md#d-store-01--코인-적립차감-트리거-매트릭스).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | auth.users 연동 |
| nickname | varchar(20) UNIQUE NOT NULL | 닉네임 |
| email | citext UNIQUE NOT NULL | 이메일 (대소문자 무시 매칭) |
| language | enum('ko','en','ja') | 언어 설정 |
| birth_year | int NOT NULL | 출생연도(가입 폼). 상한 `currentYear-10`, 하한 1950 (D-AUTH-03) |
| gender | enum('male','female','undisclosed') NOT NULL | 성별 세그먼트 (D-AUTH-03) |
| auto_login | boolean DEFAULT false | 자동 로그인 **기본 선택값** (D-AUTH-07) |
| password_updated_at | timestamptz | 마지막 비밀번호 변경 시각 (재설정 성공 시 갱신, 세션 전체 revoke 트리거) |
| minor_guardian_consent_at | timestamptz NULL | 만 14세 미만 가입자의 법정대리인 동의 시각. Phase 2+ UI 도입 전까지 NULL (D-AUTH-03) |
| discord_user_id | varchar(32) UNIQUE NULL | Discord 연동 ID (`identify` scope, D-AUTH-05) |
| discord_linked_at | timestamptz NULL | Discord 최초 연동 시각 (D-AUTH-05) |
| **coin_balance** | int NOT NULL DEFAULT 0 CHECK (coin_balance >= 0) | **개인 풀** 잔액 캐시 (D-STORE-01). 원장(`coin_transactions`) 합계로 정기 리컨실. 음수 불가 |
| created_at | timestamptz | 가입일 |
| updated_at | timestamptz | 수정일 |

**제약·RLS 메모**

- 가입 시점에 `birth_year`가 `currentYear - 14` 초과(=만 14세 미만)면 `minor_guardian_consent_at` 입력 UI가 Phase 2+에서 선행되어야 한다. Phase 1 범위에서는 안내 카피만 노출하고 가입 자체는 허용.
- `discord_user_id`는 UNIQUE — 한 디스코드 계정이 여러 ClanSync 계정과 연결 불가. 재연결 시 기존 연결 해제 필요.
- 서버는 비밀번호 제출 시 클라이언트와 동일한 정규식으로 재검증한다(D-AUTH-03).


### auth_failed_logins (로그인 실패 감사)
> **D-AUTH-06** (DECIDED 2026-04-20) — IP+email 5회 연속 실패 → 15분 잠금. 성공 시 카운터 리셋. [decisions.md §D-AUTH-06](./decisions.md#d-auth-06--로그인-실패-잠금-정책).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| email | citext NOT NULL | 시도된 이메일 (가입 유무 무관, user_id FK 아님) |
| ip | inet NOT NULL | 요청 IP |
| user_agent | text | |
| reason | enum('invalid_password','unknown_email','locked','oauth_denied') | 실패 사유 |
| attempted_at | timestamptz NOT NULL DEFAULT now() | |

**인덱스·정책**

- `CREATE INDEX ON auth_failed_logins (email, ip, attempted_at DESC)` — 잠금 판정 쿼리용.
- `CREATE INDEX ON auth_failed_logins (attempted_at)` — 90일 TTL 배치 삭제용.
- 90일 경과 이력은 주기적으로 삭제(Supabase cron 또는 `pg_cron`).
- RLS: 일반 사용자 SELECT 금지. 관리자 role에만 공개.
- 잠금 판정 쿼리 (개념):
  ```
  SELECT count(*) FROM auth_failed_logins
  WHERE email = $1 AND ip = $2
    AND attempted_at > (
      SELECT COALESCE(max(attempted_at), '-infinity')
      FROM auth_successful_logins WHERE email = $1 AND ip = $2
    )
    AND attempted_at > now() - interval '15 minutes';
  ```

### password_resets (비밀번호 재설정 토큰)
> **D-AUTH-04** (DECIDED 2026-04-20) — 토큰 1시간 유효, 1회용, 성공 시 전 세션 revoke. [decisions.md §D-AUTH-04](./decisions.md#d-auth-04--비밀번호-찾기-플로우).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users | 재설정 대상 사용자 |
| token_hash | text NOT NULL | 토큰의 SHA-256 해시(평문은 메일에만) |
| expires_at | timestamptz NOT NULL | 발급 + 1시간 |
| used_at | timestamptz NULL | 사용 즉시 기록 → 재사용 차단 |
| requested_ip | inet | 발급 요청 IP |
| user_agent | text | |
| created_at | timestamptz NOT NULL DEFAULT now() | |

**제약·rate limit·RLS 메모**

- `UNIQUE(token_hash)`.
- 같은 `user_id`에 대해 60초 내 재발급 차단(애플리케이션 레벨). 24시간 5회 한도.
- 토큰 검증 순서: `used_at IS NULL` · `expires_at > now()` 모두 성립 시에만 유효.
- 재설정 성공 직후 해당 사용자의 모든 `auth.sessions`를 revoke + `users.password_updated_at = now()`.
- RLS: 본인조차 SELECT 불가 — 서버 Edge Function 경유만.

### games
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| slug | varchar UNIQUE | 'overwatch', 'valorant' 등 |
| name_ko | varchar | 한국어 게임명 |
| name_en | varchar | 영어 게임명 |
| name_ja | varchar | 일본어 게임명 |
| is_active | boolean | 서비스 활성 여부 |
| thumbnail_url | varchar | 게임 썸네일 |

### user_game_profiles (게임 인증)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users | |
| game_id | uuid FK → games | |
| game_uid | varchar NOT NULL | 게임 내 고유 ID (배틀태그 등) |
| is_verified | boolean DEFAULT false | 인증 완료 여부 |
| verified_at | timestamptz | 인증 시각 |
| UNIQUE(user_id, game_id) | | 게임당 1계정 |

### user_alt_accounts (부계정 — 자기신고)
> **D-MANAGE-03** (DECIDED 2026-04-20) — 자기신고 기반 부계정. 조회 범위는 `clan_settings.alt_accounts_visibility`로 제어. [decisions.md §D-MANAGE-03](./decisions.md#d-manage-03--부계정-조회-정책과-공개-범위-토글).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users | 주계정 소유자 |
| game_id | uuid FK → games | 같은 게임 내 부계정 (주계정이 인증된 게임에 한정) |
| alt_nick | varchar(32) NOT NULL | 부계정 닉네임(배틀태그 등). 증빙 API 없음 — 자기신고 |
| note | text | 사용자 메모(선택) |
| created_at | timestamptz | |

**제약조건·RLS 메모**

- 주계정이 `user_game_profiles`에 `is_verified = true`로 등록된 `game_id`에 대해서만 INSERT 허용 (애플리케이션 레벨 또는 RLS `WITH CHECK`).
- 동일 `(user_id, game_id, alt_nick)` 중복 금지: `UNIQUE(user_id, game_id, alt_nick)`.
- 본인: 본인 행 SELECT/INSERT/DELETE 허용.
- 같은 클랜 구성원·운영진의 조회 권한은 `clan_settings.alt_accounts_visibility` 값에 따라 뷰/RLS 분기:
  - `officers` (기본): 대상 사용자와 **같은 클랜의 `role IN ('leader','officer')`** 만 SELECT.
  - `clan_members`: 대상 사용자와 **같은 클랜의 `role IN ('leader','officer','member')` + `status='active'`** 만 SELECT.
- 비소속·타 클랜: SELECT 차단.

### clans
> **D-CLAN-04** (DECIDED 2026-04-20) — 폼·DB 정합. [decisions.md §D-CLAN-04](./decisions.md#d-clan-04--클랜-만들기-폼-payload-스키마-정합).
> **D-CLAN-03** (DECIDED 2026-04-20) — 라이프사이클·검토 상태. [decisions.md §D-CLAN-03](./decisions.md#d-clan-03--클랜-라이프사이클--정책-위반·휴면·부실-처리).
> **D-CLAN-06** (DECIDED 2026-04-20) — 인원 200 유지, Free·Premium 동일. [decisions.md §D-CLAN-06](./decisions.md#d-clan-06--인원-상한-200-유지-premium-인원-차별화-없음).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| game_id | uuid FK → games | |
| name | varchar(24) NOT NULL | 클랜명 (D-CLAN-04: 폼 maxlength와 정합 위해 30→24) |
| description | text | 클랜 소개 (선택) |
| rules | text | 클랜 규칙 (선택) |
| style | enum('social','casual','tryhard','pro') NULL | 지향 — 친목/즐겜/빡겜/프로. NULL = 미설정 (D-CLAN-05 해제 허용) |
| tier_range | text[] DEFAULT '{}' | 모집 티어 — `'bronze' \| 'silver' \| 'gold' \| 'plat' \| 'diamond' \| 'master' \| 'gm' \| 'challenger'` 8값 중 다중. 빈 배열 = 무관 |
| min_birth_year | int NULL | 가입 가능 출생연도 하한. 예: `1995`이면 1995년 또는 그 이전 출생자만 가입. NULL = 무관 |
| tags | text[] DEFAULT '{}' | 추천 태그(PRESET_TAGS) + 클랜 자유 태그. 합산 최대 5개 |
| gender_policy | enum('all','male','female') | |
| max_members | int DEFAULT 30 CHECK (max_members BETWEEN 2 AND 200) | D-CLAN-06: Free·Premium 동일 200 한도 |
| discord_url | varchar | (선택) |
| kakao_url | varchar | (선택) |
| **banner_url** | varchar NULL | **D-MANAGE-04**: 최신 배너 변환본 CDN URL. 업로드 시 `clan_media`에 기록하고 이 컬럼을 갱신 |
| **icon_url** | varchar NULL | **D-MANAGE-04**: 최신 아이콘 변환본 CDN URL (256px 대표). 상세 해상도는 `clan_media` 참조 |
| **lifecycle_status** | enum('active','dormant','stale','deleted') DEFAULT 'active' | **D-CLAN-03**: 자동 휴리스틱이 갱신. `dormant`·`deleted`는 모든 사용자 화면에서 제외, `stale`은 표시(클랜장에만 자동 삭제 D-7 알림) |
| **moderation_status** | enum('clean','reported','warned','hidden','deleted') DEFAULT 'clean' | **D-CLAN-03**: 정책 위반 단계별 제재. `reported`는 사용자 미노출(운영진 큐), `warned`부터 가입 신청 차단, `hidden`은 모든 화면 제외 |
| **last_activity_at** | timestamptz | **D-CLAN-03**: 멤버 누구라도 활동 시 갱신. 휴면 진입 판정용 (모든 멤버의 활동이 60일+ 전이면 휴면). `MAX(clan_members.last_activity_at)` 캐시 |
| is_active | boolean DEFAULT true GENERATED ALWAYS AS (lifecycle_status = 'active' AND moderation_status NOT IN ('hidden','deleted')) STORED | 사용자 화면 노출 가능 여부의 도출 컬럼 (편의용) |
| **coin_balance** | int NOT NULL DEFAULT 0 CHECK (coin_balance >= 0) | **클랜 풀** 잔액 캐시 (D-STORE-01). 원장(`coin_transactions` WHERE `pool_type='clan'`) 합계로 정기 리컨실. 음수 불가 |
| **ownership_transferred_at** | timestamptz NULL | **D-ECON-02** 클랜장 소유권 이전 시각. 이후 72h 동안 클랜 풀 **지출 동결**(에스크로) |
| created_at | timestamptz | |

**자유 태그 검증 룰** (Phase 1)

- 1~12자, 한글·영문·숫자·공백만 허용 (특수문자·이모지 금지)
- 합산 5개 한도 (PRESET_TAGS 추천 칩과 자유 태그가 같은 한도 공유)

### clan_settings (클랜별 운영 권한 토글)
> **D-MANAGE-02 / D-MANAGE-03** (DECIDED 2026-04-20) → **D-PERM-01 흡수** (DECIDED 2026-04-21) — 클랜별 권한 토글이 **권한 매트릭스 모델**(`permissions jsonb`)로 일반화됨. 기존 boolean·text 컬럼은 Phase 2+에 jsonb로 마이그레이션 후 deprecated 예정. [decisions.md §D-PERM-01](./decisions.md#d-perm-01--클랜-권한-매트릭스-모델-도입).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| clan_id | uuid PK FK → clans | 1:1 — 클랜 생성 시 DEFAULT 로우 자동 생성 |
| **permissions** | jsonb NOT NULL DEFAULT `'{}'::jsonb` | **D-PERM-01 권한 매트릭스**. 키 = 권한 키(`set_hof_rules` 등 21종), 값 = `text[]` 허용 역할 배열(예: `["leader","officer"]`). **부재 키는 코드 상수 `CLAN_PERMISSION_DEFAULTS` 적용** → 카탈로그 추가 시 마이그레이션 불필요. 잠긴 권한 5개(`manage_subscription`/`delegate_leader`/`kick_officer`/`bulk_kick_dormant`/`confirm_scrim`)는 jsonb에 들어가도 코드/SQL 가드가 default를 강제. |
| ~~allow_officer_edit_mscore~~ | boolean NOT NULL DEFAULT **false** | **DEPRECATED** (D-PERM-01 흡수) — Phase 2+에 `permissions.edit_mscore` jsonb로 마이그레이션 후 컬럼 DROP. 그때까지 호환 컬럼으로 유지. |
| ~~alt_accounts_visibility~~ | text NOT NULL DEFAULT **'officers'** CHECK (alt_accounts_visibility IN ('officers','clan_members')) | **DEPRECATED** (D-PERM-01 흡수) — Phase 2+에 `permissions.view_alt_accounts` jsonb로 마이그레이션 후 컬럼 DROP. **새 default = `["leader","officer","member"]`**(D-PERM-01에서 멤버까지 확장). 마이그레이션 시 기존 `'officers'` → `["leader","officer"]`, `'clan_members'` → `["leader","officer","member"]`. |
| updated_at | timestamptz | |
| updated_by | uuid FK → users NULL | 마지막 변경자 (감사용) |

**`permissions` jsonb 형태**

```json
{
  "edit_mscore":         ["leader", "officer"],
  "view_alt_accounts":   ["leader", "officer", "member"],
  "view_monthly_stats":  ["leader", "officer", "member"]
}
```

- 부재 키 = 코드 상수 default 적용 → DB에는 클랜이 변경한 키만 저장.
- 21개 권한 키 카탈로그·default·잠금 여부는 [decisions.md §D-PERM-01 §권한 키 카탈로그](./decisions.md#d-perm-01--클랜-권한-매트릭스-모델-도입) 참조.
- 코드 상수: `CLAN_PERMISSION_CATALOG` (`mockup/scripts/clan-mock.js`, Phase 2+ 백엔드는 동일 상수를 SQL 함수 `default_permission_for(text)`로 표현).

**RLS 메모**

- SELECT: 같은 클랜 소속 모든 활성 멤버에게 허용 (UI에 현재 정책을 표시해야 하므로).
- UPDATE: `role = 'leader'` 인 자기 클랜 멤버만 허용. **잠긴 권한 키에 대한 변경은 트리거에서 무시 + 경고**(코드 가드 우회 시도 방어).

**가드 함수 (Phase 2+ — D-PERM-01)**

- `has_clan_permission(clan_id uuid, user_id uuid, perm text) RETURNS boolean` — 모든 권한 체크 진입점. 잠긴 권한은 SQL 안에서 하드코딩 가드, 일반 권한은 `permissions` jsonb 우선 + 부재 시 default.

**감사 로그**

- 토글 변경은 `clan_member_audit_log`에 `action='clan_settings.update'`, `before`/`after` JSONB로 기록 (Phase 2 상세 설계).
- D-PERM-01 잠긴 권한 변경 시도(코드 가드 우회)는 별도 `action='clan_settings.locked_permission_attempt'` 로 기록.

### clan_media (배너·아이콘 자산)
> **D-MANAGE-04** (DECIDED 2026-04-20) — 업로드 제약·자동 변환 규칙. [decisions.md §D-MANAGE-04](./decisions.md#d-manage-04--클랜-배너아이콘-업로드-제약).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_id | uuid FK → clans | |
| media_type | enum('banner','icon') | |
| mime_type | text | `image/jpeg` · `image/png` · `image/webp` 만 허용 (서버 검증) |
| byte_size | int | 최종 저장본(변환 후) 바이트 — 원본은 `original_key` 기반 별도 버킷에 30일 보관 |
| width | int | 변환 후 가로(px) |
| height | int | 변환 후 세로(px) |
| storage_key | text | 변환본 키 (CDN public) |
| original_key | text | 원본 private 키 — 30일 후 자동 삭제 |
| uploaded_by | uuid FK → users | 업로드 수행 운영진+ |
| uploaded_at | timestamptz | |

**제약·정책**

- 업로드 용량: 배너 ≤ **3MB**, 아이콘 ≤ **2MB** (원본 기준). 초과 시 `413 PAYLOAD_TOO_LARGE`.
- 허용 해상도: 배너 1200×300 ~ 3200×800 (4:1 고정), 아이콘 256×256 ~ 1024×1024 (1:1 고정).
- 애니메이션 이미지(GIF·APNG·WebP 애니) 거부.
- 서버 자동 변환: 배너 `1600×400.webp` + 썸네일 `400×100.webp`, 아이콘 `64.webp`·`128.webp`·`256.webp` 3단계.
- `clans.banner_url`·`clans.icon_url` 은 최신 변환본의 CDN URL을 가리키도록 업데이트 (기존 레코드는 보존 — 롤백용).
- 업로드 권한: `role IN ('leader','officer')`.

### clan_join_requests
> **D-CLAN-02** (DECIDED 2026-04-20) — 가입 신청 라이프사이클을 `clan_members`와 분리. 자세한 명세는 [decisions.md §D-CLAN-02](./decisions.md#d-clan-02--가입-신청-상태-머신과-중복정책).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_id | uuid FK → clans | |
| user_id | uuid FK → users | |
| game_id | uuid FK → games | 단일 신청 정책 검증용 (clan.game_id와 중복이지만 부분 유니크 인덱스용) |
| status | enum('pending','approved','rejected','canceled') | 머신: pending → approved/rejected/canceled |
| applied_at | timestamptz | 신청 시각 |
| resolved_at | timestamptz NULL | approved/rejected/canceled 시각 |
| resolved_by | uuid FK → users NULL | 처리자 (사용자 자가 취소 시 = self, 클랜장 처리 시 = 클랜장) |
| message | text | 자기소개 (가입 모달 textarea 내용) |
| reject_reason | text NULL | 거절 사유 (선택) |

**제약조건**
- `UNIQUE INDEX uq_active_request ON clan_join_requests (user_id, game_id) WHERE status = 'pending';` — 게임당 단일 활성 신청을 DB 레벨에서 강제
- 거절·취소 후 즉시 재신청 가능 (쿨다운 0)
- 승인 트랜잭션: `status = 'approved'` UPDATE + `clan_members` INSERT (status='active', role='member')

**RLS 메모**
- 본인 행: SELECT/UPDATE(취소만) 허용
- 클랜장·운영진: 자기 클랜의 행 SELECT/UPDATE(승인·거절) 허용
- 그 외: 차단

### clan_members
> **D-CLAN-07** (DECIDED 2026-04-20) — 멤버 활성도 분류용 `last_activity_at` 추가. [decisions.md §D-CLAN-07](./decisions.md#d-clan-07--클랜-멤버-활성도-분류와-휴면-멤버-처리).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_id | uuid FK → clans | |
| user_id | uuid FK → users | |
| role | enum('leader','officer','member') | 권한 |
| status | enum('pending','active','left','banned') | 가입 상태 |
| joined_at | timestamptz | 가입 승인일 |
| last_participated_at | timestamptz | 최근 매치 참여일 (`match_players` INSERT 시점) |
| **last_activity_at** | timestamptz | **D-CLAN-07**: 광범위 활동(로그인, 내전 참여, 게시글·댓글, 운영진 액션) 중 어느 하나라도 발생 시 NOW(). 활성도 분류 도출 기준 |
| UNIQUE(clan_id, user_id) | | |

**활성도 분류 (도출, DB 저장 안 함)**

`last_activity_at` 기준 (D-CLAN-07):

| 분류 | 조건 |
|------|------|
| `active` | `last_activity_at >= NOW() - INTERVAL '30 days'` |
| `inactive` | `NOW() - INTERVAL '60 days' <= last_activity_at < NOW() - INTERVAL '30 days'` |
| `dormant` | `last_activity_at < NOW() - INTERVAL '60 days'` |

**인덱스 권장**

- `clan_members (clan_id, last_activity_at DESC)` — 활성도 그룹 카운트 쿼리 최적화
- `clan_members (user_id)` — 사용자별 소속 클랜 조회

**휴면 멤버 정책 (D-CLAN-07)**

- 휴면 멤버는 클랜 인원 한도(`clans.max_members`, 기본 200)에 카운트되지 않는다 — `active + inactive` 만 카운트.
- 자동 탈퇴 없음 — 클랜장이 멤버 관리 페이지에서 체크박스로 일괄 수동 탈퇴 (`status='left'`로 마킹, 행 보존).
- 휴면 진입 시 클랜장에게 인앱 알림. Premium 클랜은 이메일 추가.
- 휴면 멤버가 어떤 활동이든 1건 발생 시 자동 활성 복귀 (`last_activity_at` 갱신 → 분류 자동 변경).

### clan_reports (신고)
> **D-CLAN-03** (DECIDED 2026-04-20) — 사용자 신고 → 운영진 큐. 자동 임계 없음, 운영진 직접 판단. [decisions.md §D-CLAN-03](./decisions.md#d-clan-03--클랜-라이프사이클--정책-위반·휴면·부실-처리).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_id | uuid FK → clans | 신고 대상 클랜 |
| reporter_id | uuid FK → users | 신고자 |
| game_id | uuid FK → games | 신고자가 인증된 게임 (자격 검증용 — 동일 게임 사용자만) |
| reason | enum('fake','abuse','harassment','spam','illegal','other') | 신고 사유 카테고리 |
| detail | text | 자유 서술 (선택) |
| status | enum('pending','valid','invalid','duplicate') DEFAULT 'pending' | 운영진 판정 상태 |
| reviewed_at | timestamptz NULL | 운영진 처리 시각 |
| reviewed_by | uuid FK → users NULL | 운영진 |
| review_note | text NULL | 운영진 메모 |
| created_at | timestamptz | 신고 시각 |

**제약조건**

- `UNIQUE INDEX uq_report_one_per_user_per_clan ON clan_reports (clan_id, reporter_id);` — 1인 1클랜 1회만 신고 (D-CLAN-03)
- `CHECK (reporter_id != clan owner)` — 자기 클랜 신고 불가는 애플리케이션 레벨에서 검증

**신고자 자격 (애플리케이션 레벨)**

- INSERT 직전: `EXISTS (SELECT 1 FROM user_game_profiles WHERE user_id = reporter_id AND game_id = clan_reports.game_id AND is_verified = true)` 검증
- INSERT 직전: `EXISTS (SELECT 1 FROM clans WHERE id = clan_reports.clan_id AND game_id = clan_reports.game_id)` 검증 (같은 게임의 클랜 신고만)
- 누적 3회 `status='invalid'` 판정 시 신고 자격 30일 박탈 (애플리케이션 레벨, 별도 `user_report_bans` 테이블 또는 `users.report_banned_until timestamptz`)

**RLS 메모**

- 신고자 본인: SELECT 본인 행만 허용
- 운영진: 모든 행 SELECT/UPDATE 허용
- 클랜장: 자기 클랜 신고 SELECT 차단 (어뷰징·보복 방지)

**운영진 처리 흐름**

1. `pending` → 운영진 검토 → `valid` (정책 위반 인정) / `invalid` (기각, 악의 신고) / `duplicate` (이미 처리된 사안)
2. `valid` 판정 시 클랜의 `moderation_status` 단계 전환 (clean → reported → warned → hidden → deleted)

### subscriptions
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_id | uuid FK → clans UNIQUE | |
| tier | enum('free','pro') DEFAULT 'free' | |
| started_at | timestamptz | |
| expires_at | timestamptz | null = 무료 |

### matches (내전/경기)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_id | uuid FK → clans | |
| game_id | uuid FK → games | |
| map_id | uuid FK → maps | null = 미지정 |
| match_type | enum('intra','scrim','event') | 내전/스크림/이벤트 |
| status | enum('draft','active','finished') | |
| played_at | timestamptz | 경기 시각(절대시각). **집계일**: KST 기준 **당일 06:00 ~ 익일 06:00(미포함)** 을 하나의 «당일»로 본다(새벽 내전도 전날 집계일에 붙을 수 있음). 일간 통계·아카이브·밸런스 화면의 날짜 라벨은 이 규칙으로 **백엔드/API가 도출**한 값을 쓰고, 클라이언트는 **자정 기준으로 날짜를 재계산하지 않는다**. 구현: `(played_at AT TIME ZONE 'Asia/Seoul')` 기반 함수 또는 생성 컬럼 `ledger_date` 등 |
| created_by | uuid FK → users | 생성한 운영진 |
| created_at | timestamptz | |

### match_players
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| match_id | uuid FK → matches | |
| user_id | uuid FK → users | |
| team | smallint | 1 or 2 |
| role | enum('tank','dps','support') | 포지션 |
| manual_score | numeric(3,1) | -5.0 ~ 5.0 수동 점수 |
| auto_score | numeric(3,1) | -5.0 ~ 5.0 자동 점수 |
| has_mic | boolean DEFAULT true | |

### match_results
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| match_id | uuid FK → matches UNIQUE | |
| winner_team | smallint | 1 or 2, null=무승부 |
| recorded_by | uuid FK → users | 운영진 |
| recorded_at | timestamptz | |

### match_tags (특이사항 태그 스냅샷)
> **D-ECON-04** (DECIDED 2026-04-20) — 자동 산정 태그의 **현재 유효 스냅샷**. 이력은 저장하지 않는다(경기 컨텍스트 전용 · 과거 태그 트래킹 불필요). [decisions.md §D-ECON-04](./decisions.md#d-econ-04--특이사항-태그-카탈로그).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | uuid FK → users | |
| clan_id | uuid FK → clans | 본 클랜 내전 기준으로만 부여되므로 clan_id 스코프 |
| code | text NOT NULL | 태그 코드 (`streak_lose_3`·`slump`·`no_show` 등 D-ECON-04 카탈로그 13종) |
| tone | enum('good','bad','neutral') NOT NULL | BalanceMaker UI 톤 분기 |
| map_id | uuid FK → maps NULL | 맵별 태그(`map_expert`·`map_rookie`)에만 값 있음 |
| computed_at | timestamptz NOT NULL DEFAULT now() | 최근 재계산 시각 |
| expires_at | timestamptz NULL | 시간 기반 해제(`no_show` 30d, `no_show_repeat` 90d, `new_clan_week` 7d). 조건 기반 해제(승률·연승 등)는 NULL |
| PRIMARY KEY | (user_id, clan_id, code, COALESCE(map_id, '00000000-0000-0000-0000-000000000000'::uuid)) | |

**제약·인덱스·RLS**

- `CHECK ((code LIKE 'map\_%' AND map_id IS NOT NULL) OR (code NOT LIKE 'map\_%' AND map_id IS NULL))` — 맵 태그만 map_id 요구.
- `CREATE INDEX ON match_tags (clan_id, user_id)` — BalanceMaker 슬롯 렌더 쿼리용.
- `CREATE INDEX ON match_tags (expires_at) WHERE expires_at IS NOT NULL` — 만료 배치 스캔용.
- 서버는 UI 쿼리에서 `expires_at IS NULL OR expires_at > now()` 만 조회.
- **갱신 주체**: 서비스 롤만. 경기 결과 입력 시·밸런스 세션 생성 시·일일 배치(KST 06:00)에서 UPSERT·DELETE.
- RLS: SELECT는 같은 클랜 구성원(경기 슬롯 렌더용). INSERT/UPDATE/DELETE 전면 차단(서비스 롤만).

### maps
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| game_id | uuid FK → games | |
| name | varchar | |
| map_type | varchar | '제어','호위','돌격','밀기','충돌','집결' |

### player_scores (누적 점수 관리)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_id | uuid FK → clans | |
| user_id | uuid FK → users | |
| role | enum('tank','dps','support') | |
| manual_score | numeric(3,1) DEFAULT 0 | 운영진 수동 입력 |
| auto_score | numeric(3,1) DEFAULT 0 | 시스템 자동 산출 |
| updated_at | timestamptz | |
| UNIQUE(clan_id, user_id, role) | | |

### medals (칭호)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| slug | varchar UNIQUE | 'map_master', 'attendance_king' 등 |
| name_ko | varchar | |
| name_en | varchar | |
| name_ja | varchar | |
| condition_desc | text | 부여 조건 설명 |
| icon_url | varchar | |

### user_medals
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users | |
| clan_id | uuid FK → clans | |
| medal_id | uuid FK → medals | |
| season | varchar | 'YYYY-MM' |
| awarded_at | timestamptz | |

### nameplate_options (카탈로그)
> **D-PROFILE-01** (DECIDED 2026-04-20) — 네임플레이트 옵션 카탈로그. 프리셋만. [decisions.md §D-PROFILE-01](./decisions.md#d-profile-01--네임플레이트-동기화-규약).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| game_id | text NOT NULL | 'ow','val' |
| category | enum(`emblem`,`namebar`,`sub`,`frame`) NOT NULL | 4카테고리 |
| code | text UNIQUE NOT NULL | 예: `ow-e1`, `val-nb2` (목업 key와 동일) |
| name_ko | text NOT NULL | |
| name_en | text | |
| icon_class | text | 미리보기용 CSS 클래스 또는 아이콘 문자 |
| unlock_source | enum(`default`,`event`,`store`,`achievement`) NOT NULL DEFAULT 'default' | 보유 판정용 |
| linked_id | uuid NULL | event/store 출처 연결 |
| is_active | boolean DEFAULT true | |

### user_nameplate_inventory (보유 옵션)
> **D-PROFILE-01** — 사용자가 보유한 네임플레이트 옵션. `default` 소스는 기본 보유로 간주하므로 별도 행 불필요.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | uuid FK → users | |
| option_id | uuid FK → nameplate_options | |
| acquired_at | timestamptz DEFAULT now() | |
| PRIMARY KEY | (user_id, option_id) | |

- RLS: 본인만 SELECT. 서버 Edge Function이 INSERT(이벤트 보상·스토어 구매 시).

### user_nameplate_selections (현재 선택)
> **D-PROFILE-01** — 게임×카테고리별 **단일** 선택. 목업은 localStorage, 운영은 이 테이블.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | uuid FK → users | |
| game_id | text NOT NULL | |
| category | enum(`emblem`,`namebar`,`sub`,`frame`) NOT NULL | |
| option_id | uuid FK → nameplate_options | |
| updated_at | timestamptz DEFAULT now() | |
| PRIMARY KEY | (user_id, game_id, category) | |

**제약·RLS 메모**

- UPDATE 시 서버가 `user_nameplate_inventory` 또는 기본 옵션인지 재검증(보유하지 않은 옵션 선택 차단).
- RLS: SELECT는 본인 + 같은 클랜 구성원 공개(클랜 내 네임카드 표시용). UPDATE/DELETE는 본인만.
- 실시간 전파: Phase 2+에서 Supabase Realtime 구독 또는 BalanceMaker 매치 진입 시 일괄 로드.

### badges (뱃지 카탈로그)
> **D-PROFILE-04** (DECIDED 2026-04-20) — 뱃지 해금 출처 3분류. [decisions.md §D-PROFILE-04](./decisions.md#d-profile-04--뱃지-해금-출처).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| game_id | text NOT NULL | 'ow','val' |
| category | enum(`battle`,`participation`,`event`,`clan`,`clansync`) NOT NULL | 카테고리 (UI 탭 매핑) |
| code | text UNIQUE NOT NULL | 예: `ow-battle-1` |
| name_ko | text NOT NULL | |
| name_en | text | |
| description | text NOT NULL | |
| icon | text NOT NULL | emoji 또는 아이콘 클래스 |
| unlock_source | enum(`achievement`,`event`,`store`) NOT NULL | |
| unlock_condition | jsonb NOT NULL | 출처별 구조 (§D-PROFILE-04) |
| linked_id | uuid NULL | event_id 또는 store_item_id |
| is_active | boolean DEFAULT true | |
| created_at | timestamptz DEFAULT now() | |

**제약**

- `CHECK (unlock_source = 'store' ⇒ (unlock_condition->>'coin_type') = 'personal')` — store 뱃지는 개인 코인만 (D-PROFILE-04).
- 인덱스: `(game_id, category)` — 뱃지 케이스 카테고리 조회.

### user_badge_unlocks (해금 이력)
> **D-PROFILE-04** — 해금된 뱃지 기록. 해금은 영구(환불/소멸 없음).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | uuid FK → users | |
| badge_id | uuid FK → badges | |
| unlocked_at | timestamptz DEFAULT now() | |
| source_detail | jsonb NULL | 해금 시점 스냅샷 (이벤트 회차·구매 내역 등) |
| PRIMARY KEY | (user_id, badge_id) | |

### user_badge_picks (스트립 픽, 최대 5)
> **D-PROFILE-03** (DECIDED 2026-04-20) — compact 픽(dense-from-front, slot_index 0..n-1). 해제 시 뒷 슬롯을 앞으로 shift. [decisions.md §D-PROFILE-03](./decisions.md#d-profile-03--뱃지-케이스--프로필-스트립-동기화).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | uuid FK → users | |
| game_id | text NOT NULL | |
| slot_index | int NOT NULL | 0..4 — **앞에서부터 연속**으로 사용. 중간 구멍 없음 |
| badge_id | uuid FK → badges NOT NULL | 빈 슬롯은 행을 만들지 않는다 |
| updated_at | timestamptz DEFAULT now() | |
| PRIMARY KEY | (user_id, game_id, slot_index) | |

**제약·RLS 메모**

- `CHECK (slot_index BETWEEN 0 AND 4)`.
- 해제/재배치 시 서버는 트랜잭션으로 **slot_index를 0..(n-1)로 재할당**한다(이후 불필요한 뒤쪽 행은 DELETE). 예: slot 1 해제 → slot 2·3 을 1·2로 UPDATE, 기존 slot 3 DELETE.
- UPSERT 시 서버가 `user_badge_unlocks` 보유 확인(해금되지 않은 뱃지 픽 차단).
- RLS: SELECT는 본인 + 같은 클랜 구성원 공개(스트립 렌더용). UPDATE/DELETE는 본인만.
- 조회 순서: `ORDER BY slot_index ASC`. 클라이언트는 n개 아이콘 + (5-n)개 빈 placeholder를 렌더.

### coin_transactions
> **D-STORE-01 / D-ECON-01 / D-ECON-02** (DECIDED 2026-04-20) — INSERT-only 원장. 풀 간 이전 불가, 멱등성 키로 중복 차단, 정정은 반대 부호 거래로만. [decisions.md §D-STORE-01](./decisions.md#d-store-01--코인-적립차감-트리거-매트릭스) · [§D-ECON-02](./decisions.md#d-econ-02--코인-세탁-방지-정책).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_id | uuid FK → clans NULL | 개인 풀 거래는 NULL |
| user_id | uuid FK → users NULL | 클랜 풀 자동 적립/차감은 NULL, 수동 지출은 실행자 |
| pool_type | enum('clan','personal') NOT NULL | 풀 식별. `(pool_type='personal' ⇒ user_id IS NOT NULL)`, `(pool_type='clan' ⇒ clan_id IS NOT NULL)` |
| amount | int NOT NULL CHECK (amount <> 0) | 양수=지급, 음수=차감 |
| reason | varchar NOT NULL | 사유 코드 (예: `match_enter`·`match_win`·`attendance_daily`·`purchase_profile_deco`·`board_pin_7d`·`tournament_host`). D-STORE-01 매트릭스의 키 그대로 사용 |
| reference_type | varchar NOT NULL | 멱등성 키 구성 — `'match' \| 'scrim_room' \| 'event' \| 'purchase' \| 'badge_unlock' \| 'attendance' \| 'tournament' \| 'subscription' \| 'correction'` |
| reference_id | uuid NOT NULL | 참조 엔티티 id (출석은 user_id, 정정은 원거래 id) |
| sub_key | varchar NOT NULL DEFAULT '' | 참조 엔티티 내 세부 구분 (`enter`·`win`·`mvp`·`streak_w1` 등). 같은 match에서 출전·승리·MVP를 각각 지급하기 위해 필요 |
| balance_after | int NOT NULL CHECK (balance_after >= 0) | 해당 풀의 거래 직후 잔액 스냅샷. 감사·리컨실용. 음수 불가(차감 시 검증) |
| correction_of | uuid FK → coin_transactions NULL | 이 거래가 다른 거래를 정정/취소하는 경우 원거래 id |
| created_by | uuid FK → users NULL | 수동 지출의 실행 주체. 자동 적립은 NULL |
| created_at | timestamptz NOT NULL DEFAULT now() | |

**제약·인덱스·RLS**

- `UNIQUE (pool_type, reference_type, reference_id, sub_key)` — **멱등성 키**. 같은 이벤트의 중복 지급/차감 차단.
- `CHECK (pool_type='personal' AND user_id IS NOT NULL) OR (pool_type='clan' AND clan_id IS NOT NULL)`.
- `CREATE INDEX ON coin_transactions (user_id, pool_type, created_at DESC)` — 개인 거래 내역 UI.
- `CREATE INDEX ON coin_transactions (clan_id, pool_type, created_at DESC)` — 클랜 풀 감사.
- `CREATE INDEX ON coin_transactions (reference_type, reference_id)` — 이벤트 역참조.
- RLS:
  - SELECT: `pool_type='personal'`은 본인만. `pool_type='clan'`은 해당 클랜 운영진+.
  - INSERT: **서비스 롤만**(서버 검증 후).
  - UPDATE/DELETE: **전면 차단** (`USING (false)`). D-ECON-02 불변성 근거.
- 일일 상한(개인 200 / 클랜 2,000) 검증은 서비스 레이어에서 적립 시도 시점에 24h 롤링 합계로 판정. 초과분은 INSERT 하지 않고 조용히 드롭(별도 `coin_cap_drops` 로그 권장, Phase 2+).

### user_attendance (일일 출석)
> **D-STORE-01 / D-ECON-01** (DECIDED 2026-04-20) — 출석 적립의 멱등성·연속 보너스 관리. [decisions.md §D-STORE-01](./decisions.md#d-store-01--코인-적립차감-트리거-매트릭스).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | uuid FK → users | |
| date | date NOT NULL | 출석 일자 (`timezone('Asia/Seoul', now())::date` 기준) |
| checked_at | timestamptz NOT NULL DEFAULT now() | |
| streak | int NOT NULL DEFAULT 1 | 연속 출석 일 수 (D-1 연속이면 +1, 끊기면 1로 리셋) |
| streak_reward_claimed | boolean NOT NULL DEFAULT false | 7일 연속 보너스 지급 여부 (같은 streak 구간 내 중복 지급 차단) |
| PRIMARY KEY | (user_id, date) | 하루 1회만 출석 |

**제약·RLS**

- `coin_transactions (reference_type='attendance', reference_id=user_id, sub_key='daily'||date)` 로 매핑해 중복 적립 차단.
- 연속 보너스는 `sub_key='streak_7_'||date` 로 주 1회 보장.
- RLS: SELECT 본인. INSERT 서비스 롤만.

### board_posts (게시판 - 홍보/스크림 신청 공용)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| game_id | uuid FK → games | |
| clan_id | uuid FK → clans | |
| post_type | enum('promotion','scrim') | 홍보/스크림 신청 |
| title | varchar | |
| content | text | |
| is_pinned | boolean DEFAULT false | 코인 소비로 상단 고정 |
| created_by | uuid FK → users | |
| created_at | timestamptz | |

### clan_events (일정 템플릿)
> **D-EVENTS-01 (DECIDED 2026-04-20) · D-EVENTS-02 Revised (2026-04-21)** — 반복 일정은 **템플릿 1행 + 예외 테이블**. `source='scrim_auto'` 이벤트는 스크림에서 자동 파생된 **읽기 전용** 행. D-EVENTS-02는 2026-04-21에 **종료 조건·52회 hard stop을 폐지**하고 `weekly`는 월~일 다중 요일 + 시각, `monthly`는 day-of-month + 시각 기반으로 단순화됨. 상세 [§D-EVENTS-01](./decisions.md#d-events-01--스크림-확정--클랜-이벤트-자동-생성동기화) · [§D-EVENTS-02 Revised](./decisions.md#d-events-02-revised--일정-반복-요일시각-기반-무기한--2026-04-21).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_id | uuid FK → clans NOT NULL | |
| title | varchar NOT NULL | 1~120자 |
| kind | enum('intra','scrim','event') NOT NULL | 기존 `event_type` 재명명 |
| start_at | timestamptz NOT NULL | 첫 인스턴스 시작 시각 (KST 정규화) |
| place | varchar NULL | 장소·채널 메모 |
| repeat | enum('none','weekly','monthly') NOT NULL DEFAULT 'none' | D-EVENTS-02 Revised — `daily`·`biweekly` 제거 |
| repeat_weekdays | smallint[] NULL | `repeat='weekly'` 필수 · ISO 요일(1=월..7=일) 1~7 원소, ≥1개. 그 외 NULL |
| repeat_time | time NULL | `repeat IN ('weekly','monthly')` 필수 · `HH:mm:ss` (KST 해석). 그 외 NULL |
| source | enum('manual','scrim_auto') NOT NULL DEFAULT 'manual' | |
| scrim_id | uuid FK → scrim_rooms NULL | `source='scrim_auto'`일 때 원본 스크림 |
| created_by | uuid FK → users NOT NULL | |
| cancelled_at | timestamptz NULL | 전체 취소 시각 (인스턴스 전체). 행 삭제 금지 |
| finished_at | timestamptz NULL | 경기 종료 시각 (스크림 자동 이벤트가 `finished` 상태일 때) |
| created_at | timestamptz NOT NULL DEFAULT now() | |

**DROPPED (D-EVENTS-02 Revised 2026-04-21)** — 다음 3컬럼은 Original 결정(2026-04-20)의 잔재로, Revised 결정에서 **제거**:
`repeat_end_kind enum('never','count','until')` · `repeat_end_count int` · `repeat_end_at timestamptz` 및 관련 CHECK 제약. 52회 hard stop 로직·cron `never → count` 자동 전환도 폐기.

**제약·RLS**

- `CHECK ((repeat = 'none' AND repeat_weekdays IS NULL AND repeat_time IS NULL) OR (repeat = 'weekly' AND repeat_weekdays IS NOT NULL AND array_length(repeat_weekdays, 1) >= 1 AND repeat_time IS NOT NULL) OR (repeat = 'monthly' AND repeat_weekdays IS NULL AND repeat_time IS NOT NULL))` (D-EVENTS-02 Revised).
- `CHECK (repeat_weekdays IS NULL OR repeat_weekdays <@ ARRAY[1,2,3,4,5,6,7]::smallint[])` — 요일 값 범위.
- `CHECK ((source = 'scrim_auto' AND scrim_id IS NOT NULL) OR (source = 'manual' AND scrim_id IS NULL))` (D-EVENTS-01).
- UNIQUE `(clan_id, scrim_id) WHERE scrim_id IS NOT NULL` — 한 스크림은 한 클랜에 1행만 자동 등록 (멱등 키, D-EVENTS-01).
- `source='scrim_auto'` 행의 UPDATE는 서비스 롤만 (`title`·`start_at`·`place`·`cancelled_at`·`finished_at` 만 허용). 다른 필드·DELETE는 차단.
- RLS: SELECT = 해당 클랜 구성원. INSERT/UPDATE/DELETE = 운영진+ (manual 한정), `scrim_auto`는 서비스 롤만.
- 트리거 `clan_events_sync_from_scrim()`: `scrim_rooms` AFTER UPDATE OF status 시 `source='scrim_auto'` 행을 UPSERT (D-EVENTS-01).

### clan_event_exceptions (반복 일정 개별 인스턴스 예외)
> **D-EVENTS-02 Revised** (2026-04-21) — 템플릿(`clan_events`) + 지연 인스턴스 방식에서 "이 일정만 수정·취소"를 처리. 종료 조건 폐지로 인스턴스 상한 제약은 없으나, `instance_idx`는 여전히 반복 규칙(`repeat_weekdays` · `repeat_time`)을 시작일 이후 순서대로 센 값. 상세 [§D-EVENTS-02 Revised](./decisions.md#d-events-02-revised--일정-반복-요일시각-기반-무기한--2026-04-21).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| template_id | uuid FK → clan_events NOT NULL | |
| instance_idx | int NOT NULL | 0-based 반복 인덱스 (0 = 첫 인스턴스) |
| original_start_at | timestamptz NOT NULL | 반복 규칙으로 계산된 원래 시각(중복 감지용) |
| override_start_at | timestamptz NULL | 시간 override (NULL = 원래 시각 유지) |
| override_place | varchar NULL | 장소 override |
| override_title | varchar NULL | 제목 override |
| cancelled_at | timestamptz NULL | 이 인스턴스만 취소 |
| created_by | uuid FK → users NOT NULL | |
| created_at | timestamptz NOT NULL DEFAULT now() | |

**제약**

- UNIQUE `(template_id, instance_idx)`.
- RLS: SELECT = 클랜 구성원, INSERT/UPDATE = 운영진+, DELETE 차단.

### event_rsvps (일정 참석 응답)
> **D-SHELL-03 · D-EVENTS-03** — 사이드바 알림 점 "24h 내 RSVP 미응답" 집계 + 알림 대상자 계산에 사용.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| event_id | uuid FK → clan_events NOT NULL | 템플릿 ID (반복 시 인스턴스 구분은 `instance_idx`) |
| instance_idx | int NOT NULL DEFAULT 0 | 반복 없을 때 0. 반복 시 해당 회차 |
| user_id | uuid FK → users NOT NULL | |
| status | enum('going','maybe','not_going') NOT NULL | |
| responded_at | timestamptz NOT NULL DEFAULT now() | |

**제약**

- PK `(event_id, instance_idx, user_id)`.
- RLS: SELECT = 클랜 구성원, INSERT/UPDATE = 본인, DELETE 차단.

### clan_polls (클랜 투표)
> **D-EVENTS-03 · D-EVENTS-04** (DECIDED 2026-04-20) — 알림 반복·마감일 일관성은 Server Action에서 검증. 상세 [§D-EVENTS-04](./decisions.md#d-events-04--투표-알림과-마감일-일관성-검증).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_id | uuid FK → clans NOT NULL | |
| title | varchar NOT NULL | 1~120자 |
| anonymous | boolean NOT NULL DEFAULT false | 닉네임 비공개 여부 |
| multiple_choice | boolean NOT NULL DEFAULT false | 복수 선택지 투표 허용 |
| deadline_at | timestamptz NOT NULL | 투표 마감 |
| notify_repeat | enum('none','once','daily','weekly','until_deadline_daily') NOT NULL DEFAULT 'none' | D-EVENTS-04 검증 대상 |
| notify_hour | smallint NOT NULL DEFAULT 9 CHECK (notify_hour BETWEEN 0 AND 23) | 매일/매주 발송 시각 (KST) |
| post_to_notice | boolean NOT NULL DEFAULT false | 클랜 공지에 동시 게시 |
| closed_at | timestamptz NULL | 수동·자동 종료 시각 |
| created_by | uuid FK → users NOT NULL | 운영진+ |
| created_at | timestamptz NOT NULL DEFAULT now() | |

**제약**

- `CHECK (deadline_at > created_at)`.
- Server Action 검증 (D-EVENTS-04): `notify_repeat='daily'` → `deadline_at >= created_at + 48h`, `'weekly'` → `+14d`, `'until_deadline_daily'` → `+24h`.
- RLS: SELECT = 클랜 구성원, INSERT = 운영진+, UPDATE = 운영진+ (`closed_at`·`deadline_at` 등), DELETE 차단.

### poll_options (투표 선택지)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| poll_id | uuid FK → clan_polls NOT NULL | |
| label | varchar NOT NULL | 1~80자 |
| sort_order | smallint NOT NULL | UI 순서 |

**제약**

- UNIQUE `(poll_id, sort_order)`.
- 투표 생성 후 선택지 삭제 금지(결과 스냅샷 보존). 수정은 투표 0건일 때만.

### poll_votes (투표 응답)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| poll_id | uuid FK → clan_polls NOT NULL | |
| option_id | uuid FK → poll_options NOT NULL | |
| user_id | uuid FK → users NOT NULL | `clan_polls.anonymous=true`여도 감사·중복 방지 목적으로 저장. 표시 시에만 마스킹 |
| voted_at | timestamptz NOT NULL DEFAULT now() | |

**제약**

- PK `(poll_id, option_id, user_id)`.
- `multiple_choice=false`인 투표는 `(poll_id, user_id)`가 최대 1행 — 트리거 또는 중복 투표 시 기존 행 교체(UPSERT).
- RLS: SELECT = 익명 투표면 집계 함수만 허용, 공개 투표면 클랜 구성원 전체. INSERT = 본인, 마감 전까지. DELETE 차단.

### scrim_rooms (스크림 채팅방)
> **D-EVENTS-01 · D-SCRIM-01 · D-SCRIM-02** (DECIDED — SCRIM은 2026-04-21) — 상태 머신 확장. 확정 시점에 `clan_events`로 자동 파생 (D-EVENTS-01). 채팅방 자동 종료(D-SCRIM-01)·양측 확정 2-phase commit(D-SCRIM-02).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_a_id | uuid FK → clans NOT NULL | 개설 클랜 |
| clan_b_id | uuid FK → clans NULL | 매칭 전에는 NULL |
| title | varchar NULL | "A vs B" 또는 모집글 제목 |
| scheduled_at | timestamptz NOT NULL | 경기 시작 일시 |
| mode | varchar NULL | `5v5` / `6v6` / `mixed` 등 |
| tier_min | smallint NULL | 티어 하한 |
| tier_max | smallint NULL | 티어 상한 |
| memo | text NULL | 모집 메모 |
| place | varchar NULL | 장소·채널 |
| status | enum('draft','matched','confirmed','cancelled','finished') NOT NULL DEFAULT 'draft' | `draft`=모집 중, `matched`=상대 배정·협상 중(0~1쪽 확정), `confirmed`=양측 확정(D-EVENTS-01 자동 이벤트 트리거), `cancelled`=취소, `finished`=경기 종료 |
| confirmed_at | timestamptz NULL | `status='confirmed'` 전환 시각. 일정 변경 시 트리거가 NULL 복원 |
| cancelled_at | timestamptz NULL | 취소 시각 |
| finished_at | timestamptz NULL | 경기 종료 시각 |
| created_by | uuid FK → users NOT NULL | |
| created_at | timestamptz NOT NULL DEFAULT now() | |
| closed_at | timestamptz NULL | 채팅방 아카이브 시각. 상태별 시점 → D-SCRIM-01 매트릭스 |
| closed_by | uuid FK → users NULL | 수동 종료 시 운영진. cron 자동 종료면 NULL |
| closed_reason | enum('auto_timeout','manual','cancelled','finished') NULL | NULL = 미종료. D-SCRIM-01 |

**제약**

- `CHECK (status != 'confirmed' OR (clan_b_id IS NOT NULL AND confirmed_at IS NOT NULL))`.
- `CHECK (status != 'cancelled' OR cancelled_at IS NOT NULL)`.
- `CHECK (status != 'finished' OR finished_at IS NOT NULL)`.
- `CHECK ((closed_at IS NULL) = (closed_reason IS NULL))` — 종료 시각·사유는 함께 세팅.
- 트리거 (D-EVENTS-01): `AFTER UPDATE OF status` → `clan_events_sync_from_scrim(NEW)` 호출.
- 트리거 (D-SCRIM-02): `BEFORE UPDATE` → `scrim_rooms_invalidate_confirmations()` — `scheduled_at`/`mode`/`tier_min`/`tier_max`/`place` 변경 감지 시 `scrim_room_confirmations` 전부 DELETE + `NEW.status='matched'` + `NEW.confirmed_at=NULL`.
- 인덱스: `(closed_at) WHERE closed_at IS NULL AND status IN ('matched','confirmed')` — D-SCRIM-01 cron 후보 조회.
- 인덱스: `(scheduled_at, status) WHERE status = 'matched'` — D-SCRIM-02 타임아웃 cron 후보 조회.

**상태 전이**

```
draft ──► matched ──► confirmed ──► finished
   │          │            │
   │          │            └──► matched (일정 변경 시 자동 무효화 · D-SCRIM-02)
   │          │
   └──────────┴────────────┴──► cancelled
                         │
                  (cancelled → confirmed 재확정 허용 — D-EVENTS-01)
```

### scrim_room_confirmations (스크림 양측 확정 누적 · D-SCRIM-02)
> **D-SCRIM-02** (DECIDED 2026-04-21) — 양측 운영진의 확정을 2-phase commit으로 누적. 양쪽 행 모두 존재 시 트리거가 `scrim_rooms.status='confirmed'` 전이.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| scrim_room_id | uuid FK → scrim_rooms NOT NULL | |
| side | enum('host','guest') NOT NULL | `host`=`clan_a_id` 측, `guest`=`clan_b_id` 측 |
| confirmed_by | uuid FK → users NOT NULL | 운영진+ |
| confirmed_at | timestamptz NOT NULL DEFAULT now() | |

**제약**

- UNIQUE `(scrim_room_id, side)` — 같은 측 중복 확정 방지(=동시 클릭 직렬화).
- 트리거 `AFTER INSERT` → `scrim_rooms_promote_to_confirmed()`: 양쪽 행(`host` + `guest`) 존재 시 `UPDATE scrim_rooms SET status='confirmed', confirmed_at=now() WHERE id = NEW.scrim_room_id AND status='matched'` 실행. 이미 `confirmed`면 no-op.
- DELETE 정책: 일정 변경 트리거(`scrim_rooms_invalidate_confirmations`) 또는 취소(`status='cancelled'` 전이) 시 일괄 삭제. 운영자 수동 DELETE 차단(서비스 롤 전용).
- RLS: SELECT = 양쪽 클랜 구성원. INSERT = 본인 클랜 운영진+(`side='host'`이면 `clan_a_id` 운영진, `'guest'`면 `clan_b_id` 운영진). DELETE = 서비스 롤만.

### scrim_ratings (평판)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| scrim_room_id | uuid FK → scrim_rooms | |
| rated_by_clan_id | uuid FK → clans | 평가하는 클랜 |
| rated_clan_id | uuid FK → clans | 평가받는 클랜 |
| manner_score | smallint | 1~5 |
| no_show | boolean DEFAULT false | |
| comment | text | |

### lfg_posts (같이 할 사람 모집 글 · D-LFG-01)
> **D-LFG-01** (DECIDED 2026-04-21) — LFG 모집 글. 모집자가 게시, 신청은 별도 `lfg_applications`로 누적. `slots`만큼 `accepted` 도달 시 자동 마감.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| game_id | uuid FK → games NOT NULL | |
| creator_user_id | uuid FK → users NOT NULL | 모집자 |
| mode | varchar NOT NULL | `경쟁전` / `빠른대전` / `아케이드` 등 게임별 enum |
| format | varchar NOT NULL | `5vs5` / `6vs6` |
| slots | smallint NOT NULL CHECK (slots BETWEEN 1 AND 11) | 모집 인원 |
| tiers | text[] NOT NULL DEFAULT '{}' | 희망 티어 다중. 빈 배열 = 무관 |
| positions | text[] NOT NULL DEFAULT '{}' | 희망 포지션 다중. 빈 배열 = 올포지 |
| mic_required | boolean NOT NULL DEFAULT false | |
| start_time_hour | smallint NOT NULL CHECK (start_time_hour BETWEEN 0 AND 23) | 시작 시각(시) |
| expires_at | timestamptz NOT NULL | 모집 마감 시각 |
| description | text NULL | 한마디 |
| status | enum('open','filled','expired','canceled') NOT NULL DEFAULT 'open' | `open`=모집 중, `filled`=정원 충족, `expired`=시간 만료, `canceled`=모집자 취소 |
| created_at | timestamptz NOT NULL DEFAULT now() | |

**제약**

- `CHECK (status != 'expired' OR expires_at <= now())`.
- 인덱스: `(game_id, status, expires_at)` — 활성 모집 목록 가속.
- 인덱스: `(creator_user_id, created_at DESC)` — "내 모집" 조회.
- RLS: SELECT = 게임 인증 통과한 사용자 전원. INSERT = 본인. UPDATE(status) = 본인(`canceled`만) 또는 트리거(`filled`/`expired`). DELETE 차단(soft).
- 트리거 `lfg_posts_auto_fill()`: `lfg_applications` AFTER UPDATE OF status → `accepted` 카운트 ≥ `slots`이면 `lfg_posts.status='filled'` + 잔여 `applied`를 `expired`로 전환.

### lfg_applications (LFG 신청 · D-LFG-01)
> **D-LFG-01** (DECIDED 2026-04-21) — 한 모집 글당 같은 사용자는 동시에 1건만 active 신청(부분 UNIQUE). 거절·취소·만료 후 재신청은 새 행 INSERT.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| post_id | uuid FK → lfg_posts NOT NULL | |
| applicant_user_id | uuid FK → users NOT NULL | 신청자 |
| status | enum('applied','accepted','rejected','canceled','expired') NOT NULL DEFAULT 'applied' | |
| tier | varchar NULL | 신청 시점 신청자 티어 스냅샷 |
| role | varchar NULL | 신청 포지션 |
| mic_available | boolean NULL | 마이크 가용 여부 |
| message | text NULL | 신청자 메모 (≤200자) |
| created_at | timestamptz NOT NULL DEFAULT now() | |
| resolved_at | timestamptz NULL | `accepted`/`rejected`/`canceled`/`expired` 전환 시각 |
| resolved_by | uuid FK → users NULL | 모집자(accept/reject) 또는 본인(cancel). cron 만료 시 NULL |

**제약**

- 부분 UNIQUE 인덱스: `CREATE UNIQUE INDEX lfg_app_one_active_per_user ON lfg_applications (post_id, applicant_user_id) WHERE status = 'applied'` — 동일 사용자 동시 active 신청 차단.
- `CHECK (status = 'applied' OR resolved_at IS NOT NULL)`.
- `CHECK (LENGTH(COALESCE(message,'')) <= 200)`.
- 인덱스: `(post_id, status)` — 모집자 측 신청자 목록·카운트 가속.
- 인덱스: `(applicant_user_id, status, created_at DESC)` — 본인 "내 신청 N건" pill.
- RLS: SELECT = 신청자 본인 + 모집 글 작성자. INSERT = 본인, 게임 인증 통과(post의 game_id와 일치). UPDATE(status) = 모집자(`accepted`/`rejected`만) 또는 본인(`canceled`만). DELETE 차단(soft).
- 알림 (D-EVENTS-03 채널 정책 재사용): INSERT 시 모집자에게 in-app, `accepted`/`rejected` 전환 시 신청자에게 in-app, `expired` 일괄 전환 시 신청자에게 in-app 1회.

### match_record_correction_requests (경기 사후 정정 요청 · D-STATS-02)
> **D-STATS-02** (DECIDED 2026-04-21) — 경기 기록 오입력 시 정정 요청 모달의 누적 테이블. 운영진은 권한 키 `correct_match_records`(D-PERM-01) 보유자, 요청자는 `view_match_records` 권한 보유자. 운영진 수동 정정 — 자동 적용 X. [decisions.md §D-STATS-02](./decisions.md#d-stats-02--경기-사후-정정-요청-모달과-이력-보존).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK DEFAULT gen_random_uuid() | |
| match_id | uuid NOT NULL FK → matches ON DELETE CASCADE | |
| requester_id | uuid NOT NULL FK → users | `view_match_records` 권한 보유자 |
| proposed_result | text NULL | `'blue_win'`/`'red_win'` 또는 NULL(=결과 변경 없음) |
| proposed_roster | jsonb NULL | `{blue: [user_id...], red: [user_id...]}` 또는 NULL |
| proposed_map | text NULL | 맵 변경 제안 (드롭다운 값 1개) |
| reason | text NOT NULL | 자유 사유 (max 500자, NOT EMPTY) |
| status | text NOT NULL DEFAULT `'pending'` CHECK (status IN ('pending','accepted','rejected','expired')) | |
| created_at | timestamptz NOT NULL DEFAULT now() | |
| resolved_at | timestamptz NULL | |
| resolved_by | uuid NULL FK → users | accepted/rejected 처리한 운영진 |
| reject_reason | text NULL | `status='rejected'` 시 운영진 입력 |

**제약**

- 부분 UNIQUE 인덱스: `CREATE UNIQUE INDEX match_correction_one_active_per_match ON match_record_correction_requests (match_id) WHERE status = 'pending'` — 같은 경기 동시 active 요청 1건만.
- `CHECK (LENGTH(reason) > 0 AND LENGTH(reason) <= 500)`.
- `CHECK (status = 'pending' OR resolved_at IS NOT NULL)`.
- 인덱스: `(status, created_at)` — cron 만료 스캔(7일 경과).
- 인덱스: `(requester_id, status, created_at DESC)` — 요청자 본인 내역.

**RLS**

- SELECT: 요청자 본인 + `correct_match_records` 권한 보유자 + 같은 클랜 운영진+.
- INSERT: 본인, `view_match_records` 권한 보유.
- UPDATE(`status`, `resolved_*`, `reject_reason`): `correct_match_records` 권한 보유자(`accepted`/`rejected`만), cron 서비스 롤(`expired`만).
- DELETE 차단(soft).

**알림 슬롯 (D-NOTIF-01 통합 센터 DECIDED 2026-04-21 · AFTER INSERT/UPDATE 트리거가 `notifications` 행 자동 생성)**

| 슬롯 | 트리거 | 채널 | 수신자 |
|------|--------|------|--------|
| `match_correction_requested` | INSERT | in-app | `correct_match_records` 권한 보유자 전원 |
| `match_correction_accepted` | `status='accepted'` | in-app | 요청자 |
| `match_correction_rejected` | `status='rejected'` | in-app | 요청자 (반려 사유 포함) |
| `match_correction_expired` | cron `status='expired'` | in-app | 요청자 |

### match_record_history (경기 기록 정정 이력 · D-STATS-02)
> **D-STATS-02** (DECIDED 2026-04-21) — 경기 기록 변경의 before/after 영구 보존. 직접 정정·요청 승인 양쪽 모두 동일 테이블에 INSERT. INSERT-only(UPDATE/DELETE RLS 차단). HoF·통계 재집계 시 history reverse-replay로 시점별 통계 재현 가능.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK DEFAULT gen_random_uuid() | |
| match_id | uuid NOT NULL FK → matches ON DELETE CASCADE | |
| changed_by | uuid NOT NULL FK → users | `correct_match_records` 권한 보유자 |
| source | text NOT NULL CHECK (source IN ('direct','request')) | `direct`=운영진 직접 정정, `request`=요청 승인 경유 |
| request_id | uuid NULL FK → match_record_correction_requests | `source='request'` 시 필수, `direct` 시 NULL |
| before | jsonb NOT NULL | `{result, roster, map}` 변경 전 스냅샷 |
| after | jsonb NOT NULL | 변경 후 스냅샷 |
| reason | text NULL | 직접 정정 시 운영진 입력. 요청 경유 시 요청 reason을 복사하지 않고 NULL(요청 본문은 `request_id`로 추적). |
| changed_at | timestamptz NOT NULL DEFAULT now() | |

**제약**

- `CHECK ((source = 'request' AND request_id IS NOT NULL) OR (source = 'direct' AND request_id IS NULL))`.
- `CHECK (before IS DISTINCT FROM after)` — 무의미한 history 차단.
- 인덱스: `(match_id, changed_at DESC)` — 경기별 이력 타임라인.
- 인덱스: `(changed_by, changed_at DESC)` — 운영진별 정정 활동 감사.

**RLS**

- SELECT: 같은 클랜 활성 멤버 (구성원도 자기 클랜 경기 변경 이력은 투명하게 열람).
- INSERT: 트리거 전용 — `match_record_correction_requests` 승인 시점, 또는 운영진의 직접 정정 트랜잭션 내. 일반 INSERT 차단.
- UPDATE/DELETE: 전면 차단(INSERT-only).

**활용**

- HoF 등재 재집계: `WHERE changed_at > <hof_snapshot_at>` 이력을 reverse-replay 해 정정 전 스냅샷 재현.
- 분쟁 추적: 같은 경기에 정정이 반복되면 운영 알림(Phase 2+ anomaly detection 후보).

### clan_daily_member_activity (클랜 활동일 · D-STATS-03)
> **D-STATS-03** (DECIDED 2026-04-21) — 탭 4 "앱 이용" §영역 1의 측정 단위 = **활동일(person-day)**. 멤버가 자기 클랜 페이지에 첫 페이지뷰를 기록한 날 = 1행. DAY UNIQUE로 새벽 새로고침·매크로·prefetch 스팸 자동 차단. INSERT-only. [decisions.md §D-STATS-03](./decisions.md#d-stats-03--앱-이용-횟수-측정-단위--활동일-person-day).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| clan_id | uuid NOT NULL FK → clans ON DELETE CASCADE | |
| user_id | uuid NOT NULL FK → users ON DELETE CASCADE | |
| activity_date | date NOT NULL | 클랜 `clans.timezone`(없으면 `Asia/Seoul`) 자정 경계 |
| first_seen_at | timestamptz NOT NULL DEFAULT now() | 첫 페이지뷰 시각(분석용) |
| **PK** | `(clan_id, user_id, activity_date)` | DAY UNIQUE |

**INSERT 정책 (멱등 RPC, Phase 2+)**

```sql
-- record_clan_activity(clan_id, user_id) — 자기 클랜 라우트 진입 시 1회 호출
INSERT INTO clan_daily_member_activity (clan_id, user_id, activity_date)
SELECT $1, $2, (now() AT TIME ZONE COALESCE(c.timezone, 'Asia/Seoul'))::date
FROM clans c WHERE c.id = $1
ON CONFLICT (clan_id, user_id, activity_date) DO NOTHING;
```

**제약·인덱스**

- INSERT 가드: 본인이 해당 클랜의 활성 멤버일 때만(`clan_members WHERE status='active'` 검증). 과거·미래 날짜 INSERT는 RPC가 `current_date`로 강제.
- prefetch 가드: 호출자(서버 컴포넌트/미들웨어)에서 HTTP `Sec-Fetch-Dest=prefetch` 또는 `Purpose=prefetch` 헤더가 있으면 RPC 호출 자체를 스킵. 봇 User-Agent 필터도 동일 위치.
- 인덱스: `(clan_id, activity_date DESC)` — 월간/연간 집계 가속.

**RLS**

- SELECT: 같은 클랜 활성 멤버 전원 (영역 2·3과 동일 정책).
- INSERT: `record_clan_activity()` RPC 경유만. 직접 INSERT 차단(서비스 롤도 RPC 사용).
- UPDATE/DELETE: 전면 차단(INSERT-only). 멤버 탈퇴 후에도 행 보존 → 과거 통계 진실성 유지. 사용자 계정 삭제(GDPR) 시에만 CASCADE.

**집계 (Phase 2+ — Materialized View)**

```sql
CREATE MATERIALIZED VIEW clan_monthly_activity AS
SELECT
  clan_id,
  date_trunc('month', activity_date)::date AS month,
  COUNT(*)                  AS person_days,      -- 영역 1
  COUNT(DISTINCT user_id)   AS active_members    -- 영역 2 (월간)
FROM clan_daily_member_activity
GROUP BY 1, 2;

CREATE MATERIALIZED VIEW clan_yearly_activity AS
SELECT
  clan_id,
  date_trunc('year', activity_date)::date AS year,
  COUNT(*)                  AS person_days,
  COUNT(DISTINCT user_id)   AS active_members    -- 연간 distinct는 월 합산 ≠ 연 합산이라 별도 MV 필수
FROM clan_daily_member_activity
GROUP BY 1, 2;
```

- cron 매일 새벽 1회 `REFRESH MATERIALIZED VIEW CONCURRENTLY ...`.
- 영역 1(`person_days`) ↔ 영역 2(`active_members`) 동시 산출 → 두 영역 일관성 강화.
- 영역 3(내전 경기 수)은 `matches` 테이블 별도 집계 (본 테이블과 무관).

**카운트 컨텍스트**

- 포함 라우트: `/clan/[clan_id]`, `/clan/[clan_id]/manage`, `/clan/[clan_id]/stats`, `/clan/[clan_id]/events`, `/clan/[clan_id]/promo` 등 **`clan_id` 파라미터를 가진 모든 라우트**.
- 제외: `/main-game` 허브, `/profile`, `/balance`, 다른 클랜의 공개 프로필 등 클랜 비종속 라우트.
- 다중 클랜 멤버: 클랜별 독립 카운트(같은 날 두 클랜에 들어가면 두 행 INSERT).

**외부 노출 가드**

- D-ECON-03 — 다른 클랜·비멤버에게 노출 금지. 클랜 순위표·검색·외부 페이지에 person_days 또는 active_members 노출 금지.
- CSV 내보내기는 D-PERM-01 권한 키 `export_csv` 보유자만(D-STATS-04 흡수, Phase 2+ UI).

### bracket_tournaments (대진표 · 클랜 내 이벤트)
> **D-EVENTS-05 · D-ECON-01** (DECIDED 2026-04-20) — 대진표는 **클랜 내 이벤트 전용**(클랜 간 토너먼트 없음). `host_clan_id = winner_clan_id`가 항상 성립. 상세 [§D-EVENTS-05](./decisions.md#d-events-05--대진표-결과의-통계코인-반영).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| host_clan_id | uuid FK → clans NOT NULL | 개최 클랜 (Premium 플랜 필수) |
| title | varchar NOT NULL | 대회명 |
| format | enum('single_elim','double_elim','round_robin') NOT NULL | |
| team_count | smallint NOT NULL CHECK (team_count IN (2,4,8,16)) | |
| status | enum('draft','in_progress','finished','cancelled') NOT NULL DEFAULT 'draft' | |
| started_at | timestamptz NULL | 첫 경기 시작 |
| finished_at | timestamptz NULL | 최종 결과 확정 |
| cancelled_at | timestamptz NULL | 취소(우승 확정 전에만 가능 · 코인 환불 트리거) |
| host_coin_transaction_id | uuid FK → coin_transactions NULL | 개최 -500 차감 거래 |
| winner_coin_transaction_id | uuid FK → coin_transactions NULL | 우승 +1,000 적립 거래 |
| entry_coin_transaction_id | uuid FK → coin_transactions NULL | 참가 +200 적립 거래 |
| created_by | uuid FK → users NOT NULL | 운영진+ |
| created_at | timestamptz NOT NULL DEFAULT now() | |

**제약**

- 개최 시 클랜 플랜 = `premium` 검증 (D-EVENTS-05).
- `cancelled`는 `winner_coin_transaction_id IS NULL`일 때만 허용.

### bracket_teams (대진표 팀 · 한 클랜 내부 파티션)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| tournament_id | uuid FK → bracket_tournaments NOT NULL | |
| name | varchar NOT NULL | |
| seed | smallint NOT NULL | 시드 |
| eliminated_at | timestamptz NULL | 탈락 시점 |

**제약**

- UNIQUE `(tournament_id, seed)`.
- UNIQUE `(tournament_id, name)`.

### bracket_team_members (팀 · 선수 — 본 클랜 구성원만)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| team_id | uuid FK → bracket_teams NOT NULL | |
| user_id | uuid FK → users NOT NULL | |
| role | varchar NULL | 포지션 메모 |

**제약**

- PK `(team_id, user_id)`.
- UNIQUE `(user_id, (SELECT tournament_id FROM bracket_teams WHERE id = team_id))` — 같은 대회 내 두 팀 중복 등록 금지 (트리거로 강제).
- `user_id`는 `clan_members` 중 `tournament.host_clan_id`와 일치해야 함.

### bracket_matches (라운드별 경기)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| tournament_id | uuid FK → bracket_tournaments NOT NULL | |
| round | smallint NOT NULL | 1, 2, … |
| slot | smallint NOT NULL | 라운드 내 경기 순서 |
| team_a_id | uuid FK → bracket_teams NULL | 미확정 시 NULL |
| team_b_id | uuid FK → bracket_teams NULL | |
| winner_team_id | uuid FK → bracket_teams NULL | 결과 입력 후 세팅 |
| played_at | timestamptz NULL | |

**제약**

- UNIQUE `(tournament_id, round, slot)`.
- `CHECK (winner_team_id IS NULL OR winner_team_id IN (team_a_id, team_b_id))`.

### bracket_results (최종 순위 스냅샷)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| tournament_id | uuid FK → bracket_tournaments NOT NULL | |
| rank | smallint NOT NULL | 1·2·3 등 |
| team_id | uuid FK → bracket_teams NOT NULL | |

**제약**

- PK `(tournament_id, rank)`.
- `rank=1`의 팀이 `bracket_tournaments.winner_coin_transaction_id` 트리거 조건.

### notification_preferences (알림 설정)
> **D-EVENTS-03** (DECIDED 2026-04-20) — 카카오 기본 OFF (옵트인). Discord 연동 시 ON. Quiet hours 00~07 KST 카카오 연기. 상세 [§D-EVENTS-03](./decisions.md#d-events-03--일정투표-알림-채널정책).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | uuid PK FK → users | 1:1 |
| channel_inapp | boolean NOT NULL DEFAULT true | 항상 true (UI 토글 숨김) |
| channel_discord | boolean NOT NULL DEFAULT true | Discord 연동 없으면 무시 |
| channel_kakao | boolean NOT NULL DEFAULT false | **옵트인** |
| kakao_verified_phone | text NULL | 알림톡 수신 전 필수 |
| quiet_start | time NOT NULL DEFAULT '00:00' | 카카오 전용 연기 시작 |
| quiet_end | time NOT NULL DEFAULT '07:00' | 카카오 전용 연기 종료 |
| digest_hour | smallint NOT NULL DEFAULT 9 CHECK (digest_hour BETWEEN 0 AND 23) | 매일·매주 발송 시각(KST) |
| per_event_kind | jsonb NOT NULL DEFAULT '{"scrim":true,"intra":true,"event":true,"poll":true}'::jsonb | 유형별 on/off |
| updated_at | timestamptz NOT NULL DEFAULT now() | |

**제약·RLS**

- SELECT/UPDATE: 본인만.
- INSERT: 회원가입 트리거에서 자동 기본값 INSERT.

### notification_log (알림 예약·발송 로그)
> **D-EVENTS-03 · D-EVENTS-04** (DECIDED 2026-04-20) — 예약/발송/실패의 단일 출처. 중복 방지 UNIQUE `(event_id, slot_kind, scheduled_at, channel, recipient_user_id)`.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| event_id | uuid FK → clan_events NULL | 일정 알림 대상 |
| instance_idx | int NULL | 반복 회차 |
| poll_id | uuid FK → clan_polls NULL | 투표 알림 대상 |
| slot_kind | enum('event_t_minus_24h','event_t_minus_1h','event_t_minus_10min','event_t_0','poll_created','poll_daily','poll_weekly','poll_deadline_window','poll_deadline_1h','event_cancelled') NOT NULL | |
| channel | enum('inapp','discord','kakao','web_push') NOT NULL | `web_push` 추가: D-NOTIF-02 (DECIDED 2026-04-21, Premium 전용) |
| recipient_user_id | uuid FK → users NOT NULL | |
| scheduled_at | timestamptz NOT NULL | 계획 발송 시각(quiet hours 보정 전) |
| effective_at | timestamptz NULL | 실제 발송 시각(quiet hours·retry 후) |
| status | enum('scheduled','sent','failed','cancelled','dlq') NOT NULL DEFAULT 'scheduled' | |
| attempt_count | smallint NOT NULL DEFAULT 0 | 재시도 횟수(최대 5) |
| last_error | text NULL | 마지막 실패 메시지 |
| dedup_key | text NOT NULL | `hash(id)` — 공급자 측 중복 수신 감지용 |
| created_at | timestamptz NOT NULL DEFAULT now() | |
| updated_at | timestamptz NOT NULL DEFAULT now() | |

**제약·RLS**

- `CHECK ((event_id IS NOT NULL) <> (poll_id IS NOT NULL))` — 둘 중 정확히 하나만.
- UNIQUE `(event_id, instance_idx, slot_kind, channel, recipient_user_id) WHERE event_id IS NOT NULL`.
- UNIQUE `(poll_id, slot_kind, scheduled_at, channel, recipient_user_id) WHERE poll_id IS NOT NULL`.
- RLS: INSERT/UPDATE/DELETE 서비스 롤만. SELECT는 본인 행 + 운영자(관리자).
- 관련 이벤트/투표 `cancelled` 시 트리거가 `status='scheduled'` 행을 전부 `cancelled`로 UPDATE (D-EVENTS-04).
- **D-NOTIF-01 연동**: `channel='inapp' AND status='sent'`로 UPDATE될 때 AFTER UPDATE 트리거가 `notifications`에 대응 행 INSERT(아래 §notifications 참고). `notification_log`는 발송 레이어 그대로 유지 — 피드 레이어(`notifications`)와 책임 분리.
- **D-NOTIF-02 연동**: `channel='web_push'` 행은 `notifications` INSERT와 **병행** 생성(Phase 2+ 서버 워커). `users.plan='premium'` + 수신자 카테고리 구독 ON인 경우에만 INSERT. quiet hours 00~07 KST는 `scheduled_at=07:00 KST`로 지연. 410 Gone 응답 시 `web_push_subscriptions.revoked_at=now()` 업데이트 + 재시도 중단. 상세 [§D-NOTIF-02](./decisions.md#d-notif-02--브라우저-서비스워커-웹-푸시-도입-정책-프리셋-α).

### notifications (in-app 알림 피드 · D-NOTIF-01)
> **D-NOTIF-01** (DECIDED 2026-04-21) — 운영·개인 결과·일정 알림을 수신자 관점 단일 피드로 통합. 네비게이션바 상단 벨 아이콘 + 드로워의 데이터 소스. `notification_log`(발송 레이어)와 분리되며 FK로 연결. 상세 [§D-NOTIF-01](./decisions.md#d-notif-01--in-app-알림-센터-통합-도입).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| recipient_user_id | uuid NOT NULL FK → users ON DELETE CASCADE | 수신자 본인 |
| clan_id | uuid NULL FK → clans ON DELETE CASCADE | 클랜 컨텍스트 알림만. 게임 공통·계정 알림은 NULL |
| kind | text NOT NULL | 슬롯 키 카탈로그(아래 표). enum 대신 text로 두어 슬롯 추가 유연. CHECK로 카탈로그 제한 가능 |
| source_table | text NOT NULL | 원본 테이블 이름: `clan_join_requests` / `match_record_correction_requests` / `scrim_room_confirmations` / `scrim_rooms` / `lfg_applications` / `clan_members` / `notification_log` 등 |
| source_id | uuid NOT NULL | 원본 행 PK (soft FK — 물리 FK 없음. 원본 삭제돼도 피드 보존, RLS로 접근성 재확인) |
| payload | jsonb NOT NULL DEFAULT `'{}'::jsonb` | 렌더용 스냅샷 (요청자 닉네임·경기 라벨·일정 제목 등). 원본 row 변경/삭제 시에도 피드 문구 보존 |
| read_at | timestamptz NULL | NULL = unread. 드로워 열람 시 또는 "원본 열기" 클릭 시 `now()` |
| created_at | timestamptz NOT NULL DEFAULT now() | |

**슬롯 키 카탈로그 (Phase 1 초안, D-NOTIF-01 §연관 슬롯)**

| kind | source_table | 수신자 결정 규칙 | 소스 결정 |
|------|--------------|-----------------|----------|
| `join_request_submitted` | `clan_join_requests` | `approve_join_requests` 권한자 전원 | D-CLAN-02 |
| `join_request_accepted` / `join_request_rejected` | `clan_join_requests` | `user_id` (신청자 본인) | D-CLAN-02 |
| `match_correction_requested` | `match_record_correction_requests` | `correct_match_records` 권한자 전원 | D-STATS-02 |
| `match_correction_accepted` / `match_correction_rejected` / `match_correction_expired` | `match_record_correction_requests` | `requester_user_id` | D-STATS-02 |
| `scrim_one_side_confirmed` | `scrim_room_confirmations` | 상대 클랜의 `confirm_scrim` 권한자 | D-SCRIM-02 |
| `scrim_both_confirmed` / `scrim_invalidated` / `scrim_cancelled` | `scrim_rooms` | 양측 운영진 + 참가 확정 멤버 | D-SCRIM-02 |
| `scrim_chat_closing_soon` / `scrim_chat_closed` | `scrim_rooms` | 채팅방 참가자 전원 | D-SCRIM-01 |
| `lfg_applied` | `lfg_applications` | 모집 post 소유자 | D-LFG-01 |
| `lfg_accepted` / `lfg_rejected` / `lfg_expired` | `lfg_applications` | `applicant_user_id` | D-LFG-01 |
| `member_became_dormant` | `clan_members` | `read_members` 또는 `manage_members` 권한자 | D-CLAN-07 |
| `event_reminder` | `notification_log` | `notification_log.recipient_user_id` | D-EVENTS-03 (in-app 채널 전용) |

**제약·인덱스**

```sql
CREATE TABLE notifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clan_id            uuid NULL REFERENCES clans(id) ON DELETE CASCADE,
  kind               text NOT NULL,
  source_table       text NOT NULL,
  source_id          uuid NOT NULL,
  payload            jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at            timestamptz NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- 미열람 피드 조회 (벨 배지 카운트 + 드로워 1페이지)
CREATE INDEX notifications_unread
  ON notifications (recipient_user_id, created_at DESC)
  WHERE read_at IS NULL;

-- 전체 피드 최근순
CREATE INDEX notifications_by_recipient
  ON notifications (recipient_user_id, created_at DESC);

-- 원본 역조회 (운영진이 "이 행의 모든 관련 알림 보기"에 사용, Phase 2+)
CREATE INDEX notifications_by_source
  ON notifications (source_table, source_id);
```

**RLS**

- SELECT: `recipient_user_id = auth.uid()` (본인만).
- INSERT: 서비스 롤·DB 트리거 경유만 (애플리케이션 직접 INSERT 금지 — 수신자 계산 누락·권한 우회 방지).
- UPDATE: 본인이 `read_at = now()`로만 (다른 컬럼 UPDATE 전면 차단). 드로워 오픈 시 RPC 하나로 일괄 처리.
- DELETE: **금지** (GC는 서비스 롤 cron만).

**트리거 라우팅 (D-NOTIF-01 M1 모델 핵심)**

```sql
-- 예: 정정 요청 상태 전환 → 요청자에게 결과 알림
CREATE OR REPLACE FUNCTION notify_match_correction_resolved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('accepted', 'rejected', 'expired') AND OLD.status = 'pending' THEN
    INSERT INTO notifications (recipient_user_id, clan_id, kind, source_table, source_id, payload)
    VALUES (
      NEW.requester_user_id,
      NEW.clan_id,
      'match_correction_' || NEW.status,
      'match_record_correction_requests',
      NEW.id,
      jsonb_build_object(
        'match_label', (SELECT label FROM matches WHERE id = NEW.match_id),
        'reviewer_nickname', (SELECT nickname FROM users WHERE id = NEW.reviewed_by),
        'resolved_at', NEW.resolved_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_match_correction_on_resolve
AFTER UPDATE OF status ON match_record_correction_requests
FOR EACH ROW EXECUTE FUNCTION notify_match_correction_resolved();

-- 예: 일정 in-app 알림 발송 완료 → 피드에 기록
CREATE OR REPLACE FUNCTION sync_inapp_log_to_feed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.channel = 'inapp' AND NEW.status = 'sent' AND (OLD.status IS DISTINCT FROM 'sent') THEN
    INSERT INTO notifications (recipient_user_id, clan_id, kind, source_table, source_id, payload)
    VALUES (
      NEW.recipient_user_id,
      (SELECT clan_id FROM clan_events WHERE id = NEW.event_id),
      'event_reminder',
      'notification_log',
      NEW.id,
      jsonb_build_object(
        'slot_kind', NEW.slot_kind,
        'event_id', NEW.event_id,
        'poll_id', NEW.poll_id,
        'scheduled_at', NEW.scheduled_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notification_log_to_feed
AFTER UPDATE OF status ON notification_log
FOR EACH ROW EXECUTE FUNCTION sync_inapp_log_to_feed();
```

**읽음·GC**

- 드로워 열람 RPC (예시):
  ```sql
  CREATE OR REPLACE FUNCTION mark_notifications_read(before_ts timestamptz)
  RETURNS int AS $$
  WITH updated AS (
    UPDATE notifications
    SET read_at = now()
    WHERE recipient_user_id = auth.uid()
      AND read_at IS NULL
      AND created_at <= before_ts
    RETURNING 1
  )
  SELECT COUNT(*)::int FROM updated;
  $$ LANGUAGE sql SECURITY INVOKER;
  ```
- GC cron (매일 새벽 1회):
  ```sql
  DELETE FROM notifications
  WHERE read_at IS NOT NULL
    AND read_at < now() - interval '7 days';
  ```
- 미열람(`read_at IS NULL`)은 GC 대상 아님 — 오래된 미읽음도 영구 보존.

**왜 `source_id`를 soft FK(물리 FK 없음)로 두는가**

- 11개 소스 테이블 각각에 FK를 두면 `source_table` enum과 분기 관리 부담 큼.
- 원본 행이 삭제돼도 알림 본문은 `payload` 스냅샷으로 보존되어야 함 — FK CASCADE 금지.
- 대신 `notifications_by_source` 인덱스로 역조회는 빠름. "원본 열기" 클릭 시 `source_table` 분기해 조회, RLS가 접근성 재확인.

**Phase 1 목업 영향**

- 실제 테이블은 Phase 2+. Phase 1은 `sessionStorage` 스토어(`clansync-mock-notifications-v1`)로 흉내낸다.
- 벨 배지 카운트·드로워 UI·읽음 상태만 시연. 소스 링크 이동은 placeholder alert.

### web_push_subscriptions (브라우저 푸시 구독 · D-NOTIF-02)
> **D-NOTIF-02** (DECIDED 2026-04-21) — ServiceWorker + Web Push API 기반 브라우저 푸시 구독 저장소. **Premium 전용**으로 발송하지만 Free 사용자 구독 자체는 허용(과금 경계는 발송 시점에서 `users.plan` 체크). 한 사용자 N 디바이스 허용. 구독 해지는 soft(`revoked_at`) — 재구독 시 새 행 INSERT하여 히스토리 보존. 상세 [§D-NOTIF-02](./decisions.md#d-notif-02--브라우저-서비스워커-웹-푸시-도입-정책-프리셋-α).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK DEFAULT gen_random_uuid() | |
| user_id | uuid NOT NULL FK → users ON DELETE CASCADE | 구독 소유자 |
| endpoint | text NOT NULL | Push Service URL (FCM·APNs Web·Mozilla autopush 등). Web Push API 반환값 |
| p256dh | text NOT NULL | 클라 공개 키(base64url, ECDH P-256) — 페이로드 암호화용 |
| auth | text NOT NULL | 클라 auth 시크릿(base64url, 16바이트) |
| user_agent | text NULL | 구독 시 User-Agent. 관리 UI에서 "Chrome on Windows" 등으로 구분 표시 |
| created_at | timestamptz NOT NULL DEFAULT now() | |
| revoked_at | timestamptz NULL | soft delete. NULL = 활성 구독. 재구독 시 새 행 INSERT |

**제약·RLS**

- UNIQUE `(user_id, endpoint) WHERE revoked_at IS NULL` — 동일 디바이스 중복 활성 구독 방지. revoked 행은 히스토리로 남아 중복 허용.
- 인덱스: `CREATE INDEX web_push_subscriptions_active ON web_push_subscriptions (user_id) WHERE revoked_at IS NULL;` — 발송 시 활성 구독 조회.
- RLS:
  - SELECT: `user_id = auth.uid()` (본인 디바이스 목록만).
  - INSERT/UPDATE: `user_id = auth.uid()` (본인만 구독 등록·해지).
  - DELETE: 서비스 롤 전용(410 Gone 정리 cron). 사용자 UI의 "이 디바이스 로그아웃"은 `revoked_at = now()` UPDATE로 처리.
- 410 Gone 응답 자동 처리 트리거 예시 (서버 워커에서 발송 실패 시 호출):
  ```sql
  CREATE OR REPLACE FUNCTION revoke_web_push_subscription(sub_id uuid)
  RETURNS void AS $$
    UPDATE web_push_subscriptions
    SET revoked_at = now()
    WHERE id = sub_id AND revoked_at IS NULL;
  $$ LANGUAGE sql SECURITY DEFINER;
  ```

**발송 플로우 연동 (Phase 2+)**

```
notifications INSERT (D-NOTIF-01 트리거)
  └─ users.plan = 'premium' 이고 카테고리 구독 ON 이면
       └─ SELECT * FROM web_push_subscriptions
             WHERE user_id = recipient AND revoked_at IS NULL
             └─ 각 활성 구독 행별 notification_log INSERT
                 (channel='web_push', status='scheduled',
                  scheduled_at = quiet hours 보정 후)
             └─ 서버 워커가 status='scheduled'를 pull하여 web-push 패키지로 발송
                 ├─ 성공 → status='sent', effective_at=now()
                 ├─ 실패(410 Gone) → revoke_web_push_subscription(sub.id), status='failed'(DLQ 생략)
                 └─ 기타 실패 → 지수 백오프 5회(D-EVENTS-03 동일) 후 DLQ
```

**Phase 1 목업 영향**

- 목업에는 테이블 없음. 벨 드로워 상단에 **inert 예고 배너**(`"🔔 브라우저 알림은 Premium 전용 · Phase 2+ 예정"`) 한 줄만 (범위 R3).
- VAPID 키·ServiceWorker 등록·권한 프롬프트 전부 Phase 2+ 구현.

### store_items
> **D-STORE-01 / D-ECON-01** (DECIDED 2026-04-20) — `item_type` 과 `pool_source` 는 1:1 매핑(`clan_deco`⇒`clan`, `profile_deco`⇒`personal`). Premium 카드는 `is_premium_only=true`. [decisions.md §D-STORE-01](./decisions.md#d-store-01--코인-적립차감-트리거-매트릭스).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| item_type | enum('clan_deco','profile_deco') NOT NULL | |
| pool_source | enum('clan','personal') NOT NULL | 구매 시 차감되는 풀. `clan_deco⇒clan`, `profile_deco⇒personal` 고정 |
| game_id | uuid FK → games NULL | null = 게임 공통 |
| name_ko | varchar NOT NULL | |
| price_coins | int NOT NULL CHECK (price_coins > 0) | 코인 가격 |
| asset_url | varchar | 서비스 호스팅 정적 에셋 경로 (사용자 업로드 금지) |
| is_premium_only | boolean NOT NULL DEFAULT false | Premium 플랜 전용 카드 — Free는 비활성 표시 |
| is_active | boolean NOT NULL DEFAULT true | 판매 중단 시 false (기존 보유자는 계속 사용) |
| released_at | timestamptz NOT NULL DEFAULT now() | 진열 시각 |

**제약**

- `CHECK ((item_type='clan_deco' AND pool_source='clan') OR (item_type='profile_deco' AND pool_source='personal'))` — 개인↔클랜 풀 이전 경로 차단.
- `asset_url`은 **서비스가 호스팅하는 정적 에셋**만 가리킨다. **사용자 업로드 이미지를 저장하는 용도는 사용하지 않는다**(프로필·밸런스 네임플레이트는 전부 사측 제공 프리셋 — PRD 「꾸미기 에셋 정책」).

### purchases
> **D-STORE-01 / D-ECON-02** (DECIDED 2026-04-20) — `pool_source` 와 `approved_by` 로 클랜 풀 지출 감사. [decisions.md §D-ECON-02](./decisions.md#d-econ-02--코인-세탁-방지-정책).  
> **D-STORE-03** (DECIDED 2026-04-20) — 환불 없음 원칙 + 시스템 오류 자동 롤백 + 운영자 재량 정정. `voided_at`·`voided_by`·`void_reason` 으로 무효화 표시(행 삭제는 금지). [decisions.md §D-STORE-03](./decisions.md#d-store-03--환불되돌리기-정책).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users NOT NULL | 구매 실행자 (개인 구매자 또는 클랜 풀 지출 실행 운영진) |
| clan_id | uuid FK → clans NULL | 클랜 풀 구매 시 대상 클랜, 개인 구매는 NULL |
| item_id | uuid FK → store_items | |
| pool_source | enum('clan','personal') NOT NULL | 어느 풀에서 차감했는지 (store_items.pool_source 와 동일해야 함) |
| price_coins | int NOT NULL | 구매 시점 가격 스냅샷 (`store_items.price_coins` 변동 대비) |
| coin_transaction_id | uuid FK → coin_transactions UNIQUE | 이 구매로 생성된 차감 거래 |
| approved_by | uuid FK → users NULL | **D-ECON-02** 클랜 풀 1회 500 이상 지출 시 추가 승인자 (Phase 2+). Phase 1은 항상 NULL |
| **voided_at** | timestamptz NULL | **D-STORE-03** 무효화(정정) 시각. NULL = 정상 구매 |
| **voided_by** | uuid FK → users NULL | **D-STORE-03** 무효 처리한 운영자. `voided_by = user_id` 인 행은 INSERT 금지(자기 계정 정정 차단) |
| **void_reason** | text NULL | **D-STORE-03** 무효 사유(`system_rollback`·`price_correction`·`account_takeover`·`item_defect`·`policy_violation`). `voided_at IS NOT NULL` 이면 NOT NULL |
| purchased_at | timestamptz NOT NULL DEFAULT now() | |

**제약·RLS**

- `CHECK ((pool_source='clan' AND clan_id IS NOT NULL) OR (pool_source='personal' AND clan_id IS NULL))`.
- `CHECK (pool_source = (SELECT pool_source FROM store_items WHERE id = item_id))` (또는 트리거로).
- `CHECK ((voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL) OR (voided_at IS NOT NULL AND voided_by IS NOT NULL AND void_reason IS NOT NULL))` — 무효화 필드는 all-or-nothing (D-STORE-03).
- `CHECK (voided_by IS NULL OR voided_by <> user_id)` — 운영자 자기 계정 정정 차단 (D-STORE-03).
- 무효 처리 시 **반드시 반대 부호 `coin_transactions` 행**을 `correction_of=coin_transaction_id` 로 INSERT(서비스 레이어 트랜잭션 강제). 한 구매당 유효 정정 거래는 **최대 1건**.
- RLS:
  - SELECT: 본인 개인 구매 + 운영진+가 자기 클랜의 클랜 풀 구매 + 운영자(관리자 role)는 전체.
  - INSERT: **서비스 롤만**(서버가 잔액 검증·coin_transactions INSERT·에스크로 체크·2-man rule 검증을 한 트랜잭션으로 수행).
  - UPDATE: `voided_at`·`voided_by`·`void_reason` 세 컬럼만 서비스 롤이 1회 UPDATE 가능(정상→무효 전이). 무효→정상 복구 UPDATE 금지(정정의 정정은 새 트랜잭션으로).
  - DELETE: **전면 차단**.

---

## 클랜 순위·통계 지표 (승률 등 경쟁 지표 제외)

> **D-ECON-03** (DECIDED 2026-04-20) — 외부 공개 순위표에서 경쟁 지표(승률·K/D·MVP 수 등) 전면 제외. 공개 지표는 활동성·규모·매너·이벤트 참여만. 경쟁 지표는 **운영진+ 내부 화면**(클랜 관리·HoF·내전 히스토리)에만. [decisions.md §D-ECON-03](./decisions.md#d-econ-03--클랜-순위표-민감-지표-노출-범위).

아래 지표는 `matches` + `match_players` + `clan_members`로 집계한다.  
**경기 시각**은 `matches.played_at`(timestamptz) 기준이며, UI·랭킹 집계 시 **표시 타임존**(예: KST)을 정해 시간대별 히스토그램에 사용한다.

### 노출 정책 (D-ECON-03)

| 지표군 | 외부 순위표 | 클랜 상세(외부 열람) | 클랜 관리(운영진+) |
|--------|:---:|:---:|:---:|
| 활동성(활성 비율·스크림 건수) | ✓ | ✓ | ✓ |
| 규모(인원수) · 매너(스크림 평점) · 이벤트 참여 | ✓ | ✓ | ✓ |
| 내전 경기 수 | ✗ | ○ (클랜 설정 토글) | ✓ |
| 내전 승률 · 개인 승률 · MVP 랭킹 · K/D | ✗ | ✗ | ✓ |
| HoF 기록 | ✗ | ○ (클랜장 공개 토글) | ✓ |

- `✗` 지표는 **API 응답 자체에 포함하지 않는다**(서버 레벨 필터링).
- `○` 지표는 `clan_settings.expose_competitive_metrics boolean DEFAULT false`(Phase 2+)로 제어.
- `clans.moderation_status IN ('warned','hidden','deleted')` 또는 `lifecycle_status='dormant'` 클랜은 외부 순위표 완전 제외.

### 1) 이번달 활성 유저 비율 (%)

**정의:** 해당 월에 **내전 또는 스크림**에 1회 이상 참여 기록이 있는 **고유 구성원 수** ÷ **클랜 등록 전체 구성원 수** × 100.

| 항목 | 소스·조건 |
|------|-----------|
| 분자 (고유 인원) | `match_players.user_id`의 `DISTINCT` 개수. 조인: `matches.id = match_players.match_id`, `matches.clan_id = 대상 클랜`, `matches.match_type IN ('intra','scrim')`, `matches.played_at`이 해당 달(캘린더 월)에 포함, `matches.status = 'finished'`(기록 확정된 경기만 집계 권장). |
| 분모 (전체 구성원) | `clan_members`에서 `clan_id = 대상 클랜`이고 **`status = 'active'` AND `last_activity_at >= NOW() - INTERVAL '60 days'`** 인 행 수. **D-CLAN-07** 적용: 활성+비활성 멤버만 분모에 포함, 휴면 멤버(60일+ 무활동)는 제외. 대기·탈퇴·차단은 status로 제외. |

**비고:**
- 분모가 0이면 비율은 null 또는 표시 생략.
- **D-CLAN-07 정합**: 휴면 멤버를 분모에서 제외함으로써 200명 클랜에서도 활성 비율이 의미 있는 값으로 산출됨.
- 스크림이 타 클랜과의 경기인 경우에도 **우리 클랜 소속으로 `match_players`에 올라간 인원만** 해당 클랜의 분자에 포함된다고 가정(스키마상 `matches.clan_id`가 주최 클랜인지 전역 설계에 맞게 한 번 더 확정 필요).

### 2) 최다 참여 구성원 순위 (내전 참여 횟수 기반)

**정의:** 집계 기간(예: 당월 또는 롤링 30일) 동안 **`match_type = 'intra'`**인 경기에 `match_players`로 참여한 **횟수 합**이 큰 순.

| 항목 | 소스·조건 |
|------|-----------|
| 카운트 | `matches` ∩ `match_players`에서 `match_type = 'intra'`, `status = 'finished'`, 기간 필터. 동일 경기에 양 팀 모두 기록되면 행 수만큼 합산(한 경기 = 1회 참여로 카운트). |
| 범위 | **「전체 클랜원 통틀어」**는 게임 단위 글로벌 랭킹으로 정의: `matches.game_id = :gameId`로 한정하고, 클랜 무관하게 `user_id`별 합산 후 순위. 클랜 **내부** 랭킹만 필요하면 `matches.clan_id = :clanId`를 추가로 필터. |

**비고:** 닉네임 표시는 `users` 조인. 동점 시 `user_id` 사전순 등 타이브레이크 규칙을 정한다.

### 3) 주간 가장 내전 진행이 많이 된 시간대

**정의:** 입력된 **내전** 기록(`match_type = 'intra'`)만 사용. **최근 1주**(또는 ISO 주차) 구간에서 `played_at`을 표준 타임존으로 변환한 **시(hour) 0~23**별 건수를 세고, **건수가 최대인 시간대**를 표시(동점이면 복수 표시 또는 가장 이른 시각).

| 항목 | 소스·조건 |
|------|-----------|
| 집계 | `matches`에서 `clan_id`(클랜 대시보드용) 또는 `game_id`(게임 전체용), `match_type = 'intra'`, `status = 'finished'`, `played_at`이 주간 윈도우 내. `date_trunc('hour', played_at AT TIME ZONE 'Asia/Seoul')` 등으로 시간 버킷. |
| 표시 | 예: **「이번 주 가장 많이 진행된 시간대: 21시~22시」** 또는 막대 차트로 0~23 분포. |

---

### (선택) 집계 캐시 테이블

배치·뷰로 매월/매주 갱신해 조회 비용을 줄일 수 있다.

#### clan_monthly_metrics (예시)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_id | uuid FK → clans | |
| year_month | varchar | `YYYY-MM` |
| member_total | int | 분모용 활성+비활성 멤버 수 (D-CLAN-07: 휴면 제외) |
| active_distinct_month | int | 분자용 고유 참여자 수 |
| active_ratio | numeric(5,2) | 활성 유저 비율 (%) |
| updated_at | timestamptz | |

`UNIQUE(clan_id, year_month)`

#### user_intra_participation_monthly (예시, 글로벌 랭킹용)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| game_id | uuid FK → games | |
| user_id | uuid FK → users | |
| year_month | varchar | |
| intra_count | int | 해당 월 내전 참여 횟수 |
| updated_at | timestamptz | |

`UNIQUE(game_id, user_id, year_month)`

인덱스 권장: `matches (clan_id, played_at, match_type)`, `matches (game_id, played_at, match_type)`, `match_players (user_id, match_id)`.

---

## 문의 (Contact)

### contact_requests
> **D-LANDING-03** (DECIDED 2026-04-20) — `/contact` 폼 제출 저장소. Anonymous 제출 허용(`user_id` NULL 가능), 제출 시 `ip_hash` · rate limit · Captcha 검증은 서비스 레이어에서 수행. 운영자 관리자 콘솔(Phase 2+)에서 열람·답변. [decisions.md §D-LANDING-03](./decisions.md#d-landing-03--약관개인정보api-tos문의-페이지-구현-방식).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users NULL | 로그인 상태에서 제출 시 자동 연결. 비로그인은 NULL |
| email | citext NOT NULL | 답변 수신 이메일 |
| category | enum('account','payment','bug','policy','other') NOT NULL | 문의 유형 |
| title | varchar(120) NOT NULL | 최대 120자 |
| body | text NOT NULL | 최대 4000자(CHECK 권장) |
| clan_id | uuid FK → clans NULL | 관련 클랜(선택). 로그인 사용자는 소속 클랜에서 자동 추론 |
| status | enum('open','in_progress','resolved','spam','deleted') DEFAULT 'open' | 처리 상태 |
| assigned_to | uuid FK → users NULL | 담당 운영자 |
| ip_hash | bytea NULL | SHA-256(ip + salt). rate limit·악성 추적용, 원본 IP 비저장(개인정보 최소화) |
| user_agent | text NULL | 봇·기기 식별용 |
| created_at | timestamptz NOT NULL DEFAULT now() | |
| resolved_at | timestamptz NULL | `status='resolved'` 전이 시 기록 |

**제약·인덱스·RLS**

- `CHECK (char_length(title) <= 120)` · `CHECK (char_length(body) BETWEEN 1 AND 4000)`.
- `CREATE INDEX ON contact_requests (status, created_at DESC)` — 관리자 콘솔 큐 조회.
- `CREATE INDEX ON contact_requests (email, created_at DESC)` — rate limit 조회.
- RLS:
  - INSERT: **서비스 롤만**(Server Action이 Captcha + rate limit 검증 후 INSERT). Anonymous·일반 사용자 직접 INSERT 차단.
  - SELECT: 본인 제출(`user_id = auth.uid()`) + 운영자 role.
  - UPDATE: 운영자 role만(`status`·`assigned_to`·`resolved_at` 변경).
  - DELETE: 차단. `status='deleted'` 로 soft delete만.

### contact_rate_limits (Phase 2+ 메모)
> rate limit 체크용 경량 테이블. Redis 사용 가능하면 Redis 우선, 아니면 이 테이블로 fallback.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| key | text PK | `email:<hash>` 또는 `ip:<hash>` |
| hits | int NOT NULL DEFAULT 0 | 24h 슬라이딩 카운트 |
| first_hit_at | timestamptz NOT NULL | 24h 윈도우 시작 |
| last_hit_at | timestamptz NOT NULL | |

- INSERT: 서비스 롤만. 정책: 이메일당 24h 5회·IP당 24h 20회 초과 시 제출 거절.
