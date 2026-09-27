-- Staff may inspect prediction payouts from their own clan, including personal
-- ledger entries whose clan_id is intentionally null. Other personal ledger
-- entries remain behind the original owner-only policy.
create function public.read_clan_prediction_ledger(p_clan_id uuid)
returns table(user_id uuid, reference_id uuid, amount integer, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.clan_members cm
    where cm.clan_id = p_clan_id and cm.user_id = auth.uid()
      and cm.status = 'active' and cm.role in ('leader', 'officer')
  ) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select t.user_id, t.reference_id, t.amount, t.created_at
    from public.coin_transactions t
    join public.balance_sessions s on s.id = t.reference_id
    where s.clan_id = p_clan_id and t.pool_type = 'personal'
      and t.reference_type = 'balance_session'
    order by t.created_at, t.id;
end $$;
revoke all on function public.read_clan_prediction_ledger(uuid) from public, anon;
grant execute on function public.read_clan_prediction_ledger(uuid) to authenticated;

-- The existing score-edit permission is configurable. Its absent-key default
-- now includes officers, in line with the application permission defaults.
create or replace function public.set_balance_scores(p_round_id uuid,p_clan_id uuid,p_snapshot jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare s public.balance_sessions%rowtype; role text; permissions jsonb; roles jsonb; premium boolean; entry record;
begin
 select * into s from public.balance_sessions where id=p_round_id and clan_id=p_clan_id for update;
 if not found or auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 select m.role::text,cs.permissions,c.subscription_tier='premium' into role,permissions,premium
 from public.clan_members m join public.clan_settings cs on cs.clan_id=m.clan_id join public.clans c on c.id=m.clan_id
 where m.clan_id=p_clan_id and m.user_id=auth.uid() and m.status='active';
 roles:=case when permissions ? 'edit_mscore' then permissions->'edit_mscore' else '["leader","officer"]'::jsonb end;
 if role is null or not (private.can_manage_balance_round(p_round_id,p_clan_id) or (jsonb_typeof(roles)='array' and roles ? role)) then raise exception 'forbidden' using errcode='42501'; end if;
 if s.closed_at is not null or s.phase<>'match_live' then raise exception '경기 진행 단계에서만 점수를 기록할 수 있습니다.'; end if;
 if jsonb_typeof(p_snapshot) is distinct from 'object' then raise exception 'invalid_scores'; end if;
 for entry in select key,value from jsonb_each(p_snapshot) loop
   if not public.balance_roster_contains_user(s.roster,entry.key::uuid) or jsonb_typeof(entry.value) is distinct from 'object'
   or jsonb_typeof(entry.value->'m') is distinct from 'number' or not ((entry.value->>'m')::numeric between -10 and 10)
   or (entry.value->'a' is distinct from 'null'::jsonb and (not premium or jsonb_typeof(entry.value->'a') is distinct from 'number' or not ((entry.value->>'a')::numeric between -10 and 10)))
   then raise exception 'invalid_scores'; end if;
 end loop;
 update public.balance_sessions set ma_snapshot=p_snapshot where id=p_round_id;
end $$;

-- Historical corrections change one participant's evaluation score only.
-- Analysis scores, roster, outcome and payout records are untouched.
create function public.update_balance_history_mscore(
  p_round_id uuid, p_clan_id uuid, p_user_id uuid, p_score numeric
)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.balance_sessions%rowtype; member_role text; permissions jsonb; allowed_roles jsonb;
begin
  select * into s from public.balance_sessions
    where id = p_round_id and clan_id = p_clan_id for update;
  if not found or auth.uid() is null then raise exception 'forbidden' using errcode = '42501'; end if;
  select cm.role::text, cs.permissions into member_role, permissions
    from public.clan_members cm join public.clan_settings cs on cs.clan_id = cm.clan_id
    where cm.clan_id = p_clan_id and cm.user_id = auth.uid() and cm.status = 'active';
  allowed_roles := case when permissions ? 'edit_mscore' then permissions->'edit_mscore'
    else '["leader","officer"]'::jsonb end;
  if member_role is null or jsonb_typeof(allowed_roles) is distinct from 'array'
    or not (allowed_roles ? member_role) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_score is null or p_score < -10 or p_score > 10 then raise exception 'invalid_score'; end if;
  if s.match_outcome not in ('team1', 'team2', 'draw')
    or not exists (select 1 from public.balance_rooms r where r.series_id = s.series_id and r.kind = 'regular')
    or not public.balance_roster_contains_user(s.roster, p_user_id) then
    raise exception '경기 기록의 출전자만 수정할 수 있습니다.';
  end if;
  update public.balance_sessions
    set ma_snapshot = jsonb_set(
      coalesce(s.ma_snapshot, '{}'::jsonb), array[p_user_id::text],
      coalesce(s.ma_snapshot -> p_user_id::text, jsonb_build_object('m', 0, 'a', null))
        || jsonb_build_object('m', p_score), true
    ) where id = p_round_id;
end $$;
revoke all on function public.update_balance_history_mscore(uuid,uuid,uuid,numeric) from public, anon;
grant execute on function public.update_balance_history_mscore(uuid,uuid,uuid,numeric) to authenticated;
