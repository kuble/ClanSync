# Heroicons — in-use 화이트리스트

이 폴더(`mockup/assets/icons/heroicons/`)는 **벤더 아이콘 풀팩**이라
용량이 커서 git에 올리지 않습니다. (`.gitignore`에서 `*` 패턴으로 무시 중)

대신 **이 팩에서 실제로 사용하는 아이콘만** `in-use/` 폴더에 복사해 두면
git이 그 파일들만 추적합니다.

> ℹ️ 이전에는 git submodule(`tailwindlabs/heroicons`)로 등록되어 있었으나,
> 풀팩을 통째로 트래킹할 필요가 없어 일반 폴더로 정리했다 (서브모듈 deinit 완료).

## 사용법

1. 팩 안에서 원하는 SVG를 찾는다.
   - 사이즈/스타일별로 분류되어 있다: `src/24/outline/`, `src/24/solid/`,
     `src/20/solid/`, `src/16/solid/` 등.
2. **복사**해서 `in-use/` 아래에 둔다.
   - 같은 사이즈/스타일 폴더 구조를 그대로 만들어 두면 출처가 분명해진다.
     예: `in-use/24/outline/users.svg`
3. 마크업/CSS에서는 `mockup/assets/icons/heroicons/in-use/24/outline/users.svg`
   경로로 참조한다.
4. `git add` → 커밋. (`in-use/` 외 파일은 자동으로 무시됨)

## 새 PC에서 풀팩이 필요할 때

```bash
# 풀팩만 임시로 가져오기 (서브모듈 등록 X)
git clone --depth 1 https://github.com/tailwindlabs/heroicons.git mockup/assets/icons/heroicons-tmp
robocopy mockup/assets/icons/heroicons-tmp mockup/assets/icons/heroicons /E /XD .git
Remove-Item -Recurse -Force mockup/assets/icons/heroicons-tmp
```

`in-use/`는 git이 이미 갖고 있으니 그대로 유지된다.
