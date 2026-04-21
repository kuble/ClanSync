# 구현 진행도 · 세션 TODO (허브)

> **페이즈별 체크리스트**는 아래 문서로 나눈다. 세션 종료 시 **[세션 로그](./TODO_LOG.md)** 맨 위에 블록을 추가하고, 해당 페이즈 문서의 체크·요약표를 갱신한다.  
> **/todo 커맨드**: `.cursor/commands/todo.md` 절차로 문서·목업과 동기화한다.

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
| **현재 단계** | Phase 2 — Next.js `src/` · Supabase · RLS |
| **이전 단계** | Phase 1 — 정적 목업 (`mockup/`) **종료** (2026-03-28) |
| **마지막 갱신** | 2026-04-21 (D-NOTIF-02 종결 — **브라우저 ServiceWorker 푸시 프리셋 α** (Premium 전용·4 카테고리 독립 토글·맥락형 권한 프롬프트·서버 quiet hours 00~07 KST 준수). 범위 **R3** = 결정·스키마(`web_push_subscriptions` + `notification_log.channel='web_push'`)·목업 예고 배너 1줄까지만. 실구현(VAPID·ServiceWorker·권한 프롬프트·구독 관리 UI)은 Phase 2+ 이관 — 후속 후보 D-NOTIF-02b(공급자 선택)·D-NOTIF-02c(Free 하이브리드 재검토)·D-NOTIF-03(이메일 다이제스트)·D-PRIV-01(개인 프라이버시 오버라이드). 직전 묶음: D-NOTIF-01 — in-app 알림 센터 통합(프리셋 α, 디스코드식 벨+드로워, M1 저장, 7일 GC).) |

---

## 다음 세션 권장 프롬프트 (/todo 갱신 시 덮어씀)

**지금 단계(Phase 2)** — 복사용:

슬라이스 단위로 나눌 때는 `slice-NN-....md` 한 파일을 `@`에 추가한다.

```
@docs/TODO_Phase2.md @docs/01-plan/pages.md @docs/01-plan/schema.md 참고해서
Phase 2: 체크리스트·라우트 대응표 중 (구체 과제 한 문장 — 예: 라우트 스텁 한 묶음·RLS 초안·미들웨어).

완료 후 `docs/TODO.md` 마지막 갱신·`docs/TODO_LOG.md` 세션 로그·`docs/TODO_Phase2.md` 체크·라우트 표를 갱신한다.
```

**목업만 수정·동기화할 때 (Phase 1 유지보수)** — 복사용:

```
@docs/01-plan/FEATURE_INDEX.md @docs/TODO_Phase1.md @docs/01-plan/slices/slice-NN-....md 참고해서
목업·문서 정합 (구체 과제 한 문장).

완료 후 `docs/TODO_LOG.md` 세션 로그·필요 시 `docs/TODO_Phase1.md`를 갱신한다.
```
