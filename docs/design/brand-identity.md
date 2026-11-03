# ClanSync 로고

현재 로고는 **4번 매듭 심볼과 n–S가 이어진 ClanSync 글자**를 사용한다.

- 라이트 테마는 `public/brand/clansync-symbol.png`와 `public/brand/clansync-wordmark.png`를 사용한다.
- 공통 표시: `src/components/ui/brand-logo.tsx`와 CSS Module. PNG의 투명 여백만 프레임에서 제외하며 이미지 최적화는 Next Image를 사용한다.
- 다크 테마는 비취와 백자 배색의 `clansync-symbol-jade.png`와 `clansync-wordmark-porcelain.png`를 사용한다.
- 이벤트용 다섯 배색은 `public/brand/events/`에 심볼과 글자가 결합된 투명 PNG로 보관한다. `/dev/logo-colors`에서 기본 다크 로고와 비교할 수 있다.
- 전체 조합은 랜딩·로그인·회원가입·게임 선택·계정 온보딩에 적용한다. 클랜/게임 커뮤니티 헤더와 Discord 활용 예시의 프로필은 심볼을 사용한다. 기존 링크 목적지와 이동 중 피드백을 유지한다.
- 클랜·게임 커뮤니티 헤더는 22px 심볼과 40×40px 클릭 영역을 사용한다. 데스크톱의 왼쪽 12px 여백으로 64px 사이드바 중심에 맞추며 모바일은 기존 16px 헤더 여백을 따른다. 경로의 게임명·클랜명·페이지명은 같은 700 굵기로 표시한다.
- 랜딩·게임 선택·로그인/회원가입·프로필·계정 연동 헤더도 22px 로고·60px 높이를 따른다. 헤더 메뉴는 데스크톱 13px/700·16px 간격이며 768px 이하에서는 8px 간격과 16px 좌우 여백을 사용한다. 좁은 계정 메뉴는 접근 가능한 이름을 유지한 아이콘 버튼으로 표시한다.
- 대표 11경로의 320/390/768/1304px·라이트/다크 헤더 크기, 컨트롤 겹침·화면 이탈, 모바일 메뉴 동작은 `e2e/header-layout.spec.ts`에서 확인한다.
- 브라우저 탭은 사이트 테마에 따라 `public/brand/tab-light.png` 또는 `public/brand/tab-jade.png`를 사용한다. 기본 아이콘은 `public/favicon.ico`, Apple 터치 아이콘은 `src/app/apple-icon.png`이다.

심볼이나 글자 원본을 바꾸면 헤더 표시 비율과 탭 아이콘도 함께 확인한다.
