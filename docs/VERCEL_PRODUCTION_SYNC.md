# Vercel 프로덕션과 GitHub `main` 맞추기

## 목표: 예전처럼 `main` 푸시만으로 배포

프로덕션은 **Vercel 프로젝트의 GitHub 연동**(대시보드에서 저장소 연결)이 정상일 때, **`VERCEL_TOKEN` 없이** 푸시 한 번으로 새 Deployment가 생깁니다.  
이 레포의 GitHub Actions는 **그 연동이 다시 깨졌을 때**만 쓰는 **수동 백업**입니다(아래 참고).

고정 식별자(비밀 아님):

- 팀: **`team_UaVXQMdZ2aJQUkYHxU7iSzN3`** · slug **`clansync`**
- 프로젝트: **`clan-sync`** · **`prj_UwqBACb65GoSqFfqPekMNe15Og8T`**
- 저장소: **`kuble/ClanSync`** · 프로덕션 브랜치: **`main`**

---

## 네이티브 Git 연동 복구 (필수 절차)

아래를 **위에서부터** 순서대로 적용합니다.

### 1. Vercel에서 저장소·브랜치 확인

1. [Vercel Dashboard](https://vercel.com/dashboard) → 팀 **ClanSync** → 프로젝트 **clan-sync**.
2. **Settings** → **Git**.
3. **Connected Git Repository**가 **`kuble/ClanSync`** 인지 확인.
4. **Production Branch**가 **`main`** 인지 확인.
5. 연결이 비어 있거나 다른 레포면 **Connect**로 `kuble/ClanSync`를 다시 연결하거나, **Disconnect** 후 같은 저장소로 다시 연결합니다.

### 2. GitHub에서 Vercel 앱 권한 확인

1. GitHub → [Settings → Applications → Installed GitHub Apps](https://github.com/settings/installations) → **Vercel**.
2. **Configure** → **Repository access**에 **`kuble/ClanSync`**(또는 All repositories)가 포함되는지 확인합니다.
3. 권한 갱신·재승인 요청이 있으면 승인합니다.

(조직 레포라면 조직 **Settings → Third-party access**에서도 Vercel 접근이 막혀 있지 않은지 확인합니다.)

### 3. 로컬 CLI에서 연결 시도(선택)

프로젝트 루트에서 Vercel에 로그인한 뒤:

```bash
npx vercel link --scope clansync --project clan-sync
npx vercel git connect
```

원격이 `origin`이 GitHub `kuble/ClanSync`인지(`git remote -v`) 먼저 확인합니다. 대시보드와 동기가 안 맞을 때 보조로 씁니다.

### 4. 동작 확인

`main`에 작은 커밋을 푸시하거나, Vercel **Deployments**에서 **Redeploy**로 확인합니다.  
새 줄의 **Source**에 방금 푸시한 커밋이 보이면 복구된 것입니다.

### `main`과 프로덕션 커밋이 여전히 어긋날 때

1. GitHub `main` 최신 SHA와 Vercel 프로덕션 배포 **Source** SHA를 비교합니다.
2. **Settings → Git**에 무시 스크립트(Ignored Build Step)나 빌드 스킵 규칙이 없는지 봅니다.
3. 그래도 안 되면 아래 [보조: Actions로 수동 프로덕션 배포](#보조-actions로-수동-프로덕션-배포-cli)로 한 번 올린 뒤, Vercel 지원·감사 로그로 Git 이벤트 수신 여부를 확인합니다.

---

## 과거에 뭐가 깨졌는지 (참고)

| 구간 | 관측 |
|------|------|
| GitHub **`kuble/ClanSync` `main`** | 커밋은 정상적으로 앞으로 감 |
| Vercel **네이티브 Git 연동** | **약 2026-04-28 전후**부터 프로덕션 배포가 **최신 `main`을 따라가지 않음**으로 관측됨 (GitHub 앱 권한 · 프로젝트 연결 · 웹훅 쪽 점검 필요) |
| 잘못된 Deploy Hook(`prj_` 불일치) | API는 성공해도 **이 프로젝트** Deployments 줄에는 안 보일 수 있음 |

**원인 요약(일반론)**: 예전 “토큰 없이 됨”은 **대시보드에서 한 번 연결해 둔 Git 연동**이 알아서 이벤트를 받았기 때문입니다. 그 연결이 끊기면 푸시만으로는 Vercel이 새 빌드를 만들지 않습니다.

---

## 이중 배포 방지

네이티브 Git이 정상이면 푸시마다 Vercel이 이미 빌드합니다.  
그래서 **`.github/workflows/vercel-deploy-production.yml`은 `push`로는 실행하지 않고**, 필요할 때만 **Actions에서 수동 실행(`workflow_dispatch`)** 합니다.

---

## 보조: Deploy Hook (수동·디버깅)

워크플로: **Trigger Vercel production (deploy hook)** — **`workflow_dispatch` 만**.

훅 URL에 **`/deploy/prj_UwqBACb65GoSqFfqPekMNe15Og8T/`** 가 포함되는지 확인합니다.

---

## 보조: Actions로 수동 프로덕션 배포 (CLI)

워크플로: **Deploy production (Vercel CLI)** — **`workflow_dispatch` 만** (자동 `push` 없음).

1. [Vercel Account Tokens](https://vercel.com/account/tokens)에서 토큰 생성.
2. GitHub **Settings → Secrets and variables → Actions**에 **`VERCEL_TOKEN`** 저장.
3. **Actions** → **Deploy production (Vercel CLI)** → **Run workflow**.

Git 연동이 고쳐진 뒤에는 이 워크플로를 **자동으로 돌리지 않는 것**을 권장합니다(위 워크플로 파일 참고).

---

## 보안

- **`VERCEL_TOKEN`**: 패스워드급. 유출 시 폐기·재발급.
- **Deploy Hook URL**: URL만으로 빌드 트리거 가능.
