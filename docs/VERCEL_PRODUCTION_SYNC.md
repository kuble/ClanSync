# Vercel 프로덕션과 GitHub `main` 맞추기

**문제**: GitHub에는 최신 커밋이 있는데, Vercel **Deployments** 목록에는 오래된 커밋만 있고 줄이 안 늘어날 때 → 보통 깃허브 → Vercel **push 웹후크**(자동 빌드) 경로만 끊긴 상태입니다. 앱 코드는 이미 깃허브에 반영되어 있으나, 빌드·배포가 안 된 것입니다.

## 한 번에 하는 해결 (권장: Deploy Hook + Actions)

프로덕션 브랜치 **`main`** 기준 빌드를, 푸시와 무관한 **HTTPS URL 한 번 호출**로 돌립니다 ([Vercel Deploy Hooks](https://vercel.com/docs/deploy-hooks)).

1. **[Vercel](https://vercel.com)** → Team **ClanSync** → 프로젝트 **clan-sync** → **Settings** → **Git**
2. **Deploy Hooks**에서 이름(예: `gh-main-sync`), 브랜치 **`main`** 선택 후 생성 → **URL 복사**
3. **GitHub** → `ClanSync` 레포 → **Settings** → **Secrets and variables** → **Actions**
4. **New repository secret** → Name: **`VERCEL_DEPLOY_HOOK`** → 값에 위 URL 붙여넣기 저장
5. **Actions** 탭에서 **Trigger Vercel production (deploy hook)** 워크플로 → **Run workflow** 로 한 번 실행  
   또는 `main`에 아무 빈 커밋이라도 푸시해서 자동 실행

실행 결과는 **워크플로 단계 로그**를 확인하세요. 시크릿이 비었거나 호출 실패 시 **빨간 X**가 나도록 되어 있습니다(예전처럼 “아무 일도 안 했는데 초록 체크”와 구분).

성공 후 Vercel **Deployments** 에 새 줄이 생기고, Production이 최신 커밋 해시와 맞는지 확인합니다.

## 깃 통합까지 복구하고 싶을 때

자동 줄이 안 생기던 **원인**(웹후크 미배달·연결 해제 등)을 없애려면 같은 **Settings → Git**에서:

- 저장소가 **`kuble/ClanSync`** 에 연결돼 있는지
- **Production Branch** 가 **`main`** 인지  
- 필요 시 **Disconnect 후 다시 Connect**

GitHub 레포의 **Settings → Integrations → GitHub Apps → Vercel** 에서도 이 레포 접근 허용을 확인합니다.

## 여전히 Vercel Deployments 줄이 안 늘 때

GitHub Actions는 **성공**(초록)인데 Vercel 목록만 그대로인 경우 아래부터 본다.

1. **워크플로 로그**: `trigger` 작업 안에 **`Unexpected response`** / **`job이 없습니다`** 같은 빨간 오류가 없는지.  
   최신 워크플로는 **`https://api.vercel.com/v1/integrations/deploy/...`** 형태의 Deploy Hook만 받으며, 성공하면 **`job.id` / `job.state`**가 로그에 찍힌다.
2. **시크릿 값 오타**: 페이지 주소 줄에 **블라우저 주소창 URL**(대시보드 URL) 대신 **훅 생성 후 표시되는 API URL 한 줄**을 넣어야 한다. 줄 끝 **공백·따옴표** 들어가 있지 않은지 메모장에 넣어 본다.
3. **Vercel Git 연결**: [Deploy Hooks](https://vercel.com/docs/deploy-hooks) 설명처럼 훅을 쓰려면 프로젝트가 **저장소에 연결**돼 있어야 한다. **Settings → Git**에서 `Disconnect` 상태면 우선 레포 다시 연결하고 훅을 다시 만들어 시크릿을 갱신한다.
4. **팀/프로젝트**: 브라우저에서 보는 프로젝트가 **`ClanSync` 팀 · `clan-sync`** 인지(다른 팀의 이름만 같은 프로젝트 방지).

## 보안

Deploy Hook URL을 아는 사람은 누구나 해당 브랜치로 빌드를 돌릴 수 있습니다. URL이 새었으면 Vercel에서 훅을 **삭제 후 재생성**하고, GitHub Secret도 같이 갱신합니다.
