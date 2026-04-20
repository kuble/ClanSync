# ClanSync 테마 모드 토큰 기준

> 상태: 디자인 컨셉 통일용 토큰 기준서  
> 참조: [mockup-spec.md](./mockup-spec.md)

---

## 목적
- 대시보드/랜딩의 다크·라이트 모드 토큰을 한 문서로 관리
- `mockup-spec.md`에는 요약만 유지하고 상세 토큰은 본 문서를 단일 소스로 사용

## 모드 매핑
- Dashboard Dark Mode
- Dashboard Light Mode
- Landing Dark Mode
- Landing Light Mode = Dashboard Light Mode와 동일 토큰 세트 사용

---

## Dashboard Dark Mode

```json
{
  "bg-base": "#0c0d0e",
  "bg-surface": "#141515",
  "bg-elevated": "#1e1f1f",
  "bg-overlay": "#0c0d0e",
  "border": "#161818",
  "text-primary": "#f3f4f6",
  "text-secondary": "#c7ccd1",
  "text-muted": "#8e969e",
  "brand-primary": "#183927",
  "accent-violet": "#46af75",
  "mock-tab-indicator": "#ffffff",
  "pro-gold": "#d9a441"
}
```

## Dashboard Light Mode + Landing Light Mode

```json
{
  "bg-base": "#f4f7f6",
  "bg-surface": "#eef3f1",
  "bg-elevated": "#ffffff",
  "bg-overlay": "#e8efec",
  "border": "#d5dfda",
  "text-primary": "#0f1720",
  "text-secondary": "#334155",
  "text-muted": "#70808d",
  "brand-primary": "#2b8a57",
  "accent-violet": "#46af75",
  "mock-tab-indicator": "#2b8a57",
  "pro-gold": "#d97706"
}
```

## Landing Dark Mode

```json
{
  "bg-base": "#080808",
  "bg-surface": "#090909",
  "bg-elevated": "#141419",
  "bg-overlay": "#1b1b20",
  "border": "#2a2a2f",
  "text-primary": "#e4e4e7",
  "text-secondary": "#a1a1aa",
  "text-muted": "#71717a",
  "brand-primary": "#34d399",
  "accent-violet": "#34d399",
  "mock-tab-indicator": "#34d399",
  "pro-gold": "#f59e0b"
}
```

---

## 적용 원칙
- 신규 목업/컴포넌트 작성 시 먼저 모드를 지정한 뒤 본 문서 토큰을 따른다.
- 컬러 하드코딩은 지양하고 CSS 변수 매핑을 우선한다.
- 모드별 대비 기준(텍스트/보더/상태색)은 본 문서 수치를 기준으로 회귀 점검한다.

## 파생 토큰 규칙
- 기본 12개 토큰(`bg-*`, `text-*`, `border`, `brand-primary`, `accent-violet`, `mock-tab-indicator`, `pro-gold`)을 1차 기준으로 사용한다.
- 아래 파생 토큰은 모드 전환 시 함께 재계산한다.
  - `--gradient-brand`
  - `--mock-tab-track-border`
  - `--mock-tab-text-idle`
  - `--mock-tab-text-hover`
  - `--mock-tab-text-active`
  - `--surface-active`
  - `--surface-hover`
- Landing Light Mode는 Dashboard Light Mode와 동일 값 세트를 공유한다.
