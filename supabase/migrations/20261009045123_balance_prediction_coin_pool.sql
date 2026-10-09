-- Event predictions reserve personal coins and redistribute the entire pool.
-- Historical fixed rewards and their ledger entries remain unchanged.
alter table public.balance_sessions add column prediction_pool_enabled boolean not null default false;
alter table public.balance_sessions alter column prediction_pool_enabled set default true;

alter table public.balance_session_predictions
  add column stake_coins integer not null default 0 check (stake_coins >= 0),
  add column payout_coins integer not null default 0 check (payout_coins >= 0),
  add column pool_settled_at timestamptz,
  add column pool_settlement text check (pool_settlement in ('win','lose','refund'));

-- Pool writes must reserve/refund coins in one transaction through the RPC.
create policy balance_prediction_pool_insert on public.balance_session_predictions
as restrictive for insert to authenticated with check (
  exists (select 1 from public.balance_sessions s where s.id = session_id and not s.prediction_pool_enabled)
  and stake_coins = 0 and payout_coins = 0 and pool_settled_at is null and pool_settlement is null
);
create policy balance_prediction_pool_update on public.balance_session_predictions
as restrictive for update to authenticated using (
  exists (select 1 from public.balance_sessions s where s.id = session_id and not s.prediction_pool_enabled)
) with check (
  exists (select 1 from public.balance_sessions s where s.id = session_id and not s.prediction_pool_enabled)
  and stake_coins = 0 and payout_coins = 0 and pool_settled_at is null and pool_settlement is null
);

-- Individual pool picks stay owner/staff-only; event rankings use a scoped RPC.
alter policy balance_session_predictions_select_history_scope on public.balance_session_predictions
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.balance_sessions s join public.clan_members cm on cm.clan_id = s.clan_id
    where s.id = session_id and cm.user_id = (select auth.uid()) and cm.status = 'active'
      and (cm.role in ('leader','officer') or
        (not s.prediction_pool_enabled and s.closed_at is null and s.match_outcome = 'pending'))
  )
);

create function private.refund_balance_prediction_pool(p_session_id uuid, p_roster_only boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.balance_sessions%rowtype; p record; balance integer;
begin
  select * into s from public.balance_sessions where id = p_session_id for update;
  for p in select * from public.balance_session_predictions
    where session_id = p_session_id and pool_settled_at is null and stake_coins > 0
      and (not p_roster_only or public.balance_roster_contains_user(s.roster,user_id))
    order by user_id for update
  loop
    update public.users set coin_balance = coin_balance + p.stake_coins where id = p.user_id
      returning coin_balance into balance;
    insert into public.coin_transactions(user_id,pool_type,amount,reason,reference_type,reference_id,sub_key,balance_after,created_by)
      values(p.user_id,'personal',p.stake_coins,'balance_prediction_refund','balance_prediction_pool',p_session_id,
        p.user_id::text || ':edit:' || gen_random_uuid()::text,balance,auth.uid());
    delete from public.balance_session_predictions where session_id = p_session_id and user_id = p.user_id;
  end loop;
end $$;
revoke all on function private.refund_balance_prediction_pool(uuid,boolean) from public,anon,authenticated;

create function private.place_balance_prediction_pool(p_session_id uuid,p_pick smallint,p_stake integer)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s public.balance_sessions%rowtype;
  old_stake integer := 0; difference integer; balance integer; previous public.balance_session_predictions%rowtype;
begin
  if uid is null then raise exception '로그인이 필요합니다.' using errcode = '42501'; end if;
  if p_stake is null or p_stake < 0 or (p_stake > 0 and (p_pick is null or p_pick not in (1,2,3))) then
    raise exception '코인 수와 예측을 확인하세요.' using errcode = '22023';
  end if;
  select * into s from public.balance_sessions where id = p_session_id for update;
  if not found or not exists (select 1 from public.clan_members where clan_id = s.clan_id and user_id = uid and status = 'active') then
    raise exception '이 내전의 멤버만 참여할 수 있습니다.' using errcode = '42501';
  end if;
  if not s.prediction_pool_enabled or s.closed_at is not null or s.match_outcome <> 'pending' then
    raise exception '지금은 예측을 받지 않습니다.';
  end if;
  if s.phase = 'match_live' and (s.prediction_deadline_at is null or s.prediction_deadline_at <= clock_timestamp()) then
    raise exception '예측이 마감되었습니다.';
  end if;
  if not exists (select 1 from public.balance_rooms where series_id = s.series_id and kind = 'regular')
    or not exists (select 1 from public.clans where id = s.clan_id and subscription_tier = 'premium')
    or coalesce(s.formation_settings->'predictionEnabled','true'::jsonb) <> 'true'::jsonb then
    raise exception '승부예측을 사용할 수 없는 경기입니다.' using errcode = '42501';
  end if;
  if public.balance_roster_contains_user(s.roster,uid) then
    raise exception '관전하는 멤버만 참여할 수 있습니다.' using errcode = '42501';
  end if;
  select * into previous from public.balance_session_predictions where session_id = p_session_id and user_id = uid for update;
  if previous.pool_settled_at is not null then raise exception '이미 정산된 예측입니다.'; end if;
  old_stake := coalesce(previous.stake_coins,0);
  difference := p_stake - old_stake;
  select coin_balance into balance from public.users where id = uid for update;
  if balance is null or difference > balance then raise exception '보유 코인이 부족합니다.'; end if;
  if difference <> 0 then
    update public.users set coin_balance = coin_balance - difference where id = uid returning coin_balance into balance;
    insert into public.coin_transactions(user_id,pool_type,amount,reason,reference_type,reference_id,sub_key,balance_after,created_by)
      values(uid,'personal',-difference,case when difference > 0 then 'balance_prediction_stake' else 'balance_prediction_refund' end,
        'balance_prediction_pool',p_session_id,uid::text || ':edit:' || gen_random_uuid()::text,balance,uid);
  end if;
  if p_stake = 0 then
    delete from public.balance_session_predictions where session_id = p_session_id and user_id = uid;
  else
    insert into public.balance_session_predictions(session_id,user_id,pick_team,stake_coins)
      values(p_session_id,uid,p_pick,p_stake)
    on conflict(session_id,user_id) do update set pick_team = excluded.pick_team,stake_coins = excluded.stake_coins;
  end if;
end $$;
create function public.place_balance_prediction_pool(p_session_id uuid,p_pick smallint,p_stake integer)
returns void language sql security invoker set search_path = '' as $$
  select private.place_balance_prediction_pool(p_session_id,p_pick,p_stake);
$$;
revoke all on function private.place_balance_prediction_pool(uuid,smallint,integer),public.place_balance_prediction_pool(uuid,smallint,integer) from public,anon;
grant execute on function private.place_balance_prediction_pool(uuid,smallint,integer),public.place_balance_prediction_pool(uuid,smallint,integer) to authenticated;

-- One shared server deadline begins on the transition to the match screen.
create function private.guard_balance_prediction_pool_clock() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.prediction_pool_enabled and new.phase = 'match_live' and old.phase <> 'match_live' then
    new.prediction_deadline_at := clock_timestamp() + interval '5 minutes';
  end if;
  if new.prediction_pool_enabled is distinct from old.prediction_pool_enabled then
    raise exception '예측 정산 방식은 변경할 수 없습니다.';
  end if;
  return new;
end $$;
revoke all on function private.guard_balance_prediction_pool_clock() from public,anon,authenticated;
create trigger guard_balance_02_prediction_pool_clock before update on public.balance_sessions
for each row execute function private.guard_balance_prediction_pool_clock();

create function private.refund_balance_prediction_pool_on_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    perform private.refund_balance_prediction_pool(old.id);
    return old;
  end if;
  if new.prediction_pool_enabled and (
    new.closed_at is not null or new.match_outcome = 'void'
    or coalesce(new.formation_settings->'predictionEnabled','true'::jsonb) <> 'true'::jsonb
  ) then perform private.refund_balance_prediction_pool(new.id);
  elsif new.prediction_pool_enabled and new.roster is distinct from old.roster then
    perform private.refund_balance_prediction_pool(new.id,true);
  end if;
  return new;
end $$;
revoke all on function private.refund_balance_prediction_pool_on_change() from public,anon,authenticated;
create trigger refund_balance_prediction_pool_change after update on public.balance_sessions
for each row execute function private.refund_balance_prediction_pool_on_change();
create trigger refund_balance_prediction_pool_delete before delete on public.balance_sessions
for each row execute function private.refund_balance_prediction_pool_on_change();

create function private.set_balance_pool_outcome(p_session_id uuid,p_outcome public.balance_match_outcome)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s public.balance_sessions%rowtype; winner smallint;
  total numeric; winner_total numeric; p record; balance integer; refund boolean;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','not_authenticated'); end if;
  if p_outcome is null or p_outcome = 'pending' then return jsonb_build_object('ok',false,'error','invalid_outcome'); end if;
  select * into s from public.balance_sessions where id = p_session_id for update;
  if not found then return jsonb_build_object('ok',false,'error','session_not_found'); end if;
  if not s.prediction_pool_enabled then return jsonb_build_object('ok',false,'error','wrong_prediction_mode'); end if;
  if s.closed_at is not null then return jsonb_build_object('ok',false,'error','session_closed'); end if;
  if s.phase <> 'match_live' then return jsonb_build_object('ok',false,'error','wrong_phase'); end if;
  if s.match_outcome <> 'pending' then return jsonb_build_object('ok',false,'error','already_resolved'); end if;
  if not private.can_manage_balance_round_as(p_session_id,uid) then
    return jsonb_build_object('ok',false,'error','forbidden');
  end if;
  -- Exclude a spectator who became a player before the outcome was saved.
  perform private.refund_balance_prediction_pool(p_session_id,true);
  winner := case p_outcome when 'team1' then 1 when 'team2' then 2 when 'draw' then 3 else null end;
  select coalesce(sum(stake_coins),0),coalesce(sum(stake_coins) filter(where pick_team = winner),0)
    into total,winner_total from public.balance_session_predictions
    where session_id = p_session_id and pool_settled_at is null and stake_coins > 0;
  refund := winner is null or winner_total = 0;
  -- Largest remainders distribute every integer coin, with deterministic ties.
  -- Lock users in UUID order to share the same lock order as refunds.
  for p in
    with shares as (
      select user_id,stake_coins,pick_team,
        case when refund then stake_coins::numeric
          when pick_team = winner then floor(total * stake_coins / winner_total) else 0 end base,
        case when not refund and pick_team = winner then mod(total * stake_coins,winner_total) else -1 end remainder
      from public.balance_session_predictions
      where session_id = p_session_id and pool_settled_at is null and stake_coins > 0
    ), ranked as (
      select *,row_number() over(order by remainder desc,user_id) place,total - sum(base) over() leftover from shares
    )
    select *,base + case when not refund and pick_team = winner and place <= leftover then 1 else 0 end payout
    from ranked order by user_id
  loop
    if p.payout > 0 then
      update public.users set coin_balance = (coin_balance::numeric + p.payout)::integer where id = p.user_id returning coin_balance into balance;
      insert into public.coin_transactions(user_id,pool_type,amount,reason,reference_type,reference_id,sub_key,balance_after,created_by)
        values(p.user_id,'personal',p.payout::integer,case when refund then 'balance_prediction_refund' else 'balance_prediction_win' end,
          'balance_prediction_pool',p_session_id,p.user_id::text || ':settle',balance,uid);
    end if;
    update public.balance_session_predictions set payout_coins = p.payout::integer,pool_settled_at = clock_timestamp(),
      pool_settlement = case when refund then 'refund' when p.pick_team = winner then 'win' else 'lose' end
    where session_id = p_session_id and user_id = p.user_id;
  end loop;
  update public.balance_sessions set match_outcome = p_outcome,predictions_settled_at = clock_timestamp(),
    prediction_deadline_at = null where id = p_session_id;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function private.set_balance_pool_outcome(uuid,public.balance_match_outcome) from public,anon;
grant execute on function private.set_balance_pool_outcome(uuid,public.balance_match_outcome) to authenticated;
-- Preserve the existing public function, grants and legacy settlement behavior.
-- Only newly created pool rounds enter the new settlement branch.
do $$
declare definition text; marker text := '  select c.subscription_tier';
begin
  definition := pg_get_functiondef('public.set_balance_match_outcome(uuid,public.balance_match_outcome)'::regprocedure);
  if position(marker in definition) = 0 then raise exception 'Prediction settlement bridge drift'; end if;
  execute replace(definition,marker,
    '  if v_sess.prediction_pool_enabled then
    return private.set_balance_pool_outcome(p_session_id,p_outcome);
  end if;
' || marker);
end $$;

create function private.read_balance_prediction_pool(p_session_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.balance_sessions%rowtype; uid uuid := auth.uid(); result jsonb;
begin
  select * into s from public.balance_sessions where id = p_session_id;
  if uid is null or not found or not exists (
    select 1 from public.clan_members where clan_id = s.clan_id and user_id = uid and status = 'active'
  ) then raise exception '이 내전의 멤버만 조회할 수 있습니다.' using errcode = '42501'; end if;
  select jsonb_build_object(
    'total',coalesce(sum(stake_coins),0),
    'count',count(*) filter(where stake_coins > 0),
    'teams',jsonb_build_array(
      coalesce(sum(stake_coins) filter(where pick_team = 1),0),
      coalesce(sum(stake_coins) filter(where pick_team = 2),0),
      coalesce(sum(stake_coins) filter(where pick_team = 3),0)),
    'balance',(select coin_balance from public.users where id = uid),
    'mine',(select jsonb_build_object('pick',pick_team,'stake',stake_coins,'payout',payout_coins,'settlement',pool_settlement)
      from public.balance_session_predictions where session_id = p_session_id and user_id = uid and stake_coins > 0),
    'ranking',(
      select coalesce(jsonb_agg(to_jsonb(r) order by r.profit desc,r.hits desc,r.nickname,r.user_id),'[]'::jsonb)
      from (
        select p.user_id,u.nickname,count(*)::int played,
          count(*) filter(where p.pool_settlement = 'win')::int hits,
          sum(p.payout_coins::bigint-p.stake_coins)::bigint profit
        from public.balance_session_predictions p join public.balance_sessions r on r.id = p.session_id
          join public.users u on u.id = p.user_id
        where r.series_id = s.series_id and r.clan_id = s.clan_id and r.prediction_pool_enabled
          and p.pool_settlement in ('win','lose') and p.pool_settled_at is not null
        group by p.user_id,u.nickname
      ) r
    )
  ) into result from public.balance_session_predictions where session_id = p_session_id;
  return result;
end $$;
create function public.read_balance_prediction_pool(p_session_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.read_balance_prediction_pool(p_session_id);
$$;
revoke all on function private.read_balance_prediction_pool(uuid),public.read_balance_prediction_pool(uuid) from public,anon;
grant execute on function private.read_balance_prediction_pool(uuid),public.read_balance_prediction_pool(uuid) to authenticated;
