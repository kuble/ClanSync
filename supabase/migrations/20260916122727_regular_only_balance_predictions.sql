-- Add a restrictive room-kind gate without weakening the existing self-only,
-- Premium, spectator, open-round and deadline policies.
create policy balance_predictions_regular_insert
on public.balance_session_predictions as restrictive for insert to authenticated
with check (exists (
  select 1 from public.balance_sessions s
  join public.balance_rooms r on r.series_id = s.series_id
  where s.id = balance_session_predictions.session_id and r.kind = 'regular'
));

create policy balance_predictions_regular_update
on public.balance_session_predictions as restrictive for update to authenticated
using (exists (
  select 1 from public.balance_sessions s
  join public.balance_rooms r on r.series_id = s.series_id
  where s.id = balance_session_predictions.session_id and r.kind = 'regular'
))
with check (exists (
  select 1 from public.balance_sessions s
  join public.balance_rooms r on r.series_id = s.series_id
  where s.id = balance_session_predictions.session_id and r.kind = 'regular'
));
