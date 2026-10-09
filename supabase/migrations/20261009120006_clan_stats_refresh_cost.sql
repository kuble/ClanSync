create or replace function private.refresh_clan_stats(p_clan uuid, p_days text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare v_keys text[];
begin
  if not exists(select 1 from public.clans where id=p_clan) then return; end if;
  select array_agg(distinct k) into v_keys from unnest(p_days) d,
    lateral unnest(array['all',left(d,4),left(d,7),d]) k;
  v_keys := coalesce(v_keys,array['all']);
  -- Serialize summaries for a clan. The caller locks before projecting records,
  -- so a concurrent transaction cannot publish a partially refreshed snapshot.
  delete from private.clan_stats_periods where clan_id=p_clan and period=any(v_keys);
  insert into private.clan_stats_periods(clan_id,period,data)
  with
  keys as (select unnest(v_keys) key),
  records as materialized (select id,clan_id,day,match_type,outcome,series_id,occurred_at,map_label,players,
    jsonb_build_object('banned_heroes',payload->'banned_heroes','hero_ban_enabled',payload->'hero_ban_enabled',
      'map_candidates',payload->'map_candidates','balance_session_map_votes',coalesce(payload->'balance_session_map_votes','[]')) payload
    from private.clan_stats_records where clan_id=p_clan),
  expanded as materialized (
    select r.*,k.key collate "C" as key from records r,
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
    from valid v cross join lateral (
      select (e.value->>'user_id') collate "C" as uid,
        (array_agg((e.value->>'team')::int order by e.ord desc))[1] team,min(e.ord) ord
      from jsonb_array_elements(v.players) with ordinality e(value,ord) group by (e.value->>'user_id') collate "C"
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
  people_json as (
    select key,jsonb_agg(jsonb_build_object('userId',uid,'played',played,'wins',wins,'draws',draws,'losses',losses,
      'days',days,'longest',s.longest,'lastPlayedAt',last_played) order by last_played desc,uid) value
    from people join streaks s using(key,uid) group by key
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
  left join predictions_json pr on pr.key=k.key left join summary s on s.key=k.key;
end;
$$;
