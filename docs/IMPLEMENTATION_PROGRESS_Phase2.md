# Phase 2 — 앱 · API (`src/` · Supabase)

> **허브**: [IMPLEMENTATION_PROGRESS.md](./IMPLEMENTATION_PROGRESS.md) — **세션 로그**: [IMPLEMENTATION_PROGRESS_SESSION_LOG.md](./IMPLEMENTATION_PROGRESS_SESSION_LOG.md)  
> **상태**: 미착수. 착수 시 아래 체크리스트·라우트 표를 채운다.

| 항목 | 값 |
|------|-----|
| **단계** | Phase 2 — Next.js App Router · API · DB |
| **마지막 갱신** | — |

---

## 체크리스트

- [ ] Next.js 라우트가 `pages.md`와 대응
- [ ] Supabase 스키마·RLS 초안 (`schema.md` 정합)
- [ ] 인증·클랜 권한 미들웨어

---

## `pages.md` 라우트 ↔ 구현 대응 (착수 후 채움)

| `pages.md` 경로(개념) | App Router·비고 |
|----------------------|-----------------|
| `/` | |
| `/sign-in`, `/sign-up` | |
| `/profile` | |
| `/games` | |
| `/games/[gameSlug]/auth` | |
| `/games/[gameSlug]/clan` | |
| `/games/[gameSlug]/clan/[clanId]` 및 하위 | |
| `/games/[gameSlug]` | |
| `/games/[gameSlug]/board/[postId]` | |
