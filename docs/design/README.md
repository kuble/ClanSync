# 디자인 자료의 적용 상태와 정리 결과

2026-11-06 저장소 코드·카탈로그·로컬 파일을 대조했다. 이 문서는 현재 적용 경로와 과거 시안을 구분하는 색인이다. 초기 점검 뒤 사용자 요청으로 비교 시안 이미지 46장을 제거했다. 현재 적용 원본·검증 자료와 QA·운영 DB는 유지했다. 운영 DB 적용과 배포 보류도 유지한다.

## 현재 사용하는 디자인

| 자료 | 코드 연결·확인 범위 | 유지할 제작 근거 |
|---|---|---|
| 클랜 배지 30종 | [카탈로그·이미지 매핑](../../src/lib/clan/badges.ts)의 모든 배지 키에 이미지가 있고 실제 파일 30개가 존재한다. 창단은 첫 깃발, 멤버는 성채, 주년은 금빛 V3를 사용한다. | [창단](clan-badges/founding-v1/README.md), [멤버](clan-badges/members-v1/README.md), [주년 V3](clan-badges/anniversary-growth-v3/README.md), [확장 21종](clan-badges/expansion-v1/production-v1/README.md) |
| 개인 엠블럼 50장 | [앱 카탈로그](../../src/lib/personal-emblems/catalog.ts)에서 월·연 5부문×금은동 30장과 달성 5계열×4단계 20장을 생성해 실제 파일을 확인했다. [화면 렌더러](../../src/components/personal-emblems/emblem-artwork.tsx)에 날짜 색상이 연결되어 있다. | [제작·QA 적용·공통 케이스·영구 기록](personal-emblems/production-v1/README.md) |
| 기본 심벌 5종 | [카탈로그](../../src/lib/profile/symbols.ts)와 실제 WebP 5개가 연결되어 있다. 오비트가 기본값이다. | [제작 목록·색상·원본](symbols/normal-v1/README.md), `manifest.json` |
| 네임카드 배경 5종 | [카탈로그](../../src/lib/profile/backgrounds.ts)에 대응하는 패턴 마스크 5개가 존재한다. | [제작 목록·대비·색상](namecard-backgrounds/normal-v1/README.md), `manifest.json` |
| 초상·카드 프레임 각 5종 | [카탈로그](../../src/lib/profile/frames.ts)와 [SVG 렌더러](../../src/components/profile/namecard-frame-artwork.tsx)가 연결되어 있다. 별도 시안 PNG를 제품 화면에서 불러오지 않는다. | [프레임 규격](namecard-frames/normal-v1/README.md) |
| 클랜 배너 10종 | [카탈로그](../../src/lib/clan/banner-catalog.ts)의 실제 마스크 10개가 존재한다. | [제작·구매·색상 기준](clan-banners/normal-v1/README.md), `manifest.json` |
| 브랜드 로고 | [공통 로고](../../src/components/ui/brand-logo.tsx)에서 라이트·다크 심볼/워드마크를 사용한다. 이벤트 배색은 개발 미리보기 자료다. | [로고 기준](brand-identity.md) |

위 이미지 경로 100개에는 누락이 없었다. `docs/design` 이미지와 `public` 이미지의 SHA-256 완전 중복도 발견되지 않았다. 시안 이미지는 제품용 개별 핀과 형태·해상도·배치가 달라, 같은 디자인이라는 이유만으로 중복 사본으로 취급하지 않는다.

## 정리 결과 — 비교 이미지 46장 제거

| 제거 범위 | 이미지 수·용량 | 보존한 자료 |
|---|---|---|
| `clan-badges/expansion-v1/01-regular` ~ `06-posts`의 비교 PNG | 29장·60.28MiB | 확정 개별 핀 21장과 `production-v1` 제작 기록·검증 캡처를 유지했다. 계열별 README·제작 요청의 이미지 경로를 제거하고 `assets.json`은 보관 이력과 현재 제작 목록을 구분했다. |
| `clan-badges/founding-v1`의 `01-first-light.png`, `03-one-name.png`, `04-first-chapter.png`, `05-putting-down-roots.png` | 4장·6.36MiB | 확정 첫 깃발과 선택·제작 기록을 유지했다. HTML은 확정 원본을 보여주도록 정리하고 미선택 링크를 제거했다. |
| `clan-badges/members-v1`의 비교 PNG | 5장·9.88MiB | 확정 성채의 개별 단계 4장과 제작 요청·발급 규칙을 유지했다. 비교 이미지 링크만 제거했다. |
| `clan-badges/anniversary-v1`과 `metal-alternatives-v1`의 비교 PNG | 7장·13.36MiB | V3 원본·V2 재사용 근거·초기 제작 요청을 유지하고 삭제한 비교 이미지 경로는 현재 파일 목록에서 분리했다. |
| `personal-emblems/proposal-v1/concept-sheet-v1.png` | 1장·2.29MiB | 실제 엠블럼 50장과 `production-v1`의 제작·검증 기록을 유지했다. 제안서·제작 JSON에서 삭제한 비교표 경로를 제거했다. |

제거한 비교 이미지는 46장·약 92.17MiB다. 비교 이미지 원본과 과거 제작 목록은 Git 이력에서 확인한다. `anniversary-growth-v2`는 작은 제작 이력이고 일부 V3 원본의 재사용 근거이므로 이번 정리에서도 유지했다.

삭제 전후 공개 파일·나머지 디자인 이미지 266개의 SHA-256이 동일함을 확인했다. 제작 JSON 25개 파싱과 문서·HTML 링크 197개 확인을 통과했으며 삭제 이미지로 향하는 활성 링크·제작 경로는 남지 않았다.

## 완료된 구현과 남은 작업의 구분

- 개인 엠블럼 제안서의 ‘앱·DB 미적용’은 오래된 설명이었다. 앱 카탈로그·화면·관련 마이그레이션과 후속 적용 기록이 있어 제안서 상태를 정정했다. 기존 달성 수치나 지급 정책을 새로 적용하지 않았다.
- 구형 주년 금속 마감의 ‘현재 적용’ 표기와 V1 문서의 V2 안내는 실제 V3 연결에 맞춰 정정했다.
- 심벌의 `plannedTotal=10`, `completed=5`는 제작하지 않은 나머지 5종의 계획이다. 현재 구현된 무료 5종의 연결 누락으로 분류하지 않는다. 레어·유니크·레전드 배너도 등급 기준만 있고 실제 제작된 상품이라는 뜻은 아니다.
- `case-ui-v2`, `production-v1`, `profile-public`, `clan-management` 등의 검증 캡처는 현재·과거 검증 근거다. 오래된 화면이라는 이유만으로 자동 삭제하지 않는다.
- 이번 점검은 코드·파일·문서 대조다. 실시간 DB 상태·상품 등록 상태·운영 배포 여부를 새로 확인한 것은 아니며, 화면 전체 회귀와 DB 검사는 재실행하지 않았다.
- 주년 기준일·윤년 계산의 기존 단위 검사 2개는 통과했다.

## 자동 도구에서 사용하는 자료

- [심벌 제작 도구](../../scripts/build-normal-symbol-assets.mjs)는 심벌 `manifest.json`을 사용한다.
- [배경 제작 도구](../../scripts/build-normal-namecard-backgrounds.mjs)는 배경 제작 자료를 사용한다.
- [개인 엠블럼 검증 도구](../../scripts/verify-personal-emblems.mjs)는 `production-v1`의 요청·원본 기록을 읽는다. 기록의 로컬 생성 원본이 없는 다른 PC에서는 전체 복사본 일치 검증을 그대로 재현할 수 없으므로 JSON을 임의로 삭제하지 않는다.
