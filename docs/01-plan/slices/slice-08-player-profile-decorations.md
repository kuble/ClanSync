# S08 — 플레이어 프로필·꾸미기

## 결정 참조

- 네임플레이트·뱃지 스트립·해금 출처: **[D-PROFILE-01](../decisions.md#d-profile-01--네임플레이트-동기화-규약)** · **[D-PROFILE-02](../decisions.md#d-profile-02--가입-신청-대기-목록-데이터-출처)** · **[D-PROFILE-03](../decisions.md#d-profile-03--뱃지-케이스--프로필-스트립-동기화)** · **[D-PROFILE-04](../decisions.md#d-profile-04--뱃지-해금-출처)**.
- 부계정 열람은 **[D-PERM-01](../decisions.md#d-perm-01--클랜-권한-매트릭스-모델-도입)** 권한 키 `view_alt_accounts`(D-MANAGE-03 흡수, 기본 leader/officer/member 허용). 개인 통계 오버라이드는 **[D-PRIV-01](../decisions.md#d-priv-01--개인-단위-프라이버시-오버라이드-프리셋-α)** (부계정 키 제외).

## 스코프

- 전역 프로필 (`profile.html` 또는 모달 주입)
- 뱃지 케이스·네임플레이트 프리뷰 — `app.js` + `mockup/partials/*`
- 게임별 칩 전환(OW/VAL 등 목업)

## 수용 기준

- [x] 장착 뱃지 최대 개수(5)·게임별 `mockBadgeCaseGetPicks()` 목업이 `profile.html`·뱃지 케이스·`app.js` `MOCK_BADGE_NAMEPLATE_MAX`와 일치
- [x] 사용자 이미지 업로드로 네임플레이트 대체 **없음** — `nameplate-case-modal` 하단·`docs/01-plan/pages/09-BalanceMaker.md` §참가자 네임플레이트·프로필 상단 안내와 정합

## 목업

| 경로 |
|------|
| `mockup/pages/profile.html` |
| `mockup/partials/player-profile-modal.html` |
| `mockup/partials/badge-case-modal.html` |
| `mockup/partials/nameplate-case-modal.html` |
| `mockup/scripts/app.js` |

## 백로그

- 가입 신청 목록: [../BACKLOG.md](../BACKLOG.md)
