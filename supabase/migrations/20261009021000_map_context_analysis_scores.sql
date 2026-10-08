-- Version 1: draw=half a win; ten prior games at each hierarchy level.
-- Aggregate only finalized regular games before this round; never use M scores.
create function private.balance_analysis_context(p_clan_id uuid, p_before timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
 with observations as materialized (
   select slot.user_id, slot.role, s.resolved_map_label as map,
     case when s.match_outcome='draw' then 0.5 when s.match_outcome::text=slot.team then 1.0 else 0.0 end as earned
   from public.balance_sessions s
   cross join lateral (values
     (s.roster#>>'{team1,tank}','tank','team1'), (s.roster#>>'{team1,dmg,0}','dmg','team1'),
     (s.roster#>>'{team1,dmg,1}','dmg','team1'), (s.roster#>>'{team1,sup,0}','sup','team1'),
     (s.roster#>>'{team1,sup,1}','sup','team1'), (s.roster#>>'{team2,tank}','tank','team2'),
     (s.roster#>>'{team2,dmg,0}','dmg','team2'), (s.roster#>>'{team2,dmg,1}','dmg','team2'),
     (s.roster#>>'{team2,sup,0}','sup','team2'), (s.roster#>>'{team2,sup,1}','sup','team2')
   ) slot(user_id,role,team)
   where s.clan_id=p_clan_id and s.opened_at<p_before and slot.user_id is not null
     and s.match_outcome in ('team1','team2','draw')
     and exists(select 1 from public.balance_rooms r where r.series_id=s.series_id and r.kind='regular')
     and not exists(select 1 from public.matches m where m.id=s.id)
   union all
   select mp.user_id::text, null::text, m.map_label,
     case when mr.winner_team is null then 0.5 when mr.winner_team=mp.team then 1.0 else 0.0 end
   from public.matches m join public.match_players mp on mp.match_id=m.id
   join public.match_results mr on mr.match_id=m.id
   where m.clan_id=p_clan_id and m.played_at<p_before and m.status='finished' and m.match_type='intra'
 ), overall as (
   select user_id, count(*) as games, (sum(earned)+5)/(count(*)+10) as rate
   from observations group by user_id
 ), roles as (
   select o.user_id,o.role,count(*) as games,(sum(o.earned)+10*b.rate)/(count(*)+10) as rate
   from observations o join overall b using(user_id) where o.role is not null group by o.user_id,o.role,b.rate
 ), maps as (
   select o.user_id,o.map,count(*) as games,(sum(o.earned)+10*b.rate)/(count(*)+10) as rate
   from observations o join overall b using(user_id) where o.map is not null group by o.user_id,o.map,b.rate
 ), role_maps as (
   select o.user_id,o.role,o.map,count(*) as games,(sum(o.earned)+10*r.rate)/(count(*)+10) as rate
   from observations o join roles r using(user_id,role) where o.map is not null group by o.user_id,o.role,o.map,r.rate
 ), contexts as (
   select user_id,null::text as role,null::text as map,games,rate from overall
   union all select user_id,role,null::text,games,rate from roles
   union all select user_id,null::text,map,games,rate from maps
   union all select user_id,role,map,games,rate from role_maps
 ) select coalesce(jsonb_agg(jsonb_build_object('userId',user_id,'role',role,'map',map,
   'games',games,'score',round((rate-0.5)*20,2)) order by user_id,role,map),'[]'::jsonb) from contexts;
$$;
revoke all on function private.balance_analysis_context(uuid,timestamptz) from public,anon,authenticated;

create function private.balance_analysis_value(p_context jsonb,p_user text,p_role text,p_map text)
returns numeric language sql immutable set search_path='' as $$
 select (entry->>'score')::numeric from jsonb_array_elements(p_context) entry
 where entry->>'userId'=p_user and (entry->>'role' is null or entry->>'role'=p_role)
   and (entry->>'map' is null or entry->>'map'=p_map)
 order by (entry->>'map' is not null) desc, (entry->>'role' is not null) desc limit 1;
$$;
revoke all on function private.balance_analysis_value(jsonb,text,text,text) from public,anon,authenticated;

-- Only the existing staff/score-edit audience may receive the compact model.
create function public.read_balance_analysis_context(p_round_id uuid,p_clan_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.balance_sessions; member_role text; permissions jsonb; allowed jsonb;
begin
 select * into s from public.balance_sessions where id=p_round_id and clan_id=p_clan_id;
 if not found or auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 select cm.role::text,cs.permissions into member_role,permissions
 from public.clan_members cm join public.clan_settings cs on cs.clan_id=cm.clan_id
 where cm.clan_id=p_clan_id and cm.user_id=auth.uid() and cm.status='active';
 allowed := case when permissions ? 'edit_mscore' then permissions->'edit_mscore' else '["leader","officer"]'::jsonb end;
 if member_role is null or not (member_role in ('leader','officer') or (jsonb_typeof(allowed)='array' and allowed ? member_role))
   or not exists(select 1 from public.balance_rooms r where r.series_id=s.series_id and r.kind='regular')
   or not exists(select 1 from public.clans c where c.id=p_clan_id and c.subscription_tier='premium')
 then raise exception 'forbidden' using errcode='42501'; end if;
 return private.balance_analysis_context(p_clan_id,s.opened_at);
end $$;
revoke all on function public.read_balance_analysis_context(uuid,uuid) from public,anon;
grant execute on function public.read_balance_analysis_context(uuid,uuid) to authenticated;

-- Recompute as roster/map context changes and freeze a trusted snapshot at start.
create function private.refresh_balance_analysis() returns trigger
language plpgsql security definer set search_path='' as $$
declare context jsonb; snapshot jsonb := '{}'::jsonb; slot record; premium boolean;
begin
 if new.roster is not distinct from old.roster and new.resolved_map_label is not distinct from old.resolved_map_label
   and not (new.phase='match_live' and old.phase<>'match_live') then return new; end if;
 if old.closed_at is not null or old.match_outcome<>'pending' then return new; end if;
 premium := exists(select 1 from public.clans c where c.id=new.clan_id and c.subscription_tier='premium')
   and exists(select 1 from public.balance_rooms r where r.series_id=new.series_id and r.kind='regular');
 context := case when premium then private.balance_analysis_context(new.clan_id,new.opened_at) else '[]'::jsonb end;
 for slot in select * from (values
   (new.roster#>>'{team1,tank}','tank'),(new.roster#>>'{team1,dmg,0}','dmg'),(new.roster#>>'{team1,dmg,1}','dmg'),
   (new.roster#>>'{team1,sup,0}','sup'),(new.roster#>>'{team1,sup,1}','sup'),(new.roster#>>'{team2,tank}','tank'),
   (new.roster#>>'{team2,dmg,0}','dmg'),(new.roster#>>'{team2,dmg,1}','dmg'),
   (new.roster#>>'{team2,sup,0}','sup'),(new.roster#>>'{team2,sup,1}','sup')
 ) players(user_id,role) where user_id is not null loop
   snapshot := snapshot || jsonb_build_object(slot.user_id,jsonb_build_object(
     'm',coalesce(new.ma_snapshot->slot.user_id->'m',
       (select prior.ma_snapshot->slot.user_id->'m' from public.balance_sessions prior
        where prior.clan_id=new.clan_id and prior.opened_at<new.opened_at and prior.ma_snapshot ? slot.user_id
          and exists(select 1 from public.balance_rooms r where r.series_id=prior.series_id and r.kind='regular')
        order by prior.opened_at desc,prior.id desc limit 1),'0'::jsonb),
     'a',private.balance_analysis_value(context,slot.user_id,slot.role,new.resolved_map_label)));
 end loop;
 new.ma_snapshot := snapshot;
 return new;
end $$;
revoke all on function private.refresh_balance_analysis() from public,anon,authenticated;
create trigger guard_balance_02_analysis before update on public.balance_sessions
for each row execute function private.refresh_balance_analysis();

-- Preserve A server-side even when a caller submits a forged analysis value.
do $$
declare definition text;
begin
 definition := pg_get_functiondef('public.set_balance_scores(uuid,uuid,jsonb)'::regprocedure);
 definition := replace(definition,
   ' update public.balance_sessions set ma_snapshot=p_snapshot where id=p_round_id;',
   $replacement$ select coalesce(jsonb_object_agg(e.key,e.value || jsonb_build_object('a',coalesce(s.ma_snapshot->e.key->'a','null'::jsonb))),'{}'::jsonb)
   into p_snapshot from jsonb_each(p_snapshot) e;
 update public.balance_sessions set ma_snapshot=p_snapshot where id=p_round_id;$replacement$);
 execute definition;
end $$;
