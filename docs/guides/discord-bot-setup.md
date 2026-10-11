# ClanSync 공용 Discord 봇

## 현재 상태와 진입점

QA에 공용 봇 연결, 기본/종류별 채널, 내전·일정·공지·투표 시작/종료 알림을 구현했다. QA 환경에 앱 키가 설정되어 있다. 실제 서버 연결·외부 발송과 분 단위 워커 상시 실행은 별도 확인이 필요하다. 운영 DB 적용·배포는 보류한다.

**클랜 관리 → 운영 설정 → 알림·연동**에서 연결한다. 이벤트의 설정 아이콘은 이 화면으로 이동하며 일정 등록창에서는 해당 일정의 발송 시점만 고른다. Premium 클랜장만 연결·설정을 저장하고 운영진은 읽기만 가능하다. 일반 멤버는 관리 화면에 접근할 수 없다. 기존 Premium 제한은 유지한다.

새 클랜 생성 후 `/welcome`에서 선택형 연동 안내를 표시한다. `나중에`로 대시보드에 갈 수 있으며 연동을 가입·생성 조건으로 삼지 않는다. 아코디언에는 격리 QA에서 촬영한 실제 내전·일정·공지·투표 화면과 **발송 예시** 메시지를 표시한다. 확대 보기·모바일 아코디언을 지원하며 실제 Discord 발송 캡처로 오인하지 않도록 예시 표시를 유지한다.

## 공용 앱과 연결

1. [Discord Developer Portal](https://discord.com/developers/applications)에서 ClanSync 앱의 Bot을 준비한다. Public Bot과 OAuth2 Code Grant를 설정한다. REST 발송이므로 Gateway와 Message Content Intent는 필요하지 않다.
2. OAuth2 Redirects에 `{사이트 주소}/api/discord/callback`을 등록한다. QA 리더는 `http://localhost:3011/api/discord/callback`이다. 초대 시작·콜백 호스트가 같아야 로그인/state 쿠키가 유지된다.
3. 서버에 `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_REDIRECT_URI`를 설정한다. `NEXT_PUBLIC_SITE_URL`에는 수신자가 접속할 실제 사이트 주소를 설정한다. localhost 링크는 개발 PC에서만 열린다. 비밀값은 NEXT_PUBLIC 변수·채팅·문서·커밋에 넣지 않는다.
4. 클랜장이 `Discord 연결하기`에서 서버를 선택한다. `bot guilds` 범위와 View Channel + Send Messages(3072)를 요청하며 콜백에서 클랜장 및 Discord 서버 관리 권한을 다시 확인한다.
5. 기본 채널 하나를 선택하고 알림 사용을 켜서 저장한다. 원하는 종류만 별도 채널로 분리하거나 토글을 끈다. 발송 가능한 텍스트/공지 채널만 표시하고 저장 시 모든 채널 권한을 확인한다. 봇/채널 조회 실패 중에도 알림 끄기는 가능하다. 다른 Discord 서버로 변경하면 이전 종류별 채널 선택을 초기화한다.

## 종류별 발송

| 종류 | 동작 |
|---|---|
| 정규 내전 | 시작 10분 전 해당 방 링크. 시각 변경·취소·종료를 반영하며 방마다 시작 안내 한 번 |
| 깜짝 내전 | 시작 10분 전. 곧바로 시작하면 즉시 링크 전송 |
| 캘린더 일정 | 일정마다 등록·변경/하루 전/1시간 전/10분 전/시작 시 선택. 연결·일정 종류가 켜져 있으면 새 수동 일정은 등록·변경+1시간 전이 기본값 |
| 새 공지 | 새 게시물의 제목·본문 링크. 수정·고정은 다시 보내지 않음 |
| 투표 | 생성·종료 각각 한 번. 두 토글을 따로 조절하고 자연 마감·조기 종료 모두 결과 링크 제공 |

모든 종류는 기본 채널을 공유하거나 종류별 채널을 선택한다. 클랜 전체 설정이며 개인 수신은 Discord 채널 알림 설정에서 조절한다. 카카오는 수신 의사만 저장한다. 전체 멘션은 사용하지 않는다.

같은 제목·시각의 내전과 캘린더 내전은 10분 전 중복 안내를 생략한다. 투표의 기존 반복 알림은 in-app으로 유지한다. 발송 직전 현재 플랜·토글·채널·원본 상태를 재확인한다. 꺼 둔 동안 지난 알림은 다시 켜도 재생하지 않으며 미래 예약만 복구한다.

링크는 정확한 방·공지·투표·일정 회차를 연다. 로그인/회원가입의 `next`와 게임 인증 복귀를 보존한다. 클랜 가입이 필요하면 내부 경로를 7일간 HttpOnly 쿠키에 보관해 동일 클랜 가입 승인 후 돌아간다. 다른 클랜·권한 제한은 유지하고 가입 승인을 자동 우회하지 않는다. Next.js 16 규칙에 맞춰 `src/proxy.ts`에서 인증 리디렉션을 처리한다.

반복 수동 일정은 기존 최대 6개월/14회 예약을 유지한다. 예약 기간 연장과 스크림 자동 일정의 Discord 옵션은 후속 범위다. 이미 지난 사전 시점은 예약하지 않는다.

## 분 단위 워커

`GET /api/cron/dispatch-notifications`를 `Authorization: Bearer <CRON_SECRET>`로 호출한다. 새 공지·투표·곧 시작하는 내전·일정 변경은 응답 후 해당 클랜 outbox를 처리하며 미래 예약·재시도는 이 엔드포인트가 처리한다. 토큰이 없으면 claim하지 않는다.

**현재 Vercel Cron은 하루 한 번이다. 정시 발송에는 분 단위 외부 스케줄러 또는 상시 워커가 필요하다.** 상시 호스트에 `DISCORD_DISPATCH_URL=https://사이트/api/cron/dispatch-notifications`와 사이트와 동일한 `CRON_SECRET`을 설정하고 `node scripts/discord-notification-worker.mjs`를 실행한다. 단발 실행은 `--once`를 붙인다. 로컬 QA URL은 `http://localhost:3011/api/cron/dispatch-notifications`다. 실행 전 실제 발송 서버·채널을 확인한다. 키는 명령 인자·로그에 출력하지 않는다. 워커는 리디렉션을 따르지 않고 실행을 겹치지 않는다. 이번 작업에서는 외부 스케줄러 등록·상시 실행·운영 배포를 수행하지 않았다.

SKIP LOCKED와 5분 lease로 중복 claim을 막는다. 실패는 60/120/240/480초 후 재시도하고 5회 실패 시 DLQ로 보낸다. 같은 로그 ID의 nonce로 Discord 단기 중복을 막지만 nonce 보존 기간 밖의 네트워크 실패까지 정확히 한 번 전달을 보장하지는 않는다.

## 검증 및 촬영

`e2e/clan-discord-notifications.spec.ts`와 `e2e/event-discord-bot.spec.ts`에서 격리 QA 데이터로 권한, 종류별 라우팅, 예약 변경·취소, 공지 중복, 투표 종료, 병렬 claim, 발송 직전 토글, 채널 변경, 인증 복귀, 신규 클랜 안내, 모바일 갤러리를 검증한다. 모의 Discord API로 발송하며 E2E 서버는 실제 봇 키를 비운다.

갤러리 재촬영은 `E2E_SKIP_SEED=1`, `DISCORD_GALLERY_CAPTURE=1`을 설정하고 `npx playwright test e2e/clan-discord-notifications.spec.ts --grep "capture actual" --project=chromium`을 실행한다. 테스트가 만든 임시 클랜·계정만 삭제하며 사용자 QA 데이터는 보존한다. 이미지 원본은 `public/images/discord/`에 둔다.

공식 근거: [OAuth2](https://docs.discord.com/developers/topics/oauth2), [권한](https://docs.discord.com/developers/topics/permissions), [메시지](https://docs.discord.com/developers/resources/message#create-message).
