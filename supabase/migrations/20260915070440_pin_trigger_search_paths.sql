-- Security Advisor: all table/type references in these functions are qualified.
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.balance_roster_contains_user(jsonb, uuid) SET search_path = '';
ALTER FUNCTION public.poll_votes_replace_single_choice() SET search_path = '';
ALTER FUNCTION public.cancel_notification_log_on_poll_close() SET search_path = '';
ALTER FUNCTION public.bracket_tournaments_host_must_be_premium() SET search_path = '';
ALTER FUNCTION public.event_rsvps_scrim_kind_only() SET search_path = '';
-- Security Advisor: all table/type references in these functions are qualified.
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.balance_roster_contains_user(jsonb, uuid) SET search_path = '';
ALTER FUNCTION public.poll_votes_replace_single_choice() SET search_path = '';
ALTER FUNCTION public.cancel_notification_log_on_poll_close() SET search_path = '';
ALTER FUNCTION public.bracket_tournaments_host_must_be_premium() SET search_path = '';
ALTER FUNCTION public.event_rsvps_scrim_kind_only() SET search_path = '';
