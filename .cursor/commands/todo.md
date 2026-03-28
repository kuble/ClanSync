# todo

`docs/IMPLEMENTATION_PROGRESS.md`를 **문서·목업과 대조**해 갱신하고, **다음 세션에 쓸 프롬프트**를 사용자에게 출력한다.

## 실행 순서

### 1. 참조 문서 읽기

- `docs/IMPLEMENTATION_PROGRESS.md` (현재 체크 상태)
- `docs/01-plan/FEATURE_INDEX.md`, `docs/01-plan/BACKLOG.md`
- 필요 시 `docs/01-plan/slices/slice-*.md`, `docs/01-plan/pages.md`

### 2. 목업·스크립트 존재 여부 확인 (슬라이스별)

- `mockup/_hub.html`, `mockup/pages/*.html`, `mockup/scripts/clan-mock.js`, `app.js` 등 슬라이스에 해당하는 경로가 실제로 있는지 확인한다.
- HTML/CSS에 해당 뷰(통계·이벤트·스토어 등)가 **골격 이상**이면 목업 1차 항목은 `[x]`로 둘 수 있다.
- **문서 정합·폴리시** 항목은 코드만으로 완료 판단하지 않고, `clan-stats-plan.md`·`balance-maker-ui-notes.md` 등과 대조해 누락이 없으면 `[x]`, 남으면 `[ ]`.

### 3. `IMPLEMENTATION_PROGRESS.md` 수정

- **마지막 갱신** 날짜를 오늘(사용자 타임존 기준)로 바꾼다.
- 체크리스트: 확인 결과에 맞게 `[ ]` / `[x]` 갱신.
- **빠른 요약표**의 「목업 1차」「폴리시·문서 정합」을 체크리스트와 일치시킨다.
- **세션 로그** 맨 위에 블록 추가: `### YYYY-MM-DD — /todo 커맨드로 진행도 동기화` + 완료한 갱신 요약 불릿.

### 4. 「다음 세션 권장 프롬프트」 블록 갱신

파일 하단의 `## 다음 세션 권장 프롬프트` 아래 내용을 **매번 덮어쓴다**:

1. **우선순위**: 체크리스트에서 아직 `[ ]`인 항목 중, **의존성이 적고 기획 문서와의 갭이 큰 것**을 1순위로 고른다. (보통 S04 밸런스 문서 정합, S01~S03 최종 점검, S05/S06 폴리시 등)
2. 아래 형식으로 **한 블록**을 채운다 (사용자가 복사해 다음 채팅에 붙여넣을 수 있게).

```markdown
다음 세션 권장 프롬프트 (복사용):

---
@docs/01-plan/FEATURE_INDEX.md @docs/01-plan/slices/slice-XX-....md @docs/IMPLEMENTATION_PROGRESS.md 참고해서
(구체 과제 한 문장: 예) balance-maker-ui-notes.md와 목업의 누락 카피·플로우를 맞춘다.

완료 후 `docs/IMPLEMENTATION_PROGRESS.md` 체크박스·요약표·세션 로그를 갱신해줘.
---
```

### 5. 채팅 응답

- 갱신 요약을 3~5줄로 설명한다.
- 위 **복사용 프롬프트**를 그대로 코드 블록으로 출력한다.

## 주의

- `.bkit/` 등 로컬 전용 파일은 커밋하지 않는다.
- 나노 커밋: 본 커맨드로 `docs/IMPLEMENTATION_PROGRESS.md`만 바뀌면 `docs:` 또는 `chore:` 로 한 번 커밋한다.
