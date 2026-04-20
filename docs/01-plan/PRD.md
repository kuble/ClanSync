# ClanSync PRD (Product Requirements Document)

> 멀티 게임 클랜 관리 웹서비스 — 내전·이벤트 **팀 승** 기록·참여 아카이빙, 스크림 **매칭**(승패 통계 비지원) 플랫폼  
> 초기 타겟: 오버워치 → 점진적 게임 확장

---

## 기획 상태

- **동결**: 본 문서의 핵심 범위·티어·권한·도메인 규칙은 **동결**한다.
- **미결·후속**: [BACKLOG.md](./BACKLOG.md)에만 추가한다. (캐치프라이즈, 코인 수치, 가짜 클랜 검증 등)
- **세부 실행 명세**: 기능 단위로 [FEATURE_INDEX.md](./FEATURE_INDEX.md) → `slices/slice-*.md` 를 쓴다. (토큰 절약)
- **문서 맵**: [../README.md](../README.md)

---

## 개발 원칙

- 토큰 최소화: 작업 시 **FEATURE_INDEX + 해당 슬라이스 한 개**를 우선 참조
- 보안 최우선 (RLS, 인증, 입력 검증)
- 법적 검토: [non-page/legal-review.md](./non-page/legal-review.md)
- 나노 단위 Git 커밋
- **구현 단위**: 한 번에 전부가 아니라 **슬라이스 단위**로 나눈다 ([../README.md](../README.md) 세션 절차)

---

## 구독 티어

**용어 고정: Free / Premium** (UI·기획·문서 동일. 코드 내 CSS 식별자 `pro` 등은 별개.)

| 기능 | Free | Premium |
|------|:----:|:---:|
| 클랜원 수 | 무제한 | 무제한 |
| 경기 기록 보관 | 1년 | 무제한 |
| 기본 통계 | ✅ | ✅ |
| 심층 통계 (시너지, 레이더) | ✅ | ✅ |
| 명예의 전당 | ✅ | ✅ |
| 승부 예측 시스템 | ❌ | ✅ |
| 팀 자동 밸런싱 | ❌ | ✅ |
| OCR 닉네임 자동 입력 | ❌ | ✅ |
| 대진표 생성기 | ❌ | ✅ |
| 디스코드 연동 | ❌ | ✅ |

---

## 권한 체계

```
클랜장 > 운영진 > 구성원
```

- **클랜장**: 전 권한, 클랜 설정, 구독 관리
- **운영진**: 밸런스메이커, 클랜 통계, 클랜 관리, 이벤트 등록
- **구성원**: 열람, 승부예측(Premium), 클랜코인 활동

---

## 클랜 코인

순수 가상 재화. **현금 거래 불가**.

- **클랜 풀**: 기본 지급 + Premium 구독 보너스 + 구성원 기부
- **개인 풀**: 내전 참여, 스크림 보너스, 시즌 칭호 보너스 등
- **꾸미기**: 프로필·네임플레이트 등은 **서비스 프리셋만**; 개인 이미지 업로드로 대체 **없음** (상세 정책은 동결 범위 유지, 수치·운영 디테일은 BACKLOG)

---

## 점수

- **수동 점수**: 운영진 입력, 포지션별 -5.0 ~ 5.0
- **자동 점수**: 통계 기반 -5.0 ~ 5.0

---

## 다국어

한국어(기본), 영어, 일본어 / UTF-8

---

## 핵심 모듈 (요약만)

상세·목업 경로·수용 기준은 **슬라이스**에 둔다.

| 영역 | 슬라이스 |
|------|----------|
| 랜딩·로그인·게임 선택 | [slices/slice-01-routing-shell.md](./slices/slice-01-routing-shell.md) |
| 게임 인증·클랜 온보딩 | [slices/slice-02-game-clan-onboarding.md](./slices/slice-02-game-clan-onboarding.md) |
| MainClan 쉘·탭·허브 | [slices/slice-03-main-clan-shell.md](./slices/slice-03-main-clan-shell.md) |
| 밸런스메이커 | [slices/slice-04-balance-maker.md](./slices/slice-04-balance-maker.md) |
| 클랜 통계 | [slices/slice-05-clan-stats.md](./slices/slice-05-clan-stats.md) |
| 이벤트·관리·스토어 | [slices/slice-06-events-manage-store.md](./slices/slice-06-events-manage-store.md) |
| MainGame 커뮤니티 | [slices/slice-07-main-game-community.md](./slices/slice-07-main-game-community.md) |
| 프로필·꾸미기 | [slices/slice-08-player-profile-decorations.md](./slices/slice-08-player-profile-decorations.md) |

### 모듈별 한 줄 (참고)

- **밸런스**: KST 집계일, 밸런스장 단독 배치 → 밴 → 경기 시작; Premium은 자동밸런스·OCR·밴픽·승부예측 등 ([pages/09-BalanceMaker.md](./pages/09-BalanceMaker.md))
- **통계**: 구성원 vs 운영진 열람 분리 ([pages/10-Clan-Stats.md](./pages/10-Clan-Stats.md))
- **이벤트**: 캘린더+그리드, 반복, 스크림 자동 반영(문서상); Premium: 대진표 등
- **관리·스토어**: 구성원·메달·내전 히스토리(예정); 스토어는 프리셋 에셋
- **MainGame**: 홍보·스크림·매칭·순위/평판(권한)

---

## 관련 문서

| 문서 | 용도 |
|------|------|
| [pages.md](./pages.md) | 라우트·페이지별 컴포넌트 요약 |
| [schema.md](./schema.md) | DB |
| [FEATURE_INDEX.md](./FEATURE_INDEX.md) | 슬라이스 목록 |
| [../02-design/mockup-spec.md](../02-design/mockup-spec.md) | 목업·디자인 토큰 |
