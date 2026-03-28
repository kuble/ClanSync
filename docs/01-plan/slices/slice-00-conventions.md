# S00 — 규약·플랜

## 스코프

- 제품·UI·기획 문서에서 구독 티어 표기: **Free** / **Premium** 만 사용한다.
- 코드: CSS 변수 `--pro-gold`, 클래스 `badge-pro`, `mock-plan-premium` 등은 **레거시 식별자**로 유지 가능. 사용자에게 보이는 문자열은 **Premium**.

## Free vs Premium (요약)

| Premium 전용 (대표) |
|---------------------|
| 승부 예측, 팀 자동 밸런싱, OCR, 맵/영웅 밴픽(정책에 따름), 대진표 생성기, 디스코드 연동 |

상세 표: [../PRD.md](../PRD.md) 구독 티어 절만.

## 세션 규칙

- 한 PR/세션에서는 **한 슬라이스 ID**를 우선한다.
- 토큰 절약: `@docs/01-plan/FEATURE_INDEX.md` + **본 파일 또는 작업 중 슬라이스 하나**.

## 목업

- 플랜 전환: `mockup/_hub.html` (Free / Premium)
