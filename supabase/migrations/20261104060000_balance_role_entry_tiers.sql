-- A clan/role has one starting tier, including across rejoining the same clan.
create table private.balance_entry_tiers (
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('tank','dmg','sup')),
  tier_step smallint not null check (tier_step between 0 and 44),
  recorded_at timestamptz not null default statement_timestamp(),
  primary key (clan_id,user_id,role)
);
revoke all on private.balance_entry_tiers from public,anon,authenticated;

create function public.read_own_balance_entry_tiers(p_clan_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_object_agg(t.role,t.tier_step),'{}'::jsonb)
  from private.balance_entry_tiers t join public.clan_members cm using(clan_id,user_id)
  where t.clan_id=p_clan_id and t.user_id=(select auth.uid()) and cm.status='active';
$$;

create function public.complete_balance_tier_welcome(p_clan_id uuid,p_joined_at timestamptz,p_tiers jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if jsonb_typeof(p_tiers) is distinct from 'object' then return false; end if;
  if exists(select 1 from jsonb_each(p_tiers) t where t.key not in ('tank','dmg','sup')
    or jsonb_typeof(t.value)<>'number' or t.value::text !~ '^([0-9]|[1-3][0-9]|4[0-4])$')
    or not exists(select 1 from public.clans c join public.games g on g.id=c.game_id
      where c.id=p_clan_id and g.slug='overwatch') then return false; end if;
  if not public.complete_clan_welcome(p_clan_id,p_joined_at) then return false; end if;
  insert into private.balance_entry_tiers(clan_id,user_id,role,tier_step)
    select p_clan_id,auth.uid(),key,value::smallint from jsonb_each_text(p_tiers)
    on conflict do nothing;
  return true;
end $$;
revoke all on function public.complete_balance_tier_welcome(uuid,timestamptz,jsonb),public.read_own_balance_entry_tiers(uuid) from public,anon;
grant execute on function public.complete_balance_tier_welcome(uuid,timestamptz,jsonb),public.read_own_balance_entry_tiers(uuid) to authenticated;

-- The editor, forecast and frozen round snapshot share one role rating replay.
create function private.balance_prediction_basis(p_clan uuid,p_before timestamptz)
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
      (tier_step-17)/5.0 as value from private.balance_entry_tiers where clan_id=p_clan and recorded_at<=p_before
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
revoke all on function private.balance_prediction_basis(uuid,timestamptz) from public,anon,authenticated;

alter function private.balance_analysis_context(uuid,timestamptz) rename to legacy_balance_analysis_context;
create function private.balance_analysis_bundle(p_clan uuid,p_before timestamptz,p_forecast boolean)
returns jsonb language plpgsql stable set search_path='' as $$
declare
  context jsonb := private.legacy_balance_analysis_context(p_clan,p_before);
  basis jsonb;
  entries jsonb;
begin
  if p_forecast or exists(select 1 from private.balance_entry_tiers where clan_id=p_clan and recorded_at<=p_before) then
    basis := private.balance_prediction_basis(p_clan,p_before);
    select coalesce(jsonb_agg(jsonb_build_object('userId',ids.id,'role',t.role,'map',null,'tierBased',true,
      'score',basis->'ratings'->(t.user_id::text||':'||t.role),'games',coalesce(basis->'games'->(t.user_id::text||':'||t.role),'0'::jsonb))),'[]'::jsonb)
      into entries from private.balance_entry_tiers t cross join lateral (
        select t.user_id as id union select p.id from public.clan_participants p
        where p.clan_id=t.clan_id and p.user_id=t.user_id and p.is_guest
      ) ids where t.clan_id=p_clan and t.recorded_at<=p_before;
    context := context || entries;
  end if;
  return jsonb_build_object('context',context,'basis',basis-'games');
end $$;

create function private.balance_analysis_context(p_clan_id uuid,p_before timestamptz)
returns jsonb language sql stable set search_path='' as $$
  select private.balance_analysis_bundle(p_clan_id,p_before,false)->'context';
$$;
create or replace function private.balance_analysis_value(p_context jsonb,p_user text,p_role text,p_map text)
returns numeric language sql immutable set search_path='' as $$
  select (entry->>'score')::numeric from jsonb_array_elements(p_context) entry
  where entry->>'userId'=p_user and (entry->>'role' is null or entry->>'role'=p_role)
    and (entry->>'map' is null or entry->>'map'=p_map)
  order by (entry ? 'tierBased') desc,(entry->>'map' is not null) desc,(entry->>'role' is not null) desc limit 1;
$$;
revoke all on function private.balance_analysis_context(uuid,timestamptz),private.balance_analysis_bundle(uuid,timestamptz,boolean) from public,anon,authenticated;

create function public.read_balance_analysis_model(p_round_id uuid,p_clan_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare cutoff timestamptz;
begin
  select s.opened_at into cutoff from public.balance_sessions s
  join public.clans c on c.id=s.clan_id and c.subscription_tier='premium'
  join public.clan_members cm on cm.clan_id=c.id and cm.user_id=(select auth.uid()) and cm.status='active'
  join public.clan_settings cs on cs.clan_id=c.id
  where s.id=p_round_id and c.id=p_clan_id
    and (cm.role in ('officer','leader') or (jsonb_typeof(cs.permissions->'edit_mscore')='array' and (cs.permissions->'edit_mscore') ? cm.role::text))
    and exists(select 1 from public.balance_rooms r where r.series_id=s.series_id and r.kind='regular');
  if cutoff is null then raise exception 'forbidden' using errcode='42501'; end if;
  return private.balance_analysis_bundle(p_clan_id,cutoff,true);
end $$;
revoke all on function public.read_balance_analysis_model(uuid,uuid) from public,anon;
grant execute on function public.read_balance_analysis_model(uuid,uuid) to authenticated;
