-- Self-reported IDs identify players but never grant verified status.
create function private.save_my_game_identity(p_game_slug text,p_identity text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); gid uuid; tag text; riot text;
begin
  if actor is null then raise exception '로그인이 필요합니다.' using errcode='42501'; end if;
  select id into gid from public.games where slug=p_game_slug and is_active;
  if gid is null or p_game_slug not in ('overwatch','valorant') then
    raise exception '등록할 수 없는 게임입니다.' using errcode='22023';
  end if;
  p_identity:=btrim(p_identity);
  if p_game_slug='overwatch' then
    if p_identity is null or char_length(split_part(p_identity,'#',1)) not between 2 and 20
      or p_identity !~ '^[^#[:space:][:cntrl:]]+#[0-9]{4,10}$' then
      raise exception '배틀태그 전체를 입력해 주십시오.' using errcode='22023';
    end if;
    tag:=p_identity;
  else
    if p_identity is null or char_length(split_part(p_identity,'#',1)) not between 3 and 16
      or p_identity !~ '^[^#[:cntrl:]]+#[[:alnum:]]{3,5}$' then
      raise exception '라이엇 ID 전체를 입력해 주십시오.' using errcode='22023';
    end if;
    riot:=p_identity;
  end if;
  insert into public.user_game_profiles as gp(user_id,game_id,game_uid,battle_tag,riot_id,is_verified,verified_at)
  values(actor,gid,'manual:'||p_game_slug||':'||actor::text,tag,riot,false,null)
  on conflict(user_id,game_id) do update set
    battle_tag=excluded.battle_tag,riot_id=excluded.riot_id,
    is_verified=gp.is_verified and gp.battle_tag is not distinct from excluded.battle_tag and gp.riot_id is not distinct from excluded.riot_id,
    verified_at=case when gp.battle_tag is not distinct from excluded.battle_tag and gp.riot_id is not distinct from excluded.riot_id then gp.verified_at end,
    updated_at=now();
end;
$$;
revoke all on function private.save_my_game_identity(text,text) from public,anon;
grant execute on function private.save_my_game_identity(text,text) to authenticated;
create function public.save_my_game_identity(p_game_slug text,p_identity text) returns void
language sql set search_path='' as $$ select private.save_my_game_identity(p_game_slug,p_identity); $$;
revoke all on function public.save_my_game_identity(text,text) from public,anon;
grant execute on function public.save_my_game_identity(text,text) to authenticated;

CREATE OR REPLACE FUNCTION private.game_player_name(p_user uuid, p_game uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select case when g.slug='overwatch' then
    case when coalesce(nullif(p.battle_tag,''),p.game_uid) ~ '^[^#[:space:]]{2,20}#[0-9]{4,10}$'
      then coalesce(nullif(p.battle_tag,''),p.game_uid) end
    when g.slug in ('valorant','lol') then nullif(btrim(p.riot_id),'') end
  from public.user_game_profiles p join public.games g on g.id=p.game_id
  where p.user_id=p_user and p.game_id=p_game;
$function$;

CREATE OR REPLACE FUNCTION private.read_player_profile(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare viewer uuid := auth.uid(); result jsonb;
begin
  if viewer is null or not exists(select 1 from public.users where id = viewer) then
    raise exception 'profile_auth_required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'userId',u.id,
    'intro',left(a.raw_user_meta_data->>'profile_intro',120),
    'games',(
      select coalesce(jsonb_agg(jsonb_build_object('slug',g.slug,'nameKo',g.name_ko) order by g.slug),'[]'::jsonb)
      from public.user_game_profiles gp join public.games g on g.id = gp.game_id where gp.user_id = u.id
    ),
    'memberships',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'clanId',c.id,'clanName',c.name,'gameSlug',g.slug,'gameName',g.name_ko,'role',m.role,
        'isVerified',coalesce(gp.is_verified,false),
        'accountId',case when g.slug = 'overwatch' then coalesce(nullif(gp.battle_tag,''),
          case when gp.game_uid ~ '^[^#[:space:][:cntrl:]]+#[0-9]{4,10}$' then gp.game_uid end)
          when g.slug in ('valorant','lol') then nullif(gp.riot_id,'') else null end
      ) order by c.id),'[]'::jsonb)
      from public.clan_members m join public.clans c on c.id = m.clan_id join public.games g on g.id = c.game_id
      left join public.user_game_profiles gp on gp.user_id = u.id and gp.game_id = c.game_id
      where m.user_id = u.id and m.status = 'active'
    )
  ) into result from public.users u join auth.users a on a.id = u.id
    where u.id = p_user_id;
  return result;
end $function$;

CREATE OR REPLACE FUNCTION public.resolve_clan_join_request(p_clan_id uuid, p_request_id uuid, p_decision text, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET row_security TO 'off'
AS $function$
DECLARE
  c public.clans%rowtype;
  r public.clan_join_requests%rowtype;
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION '잘못된 가입 처리 요청입니다.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO c FROM public.clans WHERE id = p_clan_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_clan_officer_plus(p_clan_id) THEN
    RAISE EXCEPTION '가입을 처리할 권한이 없습니다.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.clan_join_requests
    WHERE id = p_request_id AND clan_id = p_clan_id FOR UPDATE;
  IF NOT FOUND OR r.status <> 'pending' OR r.game_id <> c.game_id THEN
    RAISE EXCEPTION '처리할 수 없는 신청입니다.' USING ERRCODE = '22023';
  END IF;
  IF p_decision = 'approved' THEN
    PERFORM 1 FROM public.users WHERE id = r.user_id FOR UPDATE;
    IF c.lifecycle_status <> 'active' OR c.moderation_status IN ('hidden', 'deleted') THEN
      RAISE EXCEPTION '가입할 수 없는 클랜입니다.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.user_game_profiles
      WHERE user_id = r.user_id AND game_id = c.game_id AND private.game_player_name(user_id,game_id) is not null) THEN
      RAISE EXCEPTION '게임 ID를 먼저 등록해 주십시오.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.clan_members cm JOIN public.clans other ON other.id = cm.clan_id
      WHERE cm.user_id = r.user_id AND other.game_id = c.game_id AND cm.status = 'active') THEN
      RAISE EXCEPTION '이미 게임 클랜에 소속되어 있습니다.';
    END IF;
    IF (SELECT count(*) FROM public.clan_members WHERE clan_id = c.id AND status = 'active') >= c.max_members THEN
      RAISE EXCEPTION '클랜 정원이 찼습니다.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.clan_members WHERE clan_id=c.id AND user_id=r.user_id AND status='banned') THEN
      RAISE EXCEPTION '운영진이 재가입을 허용한 뒤 승인할 수 있습니다.' USING ERRCODE='42501';
    END IF;
    INSERT INTO public.clan_members (clan_id, user_id, role, status, joined_at, last_activity_at)
      VALUES (c.id, r.user_id, 'member', 'active', now(), now())
      ON CONFLICT (clan_id,user_id) DO UPDATE SET status='active',role='member',joined_at=now(),last_activity_at=now()
      WHERE public.clan_members.status='left';
    IF NOT FOUND THEN RAISE EXCEPTION '이미 등록되었거나 소속 상태가 변경되었습니다.'; END IF;
  END IF;
  UPDATE public.clan_join_requests SET status = p_decision::public.clan_join_request_status,
    resolved_at = now(), resolved_by = actor,
    reject_reason = CASE WHEN p_decision = 'rejected' THEN nullif(left(trim(p_reason), 500), '') END
    WHERE id = r.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_lfg_post(p_post_id uuid, p_message text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET row_security TO 'off'
AS $function$
DECLARE p public.lfg_posts%rowtype; actor uuid := auth.uid(); result uuid;
BEGIN
  SELECT * INTO p FROM public.lfg_posts WHERE id = p_post_id FOR UPDATE;
  IF actor IS NULL OR NOT FOUND OR p.creator_user_id = actor OR p.status <> 'open' OR p.expires_at <= now() THEN
    RAISE EXCEPTION '신청할 수 없는 모집입니다.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_game_profiles WHERE user_id = actor AND game_id = p.game_id AND private.game_player_name(user_id,game_id) is not null) THEN
    RAISE EXCEPTION '게임 ID를 먼저 등록해 주십시오.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.lfg_applications WHERE post_id = p.id AND applicant_user_id = actor AND status IN ('applied', 'accepted')) THEN
    RAISE EXCEPTION '이미 신청한 모집입니다.' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.lfg_applications (post_id, applicant_user_id, message)
    VALUES (p.id, actor, nullif(left(trim(p_message), 200), '')) RETURNING id INTO result;
  RETURN result;
END;
$function$;
