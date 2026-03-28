# 구현 진행도 · 세션 TODO (허브)

> **페이즈별 체크리스트**는 아래 문서로 나눈다. 세션 종료 시 **[세션 로그](./IMPLEMENTATION_PROGRESS_SESSION_LOG.md)** 맨 위에 블록을 추가하고, 해당 페이즈 문서의 체크·요약표를 갱신한다.  
> **/todo 커맨드**: `.cursor/commands/todo.md` 절차로 문서·목업과 동기화한다.

## 페이즈별 문서

| Phase | 문서 | 내용 |
|:-----:|------|------|
| **1** | [IMPLEMENTATION_PROGRESS_Phase1.md](./IMPLEMENTATION_PROGRESS_Phase1.md) | 정적 목업 S00~S08 · 공통 목업 · 슬라이스 요약표 |
| **2** | [IMPLEMENTATION_PROGRESS_Phase2.md](./IMPLEMENTATION_PROGRESS_Phase2.md) | `src/` · Supabase · 라우트 대응표 |

**히스토리만**: [IMPLEMENTATION_PROGRESS_SESSION_LOG.md](./IMPLEMENTATION_PROGRESS_SESSION_LOG.md) (일상 작업 시 생략 가능)

---

## 현재 상태

| 항목 | 값 |
|------|-----|
| **현재 단계** | Phase 1 — 정적 목업 (`mockup/`, `_hub.html`) |
| **다음 단계 (예정)** | Phase 2 — Next.js `src/` · API · DB (별도 착수 시) |
| **마지막 갱신** | 2026-03-28 |

---

## 다음 세션 권장 프롬프트 (/todo 갱신 시 덮어씀)

**지금 단계(Phase 1)** — 복사용:

`FEATURE_INDEX`에서 슬라이스 ID 하나를 고른 뒤, 아래 `slice-NN-....md`만 실제 파일명으로 바꿔 `@`에 붙인다.

```
@docs/01-plan/FEATURE_INDEX.md @docs/IMPLEMENTATION_PROGRESS_Phase1.md @docs/01-plan/slices/slice-NN-....md 참고해서
Phase 1 체크 `[ ]`·요약표 **진행 중** 행·BACKLOG 연계 중 (구체 과제 한 문장).

완료 후 `docs/IMPLEMENTATION_PROGRESS_SESSION_LOG.md` 세션 로그·`IMPLEMENTATION_PROGRESS_Phase1.md` 체크·요약표를 갱신한다.
```

**Phase 2 착수 시** — 복사용:

착수하면 허브 **현재 단계**를 Phase 2로 바꾼 뒤 아래를 붙인다. (슬라이스 단위로 나눌 때는 `slice-NN-....md` 한 파일을 `@`에 추가.)

```
@docs/IMPLEMENTATION_PROGRESS_Phase2.md @docs/01-plan/pages.md @docs/01-plan/schema.md 참고해서
Phase 2: 체크리스트·라우트 대응표 중 (구체 과제 한 문장 — 예: `pages.md` 경로 한 덩어리·RLS 초안·미들웨어 스텁).

완료 후 `docs/IMPLEMENTATION_PROGRESS.md` 마지막 갱신·`docs/IMPLEMENTATION_PROGRESS_SESSION_LOG.md` 세션 로그·`IMPLEMENTATION_PROGRESS_Phase2.md` 체크·라우트 표를 갱신한다.
```
