-- The original session host can predict as a spectator without staking coins. Zero stake + pick 0 cancels the host prediction.
begin;

-- Keep outstanding stakes stable while replacing the RPCs and returning host coins.
lock table public.balance_sessions in share row exclusive mode;

create or replace function private.place_balance_prediction_pool(p_session_id uuid,p_pick smallint,p_stake integer)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s public.balance_sessions%rowtype;
  host_only boolean; old_stake integer := 0; difference integer; balance integer; previous public.balance_session_predictions%rowtype;
begin
  if uid is null then raise exception '로그인이 필요합니다.' using errcode = '42501'; end if;
  if p_stake is null or p_stake < 0 or (p_stake > 0 and (p_pick is null or p_pick not in (1,2,3))) then
    raise exception '코인 수와 예측을 확인하세요.' using errcode = '22023';
  end if;
  select * into s from public.balance_sessions where id = p_session_id for update;
  if not found or not exists (select 1 from public.clan_members where clan_id = s.clan_id and user_id = uid and status = 'active') then
    raise exception '이 내전의 멤버만 참여할 수 있습니다.' using errcode = '42501';
  end if;
  host_only := exists (select 1 from public.balance_session_series where id = s.series_id and host_user_id = uid);
  if host_only and p_stake > 0 then
    raise exception '세션 개설자는 코인을 걸 수 없습니다.' using errcode = '42501';
  end if;
  if host_only and (p_pick is null or p_pick not in (0,1,2,3)) then
    raise exception '예측 선택을 확인하세요.' using errcode = '22023';
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
  if host_only and p_pick in (1,2,3) then
    insert into public.balance_session_predictions(session_id,user_id,pick_team,stake_coins)
      values(p_session_id,uid,p_pick,0)
    on conflict(session_id,user_id) do update set pick_team = excluded.pick_team,stake_coins = 0;
  elsif p_stake = 0 then
    delete from public.balance_session_predictions where session_id = p_session_id and user_id = uid;
  else
    insert into public.balance_session_predictions(session_id,user_id,pick_team,stake_coins)
      values(p_session_id,uid,p_pick,p_stake)
    on conflict(session_id,user_id) do update set pick_team = excluded.pick_team,stake_coins = excluded.stake_coins;
  end if;
end $$;

create or replace function private.read_balance_prediction_pool(p_session_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.balance_sessions%rowtype; uid uuid := auth.uid(); result jsonb;
begin
  select * into s from public.balance_sessions where id = p_session_id;
  if uid is null or not found or not exists (
    select 1 from public.clan_members where clan_id = s.clan_id and user_id = uid and status = 'active'
  ) then raise exception '이 내전의 멤버만 조회할 수 있습니다.' using errcode = '42501'; end if;
  select jsonb_build_object(
    'hostOnly',exists (select 1 from public.balance_session_series where id = s.series_id and host_user_id = uid),
    'total',coalesce(sum(stake_coins),0),
    'count',count(*) filter(where stake_coins > 0),
    'teams',jsonb_build_array(
      coalesce(sum(stake_coins) filter(where pick_team = 1),0),
      coalesce(sum(stake_coins) filter(where pick_team = 2),0),
      coalesce(sum(stake_coins) filter(where pick_team = 3),0)),
    'balance',(select coin_balance from public.users where id = uid),
    'mine',(select jsonb_build_object('pick',pick_team,'stake',stake_coins,'payout',payout_coins,'settlement',pool_settlement)
      from public.balance_session_predictions where session_id = p_session_id and user_id = uid),
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

create or replace function private.set_balance_pool_outcome(p_session_id uuid,p_outcome public.balance_match_outcome)
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
  -- Coin-free host predictions contribute accuracy only, never money or payouts.
  update public.balance_session_predictions set pool_settled_at = clock_timestamp(),
    pool_settlement = case when p_outcome = 'void' then 'refund' when pick_team = winner then 'win' else 'lose' end
    where session_id = p_session_id and pool_settled_at is null and stake_coins = 0;
  update public.balance_sessions set match_outcome = p_outcome,predictions_settled_at = clock_timestamp(),
    prediction_deadline_at = null where id = p_session_id;
  return jsonb_build_object('ok',true);
end $$;

create or replace function private.refund_balance_prediction_pool(p_session_id uuid, p_roster_only boolean default false)
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
  delete from public.balance_session_predictions where session_id = p_session_id and pool_settled_at is null and stake_coins = 0
    and (not p_roster_only or public.balance_roster_contains_user(s.roster,user_id));
end $$;

-- Return any outstanding host stake without discarding the prediction or changing
-- previously settled history. Lock rounds before users, as the placement RPC does.
do $$
declare p record; balance integer;
begin
  for p in select v.* from public.balance_session_predictions v
    join public.balance_sessions s on s.id = v.session_id
    join public.balance_session_series r on r.id = s.series_id
    where s.prediction_pool_enabled and s.match_outcome = 'pending'
      and v.user_id = r.host_user_id and v.stake_coins > 0 and v.pool_settled_at is null
    order by s.id,v.user_id
  loop
    perform 1 from public.balance_sessions where id = p.session_id for update;
    update public.users set coin_balance = coin_balance + p.stake_coins where id = p.user_id returning coin_balance into balance;
    insert into public.coin_transactions(user_id,pool_type,amount,reason,reference_type,reference_id,sub_key,balance_after,created_by)
      values(p.user_id,'personal',p.stake_coins,'balance_prediction_refund','balance_prediction_pool',p.session_id,
        p.user_id::text || ':host-only',balance,p.user_id);
    update public.balance_session_predictions set stake_coins = 0 where session_id = p.session_id and user_id = p.user_id;
  end loop;
end $$;

commit;
