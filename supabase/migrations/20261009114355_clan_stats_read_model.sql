-- Server-only read model. A request never downloads the clan's match history to
-- calculate its overview. Corrections and deletes refresh it in the writer's
-- transaction; no TTL, cron job, or privileged browser endpoint is involved.
create table private.clan_stats_records (
  id uuid primary key,
  clan_id uuid not null references public.clans(id) on delete cascade,
  source text not null,
  series_id uuid,
  played_at timestamptz not null,
  occurred_at timestamptz not null,
  day text not null,
  match_type text not null,
  outcome text not null,
  map_label text,
  players jsonb not null,
  user_ids text[] not null,
  payload jsonb not null
);
create index clan_stats_records_day_idx on private.clan_stats_records(clan_id, day, occurred_at desc, id desc);
create index clan_stats_records_users_idx on private.clan_stats_records using gin(user_ids);
alter table private.clan_stats_records enable row level security;
revoke all on private.clan_stats_records from public, anon, authenticated;
grant select on private.clan_stats_records to service_role;

create table private.clan_stats_periods (
  clan_id uuid not null references public.clans(id) on delete cascade,
  period text not null,
  data jsonb not null,
  primary key(clan_id, period)
);
alter table private.clan_stats_periods enable row level security;
revoke all on private.clan_stats_periods from public, anon, authenticated;
grant select on private.clan_stats_periods to service_role;

-- Keep only the canonical source. An explicit match (even a draft) masks a
-- balance round with the same id, matching normalizeClanMatchRecords.
create function private.sync_clan_stats_records(p_ids uuid[]) returns void
language sql security definer set search_path = '' as $$
  delete from private.clan_stats_records where id = any(p_ids);
  insert into private.clan_stats_records
  select m.id, m.clan_id, 'match', null, m.played_at, m.played_at,
    to_char(m.played_at at time zone 'Asia/Seoul', 'YYYY-MM-DD'), m.match_type::text,
    case when res.match_id is null then 'unrecorded' when res.winner_team=1 then 'team1'
      when res.winner_team=2 then 'team2' else 'draw' end,
    m.map_label, coalesce(p.players,'[]'), coalesce(p.ids,'{}'),
    jsonb_build_object('id',m.id,'played_at',m.played_at,'status',m.status,
      'match_type',m.match_type,'map_label',m.map_label,'match_players',coalesce(p.players,'[]'),
      'match_results',case when res.match_id is null then null else jsonb_build_object('winner_team',res.winner_team) end)
  from public.matches m left join public.match_results res on res.match_id=m.id
  left join lateral (
    select jsonb_agg(jsonb_build_object('user_id',user_id,'team',team) order by mp.id) players,
      array_agg(user_id::text order by mp.id) ids
    from public.match_players mp where mp.match_id=m.id
  ) p on true where m.id=any(p_ids) and m.status='finished'
  union all
  select s.id,s.clan_id,'balance',s.series_id,ss.opened_at,
    coalesce(s.predictions_settled_at,s.closed_at,s.opened_at),
    to_char(ss.opened_at at time zone 'Asia/Seoul','YYYY-MM-DD'),'intra',s.match_outcome::text,
    s.resolved_map_label,coalesce(p.players,'[]'),coalesce(p.ids,'{}'),
    jsonb_build_object('id',s.id,'series_id',s.series_id,'opened_at',s.opened_at,'closed_at',s.closed_at,
      'predictions_settled_at',s.predictions_settled_at,'resolved_map_label',s.resolved_map_label,
      'roster',s.roster,'ma_snapshot',s.ma_snapshot,'match_outcome',s.match_outcome,
      'banned_heroes',s.banned_heroes,'hero_ban_enabled',s.hero_ban_enabled,'map_candidates',s.map_candidates,
      'balance_session_series',jsonb_build_object('opened_at',ss.opened_at),
      'balance_session_map_votes',(select coalesce(jsonb_agg(jsonb_build_object('choice_idx',v.choice_idx)),'[]') from public.balance_session_map_votes v where v.session_id=s.id))
  from public.balance_sessions s join public.balance_session_series ss on ss.id=s.series_id
  join public.balance_rooms room on room.series_id=ss.id and room.kind='regular'
  left join lateral (
    select jsonb_agg(jsonb_build_object('user_id',slot.uid,'team',slot.team) order by slot.ord) players,
      array_agg(slot.uid order by slot.ord) ids
    from (values
      (s.roster#>>'{team1,tank}',1,1),(s.roster#>>'{team1,dmg,0}',1,2),(s.roster#>>'{team1,dmg,1}',1,3),
      (s.roster#>>'{team1,sup,0}',1,4),(s.roster#>>'{team1,sup,1}',1,5),
      (s.roster#>>'{team2,tank}',2,6),(s.roster#>>'{team2,dmg,0}',2,7),(s.roster#>>'{team2,dmg,1}',2,8),
      (s.roster#>>'{team2,sup,0}',2,9),(s.roster#>>'{team2,sup,1}',2,10)
    ) slot(uid,team,ord) where nullif(slot.uid,'') is not null
  ) p on true
  where s.id=any(p_ids) and s.match_outcome<>'pending'
    and not exists(select 1 from public.matches m where m.id=s.id and m.clan_id=s.clan_id);
$$;

create function private.refresh_clan_stats(p_clan uuid, p_days text[]) returns void
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
  records as materialized (select * from private.clan_stats_records where clan_id=p_clan),
  expanded as materialized (
    select r.*,k.key from records r,
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
    select v.key,v.id,v.day,v.series_id,v.occurred_at,v.outcome,p.uid,p.team,p.ord,
      (v.outcome='team'||p.team::text) win
    from valid v cross join lateral (
      select e.value->>'user_id' uid,
        (array_agg((e.value->>'team')::int order by e.ord desc))[1] team,min(e.ord) ord
      from jsonb_array_elements(v.players) with ordinality e(value,ord) group by e.value->>'user_id'
    ) p
  ),
  streak_groups as (
    select *,sum(case when win then 0 else 1 end) over(partition by key,uid order by occurred_at,id rows unbounded preceding) grp
    from appearances
  ),
  streaks as (select key,uid,max(n) longest from (
    select key,uid,grp,count(*) filter(where win) n from streak_groups group by key,uid,grp
  ) s group by key,uid),
  people as (
    select a.key,a.uid,count(*) played,count(*) filter(where a.win) wins,
      count(*) filter(where a.outcome='draw') draws,
      count(*) filter(where not a.win and a.outcome<>'draw') losses,
      count(distinct a.day) days,max(a.occurred_at) last_played,
      (array_agg(a.id order by a.occurred_at desc,a.id desc))[1] last_id,
      (array_agg(a.ord order by a.occurred_at desc,a.id desc))[1] first_slot,
      max(s.longest) longest
    from appearances a join streaks s using(key,uid) group by a.key,a.uid
  ),
  people_json as (
    select key,jsonb_agg(jsonb_build_object('userId',uid,'played',played,'wins',wins,'draws',draws,'losses',losses,
      'days',days,'longest',longest,'lastPlayedAt',last_played) order by last_played desc,last_id desc,first_slot) value
    from people group by key
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

-- Statement triggers batch bulk imports and cascades. Never refresh statistics
-- for ordinary edits of a pending round (roster dragging, timer ticks, etc.).
create function private.clan_stats_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_rows jsonb; v_ids uuid[]; v_clans uuid[]; v_days text[]; v_clan uuid;
begin
  if TG_OP='INSERT' then select jsonb_agg(to_jsonb(n)) into v_rows from new_rows n;
  elsif TG_OP='DELETE' then select jsonb_agg(to_jsonb(o)) into v_rows from old_rows o;
  else select jsonb_agg(r) into v_rows from (select to_jsonb(n) r from new_rows n union all select to_jsonb(o) from old_rows o) t; end if;
  if v_rows is null then return null; end if;
  if TG_TABLE_NAME in ('matches','balance_sessions') then
    select array_agg(distinct (r->>'id')::uuid) into v_ids from jsonb_array_elements(v_rows) r
    where TG_TABLE_NAME='matches' or r->>'match_outcome'<>'pending';
  elsif TG_TABLE_NAME in ('match_players','match_results') then
    select array_agg(distinct (r->>'match_id')::uuid) into v_ids from jsonb_array_elements(v_rows) r;
  elsif TG_TABLE_NAME in ('balance_session_map_votes','balance_session_predictions') then
    select array_agg(distinct s.id) into v_ids from jsonb_array_elements(v_rows) r
      join public.balance_sessions s on s.id=(r->>'session_id')::uuid where s.match_outcome<>'pending';
  else
    select array_agg(distinct s.id) into v_ids from public.balance_sessions s
    join public.balance_session_series ss on ss.id=s.series_id
    where s.match_outcome<>'pending' and exists(select 1 from jsonb_array_elements(v_rows) r
      where (TG_TABLE_NAME='balance_session_series' and ss.id=(r->>'id')::uuid)
        or (TG_TABLE_NAME='balance_rooms' and ss.id=(r->>'series_id')::uuid));
  end if;
  select array_agg(distinct clan_id) into v_clans from (
    select clan_id from private.clan_stats_records where id=any(v_ids)
    union select clan_id from public.matches where id=any(v_ids)
    union select clan_id from public.balance_sessions where id=any(v_ids)
    union select (r->>'clan_id')::uuid from jsonb_array_elements(v_rows) r
      where TG_TABLE_NAME in ('balance_session_series','balance_rooms')
  ) c where clan_id is not null;
  if v_clans is null then return null; end if;
  -- Lock before both projection and aggregate reads. Subsequent statements see
  -- committed concurrent changes under READ COMMITTED; lock order is stable.
  for v_clan in select unnest(v_clans) order by 1 loop
    perform pg_advisory_xact_lock(hashtextextended('clan-stats:'||v_clan::text,0));
  end loop;
  select array_agg(distinct day) into v_days from private.clan_stats_records where id=any(v_ids);
  if v_ids is not null then perform private.sync_clan_stats_records(v_ids); end if;
  select coalesce(v_days,'{}')||coalesce(array_agg(distinct day),'{}') into v_days from private.clan_stats_records where id=any(v_ids);
  if TG_TABLE_NAME='balance_session_series' then
    select v_days||coalesce(array_agg(to_char((r->>'opened_at')::timestamptz at time zone 'Asia/Seoul','YYYY-MM-DD')),'{}') into v_days from jsonb_array_elements(v_rows) r;
  elsif TG_TABLE_NAME='balance_rooms' then
    select v_days||coalesce(array_agg(to_char(ss.opened_at at time zone 'Asia/Seoul','YYYY-MM-DD')),'{}') into v_days
      from public.balance_session_series ss where exists(select 1 from jsonb_array_elements(v_rows) r where ss.id=(r->>'series_id')::uuid);
  end if;
  foreach v_clan in array v_clans loop perform private.refresh_clan_stats(v_clan,v_days); end loop;
  return null;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['matches','match_players','match_results','balance_sessions','balance_session_series','balance_rooms','balance_session_map_votes','balance_session_predictions'] loop
    execute format('create trigger clan_stats_insert after insert on public.%I referencing new table as new_rows for each statement execute function private.clan_stats_changed()',t);
    execute format('create trigger clan_stats_update after update on public.%I referencing old table as old_rows new table as new_rows for each statement execute function private.clan_stats_changed()',t);
    execute format('create trigger clan_stats_delete after delete on public.%I referencing old table as old_rows for each statement execute function private.clan_stats_changed()',t);
  end loop;
end $$;

-- The application verifies fresh membership and field-level permissions before
-- using these service-only functions. No authenticated/anonymous grants.
create function public.read_clan_stats_summary(p_clan_id uuid, p_periods text[])
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('periods',coalesce((select jsonb_object_agg(period,data) from private.clan_stats_periods
      where clan_id=p_clan_id and period=any(p_periods)),'{}'),
    'directory',coalesce((select jsonb_object_agg(period,jsonb_build_object(
      'sessions',data#>'{overview,sessions}','completed',data#>'{overview,completed}','participants',data#>'{overview,participants}'))
      from private.clan_stats_periods where clan_id=p_clan_id
        and (period='all' or (data#>>'{totals,days}')::int>0)),'{}'));
$$;
create function public.read_clan_stats_records(p_clan_id uuid, p_day text default null, p_user_id uuid default null, p_offset int default 0)
returns table(source text,payload jsonb) language sql stable security invoker set search_path='' as $$
  select source,payload from private.clan_stats_records
  where clan_id=p_clan_id and (p_day is not null or p_user_id is not null)
    and (p_day is null or day=p_day) and (p_user_id is null or user_ids @> array[p_user_id::text])
  order by occurred_at desc,id desc limit 500 offset greatest(p_offset,0);
$$;
revoke all on function private.sync_clan_stats_records(uuid[]),private.refresh_clan_stats(uuid,text[]),private.clan_stats_changed() from public,anon,authenticated;
revoke all on function public.read_clan_stats_summary(uuid,text[]),public.read_clan_stats_records(uuid,text,uuid,int) from public,anon,authenticated;
grant execute on function public.read_clan_stats_summary(uuid,text[]),public.read_clan_stats_records(uuid,text,uuid,int) to service_role;

-- Backfill existing records once, without modifying or reseeding source data.
do $$ declare c record; ids uuid[]; days text[]; begin
  for c in select id from public.clans loop
    perform pg_advisory_xact_lock(hashtextextended('clan-stats:'||c.id::text,0));
    select array_agg(id) into ids from (select id from public.matches where clan_id=c.id
      union select id from public.balance_sessions where clan_id=c.id and match_outcome<>'pending') r;
    if ids is not null then perform private.sync_clan_stats_records(ids); end if;
    select array_agg(distinct day) into days from (
      select day from private.clan_stats_records where clan_id=c.id
      union select to_char(opened_at at time zone 'Asia/Seoul','YYYY-MM-DD') from public.balance_session_series where clan_id=c.id
    ) d;
    perform private.refresh_clan_stats(c.id,days);
  end loop;
end $$;
