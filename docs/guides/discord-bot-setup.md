# ClanSync 공용 Discord 봇 연결

## 현재 상태

QA에 서버 초대 OAuth, 채널 선택, 일정별 등록·변경/사전 알림과 투표 발송 경로를 구현했다. 실제 Discord 앱 등록·비밀값 설정·서버 초대 및 실제 메시지 발송은 아직 완료하지 않았다. 운영 DB 적용·배포는 보류한다.

클랜별 웹훅 주소 대신 공용 봇 하나를 사용한다. 알림만 발송하므로 Gateway 접속이나 Message Content Intent 없이 Discord REST API로 보낸다. 클랜별로 저장하는 값은 서버·채널 ID/이름뿐이다. 봇 토큰과 Client Secret은 서버 환경변수로만 보관한다.

## 공용 앱 최초 등록

1. [Discord Developer Portal](https://discord.com/developers/applications)에서 `ClanSync` 앱을 생성하고 Bot을 준비한다. 다른 클랜도 초대할 수 있도록 Public Bot을 켜고, OAuth2 Code Grant를 요구하도록 설정한다. Privileged Gateway Intents는 켜지 않는다.
2. OAuth2 Redirects에 실제 사용하는 `{사이트 주소}/api/discord/callback`을 등록한다. QA 리더는 `http://localhost:3011/api/discord/callback`이다. 초대를 시작하는 사이트와 콜백 사이트의 호스트가 같아야 로그인·state 쿠키가 유지된다.
3. 서버 환경에 `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_REDIRECT_URI`를 설정하고 서버를 재시작한다. 비밀값은 채팅·문서·커밋·NEXT_PUBLIC 변수에 넣지 않는다.
4. Premium 클랜장이 이벤트 → 일정 등록 옆 **알림 설정** → **Discord 알림 추가**에서 서버를 선택한다. 초대에는 `bot guilds` 범위와 View Channel + Send Messages(3072)를 요청한다. 클랜장 자격과 해당 Discord 서버의 소유/관리 권한을 콜백에서 다시 확인한다.
5. 연결 후 설정창에서 채널을 선택하고 Discord 알림 사용을 켜서 저장한다. 봇이 읽고 메시지를 보낼 수 있는 텍스트/공지 채널만 표시한다. 연결 실패·삭제된 봇·채널 권한 변경 시 다시 연결하거나 권한을 복구한다. 발송을 끄는 것은 채널 조회 실패 중에도 가능하다.

## 일정·투표

- 일정 등록·편집창에서 Discord 알림을 켜고 등록·변경 시, 하루 전, 1시간 전, 10분 전, 시작 시를 선택한다. 기본 선택은 등록·변경 및 1시간 전이며, Discord 사용 자체는 일정마다 선택한다. 이미 지난 사전 시점은 예약하지 않는다.
- 일정과 in-app/Discord 예약은 같은 DB 트랜잭션으로 저장한다. 취소·시간 변경·알림 해제는 기존 예약도 갱신한다. 이미 발송한 동일 회차·시점은 제목 수정이나 재저장으로 다시 보내지 않는다.
- 채널 변경은 대기 중인 알림을 새 채널로 전달한다. 전역 알림 해제는 예약을 취소하고, 다시 켜면 아직 미래인 선택 슬롯을 복구한다. 연결이 끊긴 동안의 등록·변경 메시지는 나중에 일괄 재생하지 않는다.
- 반복 일정은 기존 규칙대로 최대 6개월/14회 예약한다. 장기 반복의 예약 기간 연장은 후속 작업이다. 스크림 자동 일정은 기존 in-app 알림을 유지하며 이번 Discord 일정 옵션은 수동 등록·편집에 적용한다.
- 투표는 기존 투표 알림 옵션과 예약 정책을 유지하고 공용 봇 채널로 발송한다. 카카오는 수신 의사만 저장한다.

## 예약 발송 실행

`GET /api/cron/dispatch-notifications`를 `Authorization: Bearer <CRON_SECRET>`로 호출한다. 등록·변경 알림은 저장 응답 후 같은 outbox를 즉시 처리하고, 실패한 메시지와 사전 알림은 이 엔드포인트가 처리한다. 봇 토큰이 없으면 Discord 예약을 claim하지 않는다.

**현재 `vercel.json`은 매일 02:00 UTC 호출이다. 1시간 전·10분 전 알림의 정시 발송에는 1분 단위 외부 스케줄러 또는 이를 지원하는 배포 플랜/워커가 필요하다.** 이번 QA 작업에서 운영 스케줄이나 배포를 바꾸지 않았다. 실제 발송 활성화 전에 호출 주기를 구성하고 실제 서버 초대·등록·수정·취소를 확인한다.

claim은 SKIP LOCKED와 5분 lease를 사용한다. 실패는 60/120/240/480초 후 재시도하며 5회 실패하면 DLQ로 보낸다. 마지막 시도 중 워커가 중단되면 lease 만료 후 DLQ 처리한다. 같은 예약 ID에서 파생한 nonce로 Discord의 단기 중복 방지를 사용한다. Discord가 제공하는 nonce 보존 기간 밖의 네트워크 실패에 대해 정확히 한 번 전달을 보장하지 않는다. 사용자 제목의 `@everyone` 등은 allowed_mentions 비활성화로 멘션하지 않는다.

## 검증 범위

`e2e/event-discord-bot.spec.ts`: 임시 QA 클랜에서 클랜장/멤버/anon 권한, 봇 서버 관리자 검증, 채널 권한 덮어쓰기, 예약 원자성, 병렬 claim, sent 보존, 실패 재시도·DLQ, 채널 변경·취소, UTC/KST 메시지 시각, OAuth state 거부, 등록창 UI를 검증한다. HTTP는 모의 Discord API로 발송하며 실제 외부 메시지는 보내지 않는다. 기존 일정/스크림 DB 회귀도 실행한다. 5분 lease 만료는 구현 검토 대상이며 실제 시간 경과 테스트는 수행하지 않는다.

공식 근거: [OAuth2](https://docs.discord.com/developers/topics/oauth2), [권한 계산](https://docs.discord.com/developers/topics/permissions), [메시지 생성](https://docs.discord.com/developers/resources/message#create-message).
