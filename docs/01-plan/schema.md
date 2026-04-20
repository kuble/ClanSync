# ClanSync 데이터 스키마

> Supabase (PostgreSQL) 기반. RLS 모든 테이블 적용 필수.

---

## 핵심 엔티티 관계도

```
User ──< UserGameProfile >── Game
User ──< ClanMember >── Clan
User ──< ClanJoinRequest >── Clan         -- 가입 신청 (D-CLAN-02)
User ──< ClanReport >── Clan              -- 신고 (D-CLAN-03)
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
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | auth.users 연동 |
| nickname | varchar(20) UNIQUE NOT NULL | 닉네임 |
| email | varchar UNIQUE NOT NULL | 이메일 |
| language | enum('ko','en','ja') | 언어 설정 |
| auto_login | boolean DEFAULT false | 자동 로그인 |
| created_at | timestamptz | 가입일 |
| updated_at | timestamptz | 수정일 |

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

### coin_transactions
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_id | uuid FK → clans | |
| user_id | uuid FK → users | null = 클랜 풀 거래 |
| pool_type | enum('clan','personal') | |
| amount | int NOT NULL | 양수=지급, 음수=차감 |
| reason | varchar | 지급/차감 사유 |
| created_at | timestamptz | |

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
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| item_type | enum('clan_deco','profile_deco') | |
| game_id | uuid FK → games | null = 게임 공통 |
| name_ko | varchar | |
| price_coins | int | 코인 가격 |
| asset_url | varchar | |

**꾸미기(`profile_deco` 등):** `asset_url`은 **서비스가 호스팅하는 정적 에셋**만 가리킨다. **사용자 업로드 이미지를 저장하는 용도는 사용하지 않는다**(프로필·밸런스 네임플레이트는 전부 사측 제공 프리셋 — PRD 「꾸미기 에셋 정책」).

### purchases
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users | |
| clan_id | uuid FK → clans | null = 개인 구매 |
| item_id | uuid FK → store_items | |
| purchased_at | timestamptz | |

---

## 클랜 순위·통계 지표 (승률 등 경쟁 지표 제외)

아래 지표는 `matches` + `match_players` + `clan_members`로 집계한다.  
**경기 시각**은 `matches.played_at`(timestamptz) 기준이며, UI·랭킹 집계 시 **표시 타임존**(예: KST)을 정해 시간대별 히스토그램에 사용한다.

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
