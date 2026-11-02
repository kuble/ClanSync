-- An applicant's first successful room visit sets a new boundary for this request.
-- Historical visits were not recorded, so existing requests also start on first use.
create table private.clan_inquiry_entries (
  request_id uuid primary key references public.clan_join_requests(id) on delete cascade,
  after_message_id bigint not null
);
alter table private.clan_inquiry_entries enable row level security;
revoke all on private.clan_inquiry_entries from public, anon, authenticated;

create or replace function private.clan_inquiry(p_clan_id uuid, p_body text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
  room_game_id uuid;
  staff boolean;
  pending_request_id uuid;
  after_id bigint := 0;
begin
  select game_id into room_game_id from public.clans where id = p_clan_id;
  if viewer is null or not found then raise exception 'closed' using errcode = '42501'; end if;

  -- A resolution or demotion taking the same row lock is ordered before or
  -- after this call. There is no previously issued room token to revoke.
  perform 1 from public.clan_members
    where clan_id = p_clan_id and user_id = viewer and status = 'active'
      and role in ('leader', 'officer') for share;
  staff := found;
  if not staff then
    select r.id, e.after_message_id into pending_request_id, after_id
    from public.clan_join_requests r
    left join private.clan_inquiry_entries e on e.request_id = r.id
    where r.clan_id = p_clan_id and r.user_id = viewer and r.status = 'pending'
    for share of r;
    if not found or exists (
      select 1 from public.clan_members m join public.clans c on c.id = m.clan_id
      where m.user_id = viewer and ((m.status = 'active' and c.game_id = room_game_id)
        or (m.status = 'banned' and m.clan_id = p_clan_id))
    ) then raise exception 'closed' using errcode = '42501'; end if;
  end if;

  -- Order first visits and sends within this clan. Ordinary polling needs no room lock.
  if after_id is null or p_body is not null then
    perform pg_advisory_xact_lock(hashtextextended('clan_inquiry:' || p_clan_id::text, 0));
  end if;
  if after_id is null then
    insert into private.clan_inquiry_entries(request_id, after_message_id)
      select pending_request_id, coalesce(max(m.id), 0)
      from private.clan_inquiry_messages m where m.clan_id = p_clan_id
      on conflict (request_id) do nothing;
    select e.after_message_id into strict after_id
    from private.clan_inquiry_entries e where e.request_id = pending_request_id;
  end if;

  if p_body is not null then
    if p_body !~ '[^[:space:]]' then raise exception 'empty message' using errcode = '22023'; end if;
    insert into private.clan_inquiry_messages(clan_id, author_id, applicant, body)
      values (p_clan_id, viewer, not staff, btrim(p_body));
  end if;

  return (
    with recent as (
      select m.* from private.clan_inquiry_messages m
      where m.clan_id = p_clan_id and m.id > after_id
      order by m.id desc limit 100
    ), authors as (
      select a.author_id, private.game_player_name(a.author_id, room_game_id) as nickname,
        jsonb_build_object(
          'emblem', max(o.code) filter (where s.category = 'emblem'),
          'symbolPalette', max(s.palette_id) filter (where s.category = 'emblem'),
          'portrait', max(o.code) filter (where s.category = 'portrait'),
          'portraitPalette', max(s.palette_id) filter (where s.category = 'portrait')
        ) as avatar
      from (select distinct author_id from recent where author_id is not null) a
      left join public.user_namecard_selections s on s.user_id = a.author_id and s.category in ('emblem','portrait')
      left join public.nameplate_options o on o.id = s.option_id
      group by a.author_id
    )
    select jsonb_build_object('messages', coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'body', m.body, 'authorId', m.author_id, 'createdAt', m.created_at,
      'isMine', m.author_id is not distinct from viewer,
      'nickname', coalesce(a.nickname, case when m.applicant then '신청자' else '클랜 운영진' end),
      'avatar', a.avatar
    ) order by m.id), '[]'::jsonb))
    from recent m left join authors a on a.author_id = m.author_id
  );
end $$;

create or replace function private.notify_clan_inquiry_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(recipient_user_id, clan_id, kind, source_table, source_id)
  select participant.user_id, new.clan_id, 'clan_inquiry_comment', 'clans', new.clan_id
  from (
    select m.user_id from public.clan_members m
    where m.clan_id = new.clan_id and m.status = 'active' and m.role in ('leader', 'officer')
    union
    select r.user_id from public.clan_join_requests r
    join private.clan_inquiry_entries e on e.request_id = r.id and e.after_message_id < new.id
    join public.clans room on room.id = r.clan_id
    where r.clan_id = new.clan_id and r.status = 'pending'
      and not exists (
        select 1 from public.clan_members m join public.clans c on c.id = m.clan_id
        where m.user_id = r.user_id and ((m.status = 'active' and c.game_id = room.game_id)
          or (m.status = 'banned' and m.clan_id = room.id))
      )
  ) participant
  where participant.user_id <> new.author_id;
  return new;
end $$;
