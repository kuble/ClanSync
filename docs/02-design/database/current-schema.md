# 현재 DB 구조 색인

`npm run db:schema:index`로 앱의 생성 타입에서 재생성한다. 앱 타입과 QA DB 타입을 동기화한 뒤 실행한다. 이 문서는 전체 SQL 덤프나 운영 DB 적용 상태를 뜻하지 않는다.

- 원본: [생성 타입](../../../src/lib/supabase/database.types.ts)
- 변경 이력: [마이그레이션](../../../supabase/migrations/). 적용된 이력은 삭제·재번호·병합하지 않는다.
- QA 확인: `npm run db:test:types` → 생성 타입 대조·동기화 → `npm run db:schema:index`.
- RLS·제약·함수 본문은 타입에 포함되지 않으므로 해당 마이그레이션을 확인한다. 운영 반영은 별도 승인 범위다.

테이블 66개 · 함수 104개 · 열거형 35개.

## 테이블

| 이름 | 열 수 | 관계 수 |
| --- | ---: | ---: |
| `account_personal_emblem_picks` | 3 | 1 |
| `auth_failed_logins` | 6 | 0 |
| `auth_login_lockouts` | 5 | 0 |
| `balance_room_rsvps` | 4 | 2 |
| `balance_room_schedules` | 9 | 2 |
| `balance_rooms` | 17 | 6 |
| `balance_round_role_preferences` | 4 | 2 |
| `balance_session_hero_votes` | 5 | 2 |
| `balance_session_map_votes` | 3 | 2 |
| `balance_session_predictions` | 8 | 2 |
| `balance_session_series` | 9 | 3 |
| `balance_sessions` | 32 | 4 |
| `board_posts` | 10 | 3 |
| `bracket_tournaments` | 17 | 5 |
| `clan_auction_items` | 8 | 1 |
| `clan_badge_awards` | 4 | 1 |
| `clan_badge_featured` | 2 | 1 |
| `clan_badge_seen` | 3 | 2 |
| `clan_board_coaches` | 6 | 2 |
| `clan_board_comment_reactions` | 3 | 2 |
| `clan_board_comments` | 5 | 2 |
| `clan_board_posts` | 12 | 3 |
| `clan_board_reactions` | 2 | 2 |
| `clan_daily_member_activity` | 4 | 2 |
| `clan_discord_connections` | 6 | 1 |
| `clan_emoji_reactions` | 7 | 6 |
| `clan_emojis` | 6 | 1 |
| `clan_events` | 18 | 3 |
| `clan_hof_comment_reactions` | 3 | 2 |
| `clan_hof_comments` | 7 | 2 |
| `clan_join_requests` | 12 | 4 |
| `clan_members` | 14 | 2 |
| `clan_notices` | 9 | 3 |
| `clan_participant_invites` | 4 | 1 |
| `clan_participant_links` | 12 | 4 |
| `clan_participants` | 7 | 2 |
| `clan_personal_emblem_award_periods` | 4 | 1 |
| `clan_personal_emblem_awards` | 8 | 2 |
| `clan_personal_emblem_milestones` | 7 | 2 |
| `clan_personal_emblem_picks` | 4 | 2 |
| `clan_polls` | 15 | 3 |
| `clan_settings` | 8 | 2 |
| `clans` | 27 | 1 |
| `coin_transactions` | 13 | 4 |
| `event_rsvps` | 5 | 2 |
| `games` | 8 | 0 |
| `lfg_applications` | 11 | 3 |
| `lfg_posts` | 14 | 2 |
| `match_players` | 4 | 2 |
| `match_results` | 3 | 1 |
| `matches` | 10 | 3 |
| `nameplate_options` | 12 | 1 |
| `notification_log` | 18 | 6 |
| `notifications` | 9 | 2 |
| `poll_options` | 4 | 1 |
| `poll_votes` | 4 | 3 |
| `profile_role_preferences` | 4 | 2 |
| `purchases` | 13 | 6 |
| `scrim_room_confirmations` | 6 | 2 |
| `scrim_rooms` | 21 | 4 |
| `store_items` | 12 | 1 |
| `user_alt_accounts` | 6 | 2 |
| `user_game_profiles` | 10 | 2 |
| `user_namecard_selections` | 5 | 2 |
| `user_nameplate_inventory` | 3 | 2 |
| `users` | 14 | 0 |

## 함수

- `add_clan_emoji`
- `apply_lfg_post`
- `apply_store_purchase`
- `approve_clan_join_with_participant`
- `balance_roster_contains_user`
- `can_access_hof_comments`
- `can_manage_balance_room`
- `can_manage_balance_round`
- `can_use_clan_emoji_target`
- `cancel_balance_room`
- `cancel_lfg_post`
- `change_clan_membership`
- `claim_discord_bot_notification_batch`
- `clan_active_member_counts`
- `clan_cosmetic_access`
- `clan_emoji_reaction_counts`
- `clan_peer_nicknames`
- `close_balance_session_series`
- `close_stale_balance_sessions`
- `commit_balance_formation`
- `connect_clan_discord_bot`
- `count_lfg_applications`
- `create_balance_room`
- `delegate_balance_room`
- `dispatch_inapp_notification_batch`
- `edit_clan_match_record`
- `effective_view_alt_account_roles`
- `expire_open_lfg_posts_batch`
- `finalize_clan_personal_emblem_awards`
- `finalize_discord_bot_notification`
- `get_clan_namecards`
- `is_active_clan_member`
- `is_clan_officer_plus`
- `is_member_of_balance_session`
- `issue_clan_participant_invite`
- `link_clan_participant`
- `list_balance_roster_pool`
- `list_board_comment_reactions`
- `list_clan_emoji_reactions`
- `list_clan_guest_records`
- `list_hof_comment_reactions`
- `maint_cancel_poll_notifications_past_deadline`
- `mark_notification_reads`
- `mark_notifications_read_all_for_clan`
- `materialize_balance_rooms`
- `my_active_clan_for_game`
- `my_active_clans_by_game`
- `next_balance_round`
- `open_balance_room`
- `open_balance_session_series`
- `pending_clan_personal_emblem_awards`
- `place_balance_prediction_pool`
- `purchase_profile_title`
- `read_balance_analysis_context`
- `read_balance_prediction_pool`
- `read_clan_badge_metrics`
- `read_clan_match_record_corrections`
- `read_clan_participant_invite`
- `read_clan_personal_emblem_award_source`
- `read_clan_prediction_ledger`
- `read_clan_stats_records`
- `read_clan_stats_summary`
- `read_closed_balance_ballot`
- `read_player_profile`
- `recheck_clan_discord_notification`
- `record_clan_activity`
- `refresh_clan_member_participation`
- `refresh_clan_personal_emblem_milestones`
- `replace_event_discord_notifications`
- `replace_event_inapp_notifications`
- `request_clan_participant_link`
- `resolve_balance_role_preferences`
- `resolve_clan_join_request`
- `resolve_lfg_application`
- `review_clan_participant_link`
- `save_clan_participant`
- `save_clan_stats_settings`
- `save_manual_clan_event`
- `save_profile_role_preference`
- `save_round_role_preference`
- `select_my_clan_join_requests`
- `select_my_clan_membership`
- `set_balance_formation_settings`
- `set_balance_match_outcome`
- `set_balance_prematch_settings`
- `set_balance_room_rsvp`
- `set_balance_room_schedule_enabled`
- `set_balance_scores`
- `set_board_comment_reaction`
- `set_clan_banner`
- `set_clan_discord_bot_settings`
- `set_clan_discord_notification_preferences`
- `set_clan_member_role`
- `set_hof_comment_reaction`
- `submit_balance_ban_vote`
- `submit_clan_poll_vote`
- `unlink_clan_participant`
- `update_balance_auto_close_settings`
- `update_balance_auto_open_settings`
- `update_balance_history_mscore`
- `update_balance_room`
- `update_clan_rules`
- `void_clan_store_purchase`
- `void_personal_store_purchase`

## 열거형

- `auth_failed_login_reason`: | "invalid_password" | "unknown_email" | "locked" | "oauth_denied"
- `balance_match_outcome`: "pending" | "team1" | "team2" | "void" | "draw"
- `balance_session_phase`: "editing" | "map_ban" | "hero_ban" | "match_live"
- `board_post_type`: "promotion" | "scrim"
- `bracket_format`: "single_elim" | "double_elim" | "round_robin"
- `bracket_status`: "draft" | "in_progress" | "finished" | "cancelled"
- `clan_event_kind`: "intra" | "scrim" | "event"
- `clan_event_repeat`: "none" | "weekly" | "monthly"
- `clan_event_source`: "manual" | "scrim_auto"
- `clan_gender_policy`: "all" | "male" | "female"
- `clan_join_request_status`: "pending" | "approved" | "rejected" | "canceled"
- `clan_lifecycle`: "active" | "dormant" | "stale" | "deleted"
- `clan_match_status`: "draft" | "active" | "finished"
- `clan_match_type`: "intra" | "scrim" | "event"
- `clan_member_role`: "leader" | "officer" | "member"
- `clan_member_status`: "pending" | "active" | "left" | "banned"
- `clan_moderation`: "clean" | "reported" | "warned" | "hidden" | "deleted"
- `clan_style`: "social" | "casual" | "tryhard" | "pro"
- `clan_subscription_tier`: "free" | "premium"
- `coin_pool_type`: "clan" | "personal"
- `event_rsvp_status`: "going" | "maybe" | "not_going"
- `lfg_application_status`: | "applied" | "accepted" | "rejected" | "canceled" | "expired"
- `lfg_post_status`: "open" | "filled" | "expired" | "canceled"
- `nameplate_category`: "emblem" | "namebar" | "sub" | "frame" | "portrait"
- `nameplate_unlock_source`: "default" | "event" | "store" | "achievement"
- `notification_channel`: "inapp" | "discord" | "kakao" | "web_push"
- `notification_slot_kind`: | "event_t_minus_24h" | "event_t_minus_1h" | "event_t_minus_10min" | "event_t_0" | "poll_created" | "poll_daily" | "poll_weekly" | "poll_deadline_window" | "poll_deadline_1h" | "event_cancelled" | "lfg_post_expired" | "lfg_application_expired" | "event_created" | "event_updated" | "room_t_minus_10min" | "notice_created" | "poll_ended"
- `notification_status`: | "scheduled" | "sent" | "failed" | "cancelled" | "dlq" | "processing"
- `poll_notify_repeat`: | "none" | "once" | "daily" | "weekly" | "until_deadline_daily"
- `scrim_closed_reason`: "auto_timeout" | "manual" | "cancelled" | "finished"
- `scrim_confirm_side`: "host" | "guest"
- `scrim_room_status`: | "draft" | "matched" | "confirmed" | "cancelled" | "finished"
- `store_item_type`: "clan_deco" | "profile_deco"
- `user_gender`: "male" | "female" | "undisclosed"
- `user_language`: "ko" | "en" | "ja"
