CREATE OR REPLACE FUNCTION private.read_balance_prediction_pool(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
        select p.user_id,coalesce(private.game_player_name(p.user_id,(select game_id from public.clans where id=s.clan_id)),'게임 ID 미등록') nickname,count(*)::int played,
          count(*) filter(where p.pool_settlement = 'win')::int hits,
          sum(p.payout_coins::bigint-p.stake_coins)::bigint profit
        from public.balance_session_predictions p join public.balance_sessions r on r.id = p.session_id

        where r.series_id = s.series_id and r.clan_id = s.clan_id and r.prediction_pool_enabled
          and p.pool_settlement in ('win','lose') and p.pool_settled_at is not null
        group by p.user_id
      ) r
    )
  ) into result from public.balance_session_predictions where session_id = p_session_id;
  return result;
end $function$;
