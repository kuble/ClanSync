-- Historical operators are text, not a reason to retain a deleted login account.
-- Resolve a display ID inside the record's game; never copy email/provider IDs.
create function private.capture_operator_name() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  row_data jsonb := to_jsonb(new);
  previous jsonb;
  actor uuid := nullif(row_data->>tg_argv[0],'')::uuid;
  game uuid := nullif(row_data->>'game_id','')::uuid;
  clan uuid := coalesce(nullif(row_data->>'clan_id',''),nullif(row_data->>'host_clan_id',''),nullif(row_data->>'clan_a_id',''))::uuid;
  label text;
begin
  if tg_op='UPDATE' then
    previous := to_jsonb(old);
    -- Includes ON DELETE SET NULL. A disconnected actor keeps the original label.
    if actor is null or actor is not distinct from nullif(previous->>tg_argv[0],'')::uuid then
      label := nullif(previous->>tg_argv[1],'');
    end if;
  end if;
  if label is null and actor is not null then
    if clan is null and tg_table_name='scrim_room_confirmations' then
      select clan_a_id into clan from public.scrim_rooms where id=(row_data->>'scrim_room_id')::uuid;
    end if;
    if game is null then select game_id into game from public.clans where id=clan; end if;
    select coalesce(nullif(p.battle_tag,''),nullif(p.riot_id,''),nullif(u.nickname,''),'운영자')
      into label from public.users u left join public.user_game_profiles p
        on p.user_id=u.id and p.game_id=game and p.is_verified where u.id=actor;
  end if;
  new := jsonb_populate_record(new,jsonb_build_object(tg_argv[1],left(coalesce(label,'운영자 정보 없음'),128)));
  return new;
end;
$$;
revoke all on function private.capture_operator_name() from public,anon,authenticated,service_role;

do $$ declare ref record; begin
  for ref in select * from (values
    ('clan_events','created_by','operator_name'),
    ('board_posts','created_by','operator_name'),
    ('clan_polls','created_by','operator_name'),
    ('bracket_tournaments','created_by','operator_name'),
    ('scrim_rooms','created_by','operator_name'),
    ('scrim_room_confirmations','confirmed_by','operator_name'),
    ('balance_session_series','host_user_id','operator_name'),
    ('balance_sessions','host_user_id','operator_name'),
    ('balance_room_schedules','created_by','operator_name'),
    ('balance_rooms','created_by','operator_name'),
    ('balance_rooms','delegated_to','delegate_name'),
    ('matches','created_by','operator_name')
  ) refs(tbl,actor_col,label_col) loop
    execute format('alter table public.%I add column %I text',ref.tbl,ref.label_col);
    execute format('alter table public.%I alter column %I drop not null',ref.tbl,ref.actor_col);
    execute format('alter table public.%I drop constraint %I',ref.tbl,ref.tbl||'_'||ref.actor_col||'_fkey');
    execute format('alter table public.%I add constraint %I foreign key (%I) references public.users(id) on delete set null',ref.tbl,ref.tbl||'_'||ref.actor_col||'_fkey',ref.actor_col);
    execute format('create index if not exists %I on public.%I (%I) where %I is not null',ref.tbl||'_'||ref.actor_col||'_history_idx',ref.tbl,ref.actor_col,ref.actor_col);
    execute format('create trigger %I before insert or update on public.%I for each row execute function private.capture_operator_name(%L,%L)',
      'capture_'||ref.label_col,ref.tbl,ref.actor_col,ref.label_col);
    -- Only newly added labels are populated; source records and ownership stay intact.
    execute format('update public.%I set %I=null where %I is null',ref.tbl,ref.label_col,ref.label_col);
  end loop;
end $$;

-- Enrich the indexed history at read time; corrections and revision checks remain
-- authoritative and historical sources are not copied/recreated.
create or replace function public.read_clan_stats_records(p_clan_id uuid,p_day text default null,p_user_id uuid default null,p_offset int default 0)
returns table(source text,payload jsonb) language plpgsql stable security invoker set search_path='' as $$
begin
  if p_day is not null then
    return query select r.source,r.payload||jsonb_build_object('_revision',md5(r.source||r.payload::text),
        'operator_name',coalesce(m.operator_name,s.operator_name,'운영자 정보 없음'))
      from private.clan_stats_records r
      left join public.matches m on r.source='match' and m.id=r.id and m.clan_id=r.clan_id
      left join public.balance_sessions s on r.source='balance' and s.id=r.id and s.clan_id=r.clan_id
      where r.clan_id=p_clan_id and r.day=p_day and (p_user_id is null or r.user_ids @> array[p_user_id::text])
      order by r.occurred_at desc,r.id desc limit 500 offset greatest(p_offset,0);
  elsif p_user_id is not null then
    return query select r.source,r.payload||jsonb_build_object('_revision',md5(r.source||r.payload::text),
        'operator_name',coalesce(m.operator_name,s.operator_name,'운영자 정보 없음'))
      from private.clan_stats_records r
      left join public.matches m on r.source='match' and m.id=r.id and m.clan_id=r.clan_id
      left join public.balance_sessions s on r.source='balance' and s.id=r.id and s.clan_id=r.clan_id
      where r.clan_id=p_clan_id and r.user_ids @> array[p_user_id::text]
      order by r.occurred_at desc,r.id desc limit 500 offset greatest(p_offset,0);
  end if;
end;
$$;
revoke all on function public.read_clan_stats_records(uuid,text,uuid,int) from public,anon,authenticated;
grant execute on function public.read_clan_stats_records(uuid,text,uuid,int) to service_role;
