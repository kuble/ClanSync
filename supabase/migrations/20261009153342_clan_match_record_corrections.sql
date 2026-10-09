-- Archive corrections are independent of completed rounds and coin settlement.
-- Keep the original source intact, including deleted records, for traceability.
create table private.clan_match_record_corrections (
  id uuid primary key,
  clan_id uuid not null references public.clans(id) on delete cascade,
  payload jsonb not null,
  deleted boolean not null default false,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table private.clan_match_record_corrections enable row level security;
revoke all on private.clan_match_record_corrections from public,anon,authenticated,service_role;
create index clan_match_record_corrections_clan_idx on private.clan_match_record_corrections(clan_id);

alter function private.sync_clan_stats_records(uuid[]) rename to sync_clan_stats_source_records;
create function private.sync_clan_stats_records(p_ids uuid[]) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform private.sync_clan_stats_source_records(p_ids);
  delete from private.clan_stats_records r where r.id=any(p_ids)
    and exists(select 1 from private.clan_match_record_corrections c where c.id=r.id);
  insert into private.clan_stats_records
  select c.id,c.clan_id,'match',nullif(c.payload->>'series_id','')::uuid,
    (c.payload->>'played_at')::timestamptz,(c.payload->>'occurred_at')::timestamptz,
    to_char((c.payload->>'played_at')::timestamptz at time zone 'Asia/Seoul','YYYY-MM-DD'),
    c.payload->>'match_type',c.payload->>'outcome',c.payload->>'map_label',c.payload->'match_players',
    array(select p->>'user_id' from jsonb_array_elements(c.payload->'match_players') p),c.payload
  from private.clan_match_record_corrections c where c.id=any(p_ids) and not c.deleted;
end;
$$;
revoke all on function private.sync_clan_stats_records(uuid[]) from public,anon,authenticated;

create function private.edit_clan_match_record(p_clan_id uuid,p_actor_id uuid,p_id uuid,p_operation text,p_revision text,p_record jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_role text; v_permissions jsonb; v_current private.clan_stats_records%rowtype;
  v_id uuid:=coalesce(p_id,gen_random_uuid()); v_base jsonb; v_payload jsonb; v_players jsonb;
  v_played timestamptz; v_occurred timestamptz; v_days text[]; v_pick jsonb; v_old jsonb;
begin
  if p_operation not in ('create','update','delete') or p_operation is null then raise exception 'Invalid operation'; end if;
  perform pg_advisory_xact_lock(hashtextextended('clan-stats:'||p_clan_id::text,0));
  select cm.role::text,cs.permissions into v_role,v_permissions
    from public.clan_members cm join public.clan_settings cs on cs.clan_id=cm.clan_id
    where cm.clan_id=p_clan_id and cm.user_id=p_actor_id and cm.status='active'
    for share of cm,cs;
  if v_role is null or jsonb_typeof(v_permissions)<>'object' or v_permissions is null
    or not coalesce(case when v_permissions ? 'correct_match_records' then
      jsonb_typeof(v_permissions->'correct_match_records')='array' and (v_permissions->'correct_match_records') ? v_role
      else v_role='leader' end,false)
    or not coalesce(case when v_permissions ? 'view_match_records' then
      jsonb_typeof(v_permissions->'view_match_records')='array' and (v_permissions->'view_match_records') ? v_role
      else v_role in ('leader','officer') end,false)
    then raise exception 'Record permission denied' using errcode='42501'; end if;
  select * into v_current from private.clan_stats_records where id=v_id and clan_id=p_clan_id;
  if p_operation='create' then
    if p_id is not null or exists(select 1 from private.clan_stats_records where id=v_id)
      or exists(select 1 from public.matches where id=v_id)
      or exists(select 1 from public.balance_sessions where id=v_id)
      or exists(select 1 from private.clan_match_record_corrections where id=v_id)
      then raise exception 'Invalid new record'; end if;
    v_base:='{}';
  else
    if v_current.id is null then raise exception 'Record not found' using errcode='P0002'; end if;
    if p_revision is null or md5(v_current.source||v_current.payload::text)<>p_revision
      then raise exception 'Record changed; reload before editing' using errcode='40001'; end if;
    v_base:=v_current.payload;
  end if;
  v_days:=array[v_current.day];
  if p_operation='delete' then
    insert into private.clan_match_record_corrections(id,clan_id,payload,deleted,updated_by)
      values(v_id,p_clan_id,v_base,true,p_actor_id)
      on conflict(id) do update set deleted=true,updated_by=p_actor_id,updated_at=now();
  else
    if jsonb_typeof(p_record)<>'object' or p_record is null
      or coalesce(p_record->>'outcome','') not in ('team1','team2','draw','void','unrecorded')
      or length(coalesce(p_record->>'mapLabel',''))>64
      or jsonb_typeof(p_record->'players') is distinct from 'array'
      then raise exception 'Invalid record'; end if;
    v_played:=(p_record->>'playedAt')::timestamptz;
    v_occurred:=(p_record->>'occurredAt')::timestamptz;
    if v_played is null or v_occurred is null or not isfinite(v_played) or not isfinite(v_occurred)
      or v_played<'2000-01-01'::timestamptz or v_played>='2101-01-01'::timestamptz
      or v_occurred<'2000-01-01'::timestamptz or v_occurred>='2101-01-01'::timestamptz
      then raise exception 'Invalid record date'; end if;
    if jsonb_array_length(p_record->'players') not between 2 and 10
      or exists(select 1 from jsonb_array_elements(p_record->'players') p
        where coalesce(p->>'team','') not in ('1','2') or coalesce(p->>'role','') not in ('','tank','dmg','sup'))
      or (select count(distinct p->>'userId') from jsonb_array_elements(p_record->'players') p)<>jsonb_array_length(p_record->'players')
      or exists(select 1 from jsonb_array_elements(p_record->'players') p group by p->>'team' having count(*)>5)
      or (select count(distinct p->>'team') from jsonb_array_elements(p_record->'players') p)<>2
      then raise exception 'Invalid teams'; end if;
    v_players:='[]';
    for v_pick in select * from jsonb_array_elements(p_record->'players') loop
      if not exists(select 1 from public.clan_members cm where cm.clan_id=p_clan_id
          and cm.user_id=(v_pick->>'userId')::uuid and cm.status='active')
        and not coalesce(v_current.user_ids @> array[v_pick->>'userId'],false)
        then raise exception 'Player is not a clan member' using errcode='42501'; end if;
      if v_current.source='balance' then
        v_old:=coalesce(v_base->'ma_snapshot'->(v_pick->>'userId'),'{}');
      else
        select p into v_old from jsonb_array_elements(coalesce(v_base->'match_players','[]')) p where p->>'user_id'=v_pick->>'userId';
      end if;
      v_players:=v_players||jsonb_build_array(jsonb_build_object('user_id',v_pick->>'userId',
        'team',(v_pick->>'team')::int,'role',v_pick->>'role','m',v_old->'m','a',v_old->'a'));
    end loop;
    v_payload:=jsonb_build_object('id',v_id,'status','finished','match_type',coalesce(v_current.match_type,'intra'),
      'played_at',v_played,'occurred_at',v_occurred,'map_label',nullif(trim(p_record->>'mapLabel'),''),
      'outcome',p_record->>'outcome','series_id',v_current.series_id,'match_players',v_players,
      'match_results',case when p_record->>'outcome'='unrecorded' then null else jsonb_build_object('winner_team',
        case p_record->>'outcome' when 'team1' then 1 when 'team2' then 2 else null end) end,
      'banned_heroes',v_base->'banned_heroes','hero_ban_enabled',v_base->'hero_ban_enabled',
      'map_candidates',v_base->'map_candidates','balance_session_map_votes',coalesce(nullif(v_base->'balance_session_map_votes','null'),'[]'));
    insert into private.clan_match_record_corrections(id,clan_id,payload,updated_by)
      values(v_id,p_clan_id,v_payload,p_actor_id)
      on conflict(id) do update set payload=excluded.payload,deleted=false,updated_by=p_actor_id,updated_at=now();
    v_days:=v_days||to_char(v_played at time zone 'Asia/Seoul','YYYY-MM-DD');
  end if;
  perform private.sync_clan_stats_records(array[v_id]);
  insert into private.clan_stats_refresh_queue as q(transaction_id,clan_id,days,full_refresh)
    values(txid_current(),p_clan_id,array_remove(v_days,null),true)
    on conflict(transaction_id,clan_id) do update set days=q.days||excluded.days,full_refresh=true;
  return v_id;
end;
$$;
revoke all on function private.edit_clan_match_record(uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
create function public.edit_clan_match_record(p_clan_id uuid,p_actor_id uuid,p_id uuid,p_operation text,p_revision text,p_record jsonb)
returns uuid language sql security invoker set search_path='' as $$
  select private.edit_clan_match_record(p_clan_id,p_actor_id,p_id,p_operation,p_revision,p_record);
$$;
revoke all on function public.edit_clan_match_record(uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function private.edit_clan_match_record(uuid,uuid,uuid,text,text,jsonb),public.edit_clan_match_record(uuid,uuid,uuid,text,text,jsonb) to service_role;

-- A revision covers all source fields, not just the last correction timestamp.
create or replace function public.read_clan_stats_records(p_clan_id uuid,p_day text default null,p_user_id uuid default null,p_offset int default 0)
returns table(source text,payload jsonb) language plpgsql stable security invoker set search_path='' as $$
begin
  if p_day is not null then
    return query select r.source,r.payload||jsonb_build_object('_revision',md5(r.source||r.payload::text)) from private.clan_stats_records r
      where r.clan_id=p_clan_id and r.day=p_day and (p_user_id is null or r.user_ids @> array[p_user_id::text])
      order by r.occurred_at desc,r.id desc limit 500 offset greatest(p_offset,0);
  elsif p_user_id is not null then
    return query select r.source,r.payload||jsonb_build_object('_revision',md5(r.source||r.payload::text)) from private.clan_stats_records r
      where r.clan_id=p_clan_id and r.user_ids @> array[p_user_id::text]
      order by r.occurred_at desc,r.id desc limit 500 offset greatest(p_offset,0);
  end if;
end;
$$;
