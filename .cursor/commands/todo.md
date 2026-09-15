# todo

`docs/TODO.md`(허브)와 **현재 페이즈** 문서를 **문서·코드·목업과 대조**해 갱신하고, **다음 세션에 쓸 프롬프트**를 출력한다.

## 1. 참조 문서

- `docs/TODO.md` (허브 — 짧게)
- `docs/TODO_LOG.md` (세션 로그 갱신 시에만)
- 현재 페이즈 진행도: `docs/TODO_Phase2.md`. 목업만 유지보수할 때는 `docs/TODO_Phase1.md`.
- `docs/01-plan/FEATURE_INDEX.md`, `docs/01-plan/BACKLOG.md`
- 필요 시 `docs/01-plan/slices/slice-*.md`, `docs/01-plan/pages.md`, `docs/01-plan/schema.md`

## 2. 산출물 대조

**Phase 2 (구현 단계)** — `src/` · Supabase가 생성된 시점부터 적용
- `pages.md` 경로 ↔ `Phase2` 라우트 표 ↔ 실제 `src/app/` 존재 여부 대조
- `schema.md` · RLS · 미들웨어 ↔ 체크리스트

**Phase 1 (목업 유지보수)**
- `mockup/` · 슬라이스「목업」절 경로 실재 확인
- 페이지 문서(`pages/10-Clan-Stats.md`, `pages/09-BalanceMaker.md` 등)와 정합

## 3. 진행도 문서 수정

- 허브 `docs/TODO.md`: **마지막 갱신** 날짜
- 세션 로그 `docs/TODO_LOG.md`: 맨 위에 블록 추가 (히스토리)
- 현재 페이즈 진행도: 체크 `[ ]/[x]` · 비고 갱신

## 4. 「다음 세션 권장 프롬프트」 갱신

`docs/TODO.md` 하단의 다음 작업 프롬프트 **한 개**를 현재 우선순위로 갱신한다.

1. 우선순위: 미해결 권한·데이터 정합성 문제 → 미완료 검증 → 후속 기능.
2. 관련 리뷰 또는 `slice-NN`과 필요한 코드·명세만 지정한다.
3. 완료로 표시하기 전에 실제 검증 결과를 확인한다.

## 5. 채팅 응답

- 갱신 요약 3~5줄
- 복사용 프롬프트를 코드 블록으로 출력

## 주의

- `.bkit/` 등 로컬 전용 파일은 커밋 X
- 나노 커밋: 진행도 문서만 바뀌면 `docs:` 또는 `chore:`로 한 번만
