# ClanSync 데이터 스키마

> Supabase (PostgreSQL) 기반. RLS 모든 테이블 적용 필수.

---

## 핵심 엔티티 관계도

```
User ──< UserGameProfile >── Game
User ──< ClanMember >── Clan
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

### clans
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| game_id | uuid FK → games | |
| name | varchar(30) NOT NULL | 클랜명 |
| description | text | 클랜 소개 (선택) |
| rules | text | 클랜 규칙 (선택) |
| tags | text[] | ['친목', '경쟁'] 등 |
| age_range | varchar | '20대', '전연령' 등 |
| gender_policy | enum('all','male','female') | |
| max_members | int DEFAULT 30 | |
| discord_url | varchar | (선택) |
| kakao_url | varchar | (선택) |
| is_active | boolean DEFAULT true | |
| created_at | timestamptz | |

### clan_members
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| clan_id | uuid FK → clans | |
| user_id | uuid FK → users | |
| role | enum('leader','officer','member') | 권한 |
| status | enum('pending','active','left','banned') | 가입 상태 |
| joined_at | timestamptz | 가입 승인일 |
| last_participated_at | timestamptz | 최근 참여일 |
| UNIQUE(clan_id, user_id) | | |

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
| 분모 (전체 구성원) | `clan_members`에서 `clan_id = 대상 클랜`이고 **`status = 'active'`**인 행 수(가입 승인·활동 중인 멤버만). 대기·탈퇴·차단은 제외. |

**비고:** 분모가 0이면 비율은 null 또는 표시 생략. 스크림이 타 클랜과의 경기인 경우에도 **우리 클랜 소속으로 `match_players`에 올라간 인원만** 해당 클랜의 분자에 포함된다고 가정(스키마상 `matches.clan_id`가 주최 클랜인지 전역 설계에 맞게 한 번 더 확정 필요).

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
| member_total | int | 분모용 활성 멤버 수 |
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
