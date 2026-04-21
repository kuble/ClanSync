# 08 MainGame · 메인 게임 허브

## 한 줄 요약
"이 게임" 전체에서 다른 클랜·플레이어와 만나는 커뮤니티 허브. 홍보 / LFG / 스크림 / 순위 / 인사이트가 한 곳에 모인다.

## 누가 / 언제 본다
- 로그인 + 해당 게임 인증 사용자.
- 클랜 메인 사이드바 하단 "커뮤니티" 클릭, 또는 외부 링크/검색.

## 화면 진입 조건
- 로그인 + 게임 인증 (= 라우트 가드 2단계).
- 클랜 미소속이어도 진입 가능 (홍보·랭킹 탐색용).

## 사용자 흐름

### 5개 탭으로 구성된 단일 페이지

```
[홈]  [클랜 홍보]  [같이 할 사람]  [스크림]  [클랜 순위]
  │       │             │            │           │
  │       │             │            │           └─ 클랜/개인/인사이트 서브탭
  │       │             │            └─ 모집 등록 / 일자별 카드 / 채팅
  │       │             └─ 모집 등록 / 신청
  │       └─ 카드 → 드로어 → 가입 신청
  └─ 각 탭 미리보기
```

> 스크림 평판(Scrim Reputation) 탭은 목업에 **존재하지 않는다**. 기획에 있다면 신설 결정 필요.

## 화면 구성 (셸)

```
[Navbar]   ← 클랜 메인과 같은 셸 (햄버거 / 브레드크럼 / 프로필)

[Sidebar]
  · 홈
  · 클랜 홍보
  · 스크림 모집
  · 같이 할 사람
  · 클랜 순위
  ─── 하단 ───
  · 클랜 페이지   → main-clan.html
  · 프로필        → /profile

[본문]
  탭별 섹션 (sec-home / sec-promo / sec-scrim / sec-lfg / sec-ranking)
  탭 전환 시 한 섹션만 display:block, 나머지는 숨김
```

## 탭 1 — 홈

### 한 줄
다른 4개 탭의 미리보기를 한 화면에 모아 빠른 진입을 돕는다.

### 영역
| 영역 | 내용 |
|------|------|
| 클랜 홍보 미리보기 | 카드 그리드 (Premium 클랜은 ✓ 뱃지 + 툴팁) |
| 스크림 모집 미리보기 | 모집 중인 스크림 최대 3행. 클릭 → 스크림 탭 |
| 같이 할 사람 미리보기 | 최대 4행. 카드 클릭 → LFG 드로어 |
| 순위 미리보기 | 상위 3 + (내 클랜이 3위 밖이면) "내 클랜" 행 강조 |

### 액션
- 각 미리보기 우상단 "전체 보기" → 해당 탭으로 이동.
- 행 클릭 동작은 각 탭의 카드 클릭과 동일.

### 빈 상태
- 각 영역별로 "표시할 내용이 없습니다" 카피 (운영 시 통일).

## 탭 2 — 클랜 홍보 (Promotion)

### 한 줄
다른 클랜이 모집 글을 띄우고, 사용자는 마음에 드는 클랜에 가입 신청을 보낼 수 있는 게시판.

### 영역
- 필터 칩: 모집 / 지향 / 포지션 / 티어 / 기타 — `data-pg="recruit|style|pos|tier|etc"`
- 활성 필터 태그 영역 (제거 가능)
- 카드 그리드 (clan-auth와 동일 카드 컴포넌트 공유 권장)
- 클릭 → 우측 드로어 → "가입 신청하기 →" → 가입 모달

### 모달·드로어
- **홍보 드로어** `#promoDrawer`: 홍보글 / 클랜 규칙 / 모집 포지션 / 티어대 / 클랜 배지 / 외부 링크(Discord)
- **가입 모달** `#joinModal`: 자기소개(선택) → "가입 신청 완료!" alert (목업).
  - 운영 시: `clan-auth`의 가입 모달과 동일한 컴포넌트·상태 머신 공유 (D-CLAN-02).

### 정렬 (D-RANK-01 DECIDED 2026-04-21)
- `setPromoSort('newest' | 'space')` 2종만. **"인기" 정렬 폐기** — 조회수 필드 부재 + 외부 경쟁 유인 차단(D-ECON-03 정합) + 가입 신청 자체가 인기 측정.
- HTML 정렬 select UI는 Phase 2+에 추가. Phase 1은 현행대로 코드 분기만 존재.
- Phase 2+ 후보: **활성도** (`clans.activity_pct_30d` desc — D-CLAN-07 의존), **여유 있음** (`(max-now)` desc).
- 상세: [decisions.md §D-RANK-01](../decisions.md#d-rank-01--클랜-홍보-인기-정렬-폐기).

### Premium 표시
- `pinned === true`인 클랜에 ✓ 뱃지 + 툴팁 ("✦ Premium 구독 클랜").
- (정책 결정) 검색 결과 상단 고정 노출.

## 탭 3 — 같이 할 사람 (LFG: Looking For Group)

### 한 줄
"지금 같이 게임할 사람" 즉석 모집판. 본인이 모집 글을 올리거나, 다른 사람의 모집에 참여 신청.

### 필터
| 항목 | 옵션 |
|------|------|
| 모드 | 전체 / 경쟁전 / 빠른대전 / 아케이드 |
| 구분 | 5vs5 / 6vs6 |
| 티어 (다중) | 전체, 또는 브론즈 ~ 그랜드마스터 |
| 역할 | 올포지 / 탱커 / 딜러 / 힐러 |
| 마이크 | 자유 / 필수 |

### 카드 (LFG 카드)
- 닉 (+ "내 모집" 표시)
- 포지션 태그
- 한마디 2줄 클램프
- 우측 모드/티어 아이콘
- 푸터: "N시 시작 · M시간 후 마감"
- 마이크 표시 🎙필수 / 🔇자유
- 내 모집은 "취소" 버튼 노출, 타인 모집은 클릭 시 드로어

### 모달·드로어
- **모집 등록 모달** `#lfgPostModal` — "파티 모집 올리기"
  - 게임 모드 / 구분 / 희망 티어(다중) / 내 역할 / 시작 시각 / 만료 / 마이크 / 한마디
- **참여 신청 모달** `#lfgApplyModal` — 본인 티어/역할/마이크 칩 확인 → "참여 신청"
- **상세 드로어** `#lfgDrawer` — 헤더(닉·역할), 모집 정보, 한마디, 푸터(내 모집: "모집 취소" / 타인: "참여 신청하기 →")

### 액션 동작
- "+ 모집 올리기" → `#lfgPostModal`
- 카드 클릭 (타인) → `#lfgDrawer`
- 카드 "취소" (내 모집) → 즉시 취소
- 드로어 "참여 신청하기 →" → `#lfgApplyModal`
- 모달 "참여 신청" → `lfg_applications` INSERT (`status='applied'`) → 본인 카드/드로어에 "신청됨" 배지 즉시 반영 (D-LFG-01).
- 신청 후 본인 드로어/카드 → "신청 취소" 버튼 (`status='canceled'`).
- 모집자 측 드로어 → 신청자 목록 섹션(닉/티어/포지션/마이크 + 수락/거절). 수락 시 `slots` 도달하면 자동 `filled`.

### 빈 상태
- "조건에 맞는 파티가 없습니다" `.empty-state`

### 신청 상태 UI (D-LFG-01 DECIDED 2026-04-21)

| 상태 | 신청자 카드 배지 | 신청자 드로어 카피 | 모집자 카드 |
|------|-------------------|---------------------|--------------|
| `applied` | "신청됨"(파랑) | "참여 신청 접수됨 · 모집자 응답 대기 중" + 취소 버튼 | "신청자 N명" 카운트 |
| `accepted` | "수락됨"(초록) | "수락되었습니다! 모집자에게 직접 연락해 주세요." | 신청자 목록에서 "수락됨" 표시 |
| `rejected` | "거절됨"(회색·24h 후 미표시) | "이번에는 거절되었습니다. 다른 모집을 찾아보세요." | 신청자 목록에서 "거절됨" 표시 |
| `canceled` | (배지 미표시) | (드로어 진입 시 배지 없음) | 카운트 자동 감소 |
| `expired` | (배지 미표시) + in-app 알림 1회 | "모집이 마감되어 신청이 자동 만료되었습니다." | 모집 글 자체가 `expired` 상태로 카드 흐림 처리 |

- 헤더 우측 "내 신청 N건" pill — 클릭 시 `#lfgApplicationsModal` (Phase 2+).
- **중복 신청 방지**: 본인이 `applied` 상태인 글은 "신청" 버튼이 비활성. `lfg_applications` 부분 UNIQUE 인덱스 `(post_id, applicant_user_id) WHERE status='applied'`.
- 상세: [decisions.md §D-LFG-01](../decisions.md#d-lfg-01--lfg-신청-상태-ui와-수락-플로우), [schema.md §lfg_applications](../schema.md#lfg_applications-lfg-신청--d-lfg-01).

## 탭 4 — 스크림 (Scrim)

### 한 줄
다른 클랜과 연습 경기를 잡는 일정 게시판. 일자별로 카드를 띄우고, 양쪽 운영진이 채팅에서 합의·확정.

### 필터
| 항목 | 옵션 |
|------|------|
| 상태 | 전체 / 모집 중 / 모집 완료 |
| 티어 (다중) | 전체, 또는 티어별 |

### 캘린더 / 일자별 목록
- `#scrimDayList` — 날짜 패널 + 카드 리스트
- 카드: 듀얼 아바타(vs 확정 시), 제목 또는 "A vs B", "클랜원 N명", 칩(시간·티어·모드), "클릭하여 상세 정보 · 채팅"

### 모달·드로어
- **신청/수정 모달** `#scrimApplyModal`
  - 날짜 / 시간 / 모드(5v5 · 6v6 · 혼합)
  - 이중 레인지 슬라이더 — 티어 하한·상한 + 라벨
  - 메모(textarea)
  - 신청 또는 저장
- **상세 드로어** `#scrimDrawer`
  - 정식 일시 / 모드 / 티어 / 설명
  - 내 모집인 경우: 채팅방 목록 + "열기"
  - 비소유 시 "채팅방 열기" 또는 성사 불가 안내
- **채팅 모달** `#scrimChatModal`
  - 세션 종료 카피
  - 참가 섹션: 확정 / 대기 UI
  - 입력·전송은 목업에서 비활성

### 권한 분기
- 내 모집 + 모집 중 + 역할이 운영진/클랜장일 때만 "편집" 버튼 활성 (`scrimCanEditAsOfficer`).
- 양측 운영진이 채팅에서 "확정"을 누르면 alert + 모집 완료로 전환.

### 상태 머신 (D-EVENTS-01 DECIDED)

```
draft ──► matched ──► confirmed ──► finished
   │          │            │
   └──────────┴────────────┴──► cancelled
                         │
                  (cancelled → confirmed 재확정 허용)
```

- `scrim_rooms.status` enum: `'draft'|'matched'|'confirmed'|'cancelled'|'finished'` (Phase 2+).
- `confirmed` 전환 시점에 **양쪽 클랜의 `clan_events`에 자동 INSERT** (`source='scrim_auto'`, 멱등 키 `(clan_id, scrim_id)`).
- 시간·장소·제목 수정은 **스크림 본체에서만** 가능 — 자동 생성된 이벤트는 읽기 전용. 양쪽 이벤트로 동기화.
- 취소 시 양쪽 이벤트 `cancelled_at` 세팅 (행 삭제 금지), 재확정 시 복원.
- Server Action (주 경로) + PG 트리거 `clan_events_sync_from_scrim()` (안전망) 2중 방어.
- 상세 → [decisions.md §D-EVENTS-01](../decisions.md#d-events-01--스크림-확정--클랜-이벤트-자동-생성동기화), [11-Clan-Events.md §스크림 연동](./11-Clan-Events.md).

### 자동 매칭
- 별도 "자동 매칭 모달" 없음. 채팅방의 "경기 시작 +6시간 후 자동 종료" 타이머만 존재.
- 운영 시 자동 매칭 버튼 도입 여부는 별도 결정 필요(현재 결정 코드 없음).

### 채팅방 자동 종료 매트릭스 (D-SCRIM-01 DECIDED 2026-04-21)

| `scrim_rooms.status` | 자동 종료 시점 | 종료 사유 카피 |
|----------------------|----------------|----------------|
| `draft` (모집 중·매칭 전) | 별도 자동 종료 없음 | 모집 글 만료(`expires_at`) 시 함께 닫힘 |
| `matched` (한쪽만 확정 또는 협상 중) | `scheduled_at + 6h` | "경기 시작 시각으로부터 6시간 경과" |
| `confirmed` (양측 확정) | `scheduled_at + 6h` | "경기 시작 시각으로부터 6시간 경과" |
| `cancelled` | `cancelled_at + 1h` | "스크림이 취소되었습니다" |
| `finished` | `finished_at + 24h` | "경기 결과 정리 마감" |

- **운영자 수동 종료**: `confirmed` 또는 `matched` 상태에서 양측 운영진 누구나 가능. `closed_by`·`closed_reason='manual'` 기록.
- **재개(reopen)**: 종료 후 24h 이내, 양측 운영진 모두 동의 시(2-man) 가능. Phase 2+ 기능.
- **알림**: `closed_at - 1h` 시점 in-app 1회 + 종료 시 in-app 1회. Discord 미사용(소음 방지).
- 상세: [decisions.md §D-SCRIM-01](../decisions.md#d-scrim-01--스크림-채팅방-자동-종료-정책).

### 양측 확정 2-phase commit (D-SCRIM-02 DECIDED 2026-04-21)

```
한쪽 확정 → scrim_room_confirmations(side='host' or 'guest') INSERT (status='matched' 유지)
다른 쪽 확정 → 두 번째 행 INSERT → 트리거가 status='confirmed' UPDATE + confirmed_at=now()
                                  → D-EVENTS-01: clan_events 양쪽 클랜에 자동 INSERT
```

- **일정·장소·모드 변경 → 자동 무효화**: `scheduled_at`/`mode`/`tier_min`/`tier_max`/`place` 중 하나라도 변경되면 트리거 `scrim_rooms_invalidate_confirmations()`가 모든 confirmation 행 DELETE + `status='matched'` + `confirmed_at=NULL`. 변경자 본인도 confirmation 미보유 상태로 시작 → 양측 모두 다시 "확정" 눌러야 함.
- UI 안내 카피: "일정을 변경하셨습니다. 양측 모두 다시 확정해 주세요."
- **타임아웃**: 한쪽만 확정한 상태에서 `scheduled_at - 1h`까지 다른 쪽이 확정 안 하면 cron이 `status='cancelled'` 자동 전이 + 양측 알림. 이후 재확정은 D-EVENTS-01의 `cancelled → confirmed` 경로 사용.
- **취소 동시성**: 한쪽이 취소 시 즉시 `cancelled_at=now()` + 양측 알림 + confirmation 전부 DELETE. 양측 동시 취소 → 행 잠금으로 직렬화.
- **race condition**: 양측 동시 확정 시 PG 트랜잭션 + `scrim_rooms` 행 잠금으로 직렬화. 트리거가 단 1회만 `confirmed` 전이 실행.
- 상세: [decisions.md §D-SCRIM-02](../decisions.md#d-scrim-02--스크림-양측-확정-동시성-2-phase-commit), [schema.md §scrim_room_confirmations](../schema.md#scrim_room_confirmations-스크림-양측-확정-누적--d-scrim-02).

## 탭 5 — 클랜 순위 (Ranking)

### 한 줄
이 게임의 클랜·개인·시간대 인사이트를 한 곳에 모은 랭킹 페이지.

### 서브탭

```
[클랜 순위]   [개인 랭킹]   [인사이트]
```

#### 서브탭: 클랜 순위
- 정렬 select `#rankingSort`:
  - 이번달 내전 경기수
  - 이번달 스크림 횟수
  - 이번달 활성 유저 비율
  - 누적 경기수
- 행: 순위(메달/숫자) · 아바타+이름+(내 클랜) · 지표 · 인원
- "내 클랜 요약" 바: 상위 N에 없으면 별도 행으로 강조

#### 서브탭: 개인 랭킹
- `#`, 닉, 소속 클랜, 내전 참여 횟수
- 데이터 출처는 `RANKING_INTRA_LEADERS`

#### 서브탭: 인사이트
- 시간대 막대 / 요일 막대
- 요약 문장: "주중 저녁 8~10시에 경기가 가장 많이 발생합니다." 류

## 모달·드로어 트리 정리

| 탭 | 모달/드로어 |
|----|--------------|
| 홈 | (없음, 미리보기만) |
| 홍보 | `#promoDrawer`, `#joinModal` |
| LFG | `#lfgPostModal`, `#lfgApplyModal`, `#lfgDrawer` |
| 스크림 | `#scrimApplyModal`, `#scrimDrawer`, `#scrimChatModal` |
| 순위 | (없음) |

## 권한·구독에 따른 차이

자세한 표는 [gating-matrix.md](../gating-matrix.md) §9. 요약하면:

- **권한 분기**: 스크림 편집은 자기 모집 + 모집 중 + 운영진+. 그 외 게이팅 거의 없음.
- **구독 분기**: Premium 클랜의 홍보글 상단 고정 + ✓ 뱃지. 그 외는 동일.

## 데이터·연동

### 카드 데이터 (홍보)
- `clan-auth`와 동일한 클랜 데이터 모델 사용 (이름·아이콘·인원·`pinned`·배지 등). 컴포넌트 공유 권장.

### LFG 모집 데이터
- 모드·구분·티어·역할·마이크·시작·만료·한마디·작성자.
- "내 모집" 여부는 작성자와 본인 비교.

### 스크림 데이터
- 일시·모드·티어 범위·메모·작성 클랜·확정 상태·매칭 상대 클랜.

### 순위 데이터
- 클랜별 누적·월간 지표 + 개인 참여 지표.

## 목업과 실제 구현의 차이
- 사이드바 메뉴 클릭은 페이지 내 섹션 전환만 (`navTo(id)`). 별도 라우트 없음 → 운영 시 URL 해시/라우트로 분리 권장.
- LFG 신청 상태(D-LFG-01)는 sessionStorage 기반 시뮬레이션. 운영 시 `lfg_applications` 테이블·실시간 알림으로 대체.
- 스크림 채팅 입력은 비활성 (UI 셸만).
- 홍보 정렬 UI 없음(D-RANK-01에서 "인기" 폐기). 운영 시 `newest`/`space` 2종 select 추가.
- 채팅방 자동 종료 매트릭스(D-SCRIM-01)는 목업이 `scheduled_at + 6h`만 시뮬레이션. `cancelled`/`finished` 분기는 Phase 2+에서 cron 도입.
- 양측 확정 무효화(D-SCRIM-02)는 메모리 객체 `scrimJoinState` 리셋으로 시뮬레이션. 운영 시 `scrim_room_confirmations` 트리거가 처리.
- `submitLfgPost`에서 `pmMic` 셀렉터를 역할 판별에 쓰는 부분은 버그로 보임 → 운영 시 수정.
- 게임 허브 사이드바 하단 "프로필"은 페이지 이동만 함. 클랜 메인의 "프로필 모달"과 일관성 결정 필요.

## 결정 현황
- D-LFG-01 — DECIDED (2026-04-21) · 신청 5상태 enum + 본인/모집자 화면 UI + 자동 마감
- D-RANK-01 — DECIDED (2026-04-21) · "인기" 정렬 폐기, `newest`/`space` 2종만
- D-SCRIM-01 — DECIDED (2026-04-21) · 상태별 채팅방 종료 매트릭스 + 운영자 수동 제어
- D-SCRIM-02 — DECIDED (2026-04-21) · 2-phase commit + 일정 변경 시 confirmation 자동 무효화
- (신설 검토) "스크림 평판" 탭 도입 여부 — 별도 결정 코드 미할당

## 구현 참고 (개발자용)

- 목업 파일: `mockup/pages/main-game.html`
- 섹션 식별: `#sec-home`, `#sec-promo`, `#sec-lfg`, `#sec-scrim`, `#sec-ranking`
- 탭 전환: `navTo(id)` — `SECTIONS = ['home','lfg','scrim','promo','ranking']`
- 사이드바 항목: `#nav-home`, `#nav-promo`, `#nav-scrim`, `#nav-lfg`, `#nav-ranking`
- 카드 컴포넌트: `BADGE_DEFS` + `clanBadgesHtml()` 재사용
- 스크림 권한: `MOCK_USER_CLAN_ROLE`, `scrimCanEditAsOfficer(s)`
- LFG: `applyLfgFilter`, `setLfgMultiFilter`, `openLfgDrawer`, `openLfgPostModal`, `submitLfgApply`
- 스크림: `openScrimApplyModal`, `openScrimDrawer`, `submitScrimApply`
- 홍보: `openPromoDrawer`, `openJoinModal`, `submitJoin`
- 순위: `setRankingTab`, `setRankingSort`, `RANKING`, `RANKING_INTRA_LEADERS`
- 알려진 이슈: `lfgFilterPopover` CSS만 존재 / DOM 없음, `submitLfgPost`의 `pmMic` 사용 버그

## 연관 문서
- [pages.md](../pages.md)
- [slices/slice-07-main-game-community.md](../slices/slice-07-main-game-community.md)
- [decisions.md](../decisions.md) (D-LFG-01, D-RANK-01, D-SCRIM-01~02)
- [gating-matrix.md](../gating-matrix.md)
