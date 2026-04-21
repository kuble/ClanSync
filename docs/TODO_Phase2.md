# Phase 2 — Next.js `src/` · Supabase · RLS

> **허브**: [TODO.md](./TODO.md) · **Phase 1(종료)**: [TODO_Phase1.md](./TODO_Phase1.md) · **세션 로그**: [TODO_LOG.md](./TODO_LOG.md)  
> **단일 출처**: [pages.md](./01-plan/pages.md) (라우트) · [schema.md](./01-plan/schema.md) (DB) · [FEATURE_INDEX.md](./01-plan/FEATURE_INDEX.md) (슬라이스)

| 항목 | 값 |
|------|-----|
| **단계** | Phase 2 — 앱 구현 |
| **마지막 갱신** | 2026-04-21 |

## 체크리스트 (초기 골격)

세부 항목은 세션마다 [TODO.md](./TODO.md) 권장 프롬프트에 따라 한 묶음씩 쪼개어 진행한다.

- [ ] `src/` App Router 스텁·레이아웃·`pages.md` 경로 대응
- [ ] Supabase 클라이언트·환경 변수·마이그레이션 파이프라인
- [ ] RLS 초안·`decisions.md` / `gating-matrix.md` 정합
- [ ] 인증·미들웨어 (D-AUTH-01 · D-SHELL-02 쿼리 정화)
- [ ] 슬라이스 단위 구현 시 `docs/01-plan/slices/slice-NN-....md`의 **결정 참조** 절을 진입점으로 사용

## 라우트 대응표 (placeholder)

| 제품 경로 (개요) | 구현 상태 | 비고 |
|------------------|-----------|------|
| — | — | `pages.md` 정적 목업 ↔ 경로 표와 동기화하며 채움 |

Phase 1 정적 목업(`mockup/`)은 참조용으로 유지; 운영 빌드에서는 제외 정책(D-SHELL-02)을 따른다.
