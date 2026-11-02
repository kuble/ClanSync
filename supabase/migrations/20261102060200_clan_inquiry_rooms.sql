-- Only new messages belong to the shared room. Existing one-to-one conversations
-- stay private and their original expiry job continues to purge them.
drop function public.join_inquiry(uuid,text,bigint);
drop function private.join_inquiry(uuid,text,bigint);

-- Reuse the text-only and length checks, not the data, grants or foreign keys.
create table private.clan_inquiry_messages (
  like private.join_inquiry_messages including constraints including defaults including identity,
  clan_id uuid not null references public.clans(id) on delete cascade,
  primary key (id),
  foreign key (author_id) references public.users(id) on delete set null
);
alter table private.clan_inquiry_messages drop column request_id, alter column created_at set not null;
create index on private.clan_inquiry_messages(clan_id, id desc);
alter table private.clan_inquiry_messages enable row level security;
revoke all on private.clan_inquiry_messages from public, anon, authenticated;

create function private.clan_inquiry(p_clan_id uuid, p_body text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
  room_game_id uuid;
  staff boolean;
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
    perform 1 from public.clan_join_requests
      where clan_id = p_clan_id and user_id = viewer and status = 'pending' for share;
    if not found or exists (
      select 1 from public.clan_members m join public.clans c on c.id = m.clan_id
      where m.user_id = viewer and ((m.status = 'active' and c.game_id = room_game_id)
        or (m.status = 'banned' and m.clan_id = p_clan_id))
    ) then raise exception 'closed' using errcode = '42501'; end if;
  end if;

  if p_body is not null then
    if p_body !~ '[^[:space:]]' then raise exception 'empty message' using errcode = '22023'; end if;
    insert into private.clan_inquiry_messages(clan_id, author_id, applicant, body)
      values (p_clan_id, viewer, not staff, btrim(p_body));
  end if;

  return (
    with recent as (
      select m.* from private.clan_inquiry_messages m
      where m.clan_id = p_clan_id order by m.id desc limit 100
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

create function public.clan_inquiry(p_clan_id uuid, p_body text default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.clan_inquiry(p_clan_id, p_body)
$$;
revoke all on function private.clan_inquiry(uuid,text), public.clan_inquiry(uuid,text) from public, anon;
grant execute on function private.clan_inquiry(uuid,text), public.clan_inquiry(uuid,text) to authenticated;
