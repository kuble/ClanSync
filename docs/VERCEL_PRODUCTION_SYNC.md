# Vercel 프로덕션과 GitHub `main` 맞추기

## 무엇이 깨져 있었는지 (결론)

| 구간 | 상태 |
|------|------|
| GitHub **`kuble/ClanSync` `main`** | 최신 커밋이 계속 반영되는 정상 상태 |
| Vercel **네이티브 Git 연동** (푸시 → 빌드) | **약 2026-04-28 이후 새 프로덕션 배포 줄이 만들어지지 않음**으로 관측됨 (웹훅 · 연결 문제 가설과 일치) |
| Deploy Hook URL을 잘못된 **다른 프로젝트 prj_\*** 에 붙이면 | API는 `{ "job": ... }`로 성공해도 **지금 브라우저에서 여는 `clan-sync` Deployments 줄에는 안 뜸** |

### `main`과 프로덕션 커밋이 어긋났는지 확인

1. GitHub에서 `main` 최신 커밋 SHA 확인(또는 로컬 `git rev-parse origin/main`).
2. Vercel → 팀 **ClanSync** → **clan-sync** → **Deployments** → 최신 Production의 **Source** 커밋 SHA.
3. **SHA가 다르면** GitHub → **Actions** → **Deploy production (Vercel CLI)** 최근 실행 로그를 연 뒤, `VERCEL_TOKEN` 없음 `::error::`가 있는지 확인 → 아래 [한 번만 설정](#한-번만-설정)대로 시크릿을 넣고 **Re-run jobs** 하거나 `main`에 임의 커밋을 푸시.

**원인 요약**: 네이티브 Git 웹훅이 끊기면 Vercel은 예전 커밋에 묶일 수 있습니다. 이 레포의 **대체 경로**는 `VERCEL_TOKEN`이 설정된 Actions뿐이라, 시크릿이 비어 있으면 프로덕션이 `main`을 따라가지 않습니다.

이 레포는 **항상 같은 팀·같은 앱으로** 올리도록 GitHub Actions에 식별자를 박았습니다:

- 조직(team): **`team_UaVXQMdZ2aJQUkYHxU7iSzN3`** · slug **`clansync`**
- 프로젝트 **`clan-sync`**: **`prj_UwqBACb65GoSqFfqPekMNe15Og8T`** (비밀이 아닌 식별자)

---

## 권장: `VERCEL_TOKEN` 한 개로 자동 프로덕션 배포 (메인 경로)

워크플로: **`.github/workflows/vercel-deploy-production.yml`**

`main`에 **푸시될 때마다** (또는 Actions에서 **Run workflow**) Vercel CLI가 위 프로젝트로 **`vercel deploy --prod`** 를 실행합니다. **GitHub ↔ Vercel 웹후크와 무관하게** 새 배포 줄이 이 프로젝트에 생성됩니다.

### 한 번만 설정

1. [Vercel Account Tokens](https://vercel.com/account/tokens)에서 토큰 생성 (설명 예: `gh-actions-clansync`).
2. GitHub `ClanSync` → **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** → Name **`VERCEL_TOKEN`** → 값에 토큰 붙여넣기.
4. `main`에 푸시하거나 Actions에서 **Deploy production (Vercel CLI)** 실행.
5. Vercel 앱 페이지는 팀 **ClanSync**, 프로젝트 **clan-sync** 에서 Deployments 새 줄 확인.

토큰이 없으면 해당 워크플로는 **의도적으로 실패**하여 “배포는 안 했는데 초록 체크”와 구분합니다.

---

## 보조: Deploy Hook (수동·디버깅 전용)

워크플로: **Trigger Vercel production (deploy hook)** — **`workflow_dispatch` 만** 지원 (**`push`에서는 안 돔**, CLI 워크플로와 중복 빌드를 막음).

설정은 종전과 동일하되, 훅 URL 경로에 다음이 포함되는지 확인:

`/deploy/prj_UwqBACb65GoSqFfqPekMNe15Og8T/`

위 ID가 다른 토큰이면 다른 앱으로 빌드가 나갑니다. 워크플로 실행 시 패턴 불일치면 **경고**가 로그에 뜹니다.

---

## 나중에: 네이티브 깃 통합 고치기 (선택)

Vercel **Settings → Git**에서 `kuble/ClanSync` 재연결, Production Branch **`main`** , GitHub 쪽 Vercel 앱 권한 확인. 되살아나면 푸시만으로 중복 줄이 나올 수 있으므로, 그때 **CLI 워크플로의 `push` 트리거를 끄거나** 두 경로 중 하나만 쓸지 결정하면 됩니다.

---

## 보안

- **`VERCEL_TOKEN`**: 패스워드급으로 취급. 유출 시 토큰 폐기·재발급.
- **Deploy Hook URL**: URL만 있으면 빌드를 돌릴 수 있음. 도입 시 본 문서 한 절 참고해 운영.
