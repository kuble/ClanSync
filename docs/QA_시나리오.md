# QA · 시연 · 직접 재현 시나리오

> **목적**: 기능·UI가 바뀔 때마다 **사용자가 코드 없이** 같은 절차를 따라 하며 검수·디버깅할 수 있게 한다.  
> **규칙**: 에이전트는 `.cursor/rules/qa-demo-handoff.mdc` 에 따라, 해당 마일스톤/기능 완료 시 **본 파일에 섹션을 추가**한다 (최신이 위).

## 사용법

1. 아래에서 **가장 위 섹션**부터 최근 작업을 연다.
2. **환경**·**사전 조건**을 맞춘 뒤 **절차**를 순서대로 수행한다.
3. **기대 결과** 체크가 안 되면 **깨졌을 때**를 참고해 로컬에서 자유롭게 디버깅한다 (콘솔, Network, Supabase, ENV).

## 픽스처·시드·보안

- 계정·양 클랜·시드 구조: [01-plan/debug-and-fixtures.md](./01-plan/debug-and-fixtures.md)  
- URL로 권한 위조·인증 우회는 운영/Preview에서 **금지** ([D-SHELL-02](./01-plan/decisions.md#d-shell-02--권한디버그-쿼리-우회-차단-정책), [D-DEV-01](./01-plan/decisions.md#d-dev-01--로컬staging-픽스처--디버그-계층)).

---

<!-- 새 시나리오는 이 구분선 위에 추가 (최신이 위) -->

## 2026-05-14 — 클랜 이벤트 알림 카드(카카오 옵트인)·대진표 팀 슬롯 이름

**한 줄 요약**: 이벤트 탭 알림 카드에서 Discord와 함께 **카카오 수신 의사만** 저장하고, Premium 대진표 초안에서 **팀 슬롯 이름**을 생성 시 기본 채워 넣은 뒤 편집·저장할 수 있는지 확인한다.

**환경**: `http://127.0.0.1:3000` · `npm run db:seed` 반영 픽스처(`QA_Leader_01`·`QA_01_Clan`은 seed 후 **premium**).

**사전 조건**: [debug-and-fixtures.md](./01-plan/debug-and-fixtures.md) 픽스처 리더 로그인 · MainClan 이벤트 탭 접근 가능.

**절차**:

1. `QA_Leader_01` 로그인 후 `/games/overwatch/clan/{QA_01_Clan_UUID}/events`.
2. (운영진 권한이면 상단 블록) `data-testid="clan-event-notify-settings"` 영역에 **카카오 알림톡 (예정)** 체크·저장 후 새로고침 시 선택이 유지되는지 본다(실 알림 미발송).
3. 같은 페이지에서 **`?tab=bracket`** 으로 **대진표 생성기** 탭을 연다 (`data-testid="clan-events-bracket-tab"`).
4. **대진표 초안 만들기** → 대회명 입력·팀 슬롯 수 선택 → 저장.
5. 목록에 생긴 **초안** 카드에서 **슬롯 이름** 줄에 `팀 1 · 팀 2 · …` 가 보이는지 확인하고, **팀 슬롯 이름 편집**을 펼쳐 임의 라벨 수정 후 **팀 슬롯 저장** — 카드 미리보기 문구가 갱신되는지 본다.
6. (선택) 동일 초안 **삭제**로 정리한다.

**기대 결과**:

- [ ] 카카오 항목은 **의사 플래그만** 남고, 메시지는 발송되지 않는다(카피로 범위가 안내된다).
- [ ] 대진표 탭에서 Premium이 아닌 클랜은 잠금 안내만 보이거나, 픽스처 premium 클랜에서는 초안 작성·편집이 가능하다.

**깨졌을 때**: `clan_settings.event_notify` JSON 병합 · `mergeEventNotifyPayload` · `bracket_tournaments.snapshot` · Server Action 권한·`subscription_tier`.

## 2026-05-13 — MainGame 스크림 상태·티어 필터 바

**한 줄 요약**: 스크림 탭에서 상태(모집 중 vs 확정 후)·대략 티어 구간·취소 포함 여부로 목록과 달 점표를 줄인다.

**환경**: `http://127.0.0.1:3000` · 해당 게임에 스크림이 한 건 이상 존재(서로 상태·티어가 다르게 만든 두 방이 가장 명확).

**사전 조건**: MainGame 허브 온보딩 완료.

**절차**:

1. `/games/{게임슬러그}` → 스크림 탭.
2. 「모집·조율 중」만 선택했을 때 `일정 확정`·`종료`·`상대 배정`/초안만 해당하는 행이 가려졌는지 확인한다.
3. 「저·중티어 묶음」 등 칩 하나를 눌렀을 때, 호스트 티어 범위가 그 SR 구간과 겹치는 방만 남고, 티어를 비워 둔 방은 그대로 남는지 본다(여러 칩은 OR).
4. 「취소된 방도 표시」를 켠 뒤 취소된 방이 목록과 달력 점표에 포함되는지, 끈 뒤 기본 상태로 돌아가는지 확인한다.

**기대 결과**:

- [ ] `scrim-filter-bar`에서 나온 조건에 맞는 행만 **목록과 미니 달 선표**가 맞춰 바뀐다.
- [ ] 조건이 너무 빡세면 「필터 초기화」로 달 선택까지 같이 초기화되고 카드가 돌아온다.

**깨졌을 때**: `filteredScrimRooms`를 쓰는 `useMemo` 연쇄 · **로컬 날짜** 키.

## 2026-05-12 — MainGame 스크림 미니 캘린더·일자 묶음

**한 줄 요약**: 게임 허브 **스크림** 탭에서 월 그리드로 스크림이 있는 날을 보고, 날짜를 눌러 해당일 방만 거르거나 해제하고, 모두 펼치면 날짜별 헤더로 카드가 나뉜다.

**환경**: `http://127.0.0.1:3000` · 해당 게임에 스크림 `scrim_rooms`가 하나 이상 있을 때(시드 또는 수동 생성).

**사전 조건**: 게임 허브 온보딩 완료(로그인 + 게임 인증). 가능하면 다른 날짜의 방 두 개 준비.

**절차**:

1. `/games/{게임슬러그}` → **스크림** 탭.
2. **미니 달력**에서 스크림이 있는 날이 구분되어 보이고, 해당 날짜를 한 번 탭했을 때 아래 목록이 그날 예정 건만 표시된다.
3. 같은 날짜를 다시 탭하거나 **모든 날짜**를 눌러 선택이 해제되고, 날짜별 **섹션 헤더**(요일 포함) 아래 카드가 시간순으로 묶였는지 본다.
4. 선택한 날에 방이 하나도 없는 경우 **모든 날짜 보기**로 빠져나오는지 본다(선택 검증 가능 시).

**기대 결과**:

- [ ] 사용자가 「어느 날에 무엇이 잡혀 있는지」를 더 쉽게 볼 수 있다(달력 표시 또는 날짜별 블록).
- [ ] 날짜를 골라 한 날 것만 보이게 할 수 있다.

**깨졌을 때**: `main-game-community-tabs.tsx` · 로컬 날짜 키 타임존 · 탭 새로고침 `router.refresh`.

## 2026-05-11 — MainGame 스크림 탭 (개설·상대 지정·양측 확정)

**한 줄 요약**: 게임 허브 **스크림** 탭에서 운영진이 방을 만들고 상대 클랜을 배정한 뒤, 양쪽에서 확정 버튼을 눌러 DB가 `confirmed`로 올라가는지 확인한다.

**환경**: `http://127.0.0.1:3000` · [debug-and-fixtures.md](./01-plan/debug-and-fixtures.md) — 같은 게임에 **서로 다른 클랜 A·B** 와 각각 `confirm_scrim` 가능한 운영진 계정.

**사전 조건**: DB **0041** 적용. 두 계정이 각각 클랜 A·B에 속해 있고, MainGame 온보딩을 마친 상태.

**절차**:

1. 계정 A로 `/games/{게임슬러그}` 접속 → **스크림** 탭.
2. 일시·(선택) 제목·장소 입력 후 **방 만들기** — 목록에 `모집 중` 행이 생기는지 본다.
3. **상대 클랜**에서 B를 고르고 **상대 지정** — 상태가 상대 배정(`matched`)으로 바뀌는지 본다.
4. 계정 A로 **우리 측 확정 (호스트)** 클릭.
5. 계정 B로 로그인해 같은 탭에서 **우리 측 확정 (게스트)** 클릭.
6. (선택) 호스트로 **일정·조건 수정** 저장 후, **일시·장소·모드·티어**를 바꿨을 때만 "확정을 다시" 안내 토스트가 뜨는지 본다. **제목·메모만** 바꿀 때는 뜨지 않는지 본다.
7. 게스트(또는 호스트)로 **스크림 취소** 후 목록에 취소 상태가 반영되고, Supabase `clan_events`(scrim_auto)가 소프트 취소됐는지 본다.

**기대 결과**:

- [ ] `confirm_scrim` 없는 일반 멤버는 개설 폼·상대 지정·확정 버튼을 쓰지 못한다(또는 액션 에러).
- [ ] 같은 측에서 확정을 두 번 누르면 "이미 이 측에서 확정했습니다" 류 메시지가 난다.
- [ ] 양측 확정 후 방 상태가 일정 확정으로 보이거나 DB상 `confirmed`이다.
- [ ] 확정된 스크림에서 호스트가 **제목·메모만** 바꾸면 "다시 확정" 토스트가 뜨지 않고, **일시·장소·모드·티어 범위** 중 하나라도 바꾸면 안내가 뜬다.
- [ ] `confirm_scrim` 권한이 있는 호스트·게스트가 **스크림 취소** 후 상태가 취소로 보이고 연동 일정이 정리된다.

**깨졌을 때**: 브라우저 토스트·네트워크 · `scrim-rooms` Server Action · RLS `scrim_room_confirmations` · 서비스 롤 INSERT/UPDATE.

## 2026-05-11 — 스크림 확정 → 클랜 일정·in-app 예약 (0041, Supabase)

**한 줄 요약**: `scrim_rooms`가 `confirmed`가 되면 양 클랜에 `scrim_auto` `clan_events`가 생기고, DB 트리거가 in-app reminder `notification_log`를 넣는지(및 취소 시 `cancelled` 처리되는지) 확인한다.

**환경**: 원격 DB **`0041`** 적용 · `service_role` 또는 Supabase SQL Editor.

**사전 조건**: 서로 다른 `clans` A·B, `users` 최소 1명(스크림 생성자), `clan_members`에 A·B 활동 멤버 포함. `scrim_rooms`에 `clan_a_id=A`, `clan_b_id=B`, `status=matched`, `scheduled_at` 미래, `cancelled_at` NULL 행 1건.

**절차**:

1. `scrim_room_confirmations`에 같은 `scrim_room_id`로 `side=host`·`guest` 각각 한 행씩 INSERT(정책상 운영진+·해당 클랜).
2. `scrim_rooms`가 `status=confirmed`로 바뀌었는지 확인한다.
3. `clan_events`에서 `source=scrim_auto`·`scrim_id`가 해당 스크림인 행이 **클랜 A·B 각 1건**인지 본다.
4. 각 `event_id`에 대해 `notification_log`(channel=inapp, status=scheduled)가 미래 `start_at` 기준으로 생겼는지 본다.
5. 스크림을 취소 처리하거나 `status`를 `confirmed` 밖으로 바꾼 뒤 `clan_events.cancelled_at` 및 예약 취소 여부를 본다.

**기대 결과**:

- [ ] `UNIQUE (clan_id, scrim_id)`로 동일 스크림에 클랜당 1행만 유지된다.
- [ ] 확정 무효화(일정 변경) 시 이벤트가 소프트 취소된다.

**깨졌을 때**: 트리거 `clan_events_apply_from_scrim_room` · `scrim_rooms_promote_to_confirmed` · RLS `scrim_room_confirmations_insert`.

## 2026-05-11 — 수동 일정 Discord 웹훅(등록·수정)

**한 줄 요약**: 클랜에 Discord 일정 알림 웹훅이 켜져 있을 때 **일정 등록**과 **일정 저장(수정)** 각각 직후 Discord 채널에 요약 메시지가 오는지 확인한다(헤더가 «등록»/«변경»으로 구분되는지).

**환경**: `http://127.0.0.1:3000` · 클랜 설정 `event_notify`에 **`discord_enabled: true`** 와 유효한 **웹훅 URL** · 운영진 계정.

**사전 조건**: [debug-and-fixtures.md](./01-plan/debug-and-fixtures.md) — 테스트용 Discord 서버 채널에 웹훅을 만들어 클랜 설정에 붙여 둔다.

**절차**:

1. 이벤트 탭에서 수동 일정을 **새로 등록**한다. Discord에 **«클랜 일정 등록»** 헤더와 제목·시각·링크가 보이는지 본다.
2. 동일 일정을 **편집**해 제목 또는 시각을 바꾼 뒤 저장한다. Discord에 **«클랜 일정 변경»** 헤더로 새 내용이 한 번 더 오는지 본다.

**기대 결과**:

- [ ] 웹훅이 꺼져 있거나 URL이 비어 있으면 메시지가 가지 않고, 앱 저장은 그대로 성공한다.
- [ ] in-app 예약이 실패해 저장이 롤백되는 경우(신규 등록 한정)에는 Discord도 가지 않는다.

**깨졌을 때**: `clan_settings.event_notify` JSON · `readClanEventNotifySettings` · 서버 액션 로그 · 웹훅 URL·Discord 서버 권한.

## 2026-05-11 — 수동 일정 in-app 알림 (단발·매주·매월, D-EVENTS-03 일부)

**한 줄 요약**: **`source=manual`** 일정을 **반복 없음·매주·매월**로 저장하면 활동 멤버에게 `notification_log` in-app 예약이 생기고(반복은 다가오는 여러 회차), 시각이 되면 Cron이 알림 벨에 **`event_reminder`** 로 뜨는지 확인한다.

**환경**: `http://127.0.0.1:3000` · 원격 DB **`0040`** (`dispatch_inapp_notification_batch` 확장) · `CRON_SECRET`로 `GET /api/cron/dispatch-notifications` 호출 가능.

**사전 조건**: [debug-and-fixtures.md](./01-plan/debug-and-fixtures.md) — 클랜 운영진으로 일정 추가·수정 가능. 단발 검증 시 시작 시각을 **11분~25시간 뒤** 등으로 두면 T-10m 등 슬롯이 1개 이상 잡힌다. 반복 검증 시 **다가오는 요일/일자**가 있도록 시작일·요일(또는 매월 일자)을 잡는다.

**절차**:

1. **단발**: 이벤트 탭에서 반복 없음 일정을 등록하고 시작 시각을 위 범위로 둔다.
2. **반복(선택)**: 매주(요일 1개 이상) 또는 매월로 저장한다. `notification_log`에서 같은 `event_id`에 `instance_idx=0`(단발) 또는 **회차 시작 ms**(반복)인 행이 여러 개 생기는지 본다.
3. Supabase에서 `channel=inapp`·`status=scheduled` 행이 기대대로 있는지 확인한다(슬롯 개수·회차 수는 시각·반복 규칙에 따라 다름).
4. (선택) 행의 `scheduled_at`을 과거로 잠깐 바꾸거나 시간이 지난 뒤 `dispatch-notifications` Cron을 호출한다.
5. MainClan 알림 벨에서 **일정 N시간 전(또는 10분 전 등) · 제목** 형태의 항목이 보이고, 탭 이동이 캘린더로 이어지는지 본다.
6. 일정을 **편집**해 시각·반복을 바꾼 뒤 예약이 갱신되는지 본다. **취소**하면 남은 `scheduled` 행이 `cancelled`로 바뀌는지 확인한다.

**기대 결과**:

- [ ] 반복 일정(매주/매월)에도 `event_id` 기준 in-app `scheduled` 예약이 생긴다(회차별 `instance_idx`는 시작 시각 ms).
- [ ] 일정 수정 후에도 기존 예약이 취소되고 새 규칙으로 재예약된다.

**깨졌을 때**: `insertClanEventInAppNotifications` · `listUpcomingOccurrenceStarts` · `dispatch_inapp_notification_batch` · `notifications.kind`.

## 2026-05-11 — Cron · LFG 모집 만료 정리 (`dispatch-notifications`)

**한 줄 요약**: `GET /api/cron/dispatch-notifications` 응답에 **`lfg_expired`** 가 포함되고, `expires_at`이 지난 `open` LFG 글이 DB에서 `expired`로 바뀌는지 확인한다.

**환경**: `http://127.0.0.1:3000`(또는 배포 URL) · 원격 DB **`0039`** 적용 · `.env.local`의 `CRON_SECRET`(8자 이상)과 동일한 값으로 `Authorization: Bearer …` 헤더.

**사전 조건**: (선택) Supabase에서 `lfg_posts`에 `status=open` 이고 `expires_at <= now()` 인 테스트 행이 있으면 검증이 쉬움. 없으면 응답의 `lfg_expired`가 `0`인지만 확인.

**절차**:

1. `curl` 또는 브라우저 확장으로 `GET /api/cron/dispatch-notifications` + `Authorization: Bearer <CRON_SECRET>` 호출한다.
2. JSON에 `ok`, `dispatched`, `discord`, **`lfg_expired`**, `lfg_note` 필드가 있는지 본다.
3. 테스트 행을 썼다면 해당 `lfg_posts.status`가 `expired`이고, 대기 중이던 `lfg_applications`가 `expired`로 정리됐는지 Supabase에서 본다.

**기대 결과**:

- [ ] `lfg_note`가 null이거나(성공 시) 실패 시에만 에러 메시지가 든다.
- [ ] 만료 대상이 있으면 `lfg_expired`가 0보다 크다.

**깨졌을 때**: `expire_open_lfg_posts_batch` RPC · `CRON_SECRET` · 서비스 롤 ENV.

## 2026-05-11 — 스토어 개인 풀 구매 무효화 (관리 탭)

**한 줄 요약**: 같은 클랜의 **다른 운영진**이 **관리**에서 **개인 풀** 스토어 구매를 무효화하면 구매자 **개인 코인**이 돌아오고, `profile_entrance_fx`이면 스토어 네임플레이트 보유·선택이 정리되는지 확인한다.

**환경**: `http://127.0.0.1:3000` · `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` · 원격 DB에 **`0038`** `void_personal_store_purchase` 마이그레이션 적용.

**사전 조건**: [debug-and-fixtures.md](./01-plan/debug-and-fixtures.md) — **두 명 이상의 운영진**이 같은 클랜에 있음. 계정 A가 **Premium 클랜**에서 **개인 풀**로 `profile_entrance_fx`(또는 다른 개인 풀 상품)를 구매한 상태, A는 해당 클랜 **활동 멤버**.

**절차**:

1. 계정 A로 **스토어 · 개인 꾸미기**에서 개인 코인으로 상품을 구매해 둔다(이미 있으면 생략).
2. **A로** `/games/overwatch/clan/{clanId}/manage` 에서 「**개인 풀 구매 정정**」에 해당 행이 보이면, 본인 행에 **무효화 불가** 안내가 뜨는지 본다.
3. **로그아웃 후 B**(같은 클랜 운영진, 구매자가 아님)로 로그인한다.
4. 동일 관리 페이지에서 「개인 풀 구매 정정」에 구매가 보이면 사유 4자 이상 입력 → **무효화** → 확인 대화상자 승인(개인 풀로 환급 문구).
5. 구매자 프로필/스토어에서 개인 코인 잔액이 늘었는지, 해당 상품이 미구매 상태로 보이는지 확인한다. `profile_entrance_fx`였다면 프로필 네임플레이트에서 스토어 프레임이 더 이상 적용·보유되지 않는지 본다.

**기대 결과**:

- [ ] 클랜 풀·개인 풀 정정 섹션이 권한 있을 때 각각 분리되어 보인다.
- [ ] B의 무효화 후 구매자에게 코인이 환급되고 구매가 무효 처리된다.
- [ ] 입장 효과 상품이면 네임플레이트 스토어 frame 정리가 반영된다.

**깨졌을 때**: `void_personal_store_purchase` 응답 `error` 코드 · `buyer_not_clan_member` · `coin_transactions` · Supabase `user_nameplate_inventory`.

## 2026-05-11 — 투표 알림 Discord 웹훅 배치(Cron)

**한 줄 요약**: 클랜에 Discord 웹훅이 켜져 있을 때 투표 알림 슬롯이 `notification_log`에 쌓이고, **`/api/cron/dispatch-notifications`** 가 in-app 배치 후 Discord 배치를 돌려 웹훅으로 보내는지 확인한다.

**환경**: `http://127.0.0.1:3000` · 원격 DB에 `0037` 마이그레이션 적용 · `.env.local`에 `CRON_SECRET`(선택: 수동 GET 호출 시 `Authorization: Bearer …`) · 클랜 설정에 Discord 웹훅 URL.

**사전 조건**: [debug-and-fixtures.md](./01-plan/debug-and-fixtures.md) — 리더 등으로 로그인 가능 · `dispatch-notifications` 라우트가 Vercel Cron 또는 로컬에서 호출 가능.

**절차**:

1. 관리 또는 설정에서 **Discord 웹훅**을 저장한다.
2. 이벤트 탭에서 **투표**를 만들 때 알림 옵션이 켜져 있으면, 생성 직후 `notification_log`에 `channel=discord` 행이 생기는지 Supabase에서 본다(또는 앱 로그).
3. `GET /api/cron/dispatch-notifications` 에 `Authorization: Bearer <CRON_SECRET>` 을 붙여 호출한다(로컬·Preview 동일).
4. 응답 JSON에 in-app 건수와 함께 **`discord`** / **`discord_note`** · **`lfg_expired`** / **`lfg_note`** 필드가 기대대로인지 본다. Discord 방에 메시지가 도착하면 성공.

**기대 결과**:

- [ ] 웹훅이 없는 클랜에서는 Discord 행이 생기지 않거나 스킵된다.
- [ ] Cron(또는 수동 호출) 후 `scheduled`/`processing` 디스코드 로그가 `sent`/`failed` 등으로 마무리된다.

**깨졌을 때**: `claim_discord_poll_notification_batch` · `finalize_discord_notification_dispatch` · Edge 로그 · 웹훅 URL·429 응답.

## 2026-05-11 — MainClan 알림 시트(벨) 읽음 시점

**한 줄 요약**: 헤더 **알림** 버튼으로 우측 시트가 열리고, **닫을 때** 서버에 읽음이 반영되는지 확인한다(열려 있는 동안에는 DB 읽음이 안 바뀔 수 있음).

**환경**: `http://127.0.0.1:3000` · 리더 픽스처로 MainClan 아무 탭 · 미읽음 알림이 1건 이상 있으면 확인이 쉬움.

**사전 조건**: [debug-and-fixtures.md](./01-plan/debug-and-fixtures.md) · `0033` 등 알림 피드 마이그레이션 적용.

**절차**:

1. 클랜 허브에서 헤더 **알림**(벨)을 눌러 시트가 열리는지 본다.
2. 시트를 **닫는다**(×·바깥 클릭·Escape). 필요하면 Supabase에서 해당 `notifications` 행의 `read_at`이 채워졌는지 본다.
3. **모두 읽음**을 누른 뒤에도 목록·배지가 갱신되는지 확인한다.

**기대 결과**:

- [ ] 시트가 열리면 우측 패널에 「알림」 제목과 목록(또는 빈 안내)이 보인다.
- [ ] 시트를 닫으면 미읽음 처리 RPC가 실행되고 새로고침 후 배지가 줄거나 사라진다.

**깨졌을 때**: `mark_notification_reads` · `router.refresh` · Base UI Dialog 포털 · 브라우저 콘솔 오류.

## 2026-05-11 — 스토어 클랜 풀 구매 무효화 (관리 탭)

**한 줄 요약**: 다른 운영진 계정으로 로그인해 **클랜 관리**에서 클랜 풀 스토어 구매를 무효화하면 코인이 돌아오고, 배너 슬롯이면 배너 URL이 비는지 확인한다.

**환경**: `http://127.0.0.1:3000` (`npm run dev`) · `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` · 원격 DB에 `0036` 마이그레이션 적용됨.

**사전 조건**: [debug-and-fixtures.md](./01-plan/debug-and-fixtures.md) — **두 명 이상의 운영진**(또는 리더 A가 구매·오피서 B가 무효화)이 같은 클랜에 있어야 한다. 클랜 풀로 `clan_banner_slot` 등이 구매된 상태.

**절차**:

1. 계정 A(구매자)로 **클랜 풀**에서 배너 슬롯 등을 구매해 둔다(이미 있으면 생략).
2. **A로** `/games/overwatch/clan/{clanId}/manage` 에 들어가 「스토어 구매 정정」에서 해당 행에 **본인은 무효화 불가** 안내가 뜨는지 본다.
3. **로그아웃 후 B**(같은 클랜 운영진, 구매자가 아님)로 로그인한다.
4. 동일 관리 페이지에서 「스토어 구매 정정」에 구매가 보이면 사유 4자 이상 입력 → **무효화** → 확인 대화상자 승인.
5. 스토어 탭에서 해당 상품이 다시 살지 않은(미구매 상태) 양상인지, 클랜 코인 잔액이 늘었는지 본다. 배너 슬롯이면 관리의 배너 설정·헤더 배너 표시가 비었는지 확인한다.

**기대 결과**:

- [ ] 구매자 본인은 무효화할 수 없다.
- [ ] 다른 운영진 무효화 후 코인이 클랜 풀로 환급된다.
- [ ] 배너 슬롯 무효화 시 배너 URL이 제거된다.

**깨졌을 때**: Supabase `void_clan_store_purchase` · `purchases`·`coin_transactions` 행, 서버 액션 로그. 서비스 롤 키 누락 시 RPC 호출 실패.

## 2026-05-11 — 가입 신청 표시(ClanAuth + 프로필)

**한 줄 요약**: ClanAuth에서 신청 후 **헤더 + 「신청 진행 중인 클랜」(목록 따로)·비활성화된 가입 버튼**이 보이고, `/profile`에서도 요약·목록이 맞는지 확인한다.

**환경**: `http://127.0.0.1:3000` (`npm run dev`) 또는 Preview URL · 동일 브랜치.

**사전 조건**: [debug-and-fixtures.md](./01-plan/debug-and-fixtures.md) — 게임 연동 완료·클랜 미소속 계정 · 시드 또는 목록에 클랜 카드 2개 이상.

**절차**:

1. `/games/overwatch/clan` 로 이동한다.
2. **클랜 A** 카드에서 **가입 신청 → 보내기**로 신청한다.
3. 페이지 **제목 아래 헤더 영역**에 「진행 중인 가입 신청」 블록에 **클랜 A**(게임명)가 보이고 **신청 취소**가 있는지 본다.
4. 가입 탭 본문에서 **「신청 진행 중인 클랜」** 섹션에 클랜 A 카드가 **검색·페이지와 무관하게** 위에 보이는지 본다.
5. 목록에 클랜 A가 **다시 나오지 않거나**(목록에서는 제외), 나온 카드에는 **신청 대기 중** 배지와 **비활성** 「가입 신청됨 · 대기 중」 버튼이 있는지 확인한다.
6. 같은 게임 목록 안의 다른 클랜 **B** 카드에는 「가입 신청」 대신 「**이 클랜으로 신청 바꾸기**」만 있는지 확인한다(클릭 시 교체 확인 다이얼로그).
7. `/profile` 로 이동해 「**진행 중인 가입 신청**」 요약과 「가입 신청」 목록에 동일 신청(A)이 표시되는지 본다. 안 보이면 **F5** 한 번 한다.

**기대 결과**:

- [ ] ClanAuth 헤더 + 고정 블록 + 카드 상태(비활성 버튼) UX가 위와 같다.
- [ ] 프로필에서 요약 + 상세 목록에 `pending` 이 보인다.
- [ ] 이미 신청한 처리: 일반 「가입 신청」 활성 버튼이 뜨지 않는다.

**깨졌을 때**: Supabase 에 `0035_*` 마이그레이션 적용 여부, `/profile`·서버 로그 `select_my_clan_join_requests`, Network(Server Actions)·RLS. 프로덕션 모드만 쓸 때 오래된 화면이면 빌드·재시작 확인.

## 2026-05-02 — UI 회귀 (Playwright 자동)

**한 줄 요약**: 문서상 **live** 로 표시된 MainClan 탭·헤더 링크·커뮤니티 탭·무소속 온보딩 헤더가 렌더되는지 자동 검증한다.

**환경**: `http://127.0.0.1:3000` 또는 `CI=true npm run test:e2e`(기본 3010).

**사전 조건**: **`npm run db:seed`** 로 픽스처 동기화(오버워치 `user_game_profiles` verified 포함). `.env.local` Supabase가 시드와 동일 프로젝트.

**절차**:

1. `npm run db:seed`
2. `npx playwright test e2e/ui-regression.spec.ts` (또는 전체 `npm run test:e2e`)

**기대 결과**:

- [ ] UI 회귀 스펙이 통과한다(MainClan 6경로·헤더 링크·알림 시트·MainGame 탭·멤버 온보딩).

**깨졌을 때**: 리더가 `/auth` 로만 가면 시드 재실행 후 `user_game_profiles` 확인.

## 2026-05-02 — 프로필 탈퇴 버튼

**한 줄 요약**: `/profile` 하단에서 로그아웃 옆 **탈퇴**로 본인 계정 삭제가 시도되는지 확인한다.

**환경**: `http://127.0.0.1:3000` (`npm run dev`) · `main` 또는 동일 브랜치.

**사전 조건**: 테스트용 계정으로 로그인. **탈퇴 성공**을 보려면 `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 필요. DB에 `created_by` 등 RESTRICT 참조가 많이 남아 있으면 삭제가 거절될 수 있음.

**절차**:

1. `/profile` 로 이동한다.
2. 하단 **로그아웃** 오른쪽에 붉은 **탈퇴** 버튼이 있는지 본다.
3. **탈퇴** 클릭 → confirm **취소** 시 아무 일도 없어야 한다.
4. 다시 **탈퇴** → confirm **확인** → 성공 시 `/` 로 돌아가고 재로그인 불가, 실패 시 `alert` 메시지가 보인다.

**기대 결과**:

- [ ] 탈퇴는 한 번 더 확인 후에만 서버 액션이 호출된다.
- [ ] 성공 시 홈으로 이동·세션 종료된다.

**깨졌을 때**: Supabase Auth 대시보드·서버 로그, `SUPABASE_SERVICE_ROLE_KEY`, FK 제약 위반 메시지.

## 2026-05-02 — 클랜 가입 토스트 · 운영진 승인/거절

**한 줄 요약**: 신청 직후·승인·거절 시 화면 상단 토스트가 보이고, 관리 화면에서 거절은 「거절 확정」까지 눌러야 반영되는지 확인한다.

**환경**: `http://127.0.0.1:3000` (`npm run dev`) 또는 Preview URL · 동일 브랜치.

**사전 조건**: [debug-and-fixtures.md](./01-plan/debug-and-fixtures.md) — 신청용 계정·리더 계정. **로컬에서 승인/거절까지 보려면** `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY`가 있어야 한다(없으면 서버 액션이 실패할 수 있음).

**절차**:

1. 신청자로 로그인 → `/games/overwatch/clan` → 클랜 카드에서 가입 신청 → **보내기**.
2. **상단 중앙** 알림 영역에 처리 중 로딩이 잠깐 보인 뒤 「가입 신청을 보냈습니다.」(또는 중복·실패 안내)가 **충분히** 보이는지 본다(바로 새로고침되며 사라지지 않아야 함).
3. 클랜장(또는 승인 권한 역할)으로 로그인 → 해당 클랜 **관리** → 가입 신청 목록.
4. **거절**만 누르면 사유 입력란이 펼쳐진다. **거절 확정**을 눌러야 거절이 처리된다.
5. **승인**을 누르면 처리 중 로딩 후 성공 안내가 상단 중앙에 보이는지 본다.

**기대 결과**:

- [ ] 신청 후 성공(또는 중복/실패) 토스트가 상단 중앙에서 명확히 보인다(약 2~3초 뒤 목록이 새로고침될 수 있음).
- [ ] 승인 또는 거절 확정 후 성공 토스트가 보이거나, 실패 시 빨간 토스트로 이유가 보인다.

**깨졌을 때**: 페이지 로드 후 `document.body` 안에 **`#clansync-toaster-mount-marker`** 가 있는지 본다(없으면 Next 클라이언트 번들·hydration 문제 또는 다른 호스트의 앱). **보내기 클릭 직후**에만 `[data-sonner-toaster]` 가 생길 수 있다 — Sonner는 토스트가 없을 때 그 속성 노드를 만들지 않는다. 콘솔 에러·Network(Server Actions)·목업 HTML 여부도 확인한다.

## 2026-05-02 — Phase 2 M6b MainClan in-app 알림 벨

**요약**: 클랜 셸 상단 벨을 눌러 우측 드로어에서 이 클랜 알림을 보고, 투표 알림에서 이벤트 투표 탭으로 이동할 수 있는지 확인한다.

**환경**: `http://127.0.0.1:3000` (`npm run dev`) · 마이그레이션 `0033` 적용된 Supabase · 로그인 · 게임 인증 · 클랜 소속.

**사전 조건**: 투표 알림 Cron이 `notifications` 행을 만들었거나, SQL로 본인에게 테스트 `notifications` 행을 넣을 수 있다면 미읽음 배지가 보인다.

**절차**:

1. `/games/{gameSlug}/clan/{clanId}` 등 MainClan 셸 아무 탭에서 상단 **벨**을 연다.
2. 미읽음이 있으면 빨간 배지(99+ 캡)가 보인다. 드로어를 열면 목록이 보이고, 잠시 후 미읽음 강조·배지가 사라지는지 확인한다(읽음 RPC + 새로고침).
3. 투표 알림 항목의 **원본 보기**로 이동 시 URL에 `?tab=polls`가 있고 투표 탭이 열려 있는지 확인한다.
4. 드로어 하단 **모두 읽음**을 눌러 잔여 미읽음이 없어지는지 확인한다.

**기대 결과**:

- [ ] 벨·드로어가 키보드 포커스/닫기로 조작 가능하다.
- [ ] 다른 클랜 알림은 이 셸 목록에 섞이지 않는다(현재 클랜 `clan_id`만).
- [ ] 빈 목록일 때 안내 문구가 보인다.

**깨졌을 때**: Supabase RLS `notifications` · RPC `mark_notification_reads` / `mark_notifications_read_all_for_clan` · 브라우저 Network(Server Action) 확인.

## 2026-04-28 — Phase 2 M6b 클랜 이벤트 탭

**요약**: 클랜 이벤트 페이지에서 월간 캘린더에 일정 점이 보이고, 날짜를 고른 뒤 일정을 추가·편집·취소할 수 있는지 확인한다.

**환경**: `http://127.0.0.1:3000` (`npm run dev`) · 로그인 · 게임 인증 · 클랜 소속(운영진 권한 권장).

**사전 조건**: `.env.local`에 Supabase 설정이 유효하고, 시드 또는 실제 클랜이 존재한다.

**절차**:

1. `/games/{gameSlug}/clan/{clanId}/events` 로 이동한다.
2. 상단 탭에서 **캘린더 · 대진표 생성기 Premium · 투표** 전환이 된다.
3. Free 클랜이면 대진표 탭에 업그레이드 안내와 «플랜·구독 보기» 링크가 보인다.
4. 운영진으로 **일정 추가**에서 내전 또는 이벤트만 선택 가능함을 확인한다 (스크림 옵션 없음).
5. 캘린더에서 날짜를 클릭한 뒤 하단 목록에서 일정을 열고, **편집** 또는 **일정 취소**가 동작하는지 확인한다.

**기대 결과**:

- [ ] 월 이동(‹ ›) 시 그리드가 바뀐다.
- [ ] 일정이 있는 날짜에 유형별 색 점이 보인다.
- [ ] 취소한 일정은 «다가오는 일정» 데이터에서 빠진다(소프트 취소).

**깨졌을 때**: 브라우저 콘솔 · Network · Supabase `clan_events.cancelled_at` 확인.

## 템플릿 (에이전트 복사용)

```markdown
## YYYY-MM-DD — (마일스톤 M? · 한 줄 제목)

**요약**:
**환경**:
**사전 조건**:
**절차**:
1.
**기대 결과**:
- [ ]
**깨졌을 때**:
```

---

## 2026-04-21 — (예시) Phase 2 스텁 랜딩만 있는 상태

**요약**: 저장소 클론 후 개발 서버만 띄웠을 때 랜딩이 뜨는지 확인한다.

**환경**: `http://localhost:3000` (`npm run dev`)

**사전 조건**: `.env.local`은 Supabase 클라이언트 초기화에 필요할 수 있음(키 없으면 이후 마일스톤에서 오류 가능). 본 예시는 정적 스텁만 볼 때는 최소 설정으로도 동작할 수 있다.

**절차**:

1. 프로젝트 루트에서 `npm run dev` 실행
2. 브라우저에서 `http://localhost:3000` 접속
3. “Phase 2 — 구현 준비 중” 카드가 보이면 성공

**기대 결과**:

- [ ] `/` 가 200으로 열린다
- [ ] 콘솔에 치명적 에러가 없다

**깨졌을 때**: 터미널의 Next.js 에러 스택, 브라우저 F12 → Console. 포트 충돌이면 `3000` 점유 프로세스 확인.
