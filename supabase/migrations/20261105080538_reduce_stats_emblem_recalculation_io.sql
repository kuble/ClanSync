-- Reduce intermediate disk writes without changing the authoritative records,
-- period semantics, advisory locking, grants, or permanent achievement history.
-- No backfill: existing summaries are already valid; future writes use these bodies.
CREATE OR REPLACE FUNCTION private.refresh_clan_stats_without_personal_emblems(p_clan uuid, p_days text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
declare v_keys text[];
begin
  if not exists(select 1 from public.clans where id=p_clan) then return; end if;
  select array_agg(distinct k) into v_keys from unnest(p_days) d,
    lateral unnest(array['all',left(d,4),left(d,7),d]) k;
  v_keys := coalesce(v_keys,array['all']);
  -- Serialize summaries for a clan. The caller locks before projecting records,
  -- so a concurrent transaction cannot publish a partially refreshed snapshot.
  insert into private.clan_stats_periods(clan_id,period,data)
  with
  keys as (select unnest(v_keys) key),
  -- Keep the reusable period rows narrow: roster JSON is only needed for appearances.
  records as not materialized (select id,clan_id,day,match_type,outcome,series_id,occurred_at,map_label,players,
    jsonb_build_object('banned_heroes',payload->'banned_heroes','hero_ban_enabled',payload->'hero_ban_enabled',
      'map_candidates',payload->'map_candidates','balance_session_map_votes',coalesce(payload->'balance_session_map_votes','[]')) payload
    from private.clan_stats_records where clan_id=p_clan),
  expanded as materialized (
    select r.id,r.day,r.match_type,r.outcome,r.series_id,r.occurred_at,r.map_label,r.payload,k.key collate "C" as key from records r,
      lateral unnest(array['all',left(r.day,4),left(r.day,7),r.day]) k(key)
    where k.key=any(v_keys)
  ),
  valid as materialized (select * from expanded where match_type='intra' and outcome in ('team1','team2','draw')),
  sessions as materialized (
    select ss.id,to_char(ss.opened_at at time zone 'Asia/Seoul','YYYY-MM-DD') as day
    from public.balance_session_series ss join public.balance_rooms room on room.series_id=ss.id
    where ss.clan_id=p_clan and room.kind='regular'
  ),
  opened as (select s.*,k.key from sessions s,
    lateral unnest(array['all',left(s.day,4),left(s.day,7),s.day]) k(key) where k.key=any(v_keys)),
  -- Last duplicate slot determines the team, first slot determines stable ties,
  -- exactly as Map(user_id, player) does in the reference implementation.
  appearances as materialized (
    select v.key,v.id,v.day,v.series_id,v.occurred_at,v.outcome,p.uid,p.team,
      (v.outcome='team'||p.team::text) win
    from valid v join private.clan_stats_records source on source.clan_id=p_clan and source.id=v.id cross join lateral (
      select (e.value->>'user_id') collate "C" as uid,
        (array_agg((e.value->>'team')::int order by e.ord desc))[1] team,min(e.ord) ord
      from jsonb_array_elements(source.players) with ordinality e(value,ord) group by (e.value->>'user_id') collate "C"
    ) p
  ),
  streak_groups as (
    select *,sum(case when win then 0 else 1 end) over(partition by key,uid order by occurred_at,id rows unbounded preceding) grp
    from appearances
  ),
  streaks as (select key,uid,max(n) longest from (
    select key,uid,grp,count(*) filter(where win) n from streak_groups group by key,uid,grp
  ) s group by key,uid),
  person_days as (
    select key,uid,day,count(*) played,count(*) filter(where win) wins,
      count(*) filter(where outcome='draw') draws,
      count(*) filter(where not win and outcome<>'draw') losses,max(occurred_at) last_played
    from appearances group by key,uid,day
  ),
  people as (
    select key,uid,sum(played) played,sum(wins) wins,sum(draws) draws,sum(losses) losses,
      count(*) days,max(last_played) last_played from person_days group by key,uid
  ),
  person_sessions as (
    select a.key,a.uid,count(distinct a.series_id) sessions
    from appearances a join opened o on o.key=a.key and o.id=a.series_id group by a.key,a.uid
  ),
  people_json as (
    select key,jsonb_agg(jsonb_build_object('userId',uid,'played',played,'wins',wins,'draws',draws,'losses',losses,
      'days',days,'sessions',coalesce(ps.sessions,0),'longest',s.longest,'lastPlayedAt',last_played) order by last_played desc,uid) value
    from people join streaks s using(key,uid) left join person_sessions ps using(key,uid) group by key
  ),
  held as (select key,count(distinct day) days from (select key,day from valid union all select key,day from opened) d group by key),
  opened_counts as (select key,count(*) n from opened group by key),
  connected_people as (select a.key,count(distinct (a.series_id,a.uid)) n from appearances a join opened o on o.key=a.key and o.id=a.series_id group by a.key),
  counts as (select key,count(*) completed,count(*) filter(where outcome='draw') draws,
    count(*) filter(where exists(select 1 from opened o where o.key=v.key and o.id=v.series_id)) connected,
    count(*) filter(where payload->>'hero_ban_enabled'='true') enabled,
    count(*) filter(where payload->>'hero_ban_enabled'='true' and coalesce(jsonb_array_length(nullif(payload->'banned_heroes','null')),0)=0) no_ban
    from valid v group by key),
  maps as (select key,jsonb_agg(jsonb_build_object('name',name,'value',n)) value from (
    select key,coalesce(map_label,'맵 미기록') name,count(*) n from valid group by key,coalesce(map_label,'맵 미기록')
  ) m group by key),
  bans as (select key,jsonb_agg(jsonb_build_object('id',hero,'value',n)) value from (
    select key,hero,count(*) n from valid v cross join lateral (
      select distinct h hero from jsonb_array_elements_text(coalesce(nullif(v.payload->'banned_heroes','null'),'[]')) h
    ) h group by key,hero
  ) b group by key),
  votes as (select key,jsonb_agg(jsonb_build_object('name',name,'value',n)) value from (
    select key,payload->'map_candidates'->>((vote->>'choice_idx')::int) name,count(*) n
    from valid cross join lateral jsonb_array_elements(coalesce(payload->'balance_session_map_votes','[]')) vote
    where nullif(payload->'map_candidates'->>((vote->>'choice_idx')::int),'') is not null group by key,name
  ) v group by key),
  predictions as (
    select k.key,p.user_id,count(*) filter(where s.match_outcome in ('team1','team2','draw') and p.pool_settlement is distinct from 'refund') valid,
      count(*) filter(where p.pool_settlement is distinct from 'refund' and
        s.match_outcome::text=case p.pick_team when 1 then 'team1' when 2 then 'team2' when 3 then 'draw' end) correct
    from public.balance_sessions s join public.balance_session_series ss on ss.id=s.series_id
    join public.balance_rooms room on room.series_id=ss.id and room.kind='regular'
    join public.balance_session_predictions p on p.session_id=s.id
    cross join lateral (select to_char(ss.opened_at at time zone 'Asia/Seoul','YYYY-MM-DD') as day) d
    cross join lateral unnest(array['all',left(d.day,4),left(d.day,7),d.day]) k(key)
    where s.clan_id=p_clan and s.match_outcome<>'pending' and k.key=any(v_keys) group by k.key,p.user_id
  ),
  predictions_json as (select key,jsonb_agg(jsonb_build_object('userId',user_id,'valid',valid,'correct',correct)) value from predictions where valid>0 group by key),
  summary as (select key,count(*) filter(where outcome in ('team1','team2','draw')) total,
    count(*) filter(where outcome in ('team1','team2','draw') and match_type='scrim') scrim,
    count(*) filter(where outcome in ('team1','team2','draw') and match_type='event') event,
    array_agg(distinct day order by day desc) filter(where match_type='intra') dates,
    array_agg(distinct map_label) filter(where match_type='intra' and map_label is not null) archive_maps
    from expanded group by key)
  select p_clan,k.key,jsonb_build_object(
    'totals',jsonb_build_object('matches',coalesce(c.completed,0),'sessions',coalesce(o.n,0),'days',coalesce(h.days,0)),
    'players',coalesce(p.value,'[]'),'predictions',coalesce(pr.value,'[]'),
    'summary',jsonb_build_object('totalMatches',coalesce(s.total,0),'intraCount',coalesce(c.completed,0),'scrimCount',coalesce(s.scrim,0),'eventCount',coalesce(s.event,0)),
    'archive',jsonb_build_object('datesKst',coalesce(s.dates,'{}'),'maps',coalesce(s.archive_maps,'{}')),
    'overview',jsonb_build_object('sessions',coalesce(o.n,0),'completed',coalesce(c.completed,0),'participants',coalesce(jsonb_array_length(p.value),0),'draws',coalesce(c.draws,0),
      'averageMatchesPerSession',round(coalesce(c.connected,0)::numeric/nullif(o.n,0),1),
      'averageParticipantsPerSession',round(coalesce(cp.n,0)::numeric/nullif(o.n,0),1),
      'maps',coalesce(m.value,'[]'),'bans',coalesce(b.value,'[]'),'mapVotes',coalesce(v.value,'[]'),
      'banEnabledMatches',coalesce(c.enabled,0),'noBanMatches',coalesce(c.no_ban,0)))
  from keys k left join counts c on c.key=k.key left join opened_counts o on o.key=k.key
  left join held h on h.key=k.key left join people_json p on p.key=k.key
  left join connected_people cp on cp.key=k.key left join maps m on m.key=k.key
  left join bans b on b.key=k.key left join votes v on v.key=k.key
  left join predictions_json pr on pr.key=k.key left join summary s on s.key=k.key
  on conflict(clan_id,period) do update set data=excluded.data
    where private.clan_stats_periods.data is distinct from excluded.data;
end;
$function$;

CREATE OR REPLACE FUNCTION private.refresh_clan_personal_emblem_milestones(p_clan_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
declare inserted_count integer; v_summary jsonb; v_candidates uuid[];
begin
  if not exists(select 1 from public.clans where id=p_clan_id) then return 0; end if;
  perform pg_advisory_xact_lock(hashtextextended('clan-stats:'||p_clan_id::text,0));
  -- The stats wrapper refreshes this snapshot under the same clan lock first.
  -- Missing snapshots retain the full-history path for repair/service calls.
  select data into v_summary from private.clan_stats_periods where clan_id=p_clan_id and period='all';
  if v_summary is not null then
    with progress as (
      select (p->>'userId')::uuid uid, f.family, f.progress
      from jsonb_array_elements(coalesce(v_summary->'players','[]')) p
      cross join lateral (values ('sessions',(p->>'sessions')::bigint),('matches',(p->>'played')::bigint),
        ('wins',(p->>'wins')::bigint),('streak',(p->>'longest')::bigint)) f(family,progress)
      union all
      select (p->>'userId')::uuid,'prediction',(p->>'correct')::bigint
      from jsonb_array_elements(coalesce(v_summary->'predictions','[]')) p
    ), thresholds(family,stage,target) as (values
      ('sessions',1,10),('sessions',2,50),('sessions',3,100),('sessions',4,300),
      ('matches',1,10),('matches',2,50),('matches',3,100),('matches',4,500),
      ('wins',1,10),('wins',2,50),('wins',3,100),('wins',4,300),
      ('streak',1,3),('streak',2,5),('streak',3,7),('streak',4,10),
      ('prediction',1,10),('prediction',2,50),('prediction',3,100),('prediction',4,300)
    )
    select array_agg(distinct p.uid) into v_candidates
    from progress p join public.users u on u.id=p.uid
    join thresholds t on t.family=p.family and p.progress>=t.target
    where not exists(select 1 from public.clan_personal_emblem_milestones m
      where m.clan_id=p_clan_id and m.user_id=p.uid and m.emblem_key='milestone-'||t.family||'-'||t.stage);
    if v_candidates is null then return 0; end if;
  end if;
  -- Reconstruct the first achievement date only for members with a new award.
  -- Existing awards remain immutable even after a correction or deletion.
  with valid as materialized (
    select r.id,r.series_id,r.occurred_at,r.outcome,p.uid,p.team,(r.outcome='team'||p.team::text) win
    from private.clan_stats_records r cross join lateral (
      select (e.value->>'user_id')::uuid uid,
        (array_agg((e.value->>'team')::integer order by e.ord desc))[1] team
      from jsonb_array_elements(r.players) with ordinality e(value,ord) group by e.value->>'user_id'
    ) p join public.users u on u.id=p.uid
    where r.clan_id=p_clan_id and r.match_type='intra' and r.outcome in ('team1','team2','draw')
      and (v_candidates is null or p.uid=any(v_candidates))
  ), groups as (
    select *,sum(case when win then 0 else 1 end) over(partition by uid order by occurred_at,id rows unbounded preceding) grp
    from valid
  ), counts as (
    select *,row_number() over(partition by uid order by occurred_at,id) appearances,
      sum(win::integer) over(partition by uid order by occurred_at,id rows unbounded preceding) wins,
      sum(win::integer) over(partition by uid,grp order by occurred_at,id rows unbounded preceding) streak
    from groups
  ), sessions as (
    select v.uid,v.series_id,min(v.occurred_at) earned_at
    from valid v join public.balance_session_series s on s.id=v.series_id and s.clan_id=p_clan_id
      join public.balance_rooms room on room.series_id=s.id and room.kind='regular'
    group by v.uid,v.series_id
  ), correct as (
    select p.user_id uid,s.id,coalesce(s.predictions_settled_at,s.closed_at,s.opened_at) earned_at
    from public.balance_sessions s join public.balance_session_series ss on ss.id=s.series_id
      join public.balance_rooms room on room.series_id=ss.id and room.kind='regular'
      join public.balance_session_predictions p on p.session_id=s.id join public.users u on u.id=p.user_id
    where s.clan_id=p_clan_id and (v_candidates is null or p.user_id=any(v_candidates)) and p.pool_settlement is distinct from 'refund'
      and s.match_outcome::text=case p.pick_team when 1 then 'team1' when 2 then 'team2' when 3 then 'draw' end
      and coalesce(s.predictions_settled_at,s.closed_at,s.opened_at) is not null
  ), events(uid,family,progress,earned_at) as (
    select uid,'matches',appearances,occurred_at from counts
    union all select uid,'wins',wins,occurred_at from counts
    union all select uid,'streak',streak,occurred_at from counts
    union all select uid,'sessions',row_number() over(partition by uid order by earned_at,series_id),earned_at from sessions
    union all select uid,'prediction',row_number() over(partition by uid order by earned_at,id),earned_at from correct
  ), thresholds(family,stage,target) as (values
    ('sessions',1,10),('sessions',2,50),('sessions',3,100),('sessions',4,300),
    ('matches',1,10),('matches',2,50),('matches',3,100),('matches',4,500),
    ('wins',1,10),('wins',2,50),('wins',3,100),('wins',4,300),
    ('streak',1,3),('streak',2,5),('streak',3,7),('streak',4,10),
    ('prediction',1,10),('prediction',2,50),('prediction',3,100),('prediction',4,300)
  )
  insert into public.clan_personal_emblem_milestones(clan_id,user_id,emblem_key,family,stage,target,earned_at)
    select p_clan_id,e.uid,'milestone-'||t.family||'-'||t.stage,t.family,t.stage,t.target,min(e.earned_at)
    from events e join thresholds t on t.family=e.family and e.progress>=t.target
    group by e.uid,t.family,t.stage,t.target on conflict do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end $function$;
