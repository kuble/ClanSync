<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 개발 진입점 (Codex)

- 주 개발 에이전트는 Codex다. 프로젝트 작업 지침은 이 `AGENTS.md`를 기준으로 한다.
- 작업 시작 시 짧은 `docs/TODO.md`에서 현재 상태·우선순위를 확인하고, `docs/README.md`의 기능별 코드·테스트 진입점에서 필요한 파일만 선택한다. 전체 기획·로그·완료 체크리스트를 매번 읽지 않는다.
- 연결 대상·검증 명령은 루트 `README.md`를 참조한다. CLI 인증과 `.env.local`을 사용하며 비밀값은 문서·커밋에 넣지 않는다.

# `/개발시작` 단축 명령

사용자가 `/개발시작`이라고 입력하면 `npm run dev:qa`로 QA 서버를 실행한 뒤 내전 로비를 두 탭으로 연다.

- 리더 버전: `http://localhost:3011`에서 `QA_Leader_01`로 로그인한다.
- 멤버 버전: `http://127.0.0.1:3011`에서 `QA_Member_02`로 로그인한다.
- 두 탭 모두 `QA_01_Clan`의 `/games/overwatch/clan/{clanId}/balance`로 연결한다. 호스트별 쿠키를 분리해 두 계정을 동시에 유지한다.
- 사용자가 테스트 중인 QA 데이터를 보존하기 위해 시드는 다시 실행하지 않는다.

# 나노 커밋 (절대 잊지 말 것)

`.cursor/rules/git-nano-commit.mdc` 는 `alwaysApply: true`. **한 번의 사용자 질의에 대한 응답 턴**에서 저장소에 변경이 생기면, **그 턴 안에서** 의미 단위별로 `git add`·`git commit`까지 끝낸다. “세션 종료 시에만 정리” 금지. 한 턴에 주제가 여러 개면 **커밋도 나눈다**. 변경이 없는 턴(읽기·설명만)은 커밋 없음. 사용자가 "커밋해"라고 말하지 않아도 자동 수행. **사용자의 푸시 위임(2026-09-15)에 따라 작업 커밋은 현재 작업 브랜치에 자동 푸시한다.** 보류 지시가 있으면 따른다. 별도 수동 Vercel 배포는 명시 요청 시에만.

# 자동 실행 (터미널)

검증은 **변경 위험도에 맞춰 에이전트가 직접 실행**한다. 범위·명령의 기준은 [자동 실행 규칙](.cursor/rules/agent-auto-tasks.mdc), QA 실행법은 [E2E 안내](e2e/README.md)다. 작은 UI·문구 수정에 전체 빌드·로그인 14계정·온보딩·DB 회귀를 반복하지 않는다. 동작 변경은 해당 시나리오, 인증·권한·스키마·금액·공통 라우팅 변경은 영향받는 넓은 범위와 빌드, main 병합·운영 반영 전에는 전체 회귀와 빌드를 검증한다.

현재는 **QA 우선, 운영 DB·배포 보류**다. QA 스키마 변경은 `db:test:push` → `db:test:types`로 적용·타입 확인한다. 연결 DB를 바꾸는 `db:push`·`db:sync`를 QA 명령 대신 사용하지 않는다. 사용자가 테스트 중인 QA 명단에는 시드를 다시 실행하지 않으며 E2E는 `E2E_SKIP_SEED=1`과 별도 임시 데이터를 사용한다.

# 문서 갱신

- `docs/TODO.md`는 현재 초점·제약·다음 우선순위만 유지한다. 상세 구현·검증 근거는 `docs/TODO_Phase2.md`, 설계 결정은 기존 명세에 둔다.
- 동작·결정·진행 상태가 의미 있게 바뀔 때만 해당 문서와 `docs/TODO_LOG.md`를 짧게 갱신한다. 작은 문구·스타일 수정마다 현황표·회고를 복제하지 않는다. 파일별 이력은 Git을 사용한다.

# 응답 스타일 (토큰 절약)

매 턴 다음을 지킨다:

- **선언 금지**: "할게요", "지금부터", "다음 단계는…" 같은 메타 서두 빼고 바로 행동/결과.
- **재진술 금지**: 사용자 질문을 다시 풀어쓰지 않는다.
- **회고 금지**: 방금 한 일을 길게 요약하지 않는다 — 한두 줄 결과 + 핵심 변경 파일만.
- **추측 읽기 금지**: 작업에 직접 필요한 파일만 Read. "혹시 모르니"로 광범위 탐색하지 않는다.
- **도구 일괄**: 독립적인 조회/수정은 한 메시지에서 병렬 호출.
- **검증 보고 압축**: `git status` 같은 확인은 핵심 라인만 인용, 전체 출력 재게시 X.
- **이모지·장식 금지**.
- **계획 발화 최소화**: 3단계 이상 복잡 작업에서만 todo 리스트 생성.
