# S08 — 플레이어 프로필·꾸미기

## 스코프

- 전역 프로필 (`profile.html` 또는 모달 주입)
- 뱃지 케이스·네임플레이트 프리뷰 — `app.js` + `mockup/partials/*`
- 게임별 칩 전환(OW/VAL 등 목업)

## 수용 기준

- [x] 장착 뱃지 최대 개수(5)·게임별 `mockBadgeCaseGetPicks()` 목업이 `profile.html`·뱃지 케이스·`app.js` `MOCK_BADGE_NAMEPLATE_MAX`와 일치
- [x] 사용자 이미지 업로드로 네임플레이트 대체 **없음** — `nameplate-case-modal` 하단·`balance-maker-ui-notes` §참가자 네임플레이트·프로필 상단 안내와 정합

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
