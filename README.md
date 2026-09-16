# ClanSync

오버워치를 시작으로 여러 게임의 클랜 운영을 지원하는 웹서비스입니다. 내전 팀 편성·승패 기록, 일정·투표, 클랜 통계, 스크림 매칭, 파티 모집, 코인·프로필 꾸미기를 제공합니다. 스크림은 매칭을 지원하며 승패 통계 대상은 아닙니다.

## 현재 상태

Phase 2 기능 구현 후 품질 점검 단계입니다. M8 종료 감사는 미완료이며, 게임 계정 연동은 개발용 시뮬레이터 단계입니다. Free/Premium 기능 구분은 있으나 실제 구독 결제는 후속 범위입니다.

- [현재 작업과 다음 우선순위](docs/TODO.md)
- [구현 현황·남은 검증](docs/TODO_Phase2.md)
- [2026-09-15 코드 리뷰](docs/03-analysis/code-review-2026-09-15.md)
- [문서 안내](docs/README.md)

작업 브랜치·QA 제약·운영 적용 대기는 [현재 작업](docs/TODO.md)에서 관리합니다.

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

## 개발 연결 (2026-09-15 확인)

| 서비스 | 대상·확인 결과 |
|--------|----------------|
| GitHub | `kuble/ClanSync` · Git/CLI/연결 앱의 저장소 접근 확인, 작업 커밋 자동 푸시 |
| Supabase | `clansync` · `mxkrfnzlgaxzdzcjbfkg` · 서울 리전, 마이그레이션 50개 적용, 리뷰 수정 권한·타입 검증 완료 |
| Supabase QA | `clansync-test` · `moretvteewfcztxvwztw` · 서울 리전 Free, QA 클랜12명. 최신 마이그레이션·검증 결과는 [현재 작업](docs/TODO.md)·[구현 현황](docs/TODO_Phase2.md) 참조 |
| Vercel | `clansync/clan-sync` · Git 자동 배포 READY, 페이지 함수 `icn1`(서울), [운영 서비스](https://clan-sync.vercel.app) 로그인·이동 확인 |

Supabase CLI는 `.env.local`을 읽는 `node scripts/with-dotenv-local.mjs <명령>`으로 실행할 수 있습니다. 예: `node scripts/with-dotenv-local.mjs migration list --linked`. Vercel CLI는 `npx vercel`을 사용합니다. 인증·연결 파일과 기존 `.env.local`은 로컬에만 보관합니다.

연결 앱의 추가 설치·인증 여부와 CLI 인증은 별개입니다. 위 개발 경로는 CLI로 검증했습니다. 테스트는 `.env.e2e.local`의 별도 DB를 사용하며 운영 URL은 시드·E2E 실행 전에 차단합니다. `npm run db:test:push`는 테스트 DB만 갱신합니다. 자세한 실행법은 [E2E 안내](e2e/README.md)를 참조합니다.

운영 Vercel에는 `CRON_SECRET`을 Secret으로 등록했습니다. 이후 배포부터 매일 02:00 UTC(한국 11:00)에 알림 cron이 인증된 요청을 보냅니다. 로컬·테스트 키는 운영과 다르게 설정했습니다.

## 검증

변경마다 [위험도별 검증 기준](.cursor/rules/agent-auto-tasks.mdc)을 적용합니다. 작은 수정은 변경 파일 린트·필요한 타입 검사와 해당 화면/시나리오만, 인증·권한·스키마·금액·공통 라우팅은 연관 회귀와 빌드, main 병합·운영 반영 전에는 전체 회귀와 빌드를 확인합니다.

명령과 시드 조건은 [E2E 안내](e2e/README.md), 코드·테스트 선택은 [기능별 진입점](docs/README.md)을 따릅니다. 사용자 QA가 진행 중이면 `E2E_SKIP_SEED=1`과 별도 임시 픽스처를 사용합니다. QA 스키마는 `db:test:push`·`db:test:types`를 사용하며 `db:push`·`db:sync`는 연결된 DB를 변경합니다.

최신 검증 근거는 [구현·검증 현황](docs/TODO_Phase2.md)을 참조합니다. ESLint는 앱·테스트·스크립트를 검사하며 완료된 정적 목업·생성 디렉터리는 제외합니다.

작업 규칙은 [AGENTS.md](AGENTS.md)를 따릅니다. 변경은 의미별 커밋 후 자동 푸시합니다. 별도 수동 배포는 명시 요청 시에만 진행합니다.
