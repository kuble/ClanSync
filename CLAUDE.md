@AGENTS.md

# Claude 개발 진입점

위 import로 공통 지침 전체를 읽는다. 공통 정책의 기준은 [AGENTS.md](AGENTS.md)이며 아래는 작업 진입 안내다. [공식 import 설명](https://code.claude.com/docs/en/memory#import-additional-files).

- 시작은 `docs/TODO.md` → `docs/README.md`의 관련 기능 → 필요한 파일 순서다. Next.js 코드를 쓰기 전에 설치된 `node_modules/next/dist/docs/`의 관련 안내를 읽는다.
- 한국어로 개발하고 응답은 짧게 쓴다. UI·데이터 갱신·문서 동기화 규칙은 공통 지침을 따른다.
- QA 우선이며 운영 DB·수동 배포는 보류다. 활성 QA 계정·기록·연결 정보는 보존하고 재시드하지 않는다. DB·브라우저 자동 검사는 전용 로컬 환경을 사용한다.
- 변경 위험도에 맞춰 필요한 검사만 실행하고 main 병합·운영 반영 전 `npm run test:all`을 유지한다. [검증 기준](docs/guides/agent-validation.md)을 따른다.
- 기존 마이그레이션 231개는 유지한다. 이후 같은 작업의 DB 미적용 SQL만 묶고, 적용본·적용 여부 불명확한 파일의 후속 수정은 새 파일로 추가한다.
- 저장소 변경은 해당 턴 안에 의미별 커밋·현재 작업 브랜치 푸시까지 마친다. 다른 작업의 변경을 섞지 않고 사용자 보류 지시를 우선한다. [개발 작업 지침](docs/guides/development-rules.md)을 따른다.
- Codex 전용 도구명·권한 인수는 Codex에 적용한다. Claude는 자신의 실행 환경에서 같은 호스트 점검·`QA_HTTP_READY`·내장 브라우저 조건을 지킨다. 필요한 도구가 없으면 미완료 범위와 인계를 명시하고 외부 브라우저로 임의 대체하지 않는다.
