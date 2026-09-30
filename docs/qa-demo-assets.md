# 영상 촬영용 QA 꾸미기

- 적용 대상: QA DB의 `QA_01_Clan`, 기존 활성 멤버 12명. 운영 DB는 변경하지 않는다.
- 배너: [qa-clan-banner.webp](../public/images/demo/qa-clan-banner.webp), 1800×600 WebP. 기본 내장 imagegen 도구로 새로 생성한 원본을 웹용으로 압축했다. 기존 게임 로고·공식 아트는 사용하지 않았다.
- 적용 도구: `node scripts/style-qa-demo.mjs --apply`. 미리보기는 `--apply` 생략. 사용자 ID·로그인 이메일·코인·기존 전적은 유지하며 별도로 편집된 이름과 외부 계정의 닉네임 충돌은 차단한다.

| 기존 표시 이름 | 영상용 표시 이름 |
| --- | --- |
| QA_Leader_01 | 새벽별 |
| QA_Member_02 | 달빛고양이 |
| QA_Member_03 | AimZero |
| QA_Member_04 | 구름여우 |
| QA_Member_05 | NeonPulse |
| QA_Member_06 | 힐링모찌 |
| QA_Member_07 | 한판더 |
| QA_Member_08 | 감자에임 |
| QA_Member_09 | Luna |
| QA_Member_10 | BlueFox |
| QA_Member_11 | 바람결 |
| QA_Member_12 | Ctrl힐 |

## 생성 프롬프트

Create a polished panoramic esports gaming clan banner artwork for a Korean Overwatch community demo website. Ultra wide 3:1 landscape composition, cinematic stylized 3D concept art of a futuristic coastal city arena at blue hour, subtle emerald teal lights and warm sunset amber highlights, clean architectural silhouettes, a few small futuristic armored teammates walking toward an arena on the far right as anonymous silhouettes, quiet dark teal negative space across the left 55% for existing UI text overlay. Premium restrained look, attractive readable at a shallow website banner crop. Important objects within middle horizontal band. Original artwork only: no game logos, no lettering, no typography, no watermark, no interface, no collage. Save the output as a project banner image.
