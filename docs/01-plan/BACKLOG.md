# 백로그 — 미결·후속 반영

> **기획 동결** 이후 여기에만 적는다. 슬라이스 본문에 새 요구를 늘리지 말고, 반영 시 해당 슬라이스 파일을 수정한다.
>
> **이관 안내 (2026-04-20)**: 결정 필요 항목은 [decisions.md](./decisions.md)로 통합 이관됨. BACKLOG는 "구현 메모(후속)"·"에셋 교체" 등 **결정이 아닌 작업 메모**만 유지. 새 미결 정책·규칙은 BACKLOG가 아닌 decisions.md에 D-XXX-NN 코드로 추가.

---

## 미결 논의 → decisions.md로 이전 완료

| 옛 BACKLOG 항목 | 이관 코드 |
|------------------|-----------|
| 랜딩 캐치프라이즈 최종 문구 | [D-LANDING-01](./decisions.md) |
| 클랜 생성 시 가짜 클랜 검증 (절차·UX·제재) | [D-CLAN-03](./decisions.md) |
| 클랜 코인 구체적 수치 | [D-ECON-01](./decisions.md) |
| 운영진 부정 코인 세탁 방지 | [D-ECON-02](./decisions.md) |
| 클랜 순위표 민감 지표 포함 여부 | [D-ECON-03](./decisions.md) |
| 특이사항 태그 세부 기준 | [D-ECON-04](./decisions.md) |
| 플레이어 프로필 가입 신청 대기 목록 (정책 부분) | [D-PROFILE-02](./decisions.md) |

> 위 항목들에 대한 결정·논의는 더 이상 여기서 하지 않는다. 코드 페이지에서 `OPEN/DECIDED` 상태로 추적.

---

## 구현 메모 (후속) — 결정이 아닌 작업 항목

### 플레이어 프로필 — 가입 신청 대기 목록 (UI 작업)

- 홍보글 «가입 신청하기» 후 **신청 대기 클랜 목록**을 프로필에서 확인
- 항목: 클랜명, 신청일, 상태(대기/승인/거절), 대기 중 취소 가능
- 목업 참고: `mockup/pages/main-game.html` → `openJoinModal()` / `submitJoin()`
- 반영 슬라이스: [slices/slice-08-player-profile-decorations.md](./slices/slice-08-player-profile-decorations.md)
- **정책 결정 부분은** [D-PROFILE-02](./decisions.md) **참조**.

### 에셋 교체

- [ ] 티어 아이콘 — `main-game.html`의 `TIER_IC`, `promoTagsHtml()`, `lfgTierIconsHtml()`
- [ ] 클랜 배지 — `BADGE_DEFS`, `clanBadgesHtml()`
- [ ] 게임 사이드바 썸네일

목업 상단 `.mock-main-game-asset-hint`로 플레이스홀더 안내 표시(에셋 들어가기 전까지 유지).

---

## 문서 메타

- 이 파일은 **우선순위 정렬 없음**. 스프린트 시작 시 항목을 골라 슬라이스/PRD에 옮긴 뒤 여기서 지우거나 «완료» 표시한다.
- 정책·규칙 결정은 [decisions.md](./decisions.md), 권한·플랜 매트릭스는 [gating-matrix.md](./gating-matrix.md), 용어 정의는 [glossary.md](./glossary.md).
