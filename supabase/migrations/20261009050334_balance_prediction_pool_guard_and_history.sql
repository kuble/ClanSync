-- Pool table writes are restricted to transactional RPCs by restrictive RLS.
-- Their validation also covers editing and manager settlement after the cutoff.
create or replace function private.lock_prediction_round() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s public.balance_sessions%rowtype;
begin
  if tg_op = 'UPDATE' and (new.session_id is distinct from old.session_id or new.user_id is distinct from old.user_id) then
    raise exception 'immutable_prediction_identity';
  end if;
  select * into s from public.balance_sessions where id = new.session_id for update;
  if s.prediction_pool_enabled then return new; end if;
  if auth.uid() is not null and (not found or new.user_id <> auth.uid() or s.closed_at is not null
    or s.phase <> 'match_live' or s.match_outcome <> 'pending'
    or (s.prediction_deadline_at is not null and s.prediction_deadline_at <= clock_timestamp())
    or not public.is_active_clan_member(s.clan_id) or public.balance_roster_contains_user(s.roster,auth.uid())) then
    raise exception '예측 투표가 종료되었거나 투표할 수 없습니다.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.lock_prediction_round() from public,anon,authenticated;

-- Keep the existing staff scope; include stake/refund/payout entries so the
-- personal prediction history reports actual net coins rather than gross rewards.
create or replace function public.read_clan_prediction_ledger(p_clan_id uuid)
returns table(user_id uuid,reference_id uuid,amount integer,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.clan_members cm where cm.clan_id = p_clan_id
      and cm.user_id = auth.uid() and cm.status = 'active' and cm.role in ('leader','officer')
  ) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select t.user_id,t.reference_id,t.amount,t.created_at
    from public.coin_transactions t join public.balance_sessions s on s.id = t.reference_id
    where s.clan_id = p_clan_id and t.pool_type = 'personal'
      and t.reference_type in ('balance_session','balance_prediction_pool')
    order by t.created_at,t.id;
end $$;
revoke all on function public.read_clan_prediction_ledger(uuid) from public,anon;
grant execute on function public.read_clan_prediction_ledger(uuid) to authenticated;
