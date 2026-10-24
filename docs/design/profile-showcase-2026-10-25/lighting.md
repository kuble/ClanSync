# 진열장 배치 조명 — 2026-10-25

## 결정과 동작

- 조명 기구와 빛은 기본 배경에서 제거한다. 현재 두 기본형은 조명이 없는 목재·숲빛 배경과 부드러운 기본 밝기만 갖는다.
- 기존 상점 상품 `황동 조명`을 보유한 수량만큼 꺼내고, 상단 프레임/1단 아래/2단 아래 중 설치 위치와 좌우 위치를 선택한다. 중앙 강조형의 상단은 아치 곡선을 따른다.
- 조명 1개는 전체 진열장에서 한 곳에만 배치한다. 보관·삭제·다른 구성 전환 때 해당 조명의 빛도 사라진다. 저장 후 재접속과 방문 화면에서도 같은 위치로 표시한다.
- 빛은 해당 상품 배치에 종속된 CSS 그라데이션이다. 실시간 3D 광원·애니메이션·물리 연산은 없다. 빛 영역은 클릭/드래그를 가로채지 않는다.
- **판매 연결:** 기존 진열장 상점의 QA 무료 체험 수령을 사용한다. 유료 가격·코인 차감은 아직 미정이며 이번 변경에서 추가하지 않는다.

## 이미지

- 내장 imagegen 편집으로 기존 v2 뒤판에서 조명 기구와 고정된 빛을 제거했다. 원래 목재·이파리·구도를 유지했다.
- `public/images/showcase/cabinet-unlit-v3.webp` (80,472 bytes), `cabinet-focus-unlit-v3.webp` (144,142 bytes). 생성 후 WebP 인코딩·1200px 최적화만 수행했다.
- 실제 앱 캡처: [조명 없음](verification/showcase-focus.png) · [조명 배치](verification/showcase-light-focus.png) · [3단형](verification/showcase-desktop.png).

## 검증

- 집중 E2E 1건 통과(전체 조명 흐름과 기존 진열장 회귀 포함), 변경 소스 ESLint·타입 검사 통과. 두 기본형의 실제 캡처를 검수했으며, 빛의 사각 경계를 마스크로 제거하고 아치 접합·액자와의 간격을 보정했다.

- 기존 `profile-showcase.spec.ts`에 상점 조명 수령, 미배치 시 빛 없음, 설치 위치·좌우 이동, 드래그, 보관 시 빛 제거, 재배치, 저장/재접속, 다른 진열장의 중복 사용 방지를 포함했다. 기존 겹침·수량·저장 실패·방문·모바일 검증도 유지한다.
- 임시 QA 사용자 2명만 사용하며 시드는 건너뛴다. 기존 사용자 진열장·편집 내용·코인·보유 수량은 변경하지 않는다.

## 최종 편집 프롬프트 (두 뒤판 각각 적용)

```text
Edit target: provided cabinet background. Remove ALL built-in lamps/light fixtures completely and remove ALL their localized golden light beams, cone glows, bright pools and hotspots on the backboard and wood. Replace fixture areas seamlessly with the correct underlying wood or wall texture. Keep exact original cabinet shape, perspective, framing, resolution/aspect ratio, wood grain, green wall texture, ivy (if present), and all architectural details. Use soft even neutral ambient room illumination, so the wood and green wall remain beautiful and clearly visible. It must NOT be pitch dark. No directional spotlights or glowing spots anywhere. No new objects, shelves, decorations, text or UI. This is an empty UNLIT modular cabinet background: purchased lamps will be added separately by code.
```

