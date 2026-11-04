-- The signup reference is known from its registration time. Its weight depends
-- on all settled regular games for this member and role, including earlier ones.
create function private.balance_signup_contribution(p_score numeric, p_role_games integer)
returns numeric language sql immutable strict parallel safe set search_path='' as $$
  select p_score * 0.5 * greatest(20 - p_role_games, 0) / 20;
$$;
revoke all on function private.balance_signup_contribution(numeric,integer) from public,anon,authenticated;

create or replace function private.balance_prediction_basis(p_clan uuid,p_before timestamptz)
returns jsonb language plpgsql stable set search_path='' as $$
declare
  ratings jsonb := '{}'; games jsonb := '{}'; baselines jsonb := '{}';
  initial_scores jsonb := '{}';
  pending jsonb := '{}'; changes jsonb; event record;
  player text; idx integer; played integer; k float8; gap float8; base float8;
begin
  for event in
    with rounds as materialized (
      select s.id,s.opened_at,coalesce(s.predictions_settled_at,s.closed_at) as settled,
        case s.match_outcome when 'team1' then 1.0 when 'team2' then 0.0 else 0.5 end as actual,
        lineup.players
      from public.balance_sessions s
      cross join lateral (
        select array_agg(coalesce(p.user_id::text,slot.id)||':'||slot.role order by slot.idx) as players
        from (values
          (1,s.roster#>>'{team1,tank}','tank'),(2,s.roster#>>'{team1,dmg,0}','dmg'),(3,s.roster#>>'{team1,dmg,1}','dmg'),
          (4,s.roster#>>'{team1,sup,0}','sup'),(5,s.roster#>>'{team1,sup,1}','sup'),(6,s.roster#>>'{team2,tank}','tank'),
          (7,s.roster#>>'{team2,dmg,0}','dmg'),(8,s.roster#>>'{team2,dmg,1}','dmg'),
          (9,s.roster#>>'{team2,sup,0}','sup'),(10,s.roster#>>'{team2,sup,1}','sup')
        ) slot(idx,id,role)
        left join public.clan_participants p on p.clan_id=p_clan and p.id=slot.id::uuid and p.is_guest
        having count(distinct coalesce(p.user_id::text,slot.id))=10
      ) lineup
      where s.clan_id=p_clan and s.match_outcome in ('team1','team2','draw')
        and s.opened_at<coalesce(s.predictions_settled_at,s.closed_at) and coalesce(s.predictions_settled_at,s.closed_at)<=p_before
        and exists(select 1 from public.balance_rooms r where r.series_id=s.series_id and r.kind='regular')
    )
    select recorded_at as at,0 as kind,null::uuid as id,array[user_id::text||':'||role] as players,
      initial_score as value from private.balance_initial_scores where clan_id=p_clan and recorded_at<=p_before
    union all select settled,1,id,players,actual from rounds
    union all select opened_at,2,id,players,actual from rounds
    order by at,kind,id
  loop
    if event.kind=0 then
      player := event.players[1];
      initial_scores := jsonb_set(initial_scores,array[player],to_jsonb(event.value));
    elsif event.kind=2 then
      gap := 0;
      for idx in 1..10 loop
        player := event.players[idx];
        gap := gap + (coalesce((ratings->>player)::float8,0) +
          coalesce(private.balance_signup_contribution((initial_scores->>player)::numeric,coalesce((games->>player)::int,0)),0))
          * (case when idx<=5 then 1 else -1 end);
      end loop;
      base := 1/(1+power(0.35::float8/0.65,gap/5));
      baselines := jsonb_set(baselines,array[event.id::text],to_jsonb(base));
      changes := '{}';
      for idx in 1..10 loop
        player := event.players[idx];
        played := coalesce((games->>player)::int,0);
        k := case when played<10 then 0.20 when played<30 then 0.12 else 0.08 end;
        changes := jsonb_set(changes,array[player],to_jsonb(k*(event.value-base)*(case when idx<=5 then 1 else -1 end)));
      end loop;
      pending := jsonb_set(pending,array[event.id::text],changes);
    else
      changes := pending->event.id::text;
      foreach player in array event.players loop
        ratings := jsonb_set(ratings,array[player],to_jsonb(coalesce((ratings->>player)::float8,0)+(changes->>player)::float8));
        games := jsonb_set(games,array[player],to_jsonb(coalesce((games->>player)::int,0)+1));
      end loop;
      pending := pending-event.id::text;
    end if;
  end loop;
  -- During replay ratings contain only earned adjustments. Combine once for display.
  for player in select jsonb_object_keys(initial_scores) loop
    ratings := jsonb_set(ratings,array[player],to_jsonb(coalesce((ratings->>player)::float8,0) +
      private.balance_signup_contribution((initial_scores->>player)::numeric,coalesce((games->>player)::int,0))));
  end loop;
  return jsonb_build_object('ratings',ratings,'baselines',baselines,'games',games);
end $$;
