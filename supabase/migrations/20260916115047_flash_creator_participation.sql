-- Register the creator atomically, including immediate rooms and RSVP windows
-- that have not opened yet. Participation does not assign a team/role slot.
create function private.join_flash_room_creator() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.balance_room_rsvps(room_id,user_id,response)
    values(new.id,new.created_by,'going') on conflict(room_id,user_id) do nothing;
  return new;
end $$;
revoke all on function private.join_flash_room_creator() from public, anon, authenticated;
create trigger join_flash_room_creator after insert on public.balance_rooms
for each row when (new.kind = 'flash') execute function private.join_flash_room_creator();

-- Fill only missing creator participation on active rooms; preserve explicit
-- cancellations and every existing team roster.
insert into public.balance_room_rsvps(room_id,user_id,response)
select id,created_by,'going' from public.balance_rooms
where kind = 'flash' and status in ('open','scheduled')
on conflict(room_id,user_id) do nothing;
