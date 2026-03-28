# todo

`docs/IMPLEMENTATION_PROGRESS.md`(허브)와 **현재 페이즈** 문서(`IMPLEMENTATION_PROGRESS_Phase1.md` 등)를 **문서·목업과 대조**해 갱신하고, **다음 세션에 쓸 프롬프트**를 사용자에게 출력한다.

## 실행 순서

### 1. 참조 문서 읽기

- `docs/IMPLEMENTATION_PROGRESS.md` (허브 — 짧게)
- `docs/IMPLEMENTATION_PROGRESS_SESSION_LOG.md` (세션 로그 갱신 시에만)
- `docs/IMPLEMENTATION_PROGRESS_Phase1.md` (Phase 1 체크·요약표) — Phase 2 착수 시 `IMPLEMENTATION_PROGRESS_Phase2.md` 병행
- `docs/01-plan/FEATURE_INDEX.md`, `docs/01-plan/BACKLOG.md`
- 필요 시 `docs/01-plan/slices/slice-*.md`, `docs/01-plan/pages.md`

### 2. 목업·스크립트 존재 여부 확인 (슬라이스별)

- `mockup/_hub.html`, `mockup/pages/*.html`, `mockup/scripts/clan-mock.js`, `app.js` 등 슬라이스에 해당하는 경로가 실제로 있는지 확인한다.
- HTML/CSS에 해당 뷰(통계·이벤트·스토어 등)가 **골격 이상**이면 목업 1차 항목은 `[x]`로 둘 수 있다.
- **문서 정합·폴리시** 항목은 코드만으로 완료 판단하지 않고, `clan-stats-plan.md`·`balance-maker-ui-notes.md` 등과 대조해 누락이 없으면 `[x]`, 남으면 `[ ]`.

### 3. 진행도 문서 수정

- **허브** `IMPLEMENTATION_PROGRESS.md`: **마지막 갱신** 날짜.
- **세션 로그** `IMPLEMENTATION_PROGRESS_SESSION_LOG.md`: 맨 위에 블록 추가 (히스토리 전용).
- **Phase 1** `IMPLEMENTATION_PROGRESS_Phase1.md`: 체크리스트 `[ ]` / `[x]`, **빠른 요약표**를 체크와 일치.
- Phase 2 작업 시 `IMPLEMENTATION_PROGRESS_Phase2.md`를 동일 방식으로 갱신.

### 4. 「다음 세션 권장 프롬프트」 블록 갱신

`IMPLEMENTATION_PROGRESS.md` 하단 `## 다음 세션 권장 프롬프트`를 갱신한다. **첫 번째 블록(Phase 1)** 을 우선 덮어쓴다. Phase 2 작업이 다음 우선순위면 **두 번째 블록**도 구체 과제로 맞춘다.

1. **우선순위**: `IMPLEMENTATION_PROGRESS_Phase1.md`(또는 Phase 2)에서 아직 `[ ]`인 항목 중 **의존성이 적고 기획과의 갭이 큰 것**을 고른다.
2. **Phase 1** 첫 번째 코드 블록: `slice-NN-....md`를 실제 슬라이스 파일명으로 바꿔 `@`에 넣고, 구체 과제·세션 로그 문구를 채운다. 형식은 `IMPLEMENTATION_PROGRESS.md` 하단 **지금 단계(Phase 1)** 와 동일.
3. 다음 작업이 Phase 2면 **두 번째 코드 블록**(`Phase 2 착수 시`)을 구체 과제로 맞춘다. 형식은 `IMPLEMENTATION_PROGRESS.md` 하단과 동일(`Phase2`·`pages`·`schema`·선택 `slice-NN`).

### 5. 채팅 응답

- 갱신 요약을 3~5줄로 설명한다.
- 위 **복사용 프롬프트**를 그대로 코드 블록으로 출력한다.

## 주의

- `.bkit/` 등 로컬 전용 파일은 커밋하지 않는다.
- 나노 커밋: 진행도 관련 `docs/IMPLEMENTATION_PROGRESS*.md`만 바뀌면 `docs:` 또는 `chore:` 로 한 번 커밋한다.
