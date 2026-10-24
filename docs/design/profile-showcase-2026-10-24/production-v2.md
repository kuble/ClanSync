# 취향 진열장 v2 이미지 제작

- 도구: 내장 imagegen. 기준: `layout-comparison.png`의 목재·조명·낮은 정면 시점.
- 생성 원본의 알파를 유지하며 WebP 인코딩/해상도 최적화만 수행했다. 물체 모양·시점은 생성 단계에서 수정했다.
- 배경 2종, 선반 1종, 키보드·여우 각 1종: `public/images/showcase/*-v2.webp`. 합계 약 372 KiB, 한 번에 선택된 배경만 사용한다.
- 나머지 굿즈는 기존 atlas를 유지하며 `src/lib/showcase/art.ts`에 실제 보이는 영역을 기록했다. SVG viewBox로 표시 영역을 정규화한다. 원본 atlas의 이파리가 화분 칸을 침범하던 부분도 분리했다.
- 기존 atlas는 알파를 보존한 `collectibles-v1.webp`(329,140 bytes)로 제공한다. 선택된 중앙 강조형의 전체 이미지 파일 합계는 615,046 bytes(약 601 KiB)다. 기존 PNG 한 장은 1,513,163 bytes였으며, 전송량 비교는 파일 합계 기준이다.
- 선반·굿즈는 정적 이미지 합성이다. 실시간 3D·광원·반복 애니메이션은 없다.
- 아래 배경의 기본 조명/가장자리 식물은 기본 외형이며, 움직이는 보유 장식과 구분한다.

## 실제 화면 검수

- [중앙 강조형·3개](verification-v2/showcase-focus.png) · [3단형·겹침과 장식](verification-v2/showcase-desktop.png) · [320px 모바일](verification-v2/showcase-mobile.png). 콘셉트 이미지가 아닌 앱의 임시 QA 계정 화면이다.
- 실제 사용자 3011 프로필에서도 목재·조명·밑면·선택 테두리를 확인했다. 사용자의 저장 전 편집 내용은 보존했다.
- `E2E_SKIP_SEED=1 npm run test:e2e -- e2e/profile-showcase.spec.ts`: 임시 사용자 2명의 기본형 전환·9종 표시·겹침·저장 실패/재시도·공개 방문·보유 수량·저장 충돌·802/390/320px 검증 통과. 테스트 종료 후 자체 픽스처만 정리했다.
- 소스/테스트 ESLint·타입 검사 통과. 기존 네임카드 테스트의 폐기된 `housing` 참조 1줄을 제거했다(상점 코인 검증은 유지).
- 스크린샷 검수에서 발견한 첫 로딩 전 배경 미표시 캡처는 이미지 decode 대기로, 보관함 썸네일에서 옆 상품이 보이던 문제는 SVG clipPath로 수정했다.

## keyboard

```text
Use case: stylized-concept. Production transparent cutout asset for a cozy collectible shelf web UI. Reference image is style and camera reference only: match the cream and forest-green keyboard on green leather mat visible along the bottom of the left showcase. Render ONE cream mechanical keyboard with forest green modifier keycaps, resting on its own thin dark green leather desk mat with fine brass piping. Frontal, symmetric, level horizontal front edge, low viewing angle (about 15 degrees above surface), no sideways rotation, no diagonal tilt, foreshortened keys. Wide low silhouette roughly 3.3:1 including mat. Fine hand-painted realistic miniature texture, warm amber light from upper left, dark warm contact shadow on the mat. The mat and keyboard are one movable collectible. Fully isolated on real transparent background. No shelf, no wall, no text, no UI, no extra objects. Fill width of landscape canvas, minimal transparent padding, complete silhouette.
```

## backdrop

```text
Use case: stylized-concept. Production EMPTY cabinet background for modular 2D collectible shelf UI. Match the reference's beautiful dark forest green textured wall and richly grained walnut wood enclosure, warm amber lighting, tactile illustrated realism. Front-facing symmetric rectangular cabinet, near orthographic low viewing angle. Landscape canvas ratio 1.3:1. Outer dark walnut timber frame at left and right (each 4 percent width), top and bottom (each 4 percent height), straight level lines. Empty recessed forest-green fabric/plaster backboard. Two tiny recessed brass puck lights under top beam at 22 and 78 percent width cast soft warm pools onto empty backboard, soft vignette and frame contact shadows. NO interior shelves, NO arch, NO collectibles, NO plants, NO labels, NO writing, NO UI. All middle 90 percent of image must be completely empty wall so movable shelves can be layered in code. Preserve subtle natural texture and richness, not flat vector art.
```

## shelf

```text
Use case: stylized-concept. A single isolated long horizontal dark walnut display shelf plank, matching the warm rich wood grain of the reference's shelves. Production reusable transparent 2D UI asset. Straight-on frontal symmetric view, no horizontal rotation, low camera looking down 15 degrees. Wide trapezoid top surface (back corners slightly inset), clearly defined horizontal front lip, fine natural lengthwise walnut grain, golden amber light across polished upper surface, deep brown front face, bevelled corners. Plank is about 10 times wider than overall height. No legs, brackets, wall, plants, goods, writing or other objects. Real transparent background. Tight landscape canvas around entire plank, tiny margin. High quality painterly realistic miniature matching reference, no cartoon flat gradient.
```

## fox

```text
Use case: stylized-concept. Production isolated collectible asset for the illustrated wooden cabinet in reference. ONE small sitting orange fox figurine with closed happy eyes, cream chest, rich russet fur accents and bushy white-tipped tail curled to its right. Resting on a thin circular dark walnut display pedestal, whole figure and base ONE object. Match reference's fox: elegant natural fox proportions, sculpted collectible, not oversized chibi head. Near frontal view with subtle depth, low viewing angle 15 degrees above surface, pedestal bottom horizontal. Warm amber light from top left, soft shadows on pedestal, detailed hand-painted miniature illustration matching forest green cabinet and walnut shelves. True transparent background, full object centered, no wall, shelf, text, brand or scene. Tight square framing.
```

## focus

```text
Use case: stylized-concept. Production EMPTY cabinet background for a modular collectible shelf UI. Use the RIGHT cabinet in reference: rich walnut arch INSIDE rectangular walnut surround, dark forest-green textured plaster/fabric backboard, warm amber light. Output a single landscape 1.3:1 cabinet image with no UI or comparison labels. The wooden arch rises from side columns at x=8% and92%, centered curved apex at y=8%, warmly lit carved grain. Rectangular outside frame at canvas edge. One tiny recessed warm brass puck light at arch apex casts a soft golden pool, subtle additional soft light from upper sides. Small tasteful ivy grows only along bottom left corner and upper right outer frame, mostly at outermost 10% so it does not obscure the empty middle. Fine detailed painterly realism exactly like reference. IMPORTANT: NO SHELVES anywhere inside, NO PLATFORMS, NO DRAWERS, NO FURNITURE inside, NO goods or fox or keyboard, NO poster or labels, NO text. Completely empty backboard inside arch for movable shelves to be overlaid later. Full bleed frame to image edges.
```

