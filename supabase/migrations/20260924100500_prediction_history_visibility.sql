-- Live vote counts remain shared within the clan. Settled individual picks
-- are personal records, while clan staff can inspect them for operations.
drop policy if exists balance_session_predictions_select_member on public.balance_session_predictions;

create policy balance_session_predictions_select_history_scope
  on public.balance_session_predictions
  for select using (
    user_id = (select auth.uid())
    or exists (
      select 1
        from public.balance_sessions s
        join public.clan_members cm on cm.clan_id = s.clan_id
       where s.id = balance_session_predictions.session_id
         and cm.user_id = (select auth.uid())
         and cm.status = 'active'
         and (
           cm.role in ('leader', 'officer')
           or (s.closed_at is null and s.match_outcome = 'pending')
         )
    )
  );
