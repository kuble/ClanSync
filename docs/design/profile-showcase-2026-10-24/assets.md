# 취향 진열장 상품 이미지

- 방식: 내장 imagegen으로 생성한 정적 투명 PNG. 기존 시안과 별도의 실제 UI용 에셋이다.
- 파일: [collectibles-v1.png](../../../public/images/showcase/collectibles-v1.png), 1254×1254, 약 1.5MB.
- 구성: 균등한 3×3 스프라이트. 위에서 아래, 왼쪽에서 오른쪽 순서로 액자·여우·키보드·화분·책·머그·이파리·조명·명패. CSS가 원본 파일의 해당 칸만 표시하며 원본 알파를 유지한다.
- 카탈로그의 `sprite`는 0~8, `width`는 전시 영역 대비 너비다. 신규 상품은 `public/images/showcase/`에 독립 PNG/WebP를 추가하고 `showcase_catalog.image_path`를 지정하면 기존 스프라이트를 수정하지 않아도 된다. 투명 정사각형, 동일한 밑면 기준(칸 높이 약 90%)으로 제작한다.
- `kind`는 `goods`(선반 위), `edge`(가장자리), `light`(상단), `label`(앞면)이다. `available=false`는 신규 수령만 중단하며 보유 상품의 렌더링을 없애지 않는다. 시작 상품의 `starter`는 현재 계정 기본 수량이므로 기존 ID에서 제거하지 않는다.
- 현재 상점은 QA 무료 체험용이다. 유료 판매 전에는 무료 수령 권한을 교체하고 서버 가격·결제·재시도 중복 방지·원장 검증을 별도 구현해야 한다.

## 생성 프롬프트

```text
Use case: stylized-concept. Create one production sprite atlas for a cozy collectible showcase web app. Transparent background, square canvas, exact uniform 3 by 3 grid of nine separate objects, no drawn grid. Every object fits fully inside its own cell with 12% margin, centered horizontally, grounded at 88% of its cell height. Absolutely no overlap between cells. Straight front view with very subtle depth, warm tactile hand-painted 3D illustration, soft baked shadows, walnut and sage palette, refined miniature collectible merchandise, clean edges. Row 1 left: walnut framed small landscape painting of green mountains at sunset. Row 1 middle: cute sitting orange fox vinyl figurine. Row 1 right: cream and sage mechanical keyboard angled slightly to show keys, front view. Row 2 left: small terracotta pot with lush green houseplant. Row 2 middle: short stack of three pastel books. Row 2 right: cream ceramic mug with a tiny star. Row 3 left: single trailing green ivy strand with leaves hanging downward from a small attachment, no pot. Row 3 middle: small brass downward shelf spotlight with subtle warm glow close to fixture only. Row 3 right: blank horizontal walnut nameplate with two small brass screws. No text, no letters, no logos, no shelf, no scene background. Each of the nine cells is the same square size; respect exact 3x3 positioning for CSS sprite use.
```
