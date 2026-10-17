# ClanSync 로고

2026-10-17 사용자 선택: **S07 포지션 심볼 + W2 이어짐 글자**.

- 원본: `public/brand/clansync-symbol.png` (1254×1254), `public/brand/clansync-wordmark.png` (1942×809). 선택한 투명 PNG와 동일한 파일을 보존한다.
- 공통 표시: `src/components/ui/brand-logo.tsx`와 CSS Module. PNG의 투명 여백만 프레임에서 제외하며 이미지 최적화는 Next Image를 사용한다.
- 라이트 테마는 원본 초록색, 다크 테마는 같은 형태의 밝은 단색 표시다.
- 전체 조합은 랜딩·로그인·회원가입·게임 선택·계정 온보딩에 적용한다. 클랜/게임 커뮤니티 헤더와 Discord 활용 예시의 프로필은 심볼을 사용한다. 기존 링크 목적지와 이동 중 피드백을 유지한다.
- 브라우저 아이콘: `src/app/favicon.ico` (16/32/48/64px), `icon.png` (64px), `apple-icon.png` (180px). 선택 심볼을 밝은 바탕에 배치해 Next ImageResponse로 렌더했다.

심볼의 실제 영역은 `(313, 310)–(991, 972)`, 글자는 `(83, 229)–(1868, 630)`이다. 원본이 바뀌면 CSS 프레임 비율·좌표와 아이콘도 함께 갱신한다.
