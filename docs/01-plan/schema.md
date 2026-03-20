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
| played_at | timestamptz | 경기 시각 |
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
