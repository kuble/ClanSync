# 보관함 드로워·선반 상품 — 2026-10-25

## 결정과 동작

- 편집 중 화면 하단에 비모달 보관함을 연다. 카드에서 선반으로 끌면 가까운 선반의 해당 위치에 놓이고, 진열된 물건을 드로워로 끌면 보관한다. 끄는 동안 드로워는 얇은 회수 영역으로 접혀 아래 선반을 가리지 않는다.
- 마우스·터치를 지원한다. 보관함 접기/열기, 좌우 탐색 버튼, 클릭으로 꺼내기와 기존 위치·겹침 조절을 함께 제공한다. 영역 밖 놓기·Esc·포인터 취소는 배치를 바꾸지 않는다.
- 이름 입력과 사용자 지정 이름 표시는 없애고 구성 순서에 따라 ‘진열장 1, 2…’로 구분한다. 이전 저장 데이터의 name 필드는 호환을 위해 보존하지만 화면에서 사용하지 않는다.
- 기본 3단형·중앙 강조형은 무료 기본 제공이다. 엇갈림형·계단형을 선반 모양 상품으로 추가한다. 한 번 보유하면 여러 구성에서 같은 모양을 사용할 수 있다. 선반은 모양 해금이며 굿즈 복제권이 아니다.
- 굿즈·이파리·조명·명패는 **보유 1개당 전체 진열장에서 한 곳**에만 배치한다. 기존 구매품·코인·진열장 배치와 QA 명단은 초기화하지 않는다.
- 중앙 강조형 뒤판의 고정 이파리를 제거했다. 기존 ‘늘어진 이파리’ 상품만 배치한 위치에 표시하며 보관하면 사라진다. 조명 역시 보유·배치한 것만 빛난다.
- 상점은 기존 정책대로 **QA 무료 체험 수령**이다. 정식 코인 가격과 결제는 미정이며 유료 구매가 완료된 것으로 표시하지 않는다. 선반 상품의 중복 수령은 보유 1개를 유지한다.
- DB 저장 트리거가 미보유 선반과 선반 상품의 굿즈 배치를 거절한다. 원래 수량·계정·revision 검증도 유지한다.

## 에셋과 실제 화면

- 내장 imagegen 편집으로 고정 이파리만 제거했다. 원본은 보존했고 생성 결과를 1200px WebP로 인코딩했다.
- 파일: [cabinet-focus-bare-v4.webp](../../../public/images/showcase/cabinet-focus-bare-v4.webp), 93,862 bytes. 신규 선반 두 종류는 기존 선반 이미지를 재사용하며 상품 썸네일도 실제 선반 위치 정보로 그린다. 실시간 3D·추가 렌더링 라이브러리는 없다.
- 실제 QA 캡처: [하단 보관함](verification/showcase-drawer.png) · [모바일 터치 편집](verification/showcase-drawer-mobile.png) · [엇갈림형](verification/showcase-offset.png) · [계단형](verification/showcase-steps.png).

## 검증

- QA 마이그레이션 적용 후 타입 생성 확인. 테이블 열/함수 인자 타입은 기존 그대로이며 kind 허용 값과 저장 검증을 확장했다.
- 임시 계정으로 DB 회귀 통과: 미보유 선반·직접 수정 우회·선반의 굿즈 배치 거절, 중복 수령, 여러 구성에서 선반 사용, 전체 굿즈 수량, 공개 조회/타인 수정 거절, 저장 충돌, 기존 하우징·잔액 보존. 진열장 관련 보안 advisor 경고 없음.
- 집중 UI 회귀 통과: 보관함 양방향 드래그, 잘못 놓기·Esc 취소, 접힌 보관함 회수, 모바일 실제 터치 입력, 선반 상점 수령·교체, 조명·겹침·명패·이파리, 저장 실패/재시도·충돌·계정 변경, 방문 화면·320/390/802px 넘침 검사. 계정 네임카드 관련 편집 보존 회귀도 통과.
- 변경 소스 ESLint·타입 검사·QA 환경 빌드 통과. 운영 DB·배포는 변경하지 않았다.

## 최종 편집 프롬프트

내장 imagegen에 기존 중앙 강조형 뒤판을 편집 대상으로 전달했다.

> Edit this game UI cabinet background asset. Remove ALL ivy, all leaves, vines, plant stems from both top right and bottom left. Reconstruct the dark green textured backboard and warm walnut frame exactly underneath. Preserve the exact image framing, full wooden perimeter, graceful rounded wooden inner arch, perspective, material, neutral ambient shading, original aspect ratio. No foliage whatsoever, no objects, no shelves, no lights or spotlight glows, no text. This is a bare cabinet used underneath separately movable plants and lights. Minimal surgical removal only; preserve original high quality texture and composition.
