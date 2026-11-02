-- No authors or timestamps were recorded in the original rooms. Only the
-- applicant can be identified unambiguously on those messages.
alter table private.join_inquiry_messages
  add column author_id uuid references public.users(id) on delete set null,
  add column created_at timestamptz;
update private.join_inquiry_messages m set author_id = r.user_id
from public.clan_join_requests r where m.request_id = r.id and m.applicant;
alter table private.join_inquiry_messages alter column created_at set default now();

-- Postgres regexes lack Unicode properties. These are the Unicode Emoji code
-- points except plain #, * and digits, plus U+20E3 for their keycap sequences.
alter table private.join_inquiry_messages add constraint inquiry_text_only check (
  body collate "C" !~ (
    U&'[\00a9\00ae\203c\2049\20e3\2122\2139\2194-\2199' ||
    U&'\21a9-\21aa\231a-\231b\2328\23cf\23e9-\23f3\23f8-\23fa\24c2\25aa-\25ab' ||
    U&'\25b6\25c0\25fb-\25fe\2600-\2604\260e\2611\2614-\2615\2618' ||
    U&'\261d\2620\2622-\2623\2626\262a\262e-\262f\2638-\263a\2640' ||
    U&'\2642\2648-\2653\265f-\2660\2663\2665-\2666\2668\267b\267e-\267f' ||
    U&'\2692-\2697\2699\269b-\269c\26a0-\26a1\26a7\26aa-\26ab\26b0-\26b1\26bd-\26be' ||
    U&'\26c4-\26c5\26c8\26ce-\26cf\26d1\26d3-\26d4\26e9-\26ea\26f0-\26f5\26f7-\26fa' ||
    U&'\26fd\2702\2705\2708-\270d\270f\2712\2714\2716' ||
    U&'\271d\2721\2728\2733-\2734\2744\2747\274c\274e' ||
    U&'\2753-\2755\2757\2763-\2764\2795-\2797\27a1\27b0\27bf\2934-\2935' ||
    U&'\2b05-\2b07\2b1b-\2b1c\2b50\2b55\3030\303d\3297\3299' ||
    U&'\+01f004\+01f0cf\+01f170-\+01f171\+01f17e-\+01f17f\+01f18e\+01f191-\+01f19a\+01f1e6-\+01f1ff\+01f201-\+01f202' ||
    U&'\+01f21a\+01f22f\+01f232-\+01f23a\+01f250-\+01f251\+01f300-\+01f321\+01f324-\+01f393\+01f396-\+01f397\+01f399-\+01f39b' ||
    U&'\+01f39e-\+01f3f0\+01f3f3-\+01f3f5\+01f3f7-\+01f4fd\+01f4ff-\+01f53d\+01f549-\+01f54e\+01f550-\+01f567\+01f56f-\+01f570\+01f573-\+01f57a' ||
    U&'\+01f587\+01f58a-\+01f58d\+01f590\+01f595-\+01f596\+01f5a4-\+01f5a5\+01f5a8\+01f5b1-\+01f5b2\+01f5bc' ||
    U&'\+01f5c2-\+01f5c4\+01f5d1-\+01f5d3\+01f5dc-\+01f5de\+01f5e1\+01f5e3\+01f5e8\+01f5ef\+01f5f3' ||
    U&'\+01f5fa-\+01f64f\+01f680-\+01f6c5\+01f6cb-\+01f6d2\+01f6d5-\+01f6d8\+01f6dc-\+01f6e5\+01f6e9\+01f6eb-\+01f6ec\+01f6f0' ||
    U&'\+01f6f3-\+01f6fc\+01f7e0-\+01f7eb\+01f7f0\+01f90c-\+01f93a\+01f93c-\+01f945\+01f947-\+01f9ff\+01fa70-\+01fa7c\+01fa80-\+01fa8a' ||
    U&'\+01fa8e-\+01fac6\+01fac8\+01facd-\+01fadc\+01fadf-\+01faea\+01faef-\+01faf8]'
  ) and body !~* '\[e:[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\]'
) not valid;

drop function public.join_inquiry(uuid,text);
drop function private.join_inquiry(uuid,text);

create function private.join_inquiry(p_request uuid, p_body text default null, p_delete_id bigint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.clan_join_requests%rowtype;
  viewer uuid := auth.uid();
  staff boolean;
  deadline timestamptz;
begin
  select * into r from public.clan_join_requests where id = p_request for update;
  if not found or viewer is null or r.status <> 'pending' then
    raise exception 'closed' using errcode = '42501';
  end if;
  staff := coalesce(public.is_clan_officer_plus(r.clan_id), false);
  if viewer <> r.user_id and not staff then
    raise exception 'closed' using errcode = '42501';
  end if;

  insert into private.join_inquiry_rooms(request_id) values (r.id) on conflict do nothing;
  select expires_at into deadline from private.join_inquiry_rooms where request_id = r.id;
  if deadline <= clock_timestamp() then raise exception 'expired' using errcode = 'P0002'; end if;

  if p_body is not null and p_delete_id is not null then
    raise exception 'choose one action' using errcode = '22023';
  elsif p_body is not null then
    if p_body !~ '[^[:space:]]' then raise exception 'empty message' using errcode = '22023'; end if;
    insert into private.join_inquiry_messages(request_id, author_id, applicant, body)
    values (r.id, viewer, viewer = r.user_id, btrim(p_body));
  elsif p_delete_id is not null then
    delete from private.join_inquiry_messages
      where request_id = r.id and id = p_delete_id and (author_id = viewer or staff);
    if not found then raise exception 'cannot delete message' using errcode = 'P0001'; end if;
  end if;

  return (
    with recent as (
      select m.* from private.join_inquiry_messages m
      where m.request_id = r.id order by m.id desc limit 100
    ), authors as (
      select a.author_id, private.game_player_name(a.author_id, r.game_id) as nickname,
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
    select jsonb_build_object('expires', deadline, 'messages', coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'body', m.body, 'applicant', m.applicant, 'authorId', m.author_id,
      'createdAt', m.created_at, 'isMine', m.author_id is not distinct from viewer,
      'canDelete', staff or m.author_id is not distinct from viewer,
      'nickname', coalesce(a.nickname, case when m.applicant then '신청자' else '클랜 운영진' end),
      'avatar', a.avatar
    ) order by m.id), '[]'::jsonb))
    from recent m left join authors a on a.author_id = m.author_id
  );
end $$;

create function public.join_inquiry(p_request uuid, p_body text default null, p_delete_id bigint default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.join_inquiry(p_request, p_body, p_delete_id)
$$;
revoke all on function private.join_inquiry(uuid,text,bigint), public.join_inquiry(uuid,text,bigint) from public, anon;
grant execute on function private.join_inquiry(uuid,text,bigint), public.join_inquiry(uuid,text,bigint) to authenticated;
