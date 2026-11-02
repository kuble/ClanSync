DROP FUNCTION public.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[],int,text,text[],boolean,text);
ALTER TABLE public.clans DROP COLUMN interview_url;
CREATE FUNCTION public.save_clan_promotion(
  p_clan_id uuid, p_post_id uuid, p_title text, p_blocks jsonb,
  p_expected_updated_at timestamptz DEFAULT NULL, p_birth_year_limit int DEFAULT NULL,
  p_gender_policy text DEFAULT 'all', p_tiers text[] DEFAULT '{}', p_birth_year_from int DEFAULT NULL,
  p_style text DEFAULT NULL, p_positions text[] DEFAULT NULL, p_public boolean DEFAULT NULL
) RETURNS TABLE(id uuid, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  saved record;
  roles constant text[] := ARRAY['tank', 'sup', 'dmg'];
  selected_roles text[];
BEGIN
  SELECT * INTO STRICT saved FROM private.save_clan_promotion(
    p_clan_id, p_post_id, p_title, p_blocks, p_expected_updated_at,
    p_birth_year_limit, p_gender_policy, p_tiers, p_birth_year_from
  );

  -- Older editors omit the new arguments. An explicit empty value clears that field.
  IF p_positions IS NOT NULL THEN
    IF NOT (p_positions <@ roles) OR cardinality(p_positions) > 3 OR
      (cardinality(p_positions) > 0 AND NOT EXISTS (
        SELECT 1 FROM public.clans c JOIN public.games g ON g.id = c.game_id
        WHERE c.id = p_clan_id AND g.slug = 'overwatch'
      )) THEN
      RAISE EXCEPTION '이 게임의 모집 포지션을 확인해 주십시오.' USING ERRCODE = '22023';
    END IF;
    selected_roles := ARRAY(SELECT role FROM unnest(roles) role WHERE role = ANY(p_positions));
    IF selected_roles = roles THEN selected_roles := '{}'; END IF;
  END IF;
  IF p_style IS NOT NULL OR p_positions IS NOT NULL OR p_public IS NOT NULL THEN
    UPDATE public.clans c SET
      promotion_public = coalesce(p_public, c.promotion_public),
      style = CASE WHEN p_style IS NULL THEN c.style ELSE nullif(p_style, '')::public.clan_style END,
      recruitment_positions = coalesce(selected_roles, c.recruitment_positions)
    WHERE c.id = p_clan_id;
  END IF;
  RETURN QUERY SELECT saved.id, saved.updated_at;
END $$;
REVOKE ALL ON FUNCTION public.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[],int,text,text[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[],int,text,text[],boolean) TO authenticated;

create table private.join_inquiry_rooms (
  request_id uuid primary key references public.clan_join_requests on delete cascade,
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create table private.join_inquiry_messages (
  id bigint generated always as identity primary key,
  request_id uuid not null references private.join_inquiry_rooms on delete cascade,
  applicant boolean not null,
  body text not null check (length(btrim(body)) between 1 and 1000)
);
create index on private.join_inquiry_messages(request_id,id);
alter table private.join_inquiry_rooms enable row level security;
alter table private.join_inquiry_messages enable row level security;

create function private.join_inquiry(p_request uuid, p_body text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  r public.clan_join_requests%rowtype;
  deadline timestamptz;
begin
  select * into r from public.clan_join_requests where id=p_request for update;
  if auth.uid() is null or not found or r.status <> 'pending'
    or (r.user_id <> auth.uid() and not coalesce(public.is_clan_officer_plus(r.clan_id),false)) then
    raise exception 'closed' using errcode='42501';
  end if;
  insert into private.join_inquiry_rooms(request_id) values(r.id) on conflict do nothing;
  select expires_at into deadline from private.join_inquiry_rooms where request_id=r.id;
  if deadline <= clock_timestamp() then raise exception 'expired' using errcode='P0002'; end if;
  if p_body is not null then
    insert into private.join_inquiry_messages(request_id,applicant,body) values(r.id,r.user_id=auth.uid(),btrim(p_body));
  end if;
  return jsonb_build_object('expires',deadline,'messages',coalesce((
    select jsonb_agg(to_jsonb(m) order by m.id) from (
      select id,applicant,body from private.join_inquiry_messages where request_id=r.id order by id desc limit 100
    ) m
  ),'[]'::jsonb));
end $$;
create function public.join_inquiry(p_request uuid,p_body text default null)
returns jsonb language sql security invoker set search_path='' as $$ select private.join_inquiry(p_request,p_body) $$;
revoke all on function private.join_inquiry(uuid,text), public.join_inquiry(uuid,text) from public,anon;
grant execute on function private.join_inquiry(uuid,text), public.join_inquiry(uuid,text) to authenticated;
select cron.schedule('purge-join-inquiry-messages','*/5 * * * *',
  'delete from private.join_inquiry_messages m using private.join_inquiry_rooms r where m.request_id=r.request_id and r.expires_at<=now()');
