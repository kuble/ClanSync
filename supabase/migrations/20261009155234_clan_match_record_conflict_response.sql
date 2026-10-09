-- Return a real HTTP conflict. 40001 causes PostgREST 14 to retry forever.
-- A client-generated creation id also prevents duplicate records after a lost response.
create or replace function private.edit_clan_match_record(p_clan_id uuid,p_actor_id uuid,p_id uuid,p_operation text,p_revision text,p_record jsonb)
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
    if exists(select 1 from private.clan_stats_records where id=v_id)
      or exists(select 1 from public.matches where id=v_id)
      or exists(select 1 from public.balance_sessions where id=v_id)
      or exists(select 1 from private.clan_match_record_corrections where id=v_id)
      then raise exception 'Record already exists' using errcode='PT409'; end if;
    v_base:='{}';
  else
    if v_current.id is null then raise exception 'Record not found' using errcode='P0002'; end if;
    if p_revision is null or md5(v_current.source||v_current.payload::text)<>p_revision
      then raise exception 'Record changed; reload before editing' using errcode='PT409'; end if;
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
