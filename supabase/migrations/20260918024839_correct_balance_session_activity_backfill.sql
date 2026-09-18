-- QA received the initial activity column before the legacy backfill was
-- included in its source migration. Correct only sessions that predate that
-- release; clean environments already receive the same values there.
with legacy_activity as (
  select s.id,
    greatest(
      s.opened_at,
      coalesce((select max(r.opened_at) from public.balance_sessions r where r.series_id = s.id), s.opened_at),
      coalesce((select max(p.created_at) from public.balance_session_predictions p join public.balance_sessions r on r.id = p.session_id where r.series_id = s.id), s.opened_at),
      coalesce((select max(pref.updated_at) from public.balance_round_role_preferences pref join public.balance_sessions r on r.id = pref.round_id where r.series_id = s.id), s.opened_at)
    ) as occurred_at
  from public.balance_session_series s
  where s.closed_at is null
    and s.opened_at < '2026-09-18 00:36:20+00'::timestamptz
)
update public.balance_session_series s
   set last_activity_at = a.occurred_at
  from legacy_activity a
 where s.id = a.id;

-- A one-minute cadence keeps the visible timeout close to the configured hour.
select cron.schedule(
  'balance-session-auto-close',
  '* * * * *',
  'select private.close_stale_balance_sessions(50);'
);
