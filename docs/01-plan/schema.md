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
> **D-MANAGE-02 / D-MANAGE-03** (DECIDED 2026-04-20) — 운영진에게 허용할 액션 범위를 클랜 단위로 토글. [decisions.md §D-MANAGE-02](./decisions.md#d-manage-02--구성원-개인-상세-편집-권한과-m점수-토글), [§D-MANAGE-03](./decisions.md#d-manage-03--부계정-조회-정책과-공개-범위-토글).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| clan_id | uuid PK FK → clans | 1:1 — 클랜 생성 시 DEFAULT 로우 자동 생성 |
| **allow_officer_edit_mscore** | boolean NOT NULL DEFAULT **false** | `false`=M점수 편집은 leader만, `true`=officer도 편집 가능. leader만 변경 가능 |
| **alt_accounts_visibility** | text NOT NULL DEFAULT **'officers'** CHECK (alt_accounts_visibility IN ('officers','clan_members')) | 같은 클랜 내 부계정 조회 범위. 기본 운영진+만, leader가 'clan_members'로 전환하면 모든 활성 구성원 공개 |
| updated_at | timestamptz | |
| updated_by | uuid FK → users NULL | 마지막 변경자 (감사용) |

**RLS 메모**

- SELECT: 같은 클랜 소속 모든 활성 멤버에게 허용 (UI에 현재 정책을 표시해야 하므로).
- UPDATE: `role = 'leader'` 인 자기 클랜 멤버만 허용.

**감사 로그**

- 토글 변경은 `clan_member_audit_log`에 `action='clan_settings.update'`, `before`/`after` JSONB로 기록 (Phase 2 상세 설계).

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

### clan_events (일정)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_id | uuid FK → clans | |
| title | varchar | |
| event_type | enum('intra','scrim','event') | |
| scheduled_at | timestamptz | |
| created_by | uuid FK → users | |

### scrim_rooms (스크림 채팅방)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_a_id | uuid FK → clans | |
| clan_b_id | uuid FK → clans | |
| status | enum('open','closed') | 스크림 종료 시 closed |
| created_at | timestamptz | |
| closed_at | timestamptz | |

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
