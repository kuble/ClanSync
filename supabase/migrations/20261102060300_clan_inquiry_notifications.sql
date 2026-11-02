-- Deliver only to participants who could open this shared room at send time.
create function private.notify_clan_inquiry_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(recipient_user_id, clan_id, kind, source_table, source_id)
  select participant.user_id, new.clan_id, 'clan_inquiry_comment', 'clans', new.clan_id
  from (
    select m.user_id from public.clan_members m
    where m.clan_id = new.clan_id and m.status = 'active' and m.role in ('leader', 'officer')
    union
    select r.user_id from public.clan_join_requests r
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
revoke all on function private.notify_clan_inquiry_comment() from public, anon, authenticated;

create trigger notify_clan_inquiry_comment after insert on private.clan_inquiry_messages
for each row execute function private.notify_clan_inquiry_comment();

create or replace function public.clan_inquiry(p_clan_id uuid, p_body text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  unread_ids uuid[];
  room jsonb;
begin
  -- Capture the unread set first so a concurrent, unseen reply stays unread.
  select array_agg(id) into unread_ids from public.notifications
    where recipient_user_id = (select auth.uid()) and clan_id = p_clan_id
      and kind = 'clan_inquiry_comment' and read_at is null;
  room := private.clan_inquiry(p_clan_id, p_body);
  if unread_ids is not null then
    perform public.mark_notification_reads(unread_ids);
  end if;
  return room;
end $$;
