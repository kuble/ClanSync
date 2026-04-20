# Ionicons Designer Pack — in-use 화이트리스트

이 폴더(`mockup/assets/icons/ionicons.designerpack/`)는 **벤더 아이콘 풀팩**이라
용량이 커서 git에 올리지 않습니다. (`.gitignore`에서 `*` 패턴으로 무시 중)

대신 **이 팩에서 실제로 사용하는 아이콘만** `in-use/` 폴더에 복사해 두면
git이 그 파일들만 추적합니다.

## 사용법

1. 팩 루트에서 원하는 SVG를 찾는다 (예: `trophy.svg`, `trash-outline.svg`).
2. **복사**해서 `in-use/` 아래에 둔다.
   - 같은 이름 그대로 두는 걸 권장 (혼선 방지).
   - 변형(아웃라인/샤프) 폴더 구조를 만들고 싶으면 자유롭게.
3. 마크업/CSS에서는 `mockup/assets/icons/ionicons.designerpack/in-use/<파일>.svg`
   경로로 참조한다.
4. `git add` → 커밋. (`in-use/` 외 파일은 자동으로 무시됨)

## 왜 이렇게?

- **풀팩(약 1,300+ SVG)을 통째로 커밋**하면 저장소가 부풀고 빌드/배포가 느려진다.
- 그렇다고 매번 다운로드받기는 번거롭다.
- 그래서: **풀팩은 로컬 디스크에만 두고**, **실제 사용하는 아이콘만 git에 올린다**.

## 새 PC에서 풀팩이 필요할 때

[Ionicons Designer Pack 공식 페이지](https://ionic.io/ionicons)에서 받아 이 폴더에 풀어 넣으면 끝.
`in-use/`는 git이 이미 갖고 있으니 그대로 유지된다.
