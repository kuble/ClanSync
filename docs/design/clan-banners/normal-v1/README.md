# 클랜 배너 · 노말 10종

2026-10-29 제작. 게임 캐릭터·로고 없이 작은 반복 패턴과 두 계열 색으로 구성한 정적 배너다.

## 등급 기준

| 코드 | 표시 | 디자인 기준 |
| --- | --- | --- |
| `normal` | 노말 | 정말 간단한 디자인 패턴 |
| `rare` | 레어 | 간단한 도형으로 만들어진 디자인 |
| `unique` | 유니크 | 일러스트레이터 원화 |
| `legend` | 레전드 | 애니메이팅 되어있는 배너 |

이번 10종은 모두 `normal`이다. 등급은 [제작 목록](manifest.json)에 기록하며 가격·구매 조건·DB 상품 등록은 별도 작업이다. 기존 QA 보유·장착 상태를 바꾸지 않는다.

## 제작 목록

| 번호 | 이름 | 패턴 | 이미지 |
| --- | --- | --- | --- |
| 01 | 그래파이트 | 가느다란 세로줄 | [WebP](../../../../public/clan-banners/normal-v1/01-graphite-hairline.webp) |
| 02 | 네이비 스트라이프 | 얇은 가로줄 | [WebP](../../../../public/clan-banners/normal-v1/02-navy-horizontal.webp) |
| 03 | 포레스트 사선 | 반복 사선 | [WebP](../../../../public/clan-banners/normal-v1/03-forest-diagonal.webp) |
| 04 | 버건디 도트 | 작은 점 | [WebP](../../../../public/clan-banners/normal-v1/04-burgundy-dots.webp) |
| 05 | 인디고 체크 | 얇은 격자 | [WebP](../../../../public/clan-banners/normal-v1/05-indigo-grid.webp) |
| 06 | 코퍼 크로스 | 성긴 교차선 | [WebP](../../../../public/clan-banners/normal-v1/06-copper-crosshatch.webp) |
| 07 | 틸 리플 | 완만한 물결선 | [WebP](../../../../public/clan-banners/normal-v1/07-teal-ripple.webp) |
| 08 | 플럼 헤링본 | 작은 헤링본 | [WebP](../../../../public/clan-banners/normal-v1/08-plum-herringbone.webp) |
| 09 | 슬레이트 대시 | 짧은 점선 | [WebP](../../../../public/clan-banners/normal-v1/09-slate-dash.webp) |
| 10 | 올리브 위브 | 잔잔한 직조선 | [WebP](../../../../public/clan-banners/normal-v1/10-olive-weave.webp) |

![노말 배너 10종 비교](contact-sheet.png)

## 규격·제작

- 2172×724px(3:1), 불투명 정적 WebP 10장. 전체 626,608 bytes(약 612KiB)이며 개별 용량은 제작 목록에 기록한다.
- 가로 전체에 반복 패턴을 배치해 현재 보유 목록의 4:1 중앙 자르기에도 무늬가 유지된다.
- 흰 클랜 이름·메타데이터를 얹도록 어두운 바탕을 사용한다. 이름·등급 표시는 이미지에 굽지 않는다.
- built-in `image_gen`으로 각 이미지별 생성 후 Sharp로 WebP 변환했다. 공통·개별 프롬프트는 제작 목록에 보관한다.
- 검증 완료: 10개 이미지의 디코딩·비율·불투명·정적 여부와 4:1 중앙 자르기. WebP 전체 픽셀을 대상으로 계산한 흰 글자 대비는 최저 4.93:1이다. 비교표의 한글·무늬를 육안 확인했다. 앱 소스·DB 동작 변경이 없어 빌드·E2E는 실행하지 않았다.
