<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 나노 커밋 (절대 잊지 말 것)

`.cursor/rules/git-nano-commit.mdc` 는 `alwaysApply: true`. 구현·수정으로 파일이 바뀌면 **의미 단위마다 즉시** `git commit`. 세션 끝까지 미커밋을 쌓아두지 않는다. 사용자가 "커밋해"라고 말하지 않아도 자동 수행. 푸시는 명시 요청 시에만.

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
