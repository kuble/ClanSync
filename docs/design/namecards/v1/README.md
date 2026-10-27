# 네임카드 그림 테마 v1

2026-10-27 사용자 선택 시안을 실제 계정 공통 네임카드에 적용했다. 정지 이미지 3종과 투명 초상 프레임 아틀라스이며 애니메이션은 후속이다. 기존 게임 캐릭터/로고를 사용하지 않은 원본 제작물이다.

## 파일·구성

| 파일 | 내용 |
|---|---|
| [arcade.webp](../../../../public/namecards/v1/arcade.webp) | 심야 아케이드: 픽셀 도시·고양이·게임기 |
| [tactical.webp](../../../../public/namecards/v1/tactical.webp) | 전술 기록: 지형도·지도·나침반·야외 측량 장비 |
| [nebula.webp](../../../../public/namecards/v1/nebula.webp) | 성운 항해: 성운·행성·탐사선 |
| [portraits.webp](../../../../public/namecards/v1/portraits.webp) | 왼쪽부터 아케이드 사각형·전술 사각형·성운 원형. SVG viewBox로 실제 장식의 중심과 크기를 정규화하며 중앙과 바깥은 투명 |
| [shield.webp](../../../../public/namecards/v1/shield.webp) | 시안의 은빛 나침반 방패. 기존 기본 엠블럼에 연결하며 초상 프레임과 별도 합성 |

- 배경·프레임 네 파일은 각각 2172×724px, 방패는 1254×1254px이며 전체 약 1.25MB다. 내장 image_gen 도구로 제작하고 그림 변경 없이 WebP로 압축했다. 원본 PNG는 Codex 생성 이미지 저장소에 보존한다.
- 배경에 ID/칭호/심벌을 굽지 않는다. 공통 렌더러에서 실제 게임 ID·칭호·심벌·초상 프레임·외곽 프레임을 별도로 합성한다. 배경은 비율을 유지해 중앙보다 약간 위를 기준으로 잘라 표시한다.
- 초상 프레임은 실제 장식 영역의 중심을 동일 슬롯에 맞추고 원형 여부는 그 안의 그림 형태다. 카드 외곽은 모든 디자인에서 2px 테두리·12px 곡률(소형 7px)을 사용하며 심벌 슬롯·이름 시작점을 공유한다. 배경/카드 프레임과 독립적으로 선택한다. 수상 엠블럼 케이스는 기존 소개 아래 위치를 유지한다.
- 세트 적용은 `frame/namebar/portrait` 3행의 단일 upsert다. 기존 소유권 트리거와 본인 RLS를 사용하며 심벌·칭호·잔액은 바꾸지 않는다. 기존 장착은 마이그레이션에서 변경하지 않는다.

## 제작 프롬프트 세트

방식: 기본 내장 image_gen. 아래는 최종 생성 지시의 제작 요건이다. 참조는 대화에서 확정한 세 테마 비교 시안이다.

1. **아케이드 배경:** single wide 3:1 production game namecard background; premium pixel-art navy/plum night city, mint/coral neon, original black-and-white cat on arcade cabinet at right. Left 55% dark low-contrast space. Focal objects within central 45% vertical band for 6:1 cropping. No text, numbers, logos, emblem, portrait container or outer border.
2. **전술 배경:** single wide 3:1 charcoal/forest-green topographic survey map; folded maps, brass compass, rugged graphite surveying instrument, blank metal tag and amber indicators on right. Realistic painted material detail. Dark calm left 55%, central vertical focal band. No text, numbers, logos, shield, portrait container or outer frame.
3. **성운 배경:** single wide 3:1 premium painterly sci-fi background; indigo/violet nebulae, pale gold constellations, luminous ringed planet and original exploration ship at right, tasteful blue engine light. Dark left 55%, central vertical focal band. No text, numbers, logos, shield, portrait circle or outer frame.
4. **초상 프레임 아틀라스:** true transparent 3:1 sprite atlas, three equally sized square cells; frame centers at 1/6, 1/2, 5/6 of width and 1/2 of height. Frame fills 92% of cell, empty transparent center. Left square graphite pixel frame with cyan/pink LEDs; middle square brushed metal frame with brass fasteners and amber details; right circular blue-enamel/gold celestial frame with stars. No text, icons, shield or center artwork. Practical at 64px.
5. **기본 방패 심벌:** faithfully recreate only the reference's navy enamel shield with thick faceted silver rim and silver four-point compass star, straight front view, symmetrical and centered on transparent square canvas. No portrait surround, outer frame, scene, text or external shadow. Actual detailed designed symbol, readable at 48px, not a thin outline icon.
