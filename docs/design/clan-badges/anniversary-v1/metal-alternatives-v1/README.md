# 10주년 테두리 금속 마감 후보

제작일: 2026-10-14 · 상태: **3번 블랙 루테늄 선택·적용**

[자라는 역사](../README.md)의 10주년 플래티넘을 대체할 마감 후보 3종을 비교했다. 승인된 동 배지 원본의 바깥 테두리만 편집하고 방패 형태·다섯 잎·금빛 나무와 뿌리·별·에나멜 팔레트는 유지했다. 사용자는 3번 블랙 루테늄을 선택했다.

| 번호 | 후보 원본 |
|---|---|
| 1 | [블루 티타늄](01-blue-titanium.png) |
| 2 | [바이올렛 티타늄](02-violet-titanium.png) |
| 3 | [블랙 루테늄](../../../../../public/clan-badges/anniversary-growing-history-black-ruthenium.png) |

- 블루 티타늄: 진한 코발트블루 금속에 청록/밝은 파랑 반사. 기존 동·은·금과 구분이 뚜렷한 추천안.
- 바이올렛 티타늄: 보라 금속에 푸른 반사와 밝은 라벤더 하이라이트. 수집 배지의 특별함을 강조한 안.
- 블랙 루테늄: 짙은 건메탈에 밝은 은백색 모서리 반사. 차분하고 묵직한 안.

## 제작과 검증

내장 `image_gen.imagegen`으로 후보별 1회씩 총 3회를 편집했다. 입력 원본은 [bronze PNG](../../../../../public/clan-badges/anniversary-growing-history-bronze.png)이며 재생성용 요청은 [prompts.json](prompts.json)에 보관했다.

각 원본은 1254 × 1254px RGBA다. 생성 원본을 수정 없이 복사하고 해시·크기·투명 모서리 알파를 확인했다. 문양·배치·테두리 차이는 육안으로 비교했다. 선택한 [당시 적용 PNG](../../../../../public/clan-badges/anniversary-growing-history-black-ruthenium.png)를 10주년에 연결했다. 후속 [성장형 V2](../../anniversary-growth-v2/README.md)에서는 금빛 테두리로 통일하며 이 마감 선택 이력은 보존한다.
