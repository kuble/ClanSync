# todo

`docs/TODO.md`(허브)와 **현재 페이즈** 문서(`TODO_Phase2.md` 등)를 **문서·코드·목업과 대조**해 갱신하고, **다음 세션에 쓸 프롬프트**를 사용자에게 출력한다.

## 실행 순서

### 1. 참조 문서 읽기

- `docs/TODO.md` (허브 — 짧게)
- `docs/TODO_LOG.md` (세션 로그 갱신 시에만)
- `docs/TODO_Phase2.md` (Phase 2 체크·라우트 표) — 목업 유지보수만이면 `docs/TODO_Phase1.md`
- `docs/01-plan/FEATURE_INDEX.md`, `docs/01-plan/BACKLOG.md`
- 필요 시 `docs/01-plan/slices/slice-*.md`, `docs/01-plan/pages.md`, `docs/01-plan/schema.md`

### 2. 산출물 대조

**Phase 2 (`src/`·Supabase)**  
- `pages.md` 경로와 `Phase2` 라우트 표·실제 `src/app/` 존재 여부를 대조한다.  
- `schema.md`·RLS·미들웨어는 체크리스트와 구현 상태를 맞춘다.

**목업 유지보수 (Phase 1)**  
- `mockup/`·슬라이스「목업」절 경로가 실제로 있는지 확인한다.  
- **문서 정합**은 `clan-stats-plan.md`·`balance-maker-ui-notes.md` 등과 대조한다.

### 3. 진행도 문서 수정

- **허브** `docs/TODO.md`: **마지막 갱신** 날짜.
- **세션 로그** `docs/TODO_LOG.md`: 맨 위에 블록 추가 (히스토리 전용).
- **Phase 2** `docs/TODO_Phase2.md`: 체크·라우트 표 `[ ]` / `[x]`·비고 열.
- **Phase 1** (목업만 손볼 때): `docs/TODO_Phase1.md` 요약표·체크.

### 4. 「다음 세션 권장 프롬프트」 블록 갱신

`docs/TODO.md` 하단 `## 다음 세션 권장 프롬프트`를 갱신한다. **기본은 첫 번째 블록(Phase 2)** 을 덮어쓴다. 다음 작업이 **목업만**이면 **두 번째 블록**을 구체 과제로 맞춘다.

1. **우선순위**: `docs/TODO_Phase2.md`에서 아직 `[ ]`인 항목 중 **의존성이 적고 기획과의 갭이 큰 것**을 고른다 (또는 목업 이슈면 Phase 1).
2. **Phase 2** 첫 번째 코드 블록: `Phase2`·`pages`·`schema`·선택 `slice-NN` — 형식은 허브 **지금 단계(Phase 2)** 와 동일.
3. 목업 유지보수면 **두 번째 블록**(`목업만 수정…`)을 채운다.

### 5. 채팅 응답

- 갱신 요약을 3~5줄로 설명한다.
- 위 **복사용 프롬프트**를 그대로 코드 블록으로 출력한다.

## 주의

- `.bkit/` 등 로컬 전용 파일은 커밋하지 않는다.
- 나노 커밋: 진행도 관련 `docs/TODO*.md`만 바뀌면 `docs:` 또는 `chore:` 로 한 번 커밋한다.
