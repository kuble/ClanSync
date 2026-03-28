# 백로그 — 미결·후속 반영

> **기획 동결** 이후 여기에만 적는다. 슬라이스 본문에 새 요구를 늘리지 말고, 반영 시 해당 슬라이스 파일을 수정한다.

---

## 미결 논의 (PRD에서 이관)

1. 랜딩페이지 캐치프라이즈
2. 클랜 생성 시 가짜 클랜 검증 방안
3. 클랜 코인 구체적 수치
4. 운영진 부정 코인 세탁 방지
5. 클랜 순위표 민감 지표 포함 여부
6. 특이사항 태그 세부 기준

---

## 구현 메모 (후속)

### 플레이어 프로필 — 가입 신청 대기 목록

- 홍보글 «가입 신청하기» 후 **신청 대기 클랜 목록**을 프로필에서 확인
- 항목: 클랜명, 신청일, 상태(대기/승인/거절), 대기 중 취소 가능
- 목업 참고: `mockup/pages/main-game.html` → `openJoinModal()` / `submitJoin()`
- 반영 슬라이스: [slices/slice-08-player-profile-decorations.md](./slices/slice-08-player-profile-decorations.md)

### 에셋 교체

- [ ] 티어 아이콘 — `main-game.html`의 `TIER_IC`, `promoTagsHtml()`, `lfgTierIconsHtml()`
- [ ] 클랜 배지 — `BADGE_DEFS`, `clanBadgesHtml()`
- [ ] 게임 사이드바 썸네일

---

## 문서 메타

- 이 파일은 **우선순위 정렬 없음**. 스프린트 시작 시 항목을 골라 슬라이스/PRD에 옮긴 뒤 여기서 지우거나 «완료» 표시한다.
