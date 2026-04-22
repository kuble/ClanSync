-- M6c — 승부예측 마감 시각 (match_live 진입 시 앱이 설정). null = 제한 없음(구 데이터).

alter table public.balance_sessions
  add column prediction_deadline_at timestamptz;

comment on column public.balance_sessions.prediction_deadline_at is
  '승부예측 마감(UTC). null 이면 RLS에서 마감 제한 없음.';

-- 예측 제출: 마감 전만 (또는 deadline null)
drop policy if exists balance_session_predictions_insert_self on public.balance_session_predictions;
drop policy if exists balance_session_predictions_update_self on public.balance_session_predictions;

create policy balance_session_predictions_insert_self
  on public.balance_session_predictions
  for insert with check (
    (select auth.uid()) = user_id
    and pick_team in (1, 2)
    and exists (
      select 1
        from public.balance_sessions s
        join public.clans c on c.id = s.clan_id
       where s.id = session_id
         and s.phase = 'match_live'::public.balance_session_phase
         and s.match_outcome = 'pending'::public.balance_match_outcome
         and s.closed_at is null
         and (
           s.prediction_deadline_at is null
           or s.prediction_deadline_at > now()
         )
         and c.subscription_tier = 'premium'::public.clan_subscription_tier
         and not public.balance_roster_contains_user(s.roster, (select auth.uid()))
    )
  );

create policy balance_session_predictions_update_self
  on public.balance_session_predictions
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and pick_team in (1, 2)
    and exists (
      select 1
        from public.balance_sessions s
        join public.clans c on c.id = s.clan_id
       where s.id = balance_session_predictions.session_id
         and s.phase = 'match_live'::public.balance_session_phase
         and s.match_outcome = 'pending'::public.balance_match_outcome
         and s.closed_at is null
         and (
           s.prediction_deadline_at is null
           or s.prediction_deadline_at > now()
         )
         and c.subscription_tier = 'premium'::public.clan_subscription_tier
         and not public.balance_roster_contains_user(s.roster, (select auth.uid()))
    )
  );
