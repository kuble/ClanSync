-- The third prediction choice represents a draw. Keep all existing eligibility,
-- deadline, room-kind, and Premium policies; only widen the allowed choice.
alter table public.balance_session_predictions
  drop constraint balance_session_predictions_pick_team_check;
alter table public.balance_session_predictions
  add constraint balance_session_predictions_pick_team_check
  check (pick_team in (1, 2, 3));

comment on table public.balance_session_predictions is
  'Premium · 비출전 멤버만. pick_team 1=블루 승, 2=레드 승, 3=무승부.';

alter policy balance_session_predictions_insert_self
  on public.balance_session_predictions
  with check (
    (select auth.uid()) = user_id
    and pick_team in (1, 2, 3)
    and exists (
      select 1 from public.balance_sessions s
      join public.clans c on c.id = s.clan_id
      where s.id = session_id
        and s.phase = 'match_live'::public.balance_session_phase
        and s.match_outcome = 'pending'::public.balance_match_outcome
        and s.closed_at is null
        and (s.prediction_deadline_at is null or s.prediction_deadline_at > now())
        and c.subscription_tier = 'premium'::public.clan_subscription_tier
        and not public.balance_roster_contains_user(s.roster, (select auth.uid()))
    )
  );

alter policy balance_session_predictions_update_self
  on public.balance_session_predictions
  with check (
    (select auth.uid()) = user_id
    and pick_team in (1, 2, 3)
    and exists (
      select 1 from public.balance_sessions s
      join public.clans c on c.id = s.clan_id
      where s.id = balance_session_predictions.session_id
        and s.phase = 'match_live'::public.balance_session_phase
        and s.match_outcome = 'pending'::public.balance_match_outcome
        and s.closed_at is null
        and (s.prediction_deadline_at is null or s.prediction_deadline_at > now())
        and c.subscription_tier = 'premium'::public.clan_subscription_tier
        and not public.balance_roster_contains_user(s.roster, (select auth.uid()))
    )
  );

-- Preserve the current authorization, flash-room guard, pool debit, and
-- idempotent payout implementation. The winner choice alone changes.
do $$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.set_balance_match_outcome(uuid,public.balance_match_outcome)'::regprocedure);
  if definition !~* 'v_winner_pick\s*:=\s*null\s*;' then
    raise exception 'Prediction settlement winner choice drift';
  end if;
  execute regexp_replace(
    definition,
    'v_winner_pick\s*:=\s*null\s*;',
    'v_winner_pick := case when p_outcome = ''draw''::public.balance_match_outcome then 3 else null end;',
    'i'
  );
end $$;
