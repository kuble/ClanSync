-- Live labels use the verified profile for this game, never the account nickname cache.
create function private.game_player_name(p_user uuid, p_game uuid) returns text
language sql stable set search_path='' as $$
  select case when g.slug='overwatch' then
    case when coalesce(nullif(p.battle_tag,''),p.game_uid) ~ '^[^#[:space:]]{2,20}#[0-9]{4,10}$'
      then coalesce(nullif(p.battle_tag,''),p.game_uid) end
    when g.slug in ('valorant','lol') then nullif(btrim(p.riot_id),'') end
  from public.user_game_profiles p join public.games g on g.id=p.game_id
  where p.user_id=p_user and p.game_id=p_game and p.is_verified;
$$;
revoke all on function private.game_player_name(uuid,uuid) from public,anon,authenticated;

create or replace function private.participant_label(p_clan uuid,p_id uuid) returns text
language sql stable set search_path='' as $$
  select case when not p.is_guest then coalesce(private.game_player_name(p.user_id,c.game_id),'게임 ID 미등록')
    else p.nickname || case when p.alias is not null then ' · '||p.alias
      when exists(select 1 from public.clan_participants q where q.clan_id=p.clan_id
        and q.id<>p.id and q.is_guest and q.alias is null and lower(q.nickname)=lower(p.nickname))
        then ' · '||left(p.id::text,6) else '' end end
  from public.clan_participants p join public.clans c on c.id=p.clan_id
  where p.clan_id=p_clan and p.id=p_id;
$$;

create or replace function public.clan_peer_nicknames(p_clan_id uuid)
returns table(user_id uuid,nickname varchar) language sql stable security definer set search_path='' as $$
  select distinct on (coalesce(p.user_id,p.id)) coalesce(p.user_id,p.id),
    (case when p.is_guest and p.user_id is not null
      then coalesce(private.game_player_name(p.user_id,c.game_id),'게임 ID 미등록')
      else private.participant_label(p.clan_id,p.id) end)::varchar
  from public.clan_participants p join public.clans c on c.id=p.clan_id
  where p.clan_id=p_clan_id and public.is_active_clan_member(p_clan_id)
  order by coalesce(p.user_id,p.id),p.is_guest,p.created_at;
$$;

CREATE OR REPLACE FUNCTION private.capture_operator_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    label := coalesce(private.game_player_name(actor,game),'운영자');
  end if;
  new := jsonb_populate_record(new,jsonb_build_object(tg_argv[1],left(coalesce(label,'운영자 정보 없음'),128)));
  return new;
end;
$function$;


CREATE OR REPLACE FUNCTION private.get_clan_namecards(p_clan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null or not exists(select 1 from public.clan_members
    where clan_id = p_clan_id and user_id = auth.uid() and status = 'active') then
    raise exception 'namecard_clan_member_required' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_object_agg(m.user_id,jsonb_build_object(
    'displayName',coalesce(private.game_player_name(m.user_id,c.game_id),'게임 ID 미등록'),
    'title',(select o.name_ko from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'sub' and o.code not like '%-sub-default'),
    'frame',(select o.code from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'frame'),
    'namebar',(select o.code from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'namebar'),
    'backgroundPalette',(select s.palette_id from public.user_namecard_selections s where s.user_id = u.id and s.category = 'namebar'),
    'symbolPalette',(select s.palette_id from public.user_namecard_selections s where s.user_id = u.id and s.category = 'emblem'),
    'portraitPalette',(select s.palette_id from public.user_namecard_selections s where s.user_id = u.id and s.category = 'portrait'),
    'framePalette',(select s.palette_id from public.user_namecard_selections s where s.user_id = u.id and s.category = 'frame'),
    'emblem',(select o.code from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'emblem'),
    'portrait',(select o.code from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'portrait')
  )),'{}'::jsonb)
  from public.clan_members m join public.users u on u.id = m.user_id
    join public.clans c on c.id = m.clan_id join public.games g on g.id = c.game_id
  where m.clan_id = p_clan_id and m.status = 'active');
end $function$;


CREATE OR REPLACE FUNCTION private.ensure_clan_participant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 insert into public.clan_participants(clan_id,id,user_id,is_guest,nickname)
 select new.clan_id,new.user_id,new.user_id,false,left(coalesce(private.game_player_name(new.user_id,c.game_id),'게임 ID 미등록'),32) from public.clans c where c.id=new.clan_id
 on conflict(clan_id,id) do nothing;
 return new;
end $function$;


CREATE OR REPLACE FUNCTION private.read_clan_personal_emblem_award_source(p_clan_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object('hof_config',(select hof_config from public.clan_settings where clan_id=p_clan_id),
    'nicknames',coalesce((select jsonb_agg(to_jsonb(n)) from (
      select distinct on (coalesce(p.user_id,p.id)) coalesce(p.user_id,p.id) user_id,
        (case when p.is_guest and p.user_id is not null then coalesce(private.game_player_name(p.user_id,(select game_id from public.clans where id=p_clan_id)),'게임 ID 미등록')
          else private.participant_label(p.clan_id,p.id) end)::varchar nickname
      from public.clan_participants p  where p.clan_id=p_clan_id
      order by coalesce(p.user_id,p.id),p.is_guest,p.created_at
    ) n),'[]'::jsonb),
    'user_ids',coalesce((select jsonb_agg(distinct u.id) from public.clan_participants p
      join public.users u on u.id=coalesce(p.user_id,p.id) where p.clan_id=p_clan_id),'[]'::jsonb));
$function$;
