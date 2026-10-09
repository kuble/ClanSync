-- A result settlement can update a round, predictions and its series together.
-- Project each change immediately, then rebuild affected summaries only once
-- per clan at commit. The queue and summaries commit/roll back with the result.
create table private.clan_stats_refresh_queue (
  transaction_id bigint not null,
  clan_id uuid not null references public.clans(id) on delete cascade,
  days text[] not null,
  full_refresh boolean not null,
  primary key(transaction_id,clan_id)
);
alter table private.clan_stats_refresh_queue enable row level security;
revoke all on private.clan_stats_refresh_queue from public,anon,authenticated;

create function private.flush_clan_stats() returns trigger
language plpgsql security definer set search_path='' set plan_cache_mode='force_custom_plan' as $$
declare q private.clan_stats_refresh_queue%rowtype;
begin
  delete from private.clan_stats_refresh_queue
    where transaction_id=new.transaction_id and clan_id=new.clan_id returning * into q;
  -- Subsequent deferred events for the same transaction find an empty queue.
  if not found or not exists(select 1 from public.clans where id=q.clan_id) then return null; end if;
  if q.full_refresh or not exists(select 1 from private.clan_stats_periods where clan_id=q.clan_id and period='all') then
    perform private.refresh_clan_stats(q.clan_id,q.days);
  else
    update private.clan_stats_periods set data=jsonb_set(data,'{archive}',(
      select jsonb_build_object('datesKst',coalesce(array_agg(distinct day order by day desc),'{}'),
        'maps',coalesce(array_agg(distinct map_label) filter(where map_label is not null),'{}'))
      from private.clan_stats_records where clan_id=q.clan_id and match_type='intra'
    )) where clan_id=q.clan_id and period='all';
  end if;
  return null;
end;
$$;
revoke all on function private.flush_clan_stats() from public,anon,authenticated;
create constraint trigger clan_stats_flush after insert or update on private.clan_stats_refresh_queue
  deferrable initially deferred for each row execute function private.flush_clan_stats();

create or replace function private.clan_stats_changed() returns trigger
language plpgsql security definer set search_path = '' set plan_cache_mode='force_custom_plan' as $$
declare v_rows jsonb; v_ids uuid[]; v_clans uuid[]; v_days text[]; v_clan uuid; v_counted boolean;
begin
  if TG_OP='INSERT' then select jsonb_agg(to_jsonb(n)) into v_rows from new_rows n;
  elsif TG_OP='DELETE' then select jsonb_agg(to_jsonb(o)) into v_rows from old_rows o;
  else select jsonb_agg(r) into v_rows from (select to_jsonb(n) r from new_rows n union all select to_jsonb(o) from old_rows o) t; end if;
  if v_rows is null then return null; end if;
  if TG_TABLE_NAME in ('matches','balance_sessions') then
    select array_agg(distinct (r->>'id')::uuid) into v_ids from jsonb_array_elements(v_rows) r
    where TG_TABLE_NAME='matches' or r->>'match_outcome'<>'pending';
  elsif TG_TABLE_NAME in ('match_players','match_results') then
    -- FK cascades fire child statement triggers once per deleted parent. The
    -- parent's trigger handles these ids together after its statement finishes.
    select array_agg(distinct (r->>'match_id')::uuid) into v_ids from jsonb_array_elements(v_rows) r
      where exists(select 1 from public.matches m where m.id=(r->>'match_id')::uuid);
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
  select exists(select 1 from private.clan_stats_records where id=any(v_ids) and outcome in ('team1','team2','draw')) into v_counted;
  if v_ids is not null then perform private.sync_clan_stats_records(v_ids); end if;
  v_counted := v_counted or exists(select 1 from private.clan_stats_records where id=any(v_ids) and outcome in ('team1','team2','draw'));
  select coalesce(v_days,'{}')||coalesce(array_agg(distinct day),'{}') into v_days from private.clan_stats_records where id=any(v_ids);
  -- Predictions keep their parent-session date even when an explicit match
  -- replaces the round or is moved to another date. Invalidate both dates.
  select coalesce(v_days,'{}')||coalesce(array_agg(to_char(ss.opened_at at time zone 'Asia/Seoul','YYYY-MM-DD')),'{}') into v_days
    from public.balance_session_series ss where exists (select 1 from public.balance_sessions s where s.series_id=ss.id and s.id=any(v_ids))
      or (TG_TABLE_NAME='balance_sessions' and exists(select 1 from jsonb_array_elements(v_rows) r where (r->>'series_id')::uuid=ss.id));
  if TG_TABLE_NAME='balance_session_series' then
    select v_days||coalesce(array_agg(to_char((r->>'opened_at')::timestamptz at time zone 'Asia/Seoul','YYYY-MM-DD')),'{}') into v_days from jsonb_array_elements(v_rows) r;
  elsif TG_TABLE_NAME='balance_rooms' then
    select v_days||coalesce(array_agg(to_char(ss.opened_at at time zone 'Asia/Seoul','YYYY-MM-DD')),'{}') into v_days
      from public.balance_session_series ss where exists(select 1 from jsonb_array_elements(v_rows) r where ss.id=(r->>'series_id')::uuid);
  end if;
  foreach v_clan in array v_clans loop
    if exists(select 1 from public.clans where id=v_clan) then
      insert into private.clan_stats_refresh_queue as q(transaction_id,clan_id,days,full_refresh)
      values(txid_current(),v_clan,coalesce(v_days,'{}'),v_counted or TG_TABLE_NAME not in ('matches','match_players','match_results'))
      on conflict(transaction_id,clan_id) do update
        set days=array(select distinct unnest(q.days||excluded.days)), full_refresh=q.full_refresh or excluded.full_refresh;
    end if;
  end loop;
  return null;
end;
$$;
