# ClanSync 페이지 구조

## 라우팅 맵

```
/                          → Landing Page (비로그인)
/sign-in                   → 로그인
/sign-up                   → 회원가입

/games                     → Main_GameSelect (로그인 필요)
/games/[gameSlug]/auth     → GameAuth (게임 인증)
/games/[gameSlug]/clan     → ClanAuth (클랜 가입/생성)
/games/[gameSlug]/clan/[clanId]         → MainClan
/games/[gameSlug]/clan/[clanId]/balance → 밸런스메이커
/games/[gameSlug]/clan/[clanId]/stats   → 클랜 통계(구성원: 요약·맵 / 운영진+: 경기 기록에 개인 승률 순위)
/games/[gameSlug]/clan/[clanId]/events  → 클랜 이벤트
/games/[gameSlug]/clan/[clanId]/manage  → 클랜 관리(구성원별 개인 통계·승패 등)
/games/[gameSlug]/clan/[clanId]/store   → 클랜 스토어
/games/[gameSlug]                       → MainGame (커뮤니티)
/games/[gameSlug]/board/[postId]        → 게시글 상세
```

## 인증/권한 미들웨어 흐름

```
요청
 ├─ 비로그인 → / (Landing)으로 리다이렉트
 ├─ 로그인됨
 │   ├─ 게임 인증 없음 → /games/[gameSlug]/auth
 │   ├─ 클랜 미가입 → /games/[gameSlug]/clan
 │   └─ 클랜 가입 → MainClan or MainGame
 └─ 클랜 권한 부족 → 403
```

## 페이지별 핵심 컴포넌트

### Landing Page (/)
- 로고, 캐치프라이즈 (논의 필요)
- 기능 소개 섹션
- 구독 티어 정보
- 로그인 / 회원가입 버튼

### Sign In (/sign-in)
- 로고
- 이메일/비밀번호 입력
- 로그인 에러 표시
- 자동 로그인 토글
- 비밀번호 찾기 링크
- 회원가입 링크

### Sign Up (/sign-up)
- 로고
- 이메일, 비밀번호, 비밀번호 확인, 닉네임
- 비밀번호 규칙: 영문+숫자+특수문자 8자 이상
- 회원가입 에러 표시

### Main_GameSelect (/games)
- 로고
- 프로필 아이콘 버튼
- 게임 갤러리 (인증 여부 아이콘, 클랜명 표시)
- 게임 검색 (게임 수가 많지 않을 것으로 예상)

### GameAuth (/games/[gameSlug]/auth)
- 게임별 인증 방식 (오버워치: 배틀넷 API)

### ClanAuth (/games/[gameSlug]/clan)
- 클랜 가입 탭: 검색, 추천, 홍보글 열람
  - 선택 후 → 가입 대기 상태 (운영진 승인 후 입장)
- 클랜 생성 탭:
  - 태그, 연령대, 성별 정책, 설명, 규칙, 디스코드, 카카오 링크
  - 가짜 클랜 검증 절차 (논의 필요)

### MainClan (/games/[gameSlug]/clan/[clanId])
- 클랜 대시보드 (최근 경기, 통계 요약)
- MainGame으로 이동 버튼
- 탭: 밸런스메이커 / 통계 / 이벤트 / 관리 / 스토어

### 밸런스메이커 (클랜 내 `/balance`, 운영진+)
- 편집·맵/밴·팀 보드·플랜별 기능. **화면 카피·도움말 본문·스펙 메모**: [balance-maker-ui-notes.md](./balance-maker-ui-notes.md)
- **세션**: 밸런스장 1명만 배치 편집, 나머지는 실시간 관전 동기화 → 배치 완료 후 밴(ON 시) → **경기 시작 = 밴 종료 직후**에 승부예측 마감 타이머. 디스코드는 선택 보조.

### 클랜 이벤트 (`/games/[gameSlug]/clan/[clanId]/events`, MainClan 탭)
- **월간 캘린더**(현재 월·요일 그리드, 일자별 일정 점/하이라이트) + 하단 **이번 달 일정 그리드**(카드: 유형 배지·시간·장소·반복/자동출처 표기).
- 일정 등록: 유형, 일시, **반복**(없음 / 매주 / 매월 / 격주 등 목업), 장소·채널. 스크림은 매칭 확정 시 **자동 등록**되어 별도 입력 없이 노출(목업 안내 카피).
- PRO: 대진표 생성기(비활성·업셀 목업 가능).

### MainGame (/games/[gameSlug])
- 클랜 홍보 게시판
- 스크림 신청 게시판
- 스크림 자동 매칭 버튼 (운영진+)
- 클랜 순위표
- 스크림 평판 (클랜장 전용)
