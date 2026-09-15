# ClanSync

오버워치를 시작으로 여러 게임의 클랜 운영을 지원하는 웹서비스입니다. 내전 팀 편성·승패 기록, 일정·투표, 클랜 통계, 스크림 매칭, 파티 모집, 코인·프로필 꾸미기를 제공합니다. 스크림은 매칭을 지원하며 승패 통계 대상은 아닙니다.

## 현재 상태

Phase 2 기능 구현 후 품질 점검 단계입니다. M8 종료 감사는 미완료이며, 게임 계정 연동은 개발용 시뮬레이터 단계입니다. Free/Premium 기능 구분은 있으나 실제 구독 결제는 후속 범위입니다.

- [현재 작업과 다음 우선순위](docs/TODO.md)
- [구현 현황·남은 검증](docs/TODO_Phase2.md)
- [2026-09-15 코드 리뷰](docs/03-analysis/code-review-2026-09-15.md)
- [문서 안내](docs/README.md)

## 기술과 구조

Next.js 16.2 App Router · React 19.2 · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase · Playwright.

| 경로 | 역할 |
|------|------|
| `src/app/` | 페이지·서버 액션·알림 cron 엔드포인트 |
| `src/components/` | 게임 커뮤니티·클랜·프로필 UI |
| `src/lib/` | 인증·권한·도메인 로직·Supabase 클라이언트 |
| `supabase/migrations/` | 실제 DB 변경 이력 |
| `e2e/` | Playwright 시나리오 |
| `mockup/` | 완료된 Phase 1 정적 목업·디자인 참조 |
| `docs/` | 기획·진행도·검증 기록 |

## 로컬 실행

```sh
npm ci
```

`.env.example`을 참고해 `.env.local`에 개발용 Supabase URL·공개 키·서버 전용 서비스 키를 설정합니다. 비밀값은 커밋하지 않습니다.

```sh
npm run dev
```

기본 주소: [localhost:3000](http://localhost:3000).

## 검증

```sh
npm run build
npx eslint src middleware.ts playwright.config.ts e2e
```

전체 `npm run lint`는 현재 정적 목업과 로컬 아이콘 원본까지 검사합니다. 리뷰 시점의 실패 내역은 코드 리뷰 문서에 기록했습니다.

Playwright 실행·시드 조건은 [e2e/README.md](e2e/README.md)를 따릅니다. 전체 E2E는 기본적으로 QA 데이터를 다시 시드하므로 개발·테스트 DB에서 실행합니다. `db:push`·`db:sync`는 연결된 DB를 변경합니다.

작업 규칙은 [AGENTS.md](AGENTS.md)를 따릅니다. 변경은 의미별 커밋, 푸시·배포는 명시 요청 시에만 진행합니다.
