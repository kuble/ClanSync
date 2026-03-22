# ClanSync 목업 명세서 (Phase 3)

> 작성일: 2026-03-20  
> 상태: 완료 → Phase 4 API 설계로 이동

---

## 목업 구조

```
mockup/
├── pages/
│   ├── index.html          → Landing Page (/)
│   ├── sign-in.html        → 로그인 (/sign-in)
│   ├── sign-up.html        → 회원가입 (/sign-up)
│   ├── games.html          → 게임 선택 (/games)
│   ├── game-auth.html      → 게임 인증 (/games/[gameSlug]/auth)
│   ├── clan-auth.html      → 클랜 가입/생성 (/games/[gameSlug]/clan)
│   ├── main-clan.html      → MainClan 대시보드 (/games/[gameSlug]/clan/[clanId])
│   └── main-game.html      → MainGame 커뮤니티 (/games/[gameSlug])
├── styles/
│   └── main.css            → 디자인 토큰 + 공통 컴포넌트
├── scripts/
│   └── app.js              → 공통 인터랙션
└── data/
    ├── games.json
    └── clan.json
```

---

## 디자인 시스템 결정사항

### 디자인 컨셉 (Mockup Hub 기준)
목업 전역은 **`mockup/_hub.html` 좌측 네비**와 같은 언어를 쓴다.

- **베이스**: 다크 Zinc (`#0f0f11`), 패널·상단바 `#18181b`, 실선 테두리 `#2a2a2e`
- **악센트**: 라벨/로고/활성 강조 `#a78bfa`, 주 액션은 기존 보라→파랑 그라디언트 버튼 유지
- **타이포**: 본문 `#e4e4e7` → 보조 `#a1a1aa` → 뮤트 `#71717a` → **그룹 라벨** `#52525b` (섹션·사이드바 구분)
- **인터랙션**: 호버 `rgba(255,255,255,0.04)`, 선택/활성 `rgba(167,139,250,0.08)` + 왼쪽 보라 바(사이드·탭 등)

토큰은 전부 `mockup/styles/main.css` `:root`에 정의. **`_hub.html`도 `main.css`를 링크**해 Hub와 앱 목업이 동일 팔레트를 공유한다.

### 색상 팔레트 (CSS 변수)
| 용도 | 변수 | 대표값 |
|------|------|--------|
| 배경 기본 | `--bg-base` | `#0f0f11` |
| 배경 표면 (네비·사이드·드롭다운) | `--bg-surface` | `#18181b` |
| 배경 카드 | `--bg-elevated` | `#1c1c21` |
| 배경 입력/칩 | `--bg-overlay` | `#27272a` |
| 테두리 | `--border` | `#2a2a2e` |
| 악센트 바이올렛 | `--accent-violet` | `#a78bfa` |
| 브랜드 1 | `--brand-primary` | `#7c3aed` |
| 브랜드 2 | `--brand-secondary` | `#3b82f6` |
| 브랜드 그라디언트 | `--gradient-brand` | `135deg, #7c3aed → #3b82f6` |
| Premium 골드 | `--pro-gold` | `#f59e0b` |
| 성공 / 위험 | `--success` / `--danger` | 유지 |
| 텍스트 주·보조·뮤트·그룹 | `--text-primary` 등 | Hub 스케일 |

### 역할 색상
| 역할 | 색상 |
|------|------|
| 탱커 | `#3b82f6` (blue) |
| DPS | `#ef4444` (red) |
| 힐러/서포터 | `#22c55e` (green) |

### 타이포그래피
- 기본 폰트: Pretendard (한국어 최적화) → `-apple-system` 폴백
- 모노 폰트: Geist Mono

### 레이아웃 패턴
| 페이지 | 레이아웃 |
|--------|---------|
| Landing | 풀페이지 스크롤, 섹션별 |
| Sign In/Up | 좌우 분할 (2단) |
| Games | 3열 카드 그리드 |
| GameAuth/ClanAuth | 중앙 1열 (max 560/720px) |
| MainClan | 사이드바 + 메인 (Bento Grid 3열) |
| MainGame | 메인 + 오른쪽 위젯 사이드 (2열) |

---

## 컴포넌트 매핑 (목업 → Next.js)

| 목업 요소 | Next.js 컴포넌트 | Props 인터페이스 |
|-----------|-----------------|-----------------|
| `.navbar` | `components/layout/Navbar.tsx` | `user`, `coinBalance` |
| `.sidebar` | `components/layout/Sidebar.tsx` | `clan`, `currentPath` |
| `.btn` | `components/ui/Button.tsx` | `variant`, `size` |
| `.card` | `components/ui/Card.tsx` | `children`, `hover` |
| `.badge` | `components/ui/Badge.tsx` | `variant`, `children` |
| `.tabs` + `.tab` | `components/ui/Tabs.tsx` | `tabs`, `activeTab`, `onChange` |
| `.avatar` | `components/ui/Avatar.tsx` | `user`, `size` |
| `.input` | `components/ui/Input.tsx` | 표준 HTMLInput props |
| `.score-bar` | `components/ui/ScoreBar.tsx` | `value`, `max`, `color` |
| `.clan-card` | `components/features/clan/ClanCard.tsx` | `clan`, `onJoin` |
| `.post-card` | `components/features/community/PostCard.tsx` | `post`, `onClick` |
| `.match-result-row` | `components/features/stats/MatchRow.tsx` | `match` |
| `.map-row` | `components/features/stats/MapRow.tsx` | `map`, `winRate` |
| `.winrate-ring` | `components/features/stats/WinrateRing.tsx` | `rate`, `wins`, `losses` |
| `.bento-grid` | `components/features/dashboard/BentoGrid.tsx` | `children` |
| `.pro-overlay` | `components/features/ProLock.tsx` | `feature`, `children` |

---

## 페이지별 주요 검토 포인트

### Landing (/)
- [ ] 캐치프라이즈 확정 필요 (⚠️ 미결)
- [ ] Hero 통계 수치: 실제 오픈 전까지 추정치 사용
- [ ] 구독 요금 ₩9,900/월 확정 여부 확인

### Sign In/Up
- [x] 자동 로그인 토글 UX
- [x] 비밀번호 강도 표시 (3단계)
- [x] Battle.net / Discord 소셜 로그인 버튼
- [ ] 이메일 인증 플로우 미포함 (Phase 6에서 구현)

### Game Auth
- [x] Battle.net OAuth 플로우 시뮬레이션
- [x] 수동 배틀태그 입력 + 관리자 검토 대기 상태
- [ ] Valorant 인증 방식 별도 설계 필요

### Clan Auth
- [x] 가입 탭: 검색, 필터, 클랜 카드
- [x] 생성 탭: 태그 입력, 정책 설정
- [x] 가입 신청 모달 → 대기 상태 화면
- [ ] 가짜 클랜 검증 절차 (⚠️ 미결)

### MainClan
- [x] Bento Grid 3열 레이아웃
- [x] 승률 링 SVG 차트
- [x] 맵별 승률 바 차트
- [x] Premium 잠금 오버레이 (승부예측)
- [x] 클랜 코인 현황
- [ ] 밸런스메이커, 통계 상세, 이벤트, 관리 페이지 → Phase 6에서 구현

### MainGame
- [x] 홍보/스크림 탭 전환
- [x] 핀 고정 게시글 (코인 소비)
- [x] 스크림 채팅방 모달
- [x] 자동 매칭 UI (운영진 전용)
- [x] 클랜 순위 위젯
- [x] 스크림 평판 위젯 (클랜장 전용)

---

## Phase 4 연계 API 설계 힌트

목업 data/ 파일의 구조가 API 응답 스키마의 베이스.

| 엔드포인트 | 데이터 소스 |
|-----------|-----------|
| `GET /api/games` | `data/games.json` |
| `GET /api/clans/:id` | `data/clan.json` → `.clan` |
| `GET /api/clans/:id/stats` | `data/clan.json` → `.stats` |
| `GET /api/clans/:id/members` | `data/clan.json` → `.members` |
| `GET /api/clans/:id/matches` | `data/clan.json` → `.recent_matches` |
| `GET /api/clans/:id/events` | `data/clan.json` → `.events` |
| `GET /api/games/:slug/board-posts` | `main-game.html` 게시글 구조 |

---

## 미결 사항 (⚠️)

1. **캐치프라이즈** — Landing 히어로 문구 최종 확정
2. **가짜 클랜 검증** — 생성 시 검증 절차 UX 설계
3. **코인 수치** — 참여 시 지급 코인 수 확정
4. **Valorant 인증** — Riot API 연동 방식
5. **클랜 순위 지표** — 민감 지표 포함 여부 결정
