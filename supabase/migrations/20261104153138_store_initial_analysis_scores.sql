-- Rewrite the stored value in place so existing registrations keep their timestamp,
-- identity and one-time constraint. No tier column remains after the conversion.
alter table private.balance_entry_tiers rename to balance_initial_scores;
alter table private.balance_initial_scores drop constraint balance_entry_tiers_tier_step_check;
alter table private.balance_initial_scores alter column tier_step type numeric(3,1)
  using ((tier_step - 17) / 5.0);
alter table private.balance_initial_scores rename column tier_step to initial_score;
alter table private.balance_initial_scores add check (
  initial_score between -3.4 and 5.4 and mod(initial_score, 0.2) = 0
);

drop function public.read_own_balance_entry_tiers(uuid);
drop function public.complete_balance_tier_welcome(uuid,timestamptz,jsonb);

-- The welcome screen only needs to know which roles can still be submitted.
create function public.read_own_initialized_roles(p_clan_id uuid)
returns text[] language sql stable security definer set search_path='' as $$
  select coalesce(array_agg(s.role order by s.role),array[]::text[])
  from private.balance_initial_scores s join public.clan_members cm using(clan_id,user_id)
  where s.clan_id=p_clan_id and s.user_id=(select auth.uid()) and cm.status='active';
$$;

create function public.complete_balance_score_welcome(p_clan_id uuid,p_joined_at timestamptz,p_scores jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if jsonb_typeof(p_scores) is distinct from 'object' then return false; end if;
  if exists(select 1 from jsonb_each(p_scores) s
    where s.key not in ('tank','dmg','sup') or jsonb_typeof(s.value)<>'number') then return false; end if;
  -- Check before casting to the column's precision so fractional requests cannot be rounded in.
  if exists(select 1 from jsonb_each_text(p_scores) s
    where s.value::numeric not between -3.4 and 5.4 or mod(s.value::numeric,0.2)<>0)
    or not exists(select 1 from public.clans c join public.games g on g.id=c.game_id
      where c.id=p_clan_id and g.slug='overwatch') then return false; end if;
  if not public.complete_clan_welcome(p_clan_id,p_joined_at) then return false; end if;
  insert into private.balance_initial_scores(clan_id,user_id,role,initial_score)
    select p_clan_id,auth.uid(),key,value::numeric from jsonb_each_text(p_scores)
    on conflict (clan_id,user_id,role) do nothing;
  return true;
end $$;
revoke all on function public.complete_balance_score_welcome(uuid,timestamptz,jsonb),public.read_own_initialized_roles(uuid) from public,anon;
grant execute on function public.complete_balance_score_welcome(uuid,timestamptz,jsonb),public.read_own_initialized_roles(uuid) to authenticated;

create or replace function private.balance_prediction_basis(p_clan uuid,p_before timestamptz)
returns jsonb language plpgsql stable set search_path='' as $$
declare
  ratings jsonb := '{}'; games jsonb := '{}'; baselines jsonb := '{}';
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
      ratings := jsonb_set(ratings,array[player],to_jsonb(coalesce((ratings->>player)::float8,0)+event.value));
    elsif event.kind=2 then
      gap := 0;
      for idx in 1..10 loop
        gap := gap + coalesce((ratings->>event.players[idx])::float8,0) * (case when idx<=5 then 1 else -1 end);
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
  return jsonb_build_object('ratings',ratings,'baselines',baselines,'games',games);
end $$;

create or replace function private.balance_analysis_bundle(p_clan uuid,p_before timestamptz,p_forecast boolean)
returns jsonb language plpgsql stable set search_path='' as $$
declare
  context jsonb := private.legacy_balance_analysis_context(p_clan,p_before);
  basis jsonb;
  entries jsonb;
begin
  if p_forecast or exists(select 1 from private.balance_initial_scores where clan_id=p_clan and recorded_at<=p_before) then
    basis := private.balance_prediction_basis(p_clan,p_before);
    select coalesce(jsonb_agg(jsonb_build_object('userId',ids.id,'role',t.role,'map',null,'tierBased',true,
      'score',basis->'ratings'->(t.user_id::text||':'||t.role),'games',coalesce(basis->'games'->(t.user_id::text||':'||t.role),'0'::jsonb))),'[]'::jsonb)
      into entries from private.balance_initial_scores t cross join lateral (
        select t.user_id as id union select p.id from public.clan_participants p
        where p.clan_id=t.clan_id and p.user_id=t.user_id and p.is_guest
      ) ids where t.clan_id=p_clan and t.recorded_at<=p_before;
    context := context || entries;
  end if;
  return jsonb_build_object('context',context,'basis',basis-'games');
end $$;
