# 클랜 방송 채널의 라이브 확인

채널 소개에 플랫폼을 최대 4개 등록할 수 있다. 기존 단일 `platform/channel` 글도 읽을 때 같은 배열로 변환한다. 각 링크에 플랫폼별 방송 상태를 표시하며 어느 한 플랫폼의 상태를 다른 플랫폼에 적용하지 않는다.

## 공식 API 연결

현재 QA 환경에 아래 키는 설정되지 않았다. 키가 없으면 `API 연결 필요`, 오류·할당량 초과는 `현재 확인 실패`로 표시한다. 이런 경우 방송 종료로 판정하지 않는다.

| 플랫폼 | 서버 환경 변수 | 확인 방식 |
|---|---|---|
| YouTube | `YOUTUBE_API_KEY` | 채널 ID/핸들/영상의 채널을 확인하고 `search.list`의 `eventType=live` 조회 |
| Twitch | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | 서버의 Client Credentials 토큰과 Helix Get Streams |
| CHZZK | `CHZZK_CLIENT_ID`, `CHZZK_CLIENT_SECRET` | Client 인증으로 라이브 목록을 순회. 목록 조회가 끝나지 않으면 미발견 채널은 확인 필요 |
| SOOP | 현재 연결 없음 | 채널 링크 제공, `자동 확인 미지원` 표시 |

키는 `.env.e2e.local` 또는 실행 서버의 환경 변수에만 저장하고 커밋하지 않는다. `NEXT_PUBLIC_` 키로 만들지 않는다. 환경 변경 후 QA 서버를 다시 시작한다. 운영 반영은 별도 승인 범위다.

활성 클랜 소속과 저장된 채널 글을 확인하는 `/board/live/[postId]`를 통해 조회한다. 사용자가 입력한 URL을 서버에서 직접 요청하지 않으며 고정 공식 API 호스트만 호출한다. 응답은 `private, no-store`이다. 서버는 결과를 최대 5분 재사용하고 보이는 탭은 1분마다 확인한다. 상태의 툴팁에 확인 시각을 제공한다. 즉시성이 더 필요한 경우 플랫폼별 이벤트 연동은 별도 설계한다.

YouTube 검색의 일일 할당량과 CHZZK 전체 목록 순회 비용을 앱 계정에서 확인해야 한다. 실제 API 키/외부 채널의 현재 방송은 미검증이며 어댑터의 정상·오류·미설정 응답은 테스트로 검증한다.

공식 기준: [YouTube Search](https://developers.google.com/youtube/v3/docs/search/list), [Twitch Get Streams](https://dev.twitch.tv/docs/api/reference/#get-streams), [Twitch 인증](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow), [CHZZK Live](https://chzzk.gitbook.io/chzzk/chzzk-api/live).
