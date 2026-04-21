# 구현 진행도 · 세션 TODO (허브)

> **페이즈별 체크리스트**는 아래 문서로 나눈다. 세션 종료 시 **[세션 로그](./TODO_LOG.md)** 맨 위에 블록을 추가하고, 해당 페이즈 문서의 체크·요약표를 갱신한다.  
> **/todo 커맨드**: `.cursor/commands/todo.md` 절차로 문서·목업과 동기화한다.

> **지금 라이브**: `/` · `/sign-in` · `/sign-up` · `/games` (M2) · 체감 로드맵 → [PHASE2_EXPERIENCE.md](./PHASE2_EXPERIENCE.md) · **다음 라이브**: M3 — `/games/[g]/auth` · `/games/[g]/clan` 온보딩

## 페이즈별 문서

| Phase | 문서 | 내용 |
|:-----:|------|------|
| **1** | [TODO_Phase1.md](./TODO_Phase1.md) | 정적 목업 S00~S08 (종료) |
| **2** | [TODO_Phase2.md](./TODO_Phase2.md) | `src/` · Supabase · 라우트 대응표 |

**히스토리만**: [TODO_LOG.md](./TODO_LOG.md) (일상 작업 시 생략 가능)

---

## 현재 상태

| 항목 | 값 |
|------|-----|
| **현재 단계** | Phase 2 — Next.js `src/` · Supabase · RLS (마스터 플랜 M0~M8) |
| **이전 단계** | Phase 1 — 정적 목업 (`mockup/`) **종료** (2026-03-28) |
| **마지막 갱신** | 2026-04-21 — **M2 S01 인증 쉘 착지**: `0002` 마이그레이션(D-AUTH-06·게임 시드·`handle_new_user`) · `src/app/actions/auth.ts` 로그인/가입/로그아웃 · 루트 `middleware.ts` D-LANDING-04 + `/games` 비로그인 가드 · `src/lib/routing/game-card-router.ts` · `npm run db:seed` · 온보딩 스텁 3종. 다음 세션 = **M3 S02** — `/games/[g]/auth`(OAuth) · `/games/[g]/clan`(가입/생성) + RLS 1차. |

---

## 다음 세션 권장 프롬프트 (/todo 갱신 시 덮어씀)

**지금 단계(Phase 2 · 다음은 M3 S02 온보딩)** — 복사용:

```
@docs/TODO_Phase2.md @docs/01-plan/pages.md @docs/01-plan/slices/slice-02-game-clan-onboarding.md 참고해서
Phase 2 M3: `/games/[gameSlug]/auth`(D-AUTH-02/05) + `/games/[gameSlug]/clan`(D-CLAN-01/02/04) + RLS 1차. 가입 신청·승인 플로우.

완료 후 공통 게이트(수용 기준·가드 체인·RLS 테스트·라우트 표 갱신·세션 로그)를 만족시키고 허브를 갱신한다.
```

슬라이스 단위로 나눌 때는 `slice-NN-....md` 한 파일을 `@`에 추가한다.

**M2 이후 슬라이스 착수 시(일반)** — 복사용:

```
@docs/TODO_Phase2.md @docs/01-plan/pages.md @docs/01-plan/slices/slice-NN-....md 참고해서
Phase 2 M?: (슬라이스 수용 기준 중 한 묶음 한 문장).

완료 후 공통 게이트 5개(수용 기준·가드 체인·RLS 테스트·라우트 표 갱신·세션 로그) 모두 만족시키고 허브를 갱신한다.
```

**목업만 수정·동기화할 때 (Phase 1 유지보수)** — 복사용:

```
@docs/01-plan/FEATURE_INDEX.md @docs/TODO_Phase1.md @docs/01-plan/slices/slice-NN-....md 참고해서
목업·문서 정합 (구체 과제 한 문장).

완료 후 `docs/TODO_LOG.md` 세션 로그·필요 시 `docs/TODO_Phase1.md`를 갱신한다.
```
