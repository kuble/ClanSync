# 밸런스 편집 · 이름표(닉네임 슬롯) UI 기획

목업: `mockup/pages/main-clan.html` 편집 단계 VS 보드.  
밸런스메이커 공통 메모: [balance-maker-ui-notes.md](./balance-maker-ui-notes.md)

---

## 1. 원칙

- **닉네임**은 슬롯 **좌측·상단**에 크게 둔다.
- **마이크 표시는 사용하지 않는다.**
- **오늘 전적**은 **승·무·패** 모두 표기한다. (집계일 KST 06:00 경계는 [schema.md / PRD](./schema.md)와 동일하게 서버가 내려주는 값을 표시한다고 가정.)
- **Manual 점수**: **Free·Premium 모두** 운영진이 편집 가능(목업은 `input`).
- **A**(자동 추정 값, 서버·문서에서는 AI 파이프라인으로 산출): 화면 라벨은 **`A`** 만 쓰고 옆에 숫자를 둔다. **Premium에서만** 노출. Free에서는 **완전 비표시** (`body.mock-plan-free` + `mock-hide-on-free`).
- **추세 화살표/스파크라인**은 쓰지 않는다. 대신 자동 산정·규칙 엔진이 붙이는 **특이사항 태그(배지)** 로 상태를 전달한다.

---

## 2. 레이아웃 · 정보 우선순위 (공간 부족 시)

- **닉네임·오늘 전적**은 본문 **왼쪽**에 두고, **2줄 행** 오른쪽에는 **태그 레일 | M·A 점수 열**을 둔다.  
- **M·A**는 **동일한 행 박스 스타일**(`.mock-balance-slot-score-row`), **세로로 쌓고 열 안에서는 우측 정렬**한다. **A는 M 바로 아래** 줄.  
- **특이사항 태그**는 **M·A 열 바로 왼쪽**에 세로로 쌓는다(같은 `.mock-balance-slot-line2-tray` 안).

본문 **2줄** 안에서 좁아지면 **아래 순으로 잘라낸다**(마지막부터 숨김).

1. 닉네임  
2. 오늘 전적 (승/무/패)  
3. Manual (`M` + 입력)  
4. A (라벨 `A` + 숫자, M 아래)  

태그 레일은 별도 열로 유지한다(세로 공간이 모자라면 태그 개수·말줄임은 구현에서 조정).

목업은 본문에 `max-height` + `overflow: hidden`으로 2줄 내 압축을 시뮬레이션한다.

---

## 3. 특이사항 태그 (예시)

규칙은 **서버/배치 스냅샷**에서 결정한다. UI는 배지만 담당한다.

| 조건 (예시) | 배지 예 |
|-------------|---------|
| 연패 N회 이상 | `3연패`, `4연패` |
| 최근 2주 승률 ≤ 임계값 (클랜 설정) | `슬럼프` |
| (추가) 맵 특화 | `맵 숙련` 등 — 추후 확장 |

임계값·기간은 **클랜 설정 또는 서버 정책**으로 두고, 클라이언트는 표시만 한다.

**색(톤)**: 긍정/부정/정보를 구분해 한눈에 읽히게 한다.

| 톤 | 용도 예 | 목업 클래스 |
|----|---------|-------------|
| 긍정 | 연승 등 | `.mock-balance-tag--good` |
| 부정 | 연패·슬럼프 등 | `.mock-balance-tag--bad` |
| 정보 | 역할 라인·맵 숙련 등 중립 | `.mock-balance-tag--neutral` |

실구현 시 API에 `tone: good | bad | neutral`을 내려주는 방식을 권장한다.

---

## 4. A(자동 추정) 갱신 타이밍

1. **팀 배치 확정 시** (`배치 완료` / 실제로는 라인업·시너지 계산에 필요한 스냅샷이 고정된 시점): **반드시 1회** A 스냅샷 갱신.
2. **맵 밴 OFF**이고 운영진이 **맵 선택을 완료**한 직후: **추가로 1회** 갱신 (맵 가중·맵 전적 반영).
3. **맵 밴 ON**: 편집 단계에서 맵이 없으므로, 맵 반영 갱신은 **② 밴픽 등 맵 확정 후** 서버 플로우에서 수행 (목업은 배치 확정 시만 또는 별도 시나리오).

**목업 훅**: `mockup/scripts/clan-mock.js`의 `window.mockBalanceRefreshAiSnapshotMock` — `mockBalancePlacementDone`(배치 확정)·`mockBalancePickMap`(맵 밴 OFF일 때만)에서 호출한다. Premium에서만 동작한다.

---

## 5. 성능·UX (연산 부담)

- AI 파이프라인은 **비동기**로 가정한다. (워커·큐·Edge 함수 등 구현 선택은 별도.)
- 클라이언트는 **스켈레톤 / 짧은 “갱신 중” 상태**로 입력 차단 또는 읽기 전용을 선택할 수 있다.
- 목업: 보드에 **짧은 시각적 피드백**(예: `opacity` + `pointer-events: none`, ~80ms)만으로 “재계산”을 표현한다.
- **타임아웃·재시도·부분 실패 시** 이전 스냅샷 유지 + 토스트는 구현 단계에서 정의.

---

## 6. 마크업 구조 (목업)

- `.mock-balance-nameplate--rich` — 편집 보드 전용.
- `.mock-balance-nameplate-rich-inner` — 현재 목업은 **본문(`slot-body`)만** 자식으로 둔다.
- `.mock-balance-slot-body` — 닉 + 2줄 메타.
- `.mock-balance-slot-line2` — 가로: **전적(유동 폭)** + `.mock-balance-slot-line2-tray`.
- `.mock-balance-slot-line2-tray` — 가로: **태그 레일** → **점수 열**(슬롯 오른쪽에 붙음).
- `.mock-balance-slot-tags.mock-balance-slot-tags-rail` — 태그 세로 스택, 점수 열 쪽으로 정렬 (`aria-label="상태 태그"`).
- `.mock-balance-slot-scores-col` — `M`·`A` 각각 `.mock-balance-slot-score-row`(동일 보더·배경), 열은 `stretch`로 행 너비를 맞추고 행 안은 우측 정렬(`justify-content: flex-end`).
- `.mock-balance-slot-a-value` — A 숫자만 갱신(목업 JS), 라벨은 `.mock-balance-slot-score-label`.
- `.mock-balance-slot-nick` — 닉네임.
- 참가자 **5vs5** 읽기 전용 보드는 기존처럼 **닉만** 두고, `--scores-off`로 메타·태그 레일을 숨긴다.

---

## 7. 구현 메모 (Next.js 이후)

- Manual·A(값)·태그·전적은 **API 스냅샷**으로 내려받고, 클라이언트에서 **자정 기준 임의 재계산**하지 않는다.
- Free: A 필드 미수신 또는 `null` → UI 비노출.
